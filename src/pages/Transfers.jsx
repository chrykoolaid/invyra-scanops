import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, CheckCircle2, Home, Minus, Plus, RotateCw } from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import ScanPlaceholder from "../components/scanner/ScanPlaceholder";
import DecisionRecommendationCard from "../components/scanner/DecisionRecommendationCard";
import TransferReviewCard from "../components/scanner/TransferReviewCard";
import TouchSelect from "../components/scanner/TouchSelect";
import { useToast } from "@/components/ui/use-toast";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { buildDecisionLinkedPayload, createDecisionRecommendation, recordDecisionEvent } from "../lib/scanOpsDecisionEngine";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { buildQueuedTransfer, createTransferDraft, getTransferValidation } from "../lib/scanOpsTransfers";
import { getReasonLabel, getTransferTypeLabel, LOCATION_OPTIONS, TRANSFER_REASON_OPTIONS, TRANSFER_TYPE_OPTIONS, getLocationLabel } from "../lib/scanOpsTransferRules";
import { TRANSFER_SCAN_SEQUENCE } from "../lib/scanOpsTransferFixtures";

const BUTTON_PRIMARY = "w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40";
const BUTTON_SECONDARY = "w-full py-3 rounded-2xl bg-secondary text-secondary-foreground font-bold text-sm active:scale-[0.98] active:bg-border transition-all flex items-center justify-center gap-2";

const STEPS = [
  { id: 1, title: "Transfer Type" },
  { id: 2, title: "Source" },
  { id: 3, title: "Scan Item" },
  { id: 4, title: "Quantity" },
  { id: 5, title: "Destination" },
  { id: 6, title: "Review" },
];

export default function Transfers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const mainRef = useRef(null);
  const startRecorded = useRef(false);
  const [draft, setDraft] = useState(() => createTransferDraft());
  const [step, setStep] = useState(1);
  const [scanIndex, setScanIndex] = useState(0);
  const [doneState, setDoneState] = useState(null);

  const validation = useMemo(() => getTransferValidation(draft), [draft]);
  const decision = useMemo(() => createDecisionRecommendation({ workflow: "transfer", item: draft.item, context: { transferType: draft.transferType, sourceLocation: draft.sourceLocation, destinationLocation: draft.destinationLocation, quantity: draft.quantity, validation } }), [draft, validation]);
  const reasonOptions = TRANSFER_REASON_OPTIONS[draft.transferType] || [];

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [step, doneState]);

  useEffect(() => {
    if (startRecorded.current) return;
    startRecorded.current = true;
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_STARTED, { source_module: "Transfers", status: "started", item_name: "Transfer workflow opened", transfer_type: draft.transferType });
  }, [draft.transferType]);

  const updateDraft = (patch) => {
    setDraft((current) => ({ ...current, ...patch }));
    setDoneState(null);
  };

  const selectTransferType = (transferType) => {
    updateDraft({ transferType, reason: "" });
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_TYPE_SELECTED, { source_module: "Transfers", status: "selected", transfer_type: transferType, item_name: getTransferTypeLabel(transferType) });
  };

  const selectReason = (reason) => {
    updateDraft({ reason });
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_REVIEWED, { source_module: "Transfers", status: "reason_selected", transfer_type: draft.transferType, reason, reason_label: getReasonLabel(reason), item_name: getReasonLabel(reason) });
  };

  const selectSource = (sourceLocation) => {
    updateDraft({ sourceLocation });
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_SOURCE_SELECTED, { source_module: "Transfers", status: "selected", source_location: sourceLocation, item_name: getLocationLabel(sourceLocation) });
  };

  const selectDestination = (destinationLocation) => {
    updateDraft({ destinationLocation });
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_DESTINATION_SELECTED, { source_module: "Transfers", status: "selected", destination_location: destinationLocation, item_name: getLocationLabel(destinationLocation) });
  };

  const scanItem = () => {
    const input = TRANSFER_SCAN_SEQUENCE[scanIndex % TRANSFER_SCAN_SEQUENCE.length];
    const item = resolveInventoryIdentity(input);
    if (!item) {
      toast({ description: "Item could not be resolved", duration: 1500 });
      return;
    }
    const nextQuantity = item.unitType === "kg" ? 1 : 4;
    updateDraft({ item, quantity: nextQuantity, unitType: item.unitType || "each" });
    setScanIndex(scanIndex + 1);
    const generatedDecision = createDecisionRecommendation({ workflow: "transfer", item, context: { ...draft, item, quantity: nextQuantity } });
    recordDecisionEvent(generatedDecision, "generated", { source_module: "Transfers", status: "generated" });
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_ITEM_SCANNED, {
      source_module: "Transfers",
      status: "scanned",
      transfer_type: draft.transferType,
      sku: item.sku,
      barcode: item.barcode,
      gtin: item.gtin,
      plu: item.plu,
      scale_code: item.scaleCode,
      batch_id: item.batchId,
      lot_id: item.lotId,
      internal_item_id: item.internalItemId,
      item_name: item.name,
    });
    toast({ description: `${item.name} scanned`, duration: 1500 });
  };

  const adjustQuantity = (delta) => {
    const next = Math.max(0, Number((Number(draft.quantity || 0) + delta).toFixed(2)));
    updateDraft({ quantity: next });
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_QUANTITY_ENTERED, { source_module: "Transfers", status: "entered", quantity: next, unit_type: draft.unitType, item_name: draft.item?.name || "Transfer quantity" });
  };

  const continueStep = () => {
    if (step === 1 && reasonOptions.length > 0 && !draft.reason) {
      toast({ description: "Select a transfer reason first.", duration: 1500 });
      return;
    }
    if (step === 2 && !draft.sourceLocation) {
      toast({ description: "Select a source location.", duration: 1500 });
      return;
    }
    if (step === 3 && !draft.item) {
      toast({ description: "Scan or simulate an item first.", duration: 1500 });
      return;
    }
    if (step === 4 && Number(draft.quantity || 0) <= 0) {
      toast({ description: "Enter a quantity greater than zero.", duration: 1500 });
      return;
    }
    if (step === 5 && !draft.destinationLocation) {
      toast({ description: "Select a destination location.", duration: 1500 });
      return;
    }
    setStep((current) => Math.min(6, current + 1));
  };

  const confirmTransfer = () => {
    const currentValidation = getTransferValidation(draft);
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_REVIEWED, { source_module: "Transfers", status: currentValidation.review ? "review_required" : currentValidation.ok ? "reviewed" : "blocked", item_name: draft.item?.name || "Transfer review", transfer_type: draft.transferType, source_location: draft.sourceLocation, destination_location: draft.destinationLocation, quantity: draft.quantity, reason: draft.reason || null, validation_message: currentValidation.message });
    if (!currentValidation.ok) {
      toast({ description: currentValidation.message, duration: 1800 });
      return;
    }
    const decisionEvent = recordDecisionEvent(decision, currentValidation.review ? "supervisor_review" : "accepted", { source_module: "Transfers", status: currentValidation.review ? "review_required" : "accepted" });
    const transfer = buildQueuedTransfer({ ...draft, reviewRequired: currentValidation.review }, decision);
    const linkedPayload = buildDecisionLinkedPayload(decision, decisionEvent);

    if (currentValidation.review) {
      const reviewEvent = createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_SUPERVISOR_REVIEW_REQUIRED, {
        source_module: "Transfers",
        status: "review_required",
        item_name: transfer.itemName,
        transfer_id: transfer.transferId,
        transfer_type: transfer.transferType,
        source_location: transfer.sourceLocation,
        destination_location: transfer.destinationLocation,
        quantity: transfer.quantity,
        unit_type: transfer.unitType,
        reason: currentValidation.message,
        supervisor_review_required: true,
        applies_stock_directly: false,
        official_inventory_applies_after_sync: true,
        ...linkedPayload,
      });
      createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_EXCEPTION_RECORDED, { source_module: "Transfers", status: "review_required", item_name: transfer.itemName, transfer_id: transfer.transferId, transfer_type: transfer.transferType, reason: currentValidation.message, supervisor_review_required: true, applies_stock_directly: false, ...linkedPayload });
      createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_QUEUED_FOR_SYNC, { source_module: "Transfers", status: "review_required", item_name: transfer.itemName, transfer_id: transfer.transferId, transfer_type: transfer.transferType, applies_stock_directly: false, supervisor_review_required: true });
      setDoneState({ title: "Transfer Held for Supervisor Review", helper: currentValidation.message, event: reviewEvent });
      toast({ description: "Transfer held for supervisor review", duration: 1500 });
      return;
    }

    const event = createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_COMPLETED, {
      source_module: "Transfers",
      status: "queued_for_sync",
      item_name: transfer.itemName,
      transfer_id: transfer.transferId,
      transfer_type: transfer.transferType,
      source_location: transfer.sourceLocation,
      source_location_label: transfer.sourceLocationLabel,
      destination_location: transfer.destinationLocation,
      destination_location_label: transfer.destinationLocationLabel,
      quantity: transfer.quantity,
      unit_type: transfer.unitType,
      reason: draft.reason || transfer.reason,
      sku: transfer.sku,
      barcode: transfer.barcode,
      gtin: transfer.gtin,
      plu: transfer.plu,
      scale_code: transfer.scaleCode,
      batch_id: transfer.batchId,
      lot_id: transfer.lotId,
      applies_stock_directly: false,
      official_inventory_applies_after_sync: true,
      ...linkedPayload,
    });
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_QUEUED_FOR_SYNC, { source_module: "Transfers", status: "queued", item_name: transfer.itemName, transfer_id: transfer.transferId, transfer_type: transfer.transferType, applies_stock_directly: false });
    setDoneState({ title: "Transfer Queued", helper: "Transfer request queued. Official stock movement is applied by Invyra Inventory after sync.", event });
    toast({ description: "Transfer queued", duration: 1500 });
  };

  const reset = () => {
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_CANCELLED, { source_module: "Transfers", status: "cancelled", item_name: draft.item?.name || "Transfer cancelled" });
    setDraft(createTransferDraft());
    setDoneState(null);
    setStep(1);
  };

  const viewReason = () => {
    recordDecisionEvent(decision, "reason_viewed", { source_module: "Transfers", status: "reason_viewed" });
    toast({ description: decision.reasonText, duration: 2500 });
  };

  const rejectRecommendation = () => {
    const event = recordDecisionEvent(decision, "rejected", { source_module: "Transfers", status: "rejected", rejection_reason: "Operator rejected transfer recommendation" });
    setDoneState({ title: "Transfer Recommendation Rejected", helper: "No stock movement was applied. Rejection was queued as a decision event.", event });
    toast({ description: "Transfer recommendation rejected", duration: 1500 });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <PageHeader title="Transfers" subtitle="Stage L · Step-based transfer request" />
      <main ref={mainRef} data-scanops-scroll className="flex-1 px-4 py-4 pb-8 space-y-3 overflow-y-auto overflow-x-hidden">
        <Progress step={step} />

        {!doneState && step === 1 && (
          <StepCard title="Step 1: Transfer Type" helper="Choose the real-world stock movement. The handheld creates a request only.">
            <TouchSelect label="Transfer type" value={draft.transferType} onChange={selectTransferType} options={TRANSFER_TYPE_OPTIONS} placeholder="Select transfer type" />
            {reasonOptions.length > 0 && <TouchSelect label="Reason" value={draft.reason} onChange={selectReason} options={reasonOptions} placeholder="Select reason" />}
          </StepCard>
        )}

        {!doneState && step === 2 && (
          <StepCard title="Step 2: Source Location" helper="Select where the stock is moving from.">
            <TouchSelect label="Source location" value={draft.sourceLocation} onChange={selectSource} options={LOCATION_OPTIONS} placeholder="Select source" />
          </StepCard>
        )}

        {!doneState && step === 3 && (
          <StepCard title="Step 3: Scan / Enter Item" helper="Resolve PLU, GTIN/barcode, SKU, batch, and lot where available.">
            <ScanPlaceholder onSimulate={scanItem} />
            {draft.item && <ItemSummary item={draft.item} />}
          </StepCard>
        )}

        {!doneState && step === 4 && (
          <StepCard title="Step 4: Quantity / Weight" helper="Weighted PLU items can use decimal quantities.">
            <div className="flex items-center gap-3">
              <button onClick={() => adjustQuantity(draft.unitType === "kg" ? -0.5 : -1)} className="h-12 w-12 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center active:scale-[0.98]"><Minus className="w-4 h-4" /></button>
              <div className="flex-1 rounded-2xl bg-secondary/60 px-4 py-2.5 text-center min-w-0"><p className="text-2xl font-black text-foreground">{draft.quantity}</p><p className="text-xs text-muted-foreground">{draft.unitType || draft.item?.unitType || "each"}</p></div>
              <button onClick={() => adjustQuantity(draft.unitType === "kg" ? 0.5 : 1)} className="h-12 w-12 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center active:scale-[0.98]"><Plus className="w-4 h-4" /></button>
            </div>
          </StepCard>
        )}

        {!doneState && step === 5 && (
          <StepCard title="Step 5: Destination Location" helper="Select where the stock is moving to.">
            <TouchSelect label="Destination location" value={draft.destinationLocation} onChange={selectDestination} options={LOCATION_OPTIONS} placeholder="Select destination" />
          </StepCard>
        )}

        {!doneState && step === 6 && (
          <div className="space-y-3">
            <TransferReviewCard draft={draft} validation={validation} />
            <DecisionRecommendationCard decision={decision} onReject={rejectRecommendation} onMoreInfo={viewReason} />
          </div>
        )}

        {doneState && <DonePanel state={doneState} onReset={reset} onHome={() => navigate("/")} />}

        <div className="scanops-sticky-actions grid grid-cols-2 gap-3">
          {doneState ? (
            <>
              <button onClick={reset} className={BUTTON_PRIMARY}><RotateCw className="w-4 h-4" />New Transfer</button>
              <button onClick={() => navigate("/")} className={BUTTON_SECONDARY}><Home className="w-4 h-4" />Home</button>
            </>
          ) : (
            <>
              <button onClick={step === 1 ? reset : () => setStep((current) => Math.max(1, current - 1))} className={BUTTON_SECONDARY}>{step === 1 ? "Cancel" : "Back"}</button>
              {step < 6 ? (
                <button onClick={continueStep} className={BUTTON_PRIMARY}>Continue</button>
              ) : (
                <button onClick={confirmTransfer} className={BUTTON_PRIMARY}><ArrowLeftRight className="w-4 h-4" />Confirm Transfer</button>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Progress({ step }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-1">
        {STEPS.map((item) => (
          <div key={item.id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className={`h-2 w-full rounded-full ${item.id <= step ? "bg-primary" : "bg-secondary"}`} />
            <span className={`text-[10px] font-bold leading-tight ${item.id === step ? "text-foreground" : "text-muted-foreground"}`}>{item.id}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs font-bold text-muted-foreground">Step {step} of 6 · {STEPS.find((item) => item.id === step)?.title}</p>
    </section>
  );
}

function StepCard({ title, helper, children }) {
  return (
    <section className="scanops-compact-card space-y-3">
      <div>
        <h2 className="text-base font-black text-foreground">{title}</h2>
        <p className="mt-1 text-xs leading-snug text-muted-foreground">{helper}</p>
      </div>
      {children}
    </section>
  );
}

function ItemSummary({ item }) {
  return <section className="rounded-2xl bg-secondary/60 px-4 py-3 min-w-0"><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Resolved item</p><h3 className="text-sm font-bold text-foreground mt-1 break-words">{item.name}</h3><p className="text-xs text-muted-foreground mt-1 break-all">{item.sku || item.plu || item.barcode}</p><p className="text-xs text-muted-foreground mt-1 break-words">Batch: {item.batchId || "—"} · Lot: {item.lotId || "—"}</p></section>;
}

function DonePanel({ state, onReset, onHome }) {
  return (
    <section className="bg-accent/5 rounded-2xl border border-accent/20 p-5 text-center min-w-0">
      <CheckCircle2 className="w-10 h-10 text-accent mx-auto" />
      <h2 className="text-base font-bold text-foreground mt-3">{state.title}</h2>
      <p className="text-sm text-muted-foreground mt-1 break-words">{state.helper}</p>
      <p className="text-xs text-muted-foreground mt-2 break-words">Event: {state.event?.event_type || "—"}</p>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <button onClick={onReset} className={BUTTON_PRIMARY}><RotateCw className="w-4 h-4" />New Transfer</button>
        <button onClick={onHome} className={BUTTON_SECONDARY}><Home className="w-4 h-4" />Home</button>
      </div>
    </section>
  );
}
