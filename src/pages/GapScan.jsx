import React, { useMemo, useState } from "react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import { BatchList, EmptyState, ItemSummaryCard, PageShell, SectionCard, StickyActions, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { classifyGap, GAP_TYPES } from "../lib/scanOpsRules";
import { makeWorkflowBatchItem, removeWorkflowBatchItem, upsertWorkflowBatchItem } from "../lib/scanOpsWorkflowBatch";

const OUTCOMES = [
  { id: GAP_TYPES.BACKROOM_AVAILABLE, label: "Shelf gap, stock in backroom" },
  { id: GAP_TYPES.TRUE_OUT_OF_STOCK, label: "True out of stock" },
  { id: GAP_TYPES.SUPPLIER_PENDING, label: "Supplier delivery pending" },
  { id: GAP_TYPES.SHELF_LABEL_PLANOGRAM_ISSUE, label: "Shelf label / planogram issue" },
];

export default function GapScan() {
  const [scanValue, setScanValue] = useState("");
  const [item, setItem] = useState(null);
  const [outcome, setOutcome] = useState(GAP_TYPES.BACKROOM_AVAILABLE);
  const [evidence, setEvidence] = useState([]);
  const classification = useMemo(() => classifyGap(item), [item]);
  const outcomeLabel = OUTCOMES.find((option) => option.id === outcome)?.label || outcome;

  const scan = (value) => {
    const found = resolveInventoryIdentity(String(value || "").trim() || "930000000001") || resolveInventoryIdentity("930000000001");
    setItem(found);
    setOutcome(classifyGap(found).gap_type || GAP_TYPES.BACKROOM_AVAILABLE);
  };

  const save = () => {
    if (!item) return;
    const line = makeWorkflowBatchItem({ workflowType: "gap_scan", item, reason: outcomeLabel, meta: { recommendedAction: classification.title || "Review gap" } });
    setEvidence((current) => upsertWorkflowBatchItem(current, line));
    createScanOpsEvent(SCANOPS_EVENT_TYPES.GAP_CONFIRMED, {
      source_module: "Gap Scan",
      item_name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      gap_outcome: outcome,
      gap_outcome_label: outcomeLabel,
      recommended_action: classification.title,
      applies_stock_directly: false,
      status: "saved_on_device",
    });
    setItem(null);
    setScanValue("");
  };

  return (
    <PageShell>
      <WorkflowHeader title="Gap Scan" subtitle="Capture shelf gap evidence" scanValue={scanValue} onScanValueChange={setScanValue} onScan={scan} />
      <WorkflowMain>
        {item ? <>
          <ItemSummaryCard item={item} />
          <SectionCard className="space-y-3">
            <TouchSelect label="Gap reason" value={outcome} onChange={setOutcome} options={OUTCOMES} />
            <div className="rounded-2xl bg-secondary/60 p-3">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Action</p>
              <p className="mt-1 text-sm font-bold text-foreground">{classification.title || "Review gap"}</p>
            </div>
          </SectionCard>
        </> : <EmptyState title="No item selected." />}
        <BatchList
          title="Current gap evidence"
          items={evidence}
          emptyText="No gap evidence yet."
          renderMeta={(line) => `${line.reason} · ${line.recommendedAction || "Review"}`}
          onRemove={(id) => setEvidence((current) => removeWorkflowBatchItem(current, id))}
        />
        <StickyActions leftLabel="Clear Item" rightLabel="Save Gap" onLeft={() => { setItem(null); setScanValue(""); }} onRight={save} rightDisabled={!item} />
      </WorkflowMain>
    </PageShell>
  );
}
