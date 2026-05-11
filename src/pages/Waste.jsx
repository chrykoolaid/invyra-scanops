import React, { useMemo, useState } from "react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import { DoneCard, ItemSummaryCard, PageShell, QuantityStepper, ReadyCard, SectionCard, StickyActions, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { getWasteDecision, WASTE_REASONS } from "../lib/scanOpsRules";

export default function Waste() {
  const [scanValue, setScanValue] = useState("");
  const [item, setItem] = useState(null);
  const [reason, setReason] = useState("expired");
  const [quantity, setQuantity] = useState(1);
  const [done, setDone] = useState(null);
  const decision = useMemo(() => getWasteDecision(item, reason, quantity), [item, reason, quantity]);
  const unit = item?.unitType || item?.unit_type || "each";

  const scan = (value) => {
    const found = resolveInventoryIdentity(String(value || "").trim() || "930000000008") || resolveInventoryIdentity("930000000008");
    setItem(found);
    setDone(null);
  };

  const addWaste = () => {
    if (!item) return;
    const event = createScanOpsEvent(decision.approvalRequired ? SCANOPS_EVENT_TYPES.WASTE_APPROVAL_REQUIRED : SCANOPS_EVENT_TYPES.WASTE_RECORDED, {
      source_module: "Waste",
      item_name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      quantity,
      unit_type: unit,
      reason_code: reason,
      reason_label: decision.reason?.label,
      supervisor_review_required: decision.approvalRequired,
      status: decision.approvalRequired ? "review_required" : "recorded",
    });
    setDone({ event });
  };

  return (
    <PageShell>
      <WorkflowHeader title="Waste" subtitle="Record damaged, expired, or shrink items" scanValue={scanValue} onScanValueChange={setScanValue} onScan={scan} />
      <WorkflowMain>
        {!item && <ReadyCard title="Scan item to record waste" helper="The reason, quantity, and review route appear after the item is selected." />}
        {item && <>
          <ItemSummaryCard item={item} />
          <SectionCard className="space-y-3">
            <TouchSelect label="Reason" value={reason} onChange={setReason} options={WASTE_REASONS} />
            <QuantityStepper value={quantity} onChange={setQuantity} unit={unit} min={1} />
            <div className="rounded-2xl bg-secondary/60 p-3">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Risk route</p>
              <p className="mt-1 text-sm font-bold text-foreground">{decision.approvalRequired ? "Supervisor review required" : "Record on device"}</p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">High-risk waste stays reportable and does not directly inflate reorder demand.</p>
            </div>
          </SectionCard>
          {done && <DoneCard title="Waste added" helper="Waste was saved as a scanner event. Final reporting remains sync/system-side." rows={[{ label: "Reason", value: decision.reason?.label || reason }, { label: "Quantity", value: `${quantity} ${unit}` }]} />}
          <StickyActions leftLabel="Review Waste Log" rightLabel="Add Waste" onLeft={() => setDone(null)} onRight={addWaste} />
        </>}
      </WorkflowMain>
    </PageShell>
  );
}
