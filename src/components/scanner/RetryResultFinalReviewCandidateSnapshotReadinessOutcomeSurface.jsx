import React from "react";
import { buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSurface } from "../../inventory-bridge/retryResultFinalReviewCandidateSnapshotReadinessOutcome/index.js";

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl bg-secondary/70 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-black text-foreground">{value}</p>
    </div>
  );
}

function labelFor(status) {
  if (status === "RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_READY") return "Ready";
  if (status === "RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_EMPTY") return "Empty";
  return "Blocked";
}

export default function RetryResultFinalReviewCandidateSnapshotReadinessOutcomeSurface({ readinessSummarySurface }) {
  if (!readinessSummarySurface) return null;

  const outcomeSurface = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSurface(readinessSummarySurface);

  return (
    <div className="mt-3 rounded-xl bg-secondary/60 px-3 py-2">
      <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Retry Result Final Review Candidate Snapshot Readiness Outcome Surface</p>
      <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">
        Snapshot readiness outcome descriptors only. No application, persistence, queue write, retry, or Inventory mutation is allowed.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Metric label="Outcome state" value={labelFor(outcomeSurface.status)} />
        <Metric label="Items" value={outcomeSurface.snapshotReadinessOutcomeItemCount || 0} />
        <Metric label="Ready later" value={outcomeSurface.readyLaterOutcomeCount || 0} />
        <Metric label="Keep open" value={outcomeSurface.keepOpenOutcomeCount || 0} />
        <Metric label="Ack first" value={outcomeSurface.acknowledgementFirstOutcomeCount || 0} />
        <Metric label="Review first" value={outcomeSurface.finalReviewFirstOutcomeCount || 0} />
      </div>
      {outcomeSurface.snapshotReadinessOutcomeItems?.slice(0, 4).map((item) => (
        <div key={item.candidateSnapshotReadinessOutcomeId} className="mt-2 rounded-xl bg-background/70 px-3 py-2">
          <p className="text-sm font-black text-foreground">{item.queueItemId || "Snapshot readiness outcome"}</p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">{item.outcomeDescriptor} · {item.instruction}</p>
        </div>
      ))}
    </div>
  );
}
