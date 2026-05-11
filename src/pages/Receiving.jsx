import React, { useMemo, useState } from "react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import {
  DoneCard,
  EmptyState,
  InfoLine,
  ItemSummaryCard,
  PageShell,
  QuantityStepper,
  SectionCard,
  StickyActions,
  TextInputField,
  WorkflowMain,
} from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import {
  buildReceivingRequest,
  getOptionLabel,
  RECEIVING_CONDITION_OPTIONS,
  RECEIVING_DISCREPANCY_OPTIONS,
  RECEIVING_MODES,
  saveReceivingRequest,
  normalizeReceivingLine,
  upsertReceivingLine,
} from "../lib/scanOpsRequestLifecycle";

const SUPPLIERS = [
  { id: "fresh_fields", label: "Fresh Fields Co.", helper: "Fresh produce and dairy" },
  { id: "dairy_direct", label: "Dairy Direct Ltd.", helper: "Chilled dairy delivery" },
  { id: "green_harvest", label: "Green Harvest", helper: "Produce supplier" },
  { id: "metro_dry_goods", label: "Metro Dry Goods", helper: "Grocery and pantry" },
];

function getSupplierLabel(id) {
  return SUPPLIERS.find((supplier) => supplier.id === id)?.label || id || "—";
}

function getExpectedQty(item) {
  const value = Number(item?.pendingDeliveryQty ?? item?.pending_delivery_qty ?? 24);
  return Number.isFinite(value) ? value : 24;
}

function getUnit(item) {
  return item?.unitType || item?.unit_type || "each";
}

function lineDiff(line) {
  if (line.expectedQty == null) return "—";
  const diff = Number(line.receivedQty || 0) - Number(line.expectedQty || 0);
  return diff > 0 ? `+${diff}` : String(diff);
}

export default function Receiving() {
  const [scanValue, setScanValue] = useState("");
  const [supplierId, setSupplierId] = useState("fresh_fields");
  const [poReference, setPoReference] = useState("PO-10293");
  const [receivingMode, setReceivingMode] = useState(RECEIVING_MODES.AGAINST_PO);
  const [item, setItem] = useState(null);
  const [quantity, setQuantity] = useState(6);
  const [condition, setCondition] = useState("good");
  const [discrepancy, setDiscrepancy] = useState("none");
  const [batch, setBatch] = useState([]);
  const [view, setView] = useState("entry");
  const [submittedRequest, setSubmittedRequest] = useState(null);

  const supplierName = getSupplierLabel(supplierId);
  const unit = getUnit(item);
  const expectedQty = getExpectedQty(item);
  const againstPoNeedsReference = receivingMode === RECEIVING_MODES.AGAINST_PO && !String(poReference || "").trim();
  const setupReady = Boolean(supplierId) && !againstPoNeedsReference;
  const batchDiscrepancyCount = useMemo(() => batch.filter((line) => line.discrepancy && line.discrepancy !== "none").length, [batch]);

  const scan = (value) => {
    const found = typeof value === "object" ? value : resolveInventoryIdentity(String(value || "").trim());
    if (!found) return;
    setItem(found);
    const defaultQty = Math.min(6, Math.max(1, getExpectedQty(found)));
    setQuantity(defaultQty);
    setCondition("good");
    setDiscrepancy("none");
    setView("entry");
    setSubmittedRequest(null);
  };

  const addToBatch = () => {
    if (!item || !setupReady) return;
    const line = normalizeReceivingLine({
      item,
      quantity,
      condition,
      discrepancy,
      supplierId,
      supplierName,
      poReference: poReference || "",
      receivingMode,
    });
    setBatch((current) => upsertReceivingLine(current, line));
    createScanOpsEvent(SCANOPS_EVENT_TYPES.RECEIVING_ITEM_ADDED, {
      source_module: "Receiving",
      supplier_id: supplierId,
      supplier_name: supplierName,
      purchase_order_ref: receivingMode === RECEIVING_MODES.AGAINST_PO ? poReference : null,
      receiving_mode: receivingMode,
      item_name: line.itemName,
      sku: line.sku,
      barcode: line.barcode,
      plu: item.plu || item.scaleCode,
      match_reason: item._searchMatch?.displayReason || null,
      expected_qty: line.expectedQty,
      received_qty: line.receivedQty,
      unit_type: line.unit,
      condition,
      discrepancy,
      status: "draft_line_added",
      applies_stock_directly: false,
    });
    setItem(null);
    setScanValue("");
    setQuantity(6);
    setCondition("good");
    setDiscrepancy("none");
  };

  const removeLine = (requestItemId) => {
    setBatch((current) => current.filter((line) => line.requestItemId !== requestItemId));
  };

  const submitReceiving = () => {
    if (!batch.length || !setupReady) return;
    const request = saveReceivingRequest(buildReceivingRequest({
      supplierId,
      supplierName,
      poReference: receivingMode === RECEIVING_MODES.AGAINST_PO ? poReference : poReference || undefined,
      receivingMode,
      items: batch,
    }));
    createScanOpsEvent(SCANOPS_EVENT_TYPES.RECEIVING_EVIDENCE_SUBMITTED, {
      source_module: "Receiving",
      receiving_request_id: request.requestId,
      supplier_id: supplierId,
      supplier_name: supplierName,
      purchase_order_ref: request.poReference || null,
      receiving_mode: receivingMode,
      item_count: batch.length,
      discrepancy_count: batchDiscrepancyCount,
      status: request.status,
      applies_stock_directly: false,
      official_inventory_applies_after_sync: true,
    });
    setSubmittedRequest(request);
    setView("done");
    setItem(null);
    setScanValue("");
  };

  const primaryActionLabel = item ? "Add to Batch" : batch.length ? "Review Batch" : "Add to Batch";
  const primaryAction = item ? addToBatch : () => setView("review");
  const primaryDisabled = item ? (!setupReady || quantity <= 0) : !batch.length;

  return (
    <PageShell>
      <WorkflowHeader
        title="Receiving"
        subtitle={view === "review" ? "Review receiving evidence" : "Supplier / PO evidence"}
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={scan}
      />
      <WorkflowMain>
        <SectionCard className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setReceivingMode(RECEIVING_MODES.AGAINST_PO)}
              className={`min-h-11 rounded-2xl px-3 text-xs font-black ${receivingMode === RECEIVING_MODES.AGAINST_PO ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
            >
              Against PO
            </button>
            <button
              type="button"
              onClick={() => setReceivingMode(RECEIVING_MODES.ADHOC_DELIVERY)}
              className={`min-h-11 rounded-2xl px-3 text-xs font-black ${receivingMode === RECEIVING_MODES.ADHOC_DELIVERY ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
            >
              Ad-hoc Delivery
            </button>
          </div>
          <TouchSelect label="Supplier" value={supplierId} onChange={setSupplierId} options={SUPPLIERS} />
          <TextInputField
            label={receivingMode === RECEIVING_MODES.AGAINST_PO ? "PO / Delivery Ref" : "Delivery Ref / Notes"}
            value={poReference}
            onChange={setPoReference}
            placeholder={receivingMode === RECEIVING_MODES.AGAINST_PO ? "Required for against-PO receiving" : "Optional ad-hoc delivery reference"}
          />
          {againstPoNeedsReference && (
            <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">
              PO / delivery reference is required before an against-PO receiving batch can be submitted.
            </p>
          )}
          {receivingMode === RECEIVING_MODES.ADHOC_DELIVERY && (
            <p className="rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-bold text-muted-foreground">
              Ad-hoc receiving records evidence only. Inventory must approve/post stock later.
            </p>
          )}
        </SectionCard>

        {view === "done" && submittedRequest ? (
          <DoneCard
            title="Receiving evidence submitted"
            helper="No stock has been posted yet. The desktop inventory system must review/post the receiving record."
            rows={[
              { label: "Request", value: submittedRequest.requestId },
              { label: "Status", value: submittedRequest.status === "sync_pending" ? "Sync pending" : "Submitted" },
              { label: "Supplier", value: submittedRequest.supplierName },
              { label: "Items", value: String(submittedRequest.items.length) },
              { label: "Stock mutation", value: "No direct stock mutation" },
            ]}
          />
        ) : view === "review" ? (
          <>
            <SectionCard className="space-y-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Review Receiving Batch</p>
                <h2 className="mt-1 text-lg font-black text-foreground">{batch.length} item{batch.length === 1 ? "" : "s"} ready</h2>
              </div>
              <div className="space-y-2 rounded-2xl bg-secondary/50 p-3">
                <InfoLine label="Supplier" value={supplierName} />
                <InfoLine label="PO / Reference" value={poReference || (receivingMode === RECEIVING_MODES.ADHOC_DELIVERY ? "Ad-hoc delivery" : "—")} />
                <InfoLine label="Mode" value={receivingMode === RECEIVING_MODES.AGAINST_PO ? "Against PO" : "Ad-hoc Delivery"} />
                <InfoLine label="Discrepancies" value={String(batchDiscrepancyCount)} />
              </div>
              <div className="space-y-2">
                {batch.map((line) => (
                  <div key={line.requestItemId} className="rounded-2xl border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-black text-foreground">{line.itemName}</p>
                        <p className="mt-1 break-words text-xs font-bold text-muted-foreground">
                          Expected {line.expectedQty ?? "—"} · Received {line.receivedQty} · Diff {lineDiff(line)}
                        </p>
                        <p className="mt-1 break-words text-xs font-bold text-muted-foreground">
                          Condition: {getOptionLabel(RECEIVING_CONDITION_OPTIONS, line.condition)}
                          {line.discrepancy !== "none" ? ` · Discrepancy: ${getOptionLabel(RECEIVING_DISCREPANCY_OPTIONS, line.discrepancy)}` : ""}
                        </p>
                      </div>
                      <button type="button" onClick={() => removeLine(line.requestItemId)} className="shrink-0 rounded-xl bg-secondary px-2 py-1 text-[11px] font-black text-muted-foreground active:bg-border">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
            <StickyActions leftLabel="Back" rightLabel="Submit Receiving Evidence" onLeft={() => setView("entry")} onRight={submitReceiving} rightDisabled={!batch.length || !setupReady} />
          </>
        ) : (
          <>
            {item ? (
              <>
                <ItemSummaryCard item={item}>
                  <p className="text-xs font-bold text-muted-foreground">
                    Expected {expectedQty} · Already received 0 · Shelf {item.shelfStock ?? item.shelf_stock ?? "—"} · Backroom {item.backroomStock ?? item.backroom_stock ?? "—"} · SOH {item.stockOnHand ?? item.stock_on_hand ?? "—"}
                  </p>
                </ItemSummaryCard>
                <SectionCard className="space-y-3">
                  <QuantityStepper label="Received qty" value={quantity} onChange={setQuantity} unit={unit} min={0} />
                  <TouchSelect label="Condition" value={condition} onChange={setCondition} options={RECEIVING_CONDITION_OPTIONS} />
                  <TouchSelect label="Discrepancy" value={discrepancy} onChange={setDiscrepancy} options={RECEIVING_DISCREPANCY_OPTIONS} />
                </SectionCard>
              </>
            ) : (
              <EmptyState title="No item selected." helper="Search or scan an item from the header when the supplier setup is ready." />
            )}

            <SectionCard>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Current receiving batch</p>
                  <p className="mt-1 text-2xl font-black text-foreground">{batch.length} {batch.length === 1 ? "item" : "items"}</p>
                </div>
                <p className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-black text-muted-foreground">{batchDiscrepancyCount} discrepancies</p>
              </div>
              {batch.length ? (
                <div className="mt-3 space-y-2">
                  {batch.map((line) => (
                    <div key={line.requestItemId} className="rounded-2xl bg-secondary/60 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-black text-foreground">{line.itemName}</p>
                          <p className="mt-1 break-words text-xs font-bold text-muted-foreground">
                            Expected {line.expectedQty ?? "—"} · Received {line.receivedQty} · {getOptionLabel(RECEIVING_CONDITION_OPTIONS, line.condition)}
                            {line.discrepancy !== "none" ? ` · ${getOptionLabel(RECEIVING_DISCREPANCY_OPTIONS, line.discrepancy)}` : ""}
                          </p>
                        </div>
                        <p className="shrink-0 text-xs font-black text-foreground">x {line.receivedQty} {line.unit}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-2xl bg-secondary/50 px-3 py-2 text-sm font-bold text-muted-foreground">Batch is empty.</p>
              )}
            </SectionCard>

            <StickyActions
              leftLabel="Clear Item"
              rightLabel={primaryActionLabel}
              onLeft={() => { setItem(null); setScanValue(""); }}
              onRight={primaryAction}
              rightDisabled={primaryDisabled}
            />
          </>
        )}
      </WorkflowMain>
    </PageShell>
  );
}
