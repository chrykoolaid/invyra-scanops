import React from "react";
import { buildScanOpsRetryResultFinalReviewReadinessSummarySurface } from "../../inventory-bridge/retryResultFinalReviewReadinessSummary/index.js";

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

function summaryStatusLabel(status) {
  if (status === "RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_READY") return "Ready";
  if (status === "RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_EMPTY") return "Empty";
  return "Blocked";
}

export default function RetryResultFinalReviewReadinessSummarySurface({ finalReviewSnapshotSurface }) {
  if (!finalReviewSnapshotSurface) return null;

  const readinessSummarySurface = buildScanOpsRetryResultFinalReviewReadinessSummarySurface(finalReviewSnapshotSurface);

  return (
    <div className="mt-3 rounded-xl bg-secondary/60 px-3 py-2">
      <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Retry Result Final Review Readiness Summary Surface</p>
      <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">
        Readiness summary only for final review state. No closure is applied, persisted, written to the queue, retried, or sent to Inventory.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Metric label="Summary state" value={summaryStatusLabel(readinessSummarySurface.status)} />
        <Metric label="Items" value={readinessSummarySurface.readinessSummaryItemCount || 0} helper="Display only" />
        <Metric label="Ready later" value={readinessSummarySurface.readyLaterCount || 0} />
        <Metric label="Keep open" value={readinessSummarySurface.keepOpenCount || 0} />
        <Metric label="Ack pending" value={readinessSummarySurface.acknowledgementPendingCount || 0} />
        <Metric label="Final pending" value={readinessSummarySurface.finalReviewPendingCount || 0} />
      </div>
      <div className="mt-2 rounded-xl bg-background/70 px-3 py-1">
        <InfoRow label="Mode" value="Local final review readiness summary only" />
        <InfoRow label="All ready later" value={readinessSummarySurface.allReadyForFutureScopedClosure ? "Yes" : "No"} />
        <InfoRow label="Closure applied" value={readinessSummarySurface.closureApplied ? "Applied" : "Not applied"} />
        <InfoRow label="Queue write" value={readinessSummarySurface.queueWriteApplied ? "Applied" : "Blocked"} />
      </div>
      {readinessSummarySurface.readinessSummaryItems?.slice(0, 4).map((item) => (
        <div key={item.finalReviewReadinessSummaryItemId} className="mt-2 rounded-xl bg-background/70 px-3 py-2">
          <p className="text-sm font-black text-foreground">{item.queueItemId || "Readiness summary"}</p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">{item.readinessStatus} · {item.instruction}</p>
        </div>
      ))}
    </div>
  );
}
