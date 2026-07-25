import React, { useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, PackageOpen, ScanLine } from "lucide-react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import PageHeader from "../components/scanner/PageHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import {
  DoneCard,
  EmptyState,
  ItemSummaryCard,
  MetricPill,
  OperatorAlert,
  PageShell,
  QuantityStepper,
  SectionCard,
  StickyActions,
  TextInputField,
  WorkflowMain,
} from "../components/scanner/WorkflowPrimitives";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { getItemEntryPrimaryValue } from "../lib/scanOpsItemEntry";
import {
  differenceLabel,
  expectedQuantityForItem,
  optionLabel,
  RECEIVING_CONDITION_OPTIONS_STAGEW,
  RECEIVING_EXCEPTION_OPTIONS_STAGEW,
  unitForItem,
} from "../lib/scanOpsReceivingTransfers";

const DEFAULT_SESSION = {
  poRef: "PO-1042",
  deliveryRef: "DEL-7781",
  supplierName: "Fresh Fields Co.",
};

function ReceiveSessionCard({ lines }) {
  return (
    <SectionCard>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <PackageOpen className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Receiving Session</p>
          <h2 className="mt-1 text-base font-black text-foreground">{DEFAULT_SESSION.poRef}</h2>
          <p className="mt-1 text-xs font-bold text-muted-foreground">{DEFAULT_SESSION.supplierName} · {DEFAULT_SESSION.deliveryRef}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MetricPill label="Lines" value={lines.length} />
        <MetricPill label="Exceptions" value={lines.filter((line) => line.exceptionType !== "none").length} />
        <MetricPill label="Status" value="Open" />
      </div>
    </SectionCard>
  );
}

function SavedLinesCard({ lines }) {
  return (
    <SectionCard>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Received Lines</p>
          <h2 className="mt-1 text-lg font-black text-foreground">{lines.length} saved</h2>
        </div>
      </div>
      {lines.length ? (
        <div className="mt-3 space-y-2">
          {lines.map((line) => (
            <div key={line.id} className="rounded-2xl bg-secondary/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-black text-foreground">{line.itemName}</p>
                  <p className="mt-1 text-xs font-bold text-muted-foreground">Expected {line.expectedLabel} · Received {line.quantity} {line.unit}</p>
                  <p className="mt-1 text-xs font-bold text-muted-foreground">Exception: {line.exceptionLabel} · Condition: {line.conditionLabel}</p>
                  {line.note && <p className="mt-1 text-xs font-semibold text-muted-foreground">Note: {line.note}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${line.exceptionType === "none" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>{line.exceptionType === "none" ? "Saved" : "Review"}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No receiving lines yet." helper="Scan an item, confirm quantity, then save the line." />
      )}
    </SectionCard>
  );
}

export default function Receiving() {
  const [scanValue, setScanValue] = useState("");
  const [item, setItem] = useState(null);
  const [quantity, setQuantity] = useState(0);
  const [exceptionType, setExceptionType] = useState("none");
  const [condition, setCondition] = useState("normal");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [savedLines, setSavedLines] = useState([]);
  const [operatorError, setOperatorError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);

  const expectedQty = expectedQuantityForItem(item);
  const unit = unitForItem(item || {});
  const diff = expectedQty == null ? null : Number((Number(quantity || 0) - expectedQty).toFixed(3));

  const scan = (value) => {
    const input = typeof value === "object" ? getItemEntryPrimaryValue(value) : String(value || "").trim();
    const found = typeof value === "object" ? value : resolveInventoryIdentity(input);
    if (!found) {
      setOperatorError({ title: "Item not found", helper: "Scan again or enter a barcode, SKU, PLU, or item name." });
      return;
    }
    const expected = expectedQuantityForItem(found);
    setOperatorError(null);
    setLastSaved(null);
    setItem(found);
    setScanValue(getItemEntryPrimaryValue(found));
    setQuantity(expected == null ? 1 : Math.max(0, expected));
    setExceptionType("none");
    setCondition("normal");
    setEvidenceNote("");
  };

  const saveLine = () => {
    if (!item) {
      setOperatorError({ title: "Item required", helper: "Scan an item before confirming receiving." });
      return;
    }
    if (quantity === "" || Number.isNaN(Number(quantity)) || Number(quantity) < 0) {
      setOperatorError({ title: "Quantity missing", helper: "Enter a valid received quantity before confirming." });
      return;
    }

    const line = {
      id: `receive-${Date.now()}`,
      itemName: item.name || item.item_name || "Scanned item",
      sku: item.sku,
      barcode: item.barcode,
      expectedLabel: expectedQty == null ? "Unavailable" : `${expectedQty} ${unit}`,
      quantity: Number(quantity),
      unit,
      exceptionType,
      exceptionLabel: optionLabel(RECEIVING_EXCEPTION_OPTIONS_STAGEW, exceptionType),
      conditionLabel: optionLabel(RECEIVING_CONDITION_OPTIONS_STAGEW, condition),
      note: evidenceNote,
    };

    setSavedLines((current) => [line, ...current]);
    setLastSaved(line);
    setOperatorError(null);
    setItem(null);
    setScanValue("");
    setQuantity(0);
    setExceptionType("none");
    setCondition("normal");
    setEvidenceNote("");
  };

  const clearItem = () => {
    setItem(null);
    setScanValue("");
    setQuantity(0);
    setExceptionType("none");
    setCondition("normal");
    setEvidenceNote("");
    setOperatorError(null);
  };

  return (
    <PageShell className="bold-blocks">
      <PageHeader title="Receive Stock" subtitle="Scan, confirm quantity, save, repeat" />
      <WorkflowHeader
        title="Receive Stock"
        subtitle="Scan item → confirm quantity → save line → scan next"
        placeholder="Scan delivery item barcode, SKU, PLU, or name..."
        showHeaderChrome={false}
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={scan}
      />
      <WorkflowMain>
        {operatorError && (
          <OperatorAlert
            title={operatorError.title}
            helper={operatorError.helper}
            tone="warning"
            actions={[{ label: "Keep Editing", onClick: () => setOperatorError(null), variant: "primary" }]}
          />
        )}

        {lastSaved && (
          <OperatorAlert
            tone="success"
            title="Receiving line saved"
            helper={`${lastSaved.itemName} saved. Scan the next item when ready.`}
          />
        )}

        <ReceiveSessionCard lines={savedLines} />

        {item ? (
          <>
            <ItemSummaryCard item={item}>
              <div className="grid grid-cols-3 gap-2">
                <MetricPill label="Expected" value={expectedQty == null ? "Unavailable" : expectedQty} suffix={expectedQty == null ? "" : unit} />
                <MetricPill label="Received" value={quantity} suffix={unit} />
                <MetricPill label="Diff" value={differenceLabel(diff)} suffix={diff == null ? "" : unit} />
              </div>
            </ItemSummaryCard>

            <SectionCard className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ClipboardList className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Confirm Receive</p>
                  <h2 className="mt-1 text-base font-black text-foreground">How many arrived?</h2>
                  <p className="mt-1 text-xs font-bold text-muted-foreground">Confirm the received quantity before saving this line.</p>
                </div>
              </div>
              <QuantityStepper label="Received Quantity" value={quantity} onChange={setQuantity} unit={unit} min={0} />
              {expectedQty == null ? (
                <p className="rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-bold text-muted-foreground">Expected quantity unavailable. This line will be saved for review.</p>
              ) : diff !== 0 ? (
                <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">Difference {differenceLabel(diff)} {unit}. This line should be reviewed.</p>
              ) : (
                <p className="rounded-2xl bg-primary/10 px-3 py-2 text-xs font-bold text-primary">Quantity matches expected.</p>
              )}
            </SectionCard>

            <SectionCard className="space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Exception</p>
              <TouchSelect label="Issue Type" value={exceptionType} onChange={setExceptionType} options={RECEIVING_EXCEPTION_OPTIONS_STAGEW} />
              <TouchSelect label="Condition" value={condition} onChange={setCondition} options={RECEIVING_CONDITION_OPTIONS_STAGEW} />
              <TextInputField label="Evidence note" value={evidenceNote} onChange={setEvidenceNote} placeholder="Short note if damaged, short, extra, or needs review" />
            </SectionCard>

            <StickyActions leftLabel="Clear Item" rightLabel="Confirm Receive" onLeft={clearItem} onRight={saveLine} rightDisabled={quantity < 0} />
          </>
        ) : (
          <SectionCard className="border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <ScanLine className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-black leading-tight text-foreground">Scan delivery item</p>
                <p className="mt-1 text-sm font-bold leading-snug text-muted-foreground">Scan an item to confirm quantity and record any receiving issue.</p>
              </div>
            </div>
          </SectionCard>
        )}

        <SavedLinesCard lines={savedLines} />
        <DoneCard
          title="Receiving stays controlled"
          helper="This handheld screen captures receiving evidence. Inventory Desktop remains the system of record."
          rows={[
            { label: "Bridge Impact", value: "NONE" },
            { label: "Stock Posting", value: "Desktop controlled" },
          ]}
        />
      </WorkflowMain>
    </PageShell>
  );
}