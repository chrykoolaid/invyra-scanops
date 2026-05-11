import React, { useState } from "react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import { DoneCard, InfoLine, ItemSummaryCard, PageShell, QuantityStepper, SectionCard, StickyActions, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { getLocationLabel, getTransferTypeLabel, LOCATION_OPTIONS, TRANSFER_REASON_OPTIONS, TRANSFER_TYPE_OPTIONS } from "../lib/scanOpsTransferRules";

const STEP_LABELS = ["Type", "Source", "Item", "Qty", "Dest", "Review"];

export default function Transfers() {
  const [scanValue, setScanValue] = useState("");
  const [step, setStep] = useState(1);
  const [transferType, setTransferType] = useState(TRANSFER_TYPE_OPTIONS[0]?.id || "BACKROOM_TO_SHELF");
  const [source, setSource] = useState("BACKROOM-A");
  const [destination, setDestination] = useState("AISLE-4-DRINKS");
  const [reason, setReason] = useState("");
  const [item, setItem] = useState(null);
  const [quantity, setQuantity] = useState(6);
  const [done, setDone] = useState(false);
  const reasonOptions = TRANSFER_REASON_OPTIONS[transferType] || [{ id: "standard_transfer", label: "Standard transfer" }];
  const unit = item?.unitType || item?.unit_type || "each";
  const available = source.includes("BACKROOM") ? item?.backroomStock ?? item?.backroom_stock : item?.shelfStock ?? item?.shelf_stock;

  const scan = (value) => {
    const found = resolveInventoryIdentity(String(value || "").trim() || "930000000001") || resolveInventoryIdentity("930000000001");
    setItem(found);
    setQuantity(Math.min(6, Math.max(1, Number(found?.backroomStock ?? found?.backroom_stock ?? 6))));
    setDone(false);
    setStep(4);
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_ITEM_SCANNED, { source_module: "Transfers", item_name: found?.name, sku: found?.sku, barcode: found?.barcode, applies_stock_directly: false });
  };

  const next = () => setStep((current) => Math.min(6, current + 1));
  const back = () => setStep((current) => Math.max(1, current - 1));

  const confirm = () => {
    if (!item) return;
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_COMPLETED, {
      source_module: "Transfers",
      transfer_type: transferType,
      source_location: source,
      destination_location: destination,
      item_name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      quantity,
      unit_type: unit,
      reason,
      applies_stock_directly: false,
      official_inventory_applies_after_sync: true,
      status: "request_queued",
    });
    setDone(true);
  };

  return (
    <PageShell>
      <WorkflowHeader title="Transfers" subtitle={`Step ${step} of 6 · ${STEP_LABELS[step - 1]}`} scanValue={scanValue} onScanValueChange={setScanValue} onScan={scan} showSearch={step === 3 && !done} />
      <WorkflowMain>
        <Progress step={step} />
        {done ? (
          <DoneCard title="Transfer Request Queued" helper="No direct stock mutation was applied. Inventory posts movement after sync/review." rows={[{ label: "Item", value: item?.name }, { label: "Quantity", value: `${quantity} ${unit}` }, { label: "Stock mutation", value: "No direct stock mutation" }]} />
        ) : (
          <>
            {step === 1 && <SectionCard className="space-y-3"><TouchSelect label="Transfer type" value={transferType} onChange={(v) => { setTransferType(v); setReason(""); }} options={TRANSFER_TYPE_OPTIONS} /><TouchSelect label="Reason" value={reason || reasonOptions[0]?.id} onChange={setReason} options={reasonOptions} /></SectionCard>}
            {step === 2 && <SectionCard><TouchSelect label="Source location" value={source} onChange={setSource} options={LOCATION_OPTIONS} /></SectionCard>}
            {step === 3 && <SectionCard><p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Context</p><p className="mt-1 text-sm font-bold text-foreground">{getLocationLabel(source)} → choose item</p><p className="mt-0.5 text-xs font-bold text-muted-foreground">{getTransferTypeLabel(transferType)}</p></SectionCard>}
            {step === 4 && <>{item && <ItemSummaryCard item={item}><p className="text-xs font-bold text-muted-foreground">Available in source: {available ?? "—"} {unit}</p></ItemSummaryCard>}<SectionCard><QuantityStepper label="Quantity / weight" value={quantity} onChange={setQuantity} unit={unit} min={1} /></SectionCard></>}
            {step === 5 && <SectionCard><TouchSelect label="Destination location" value={destination} onChange={setDestination} options={LOCATION_OPTIONS} /></SectionCard>}
            {step === 6 && <SectionCard className="space-y-2">
              <h2 className="text-base font-black text-foreground">Transfer Request Review</h2>
              <InfoLine label="Transfer type" value={getTransferTypeLabel(transferType)} />
              <InfoLine label="Source" value={getLocationLabel(source)} />
              <InfoLine label="Item" value={item?.name || "Scan required"} />
              <InfoLine label="Quantity" value={`${quantity} ${unit}`} />
              <InfoLine label="Destination" value={getLocationLabel(destination)} />
              <InfoLine label="Available snapshot" value={`${available ?? "—"} ${unit}`} />
              <InfoLine label="Reason" value={reasonOptions.find((option) => option.id === (reason || reasonOptions[0]?.id))?.label || "Standard transfer"} />
              <InfoLine label="Stock mutation" value="No direct stock mutation" />
            </SectionCard>}
            <StickyActions leftLabel={step === 1 ? "Cancel" : "Back"} rightLabel={step === 6 ? "Confirm Transfer Request" : "Continue"} onLeft={step === 1 ? () => setDone(false) : back} onRight={step === 6 ? confirm : next} rightDisabled={step === 6 && !item} />
          </>
        )}
      </WorkflowMain>
    </PageShell>
  );
}

function Progress({ step }) {
  return (
    <SectionCard>
      <div className="grid grid-cols-6 gap-1.5">
        {STEP_LABELS.map((label, index) => {
          const active = index + 1 <= step;
          return <div key={label} className={`h-2 rounded-full ${active ? "bg-primary" : "bg-secondary"}`} />;
        })}
      </div>
      <div className="mt-2 grid grid-cols-6 gap-1.5 text-center text-[10px] font-black text-muted-foreground">
        {STEP_LABELS.map((label) => <span key={label} className="truncate">{label}</span>)}
      </div>
    </SectionCard>
  );
}
