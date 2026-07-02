import React from "react";
import { buildScanOpsRetryResultFinalReviewCandidateFinalSnapshotSurface } from "../../inventory-bridge/retryResultFinalReviewCandidateFinalSnapshot/index.js";

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl bg-secondary/70 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-black text-foreground">{value}</p>
    </div>
  );
}

function labelFor(status) {
  if (status === "RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_READY") return "Ready";
  if (status === "RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_EMPTY") return "Empty";
  return "Blocked";
}

export default function RetryResultFinalReviewCandidateFinalSnapshotSurface({ summarySurface }) {
  if (!summarySurface) return null;

  const snapshotSurface = buildScanOpsRetryResultFinalReviewCandidateFinalSnapshotSurface(summarySurface);

  return (
    <div className="mt-3 rounded-xl bg-secondary/60 px-3 py-2">
      <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Retry Result Final Review Candidate Final Snapshot Surface</p>
      <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">
        Final snapshot only. No application, persistence, queue write, retry, or Inventory mutation is allowed.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Metric label="Snapshot state" value={labelFor(snapshotSurface.status)} />
        <Metric label="Items" value={snapshotSurface.finalSnapshotItemCount || 0} />
        <Metric label="Ready later" value={snapshotSurface.readyLaterSnapshotCount || 0} />
        <Metric label="Keep open" value={snapshotSurface.keepOpenSnapshotCount || 0} />
        <Metric label="Ack first" value={snapshotSurface.acknowledgementFirstSnapshotCount || 0} />
        <Metric label="Review first" value={snapshotSurface.finalReviewFirstSnapshotCount || 0} />
      </div>
      {snapshotSurface.finalSnapshotItems?.slice(0, 4).map((item) => (
        <div key={item.finalReviewCandidateFinalSnapshotId} className="mt-2 rounded-xl bg-background/70 px-3 py-2">
          <p className="text-sm font-black text-foreground">{item.queueItemId || "Final snapshot"}</p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">{item.finalSnapshotStatus} · {item.instruction}</p>
        </div>
      ))}
    </div>
  );
}
