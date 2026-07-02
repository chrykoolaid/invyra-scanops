import React from "react";
import { buildScanOpsRetryResultFinalReviewCandidateClosureReadinessHandoffSurface } from "../../inventory-bridge/retryResultFinalReviewCandidateClosureReadinessHandoff/index.js";

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl bg-secondary/70 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-black text-foreground">{value}</p>
    </div>
  );
}

function labelFor(status) {
  if (status === "RETRY_RESULT_FINAL_REVIEW_CANDIDATE_CLOSURE_READINESS_HANDOFF_READY") return "Ready";
  if (status === "RETRY_RESULT_FINAL_REVIEW_CANDIDATE_CLOSURE_READINESS_HANDOFF_EMPTY") return "Empty";
  return "Blocked";
}

export default function RetryResultFinalReviewCandidateClosureReadinessHandoffSurface({ outcomeSummarySurface }) {
  if (!outcomeSummarySurface) return null;

  const handoffSurface = buildScanOpsRetryResultFinalReviewCandidateClosureReadinessHandoffSurface(outcomeSummarySurface);

  return (
    <div className="mt-3 rounded-xl bg-secondary/60 px-3 py-2">
      <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Retry Result Final Review Candidate Closure Readiness Handoff Surface</p>
      <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">
        Closure readiness handoff only. No application, persistence, queue write, retry, or Inventory mutation is allowed.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Metric label="Handoff state" value={labelFor(handoffSurface.status)} />
        <Metric label="Items" value={handoffSurface.closureReadinessHandoffItemCount || 0} />
        <Metric label="Ready later" value={handoffSurface.readyLaterHandoffCount || 0} />
        <Metric label="Keep open" value={handoffSurface.keepOpenBlockedHandoffCount || 0} />
        <Metric label="Ack first" value={handoffSurface.acknowledgementBlockedHandoffCount || 0} />
        <Metric label="Review first" value={handoffSurface.finalReviewBlockedHandoffCount || 0} />
      </div>
      {handoffSurface.closureReadinessHandoffItems?.slice(0, 4).map((item) => (
        <div key={item.closureReadinessHandoffId} className="mt-2 rounded-xl bg-background/70 px-3 py-2">
          <p className="text-sm font-black text-foreground">{item.queueItemId || "Closure readiness handoff"}</p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">{item.handoffStatus} · {item.instruction}</p>
        </div>
      ))}
    </div>
  );
}
