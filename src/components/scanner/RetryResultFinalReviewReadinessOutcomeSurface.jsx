import React from "react";
import { buildScanOpsRetryResultFinalReviewReadinessOutcomeSurface } from "../../inventory-bridge/retryResultFinalReviewReadinessOutcome/index.js";

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

function outcomeStatusLabel(status) {
  if (status === "RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_READY") return "Ready";
  if (status === "RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_EMPTY") return "Empty";
  return "Blocked";
}

export default function RetryResultFinalReviewReadinessOutcomeSurface({ readinessSummarySurface }) {
  if (!readinessSummarySurface) return null;

  const outcomeSurface = buildScanOpsRetryResultFinalReviewReadinessOutcomeSurface(readinessSummarySurface);

  return (
    <div className="mt-3 rounded-xl bg-secondary/60 px-3 py-2">
      <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Retry Result Final Review Readiness Outcome Descriptor Surface</p>
      <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">
        Outcome descriptors only for final review readiness. No closure is applied, persisted, written to the queue, retried, or sent to Inventory.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Metric label="Outcome state" value={outcomeStatusLabel(outcomeSurface.status)} />
        <Metric label="Items" value={outcomeSurface.outcomeItemCount || 0} helper="Descriptor only" />
        <Metric label="Ready later" value={outcomeSurface.readyForLaterClosureReviewCount || 0} />
        <Metric label="Keep open" value={outcomeSurface.keepReviewOpenCount || 0} />
        <Metric label="Ack first" value={outcomeSurface.acknowledgementResolutionRequiredCount || 0} />
        <Metric label="Pending" value={outcomeSurface.finalReviewPendingCount || 0} />
      </div>
      <div className="mt-2 rounded-xl bg-background/70 px-3 py-1">
        <InfoRow label="Mode" value="Local outcome descriptor only" />
        <InfoRow label="Closure applied" value={outcomeSurface.closureApplied ? "Applied" : "Not applied"} />
        <InfoRow label="Persistence" value={outcomeSurface.finalReviewReadinessOutcomePersistenceApplied ? "Applied" : "Blocked"} />
        <InfoRow label="Queue write" value={outcomeSurface.queueWriteApplied ? "Applied" : "Blocked"} />
      </div>
      {outcomeSurface.outcomeItems?.slice(0, 4).map((item) => (
        <div key={item.finalReviewReadinessOutcomeId} className="mt-2 rounded-xl bg-background/70 px-3 py-2">
          <p className="text-sm font-black text-foreground">{item.queueItemId || "Readiness outcome"}</p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">{item.outcomeDescriptor} · {item.instruction}</p>
        </div>
      ))}
    </div>
  );
}
