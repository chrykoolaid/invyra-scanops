import React, { useMemo, useState } from "react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import { DoneCard, InfoLine, ItemSummaryCard, PageShell, QuantityStepper, ReadyCard, SectionCard, StickyActions, TextInputField, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { getLocalInventorySnapshot, resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { calculateVariance, STOCK_COUNT_TYPES, STOCK_COUNT_TYPE_OPTIONS } from "../lib/scanOpsStockCount";

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

export default function StockCount() {
  const [scanValue, setScanValue] = useState("");
  const [mode, setMode] = useState(STOCK_COUNT_TYPES.QUICK_COUNT);
  const [started, setStarted] = useState(false);
  const [item, setItem] = useState(null);
  const [counted, setCounted] = useState(1);
  const [reason, setReason] = useState("shelf_count_mismatch");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState([]);
  const [done, setDone] = useState(false);
  const modeMeta = STOCK_COUNT_TYPE_OPTIONS.find((option) => option.id === mode) || STOCK_COUNT_TYPE_OPTIONS[0];
  const expected = Number(item?.stockOnHand ?? item?.stock_on_hand ?? item?.shelfStock ?? item?.shelf_stock ?? 0);
  const variance = useMemo(() => calculateVariance(expected, Number(counted || 0)), [expected, counted]);
  const unit = item?.unitType || item?.unit_type || "each";

  const start = () => {
    if (!modeMeta.enabled) return;
    setStarted(true);
    setDone(false);
    createScanOpsEvent(SCANOPS_EVENT_TYPES.STOCK_COUNT_SESSION_STARTED, { source_module: "Stock Count", count_type: mode, status: "in_progress", sync_exempt: true });
  };

  const scan = (value) => {
    if (!started) setStarted(true);
    const found = findProduct(value || "930000000010");
    setItem(found);
    setCounted(Number(found?.stockOnHand ?? found?.stock_on_hand ?? found?.shelfStock ?? found?.shelf_stock ?? 1));
    setDone(false);
  };

  const saveLine = () => {
    if (!item) return;
    const line = { id: `${item.sku || item.barcode}-${Date.now()}`, item, counted, expected, variance, reason, note };
    setLines((current) => [line, ...current]);
    createScanOpsEvent(variance ? SCANOPS_EVENT_TYPES.STOCK_COUNT_VARIANCE_REVIEW_REQUIRED : SCANOPS_EVENT_TYPES.STOCK_COUNT_LINE_SAVED, {
      source_module: "Stock Count",
      count_type: mode,
      item_name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      expected_quantity: expected,
      counted_quantity: counted,
      variance_quantity: variance,
      variance_reason: reason,
      note,
      status: variance ? "variance_review_required" : "line_saved",
    });
    setItem(null);
    setScanValue("");
  };

  const submit = () => {
    if (!lines.length) return;
    createScanOpsEvent(SCANOPS_EVENT_TYPES.STOCK_COUNT_SUBMITTED, { source_module: "Stock Count", count_type: mode, counted_items: lines.length, variance_items: lines.filter((line) => line.variance).length, status: "submitted_for_review" });
    setDone(true);
  };

  return (
    <PageShell>
      <WorkflowHeader title="Stock Count" subtitle={started ? `${modeMeta.title} · scanner-first count` : "Choose count mode, then scan"} scanValue={scanValue} onScanValueChange={setScanValue} onScan={scan} />
      <WorkflowMain>
        {!started && <>
          <SectionCard className="space-y-3">
            <TouchSelect label="Count mode" value={mode} onChange={setMode} options={STOCK_COUNT_TYPE_OPTIONS.map((option) => ({ id: option.id, label: option.title, helper: option.caption }))} />
            <div className="rounded-2xl bg-secondary/60 p-3">
              <p className="text-sm font-black text-foreground">{modeMeta.title}</p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">{modeMeta.helper}</p>
              {!modeMeta.enabled && <p className="mt-2 text-xs font-bold text-muted-foreground">Governed placeholder. Full scheduler/assignment remains out of scope for this pass.</p>}
            </div>
          </SectionCard>
          <StickyActions leftLabel="Back" rightLabel={modeMeta.enabled ? "Start Count" : "Governed"} onLeft={() => {}} onRight={start} rightDisabled={!modeMeta.enabled} />
        </>}
        {started && !item && !done && <ReadyCard title="Scan item to count" helper="Use header scan/search for barcode, PLU, SKU, shelf label, or item name." />}
        {item && <>
          <ItemSummaryCard item={item} />
          <SectionCard className="space-y-3">
            <QuantityStepper label="Counted quantity" value={counted} onChange={setCounted} unit={unit} min={0} />
            <div className="rounded-2xl bg-secondary/60 p-3 space-y-2">
              <InfoLine label="Expected" value={`${expected} ${unit}`} />
              <InfoLine label="Variance" value={`${variance ?? 0} ${unit}`} />
            </div>
            {variance !== 0 && <TouchSelect label="Variance reason" value={reason} onChange={setReason} options={VARIANCE_REASONS} />}
            <TextInputField label="Note" value={note} onChange={setNote} placeholder="Optional count note" />
          </SectionCard>
          <StickyActions leftLabel="Review Lines" rightLabel="Save Count Line" onLeft={() => setItem(null)} onRight={saveLine} />
        </>}
        {lines.length > 0 && !item && <SectionCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Count review</p>
              <p className="mt-1 text-2xl font-black text-foreground">{lines.length} lines</p>
            </div>
            <p className="text-right text-xs font-bold text-muted-foreground">{lines.filter((line) => line.variance).length} variance lines</p>
          </div>
          <div className="mt-3 space-y-2">{lines.slice(0, 3).map((line) => <div key={line.id} className="rounded-2xl bg-secondary/60 p-3 text-sm font-bold text-foreground">{line.item.name} · {line.counted} {unit}</div>)}</div>
        </SectionCard>}
        {started && !item && !done && <StickyActions leftLabel="Reset" rightLabel="Submit Count" onLeft={() => { setStarted(false); setLines([]); }} onRight={submit} rightDisabled={!lines.length} />}
        {done && <DoneCard title="Count submitted" helper="Stock count lines were submitted as scanner events. Variance approval remains governed by Inventory." rows={[{ label: "Lines", value: String(lines.length) }, { label: "Variance lines", value: String(lines.filter((line) => line.variance).length) }]} />}
      </WorkflowMain>
    </PageShell>
  );
}
