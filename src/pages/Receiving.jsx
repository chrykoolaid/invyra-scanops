import React, { useEffect, useRef, useState } from "react";
import PageHeader from "../components/scanner/PageHeader";
import ScanPlaceholder from "../components/scanner/ScanPlaceholder";
import TouchSelect from "../components/scanner/TouchSelect";
import { CheckCircle2, Minus, PackageCheck, Plus, RotateCw } from "lucide-react";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";

const SUPPLIERS = [
  { id: "Fresh Fields Co.", label: "Fresh Fields Co.", ref: "PO-2847" },
  { id: "Dairy Direct Ltd.", label: "Dairy Direct Ltd.", ref: "PO-2848" },
  { id: "Green Harvest", label: "Green Harvest", ref: "PO-2849" },
];

const CONDITIONS = [
  { id: "Good", label: "Good" },
  { id: "Damaged", label: "Damaged" },
  { id: "Short", label: "Short" },
  { id: "Over", label: "Over" },
];
const RECEIVING_ITEM = resolveInventoryIdentity("930000000004");
const MOCK_PRODUCT = {
  name: RECEIVING_ITEM?.name || "Greek Yoghurt 1kg",
  sku: RECEIVING_ITEM?.sku || "DAIRY-GREEK-YOGHURT-1KG",
  barcode: RECEIVING_ITEM?.barcode || "930000000004",
  internalItemId: RECEIVING_ITEM?.internalItemId || RECEIVING_ITEM?.id,
  expectedQty: RECEIVING_ITEM?.pendingDeliveryQty ?? RECEIVING_ITEM?.pending_delivery_qty ?? 24,
};

export default function Receiving() {
  const mainRef = useRef(null);
  const [supplierName, setSupplierName] = useState(SUPPLIERS[0].id);
  const [deliveryRef, setDeliveryRef] = useState(SUPPLIERS[0].ref);
  const [scanned, setScanned] = useState(false);
  const [received, setReceived] = useState(1);
  const [condition, setCondition] = useState("Good");
  const [doneState, setDoneState] = useState(null);

  const supplier = SUPPLIERS.find((item) => item.id === supplierName) || SUPPLIERS[0];

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [scanned, doneState]);

  const updateSupplier = (next) => {
    const selected = SUPPLIERS.find((item) => item.id === next);
    setSupplierName(next);
    setDeliveryRef(selected?.ref || "");
    setDoneState(null);
  };

  const adjustQty = (delta) => {
    setReceived((current) => Math.max(0, Number(current || 0) + delta));
    setDoneState(null);
  };

  const resetAll = () => {
    setScanned(false);
    setReceived(1);
    setCondition("Good");
    setDoneState(null);
  };

  const confirmReceipt = () => {
    if (!scanned) return;
    const event = createScanOpsEvent(SCANOPS_EVENT_TYPES.RECEIVING_CONFIRMED, {
      source_module: "Receiving",
      supplier_name: supplier.name || supplier.label,
      purchase_order_ref: deliveryRef || null,
      sku: MOCK_PRODUCT.sku,
      barcode: MOCK_PRODUCT.barcode,
      internal_item_id: MOCK_PRODUCT.internalItemId,
      item_name: MOCK_PRODUCT.name,
      expected_quantity: MOCK_PRODUCT.expectedQty,
      received_quantity: received,
      condition,
      receiving_issues: condition === "Good" ? [] : [condition],
      status: condition === "Good" ? "received" : "received_with_condition",
    });
    setDoneState({ event, title: "Added to Receiving Batch", helper: "The item was staged for receiving review. Final inventory application remains a desktop/sync responsibility." });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <PageHeader title="Receiving" subtitle="Stage L · Compact supplier receiving" />
      <main ref={mainRef} data-scanops-scroll className="flex-1 px-4 py-4 pb-8 space-y-3 overflow-y-auto overflow-x-hidden">
        <p className="scanops-helper-line">Select supplier, add an optional delivery reference, scan the item, then record quantity and condition.</p>

        <section className="scanops-compact-card space-y-3">
          <TouchSelect label="Supplier" value={supplierName} onChange={updateSupplier} options={SUPPLIERS} placeholder="Select supplier" />
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Delivery / PO</span>
            <input
              value={deliveryRef}
              onChange={(event) => setDeliveryRef(event.target.value)}
              placeholder="Optional PO / delivery reference"
              className="mt-2 h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/25"
            />
          </label>
        </section>

        <ScanPlaceholder onSimulate={() => { setScanned(true); setDoneState(null); }} />

        {scanned && (
          <section className="scanops-compact-card space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><PackageCheck className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-mono text-muted-foreground break-all">{MOCK_PRODUCT.sku} · {MOCK_PRODUCT.barcode}</p>
                <h2 className="mt-1 text-sm font-black text-foreground break-words">{MOCK_PRODUCT.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground">Expected: {MOCK_PRODUCT.expectedQty}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Received quantity</p>
              <div className="mt-2 flex items-center gap-3">
                <button onClick={() => adjustQty(-1)} className="h-12 w-12 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center active:scale-[0.98]"><Minus className="h-4 w-4" /></button>
                <div className="flex-1 rounded-xl bg-secondary/60 px-4 py-2.5 text-center">
                  <p className="text-2xl font-black text-foreground">{received}</p>
                  <p className="text-xs text-muted-foreground">each</p>
                </div>
                <button onClick={() => adjustQty(1)} className="h-12 w-12 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center active:scale-[0.98]"><Plus className="h-4 w-4" /></button>
              </div>
            </div>

            <TouchSelect
              label="Condition"
              value={condition}
              onChange={(next) => { setCondition(next); setDoneState(null); }}
              options={CONDITIONS}
              placeholder="Select condition"
            />
          </section>
        )}

        {doneState && (
          <section className="rounded-2xl border border-accent/20 bg-accent/5 p-4 text-center min-w-0">
            <CheckCircle2 className="mx-auto h-9 w-9 text-accent" />
            <h2 className="mt-2 text-base font-black text-foreground">{doneState.title}</h2>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">{doneState.helper}</p>
            <p className="mt-2 text-xs text-muted-foreground">Event: {doneState.event?.event_type || "—"}</p>
          </section>
        )}

        <div className="scanops-sticky-actions grid grid-cols-2 gap-3">
          <button onClick={resetAll} className="rounded-2xl bg-secondary py-3 text-sm font-bold text-secondary-foreground active:scale-[0.98]"><RotateCw className="mr-1 inline h-4 w-4" />Reset</button>
          <button onClick={confirmReceipt} disabled={!scanned || received <= 0} className="rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40 active:scale-[0.98]">Add to Receiving Batch</button>
        </div>
      </main>
    </div>
  );
}
