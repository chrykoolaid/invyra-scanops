import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, CheckCircle2, ClipboardCheck, Home, MapPin, Minus, Package, Plus, RotateCw, ScanBarcode } from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import ScanPlaceholder from "../components/scanner/ScanPlaceholder";
import DecisionRecommendationCard from "../components/scanner/DecisionRecommendationCard";
import TransferStepCard from "../components/scanner/TransferStepCard";
import TransferReviewCard from "../components/scanner/TransferReviewCard";
import { useToast } from "@/components/ui/use-toast";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { buildDecisionLinkedPayload, createDecisionRecommendation, recordDecisionEvent } from "../lib/scanOpsDecisionEngine";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { createTransferDraft, buildQueuedTransfer, getTransferValidation } from "../lib/scanOpsTransfers";
import { LOCATION_OPTIONS, TRANSFER_REASON_OPTIONS, TRANSFER_TYPE_OPTIONS, getLocationLabel, getReasonLabel, getTransferTypeLabel } from "../lib/scanOpsTransferRules";
import { TRANSFER_SCAN_SEQUENCE } from "../lib/scanOpsTransferFixtures";

const BUTTON_PRIMARY = "w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40";
const BUTTON_SECONDARY = "w-full py-4 rounded-2xl bg-secondary text-secondary-foreground font-bold text-sm active:scale-[0.98] active:bg-border transition-all flex items-center justify-center gap-2";
const SOFT_BUTTON = "w-full rounded-2xl px-3 py-4 text-sm font-bold active:scale-[0.98] transition-all text-center leading-snug min-h-[62px]";

export default function Transfers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [draft, setDraft] = useState(() => createTransferDraft());
  const [scanIndex, setScanIndex] = useState(0);
  const [doneState, setDoneState] = useState(null);
  const startRecorded = useRef(false);
  const validation = useMemo(() => getTransferValidation(draft), [draft]);
  const decision = useMemo(() => createDecisionRecommendation({ workflow: "transfer", item: draft.item, context: { transferType: draft.transferType, sourceLocation: draft.sourceLocation, destinationLocation: draft.destinationLocation, quantity: draft.quantity, validation } }), [draft, validation]);
  const reasonOptions = TRANSFER_REASON_OPTIONS[draft.transferType] || [];

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
    setDoneState({ title: "Transfer Queued", helper: "Transfer event queued. Official stock movement is applied by Invyra Inventory after sync.", event });
    toast({ description: "Transfer queued", duration: 1500 });
  };

  const reset = () => {
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_CANCELLED, { source_module: "Transfers", status: "cancelled", item_name: draft.item?.name || "Transfer cancelled" });
    setDraft(createTransferDraft());
    setDoneState(null);
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
      <PageHeader title="Transfers" subtitle="Stage I.2 · Scan-first stock movement requests" />
      <main className="flex-1 px-4 py-5 pb-8 space-y-4 overflow-y-auto overflow-x-hidden">
        <TransferStepCard title="Transfer type" helper="Choose the real-world movement. Official stock remains unchanged until Inventory Sync applies it." icon={ArrowLeftRight}>
          <div className="grid grid-cols-2 gap-2">
            {TRANSFER_TYPE_OPTIONS.map((option) => <button key={option.id} type="button" onClick={() => selectTransferType(option.id)} className={`${SOFT_BUTTON} ${draft.transferType === option.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground active:bg-border"}`}><span className="block">{option.label}</span><span className="block text-[11px] font-semibold opacity-80 mt-1">{option.helper}</span></button>)}
          </div>
        </TransferStepCard>
        {reasonOptions.length > 0 && <TransferStepCard title="Reason" helper="Required for damaged, expiry, freshness, and promo display transfers." icon={ClipboardCheck}>
          <div className="grid grid-cols-2 gap-2">
            {reasonOptions.map((reason) => <button key={reason.id} type="button" onClick={() => selectReason(reason.id)} className={`${SOFT_BUTTON} ${draft.reason === reason.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground active:bg-border"}`}>{reason.label}</button>)}
          </div>
        </TransferStepCard>}
        <TransferStepCard title="Source location" helper="Scan or select where the stock is moving from." icon={MapPin}>
          <LocationButtons selected={draft.sourceLocation} onSelect={selectSource} />
        </TransferStepCard>
        <TransferStepCard title="Item" helper="Resolve PLU, GTIN/barcode, SKU, batch, and lot where available." icon={Package}>
          <ScanPlaceholder onSimulate={scanItem} label="Scan item barcode, PLU, GTIN, or SKU" />
          {draft.item && <ItemSummary item={draft.item} />}
        </TransferStepCard>
        <TransferStepCard title="Quantity / weight" helper="Weighted PLU items can use decimal quantities." icon={ScanBarcode}>
          <div className="flex items-center gap-3">
            <button onClick={() => adjustQuantity(draft.unitType === "kg" ? -0.5 : -1)} className="w-14 h-14 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center active:scale-[0.98]"><Minus className="w-5 h-5" /></button>
            <div className="flex-1 rounded-2xl bg-secondary/60 px-4 py-3 text-center min-w-0"><p className="text-2xl font-black text-foreground">{draft.quantity}</p><p className="text-xs text-muted-foreground">{draft.unitType || draft.item?.unitType || "each"}</p></div>
            <button onClick={() => adjustQuantity(draft.unitType === "kg" ? 0.5 : 1)} className="w-14 h-14 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center active:scale-[0.98]"><Plus className="w-5 h-5" /></button>
          </div>
        </TransferStepCard>
        <TransferStepCard title="Destination location" helper="Scan or select where the stock is moving to." icon={MapPin}>
          <LocationButtons selected={draft.destinationLocation} onSelect={selectDestination} />
        </TransferStepCard>
        <DecisionRecommendationCard decision={decision} onReject={rejectRecommendation} onMoreInfo={viewReason} />
        <TransferReviewCard draft={draft} validation={validation} />
        {doneState && <DonePanel state={doneState} onReset={reset} onHome={() => navigate("/")} />}
        <div className="space-y-3">
          <button onClick={confirmTransfer} className={BUTTON_PRIMARY}><ArrowLeftRight className="w-4 h-4" />Confirm Transfer</button>
          <button onClick={reset} className={BUTTON_SECONDARY}><RotateCw className="w-4 h-4" />Reset Transfer</button>
        </div>
      </main>
    </div>
  );
}

function LocationButtons({ selected, onSelect }) {
  return <div className="grid grid-cols-2 gap-2">{LOCATION_OPTIONS.map((location) => <button key={location.id} type="button" onClick={() => onSelect(location.id)} className={`${SOFT_BUTTON} ${selected === location.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground active:bg-border"}`}>{location.label}</button>)}</div>;
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
