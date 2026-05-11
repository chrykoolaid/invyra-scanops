import React, { useState } from "react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import { BatchList, EmptyState, ItemSummaryCard, PageShell, SectionCard, StickyActions, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { SHELF_TICKET_REASON_OPTIONS, SHELF_TICKET_TYPE_OPTIONS } from "../lib/scanOpsShelfTicketRules";
import { makeWorkflowBatchItem, removeWorkflowBatchItem, upsertWorkflowBatchItem } from "../lib/scanOpsWorkflowBatch";

export default function ShelfTickets() {
  const [scanValue, setScanValue] = useState("");
  const [ticketType, setTicketType] = useState(SHELF_TICKET_TYPE_OPTIONS[0]?.id || "promo");
  const [ticketReason, setTicketReason] = useState(SHELF_TICKET_REASON_OPTIONS[0]?.id || "missing_damaged");
  const [item, setItem] = useState(null);
  const [batch, setBatch] = useState([]);
  const [sent, setSent] = useState(false);

  const typeLabel = SHELF_TICKET_TYPE_OPTIONS.find((option) => option.id === ticketType)?.label || ticketType;
  const reasonLabel = SHELF_TICKET_REASON_OPTIONS.find((option) => option.id === ticketReason)?.label || ticketReason;

  const scan = (value) => {
    const found = resolveInventoryIdentity(String(value || "").trim() || "930000000004") || resolveInventoryIdentity("930000000004");
    setItem(found);
    setSent(false);
  };

  const addToBatch = () => {
    if (!item) return;
    const line = makeWorkflowBatchItem({ workflowType: "shelf_ticket", item, ticketType: typeLabel, ticketReason: reasonLabel });
    setBatch((current) => upsertWorkflowBatchItem(current, line));
    createScanOpsEvent(SCANOPS_EVENT_TYPES.SHELF_TICKET_ITEM_ADDED, {
      source_module: "Shelf Tickets",
      item_name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      ticket_type: ticketType,
      ticket_reason: ticketReason,
      applies_stock_directly: false,
      print_claimed: false,
      status: "added_to_batch",
    });
    setItem(null);
    setScanValue("");
  };

  const send = () => {
    if (!batch.length) return;
    createScanOpsEvent(SCANOPS_EVENT_TYPES.SHELF_TICKET_BATCH_SENT_TO_DESKTOP, {
      source_module: "Shelf Tickets",
      item_count: batch.length,
      ticket_type: ticketType,
      ticket_reason: ticketReason,
      print_claimed: false,
      applies_stock_directly: false,
      status: "sent_to_desktop_request",
    });
    setSent(true);
  };

  return (
    <PageShell>
      <WorkflowHeader title="Shelf Tickets" subtitle="Create desktop ticket request batch" scanValue={scanValue} onScanValueChange={setScanValue} onScan={scan} />
      <WorkflowMain>
        <SectionCard className="space-y-3">
          <TouchSelect label="Ticket type" value={ticketType} onChange={setTicketType} options={SHELF_TICKET_TYPE_OPTIONS} />
          <TouchSelect label="Ticket reason" value={ticketReason} onChange={setTicketReason} options={SHELF_TICKET_REASON_OPTIONS} />
        </SectionCard>
        {item ? <>
          <ItemSummaryCard item={item}>
            <p className="text-xs font-bold text-muted-foreground">Ticket: {typeLabel} · {reasonLabel}</p>
          </ItemSummaryCard>
          <SectionCard>
            <button type="button" onClick={addToBatch} className="w-full min-h-12 rounded-2xl bg-primary text-sm font-black text-primary-foreground active:scale-[0.98]">Add Item to Batch</button>
          </SectionCard>
        </> : <EmptyState title="No item selected." />}
        <BatchList
          title="Current ticket batch"
          items={batch}
          emptyText="Batch is empty."
          renderMeta={(line) => `${line.ticketType} · ${line.ticketReason}`}
          onRemove={(id) => setBatch((current) => removeWorkflowBatchItem(current, id))}
        />
        {sent && <SectionCard className="border-primary/20 bg-primary/5"><p className="text-sm font-black text-foreground">Sent to desktop request queue</p><p className="mt-1 text-xs font-bold text-muted-foreground">{batch.length} item request · no handheld print</p></SectionCard>}
        <StickyActions leftLabel="Clear" rightLabel="Send to Desktop" onLeft={() => { setBatch([]); setItem(null); setSent(false); }} onRight={send} rightDisabled={!batch.length} />
      </WorkflowMain>
    </PageShell>
  );
}
