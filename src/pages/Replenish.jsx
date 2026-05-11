import React, { useState } from "react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import { BatchList, EmptyState, ItemSummaryCard, PageShell, QuantityStepper, SectionCard, StickyActions, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { makeWorkflowBatchItem, removeWorkflowBatchItem, upsertWorkflowBatchItem } from "../lib/scanOpsWorkflowBatch";

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
  const [requests, setRequests] = useState([]);
  const unit = item?.unitType || item?.unit_type || "each";
  const backroom = Number(item?.backroomStock ?? item?.backroom_stock ?? 0);
  const issueLabel = ISSUE_OPTIONS.find((option) => option.id === issue)?.label || issue;

  const scan = (value) => {
    const found = typeof value === "object" ? value : resolveInventoryIdentity(String(value || "").trim());
    if (!found) return;
    setItem(found);
    setQuantity(Math.min(6, Math.max(1, Number(found?.backroomStock ?? found?.backroom_stock ?? 6))));
  };

  const createTask = () => {
    if (!item) return;
    const line = makeWorkflowBatchItem({ workflowType: "replenish", item, quantity, reason: issueLabel, sourceLocation: "Backroom", destinationLocation: "Shelf" });
    setRequests((current) => upsertWorkflowBatchItem(current, line));
    createScanOpsEvent(SCANOPS_EVENT_TYPES.REPLENISHMENT_CREATED, {
      source_module: "Replenish",
      item_name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      plu: item.plu || item.scaleCode,
      match_reason: item._searchMatch?.displayReason || null,
      issue_reason: issue,
      quantity,
      unit_type: unit,
      source: "Backroom",
      destination: "Shelf",
      applies_stock_directly: false,
      status: "task_created",
    });
    setItem(null);
    setScanValue("");
  };

  return (
    <PageShell>
      <WorkflowHeader title="Replenish" subtitle="Create shelf replenish action" scanValue={scanValue} onScanValueChange={setScanValue} onScan={scan} />
      <WorkflowMain>
        {item ? <>
          <ItemSummaryCard item={item} />
          <SectionCard className="space-y-3">
            <TouchSelect label="Issue" value={issue} onChange={setIssue} options={ISSUE_OPTIONS} />
            <div className="rounded-2xl bg-secondary/60 p-3">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Suggested action</p>
              <p className="mt-1 text-sm font-bold text-foreground">Move {Math.min(quantity, backroom || quantity)} {unit} from Backroom to Shelf.</p>
            </div>
            <QuantityStepper value={quantity} onChange={setQuantity} unit={unit} min={1} />
          </SectionCard>
        </> : <EmptyState title="No item selected." />}
        <BatchList
          title="Current replenish requests"
          items={requests}
          emptyText="No replenish requests yet."
          renderMeta={(line) => `${line.reason} · ${line.sourceLocation} → ${line.destinationLocation}`}
          onRemove={(id) => setRequests((current) => removeWorkflowBatchItem(current, id))}
        />
        <StickyActions leftLabel="Clear Item" rightLabel="Create Task" onLeft={() => { setItem(null); setScanValue(""); }} onRight={createTask} rightDisabled={!item} />
      </WorkflowMain>
    </PageShell>
  );
}
