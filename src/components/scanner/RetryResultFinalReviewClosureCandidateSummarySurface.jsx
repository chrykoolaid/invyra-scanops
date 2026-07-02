import React from "react";
import { buildScanOpsRetryResultFinalReviewClosureCandidateSummarySurface } from "../../inventory-bridge/retryResultFinalReviewClosureCandidateSummary/index.js";

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

function candidateStatusLabel(status) {
  if (status === "RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_READY") return "Ready";
  if (status === "RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_EMPTY") return "Empty";
  return "Blocked";
}

export default function RetryResultFinalReviewClosureCandidateSummarySurface({ outcomeSummarySurface }) {
  if (!outcomeSummarySurface) return null;

  const candidateSummarySurface = buildScanOpsRetryResultFinalReviewClosureCandidateSummarySurface(outcomeSummarySurface);

  return (
    <div className="mt-3 rounded-xl bg-secondary/60 px-3 py-2">
      <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Retry Result Final Review Closure Candidate Summary Surface</p>
      <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">
        Closure candidate summary only for later scoped review. No closure is applied, persisted, written to the queue, retried, or sent to Inventory.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Metric label="Candidate state" value={candidateStatusLabel(candidateSummarySurface.status)} />
        <Metric label="Items" value={candidateSummarySurface.closureCandidateSummaryItemCount || 0} helper="Display only" />
        <Metric label="Candidates" value={candidateSummarySurface.closureCandidateCount || 0} />
        <Metric label="Blocked" value={candidateSummarySurface.closureCandidateBlockedCount || 0} />
        <Metric label="Keep open" value={candidateSummarySurface.keepOpenBlockedCount || 0} />
        <Metric label="Ack first" value={candidateSummarySurface.acknowledgementBlockedCount || 0} />
      </div>
      <div className="mt-2 rounded-xl bg-background/70 px-3 py-1">
        <InfoRow label="Mode" value="Local closure candidate summary only" />
        <InfoRow label="Closure applied" value={candidateSummarySurface.closureApplied ? "Applied" : "Not applied"} />
        <InfoRow label="Persistence" value={candidateSummarySurface.finalReviewClosureCandidateSummaryPersistenceApplied ? "Applied" : "Blocked"} />
        <InfoRow label="Queue write" value={candidateSummarySurface.queueWriteApplied ? "Applied" : "Blocked"} />
      </div>
      {candidateSummarySurface.closureCandidateSummaryItems?.slice(0, 4).map((item) => (
        <div key={item.finalReviewClosureCandidateSummaryId} className="mt-2 rounded-xl bg-background/70 px-3 py-2">
          <p className="text-sm font-black text-foreground">{item.queueItemId || "Closure candidate summary"}</p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">{item.candidateStatus} · {item.instruction}</p>
        </div>
      ))}
    </div>
  );
}
