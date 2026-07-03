import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/scanner/PageHeader";
import { AlertTriangle, CheckCircle2, Eye, FileWarning, GitCompareArrows, RotateCcw, ShieldAlert, Trash2, Wifi, WifiOff } from "lucide-react";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { useScanOpsSession } from "../lib/scanOpsSession";
import { hasRoleAtLeast, restrictedActionReason } from "../lib/scanOpsPermissions";
import {
  deriveHandoffStateFromSyncStatus,
  formatHandoffStateLabel,
} from "../lib/scanOpsInventoryDesktopHandoffContract";
import {
  discardLocalDraft,
  escalateSyncItem,
  getNetworkMode,
  getSyncQueue,
  getSyncSummary,
  isSyncRetryAllowed,
  keepDuplicateAsSeparateEvidence,
  keepLocalAsEvidence,
  refreshServerValue,
  retrySyncEvent,
  SYNC_STATUSES,
} from "../lib/scanOpsSync";

const BUTTON_PRIMARY = "w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:active:scale-100";
const BUTTON_SECONDARY = "w-full py-4 rounded-2xl bg-secondary text-secondary-foreground font-bold text-sm active:scale-[0.98] active:bg-border transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:active:scale-100";
const BUTTON_DANGER = "w-full py-4 rounded-2xl bg-destructive text-destructive-foreground font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:active:scale-100";
const MINI_BUTTON = "px-3 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-xs font-bold active:scale-[0.98] active:bg-border transition-all flex items-center justify-center gap-1.5 disabled:opacity-40";
const TAB_BUTTON = "rounded-2xl px-3 py-3 text-xs font-black border transition-all active:scale-[0.98]";

const PENDING_STATUSES = new Set([SYNC_STATUSES.QUEUED, SYNC_STATUSES.SYNC_PENDING, SYNC_STATUSES.SYNCING, SYNC_STATUSES.LOCAL_SAVED]);
const FAILED_STATUSES = new Set([SYNC_STATUSES.SYNC_FAILED, SYNC_STATUSES.FAILED]);
const CONFLICT_STATUSES = new Set([SYNC_STATUSES.CONFLICT, SYNC_STATUSES.DUPLICATE, SYNC_STATUSES.NEEDS_REVIEW, SYNC_STATUSES.ESCALATED]);
const ISSUE_STATUSES = new Set([...FAILED_STATUSES, ...CONFLICT_STATUSES]);

const WORKFLOW_LABELS = {
  stock_count: "Stock Count",
  receiving: "Receiving",
  transfer: "Transfers",
  waste: "Waste",
  markdown: "Markdowns",
  shelf_tickets: "Shelf Tickets",
  replenishment: "Replenishment",
  price_check: "Price / Promo Check",
  task: "Tasks",
  unknown_item_evidence: "Product Identity",
  scanops: "ScanOps",
};

function formatTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return value;
  }
}

function statusTone(status) {
  if (status === SYNC_STATUSES.SYNCED) return "bg-emerald-500/10 border-emerald-500/20 text-emerald-700";
  if (status === SYNC_STATUSES.DISCARDED) return "bg-slate-500/10 border-slate-500/20 text-slate-700";
  if (status === SYNC_STATUSES.ESCALATED) return "bg-amber-500/10 border-amber-500/20 text-amber-700";
  if (status === SYNC_STATUSES.DUPLICATE) return "bg-violet-500/10 border-violet-500/20 text-violet-700";
  if (ISSUE_STATUSES.has(status)) return "bg-destructive/10 border-destructive/20 text-destructive";
  if (PENDING_STATUSES.has(status)) return "bg-primary/10 border-primary/20 text-primary";
  return "bg-secondary border-border text-muted-foreground";
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
  return snapshot.item_name || snapshot.itemName || snapshot.name || snapshot.sku || snapshot.barcode || snapshot.plu || snapshot.entered_code || first.itemName || first.item_name || first.sku || "Local evidence";
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
  if (session.actorRole === "Manager") return queue.filter((record) => !record.locationId || record.locationId === session.storeId);
  if (session.actorRole === "Supervisor") return queue.filter((record) => !record.locationId || record.locationId === session.storeId);
  return queue.filter((record) => record.userId === session.actorUserId || record.deviceId === session.deviceId || record.createdBy === session.actorName);
}

function applyTab(record, tab) {
  if (tab === "pending") return PENDING_STATUSES.has(record.status);
  if (tab === "review") return FAILED_STATUSES.has(record.status) || CONFLICT_STATUSES.has(record.status);
  if (tab === "synced") return record.status === SYNC_STATUSES.SYNCED;
  if (tab === "discarded") return record.status === SYNC_STATUSES.DISCARDED;
  return true;
}

function canDiscard(record, session) {
  if (["Supervisor", "Manager", "Admin"].includes(session?.actorRole)) return true;
  return record.userId === session?.actorUserId || record.deviceId === session?.deviceId || record.createdBy === session?.actorName;
}

function canKeepDuplicateSeparate(session) {
  return hasRoleAtLeast(session?.actorRole, "Supervisor");
}

function canResolveSyncAction(action, record, session) {
  if (["keep_local", "refresh_server", "keep_duplicate"].includes(action)) return hasRoleAtLeast(session?.actorRole, "Supervisor");
  if (action === "discard" && (FAILED_STATUSES.has(record.status) || CONFLICT_STATUSES.has(record.status))) return hasRoleAtLeast(session?.actorRole, "Supervisor");
  return true;
}

export default function SyncQueue() {
  const navigate = useNavigate();
  const session = useScanOpsSession();
  const [queue, setQueue] = useState(() => getSyncQueue());
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [retryingIds, setRetryingIds] = useState(() => new Set());
  const [syncMessage, setSyncMessage] = useState(null);
  const summary = useMemo(() => getSyncSummary(), [queue]);

  const refresh = () => {
    const next = getSyncQueue();
    setQueue(next);
    if (selected) {
      const refreshedSelected = next.find((record) => record.id === selected.id || record.queueId === selected.queueId);
      if (refreshedSelected) setSelected(refreshedSelected);
    }
  };

  const scopedQueue = useMemo(() => scopeQueueForRole(queue, session), [queue, session]);
  const filtered = useMemo(() => scopedQueue.filter((record) => applyTab(record, activeTab)), [activeTab, scopedQueue]);

  const handleRetry = (record) => {
    if (!record?.id || retryingIds.has(record.id) || !isSyncRetryAllowed(record)) return;
    setRetryingIds((current) => new Set([...current, record.id]));
    createScanOpsEvent(SCANOPS_EVENT_TYPES.SYNC_RETRY_REQUESTED, {
      source_module: "Inventory Handoff",
      status: "requested",
      sync_record_id: record.id,
      source_request_id: record.sourceRequestId,
      sync_exempt: true,
    });
    const result = retrySyncEvent(record.id);
    if (result && FAILED_STATUSES.has(result.status)) {
      setSyncMessage({ title: "Handoff failed", helper: "Try again when the connection is stable. Your local work is still saved." });
    } else {
      setSyncMessage({ title: "Retry checked", helper: "If the item cannot be handed off yet, it will stay saved locally for review." });
    }
    setSelected(result || record);
    setRetryingIds((current) => {
      const next = new Set(current);
      next.delete(record.id);
      return next;
    });
    refresh();
  };

  const handleOpenManualSync = () => {
    createScanOpsEvent(SCANOPS_EVENT_TYPES.SYNC_STATUS_VIEWED, {
      source_module: "Inventory Handoff",
      status: "manual_sync_opened_from_queue",
      pending_count: summary.pending,
      review_count: summary.failed + summary.conflict + summary.duplicate + summary.needsReview + summary.escalated,
      sync_exempt: true,
    });
    navigate("/sync-control");
  };

  const handleResolve = (action, record, reason) => {
    if (!canResolveSyncAction(action, record, session)) {
      createScanOpsEvent(SCANOPS_EVENT_TYPES.PERMISSION_ATTEMPT_BLOCKED, {
        source_module: "Inventory Handoff",
        status: "blocked",
        sync_record_id: record.id,
        attempted_action: action,
        blocked_reason: restrictedActionReason("Supervisor"),
        sync_exempt: true,
      });
      return;
    }
    let result = null;
    if (action === "keep_local") result = keepLocalAsEvidence(record.id, reason || "Preserved local evidence for review.");
    if (action === "refresh_server") result = refreshServerValue(record.id, reason || "Refreshed server/source display snapshot.");
    if (action === "escalate") result = escalateSyncItem(record.id, reason);
    if (action === "discard") result = discardLocalDraft(record.id, reason);
    if (action === "keep_duplicate") result = keepDuplicateAsSeparateEvidence(record.id, reason || "Kept duplicate as separate evidence.");
    createScanOpsEvent(SCANOPS_EVENT_TYPES.SYNC_STATUS_VIEWED, {
      source_module: "Inventory Handoff",
      status: action,
      sync_record_id: record.id,
      resolution_reason: reason,
      sync_exempt: true,
    });
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

  const offline = getNetworkMode() === "offline";
  const reviewCount = summary.conflict + summary.duplicate + summary.needsReview + summary.escalated;
  const issueCount = summary.failed + reviewCount;
  const retryableCount = scopedQueue.filter(isSyncRetryAllowed).length;

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <PageHeader title="Inventory Handoff" subtitle="Local records for future desktop review" />
      <main className="flex-1 px-4 py-5 pb-8 space-y-4 overflow-y-auto overflow-x-hidden" data-scanops-scroll>
        {syncMessage && (
          <section className="rounded-2xl border border-border bg-card px-4 py-3 min-w-0">
            <p className="text-sm font-black text-foreground">{syncMessage.title}</p>
            <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">{syncMessage.helper}</p>
          </section>
        )}
        <section className="bg-card rounded-2xl border border-border p-5 min-w-0">
          <div className="flex items-start gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${offline ? "bg-amber-500/10 text-amber-700" : issueCount ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700"}`}>
              {offline ? <WifiOff className="w-5 h-5" /> : issueCount ? <AlertTriangle className="w-5 h-5" /> : <Wifi className="w-5 h-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Status</p>
              <h2 className="text-lg font-black text-foreground mt-1 break-words">{summary.pending} pending handoff · {reviewCount + summary.failed} review/blocked · {summary.synced} ready</h2>
              <p className="text-sm text-muted-foreground mt-1 break-words">Saved locally for future Inventory Desktop handoff. Queue review is visibility-first: this screen never creates products, posts stock, approves counts, sends audit uploads, prints tickets, or runs retry-all.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <SmallFact label="Retry eligible" value={`${retryableCount} item${retryableCount === 1 ? "" : "s"}`} />
            <SmallFact label="Control mode" value="Single item / manual sync" />
          </div>
          <button onClick={handleOpenManualSync} className={`${BUTTON_SECONDARY} mt-3`}>
            <RotateCcw className="w-4 h-4" />Open Manual Sync
          </button>
          <p className="text-xs text-muted-foreground mt-3">Desktop transport: {offline ? "Offline" : "Not connected / local pilot"} · Scope: {session?.actorRole === "Staff" ? "own device/user" : session?.actorRole === "Admin" ? "all handoff records" : "store/team handoff records"}</p>
        </section>

        <section className="grid grid-cols-3 gap-2 min-w-0">
          <TabButton id="pending" label="Pending handoff" count={summary.pending} active={activeTab === "pending"} onClick={setActiveTab} />
          <TabButton id="review" label="Review / blocked" count={reviewCount + summary.failed} active={activeTab === "review"} onClick={setActiveTab} />
          <TabButton id="synced" label="Ready" count={summary.synced} active={activeTab === "synced"} onClick={setActiveTab} />
          {session?.actorRole !== "Staff" && <TabButton id="discarded" label="Discarded" count={summary.discarded} active={activeTab === "discarded"} onClick={setActiveTab} />}
        </section>

        <section className="space-y-3 min-w-0">
          {filtered.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-6 text-center min-w-0">
              <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-sm font-bold text-foreground mt-3">{activeTab === "pending" ? "No pending handoff items" : activeTab === "review" ? "No blocked or review items" : activeTab === "synced" ? "No ready handoff items yet" : "No discarded items"}</p>
              <p className="text-xs text-muted-foreground mt-1">{activeTab === "pending" ? "New offline work will appear here." : "Scanner work stays saved locally until it is ready for future desktop handoff or reviewed."}</p>
            </div>
          ) : (
            filtered.map((record) => <SyncCard key={record.id} record={record} onView={() => setSelected(record)} onRetry={() => handleRetry(record)} retrying={retryingIds.has(record.id)} />)
          )}
        </section>
      </main>
    </div>
  );
}

function TabButton({ id, label, count, active, onClick }) {
  return (
    <button onClick={() => onClick(id)} className={`${TAB_BUTTON} ${active ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>
      <span className="block truncate">{label}</span>
      <span className="block text-[10px] opacity-80 mt-0.5">{count}</span>
    </button>
  );
}

function SyncCard({ record, onView, onRetry, retrying = false }) {
  const rows = itemRowsFor(record);
  const itemName = rows.length ? itemNameFromSnapshot(rows[0]) : itemNameFromSnapshot(record.localSnapshot || record.payloadSnapshot || {});
  const actionLabel = record.status === SYNC_STATUSES.CONFLICT ? "Open Conflict" : record.status === SYNC_STATUSES.DUPLICATE ? "Open Review" : record.status === SYNC_STATUSES.SYNC_FAILED ? "View Failed Handoff" : "View";
  return (
    <article className="bg-card rounded-2xl border border-border p-4 min-w-0 space-y-3">
      <div className="flex items-start justify-between gap-3 min-w-0">
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
      <div className="grid grid-cols-2 gap-2">
        <SmallFact label="User / device" value={`${record.createdBy || "Operator"} · ${record.deviceId || "device"}`} />
        <SmallFact label="Source" value={record.sourceRef || record.sourceRequestId || workflowTitle(record)} />
      </div>
      {record.failureReason && <p className="rounded-xl bg-destructive/10 text-destructive text-xs font-semibold p-3 break-words">Handoff failed. Try again when the connection is stable; no desktop commit was created.</p>}
      {record.matchingEvidence && <p className="rounded-xl bg-violet-500/10 text-violet-700 text-xs font-semibold p-3 break-words">Matching evidence: {record.matchingEvidence.submitted_by || "Operator"} · {record.matchingEvidence.source || "Inventory Handoff"} · {record.matchingEvidence.status || "open"}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onView} className={MINI_BUTTON}><Eye className="w-3.5 h-3.5" />{actionLabel}</button>
        <button onClick={onRetry} disabled={retrying || !isSyncRetryAllowed(record)} className={MINI_BUTTON}><RotateCcw className="w-3.5 h-3.5" />{retrying ? "Retrying..." : "Retry"}</button>
      </div>
    </article>
  );
}

function SyncDetail({ record, session, onBack, onRetry, onResolve, retrying = false, syncMessage = null }) {
  const [reason, setReason] = useState("");
  const isConflict = record.status === SYNC_STATUSES.CONFLICT;
  const isDuplicate = record.status === SYNC_STATUSES.DUPLICATE;
  const isFailed = FAILED_STATUSES.has(record.status);
  const isDiscarded = record.status === SYNC_STATUSES.DISCARDED;
  const isEscalated = record.status === SYNC_STATUSES.ESCALATED;
  const needsReason = (action) => ["escalate", "discard"].includes(action);
  const canResolveReview = hasRoleAtLeast(session?.actorRole, "Supervisor");
  const allowDiscard = canDiscard(record, session) && canResolveSyncAction("discard", record, session);
  const allowSeparate = canKeepDuplicateSeparate(session);
  const reviewReason = restrictedActionReason("Supervisor");

  const rows = [
    ["Status", statusLabel(record)],
    ["Created by", `${record.createdBy || "Scanner operator"} · ${record.createdRole || "Staff"}`],
    ["Created at", formatTime(record.createdAt)],
    ["Workflow", workflowTitle(record)],
    ["Source request", record.sourceRef || record.sourceRequestId || "—"],
    ["Device", record.deviceId || "—"],
    ["Last attempt", formatTime(record.lastAttemptAt)],
    ["Attempts", String(record.attemptCount || record.retryCount || 0)],
    ["Desktop receipt", record.syncedAt ? "Legacy marker only" : "Not received in pilot"],
  ];

  const handleAction = (action) => {
    const trimmed = reason.trim();
    if (needsReason(action) && !trimmed) return;
    onResolve(action, record, trimmed);
    setReason("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <PageHeader title={detailTitle(record)} subtitle={record.title || workflowTitle(record)} />
      <main className="flex-1 px-4 py-5 pb-8 space-y-4 overflow-y-auto overflow-x-hidden" data-scanops-scroll>
        {syncMessage && (
          <section className="rounded-2xl border border-border bg-card px-4 py-3 min-w-0">
            <p className="text-sm font-black text-foreground">{syncMessage.title}</p>
            <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">{syncMessage.helper}</p>
          </section>
        )}
        <section className="bg-card rounded-2xl border border-border p-5 min-w-0">
          <div className="flex items-start gap-3">
            <DetailIcon status={record.status} />
            <div className="min-w-0 flex-1">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${statusTone(record.status)}`}>{statusLabel(record)}</span>
              <h2 className="text-lg font-black text-foreground mt-3 break-words">{record.title || workflowTitle(record)}</h2>
              <p className="text-sm text-muted-foreground mt-1 break-words">{record.summary || record.payloadSummary}</p>
              {record.failureReason && <p className="mt-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold p-3 break-words">Handoff failed. Your work is still saved locally; no desktop record was committed.</p>}
            </div>
          </div>
        </section>

        <section className="bg-card rounded-2xl border border-border divide-y divide-border min-w-0">
          {rows.map(([label, value]) => <InfoRow key={label} label={label} value={value} />)}
        </section>

        {(isConflict || isDuplicate || isFailed || record.status === SYNC_STATUSES.NEEDS_REVIEW || isEscalated || isDiscarded) && (
          <section className="bg-card rounded-2xl border border-border p-5 min-w-0 space-y-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Saved work state</p>
            <div className="grid gap-3">
              <SnapshotPanel title="Local evidence" helper="Saved on device" snapshot={record.localSnapshot || record.payloadSnapshot || record.payload} />
              <SnapshotPanel title="Source value" helper="Not changed by handheld" snapshot={record.serverSnapshot || { source: record.sourceRef || record.sourceRequestId, note: "No source value fetched yet. Retry keeps local evidence intact." }} />
            </div>
            {record.matchingEvidence && <MatchingEvidence evidence={record.matchingEvidence} />}
          </section>
        )}

        <section className="bg-card rounded-2xl border border-border p-5 min-w-0 space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Saved work summary</p>
          {itemRowsFor(record).length === 0 ? (
            <PayloadSnapshot payload={record.localSnapshot || record.payloadSnapshot || record.payload} />
          ) : (
            itemRowsFor(record).map((item, index) => <PayloadItem key={item.requestItemId || item.count_line_id || `${record.id}-${index}`} item={item} index={index} />)
          )}
        </section>

        {!isDiscarded && record.status !== SYNC_STATUSES.SYNCED && (
          <section className="bg-card rounded-2xl border border-border p-5 min-w-0 space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Resolution note</p>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="w-full min-h-24 rounded-2xl border border-border bg-background p-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder="Required for Escalate and Discard. Optional for keep/refresh actions."
            />
            <div className="space-y-2">
              {(isConflict || record.status === SYNC_STATUSES.NEEDS_REVIEW) && canResolveReview && <button onClick={() => handleAction("keep_local")} className={BUTTON_SECONDARY}><ShieldAlert className="w-4 h-4" />Keep Local as Evidence</button>}
              {(isConflict || isFailed || record.status === SYNC_STATUSES.NEEDS_REVIEW) && canResolveReview && <button onClick={() => handleAction("refresh_server")} className={BUTTON_SECONDARY}><GitCompareArrows className="w-4 h-4" />Refresh Server Value</button>}
              {isDuplicate && canResolveReview && <button onClick={() => handleAction("keep_duplicate")} disabled={!allowSeparate} className={BUTTON_SECONDARY}><FileWarning className="w-4 h-4" />Keep as Separate Evidence</button>}
              {!canResolveReview && (isConflict || isDuplicate || isFailed || record.status === SYNC_STATUSES.NEEDS_REVIEW) && <p className="rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-black text-muted-foreground">{reviewReason}</p>}
              <button onClick={() => handleAction("escalate")} disabled={!reason.trim()} className={BUTTON_PRIMARY}><AlertTriangle className="w-4 h-4" />Escalate</button>
              <button onClick={() => handleAction("discard")} disabled={!allowDiscard || !reason.trim()} className={BUTTON_DANGER}><Trash2 className="w-4 h-4" />Discard Local Draft</button>
            </div>
            <p className="text-[11px] text-muted-foreground">These actions preserve local evidence only. They do not mutate live stock, approve counts, close exceptions, create products, create aliases, send audit uploads, or print shelf tickets.</p>
          </section>
        )}

        <section className="bg-card rounded-2xl border border-border p-5 min-w-0">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Handoff history</p>
          <div className="space-y-3 mt-3">
            {(record.syncHistory || []).length === 0 ? <p className="text-sm text-muted-foreground">No handoff history yet.</p> : (record.syncHistory || []).map((entry, index) => (
              <div key={`${entry.at}-${index}`} className="rounded-2xl bg-secondary/60 px-3 py-3 min-w-0">
                <p className="text-xs font-bold text-foreground break-words">{entry.label || entry.status}</p>
                <p className="text-xs text-muted-foreground mt-1 break-words">{entry.message}</p>
                {entry.resolutionReason && <p className="text-xs text-muted-foreground mt-1 break-words">Reason: {entry.resolutionReason}</p>}
                <p className="text-[11px] text-muted-foreground mt-1">{formatTime(entry.at)}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-3">
          <button onClick={onRetry} disabled={retrying || !isSyncRetryAllowed(record)} className={BUTTON_PRIMARY}><RotateCcw className="w-4 h-4" />{retrying ? "Retrying..." : "Retry"}</button>
          <button onClick={onBack} className={BUTTON_SECONDARY}>Back to Handoff Queue</button>
        </div>
      </main>
    </div>
  );
}

function detailTitle(record) {
  if (record.status === SYNC_STATUSES.CONFLICT) return "Needs review";
  if (record.status === SYNC_STATUSES.DUPLICATE) return "Needs review";
  if (FAILED_STATUSES.has(record.status)) return "Handoff failed";
  if (record.status === SYNC_STATUSES.DISCARDED) return "Discarded local record";
  if (record.status === SYNC_STATUSES.ESCALATED) return "Escalated Handoff Review";
  return "Handoff item";
}

function DetailIcon({ status }) {
  const className = `w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${statusTone(status)}`;
  if (status === SYNC_STATUSES.CONFLICT) return <div className={className}><GitCompareArrows className="w-5 h-5" /></div>;
  if (status === SYNC_STATUSES.DUPLICATE) return <div className={className}><FileWarning className="w-5 h-5" /></div>;
  if (FAILED_STATUSES.has(status)) return <div className={className}><AlertTriangle className="w-5 h-5" /></div>;
  return <div className={className}><ShieldAlert className="w-5 h-5" /></div>;
}

function SnapshotPanel({ title, helper, snapshot }) {
  const keys = Object.keys(snapshot || {}).filter((key) => !["rawItem", "payload", "payloadSnapshot", "localSnapshot"].includes(key)).slice(0, 6);
  return (
    <div className="rounded-2xl bg-secondary/60 p-4 min-w-0">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <p className="text-sm font-black text-foreground break-words">{title}</p>
        <p className="text-[10px] text-muted-foreground text-right break-words shrink-0 max-w-[45%]">{helper}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {keys.length === 0 ? <SmallFact label="Snapshot" value="No detail fetched" /> : keys.map((key) => <SmallFact key={key} label={key.replaceAll("_", " ")} value={payloadValue(snapshot[key])} />)}
      </div>
    </div>
  );
}

function MatchingEvidence({ evidence }) {
  return (
    <div className="rounded-2xl bg-violet-500/10 border border-violet-500/20 p-4 min-w-0">
      <p className="text-sm font-black text-violet-700">Matching evidence already exists</p>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <SmallFact label="Submitted by" value={evidence.submitted_by || "—"} />
        <SmallFact label="Source" value={evidence.source || "—"} />
        <SmallFact label="Status" value={evidence.status || "—"} />
        <SmallFact label="Created" value={formatTime(evidence.created_at)} />
      </div>
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

function PayloadItem({ item, index }) {
  const name = item.itemName || item.item_name || item.name || item.title || `Item ${index + 1}`;
  const qty = item.quantity ?? item.counted_quantity ?? item.requested_qty ?? item.copies ?? "—";
  const reason = item.reason || item.reason_label || item.condition || item.markdownType || item.ticketType || item.status || "—";
  const action = item.disposalAction || item.disposal_action || item.paperSize || item.review_status || item.destination_location_label || "—";
  return (
    <article className="rounded-2xl bg-secondary/60 px-4 py-3 min-w-0">
      <p className="text-sm font-black text-foreground break-words">{name}</p>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <SmallFact label="Qty" value={String(qty)} />
        <SmallFact label="Reason" value={reason} />
        <SmallFact label="Action" value={action} />
        <SmallFact label="SKU" value={item.sku || item.barcode || item.plu || "—"} />
      </div>
    </article>
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

function PayloadSnapshot({ payload }) {
  if (!payload) return <p className="text-sm text-muted-foreground">No payload snapshot found.</p>;
  const keys = Object.keys(payload).filter((key) => !["rawItem", "payload", "payloadSnapshot", "localSnapshot"].includes(key)).slice(0, 10);
  return (
    <div className="rounded-2xl bg-secondary/60 px-4 py-3 min-w-0 space-y-2">
      {keys.map((key) => <InfoRow key={key} label={key.replaceAll("_", " ")} value={payloadValue(payload[key])} />)}
    </div>
  );
}
