import React, { useState } from "react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import { DoneCard, ItemSummaryCard, PageShell, QuantityStepper, ReadyCard, SectionCard, StickyActions, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";

const ISSUE_OPTIONS = [
  { id: "shelf_low", label: "Shelf low" },
  { id: "shelf_empty", label: "Shelf empty" },
  { id: "customer_request", label: "Customer request" },
  { id: "promo_fill", label: "Promo fill" },
];

export default function Replenish() {
  const [scanValue, setScanValue] = useState("");
  const [item, setItem] = useState(null);
  const [issue, setIssue] = useState("shelf_low");
  const [quantity, setQuantity] = useState(6);
  const [done, setDone] = useState(false);
  const unit = item?.unitType || item?.unit_type || "each";
  const backroom = Number(item?.backroomStock ?? item?.backroom_stock ?? 0);

  const scan = (value) => {
    const found = resolveInventoryIdentity(String(value || "").trim() || "930000000001") || resolveInventoryIdentity("930000000001");
    setItem(found);
    setQuantity(Math.min(6, Math.max(1, Number(found?.backroomStock ?? found?.backroom_stock ?? 6))));
    setDone(false);
  };

  const createTask = () => {
    if (!item) return;
    createScanOpsEvent(SCANOPS_EVENT_TYPES.REPLENISHMENT_CREATED, {
      source_module: "Replenish",
      item_name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      issue_reason: issue,
      quantity,
      unit_type: unit,
      source: "Backroom",
      destination: "Shelf",
      status: "task_created",
    });
    setDone(true);
  };

  return (
    <PageShell>
      <WorkflowHeader title="Replenish" subtitle="Shelf to backroom replenishment" scanValue={scanValue} onScanValueChange={setScanValue} onScan={scan} />
      <WorkflowMain>
        {!item && <ReadyCard title="Scan shelf item or label" helper="Shelf, backroom, and pending delivery positions appear after scan." />}
        {item && <>
          <ItemSummaryCard item={item} />
          <SectionCard className="space-y-3">
            <TouchSelect label="Issue" value={issue} onChange={setIssue} options={ISSUE_OPTIONS} />
            <div className="rounded-2xl bg-secondary/60 p-3">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Suggested action</p>
              <p className="mt-1 text-sm font-bold text-foreground">Move {Math.min(quantity, backroom || quantity)} {unit} from Backroom A to Shelf.</p>
            </div>
            <QuantityStepper value={quantity} onChange={setQuantity} unit={unit} min={1} />
          </SectionCard>
          {done && <DoneCard title="Replenish task created" helper="Task created from scanner. Final movement remains tied to the inventory system workflow." rows={[{ label: "Quantity", value: `${quantity} ${unit}` }, { label: "Backroom snapshot", value: `${backroom || "—"} ${unit}` }]} />}
          <StickyActions leftLabel="Cancel" rightLabel="Create Replenish Task" onLeft={() => setDone(false)} onRight={createTask} />
        </>}
      </WorkflowMain>
    </PageShell>
  );
}
