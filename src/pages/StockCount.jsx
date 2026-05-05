import React, { useState } from "react";
import PageHeader from "../components/scanner/PageHeader";
import ScanPlaceholder from "../components/scanner/ScanPlaceholder";
import NumericKeypad from "../components/scanner/NumericKeypad";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";

const COUNT_ITEM = resolveInventoryIdentity("930000000010");
const MOCK_PRODUCT = {
  name: COUNT_ITEM?.name || "Rice 5kg",
  sku: COUNT_ITEM?.sku || "GROC-RICE-5KG",
  barcode: COUNT_ITEM?.barcode || "930000000010",
  internalItemId: COUNT_ITEM?.internalItemId || COUNT_ITEM?.id,
  systemQty: COUNT_ITEM?.stockOnHand ?? COUNT_ITEM?.stock_on_hand ?? 18,
};

const VARIANCE_REASONS = [
  "Damaged / Unsaleable",
  "Miscounted Previously",
  "Theft / Shrinkage",
  "Delivery Not Updated",
  "Other",
];

const STEPS = {
  SCAN: "scan",
  COUNT: "count",
  VARIANCE: "variance",
  CONFIRM: "confirm",
  DONE: "done",
};

export default function StockCount() {
  const [step, setStep] = useState(STEPS.SCAN);
  const [counted, setCounted] = useState("");
  const [reason, setReason] = useState(null);

  const countedNum = parseInt(counted, 10);
  const variance = isNaN(countedNum) ? null : countedNum - MOCK_PRODUCT.systemQty;
  const hasVariance = variance !== null && variance !== 0;

  const handleScanDone = () => setStep(STEPS.COUNT);

  const handleCountConfirm = () => {
    if (!counted) return;
    if (hasVariance) {
      setStep(STEPS.VARIANCE);
    } else {
      setStep(STEPS.CONFIRM);
    }
  };

  const handleVarianceConfirm = () => setStep(STEPS.CONFIRM);

  const handleFinalConfirm = () => {
    createScanOpsEvent(SCANOPS_EVENT_TYPES.STOCK_COUNT_SUBMITTED, {
      source_module: "Stock Count",
      sku: MOCK_PRODUCT.sku,
      barcode: MOCK_PRODUCT.barcode,
      internal_item_id: MOCK_PRODUCT.internalItemId,
      item_name: MOCK_PRODUCT.name,
      system_quantity: MOCK_PRODUCT.systemQty,
      counted_quantity: countedNum,
      variance,
      variance_reason: reason,
      status: hasVariance ? "variance_recorded" : "count_confirmed",
    });
    setStep(STEPS.DONE);
  };

  const resetAll = () => {
    setCounted("");
    setReason(null);
    setStep(STEPS.SCAN);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader title="Stock Count" />

      <main className="flex-1 px-4 py-5 overflow-y-auto pb-8">

        {/* SCAN STEP */}
        {step === STEPS.SCAN && (
          <ScanPlaceholder onSimulate={handleScanDone} />
        )}

        {/* COUNT STEP */}
        {step === STEPS.COUNT && (
          <div className="space-y-5">
            {/* Product card */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <p className="text-xs text-muted-foreground font-mono">{MOCK_PRODUCT.sku}</p>
              <h2 className="text-base font-bold text-foreground mt-1">{MOCK_PRODUCT.name}</h2>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">System Qty</span>
                <span className="text-2xl font-bold text-foreground">{MOCK_PRODUCT.systemQty}</span>
              </div>
            </div>

            {/* Count display */}
            <div className="bg-card rounded-2xl border border-border px-5 py-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Counted Qty</span>
              <span className={`text-4xl font-bold ${counted ? "text-foreground" : "text-muted-foreground/40"}`}>
                {counted || "0"}
              </span>
            </div>

            <NumericKeypad value={counted} onChange={setCounted} />

            <button
              onClick={handleCountConfirm}
              disabled={!counted}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 active:scale-[0.98] transition-all"
            >
              Confirm Count
            </button>
          </div>
        )}

        {/* VARIANCE STEP */}
        {step === STEPS.VARIANCE && (
          <div className="space-y-5">
            {/* Variance banner */}
            <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-5 flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-foreground">Variance Detected</p>
                <p className="text-sm text-muted-foreground mt-1">
                  System: <strong>{MOCK_PRODUCT.systemQty}</strong> · Counted: <strong>{counted}</strong> · 
                  Difference: <strong className="text-destructive">{variance > 0 ? "+" : ""}{variance}</strong>
                </p>
              </div>
            </div>

            <p className="text-sm font-semibold text-foreground">Select a reason</p>

            <div className="space-y-2">
              {VARIANCE_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`w-full py-4 px-5 rounded-2xl border text-sm font-semibold text-left transition-all active:scale-[0.99]
                    ${reason === r
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-card border-border text-foreground"
                    }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <button
              onClick={handleVarianceConfirm}
              disabled={!reason}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 active:scale-[0.98] transition-all"
            >
              Continue
            </button>
          </div>
        )}

        {/* CONFIRM STEP */}
        {step === STEPS.CONFIRM && (
          <div className="space-y-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Review & Submit</p>

            <div className="bg-card rounded-2xl border border-border divide-y divide-border">
              <Row label="Product" value={MOCK_PRODUCT.name} />
              <Row label="System Qty" value={MOCK_PRODUCT.systemQty} />
              <Row label="Counted Qty" value={counted} />
              {hasVariance && <Row label="Variance" value={`${variance > 0 ? "+" : ""}${variance}`} highlight />}
              {reason && <Row label="Reason" value={reason} />}
            </div>

            <button
              onClick={handleFinalConfirm}
              className="w-full py-4 rounded-2xl bg-accent text-accent-foreground font-bold text-sm active:scale-[0.98] transition-all"
            >
              Submit Count
            </button>
          </div>
        )}

        {/* DONE STEP */}
        {step === STEPS.DONE && (
          <div className="flex flex-col items-center justify-center py-16 space-y-5">
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-accent" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">Count Submitted</p>
              <p className="text-sm text-muted-foreground mt-1">{MOCK_PRODUCT.name}</p>
            </div>
            <button
              onClick={resetAll}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] transition-all"
            >
              Count Another Item
            </button>
          </div>
        )}

      </main>
    </div>
  );
}

function Row({ label, value, highlight = false }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? "text-destructive" : "text-foreground"}`}>{value}</span>
    </div>
  );
}