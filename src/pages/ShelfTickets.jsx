import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Home, Printer, RotateCw, ScanBarcode, Trash2 } from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import ScanPlaceholder from "../components/scanner/ScanPlaceholder";
import ShelfTicketSizeSelector from "../components/scanner/ShelfTicketSizeSelector";
import ShelfTicketBatchCard from "../components/scanner/ShelfTicketBatchCard";
import { useToast } from "@/components/ui/use-toast";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { createDecisionRecommendation, recordDecisionEvent } from "../lib/scanOpsDecisionEngine";
import { SHELF_TICKET_SCAN_SEQUENCE } from "../lib/scanOpsShelfTicketFixtures";
import { getShelfTicketReasonLabel, SHELF_TICKET_REASONS, validateShelfTicketBatch } from "../lib/scanOpsShelfTicketRules";
import { addItemToShelfTicketBatch, getCurrentShelfTicketBatch, markShelfTicketBatchSent, removeShelfTicketLine, resetShelfTicketBatch, saveCurrentShelfTicketBatch } from "../lib/scanOpsShelfTickets";

const BUTTON_PRIMARY = "w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40";
const BUTTON_SECONDARY = "w-full py-4 rounded-2xl bg-secondary text-secondary-foreground font-bold text-sm active:scale-[0.98] active:bg-border transition-all flex items-center justify-center gap-2";
const REASON_BUTTON = "w-full rounded-2xl px-3 py-4 text-sm font-bold active:scale-[0.98] transition-all text-center leading-snug min-h-[58px]";
const REASONS = [
  SHELF_TICKET_REASONS.MISSING_OR_DAMAGED,
  SHELF_TICKET_REASONS.PRICE_CHANGE,
  SHELF_TICKET_REASONS.PROMOTION,
  SHELF_TICKET_REASONS.CLEARANCE,
  SHELF_TICKET_REASONS.SHELF_LOCATION_CORRECTION,
  SHELF_TICKET_REASONS.EXPIRY_OR_FRESHNESS_REVIEW,
];

export default function ShelfTickets() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [batch, setBatch] = useState(() => getCurrentShelfTicketBatch());
  const [ticketType, setTicketType] = useState(batch.defaultTicketType);
  const [ticketReason, setTicketReason] = useState(batch.defaultTicketReason);
  const [scanIndex, setScanIndex] = useState(0);
  const [doneState, setDoneState] = useState(null);

  const refreshBatch = (next) => {
    setBatch(next);
    setDoneState(null);
  };

  const updateTicketType = (nextType) => {
    setTicketType(nextType);
    const saved = saveCurrentShelfTicketBatch({ ...batch, defaultTicketType: nextType, defaultTicketReason: ticketReason });
    setBatch(saved);
    createScanOpsEvent(SCANOPS_EVENT_TYPES.SHELF_TICKET_SIZE_SELECTED, { source_module: "Shelf Tickets", status: "selected", ticket_type: nextType, item_name: "Shelf ticket type selected" });
  };

  const updateTicketReason = (nextReason) => {
    setTicketReason(nextReason);
    setBatch(saveCurrentShelfTicketBatch({ ...batch, defaultTicketType: ticketType, defaultTicketReason: nextReason }));
  };

  const simulateScan = () => {
    const input = SHELF_TICKET_SCAN_SEQUENCE[scanIndex % SHELF_TICKET_SCAN_SEQUENCE.length];
    const item = resolveInventoryIdentity(input);
    if (!item) {
      toast({ description: "Item could not be resolved", duration: 1500 });
      return;
    }
    const nextBatch = addItemToShelfTicketBatch(batch, item, ticketType, ticketReason);
    setBatch(nextBatch);
    setScanIndex(scanIndex + 1);
    const decision = createDecisionRecommendation({ workflow: "shelf_tickets", item, context: { ticketType, ticketReason } });
    recordDecisionEvent(decision, "generated", { source_module: "Shelf Tickets", status: "generated" });
    createScanOpsEvent(SCANOPS_EVENT_TYPES.SHELF_TICKET_ITEM_SCANNED, {
      source_module: "Shelf Tickets",
      status: "scanned",
      ticket_batch_id: nextBatch.ticketBatchId,
      ticket_type: ticketType,
      ticket_reason: ticketReason,
      sku: item.sku,
      barcode: item.barcode,
      gtin: item.gtin,
      plu: item.plu,
      scale_code: item.scaleCode,
      internal_item_id: item.internalItemId,
      item_name: item.name,
    });
    createScanOpsEvent(SCANOPS_EVENT_TYPES.SHELF_TICKET_ITEM_ADDED, {
      source_module: "Shelf Tickets",
      status: "added_to_batch",
      ticket_batch_id: nextBatch.ticketBatchId,
      ticket_type: ticketType,
      ticket_reason: ticketReason,
      item_count: nextBatch.lines.length,
      sku: item.sku,
      barcode: item.barcode,
      gtin: item.gtin,
      plu: item.plu,
      scale_code: item.scaleCode,
      internal_item_id: item.internalItemId,
      item_name: item.name,
    });
    toast({ description: `${item.name} added to shelf ticket batch`, duration: 1500 });
  };

  const removeLine = (ticketLineId) => {
    const removed = batch.lines?.find((line) => line.ticketLineId === ticketLineId);
    const next = removeShelfTicketLine(batch, ticketLineId);
    setBatch(next);
    createScanOpsEvent(SCANOPS_EVENT_TYPES.SHELF_TICKET_ITEM_REMOVED, {
      source_module: "Shelf Tickets",
      status: "removed",
      ticket_batch_id: batch.ticketBatchId,
      ticket_line_id: ticketLineId,
      item_name: removed?.description || "Shelf ticket item removed",
    });
    toast({ description: "Item removed from batch", duration: 1500 });
  };

  const sendToDesktop = () => {
    const validation = validateShelfTicketBatch(batch);
    if (!validation.ok) {
      toast({ description: validation.message, duration: 1500 });
      return;
    }
    const result = markShelfTicketBatchSent(batch);
    setBatch(result.batch);
    const summary = `Shelf ticket batch ${result.batch.ticketBatchId} · ${result.batch.lines.length} item${result.batch.lines.length === 1 ? "" : "s"}`;
    const event = createScanOpsEvent(SCANOPS_EVENT_TYPES.SHELF_TICKET_BATCH_SENT_TO_DESKTOP, {
      source_module: "Shelf Tickets",
      status: "queued_for_desktop",
      item_name: summary,
      ticket_batch_id: result.batch.ticketBatchId,
      item_count: result.batch.lines.length,
      sync_target: "DESKTOP_TICKET_QUEUE",
      no_fake_printing: true,
      desktop_printing_deferred: true,
      lines: result.batch.lines,
    });
    createScanOpsEvent(SCANOPS_EVENT_TYPES.SHELF_TICKET_BATCH_QUEUED_FOR_SYNC, {
      source_module: "Shelf Tickets",
      status: "queued_for_sync",
      item_name: summary,
      ticket_batch_id: result.batch.ticketBatchId,
      item_count: result.batch.lines.length,
      sync_target: "DESKTOP_TICKET_QUEUE",
    });
    setDoneState({ title: "Sent to Desktop Queue", helper: "The shelf ticket batch was queued for desktop preview/printing. Stage I does not fake printed output.", event });
    toast({ description: "Shelf ticket batch queued", duration: 1500 });
  };

  const clearBatch = () => {
    createScanOpsEvent(SCANOPS_EVENT_TYPES.SHELF_TICKET_BATCH_CANCELLED, { source_module: "Shelf Tickets", status: "cancelled", ticket_batch_id: batch.ticketBatchId, item_name: "Shelf ticket batch cancelled" });
    const next = resetShelfTicketBatch(ticketType, ticketReason);
    refreshBatch(next);
    toast({ description: "Batch cleared", duration: 1500 });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <PageHeader title="Shelf Tickets" subtitle="Stage I.1 · Paper ticket batch requests" />
      <main className="flex-1 px-4 py-5 pb-8 space-y-4 overflow-y-auto overflow-x-hidden">
        <section className="bg-card rounded-2xl border border-border p-5 min-w-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Printer className="w-5 h-5" /></div>
            <div className="min-w-0">
              <h2 className="font-bold text-foreground">Create paper shelf ticket batch</h2>
              <p className="text-sm text-muted-foreground mt-1 break-words">Select the ticket type, scan items, then send the batch to the desktop ticket queue. No real printing is claimed in Stage I.</p>
            </div>
          </div>
        </section>
        <ShelfTicketSizeSelector value={ticketType} onChange={updateTicketType} />
        <section className="bg-card rounded-2xl border border-border p-4 space-y-3 min-w-0">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ticket reason</p>
          <div className="grid grid-cols-2 gap-2">
            {REASONS.map((reason) => <button key={reason} type="button" onClick={() => updateTicketReason(reason)} className={`${REASON_BUTTON} ${ticketReason === reason ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground active:bg-border"}`}>{getShelfTicketReasonLabel(reason)}</button>)}
          </div>
        </section>
        <ScanPlaceholder onSimulate={simulateScan} label="Scan product barcode, PLU, GTIN, or SKU" />
        <ShelfTicketBatchCard batch={batch} onRemove={removeLine} onSend={sendToDesktop} />
        {doneState && <DonePanel state={doneState} onNewBatch={clearBatch} onHome={() => navigate("/")} />}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={clearBatch} className={BUTTON_SECONDARY}><Trash2 className="w-4 h-4" />Clear Batch</button>
          <button onClick={() => setBatch(getCurrentShelfTicketBatch())} className={BUTTON_SECONDARY}><RotateCw className="w-4 h-4" />Refresh</button>
        </div>
      </main>
    </div>
  );
}

function DonePanel({ state, onNewBatch, onHome }) {
  return (
    <section className="bg-accent/5 rounded-2xl border border-accent/20 p-5 text-center min-w-0">
      <CheckCircle2 className="w-10 h-10 text-accent mx-auto" />
      <h2 className="text-base font-bold text-foreground mt-3">{state.title}</h2>
      <p className="text-sm text-muted-foreground mt-1 break-words">{state.helper}</p>
      <p className="text-xs text-muted-foreground mt-2 break-words">Event: {state.event?.event_type || "—"}</p>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <button onClick={onNewBatch} className={BUTTON_PRIMARY}><ScanBarcode className="w-4 h-4" />New Batch</button>
        <button onClick={onHome} className={BUTTON_SECONDARY}><Home className="w-4 h-4" />Home</button>
      </div>
    </section>
  );
}
