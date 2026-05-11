import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import {
  DoneCard,
  EmptyState,
  InfoLine,
  ItemSummaryCard,
  MetricPill,
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
  buildShelfTicketRequest,
  clearWorkflowDraft,
  getCurrencySymbol,
  getCurrentPriceSnapshot,
  getOptionLabel,
  loadWorkflowDraft,
  normalizeShelfTicketRequestLine,
  saveShelfTicketRequest,
  saveWorkflowDraft,
  SHELF_TICKET_PAPER_SIZE_OPTIONS,
  SHELF_TICKET_REQUEST_REASON_OPTIONS,
  SHELF_TICKET_REQUEST_TYPE_OPTIONS,
  upsertShelfTicketRequestLine,
} from "../lib/scanOpsRequestLifecycle";

function formatMoney(currency, value) {
  if (value === null || value === undefined || value === "" || Number.isNaN(Number(value))) return "—";
  return `${currency}${Number(value).toFixed(2)}`;
}

function totalCopies(lines) {
  return lines.reduce((sum, line) => sum + Number(line.copies || 0), 0);
}

export default function ShelfTickets() {
  const location = useLocation();
  const taskParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const taskTicketType = taskParams.get("ticketType");
  const taskPaperSize = taskParams.get("paperSize");
  const taskReason = taskParams.get("reason");
  const savedDraft = useMemo(() => loadWorkflowDraft("shelf_tickets"), []);
  const [scanValue, setScanValue] = useState("");
  const [item, setItem] = useState(null);
  const [ticketType, setTicketType] = useState(() => SHELF_TICKET_REQUEST_TYPE_OPTIONS.some((option) => option.id === taskTicketType) ? taskTicketType : "standard_shelf_ticket");
  const [paperSize, setPaperSize] = useState(() => SHELF_TICKET_PAPER_SIZE_OPTIONS.some((option) => option.id === taskPaperSize) ? taskPaperSize : "small_shelf_edge");
  const [copies, setCopies] = useState(1);
  const [reason, setReason] = useState(() => SHELF_TICKET_REQUEST_REASON_OPTIONS.some((option) => option.id === taskReason) ? taskReason : "missing_ticket");
  const [notes, setNotes] = useState("");
  const [batch, setBatch] = useState(savedDraft?.items || []);
  const [view, setView] = useState("entry");
  const [submittedRequest, setSubmittedRequest] = useState(null);

  const currency = getCurrencySymbol(item);
  const currentPrice = getCurrentPriceSnapshot(item);
  const markdownTicketCount = useMemo(() => batch.filter((line) => line.ticketType === "markdown_ticket").length, [batch]);
  const itemCountLabel = `${batch.length} item${batch.length === 1 ? "" : "s"}`;

  useEffect(() => {
    if (view === "done") return;
    saveWorkflowDraft("shelf_tickets", { items: batch });
  }, [batch, view]);

  const scan = (value) => {
    const found = resolveInventoryIdentity(String(value || "").trim() || "930000000004") || resolveInventoryIdentity("930000000004");
    setItem(found);
    setTicketType("standard_shelf_ticket");
    setPaperSize("small_shelf_edge");
    setCopies(1);
    setReason("missing_ticket");
    setNotes("");
    setView("entry");
    setSubmittedRequest(null);
  };

  const addToBatch = () => {
    if (!item || !ticketType || !paperSize || !reason || copies <= 0) return;
    const line = normalizeShelfTicketRequestLine({ item, ticketType, paperSize, copies, reason, notes });
    setBatch((current) => upsertShelfTicketRequestLine(current, line));
    createScanOpsEvent(SCANOPS_EVENT_TYPES.SHELF_TICKET_ITEM_ADDED, {
      source_module: "Shelf Tickets",
      item_name: line.itemName,
      sku: line.sku,
      barcode: line.barcode,
      ticket_type: ticketType,
      ticket_type_label: getOptionLabel(SHELF_TICKET_REQUEST_TYPE_OPTIONS, ticketType),
      paper_size: paperSize,
      paper_size_label: getOptionLabel(SHELF_TICKET_PAPER_SIZE_OPTIONS, paperSize),
      copies: line.copies,
      reason,
      reason_label: getOptionLabel(SHELF_TICKET_REQUEST_REASON_OPTIONS, reason),
      print_claimed: false,
      applies_stock_directly: false,
      status: "draft_ticket_request_added",
    });
    setItem(null);
    setScanValue("");
    setNotes("");
  };

  const removeLine = (requestItemId) => {
    setBatch((current) => current.filter((line) => line.requestItemId !== requestItemId));
  };

  const submitTicketRequest = () => {
    if (!batch.length) return;
    const request = saveShelfTicketRequest(buildShelfTicketRequest({ items: batch }));
    createScanOpsEvent(SCANOPS_EVENT_TYPES.SHELF_TICKET_BATCH_SENT_TO_DESKTOP, {
      source_module: "Shelf Tickets",
      shelf_ticket_request_id: request.requestId,
      item_count: batch.length,
      copies: totalCopies(batch),
      markdown_ticket_count: markdownTicketCount,
      print_claimed: false,
      applies_stock_directly: false,
      status: request.status,
      official_inventory_prints_after_sync: true,
    });
    setSubmittedRequest(request);
    setView("done");
    setItem(null);
    setScanValue("");
    setBatch([]);
    clearWorkflowDraft("shelf_tickets");
  };

  const resetDraft = () => {
    setItem(null);
    setScanValue("");
    setBatch([]);
    setView("entry");
    setSubmittedRequest(null);
    clearWorkflowDraft("shelf_tickets");
  };

  return (
    <PageShell>
      <WorkflowHeader
        title="Shelf Tickets"
        subtitle={view === "review" ? "Review ticket request" : "Request only · Inventory prints later"}
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={scan}
        showSearch={view !== "done"}
      />
      <WorkflowMain>
        {view === "done" && submittedRequest ? (
          <DoneCard
            title="Shelf ticket request submitted"
            helper="No ticket has been printed. Inventory owns printer routing and print status."
            rows={[
              { label: "Request", value: submittedRequest.requestId },
              { label: "Status", value: submittedRequest.status === "sync_pending" ? "Sync pending" : "Submitted" },
              { label: "Items", value: String(submittedRequest.items.length) },
              { label: "Copies", value: String(totalCopies(submittedRequest.items)) },
              { label: "Printer mutation", value: "No direct print from handheld" },
            ]}
          />
        ) : view === "review" ? (
          <>
            <SectionCard className="space-y-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Review Shelf Ticket Request</p>
                <h2 className="mt-1 text-lg font-black text-foreground">{itemCountLabel} ready</h2>
              </div>
              <div className="space-y-2 rounded-2xl bg-secondary/50 p-3">
                <InfoLine label="Copies" value={String(totalCopies(batch))} />
                <InfoLine label="Markdown tickets" value={String(markdownTicketCount)} />
                <InfoLine label="Printer action" value="No handheld print" />
              </div>
              <div className="space-y-2">
                {batch.map((line) => (
                  <div key={line.requestItemId} className="rounded-2xl border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-black text-foreground">{line.itemName}</p>
                        <p className="mt-1 break-words text-xs font-bold text-muted-foreground">
                          {getOptionLabel(SHELF_TICKET_REQUEST_TYPE_OPTIONS, line.ticketType)} · {getOptionLabel(SHELF_TICKET_PAPER_SIZE_OPTIONS, line.paperSize)}
                        </p>
                        <p className="mt-1 break-words text-xs font-bold text-muted-foreground">
                          Copies: {line.copies} · {getOptionLabel(SHELF_TICKET_REQUEST_REASON_OPTIONS, line.reason)}
                        </p>
                        {line.notes && <p className="mt-1 break-words text-xs font-semibold text-muted-foreground">Note: {line.notes}</p>}
                      </div>
                      <button type="button" onClick={() => removeLine(line.requestItemId)} className="shrink-0 rounded-xl bg-secondary px-3 py-2 text-xs font-black text-secondary-foreground">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
            <StickyActions leftLabel="Back" rightLabel="Submit Ticket Request" onLeft={() => setView("entry")} onRight={submitTicketRequest} rightDisabled={!batch.length} />
          </>
        ) : (
          <>
            {item ? (
              <>
                <ItemSummaryCard item={item}>
                  <div className="grid grid-cols-2 gap-2">
                    <MetricPill label="Current price" value={formatMoney(currency, currentPrice)} />
                    <MetricPill label="Shelf" value={item.shelfLocation || item.location || item.shelf || "—"} />
                  </div>
                </ItemSummaryCard>
                <SectionCard className="space-y-3">
                  <TouchSelect label="Ticket type" value={ticketType} onChange={setTicketType} options={SHELF_TICKET_REQUEST_TYPE_OPTIONS} />
                  <TouchSelect label="Paper size" value={paperSize} onChange={setPaperSize} options={SHELF_TICKET_PAPER_SIZE_OPTIONS} />
                  <QuantityStepper label="Copies" value={copies} onChange={setCopies} unit="copies" min={1} />
                  <TouchSelect label="Reason" value={reason} onChange={setReason} options={SHELF_TICKET_REQUEST_REASON_OPTIONS} />
                  <TextInputField label="Notes" value={notes} onChange={setNotes} placeholder="Optional note..." />
                  <p className="rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-bold text-muted-foreground">
                    Ticket request only. Inventory handles template selection, printer routing, and print confirmation.
                  </p>
                </SectionCard>
              </>
            ) : (
              <EmptyState title="No item selected." />
            )}

            <SectionCard>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Current ticket batch</p>
                  <p className="mt-1 text-2xl font-black text-foreground">{itemCountLabel}</p>
                </div>
                {batch.length > 0 && (
                  <button type="button" onClick={resetDraft} className="rounded-xl bg-secondary px-3 py-2 text-xs font-black text-secondary-foreground">
                    Clear
                  </button>
                )}
              </div>
              {batch.length ? (
                <div className="mt-3 space-y-2">
                  {batch.map((line) => (
                    <div key={line.requestItemId} className="rounded-2xl bg-secondary/60 p-3">
                      <p className="break-words text-sm font-black text-foreground">{line.itemName}</p>
                      <p className="mt-1 break-words text-xs font-bold text-muted-foreground">
                        {getOptionLabel(SHELF_TICKET_REQUEST_TYPE_OPTIONS, line.ticketType)} · {getOptionLabel(SHELF_TICKET_PAPER_SIZE_OPTIONS, line.paperSize)} · Copies: {line.copies}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-2xl bg-secondary/50 px-3 py-2 text-sm font-bold text-muted-foreground">Batch is empty.</p>
              )}
            </SectionCard>
            <StickyActions
              leftLabel="Review"
              rightLabel="Add Ticket"
              onLeft={() => setView("review")}
              onRight={addToBatch}
              leftDisabled={!batch.length}
              rightDisabled={!item || !ticketType || !paperSize || !reason || copies <= 0}
            />
          </>
        )}
      </WorkflowMain>
    </PageShell>
  );
}
