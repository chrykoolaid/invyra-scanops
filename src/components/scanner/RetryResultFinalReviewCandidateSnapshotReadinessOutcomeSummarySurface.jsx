import React from "react";
import { buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSummarySurface } from "../../inventory-bridge/retryResultFinalReviewCandidateSnapshotReadinessOutcomeSummary/index.js";

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl bg-secondary/70 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-black text-foreground">{value}</p>
    </div>
  );
}

function labelFor(status) {
  if (status === "RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_READY") return "Ready";
  if (status === "RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_EMPTY") return "Empty";
  return "Blocked";
}

export default function RetryResultFinalReviewCandidateSnapshotReadinessOutcomeSummarySurface({ outcomeSurface }) {
  if (!outcomeSurface) return null;

  const summarySurface = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSummarySurface(outcomeSurface);

  return (
    <div className="mt-3 rounded-xl bg-secondary/60 px-3 py-2">
      <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Retry Result Final Review Candidate Snapshot Readiness Outcome Summary Surface</p>
      <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">
        Snapshot readiness outcome summary only. No application, persistence, queue write, retry, or Inventory mutation is allowed.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Metric label="Summary state" value={labelFor(summarySurface.status)} />
        <Metric label="Items" value={summarySurface.snapshotReadinessOutcomeSummaryItemCount || 0} />
        <Metric label="Ready later" value={summarySurface.readyLaterSummaryCount || 0} />
        <Metric label="Keep open" value={summarySurface.keepOpenSummaryCount || 0} />
        <Metric label="Ack first" value={summarySurface.acknowledgementFirstSummaryCount || 0} />
        <Metric label="Review first" value={summarySurface.finalReviewFirstSummaryCount || 0} />
      </div>
      {summarySurface.snapshotReadinessOutcomeSummaryItems?.slice(0, 4).map((item) => (
        <div key={item.candidateSnapshotReadinessOutcomeSummaryId} className="mt-2 rounded-xl bg-background/70 px-3 py-2">
          <p className="text-sm font-black text-foreground">{item.queueItemId || "Snapshot readiness outcome summary"}</p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">{item.summaryStatus} · {item.instruction}</p>
        </div>
      ))}
    </div>
  );
}
