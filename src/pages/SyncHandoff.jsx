import React, { useMemo, useState, useEffect } from "react";
import PageHeader from "../components/scanner/PageHeader";
import {
  AlertTriangle, CheckCircle2, Eye, FileWarning, GitCompareArrows,
  RefreshCw, RotateCcw, ShieldAlert, Trash2, Wifi, WifiOff,
  Settings2, Database, FileJson2, GitBranch,
  LockKeyhole, MonitorSmartphone, Save,
} from "lucide-react";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { useScanOpsSession } from "../lib/scanOpsSession";
import { hasRoleAtLeast, restrictedActionReason } from "../lib/scanOpsPermissions";
import { deriveHandoffStateFromSyncStatus, formatHandoffStateLabel } from "../lib/scanOpsInventoryDesktopHandoffContract";
import {
  discardLocalDraft, escalateSyncItem, getNetworkMode, getSyncQueue,
  getSyncSummary, isSyncRetryAllowed, keepDuplicateAsSeparateEvidence,
  keepLocalAsEvidence, refreshServerValue, retryAllSyncEvents,
  retrySyncEvent, SYNC_STATUSES,
} from "../lib/scanOpsSync";
import {
  buildDesktopResponsePreview, DESKTOP_SYNC_CONTRACT_VERSION,
  DESKTOP_SYNC_STATUSES, validateDesktopSyncPayload,
  WORKFLOW_SYNC_CONTRACTS, useDesktopSyncContract,
} from "../lib/scanOpsDesktopSyncContract";
import { MetricPill, SectionCard, InfoLine } from "../components/scanner/WorkflowPrimitives";

// ─── Shared style constants ───────────────────────────────────────────────────
const BTN_PRIMARY   = "w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:active:scale-100";
const BTN_SECONDARY = "w-full py-4 rounded-2xl bg-secondary text-secondary-foreground font-bold text-sm active:scale-[0.98] active:bg-border transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:active:scale-100";
const BTN_DANGER    = "w-full py-4 rounded-2xl bg-destructive text-destructive-foreground font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:active:scale-100";
const MINI_BTN      = "px-3 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-xs font-bold active:scale-[0.98] active:bg-border transition-all flex items-center justify-center gap-1.5 disabled:opacity-40";

const PENDING_STATUSES  = new Set([SYNC_STATUSES.QUEUED, SYNC_STATUSES.SYNC_PENDING, SYNC_STATUSES.SYNCING, SYNC_STATUSES.LOCAL_SAVED]);
const FAILED_STATUSES   = new Set([SYNC_STATUSES.SYNC_FAILED, SYNC_STATUSES.FAILED]);
const CONFLICT_STATUSES = new Set([SYNC_STATUSES.CONFLICT, SYNC_STATUSES.DUPLICATE, SYNC_STATUSES.NEEDS_REVIEW, SYNC_STATUSES.ESCALATED]);
const ISSUE_STATUSES    = new Set([...FAILED_STATUSES, ...CONFLICT_STATUSES]);

const WORKFLOW_LABELS = {
  stock_count: "Stock Count", receiving: "Receiving", transfer: "Transfers",
  waste: "Waste", markdown: "Markdowns", shelf_tickets: "Shelf Tickets",
  replenishment: "Replenishment", price_check: "Price / Promo Check",
  task: "Tasks", unknown_item_evidence: "Product Identity", scanops: "ScanOps",
};

const SETUP_STORAGE_KEY = "scanops_sync_endpoint_config";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTime(value) {
  if (!value) return "—";
  try { return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return value; }
}

function titleCase(value) {
  return String(value || "—").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusTone(status) {
  if (status === SYNC_STATUSES.SYNCED)    return "bg-emerald-500/10 border-emerald-500/20 text-emerald-700";
  if (status === SYNC_STATUSES.DISCARDED) return "bg-slate-500/10 border-slate-500/20 text-slate-700";
  if (status === SYNC_STATUSES.ESCALATED) return "bg-amber-500/10 border-amber-500/20 text-amber-700";
  if (status === SYNC_STATUSES.DUPLICATE) return "bg-violet-500/10 border-violet-500/20 text-violet-700";
  if (ISSUE_STATUSES.has(status))         return "bg-destructive/10 border-destructive/20 text-destructive";
  if (PENDING_STATUSES.has(status))       return "bg-primary/10 border-primary/20 text-primary";
  return "bg-secondary border-border text-muted-foreground";
}

function contractStatusTone(status) {
  if ([DESKTOP_SYNC_STATUSES.SYNC_BLOCKED_CONFLICT, DESKTOP_SYNC_STATUSES.SYNC_BLOCKED_PERMISSION, DESKTOP_SYNC_STATUSES.SYNC_BLOCKED_SCHEMA, DESKTOP_SYNC_STATUSES.SYNC_BLOCKED_STALE_TASK, DESKTOP_SYNC_STATUSES.SYNC_INVALID, DESKTOP_SYNC_STATUSES.SYNC_REJECTED].includes(status))
    return "border-red-100 bg-red-50 text-red-700";
  if ([DESKTOP_SYNC_STATUSES.SYNC_ACCEPTED_FOR_REVIEW, DESKTOP_SYNC_STATUSES.SYNC_DEFERRED, DESKTOP_SYNC_STATUSES.SYNC_RETRY_PENDING].includes(status))
    return "border-amber-100 bg-amber-50 text-amber-700";
  if ([DESKTOP_SYNC_STATUSES.SYNC_VALID, DESKTOP_SYNC_STATUSES.SYNC_ACKNOWLEDGED].includes(status))
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  return "border-primary/10 bg-primary/10 text-primary";
}

function statusLabel(record) {
  return formatHandoffStateLabel(record.handoffState || deriveHandoffStateFromSyncStatus(record.status));
}

function workflowTitle(record) {
  return WORKFLOW_LABELS[record.sourceWorkflow] || record.sourceModule || "ScanOps";
}

function itemNameFromSnapshot(snapshot = {}) {
  const items = Array.isArray(snapshot.items) ? snapshot.items : [];
  const first = items[0] || {};
  return snapshot.item_name || snapshot.itemName || snapshot.name || snapshot.sku || snapshot.barcode
    || snapshot.plu || snapshot.entered_code || first.itemName || first.item_name || first.sku || "Local evidence";
}

function itemRowsFor(record) {
  const payload = record.localSnapshot || record.payloadSnapshot || record.payload || {};
  if (Array.isArray(payload.items)) return payload.items;
  if (payload.item_name || payload.itemName || payload.sku || payload.barcode || payload.plu || payload.requested_qty || payload.quantity) return [payload];
  return [];
}

function payloadValue(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "object") return Array.isArray(value) ? `${value.length} row${value.length === 1 ? "" : "s"}` : "Snapshot saved";
  return String(value);
}

function scopeQueueForRole(queue, session) {
  if (!session) return queue;
  if (session.actorRole === "Admin") return queue;
  if (session.actorRole === "Manager" || session.actorRole === "Supervisor")
    return queue.filter((r) => !r.locationId || r.locationId === session.storeId);
  return queue.filter((r) => r.userId === session.actorUserId || r.deviceId === session.deviceId || r.createdBy === session.actorName);
}

function applyTab(record, tab) {
  if (tab === "pending")   return PENDING_STATUSES.has(record.status);
  if (tab === "review")    return FAILED_STATUSES.has(record.status) || CONFLICT_STATUSES.has(record.status);
  if (tab === "synced")    return record.status === SYNC_STATUSES.SYNCED;
  if (tab === "discarded") return record.status === SYNC_STATUSES.DISCARDED;
  return true;
}

function canDiscard(record, session) {
  if (["Supervisor", "Manager", "Admin"].includes(session?.actorRole)) return true;
  return record.userId === session?.actorUserId || record.deviceId === session?.deviceId || record.createdBy === session?.actorName;
}

function canResolveSyncAction(action, record, session) {
  if (["keep_local", "refresh_server", "keep_duplicate"].includes(action)) return hasRoleAtLeast(session?.actorRole, "Supervisor");
  if (action === "discard" && (FAILED_STATUSES.has(record.status) || CONFLICT_STATUSES.has(record.status))) return hasRoleAtLeast(session?.actorRole, "Supervisor");
  return true;
}

// ─── Small shared UI ─────────────────────────────────────────────────────────
function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`shrink-0 rounded-2xl px-3 py-2.5 text-xs font-black border transition-all active:scale-[0.98] ${active === tab.id ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}
        >
          {tab.label}{tab.count != null ? ` · ${tab.count}` : ""}
        </button>
      ))}
    </div>
  );
}

function SmallFact({ label, value }) {
  return (
    <div className="rounded-xl bg-card border border-border p-2 min-w-0">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">{label}</p>
      <p className="text-xs font-bold text-foreground mt-1 break-words">{value || "—"}</p>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3.5 min-w-0">
      <span className="text-sm text-muted-foreground shrink-0 max-w-[42%]">{label}</span>
      <span className="text-sm font-semibold text-foreground text-right break-words min-w-0">{value || "—"}</span>
    </div>
  );
}

function StatusBadge({ status, label }) {
  return (
    <span className={`inline-flex shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${contractStatusTone(status)}`}>
      {label || titleCase(status)}
    </span>
  );
}

// ─── Queue Tab ────────────────────────────────────────────────────────────────
function QueueTab({ session }) {
  const [queue, setQueue]           = useState(() => getSyncQueue());
  const [selected, setSelected]     = useState(null);
  const [activeTab, setActiveTab]   = useState("pending");
  const [retryingIds, setRetryingIds] = useState(() => new Set());
  const [retryingAll, setRetryingAll] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);
  const summary    = useMemo(() => getSyncSummary(), [queue]);
  const scopedQueue = useMemo(() => scopeQueueForRole(queue, session), [queue, session]);
  const filtered   = useMemo(() => scopedQueue.filter((r) => applyTab(r, activeTab)), [activeTab, scopedQueue]);
  const offline    = getNetworkMode() === "offline";
  const reviewCount   = summary.conflict + summary.duplicate + summary.needsReview + summary.escalated;
  const issueCount    = summary.failed + reviewCount;
  const retryableCount = scopedQueue.filter(isSyncRetryAllowed).length;

  const refresh = () => {
    const next = getSyncQueue();
    setQueue(next);
    if (selected) {
      const refreshed = next.find((r) => r.id === selected.id || r.queueId === selected.queueId);
      if (refreshed) setSelected(refreshed);
    }
  };

  const handleRetry = (record) => {
    if (!record?.id || retryingIds.has(record.id) || !isSyncRetryAllowed(record)) return;
    setRetryingIds((cur) => new Set([...cur, record.id]));
    const result = retrySyncEvent(record.id);
    if (result && FAILED_STATUSES.has(result.status)) {
      setSyncMessage({ title: "Handoff failed", helper: "Try again when the connection is stable." });
    } else {
      setSyncMessage({ title: "Retry checked", helper: "Item stays saved locally if it cannot be handed off yet." });
    }
    setSelected(result || record);
    setRetryingIds((cur) => { const next = new Set(cur); next.delete(record.id); return next; });
    refresh();
  };

  const handleRetryAll = () => {
    if (retryingAll || retryableCount === 0) return;
    setRetryingAll(true);
    const results = retryAllSyncEvents();
    setRetryingAll(false);
    setSyncMessage({ title: "Retry checked", helper: `${results.length} item${results.length === 1 ? "" : "s"} checked.` });
    refresh();
  };

  const handleResolve = (action, record, reason) => {
    if (!canResolveSyncAction(action, record, session)) return;
    let result = null;
    if (action === "keep_local")      result = keepLocalAsEvidence(record.id, reason || "Preserved local evidence.");
    if (action === "refresh_server")  result = refreshServerValue(record.id, reason || "Refreshed server snapshot.");
    if (action === "escalate")        result = escalateSyncItem(record.id, reason);
    if (action === "discard")         result = discardLocalDraft(record.id, reason);
    if (action === "keep_duplicate")  result = keepDuplicateAsSeparateEvidence(record.id, reason || "Kept as separate evidence.");
    setSelected(result || record);
    refresh();
  };

  if (selected) {
    return (
      <SyncDetail
        record={selected}
        session={session}
        onBack={() => { setSelected(null); refresh(); }}
        onRetry={() => handleRetry(selected)}
        retrying={retryingIds.has(selected.id)}
        onResolve={handleResolve}
        syncMessage={syncMessage}
      />
    );
  }

  const queueTabs = [
    { id: "pending",   label: "Pending",  count: summary.pending },
    { id: "review",    label: "Review",   count: reviewCount + summary.failed },
    { id: "synced",    label: "Ready",    count: summary.synced },
    ...(session?.actorRole !== "Staff" ? [{ id: "discarded", label: "Discarded", count: summary.discarded }] : []),
  ];

  return (
    <div className="space-y-4">
      {syncMessage && (
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-sm font-black text-foreground">{syncMessage.title}</p>
          <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">{syncMessage.helper}</p>
        </div>
      )}

      {/* Status summary */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${offline ? "bg-amber-500/10 text-amber-700" : issueCount ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700"}`}>
            {offline ? <WifiOff className="w-5 h-5" /> : issueCount ? <AlertTriangle className="w-5 h-5" /> : <Wifi className="w-5 h-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Queue Status</p>
            <h2 className="text-base font-black text-foreground mt-1">{summary.pending} pending · {issueCount} review · {summary.synced} ready</h2>
            <p className="text-xs text-muted-foreground mt-1">Work saved locally, queued for desktop handoff. No live stock mutations occur here.</p>
          </div>
        </div>
        <button onClick={handleRetryAll} disabled={retryableCount === 0 || retryingAll} className={`${BTN_SECONDARY} mt-4`}>
          <RefreshCw className="w-4 h-4" />{retryingAll ? "Retrying..." : "Retry pending / failed"}
        </button>
      </div>

      <TabBar tabs={queueTabs} active={activeTab} onChange={setActiveTab} />

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-sm font-bold text-foreground mt-3">
            {activeTab === "pending" ? "No pending items" : activeTab === "review" ? "No blocked items" : activeTab === "synced" ? "No ready items" : "No discarded items"}
          </p>
        </div>
      ) : (
        filtered.map((record) => (
          <SyncCard
            key={record.id}
            record={record}
            onView={() => setSelected(record)}
            onRetry={() => handleRetry(record)}
            retrying={retryingIds.has(record.id)}
          />
        ))
      )}
    </div>
  );
}

// ─── Setup Tab ────────────────────────────────────────────────────────────────
function SetupTab() {
  const [config, setConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SETUP_STORAGE_KEY) || "{}"); }
    catch { return {}; }
  });
  const [saved, setSaved] = useState(false);

  const update = (key, value) => setConfig((prev) => ({ ...prev, [key]: value }));

  const save = () => {
    localStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Settings2 className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-black text-foreground">Handoff Endpoint</h2>
            <p className="mt-0.5 text-xs font-semibold leading-snug text-muted-foreground">Set once per store. All scanners on the same WiFi will push records to this destination.</p>
          </div>
        </div>

        <Field label="Desktop IP Address" placeholder="e.g. 192.168.1.50" value={config.ipAddress || ""} onChange={(v) => update("ipAddress", v)} helper="Static IP of the desktop machine running the inventory system." />
        <Field label="Port" placeholder="e.g. 8080" value={config.port || ""} onChange={(v) => update("port", v)} helper="Port the desktop handoff listener is running on." />
        <Field label="Store / Location ID" placeholder="e.g. STORE-01" value={config.storeId || ""} onChange={(v) => update("storeId", v)} helper="Used to scope records to this store location." />
        <Field label="Endpoint path (optional)" placeholder="e.g. /scanops/handoff" value={config.path || ""} onChange={(v) => update("path", v)} helper="Leave blank to use the root path." />

        <button onClick={save} className={BTN_PRIMARY}>
          <Save className="w-4 h-4" />{saved ? "Saved!" : "Save Configuration"}
        </button>
      </div>

      {config.ipAddress && (
        <div className="bg-card rounded-2xl border border-border p-5 space-y-2">
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Current Endpoint</p>
          <p className="font-mono text-sm font-bold text-foreground break-all">
            http://{config.ipAddress}{config.port ? `:${config.port}` : ""}{config.path || "/"}
          </p>
          <p className="text-xs text-muted-foreground">All handheld scan records will be pushed to this address when the scanner is on store WiFi.</p>
        </div>
      )}

      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
        <p className="text-xs font-black text-amber-800">Live transport not yet active. Records queue locally and will flush automatically once the desktop endpoint is reachable.</p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Setup Guide</p>
        {[
          ["1. Connect to store WiFi", "Ensure the handheld and desktop are on the same network."],
          ["2. Set desktop IP", "Assign a static IP to the desktop running the inventory system."],
          ["3. Enter IP + port above", "Save once — all scanners inherit this config automatically."],
          ["4. Start desktop listener", "The desktop app should be listening on the configured port."],
        ].map(([title, desc]) => (
          <div key={title} className="rounded-2xl bg-secondary/60 px-3 py-2.5">
            <p className="text-xs font-black text-foreground">{title}</p>
            <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, placeholder, value, onChange, helper }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">{label}</label>
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm font-bold text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

// ─── Contracts Tab (Manager/Admin diagnostic) ─────────────────────────────────
function ContractsTab() {
  const { context, queue, summary } = useDesktopSyncContract();
  const [selectedId, setSelectedId]     = useState(queue[0]?.eventId || "");
  const [showPayload, setShowPayload]   = useState(false);
  const [manualValidation, setManualValidation] = useState(null);
  const [validatedAt, setValidatedAt]   = useState(null);

  const selected      = useMemo(() => queue.find((e) => e.eventId === selectedId) || queue[0], [queue, selectedId]);
  const autoValidation = useMemo(() => validateDesktopSyncPayload(selected), [selected]);
  const validation    = manualValidation?.eventId === selected?.eventId ? manualValidation.result : autoValidation;
  const response      = useMemo(() => buildDesktopResponsePreview(selected, validation), [selected, validation]);

  const validateSelected = () => {
    const result = validateDesktopSyncPayload(selected);
    setManualValidation({ eventId: selected.eventId, result });
    setValidatedAt(new Date().toISOString());
  };

  const selectPayload = (eventId) => {
    setSelectedId(eventId);
    setShowPayload(false);
    setManualValidation(null);
    setValidatedAt(null);
  };

  return (
    <div className="space-y-4">
      {/* Sync status */}
      <SectionCard className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><MonitorSmartphone className="h-4 w-4" /></span>
          <div><h2 className="text-sm font-black text-foreground">Contract Status</h2><p className="mt-0.5 text-xs font-semibold text-muted-foreground">Payload envelope inspection and desktop response preview.</p></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MetricPill label="Mode" value={context.mode} />
          <MetricPill label="Transport" value="Not connected" />
          <MetricPill label="Waiting" value={summary.total} />
          <MetricPill label="Review req." value={summary.reviewRequired} />
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2">
          <p className="text-xs font-black text-amber-800">No live sync. No inventory, price, or accounting mutation occurs here.</p>
        </div>
      </SectionCard>

      {/* Queue */}
      {queue.length > 0 && (
        <SectionCard className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Database className="h-4 w-4" /></span>
            <div><h2 className="text-sm font-black text-foreground">Payload Queue</h2><p className="mt-0.5 text-xs font-semibold text-muted-foreground">Select a record to inspect its envelope.</p></div>
          </div>
          <div className="space-y-2">
            {queue.map((event) => {
              const v = validateDesktopSyncPayload(event);
              return (
                <button key={event.eventId} type="button" onClick={() => selectPayload(event.eventId)}
                  className={`w-full rounded-2xl border p-3 text-left active:scale-[0.995] ${selectedId === event.eventId ? "border-primary bg-primary/5" : "border-border bg-background/70"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-black text-foreground">{event.eventLabel}</p>
                      <p className="mt-1 text-xs font-bold text-muted-foreground">{event.sourceWorkflow} · {event.sourceRecordId}</p>
                    </div>
                    <StatusBadge status={v.syncStatus} label={v.syncStatus === DESKTOP_SYNC_STATUSES.SYNC_ACCEPTED_FOR_REVIEW ? "Review" : titleCase(event.syncStatus)} />
                  </div>
                </button>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Selected payload */}
      {selected && (
        <SectionCard className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileJson2 className="h-4 w-4" /></span>
            <div><h2 className="text-sm font-black text-foreground">Selected Payload</h2><p className="mt-0.5 text-xs font-semibold text-muted-foreground">Governance proof, envelope, and workflow payload.</p></div>
          </div>
          <div className="rounded-2xl bg-secondary/60 p-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <p className="break-words text-base font-black text-foreground">{selected.eventType}</p>
              <StatusBadge status={validation.syncStatus} label={titleCase(validation.syncStatus)} />
            </div>
            <InfoLine label="Contract" value={selected.contractVersion} />
            <InfoLine label="Actor" value={`${selected.actorName} · ${selected.actorRole}`} />
            <InfoLine label="Permission" value={`${titleCase(selected.permissionResult)} · ${selected.actionAllowed ? "Allowed" : "Blocked"}`} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setShowPayload((v) => !v)} className="min-h-11 rounded-2xl bg-secondary px-3 text-xs font-black text-secondary-foreground active:bg-border">
              {showPayload ? "Hide Payload" : "View Payload"}
            </button>
            <button type="button" onClick={validateSelected} className="min-h-11 rounded-2xl bg-primary px-3 text-xs font-black text-primary-foreground active:scale-[0.98]">
              Validate
            </button>
          </div>
          {showPayload && (
            <pre className="max-h-56 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words rounded-2xl bg-secondary/60 p-3 text-[10px] font-semibold leading-relaxed text-muted-foreground">
              {JSON.stringify({ envelope: { contractVersion: selected.contractVersion, eventId: selected.eventId, eventType: selected.eventType }, governance: { actorName: selected.actorName, actorRole: selected.actorRole }, payload: selected.payload }, null, 2)}
            </pre>
          )}
          {manualValidation && (
            <div className="space-y-2">
              {(validation?.events || []).map((ev, i) => (
                <div key={i} className="flex items-start gap-2 rounded-2xl bg-secondary/60 p-3">
                  {validation?.issues?.length ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
                  <div><p className="break-words text-xs font-black text-foreground">{ev}</p>{validatedAt && <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{formatTime(validatedAt)}</p>}</div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* Desktop response preview */}
      {response && (
        <SectionCard className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><GitBranch className="h-4 w-4" /></span>
            <div><h2 className="text-sm font-black text-foreground">Desktop Response Preview</h2><p className="mt-0.5 text-xs font-semibold text-muted-foreground">Inspect-only. No real desktop connection exists.</p></div>
          </div>
          <InfoLine label="Action" value={response.desktopAction} />
          <InfoLine label="Mutation" value={response.mutationAllowed ? "Allowed" : "Blocked"} />
          <InfoLine label="Review queue" value={response.reviewQueue} />
        </SectionCard>
      )}

      {/* Workflow contracts */}
      <SectionCard className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><LockKeyhole className="h-4 w-4" /></span>
          <div><h2 className="text-sm font-black text-foreground">Workflow Contracts</h2><p className="mt-0.5 text-xs font-semibold text-muted-foreground">{DESKTOP_SYNC_CONTRACT_VERSION}</p></div>
        </div>
        <div className="space-y-2">
          {WORKFLOW_SYNC_CONTRACTS.map((contract) => (
            <div key={contract.stage} className="rounded-2xl border border-border bg-background/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-foreground">Stage {contract.stage} · {contract.workflow}</p>
                  <p className="mt-1 text-xs font-bold leading-snug text-muted-foreground">{contract.desktopBehavior}</p>
                </div>
                <StatusBadge status={DESKTOP_SYNC_STATUSES.SYNC_CONTRACT_PREVIEW} label={`${contract.eventTypes.length} events`} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Queue sub-components ─────────────────────────────────────────────────────
function SyncCard({ record, onView, onRetry, retrying }) {
  const rows = itemRowsFor(record);
  const itemName = rows.length ? itemNameFromSnapshot(rows[0]) : itemNameFromSnapshot(record.localSnapshot || record.payloadSnapshot || {});
  const actionLabel = record.status === SYNC_STATUSES.CONFLICT ? "Open Conflict"
    : record.status === SYNC_STATUSES.DUPLICATE ? "Open Review"
    : record.status === SYNC_STATUSES.SYNC_FAILED ? "View Failed" : "View";
  return (
    <article className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${statusTone(record.status)}`}>{statusLabel(record)}</span>
          <h3 className="text-base font-black text-foreground mt-3 break-words">{record.title || workflowTitle(record)}</h3>
          <p className="text-sm text-muted-foreground mt-1 break-words">{itemName} · {workflowTitle(record)}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-black text-foreground">{rows.length || "1"}</p>
          <p className="text-[11px] text-muted-foreground mt-1">items</p>
        </div>
      </div>
      {record.failureReason && <p className="rounded-xl bg-destructive/10 text-destructive text-xs font-semibold p-3">Handoff failed — work still saved locally.</p>}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onView} className={MINI_BTN}><Eye className="w-3.5 h-3.5" />{actionLabel}</button>
        <button onClick={onRetry} disabled={retrying || !isSyncRetryAllowed(record)} className={MINI_BTN}><RotateCcw className="w-3.5 h-3.5" />{retrying ? "Retrying..." : "Retry"}</button>
      </div>
    </article>
  );
}

function SyncDetail({ record, session, onBack, onRetry, onResolve, retrying, syncMessage }) {
  const [reason, setReason] = useState("");
  const isConflict   = record.status === SYNC_STATUSES.CONFLICT;
  const isDuplicate  = record.status === SYNC_STATUSES.DUPLICATE;
  const isFailed     = FAILED_STATUSES.has(record.status);
  const isDiscarded  = record.status === SYNC_STATUSES.DISCARDED;
  const isEscalated  = record.status === SYNC_STATUSES.ESCALATED;
  const canResolveReview = hasRoleAtLeast(session?.actorRole, "Supervisor");
  const allowDiscard     = canDiscard(record, session) && canResolveSyncAction("discard", record, session);
  const reviewReason     = restrictedActionReason("Supervisor");

  const rows = [
    ["Status",       statusLabel(record)],
    ["Created by",   `${record.createdBy || "Scanner operator"} · ${record.createdRole || "Staff"}`],
    ["Created at",   formatTime(record.createdAt)],
    ["Workflow",     workflowTitle(record)],
    ["Source req.",  record.sourceRef || record.sourceRequestId || "—"],
    ["Device",       record.deviceId || "—"],
    ["Last attempt", formatTime(record.lastAttemptAt)],
    ["Attempts",     String(record.attemptCount || record.retryCount || 0)],
  ];

  const handleAction = (action) => {
    const trimmed = reason.trim();
    if (["escalate", "discard"].includes(action) && !trimmed) return;
    onResolve(action, record, trimmed);
    setReason("");
  };

  return (
    <div className="space-y-4">
      {syncMessage && (
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-sm font-black text-foreground">{syncMessage.title}</p>
          <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">{syncMessage.helper}</p>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border p-5">
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${statusTone(record.status)}`}>{statusLabel(record)}</span>
        <h2 className="text-lg font-black text-foreground mt-3 break-words">{record.title || workflowTitle(record)}</h2>
        {record.failureReason && <p className="mt-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold p-3">Handoff failed — work still saved locally.</p>}
      </div>

      <div className="bg-card rounded-2xl border border-border divide-y divide-border">
        {rows.map(([label, value]) => <InfoRow key={label} label={label} value={value} />)}
      </div>

      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Saved work</p>
        {itemRowsFor(record).length === 0 ? (
          <div className="rounded-2xl bg-secondary/60 px-4 py-3">
            {Object.keys(record.localSnapshot || record.payloadSnapshot || record.payload || {})
              .filter((k) => !["rawItem", "payload", "payloadSnapshot", "localSnapshot"].includes(k)).slice(0, 8)
              .map((k) => <InfoRow key={k} label={k.replaceAll("_", " ")} value={payloadValue((record.localSnapshot || record.payloadSnapshot || record.payload || {})[k])} />)}
          </div>
        ) : (
          itemRowsFor(record).map((item, i) => {
            const name = item.itemName || item.item_name || item.name || `Item ${i + 1}`;
            const qty = item.quantity ?? item.counted_quantity ?? item.requested_qty ?? "—";
            const reason = item.reason || item.condition || item.markdownType || "—";
            return (
              <div key={i} className="rounded-2xl bg-secondary/60 px-4 py-3">
                <p className="text-sm font-black text-foreground">{name}</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <SmallFact label="Qty" value={String(qty)} />
                  <SmallFact label="Reason" value={reason} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {!isDiscarded && record.status !== SYNC_STATUSES.SYNCED && (
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Resolution note</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full min-h-20 rounded-2xl border border-border bg-background p-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            placeholder="Required for Escalate and Discard."
          />
          <div className="space-y-2">
            {(isConflict || record.status === SYNC_STATUSES.NEEDS_REVIEW) && canResolveReview && <button onClick={() => handleAction("keep_local")} className={BTN_SECONDARY}><ShieldAlert className="w-4 h-4" />Keep Local as Evidence</button>}
            {(isConflict || isFailed || record.status === SYNC_STATUSES.NEEDS_REVIEW) && canResolveReview && <button onClick={() => handleAction("refresh_server")} className={BTN_SECONDARY}><GitCompareArrows className="w-4 h-4" />Refresh Server Value</button>}
            {isDuplicate && canResolveReview && <button onClick={() => handleAction("keep_duplicate")} className={BTN_SECONDARY}><FileWarning className="w-4 h-4" />Keep as Separate Evidence</button>}
            {!canResolveReview && (isConflict || isDuplicate || isFailed || record.status === SYNC_STATUSES.NEEDS_REVIEW) && <p className="rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-black text-muted-foreground">{reviewReason}</p>}
            <button onClick={() => handleAction("escalate")} disabled={!reason.trim()} className={BTN_PRIMARY}><AlertTriangle className="w-4 h-4" />Escalate</button>
            <button onClick={() => handleAction("discard")} disabled={!allowDiscard || !reason.trim()} className={BTN_DANGER}><Trash2 className="w-4 h-4" />Discard Local Draft</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <button onClick={onRetry} disabled={retrying || !isSyncRetryAllowed(record)} className={BTN_PRIMARY}><RotateCcw className="w-4 h-4" />{retrying ? "Retrying..." : "Retry"}</button>
        <button onClick={onBack} className={BTN_SECONDARY}>Back to Queue</button>
      </div>
    </div>
  );
}

// ─── Root page ────────────────────────────────────────────────────────────────
export default function SyncHandoff() {
  const session  = useScanOpsSession();
  const isManager = hasRoleAtLeast(session?.actorRole, "Manager");

  const mainTabs = [
    { id: "queue",     label: "Queue" },
    ...(isManager ? [{ id: "setup",     label: "Setup" }] : []),
    ...(isManager ? [{ id: "contracts", label: "Contracts" }] : []),
  ];
  const [activeMain, setActiveMain] = useState("queue");

  useEffect(() => {
    createScanOpsEvent(SCANOPS_EVENT_TYPES.SYNC_STATUS_VIEWED, {
      source_module: "Sync & Handoff",
      status: "viewed",
      sync_exempt: true,
    });
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <PageHeader title="Sync & Handoff" subtitle="Queue · Setup · Contracts" />
      <main className="flex-1 px-4 py-4 pb-8 space-y-4 overflow-y-auto overflow-x-hidden" data-scanops-scroll>
        <TabBar tabs={mainTabs} active={activeMain} onChange={setActiveMain} />
        {activeMain === "queue"     && <QueueTab session={session} />}
        {activeMain === "setup"     && <SetupTab />}
        {activeMain === "contracts" && <ContractsTab />}
      </main>
    </div>
  );
}