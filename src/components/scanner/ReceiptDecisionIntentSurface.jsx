import React, { useMemo, useState } from "react";
import { buildScanOpsReceiptDecisionIntentSurface } from "../../inventory-bridge/receiptDecisionIntent/index.js";

function Metric({ label, value, helper }) {
  return (
    <div className="min-w-0 rounded-2xl bg-secondary/70 px-3 py-2">
      <p className="truncate text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-black text-foreground">{value}</p>
      {helper && <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-snug text-muted-foreground">{helper}</p>}
    </div>
  );
}

function nowIso() {
  return new Date().toISOString();
}

export default function ReceiptDecisionIntentSurface({ receiptReviewSurface, operatorId = "operator" }) {
  const [selectedIntentsByDecisionId, setSelectedIntentsByDecisionId] = useState({});
  const decisionIntentSurface = useMemo(() => buildScanOpsReceiptDecisionIntentSurface(receiptReviewSurface, {
    selectedIntentsByDecisionId,
    now: nowIso,
  }), [receiptReviewSurface, selectedIntentsByDecisionId]);

  const handleReceiptDecisionIntent = (decisionItem, descriptor) => {
    if (!decisionItem?.decisionId || !descriptor) return;
    setSelectedIntentsByDecisionId((current) => ({
      ...current,
      [decisionItem.decisionId]: Object.freeze({
        descriptor,
        selectedAt: nowIso(),
        selectedBy: operatorId,
      }),
    }));
  };

  if (!receiptReviewSurface) return null;

  return (
    <div className="rounded-2xl bg-secondary/60 p-3">
      <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Receipt Decision Intent Surface</p>
      <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">
        Local intent only. Selected descriptors are not persisted, retried, applied, or written to the queue.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Metric label="Selected" value={decisionIntentSurface.selectedIntentCount || 0} />
        <Metric label="Pending" value={decisionIntentSurface.pendingIntentCount || 0} />
        <Metric label="Retry intent" value={decisionIntentSurface.retryIntentSelectedCount || 0} />
        <Metric label="Queue writes" value="0" helper="Blocked" />
      </div>
      <div className="mt-2 space-y-2">
        {receiptReviewSurface.decisionItems?.slice(0, 4).map((item) => (
          <div key={item.decisionId} className="rounded-xl bg-background/70 px-3 py-2">
            <p className="text-sm font-black text-foreground">{item.queueItemId || "Receipt item"}</p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">{item.outcomeLabel || item.classification}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.decisionDescriptors?.map((descriptor) => (
                <button
                  key={`${item.decisionId}:${descriptor}`}
                  type="button"
                  className="rounded-full bg-secondary px-2 py-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground active:scale-[0.98]"
                  onClick={() => handleReceiptDecisionIntent(item, descriptor)}
                >
                  {descriptor}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
