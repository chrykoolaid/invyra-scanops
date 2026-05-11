import React, { useEffect, useMemo, useState } from "react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import {
  DoneCard,
  EmptyState,
  InfoLine,
  ItemSummaryCard,
  MetricPill,
  PageShell,
  SectionCard,
  StickyActions,
  TextInputField,
  WorkflowMain,
} from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import {
  buildMarkdownRequest,
  clearWorkflowDraft,
  getCurrencySymbol,
  getCurrentPriceSnapshot,
  getOptionLabel,
  loadWorkflowDraft,
  MARKDOWN_REASON_OPTIONS,
  MARKDOWN_TYPE_OPTIONS,
  normalizeMarkdownRequestLine,
  saveMarkdownRequest,
  saveWorkflowDraft,
  upsertMarkdownRequestLine,
} from "../lib/scanOpsRequestLifecycle";

function formatMoney(currency, value) {
  if (value === null || value === undefined || value === "" || Number.isNaN(Number(value))) return "—";
  return `${currency}${Number(value).toFixed(2)}`;
}

function getRequestedSummary(line) {
  const currency = line.currency || "₱";
  if (line.markdownType === "fixed_new_price") return `${formatMoney(currency, line.currentPrice)} → ${formatMoney(currency, line.requestedPrice)}`;
  if (line.markdownType === "percentage_discount") return `${formatMoney(currency, line.currentPrice)} · ${line.requestedPercentOff || 0}% off`;
  if (line.markdownType === "amount_off") return `${formatMoney(currency, line.currentPrice)} · ${formatMoney(currency, line.requestedAmountOff)} off`;
  if (line.markdownType === "clearance_ticket_only") return "Clearance ticket only";
  return "Manager review only";
}

function defaultRequestedPrice(currentPrice) {
  if (!Number.isFinite(Number(currentPrice))) return "";
  return String(Math.max(0, Math.round(Number(currentPrice) * 0.75)));
}

export default function Markdowns() {
  const savedDraft = useMemo(() => loadWorkflowDraft("markdown"), []);
  const [scanValue, setScanValue] = useState("");
  const [item, setItem] = useState(null);
  const [reason, setReason] = useState("short_dated");
  const [markdownType, setMarkdownType] = useState("fixed_new_price");
  const [requestedPrice, setRequestedPrice] = useState("");
  const [requestedPercentOff, setRequestedPercentOff] = useState("25");
  const [requestedAmountOff, setRequestedAmountOff] = useState("20");
  const [ticketRequired, setTicketRequired] = useState(true);
  const [notes, setNotes] = useState("");
  const [batch, setBatch] = useState(savedDraft?.items || []);
  const [view, setView] = useState("entry");
  const [submittedRequest, setSubmittedRequest] = useState(null);

  const currentPrice = getCurrentPriceSnapshot(item);
  const currency = getCurrencySymbol(item);
  const ticketCount = useMemo(() => batch.filter((line) => line.ticketRequired).length, [batch]);
  const itemCountLabel = `${batch.length} item${batch.length === 1 ? "" : "s"}`;

  useEffect(() => {
    if (view === "done") return;
    saveWorkflowDraft("markdown", { items: batch });
  }, [batch, view]);

  const scan = (value) => {
    const found = resolveInventoryIdentity(String(value || "").trim() || "930000000004") || resolveInventoryIdentity("930000000004");
    const price = getCurrentPriceSnapshot(found);
    setItem(found);
    setReason(found?.markdownEligible ? "short_dated" : "manager_instruction");
    setMarkdownType("fixed_new_price");
    setRequestedPrice(defaultRequestedPrice(price));
    setRequestedPercentOff("25");
    setRequestedAmountOff("20");
    setTicketRequired(true);
    setNotes("");
    setView("entry");
    setSubmittedRequest(null);
  };

  const requiresValue = ["fixed_new_price", "percentage_discount", "amount_off"].includes(markdownType);
  const valueReady =
    markdownType === "fixed_new_price" ? Number(requestedPrice) > 0 :
    markdownType === "percentage_discount" ? Number(requestedPercentOff) > 0 :
    markdownType === "amount_off" ? Number(requestedAmountOff) > 0 :
    true;

  const addMarkdown = () => {
    if (!item || !reason || !markdownType || (requiresValue && !valueReady)) return;
    const line = normalizeMarkdownRequestLine({
      item,
      reason,
      markdownType,
      requestedPrice: markdownType === "fixed_new_price" ? requestedPrice : null,
      requestedPercentOff: markdownType === "percentage_discount" ? requestedPercentOff : null,
      requestedAmountOff: markdownType === "amount_off" ? requestedAmountOff : null,
      ticketRequired,
      notes,
    });
    setBatch((current) => upsertMarkdownRequestLine(current, line));
    createScanOpsEvent(SCANOPS_EVENT_TYPES.MARKDOWN_APPLIED, {
      source_module: "Markdowns",
      item_name: line.itemName,
      sku: line.sku,
      barcode: line.barcode,
      reason_code: reason,
      reason_label: getOptionLabel(MARKDOWN_REASON_OPTIONS, reason),
      markdown_type: markdownType,
      current_price: line.currentPrice,
      requested_price: line.requestedPrice,
      requested_percent_off: line.requestedPercentOff,
      requested_amount_off: line.requestedAmountOff,
      ticket_required: line.ticketRequired,
      applies_price_directly: false,
      status: "draft_markdown_request_added",
    });
    setItem(null);
    setScanValue("");
    setNotes("");
  };

  const removeLine = (requestItemId) => {
    setBatch((current) => current.filter((line) => line.requestItemId !== requestItemId));
  };

  const submitMarkdown = () => {
    if (!batch.length) return;
    const request = saveMarkdownRequest(buildMarkdownRequest({ items: batch }));
    createScanOpsEvent(SCANOPS_EVENT_TYPES.MARKDOWN_APPLIED, {
      source_module: "Markdowns",
      markdown_request_id: request.requestId,
      item_count: batch.length,
      ticket_required_count: ticketCount,
      status: request.status,
      applies_price_directly: false,
      official_inventory_applies_after_sync: true,
      print_claimed: false,
    });
    setSubmittedRequest(request);
    setView("done");
    setItem(null);
    setScanValue("");
    setBatch([]);
    clearWorkflowDraft("markdown");
  };

  const resetDraft = () => {
    setItem(null);
    setScanValue("");
    setBatch([]);
    setView("entry");
    setSubmittedRequest(null);
    clearWorkflowDraft("markdown");
  };

  return (
    <PageShell>
      <WorkflowHeader
        title="Markdowns"
        subtitle={view === "review" ? "Review markdown request" : "Request only · Inventory activates price"}
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={scan}
        showSearch={view !== "done"}
      />
      <WorkflowMain>
        {view === "done" && submittedRequest ? (
          <DoneCard
            title="Markdown request submitted"
            helper="No price has been changed and no ticket has been printed. Inventory owns approval, activation, and printer routing."
            rows={[
              { label: "Request", value: submittedRequest.requestId },
              { label: "Status", value: submittedRequest.status === "sync_pending" ? "Sync pending" : "Submitted" },
              { label: "Items", value: String(submittedRequest.items.length) },
              { label: "Tickets required", value: String(submittedRequest.items.filter((line) => line.ticketRequired).length) },
              { label: "Price mutation", value: "No direct price mutation" },
            ]}
          />
        ) : view === "review" ? (
          <>
            <SectionCard className="space-y-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Review Markdown Batch</p>
                <h2 className="mt-1 text-lg font-black text-foreground">{itemCountLabel} ready</h2>
              </div>
              <div className="space-y-2 rounded-2xl bg-secondary/50 p-3">
                <InfoLine label="Ticket required" value={String(ticketCount)} />
                <InfoLine label="Approval required" value={String(batch.length)} />
                <InfoLine label="Price mutation" value="No price change from handheld" />
              </div>
              <div className="space-y-2">
                {batch.map((line) => (
                  <div key={line.requestItemId} className="rounded-2xl border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-black text-foreground">{line.itemName}</p>
                        <p className="mt-1 break-words text-xs font-bold text-muted-foreground">{getRequestedSummary(line)}</p>
                        <p className="mt-1 break-words text-xs font-bold text-muted-foreground">
                          {getOptionLabel(MARKDOWN_REASON_OPTIONS, line.reason)} · {getOptionLabel(MARKDOWN_TYPE_OPTIONS, line.markdownType)} · Ticket: {line.ticketRequired ? "Required" : "Not required"}
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
            <StickyActions leftLabel="Back" rightLabel="Submit Markdown Request" onLeft={() => setView("entry")} onRight={submitMarkdown} rightDisabled={!batch.length} />
          </>
        ) : (
          <>
            {item ? (
              <>
                <ItemSummaryCard item={item}>
                  <div className="grid grid-cols-2 gap-2">
                    <MetricPill label="Current price" value={formatMoney(currency, currentPrice)} />
                    <MetricPill label="Use-by" value={item.expiryDate || item.expiry_date || "—"} />
                  </div>
                </ItemSummaryCard>
                <SectionCard className="space-y-3">
                  <TouchSelect label="Markdown reason" value={reason} onChange={setReason} options={MARKDOWN_REASON_OPTIONS} />
                  <TouchSelect label="Markdown type" value={markdownType} onChange={setMarkdownType} options={MARKDOWN_TYPE_OPTIONS} />
                  {markdownType === "fixed_new_price" && <TextInputField label="New price" value={requestedPrice} onChange={setRequestedPrice} type="number" placeholder="0.00" />}
                  {markdownType === "percentage_discount" && <TextInputField label="Percentage discount" value={requestedPercentOff} onChange={setRequestedPercentOff} type="number" placeholder="25" />}
                  {markdownType === "amount_off" && <TextInputField label="Amount off" value={requestedAmountOff} onChange={setRequestedAmountOff} type="number" placeholder="20.00" />}
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Ticket required</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setTicketRequired(true)} className={`min-h-11 rounded-2xl px-3 text-sm font-black ${ticketRequired ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>Yes</button>
                      <button type="button" onClick={() => setTicketRequired(false)} className={`min-h-11 rounded-2xl px-3 text-sm font-black ${!ticketRequired ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>No</button>
                    </div>
                  </div>
                  <TextInputField label="Notes" value={notes} onChange={setNotes} placeholder="Optional note..." />
                  <p className="rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-bold text-muted-foreground">
                    Request only. Inventory approves, activates price, and creates any linked ticket/print job later.
                  </p>
                </SectionCard>
              </>
            ) : (
              <EmptyState title="No item selected." />
            )}

            <SectionCard>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Current markdown batch</p>
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
                        {getRequestedSummary(line)} · {getOptionLabel(MARKDOWN_REASON_OPTIONS, line.reason)} · Ticket: {line.ticketRequired ? "Required" : "No"}
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
              rightLabel="Add Markdown"
              onLeft={() => setView("review")}
              onRight={addMarkdown}
              leftDisabled={!batch.length}
              rightDisabled={!item || !reason || !markdownType || (requiresValue && !valueReady)}
            />
          </>
        )}
      </WorkflowMain>
    </PageShell>
  );
}
