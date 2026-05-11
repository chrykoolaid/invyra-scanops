import React, { useState } from "react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import { DoneCard, ItemSummaryCard, PageShell, ReadyCard, SectionCard, StickyActions, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { SHELF_TICKET_REASON_OPTIONS, SHELF_TICKET_TYPE_OPTIONS } from "../lib/scanOpsShelfTicketRules";

export default function ShelfTickets() {
  const [scanValue, setScanValue] = useState("");
  const [ticketType, setTicketType] = useState(SHELF_TICKET_TYPE_OPTIONS[0]?.id || "promo");
  const [ticketReason, setTicketReason] = useState(SHELF_TICKET_REASON_OPTIONS[0]?.id || "missing_damaged");
  const [item, setItem] = useState(null);
  const [batch, setBatch] = useState([]);
  const [done, setDone] = useState(false);

  const typeLabel = SHELF_TICKET_TYPE_OPTIONS.find((option) => option.id === ticketType)?.label || ticketType;
  const reasonLabel = SHELF_TICKET_REASON_OPTIONS.find((option) => option.id === ticketReason)?.label || ticketReason;

  const scan = (value) => {
    const found = resolveInventoryIdentity(String(value || "").trim() || "930000000004") || resolveInventoryIdentity("930000000004");
    setItem(found);
    setDone(false);
  };

  const addToBatch = () => {
    if (!item) return;
    const line = { id: `${item.sku || item.barcode}-${Date.now()}`, item, ticketType, ticketReason };
    setBatch((current) => [line, ...current]);
    createScanOpsEvent(SCANOPS_EVENT_TYPES.SHELF_TICKET_ITEM_ADDED, {
      source_module: "Shelf Tickets",
      item_name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      ticket_type: ticketType,
      ticket_reason: ticketReason,
      status: "added_to_batch",
    });
    setItem(null);
  };

  const send = () => {
    if (!batch.length) return;
    createScanOpsEvent(SCANOPS_EVENT_TYPES.SHELF_TICKET_BATCH_SENT_TO_DESKTOP, {
      source_module: "Shelf Tickets",
      item_count: batch.length,
      ticket_type: ticketType,
      ticket_reason: ticketReason,
      print_claimed: false,
      status: "sent_to_desktop_request",
    });
    setDone(true);
  };

  return (
    <PageShell>
      <WorkflowHeader title="Shelf Tickets" subtitle="Create desktop ticket request batch" scanValue={scanValue} onScanValueChange={setScanValue} onScan={scan} />
      <WorkflowMain>
        <SectionCard className="space-y-3">
          <TouchSelect label="Ticket type" value={ticketType} onChange={setTicketType} options={SHELF_TICKET_TYPE_OPTIONS} />
          <TouchSelect label="Ticket reason" value={ticketReason} onChange={setTicketReason} options={SHELF_TICKET_REASON_OPTIONS} />
        </SectionCard>
        {!item && !batch.length && <ReadyCard title="Ready to scan" helper="Use hardware trigger or tap search above. Desktop request only." />}
        {item && <>
          <ItemSummaryCard item={item}>
            <p className="text-xs font-bold text-muted-foreground">Ticket: {typeLabel} · {reasonLabel}</p>
          </ItemSummaryCard>
          <SectionCard>
            <button type="button" onClick={addToBatch} className="w-full min-h-12 rounded-2xl bg-primary text-sm font-black text-primary-foreground active:scale-[0.98]">Add Item to Batch</button>
          </SectionCard>
        </>}
        <SectionCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Current batch</p>
              <p className="mt-1 text-2xl font-black text-foreground">{batch.length} items</p>
            </div>
            <p className="text-right text-xs font-bold text-muted-foreground">Desktop request only<br />No direct print</p>
          </div>
          {batch.length > 0 && <div className="mt-3 space-y-2">{batch.slice(0, 3).map((line) => <div key={line.id} className="rounded-2xl bg-secondary/60 p-3 text-sm font-bold text-foreground">{line.item.name}</div>)}</div>}
        </SectionCard>
        {done && <DoneCard title="Sent to Desktop" helper="Shelf ticket request batch was queued for desktop processing. The handheld did not print." rows={[{ label: "Items", value: String(batch.length) }, { label: "Type", value: typeLabel }]} />}
        <StickyActions leftLabel="Clear" rightLabel="Send to Desktop" onLeft={() => { setBatch([]); setItem(null); setDone(false); }} onRight={send} rightDisabled={!batch.length} />
      </WorkflowMain>
    </PageShell>
  );
}
