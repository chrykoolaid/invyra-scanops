import React, { useState } from "react";
import PageHeader from "../components/scanner/PageHeader";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Laptop,
  PlayCircle,
  RefreshCw,
  ShieldAlert,
  WifiOff,
} from "lucide-react";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { useScanOpsSession } from "../lib/scanOpsSession";
import { getNetworkMode, getSyncQueue, getSyncSummary } from "../lib/scanOpsSync";
import {
  SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES,
  buildScanOpsManualSyncExecutionPlan,
  runScanOpsManualSyncExecution,
} from "../inventory-bridge/manualSync/index.js";
import { buildScanOpsReceiptApplicationBoundary } from "../inventory-bridge/receiptApplication/index.js";
import { createScanOpsBridgeHttpDispatchAdapter } from "../inventory-bridge/transportClient/index.js";

const SETUP_STORAGE_KEY = "scanops_sync_endpoint_config";
const BTN_PRIMARY = "min-h-12 rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground active:scale-[0.98] disabled:opacity-40";
const BTN_SECONDARY = "min-h-12 rounded-2xl bg-secondary px-4 text-sm font-black text-secondary-foreground active:bg-border disabled:opacity-40";

const MANUAL_SYNC_ELIGIBLE_STATUSES = new Set([
  "queued",
  "sync_pending",
  "sync_failed",
  "LOCAL_SAVED",
  "FAILED",
]);

function safeRead(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function nowLabel() {
  try {
    return new Date().toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" });
  } catch {
    return "Just now";
  }
}

function endpointFromConfig(config = {}) {
  return Object.freeze({
    host: config.ipAddress || config.host || "",
    port: config.port || "",
    path: config.path || "/scanops/handoff",
    desktopId: config.knownDesktopId || "inventory-desktop-local",
    desktopName: config.desktopName || "Inventory Desktop",
    environment: "LIVE",
  });
}

function deviceIdentityFromSession(session = {}) {
  return Object.freeze({
    deviceId: session.deviceId || session.scannerId || "scanops-device-local",
    storeId: session.storeId || session.location_id || "store-local",
    sessionId: session.sessionId || session.shiftId || "session-local",
    operatorId: session.actorUserId || session.user_id || null,
  });
}

function manualRequestFromSession(session = {}) {
  return Object.freeze({
    trigger: "manual",
    userInitiated: true,
    requestedBy: session.actorUserId || session.actorName || "operator",
    requestedAt: nowIso(),
    reason: "Operator tapped Sync Now.",
  });
}

function eligibleManualSyncItems(queue = []) {
  return queue.filter((item) => MANUAL_SYNC_ELIGIBLE_STATUSES.has(item.status));
}

function statusLabel(status) {
  if (status === SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.READY) return "Ready";
  if (status === SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.COMPLETED) return "Completed";
  if (status === SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.PARTIAL) return "Partial";
  if (status === SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.FAILED) return "Failed";
  if (status === SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.EMPTY) return "Empty";
  return "Blocked";
}

function resultTone(status) {
  if (status === SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.COMPLETED) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.PARTIAL || status === SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.READY) return "border-blue-200 bg-blue-50 text-blue-800";
  if (status === SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.EMPTY) return "border-slate-200 bg-slate-50 text-slate-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function Section({ icon: Icon, title, helper, badge, children }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="break-words text-sm font-black text-foreground">{title}</h2>
            {helper && <p className="mt-1 break-words text-xs font-semibold leading-snug text-muted-foreground">{helper}</p>}
          </div>
        </div>
        {badge && <span className="shrink-0 rounded-full border border-border px-2 py-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">{badge}</span>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}

function Metric({ label, value, helper }) {
  return (
    <div className="min-w-0 rounded-2xl bg-secondary/70 px-3 py-2">
      <p className="truncate text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-black text-foreground">{value}</p>
      {helper && <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-snug text-muted-foreground">{helper}</p>}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="break-words text-right text-sm font-black text-foreground">{value}</span>
    </div>
  );
}

export default function ManualSyncControl() {
  const session = useScanOpsSession();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const config = safeRead(SETUP_STORAGE_KEY, {});
  const networkMode = getNetworkMode();
  const summary = getSyncSummary();
  const queue = getSyncQueue();
  const manualQueue = eligibleManualSyncItems(queue);
  const endpoint = endpointFromConfig(config);
  const deviceIdentity = deviceIdentityFromSession(session);
  const plan = buildScanOpsManualSyncExecutionPlan(manualQueue, {
    endpoint,
    deviceIdentity,
    manualRequest: manualRequestFromSession(session),
    now: nowIso,
  });
  const hasEndpoint = Boolean(endpoint.host);
  const isOffline = networkMode === "offline";
  const canRunManualSync = !isRunning && hasEndpoint && !isOffline && plan.status === SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.READY;
  const disabledReason = !hasEndpoint
    ? "Pair or enter an Inventory Desktop first."
    : isOffline
      ? "Device is offline. Connect to the store network first."
      : plan.status !== SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.READY
        ? "No eligible queue items are ready for manual sync."
        : "Ready for operator-initiated sync.";

  const handleSyncNow = async () => {
    if (!canRunManualSync) return;
    setIsRunning(true);
    const manualRequest = manualRequestFromSession(session);
    createScanOpsEvent(SCANOPS_EVENT_TYPES.SYNC_STATUS_VIEWED, {
      source_module: "Manual Sync Control",
      status: "manual_sync_requested",
      queue_items_selected: manualQueue.length,
      sync_exempt: true,
    });

    try {
      const dispatch = createScanOpsBridgeHttpDispatchAdapter(typeof window !== "undefined" ? window.fetch?.bind(window) : null);
      const result = await runScanOpsManualSyncExecution(manualQueue, {
        endpoint,
        deviceIdentity,
        manualRequest,
        dispatch,
        now: nowIso,
      });
      const receiptBoundary = buildScanOpsReceiptApplicationBoundary(result, { now: nowIso });
      setLastResult({ ...result, receiptBoundary, completedAtLabel: nowLabel() });
      createScanOpsEvent(SCANOPS_EVENT_TYPES.SYNC_STATUS_VIEWED, {
        source_module: "Manual Sync Control",
        status: `manual_sync_${String(result.status || "unknown").toLowerCase()}`,
        queue_items_selected: manualQueue.length,
        queue_items_dispatched: result.syncResults?.length || 0,
        receipt_display_staged: receiptBoundary.stagedReceiptCount || 0,
        sync_exempt: true,
      });
    } catch (error) {
      const failedResult = {
        status: SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.FAILED,
        dispatchAttempted: false,
        projectedQueuePatches: [],
        syncResults: [],
        errors: [{ code: "manual_sync_ui_error", message: error?.message || "Manual sync failed before dispatch." }],
        inventoryMutationAttempted: false,
        scanOpsMutationAttempted: false,
        stockMutationAttempted: false,
        priceMutationAttempted: false,
        approvalMutationAttempted: false,
        queueWriteApplied: false,
      };
      setLastResult({
        ...failedResult,
        receiptBoundary: buildScanOpsReceiptApplicationBoundary(failedResult, { now: nowIso }),
        completedAtLabel: nowLabel(),
      });
    } finally {
      setIsRunning(false);
      setRefreshKey((value) => value + 1);
    }
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background" key={refreshKey}>
      <PageHeader title="Manual Sync" subtitle="Operator-controlled bridge handoff" />
      <main className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4 pb-8" data-scanops-scroll>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-black leading-snug text-amber-800">
            Sync Now is manual only. ScanOps sends operational evidence to the governed bridge. Inventory Desktop validates receipts and remains the system of record.
          </p>
        </div>

        <section className={`rounded-3xl border p-4 shadow-sm ${resultTone(plan.status)}`}>
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70">
              {isOffline ? <WifiOff className="h-6 w-6" /> : <PlayCircle className="h-6 w-6" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] opacity-80">Manual Control</p>
              <h2 className="mt-1 text-2xl font-black leading-tight">{statusLabel(plan.status)}</h2>
              <p className="mt-1 text-sm font-bold leading-snug opacity-90">{disabledReason}</p>
            </div>
          </div>
          <button type="button" className={`mt-4 w-full ${BTN_PRIMARY}`} onClick={handleSyncNow} disabled={!canRunManualSync}>
            {isRunning ? <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 inline h-4 w-4" />}
            {isRunning ? "Sync Running" : "Sync Now"}
          </button>
        </section>

        <Section icon={Database} title="Queue Selection" helper="Only pending or failed local evidence is eligible. Review/conflict items stay out of manual dispatch." badge="Projection">
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Eligible" value={manualQueue.length} helper="Selected for planning" />
            <Metric label="Ready" value={plan.readyQueueItemCount || 0} helper="Can be handed off" />
            <Metric label="Blocked" value={plan.blockedQueueItemCount || 0} helper="Unsafe or unsupported" />
            <Metric label="Review" value={(summary.conflict || 0) + (summary.needsReview || 0) + (summary.duplicate || 0)} helper="Not sent" />
          </div>
        </Section>

        <Section icon={Laptop} title="Inventory Desktop Target" helper="The endpoint comes from the saved Sync & Connectivity profile.">
          <div className="rounded-2xl bg-secondary/60 px-4 py-1">
            <InfoRow label="Desktop" value={endpoint.desktopName || "Not paired"} />
            <InfoRow label="Host" value={endpoint.host || "Not set"} />
            <InfoRow label="Port" value={endpoint.port || "Default"} />
            <InfoRow label="Path" value={endpoint.path || "/scanops/handoff"} />
          </div>
        </Section>

        {lastResult && (
          <Section icon={lastResult.status === SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.COMPLETED ? CheckCircle2 : AlertTriangle} title="Last Manual Sync Result" helper="Displayed result only. Queue writes are not applied by this screen." badge={statusLabel(lastResult.status)}>
            <div className="grid grid-cols-2 gap-2">
              <Metric label="Status" value={statusLabel(lastResult.status)} />
              <Metric label="Finished" value={lastResult.completedAtLabel || "Just now"} />
              <Metric label="Dispatched" value={lastResult.syncResults?.length || 0} />
              <Metric label="Projected" value={lastResult.projectedQueuePatches?.length || 0} helper="Local descriptors" />
              <Metric label="Staged" value={lastResult.receiptBoundary?.stagedReceiptCount || 0} helper="Display only" />
              <Metric label="Queue writes" value="0" helper="Blocked" />
            </div>
            {lastResult.receiptBoundary && (
              <div className="mt-3 rounded-2xl bg-secondary/60 p-3">
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Receipt boundary</p>
                <div className="mt-2 rounded-xl bg-background/70 px-3 py-1">
                  <InfoRow label="Mode" value="Display staging only" />
                  <InfoRow label="Review" value={String(lastResult.receiptBoundary.reviewRequiredCount || 0)} />
                  <InfoRow label="Retry" value={String(lastResult.receiptBoundary.retryRequiredCount || 0)} />
                  <InfoRow label="Queue write" value={lastResult.receiptBoundary.queueWriteApplied ? "Applied" : "Blocked"} />
                </div>
                {lastResult.receiptBoundary.stagedReceiptApplications?.slice(0, 3).map((item) => (
                  <div key={item.boundaryId} className="mt-2 rounded-xl bg-background/70 px-3 py-2">
                    <p className="text-sm font-black text-foreground">{item.queueItemId || "Queue item"}</p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">{item.displayStatus} · {item.nextAction}</p>
                  </div>
                ))}
              </div>
            )}
            {lastResult.errors?.length > 0 && (
              <div className="mt-3 rounded-2xl bg-secondary/60 p-3">
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">First issue</p>
                <p className="mt-1 text-sm font-bold text-foreground">{lastResult.errors[0]?.message || lastResult.errors[0]?.code}</p>
              </div>
            )}
          </Section>
        )}

        <Section icon={ShieldAlert} title="Guardrails" helper="This screen must not become automatic background replay.">
          <div className="space-y-2">
            {[
              "Operator must tap Sync Now.",
              "No automatic background replay is enabled.",
              "ScanOps does not write Inventory stock, price, ledger, or approval decisions.",
              "Receipt results are staged for display only before any future scoped queue application.",
              "Queue status changes shown here are projected descriptors only.",
            ].map((item) => (
              <div key={item} className="rounded-2xl bg-secondary/60 px-3 py-3 text-sm font-bold text-foreground">{item}</div>
            ))}
          </div>
        </Section>
      </main>
    </div>
  );
}
