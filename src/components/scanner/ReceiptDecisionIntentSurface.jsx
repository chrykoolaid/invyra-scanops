import React, { useMemo, useState } from "react";
import { buildScanOpsReceiptDecisionIntentSurface } from "../../inventory-bridge/receiptDecisionIntent/index.js";
import {
  SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES,
  buildScanOpsManualRetryExecutionBoundary,
  runScanOpsManualRetryExecutionBoundary,
} from "../../inventory-bridge/manualRetry/index.js";
import { buildScanOpsRetryResultReceiptReviewBoundary } from "../../inventory-bridge/retryResultReceiptReview/index.js";
import { createScanOpsBridgeHttpDispatchAdapter } from "../../inventory-bridge/transportClient/index.js";

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

function manualRetryRequest(operatorId) {
  return Object.freeze({
    userInitiated: true,
    trigger: "manual_retry",
    requestedBy: operatorId || "operator",
    requestedAt: nowIso(),
    reason: "Operator tapped Run Manual Retry.",
  });
}

function retryStatusLabel(status) {
  if (status === SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES.READY) return "Ready";
  if (status === SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES.COMPLETED) return "Completed";
  if (status === SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES.PARTIAL) return "Partial";
  if (status === SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES.FAILED) return "Failed";
  if (status === SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES.EMPTY) return "Empty";
  return "Blocked";
}

function retryReviewStatusLabel(status) {
  if (status === "RETRY_RESULT_RECEIPT_REVIEW_READY") return "Ready";
  if (status === "RETRY_RESULT_RECEIPT_REVIEW_EMPTY") return "Empty";
  return "Blocked";
}

export default function ReceiptDecisionIntentSurface({
  receiptReviewSurface,
  queueItems = [],
  endpoint = {},
  deviceIdentity = {},
  operatorId = "operator",
}) {
  const [selectedIntentsByDecisionId, setSelectedIntentsByDecisionId] = useState({});
  const [isManualRetryRunning, setIsManualRetryRunning] = useState(false);
  const [manualRetryResult, setManualRetryResult] = useState(null);

  const decisionIntentSurface = useMemo(() => buildScanOpsReceiptDecisionIntentSurface(receiptReviewSurface, {
    selectedIntentsByDecisionId,
    now: nowIso,
  }), [receiptReviewSurface, selectedIntentsByDecisionId]);

  const retryBoundary = useMemo(() => buildScanOpsManualRetryExecutionBoundary(queueItems, decisionIntentSurface, {
    manualRetryRequest: Object.freeze({
      userInitiated: true,
      trigger: "manual_retry",
      requestedBy: operatorId,
      requestedAt: decisionIntentSurface.timestamp || nowIso(),
      reason: "Operator selected Retry manually.",
    }),
    executeRetry: true,
    endpoint,
    deviceIdentity,
    now: nowIso,
  }), [queueItems, decisionIntentSurface, endpoint, deviceIdentity, operatorId]);

  const retryResultReceiptReviewBoundary = useMemo(() => {
    if (!manualRetryResult) return null;
    return buildScanOpsRetryResultReceiptReviewBoundary(manualRetryResult, { now: nowIso });
  }, [manualRetryResult]);

  const handleReceiptDecisionIntent = (decisionItem, descriptor) => {
    if (!decisionItem?.decisionId || !descriptor) return;
    setManualRetryResult(null);
    setSelectedIntentsByDecisionId((current) => ({
      ...current,
      [decisionItem.decisionId]: Object.freeze({
        descriptor,
        selectedAt: nowIso(),
        selectedBy: operatorId,
      }),
    }));
  };

  const canRunManualRetry = !isManualRetryRunning && retryBoundary.status === SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES.READY;

  const handleManualRetryExecution = async () => {
    if (!canRunManualRetry) return;
    setIsManualRetryRunning(true);
    try {
      const dispatch = createScanOpsBridgeHttpDispatchAdapter(typeof window !== "undefined" ? window.fetch?.bind(window) : null);
      const result = await runScanOpsManualRetryExecutionBoundary(queueItems, decisionIntentSurface, {
        manualRetryRequest: manualRetryRequest(operatorId),
        executeRetry: true,
        endpoint,
        deviceIdentity,
        dispatch,
        now: nowIso,
      });
      setManualRetryResult(Object.freeze({ ...result, completedAtLabel: nowLabel() }));
    } catch (error) {
      setManualRetryResult(Object.freeze({
        status: SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES.FAILED,
        completedAtLabel: nowLabel(),
        dispatchAttempted: false,
        retryResults: [],
        projectedQueuePatches: [],
        queueWriteApplied: false,
        inventoryMutationAttempted: false,
        scanOpsMutationAttempted: false,
        stockMutationAttempted: false,
        priceMutationAttempted: false,
        ledgerMutationAttempted: false,
        approvalMutationAttempted: false,
        errors: Object.freeze([{ code: "manual_retry_ui_error", message: error?.message || "Manual retry failed before dispatch." }]),
      }));
    } finally {
      setIsManualRetryRunning(false);
    }
  };

  if (!receiptReviewSurface) return null;

  return (
    <div className="mt-3 rounded-2xl bg-secondary/60 p-3">
      <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Manual Retry Control Surface</p>
      <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">
        Select Retry manually, then tap Run Manual Retry. This is an explicit operator action only; it is not automatic, persisted, or written to the queue.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Metric label="Intent selected" value={decisionIntentSurface.selectedIntentCount || 0} />
        <Metric label="Retry selected" value={decisionIntentSurface.retryIntentSelectedCount || 0} />
        <Metric label="Ready retry" value={retryBoundary.readyRetryCandidateCount || 0} />
        <Metric label="Queue writes" value="0" helper="Blocked" />
      </div>
      <div className="mt-2 rounded-xl bg-background/70 px-3 py-1">
        <InfoRow label="Mode" value="Explicit operator manual retry only" />
        <InfoRow label="Run state" value={retryStatusLabel(retryBoundary.status)} />
        <InfoRow label="Background retry" value="Disabled" />
        <InfoRow label="Retry applied" value={manualRetryResult?.dispatchAttempted ? "Manual dispatch attempted" : "Not applied"} />
      </div>
      <div className="mt-2 space-y-2">
        {receiptReviewSurface.decisionItems?.slice(0, 4).map((item) => (
          <div key={item.decisionId} className="rounded-xl bg-background/70 px-3 py-2">
            <p className="text-sm font-black text-foreground">{item.queueItemId || "Receipt item"}</p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">{item.outcomeLabel || item.classification}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.decisionDescriptors?.map((descriptor) => {
                const selected = selectedIntentsByDecisionId[item.decisionId]?.descriptor === descriptor;
                return (
                  <button
                    key={`${item.decisionId}:${descriptor}`}
                    type="button"
                    className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide active:scale-[0.98] ${selected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                    onClick={() => handleReceiptDecisionIntent(item, descriptor)}
                  >
                    {selected ? `${descriptor} selected` : descriptor}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-3 min-h-12 w-full rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground active:scale-[0.98] disabled:opacity-40"
        onClick={handleManualRetryExecution}
        disabled={!canRunManualRetry}
      >
        {isManualRetryRunning ? "Manual Retry Running" : "Run Manual Retry"}
      </button>
      <p className="mt-2 text-[11px] font-bold leading-snug text-muted-foreground">
        Run Manual Retry only dispatches selected retry candidates through the governed bridge. Queue status remains projected only.
      </p>
      {manualRetryResult && (
        <div className="mt-3 rounded-xl bg-background/70 px-3 py-2">
          <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Manual retry result</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Metric label="Status" value={retryStatusLabel(manualRetryResult.status)} />
            <Metric label="Finished" value={manualRetryResult.completedAtLabel || "Just now"} />
            <Metric label="Retried" value={manualRetryResult.retryResults?.length || 0} />
            <Metric label="Projected" value={manualRetryResult.projectedQueuePatches?.length || 0} helper="Display only" />
          </div>
          <div className="mt-2 rounded-xl bg-secondary/60 px-3 py-1">
            <InfoRow label="Queue write" value={manualRetryResult.queueWriteApplied ? "Applied" : "Blocked"} />
            <InfoRow label="Inventory mutation" value={manualRetryResult.inventoryMutationAttempted ? "Attempted" : "Not attempted"} />
          </div>
          {retryResultReceiptReviewBoundary && (
            <div className="mt-3 rounded-xl bg-secondary/60 px-3 py-2">
              <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Retry Result Receipt Review Boundary</p>
              <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">
                Retry result receipts are display-only. No automatic second retry, background retry loop, queue write, or Inventory mutation is allowed.
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Metric label="Review state" value={retryReviewStatusLabel(retryResultReceiptReviewBoundary.status)} />
                <Metric label="Receipts" value={retryResultReceiptReviewBoundary.retryResultItemCount || 0} helper="Display only" />
                <Metric label="Accepted" value={retryResultReceiptReviewBoundary.retryAcceptedCount || 0} />
                <Metric label="Duplicate" value={retryResultReceiptReviewBoundary.retryDuplicateCount || 0} />
                <Metric label="Still failed" value={retryResultReceiptReviewBoundary.retryStillFailedCount || 0} />
                <Metric label="Service unavailable" value={retryResultReceiptReviewBoundary.retryServiceUnavailableCount || 0} />
                <Metric label="Transport error" value={retryResultReceiptReviewBoundary.retryTransportErrorCount || 0} />
                <Metric label="Rejected / blocked" value={(retryResultReceiptReviewBoundary.retryRejectedCount || 0) + (retryResultReceiptReviewBoundary.retryBlockedCount || 0)} />
              </div>
              <div className="mt-2 rounded-xl bg-background/70 px-3 py-1">
                <InfoRow label="Queue write" value={retryResultReceiptReviewBoundary.queueWriteApplied ? "Applied" : "Blocked"} />
                <InfoRow label="Second retry" value={retryResultReceiptReviewBoundary.secondRetryApplied ? "Applied" : "Not applied"} />
                <InfoRow label="Background retry" value={retryResultReceiptReviewBoundary.backgroundRetryEnabled ? "Enabled" : "Disabled"} />
              </div>
              {retryResultReceiptReviewBoundary.retryResultItems?.slice(0, 4).map((item) => (
                <div key={item.retryResultReviewId} className="mt-2 rounded-xl bg-background/70 px-3 py-2">
                  <p className="text-sm font-black text-foreground">{item.queueItemId || "Retry receipt"}</p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">{item.outcomeLabel} · {item.instruction}</p>
                </div>
              ))}
            </div>
          )}
          {manualRetryResult.errors?.length > 0 && (
            <p className="mt-2 text-xs font-bold text-muted-foreground">{manualRetryResult.errors[0]?.message || manualRetryResult.errors[0]?.code}</p>
          )}
        </div>
      )}
    </div>
  );
}
