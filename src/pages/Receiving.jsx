import React, { useState } from "react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import { DoneCard, ItemSummaryCard, PageShell, QuantityStepper, SectionCard, StickyActions, TextInputField, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";

const SUPPLIERS = [
  { id: "Fresh Fields Co.", label: "Fresh Fields Co.", helper: "Fresh produce and dairy" },
  { id: "Dairy Direct Ltd.", label: "Dairy Direct Ltd.", helper: "Chilled dairy delivery" },
  { id: "Green Harvest", label: "Green Harvest", helper: "Produce supplier" },
];
const CONDITIONS = [
  { id: "Good", label: "Good" },
  { id: "Damaged", label: "Damaged" },
  { id: "Short", label: "Short" },
  { id: "Over", label: "Over" },
];

export default function Receiving() {
  const [scanValue, setScanValue] = useState("");
  const [supplier, setSupplier] = useState("Fresh Fields Co.");
  const [deliveryRef, setDeliveryRef] = useState("PO-2847");
  const [item, setItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState("Good");
  const [done, setDone] = useState(false);
  const unit = item?.unitType || item?.unit_type || "each";

  const scan = (value) => {
    const found = resolveInventoryIdentity(String(value || "").trim() || "930000000004") || resolveInventoryIdentity("930000000004");
    setItem(found);
    setQuantity(1);
    setDone(false);
  };

  const add = () => {
    if (!item) return;
    createScanOpsEvent(SCANOPS_EVENT_TYPES.RECEIVING_CONFIRMED, {
      source_module: "Receiving",
      supplier_name: supplier,
      purchase_order_ref: deliveryRef || null,
      item_name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      received_quantity: quantity,
      unit_type: unit,
      condition,
      status: condition === "Good" ? "received" : "received_with_condition",
    });
    setDone(true);
  };

  return (
    <PageShell>
      <WorkflowHeader title="Receiving" subtitle="Supplier receiving batch" scanValue={scanValue} onScanValueChange={setScanValue} onScan={scan} />
      <WorkflowMain>
        <SectionCard className="space-y-3">
          <TouchSelect label="Supplier" value={supplier} onChange={setSupplier} options={SUPPLIERS} />
          <TextInputField label="Delivery / PO" value={deliveryRef} onChange={setDeliveryRef} placeholder="Optional PO or delivery reference" />
        </SectionCard>
        {item && <>
          <ItemSummaryCard item={item}>
            <p className="text-xs font-bold text-muted-foreground">Expected: {item.pendingDeliveryQty ?? item.pending_delivery_qty ?? 24} {unit}</p>
          </ItemSummaryCard>
          <SectionCard className="space-y-3">
            <QuantityStepper label="Received quantity" value={quantity} onChange={setQuantity} unit={unit} min={0} />
            <TouchSelect label="Condition" value={condition} onChange={setCondition} options={CONDITIONS} />
          </SectionCard>
          {done && <DoneCard title="Added to Receiving Batch" helper="The item is staged for receiving review. Final inventory application remains desktop/sync-side." rows={[{ label: "Supplier", value: supplier }, { label: "Quantity", value: `${quantity} ${unit}` }, { label: "Condition", value: condition }]} />}
        </>}
        <StickyActions leftLabel="Reset" rightLabel="Add to Receiving Batch" onLeft={() => { setItem(null); setDone(false); }} onRight={add} rightDisabled={!item} />
      </WorkflowMain>
    </PageShell>
  );
}
