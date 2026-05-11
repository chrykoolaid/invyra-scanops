import React, { useMemo, useState } from "react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import { BatchList, EmptyState, InfoLine, ItemSummaryCard, PageShell, QuantityStepper, SectionCard, StickyActions, TextInputField, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { getLocalInventorySnapshot, resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { calculateVariance, STOCK_COUNT_TYPES, STOCK_COUNT_TYPE_OPTIONS } from "../lib/scanOpsStockCount";
import { makeWorkflowBatchItem, removeWorkflowBatchItem } from "../lib/scanOpsWorkflowBatch";

const VARIANCE_REASONS = [
  { id: "shelf_count_mismatch", label: "Shelf count mismatch" },
  { id: "backroom_stock_found", label: "Backroom stock found" },
  { id: "damaged_unsaleable", label: "Damaged / unsaleable" },
  { id: "theft_shrink", label: "Theft / shrink" },
  { id: "previous_movement_not_updated", label: "Previous movement not updated" },
  { id: "other", label: "Other" },
];

function findProduct(input) {
  const value = String(input || "").trim();
  const direct = resolveInventoryIdentity(value || "930000000010");
  if (direct) return direct;
  return getLocalInventorySnapshot().items.find((item) => item.name?.toLowerCase().includes(value.toLowerCase())) || null;
}

function upsertCountLine(current, nextLine) {
  const key = nextLine.item?.itemId;
  const exists = current.some((line) => line.item?.itemId === key);
  return exists
    ? current.map((line) => line.item?.itemId === key ? { ...line, ...nextLine, batchItemId: line.batchItemId, createdAt: line.createdAt } : line)
    : [nextLine, ...current];
}

export default function StockCount() {
  const [scanValue, setScanValue] = useState("");
  const [mode, setMode] = useState(STOCK_COUNT_TYPES.QUICK_COUNT);
  const [started, setStarted] = useState(false);
  const [item, setItem] = useState(null);
  const [counted, setCounted] = useState(1);
  const [reason, setReason] = useState("shelf_count_mismatch");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const modeMeta = STOCK_COUNT_TYPE_OPTIONS.find((option) => option.id === mode) || STOCK_COUNT_TYPE_OPTIONS[0];
  const expected = Number(item?.stockOnHand ?? item?.stock_on_hand ?? item?.shelfStock ?? item?.shelf_stock ?? 0);
  const variance = useMemo(() => calculateVariance(expected, Number(counted || 0)), [expected, counted]);
  const unit = item?.unitType || item?.unit_type || "each";
  const reasonLabel = VARIANCE_REASONS.find((option) => option.id === reason)?.label || reason;

  const start = () => {
    if (!modeMeta.enabled) return;
    setStarted(true);
    setSubmitted(false);
    createScanOpsEvent(SCANOPS_EVENT_TYPES.STOCK_COUNT_SESSION_STARTED, { source_module: "Stock Count", count_type: mode, status: "in_progress", sync_exempt: true });
  };

  const scan = (value) => {
    if (!started) setStarted(true);
    const found = findProduct(value || "930000000010");
    setItem(found);
    setCounted(Number(found?.stockOnHand ?? found?.stock_on_hand ?? found?.shelfStock ?? found?.shelf_stock ?? 1));
    setSubmitted(false);
  };

  const saveLine = () => {
    if (!item) return;
    const line = makeWorkflowBatchItem({
      workflowType: "stock_count",
      item,
      quantity: counted,
      reason: variance !== 0 ? reasonLabel : "Matched",
      meta: { expected, variance, note, countedQuantity: counted, expectedQuantity: expected },
    });
    setLines((current) => upsertCountLine(current, line));
    createScanOpsEvent(variance ? SCANOPS_EVENT_TYPES.STOCK_COUNT_VARIANCE_REVIEW_REQUIRED : SCANOPS_EVENT_TYPES.STOCK_COUNT_LINE_SAVED, {
      source_module: "Stock Count",
      count_type: mode,
      item_name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      expected_quantity: expected,
      counted_quantity: counted,
      variance_quantity: variance,
      variance_reason: variance !== 0 ? reason : null,
      note,
      applies_stock_directly: false,
      status: variance ? "variance_review_required" : "line_saved",
    });
    setItem(null);
    setScanValue("");
    setNote("");
  };

  const submit = () => {
    if (!lines.length) return;
    createScanOpsEvent(SCANOPS_EVENT_TYPES.STOCK_COUNT_SUBMITTED, { source_module: "Stock Count", count_type: mode, counted_items: lines.length, variance_items: lines.filter((line) => line.variance).length, applies_stock_directly: false, status: "submitted_for_review" });
    setSubmitted(true);
  };

  return (
    <PageShell>
      <WorkflowHeader title="Stock Count" subtitle={started ? "Count stock by scan or search" : "Choose count mode, then scan"} scanValue={scanValue} onScanValueChange={setScanValue} onScan={scan} showSearch={started} />
      <WorkflowMain>
        {!started && <>
          <SectionCard className="space-y-3">
            <TouchSelect label="Count mode" value={mode} onChange={setMode} options={STOCK_COUNT_TYPE_OPTIONS.map((option) => ({ id: option.id, label: option.title }))} />
            {!modeMeta.enabled && <p className="text-xs font-bold text-muted-foreground">Governed placeholder.</p>}
          </SectionCard>
          <StickyActions leftLabel="Back" rightLabel={modeMeta.enabled ? "Start Count" : "Governed"} onLeft={() => {}} onRight={start} rightDisabled={!modeMeta.enabled} />
        </>}
        {started && !item && <EmptyState title="No item selected." helper={lines.length ? "Scan another item or submit the count evidence." : ""} />}
        {item && <>
          <ItemSummaryCard item={item} />
          <SectionCard className="space-y-3">
            <QuantityStepper label="Counted quantity" value={counted} onChange={setCounted} unit={unit} min={0} />
            <div className="rounded-2xl bg-secondary/60 p-3 space-y-2">
              <InfoLine label="Expected" value={`${expected} ${unit}`} />
              <InfoLine label="Counted" value={`${counted} ${unit}`} />
              <InfoLine label="Difference" value={`${variance ?? 0} ${unit}`} />
            </div>
            {variance !== 0 && <TouchSelect label="Variance reason" value={reason} onChange={setReason} options={VARIANCE_REASONS} />}
            <TextInputField label="Note" value={note} onChange={setNote} placeholder="Optional count note" />
          </SectionCard>
        </>}
        <BatchList
          title="Current count"
          items={lines}
          emptyText="Current count is empty."
          renderMeta={(line) => `Expected ${line.expectedQuantity} · Counted ${line.countedQuantity} · Diff ${line.variance ?? 0}${line.reason && line.reason !== "Matched" ? ` · ${line.reason}` : ""}`}
          onRemove={(id) => setLines((current) => removeWorkflowBatchItem(current, id))}
        />
        {submitted && <SectionCard className="border-primary/20 bg-primary/5"><p className="text-sm font-black text-foreground">Count evidence submitted</p><p className="mt-1 text-xs font-bold text-muted-foreground">{lines.length} lines · {lines.filter((line) => line.variance).length} variance lines · no direct stock mutation</p></SectionCard>}
        {started && <StickyActions leftLabel={item ? "Review Lines" : "Reset"} rightLabel={item ? "Save Count" : "Submit Count"} onLeft={() => item ? setItem(null) : (setStarted(false), setLines([]), setSubmitted(false))} onRight={item ? saveLine : submit} rightDisabled={item ? false : !lines.length} />}
      </WorkflowMain>
    </PageShell>
  );
}
