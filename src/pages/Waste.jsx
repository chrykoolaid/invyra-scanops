import React, { useMemo, useState } from "react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import { BatchList, EmptyState, ItemSummaryCard, PageShell, QuantityStepper, SectionCard, StickyActions, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { getWasteDecision, WASTE_REASONS } from "../lib/scanOpsRules";
import { makeWorkflowBatchItem, removeWorkflowBatchItem, upsertWorkflowBatchItem } from "../lib/scanOpsWorkflowBatch";

export default function Waste() {
  const [scanValue, setScanValue] = useState("");
  const [item, setItem] = useState(null);
  const [reason, setReason] = useState("expired");
  const [quantity, setQuantity] = useState(1);
  const [batch, setBatch] = useState([]);
  const decision = useMemo(() => getWasteDecision(item, reason, quantity), [item, reason, quantity]);
  const unit = item?.unitType || item?.unit_type || "each";
  const reasonLabel = decision.reason?.label || WASTE_REASONS.find((option) => option.id === reason)?.label || reason;

  const scan = (value) => {
    const found = resolveInventoryIdentity(String(value || "").trim() || "930000000008") || resolveInventoryIdentity("930000000008");
    setItem(found);
  };

  const addWaste = () => {
    if (!item) return;
    const line = makeWorkflowBatchItem({ workflowType: "waste", item, quantity, reason: reasonLabel, meta: { approvalRequired: decision.approvalRequired } });
    setBatch((current) => upsertWorkflowBatchItem(current, line));
    createScanOpsEvent(decision.approvalRequired ? SCANOPS_EVENT_TYPES.WASTE_APPROVAL_REQUIRED : SCANOPS_EVENT_TYPES.WASTE_RECORDED, {
      source_module: "Waste",
      item_name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      quantity,
      unit_type: unit,
      reason_code: reason,
      reason_label: reasonLabel,
      supervisor_review_required: decision.approvalRequired,
      applies_stock_directly: false,
      status: decision.approvalRequired ? "review_required" : "added_to_waste_log",
    });
    setItem(null);
    setScanValue("");
    setQuantity(1);
  };

  return (
    <PageShell>
      <WorkflowHeader title="Waste" subtitle="Record waste and shrink" scanValue={scanValue} onScanValueChange={setScanValue} onScan={scan} />
      <WorkflowMain>
        {item ? <>
          <ItemSummaryCard item={item} />
          <SectionCard className="space-y-3">
            <TouchSelect label="Reason" value={reason} onChange={setReason} options={WASTE_REASONS} />
            <QuantityStepper value={quantity} onChange={setQuantity} unit={unit} min={1} />
            <div className="rounded-2xl bg-secondary/60 p-3">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Review route</p>
              <p className="mt-1 text-sm font-bold text-foreground">{decision.approvalRequired ? "Supervisor review required" : "Add to waste log"}</p>
            </div>
          </SectionCard>
        </> : <EmptyState title="No item selected." />}
        <BatchList
          title="Current waste log"
          items={batch}
          emptyText="Waste log is empty."
          renderMeta={(line) => `${line.reason}${line.approvalRequired ? " · Supervisor review" : ""}`}
          onRemove={(id) => setBatch((current) => removeWorkflowBatchItem(current, id))}
        />
        <StickyActions leftLabel="Review Waste" rightLabel="Add Waste" onLeft={() => setItem(null)} onRight={addWaste} rightDisabled={!item} />
      </WorkflowMain>
    </PageShell>
  );
}
