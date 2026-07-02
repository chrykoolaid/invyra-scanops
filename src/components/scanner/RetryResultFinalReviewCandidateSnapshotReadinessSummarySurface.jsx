import React from "react";
import { buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessSummarySurface } from "../../inventory-bridge/retryResultFinalReviewCandidateSnapshotReadinessSummary/index.js";

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl bg-secondary/70 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-black text-foreground">{value}</p>
    </div>
  );
}

function labelFor(status) {
  if (status === "RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_READY") return "Ready";
  if (status === "RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_EMPTY") return "Empty";
  return "Blocked";
}

export default function RetryResultFinalReviewCandidateSnapshotReadinessSummarySurface({ finalSnapshotSurface }) {
  if (!finalSnapshotSurface) return null;

  const readinessSummarySurface = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessSummarySurface(finalSnapshotSurface);

  return (
    <div className="mt-3 rounded-xl bg-secondary/60 px-3 py-2">
      <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Retry Result Final Review Candidate Snapshot Readiness Summary Surface</p>
      <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">
        Snapshot readiness summary only. No application, persistence, queue write, retry, or Inventory mutation is allowed.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Metric label="Readiness state" value={labelFor(readinessSummarySurface.status)} />
        <Metric label="Items" value={readinessSummarySurface.snapshotReadinessSummaryItemCount || 0} />
        <Metric label="Ready later" value={readinessSummarySurface.readyLaterReadinessCount || 0} />
        <Metric label="Keep open" value={readinessSummarySurface.keepOpenReadinessCount || 0} />
        <Metric label="Ack first" value={readinessSummarySurface.acknowledgementFirstReadinessCount || 0} />
        <Metric label="Review first" value={readinessSummarySurface.finalReviewFirstReadinessCount || 0} />
      </div>
      {readinessSummarySurface.snapshotReadinessSummaryItems?.slice(0, 4).map((item) => (
        <div key={item.candidateSnapshotReadinessSummaryId} className="mt-2 rounded-xl bg-background/70 px-3 py-2">
          <p className="text-sm font-black text-foreground">{item.queueItemId || "Snapshot readiness"}</p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">{item.readinessStatus} · {item.instruction}</p>
        </div>
      ))}
    </div>
  );
}
