import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import PageHeader from "../components/scanner/PageHeader";
import GovernanceContextStrip from "../components/scanner/GovernanceContextStrip";
import TouchSelect from "../components/scanner/TouchSelect";
import {
  DoneCard,
  EmptyState,
  FieldError,
  InfoLine,
  ItemSummaryCard,
  MetricPill,
  OperatorAlert,
  PageShell,
  SectionCard,
  StickyActions,
  TextInputField,
  WorkflowMain,
} from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { resolveInventoryIdentity, ensureInventoryLoaded } from "../lib/inventorySystemAdapter";
import { writeMarkdownRecord } from "../lib/scanOpsRecordWriter";
import {
  buildWorkflowItemAttributeSnapshot,
  getDefaultExpiryDate,
  getDefaultLotBatch,
  getDefaultQuantityType,
  saveWorkflowItemAttributeSnapshot,
} from "../lib/scanOpsItemAttributes";
import { useScanOpsSession } from "../lib/scanOpsSession";
import { restrictedActionReason } from "../lib/scanOpsPermissions";
import {
  GOVERNED_ACTIONS,
  canPerformScanOpsAction,
  recordGovernedAction,
  useScanOpsGovernanceContext,
} from "../lib/scanOpsGovernance";
import {
  getCurrencySymbol,
  getCurrentPriceSnapshot,
  MARKDOWN_REASON_OPTIONS,
} from "../lib/scanOpsRequestLifecycle";
import MarkdownSuggestionsPanel from "../components/scanner/MarkdownSuggestionsPanel";
import {
  createMarkdownApprovalRequest,
  createMarkdownLabelHandoff,
  evaluateMarkdownRule,
  getMarkdownApprovalRequests,
  LABEL_HANDOFF_METHOD_OPTIONS,
  LABEL_HANDOFF_METHODS,
  MARKDOWN_PERCENT_OPTIONS,
  MARKDOWN_STATUSES,
  updateMarkdownApprovalStatus,
} from "../lib/scanOpsMarkdownApproval";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "blocked", label: "Blocked" },
];

function formatMoney(currency, value) {
  if (value === null || value === undefined || value === "" || Number.isNaN(Number(value))) return "—";
  return `${currency}${Number(value).toFixed(2)}`;
}

function compactDate(value) {
  if (!value) return "—";
  return String(value).slice(0, 10);
}

function statusClass(status) {
  if ([MARKDOWN_STATUSES.APPROVED, MARKDOWN_STATUSES.READY_FOR_LABEL_HANDOFF, MARKDOWN_STATUSES.QUEUED_DESKTOP_PRINT, MARKDOWN_STATUSES.QUEUED_MOBILE_PRINTER].includes(status)) return "bg-primary/10 text-primary";
  if ([MARKDOWN_STATUSES.BLOCKED_WASTE_REVIEW_REQUIRED, MARKDOWN_STATUSES.REJECTED].includes(status)) return "bg-destructive/10 text-destructive";
  if ([MARKDOWN_STATUSES.NEEDS_REVIEW, MARKDOWN_STATUSES.PENDING_APPROVAL].includes(status)) return "bg-amber-50 text-amber-700";
  return "bg-secondary text-muted-foreground";
}

function FilterButton({ filter, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-10 rounded-xl px-2 text-xs font-black active:scale-[0.98] ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground active:bg-border"}`}
    >
      {filter.label}
    </button>
  );
}

function QueueItem({ request, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-3 text-left active:scale-[0.99] ${active ? "border-primary bg-primary/5" : "border-border bg-card"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-black leading-tight text-foreground">{request.itemName}</p>
          <p className="mt-1 break-words text-xs font-bold text-muted-foreground">
            {request.reasonLabel} · Qty {request.quantity} · {request.ruleSummary || "Rule pending"}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${statusClass(request.status)}`}>{request.status}</span>
      </div>
    </button>
  );
}

function MethodButton({ method, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-12 rounded-2xl px-3 py-2 text-left active:scale-[0.98] ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground active:bg-border"}`}
    >
      <span className="block text-sm font-black leading-tight">{method.label}</span>
      <span className={`mt-1 block text-[10px] font-bold uppercase tracking-wide ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{method.helper}</span>
    </button>
  );
}

export default function Markdowns() {
  const session = useScanOpsSession();
  const governance = useScanOpsGovernanceContext();
  const location = useLocation();
  const taskParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const taskReason = taskParams.get("reason");
  const markdownSubmitPermission = canPerformScanOpsAction(GOVERNED_ACTIONS.MARKDOWN_SUBMIT, governance);
  const markdownApprovePermission = canPerformScanOpsAction(GOVERNED_ACTIONS.MARKDOWN_APPROVE, governance);
  const markdownRejectPermission = canPerformScanOpsAction(GOVERNED_ACTIONS.MARKDOWN_REJECT, governance);
  const handoffPermission = canPerformScanOpsAction(GOVERNED_ACTIONS.SHELF_TICKET_PRINT_HANDOFF, governance);
  const canApprove = markdownApprovePermission.allowed;

  const [scanValue, setScanValue] = useState("");
  const [item, setItem] = useState(null);
  const [reason, setReason] = useState(() => MARKDOWN_REASON_OPTIONS.some((option) => option.id === taskReason) ? taskReason : "short_dated");
  const [selectedPercent, setSelectedPercent] = useState("40");
  const [quantity, setQuantity] = useState("1");
  const [expiryDate, setExpiryDate] = useState("");
  const [batchLot, setBatchLot] = useState("");
  const [quantityType, setQuantityType] = useState("each");
  const [labelRequired, setLabelRequired] = useState(true);
  const [handoffMethod, setHandoffMethod] = useState(LABEL_HANDOFF_METHODS.STORE_PRINT_QUEUE);
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState("all");
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [done, setDone] = useState(null);
  const [operatorError, setOperatorError] = useState(null);

  const refreshRequests = (nextSelectedId = selectedId) => {
    const next = getMarkdownApprovalRequests();
    setRequests(next);
    const stillExists = next.some((request) => request.requestId === nextSelectedId);
    const fallback = next.find((request) => request.status !== MARKDOWN_STATUSES.REJECTED)?.requestId || next[0]?.requestId || null;
    setSelectedId(stillExists ? nextSelectedId : fallback);
  };

  useEffect(() => { ensureInventoryLoaded(); }, []);

  useEffect(() => {
    refreshRequests(null);
    // Stage AD queue is pilot-safe and explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedRequest = useMemo(() => requests.find((request) => request.requestId === selectedId) || null, [requests, selectedId]);
  const currentPrice = getCurrentPriceSnapshot(item);
  const currency = getCurrencySymbol(item) || "₱";
  const rule = useMemo(() => evaluateMarkdownRule({ expiryDate, reasonCode: reason, selectedMarkdownPercent: selectedPercent, currentPrice, quantity }), [expiryDate, reason, selectedPercent, currentPrice, quantity]);

  const queueCounts = useMemo(() => ({
    pending: requests.filter((request) => [MARKDOWN_STATUSES.DRAFT, MARKDOWN_STATUSES.PENDING_APPROVAL, MARKDOWN_STATUSES.NEEDS_REVIEW, MARKDOWN_STATUSES.RETURNED].includes(request.status)).length,
    approved: requests.filter((request) => [MARKDOWN_STATUSES.APPROVED, MARKDOWN_STATUSES.READY_FOR_LABEL_HANDOFF, MARKDOWN_STATUSES.QUEUED_DESKTOP_PRINT, MARKDOWN_STATUSES.QUEUED_MOBILE_PRINTER].includes(request.status)).length,
    blocked: requests.filter((request) => request.status === MARKDOWN_STATUSES.BLOCKED_WASTE_REVIEW_REQUIRED).length,
  }), [requests]);

  const filteredRequests = useMemo(() => requests.filter((request) => {
    if (filter === "pending") return [MARKDOWN_STATUSES.DRAFT, MARKDOWN_STATUSES.PENDING_APPROVAL, MARKDOWN_STATUSES.NEEDS_REVIEW, MARKDOWN_STATUSES.RETURNED].includes(request.status);
    if (filter === "approved") return [MARKDOWN_STATUSES.APPROVED, MARKDOWN_STATUSES.READY_FOR_LABEL_HANDOFF, MARKDOWN_STATUSES.QUEUED_DESKTOP_PRINT, MARKDOWN_STATUSES.QUEUED_MOBILE_PRINTER].includes(request.status);
    if (filter === "blocked") return request.status === MARKDOWN_STATUSES.BLOCKED_WASTE_REVIEW_REQUIRED || request.status === MARKDOWN_STATUSES.REJECTED;
    return true;
  }), [requests, filter]);

  const selectSuggestion = (inventoryItem, cat) => {
    // Normalise the raw inventory snapshot item into the shape resolveInventoryIdentity returns
    const normalized = {
      ...inventoryItem,
      id: inventoryItem.internalItemId,
      shelf_stock: inventoryItem.shelfStock,
      backroom_stock: inventoryItem.backroomStock,
      stock_on_hand: inventoryItem.stockOnHand,
      minimum_shelf_qty: inventoryItem.minimumStock,
      current_price: inventoryItem.currentPrice,
      expiry_date: inventoryItem.expiryDate,
      expiry_status: inventoryItem.freshnessStatus,
      location: inventoryItem.shelfLocation,
    };
    setOperatorError(null);
    const defaultExpiry = inventoryItem.expiryDate || "";
    const price = getCurrentPriceSnapshot(normalized);
    setItem(normalized);
    setReason(cat.reason || "short_dated");
    setSelectedPercent(cat.suggestedPercent || "25");
    setQuantity("1");
    setExpiryDate(defaultExpiry);
    setBatchLot(inventoryItem.batchId || "");
    setQuantityType(inventoryItem.unitType || "each");
    setLabelRequired(true);
    setHandoffMethod(LABEL_HANDOFF_METHODS.STORE_PRINT_QUEUE);
    setNotes(`Suggested by scan round: ${cat.tag}`);
    setScanValue(inventoryItem.barcode || inventoryItem.sku || "");
    setDone(null);
    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scan = (value) => {
    const found = typeof value === "object" ? value : resolveInventoryIdentity(String(value || "").trim());
    if (!found) return;
    setOperatorError(null);
    const rawScanValue = typeof value === "object" ? value?._searchMatch?.matchedValue || value?.barcode || value?.gtin || "" : String(value || "").trim();
    setItem(found);
    const defaultExpiry = getDefaultExpiryDate(found);
    const price = getCurrentPriceSnapshot(found);
    const defaultRule = evaluateMarkdownRule({ expiryDate: defaultExpiry, reasonCode: "short_dated", selectedMarkdownPercent: "40", currentPrice: price, quantity: 1 });
    setReason(found?.markdownEligible === false ? "manager_instruction" : "short_dated");
    setSelectedPercent(String(defaultRule.suggestedPercent || 40));
    setQuantity("1");
    setExpiryDate(defaultExpiry);
    setBatchLot(getDefaultLotBatch(found));
    setQuantityType(getDefaultQuantityType(found));
    setLabelRequired(true);
    setHandoffMethod(LABEL_HANDOFF_METHODS.STORE_PRINT_QUEUE);
    setNotes("");
    setScanValue(rawScanValue);
    setDone(null);
    setOperatorError(null);
  };

  const createRequest = () => {
    if (!item) {
      setOperatorError({ title: "Item required", helper: "Scan or search an item before creating a markdown request." });
      return;
    }
    if (!reason) {
      setOperatorError({ title: "Reason required", helper: "Choose a markdown reason before saving. Your scanned item stays on screen." });
      return;
    }
    if (!Number(quantity || 0)) {
      setOperatorError({ title: "Quantity missing", helper: "Enter a valid markdown quantity before saving. Your request stays on screen." });
      return;
    }
    if (!selectedPercent) {
      setOperatorError({ title: "Markdown price missing", helper: "Choose a markdown percent before saving." });
      return;
    }
    setOperatorError(null);
    if (!markdownSubmitPermission.allowed) {
      recordGovernedAction(GOVERNED_ACTIONS.MARKDOWN_SUBMIT, "Markdowns", null, markdownSubmitPermission);
      setOperatorError({ title: "Supervisor required", helper: markdownSubmitPermission.reason || "Staff can save permitted requests, but cannot approve restricted markdown actions." });
      setDone(null);
      return;
    }
    const attributeSnapshot = buildWorkflowItemAttributeSnapshot({
      workflowType: "markdown",
      item,
      scanValue,
      expiryDate,
      lotBatch: batchLot,
      quantityType,
      enteredQuantity: quantity,
      weightSource: String(scanValue || "").startsWith("2") ? "label_weight" : "manual_entry",
      source: "markdown_approval_stage_ad",
    });
    saveWorkflowItemAttributeSnapshot(attributeSnapshot);
    recordGovernedAction(GOVERNED_ACTIONS.MARKDOWN_SUBMIT, "Markdowns", null, markdownSubmitPermission, { eventLabel: "Markdown request created" });
    writeMarkdownRecord({ item, reasonCode: reason, selectedPercent, quantity, expiryDate, notes, status: "pending_approval" });
    const request = createMarkdownApprovalRequest({
      item,
      reasonCode: reason,
      selectedMarkdownPercent: selectedPercent,
      quantity,
      expiryDate,
      batchLot,
      notes,
      labelRequired,
      labelHandoffMethod: handoffMethod,
      attributeSnapshot,
    });
    createScanOpsEvent(attributeSnapshot.weighted_snapshot ? SCANOPS_EVENT_TYPES.WEIGHTED_ITEM_EVIDENCE_CAPTURED : SCANOPS_EVENT_TYPES.ATTRIBUTE_EVIDENCE_CAPTURED, {
      source_module: "Markdowns",
      markdown_request_id: request.requestId,
      item_name: request.itemName,
      sku: request.sku,
      barcode: request.barcode,
      workflow_type: "markdown_approval",
      expiry_date: attributeSnapshot.expiry_snapshot?.expiry_date || null,
      lot_batch: attributeSnapshot.lot_batch_snapshot?.lot_batch_value || null,
      applies_stock_directly: false,
      applies_price_directly: false,
      status: "attribute_evidence_saved",
    });
    setDone({
      title: request.wasteReviewRequired ? "Markdown blocked for Waste Review" : "Markdown request created",
      helper: request.wasteReviewRequired ? "Expired stock is not eligible for markdown approval in this stage." : "Saved locally. Pending sync. Approval-led; no price has changed.",
      request,
    });
    setItem(null);
    setScanValue("");
    refreshRequests(request.requestId);
  };

  const updateSelected = (action, reasonText = "") => {
    if (!selectedRequest) return;
    const permission = action === "submit" ? markdownSubmitPermission : action === "approve" ? markdownApprovePermission : markdownRejectPermission;
    const actionKey = action === "submit" ? GOVERNED_ACTIONS.MARKDOWN_SUBMIT : action === "approve" ? GOVERNED_ACTIONS.MARKDOWN_APPROVE : GOVERNED_ACTIONS.MARKDOWN_REJECT;
    if (!permission.allowed) {
      recordGovernedAction(actionKey, "Markdowns", selectedRequest.requestId, permission);
      setOperatorError({ title: action === "approve" ? "Supervisor required" : "Permission required", helper: permission.reason || "This action is blocked until approved." });
      setDone(null);
      return;
    }
    recordGovernedAction(actionKey, "Markdowns", selectedRequest.requestId, permission, { eventLabel: `Markdown ${action}` });
    const updated = updateMarkdownApprovalStatus(selectedRequest.requestId, action, reasonText);
    if (!updated) return;
    setDone({ title: `Markdown ${updated.status}`, helper: "No product master price changed. Approval state only was updated.", request: updated });
    refreshRequests(updated.requestId);
  };

  const createHandoff = () => {
    if (!selectedRequest) return;
    if (!handoffPermission.allowed) {
      recordGovernedAction(GOVERNED_ACTIONS.SHELF_TICKET_PRINT_HANDOFF, "Markdowns", selectedRequest.requestId, handoffPermission);
      setOperatorError({ title: "Permission required", helper: handoffPermission.reason || "This handoff is blocked until an authorised role is available." });
      setDone(null);
      return;
    }
    recordGovernedAction(GOVERNED_ACTIONS.SHELF_TICKET_PRINT_HANDOFF, "Markdowns", selectedRequest.requestId, handoffPermission, { eventLabel: "Markdown label handoff" });
    const result = createMarkdownLabelHandoff(selectedRequest.requestId);
    if (!result) return;
    if (result.duplicateBlocked) {
      setDone({ title: "Duplicate handoff blocked", helper: "This approved markdown already has a shelf-ticket / printer handoff contract.", request: result.request });
      refreshRequests(result.request.requestId);
      return;
    }
    if (result.blocked) {
      setDone({ title: "Approval required first", helper: "Only approved markdown requests can create label handoff contracts.", request: result.request });
      return;
    }
    setDone({ title: "Label handoff contract created", helper: "Shelf-ticket and printer handoff contracts were created. Printer connection remains deferred.", request: result.request });
    refreshRequests(result.request.requestId);
  };

  const selectedNeedsSubmit = selectedRequest && [MARKDOWN_STATUSES.DRAFT, MARKDOWN_STATUSES.RETURNED].includes(selectedRequest.status);
  const selectedNeedsApproval = selectedRequest && [MARKDOWN_STATUSES.PENDING_APPROVAL, MARKDOWN_STATUSES.NEEDS_REVIEW].includes(selectedRequest.status);
  const selectedApprovalReason = selectedRequest?.approvalRoleRequired === "Manager" ? "Manager approval required" : restrictedActionReason("Supervisor");
  const canSubmitSelected = selectedNeedsSubmit && markdownSubmitPermission.allowed;
  const canApproveSelected = selectedNeedsApproval && canApprove;
  const canHandoffSelected = selectedRequest && handoffPermission.allowed && selectedRequest.status === MARKDOWN_STATUSES.APPROVED && selectedRequest.labelRequired;

  return (
    <PageShell>
      <PageHeader title="Markdowns" subtitle="Approval-led · prices unchanged" />
      <WorkflowHeader
        title="Markdowns"
        subtitle="Approval-led · prices unchanged"
        showHeaderChrome={false}
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={scan}
      />
      <WorkflowMain>
        <GovernanceContextStrip />
        {operatorError && <OperatorAlert title={operatorError.title} helper={operatorError.helper} tone={operatorError.tone || "warning"} actions={[{ label: "Keep Editing", onClick: () => setOperatorError(null), variant: "primary" }]} />}
        {done && !done.request && (
          <SectionCard className="border-amber-200 bg-amber-50/70">
            <h2 className="text-base font-black text-foreground">{done.title}</h2>
            <p className="mt-1 text-sm font-bold leading-snug text-muted-foreground">{done.helper}</p>
          </SectionCard>
        )}
        {done?.request && (
          <DoneCard
            title={done.title}
            helper={done.helper}
            rows={[
              { label: "Request", value: done.request.requestId },
              { label: "Status", value: done.request.status },
              { label: "Printer", value: "Connection deferred" },
            ]}
          />
        )}

        {item && (
          <>
            <ItemSummaryCard item={item}>
              <div className="grid grid-cols-2 gap-2">
                <MetricPill label="Current" value={formatMoney(currency, currentPrice)} />
                <MetricPill label="New price" value={formatMoney(currency, rule.selectedMarkdownPrice)} />
              </div>
            </ItemSummaryCard>

            <SectionCard className="space-y-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">New Markdown Request</p>
                <p className="mt-1 text-sm font-bold leading-snug text-muted-foreground">Request only. POS and product master prices stay unchanged.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <TextInputField label="Quantity" value={quantity} onChange={(value) => { setQuantity(value); if (operatorError?.title === "Quantity missing") setOperatorError(null); }} type="number" placeholder="1" />
                <TextInputField label="Expiry date" value={expiryDate} onChange={setExpiryDate} type="date" />
              </div>
              <TextInputField label="Batch / lot" value={batchLot} onChange={setBatchLot} placeholder="Optional" />
              <TouchSelect label="Reason" value={reason} onChange={(value) => { setReason(value); if (operatorError?.title === "Reason required") setOperatorError(null); }} options={MARKDOWN_REASON_OPTIONS} />
              {!reason && <FieldError title="Reason required" helper="Choose a markdown reason before saving." />}
              <TouchSelect label="Selected markdown" value={selectedPercent} onChange={(value) => { setSelectedPercent(value); if (operatorError?.title === "Markdown price missing") setOperatorError(null); }} options={MARKDOWN_PERCENT_OPTIONS} />
              {!selectedPercent && <FieldError title="Markdown price missing" helper="Choose a markdown percent before saving." />}

              <div className="rounded-2xl bg-secondary/60 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <MetricPill label="Suggested" value={rule.suggestedRange} />
                  <MetricPill label="Risk" value={rule.riskLevel} />
                  <MetricPill label="Role" value={rule.approvalRoleRequired} />
                  <MetricPill label="Price" value={formatMoney(currency, rule.selectedMarkdownPrice)} />
                </div>
                <p className="mt-3 text-xs font-bold leading-snug text-muted-foreground">{rule.ruleSummary}</p>
                {rule.blockedReason && <p className="mt-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-black text-destructive">{rule.blockedReason}</p>}
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Label / Printer Handoff</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setLabelRequired(true)} className={`min-h-11 rounded-2xl px-3 text-sm font-black ${labelRequired ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>Label needed</button>
                  <button type="button" onClick={() => setLabelRequired(false)} className={`min-h-11 rounded-2xl px-3 text-sm font-black ${!labelRequired ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>No label</button>
                </div>
                {labelRequired && (
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    {LABEL_HANDOFF_METHOD_OPTIONS.map((method) => <MethodButton key={method.id} method={method} active={handoffMethod === method.id} onClick={() => setHandoffMethod(method.id)} />)}
                  </div>
                )}
              </div>
              <TextInputField label="Notes" value={notes} onChange={setNotes} placeholder="Optional approval context..." />
            </SectionCard>
          </>
        )}

        <MarkdownSuggestionsPanel onSelectItem={selectSuggestion} />

        <SectionCard className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-black text-foreground">Markdown Queue</p>
              <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">Approval requests, blocked expiry outcomes, and print handoff readiness.</p>
            </div>
            <div className="shrink-0 rounded-2xl bg-secondary px-3 py-2 text-center">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Pending</p>
              <p className="text-lg font-black text-foreground">{queueCounts.pending}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {FILTERS.map((item) => <FilterButton key={item.id} filter={item} active={filter === item.id} onClick={() => setFilter(item.id)} />)}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MetricPill label="Approved" value={queueCounts.approved} />
            <MetricPill label="Blocked" value={queueCounts.blocked} />
            <MetricPill label="Role" value={session.actorRole} />
          </div>
        </SectionCard>

        <SectionCard>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Queue</p>
              <p className="mt-1 text-lg font-black text-foreground">{filteredRequests.length} request{filteredRequests.length === 1 ? "" : "s"}</p>
            </div>
          </div>
          {filteredRequests.length ? (
            <div className="mt-3 space-y-2">
              {filteredRequests.map((request) => <QueueItem key={request.requestId} request={request} active={request.requestId === selectedId} onClick={() => setSelectedId(request.requestId)} />)}
            </div>
          ) : (
            <p className="mt-3 rounded-2xl bg-secondary/50 px-3 py-2 text-sm font-bold text-muted-foreground">No markdown requests in this view.</p>
          )}
        </SectionCard>

        {selectedRequest ? (
          <>
            <SectionCard className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Selected Request</p>
                  <h2 className="mt-1 break-words text-lg font-black leading-tight text-foreground">{selectedRequest.itemName}</h2>
                  <p className="mt-1 break-all font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                    {[selectedRequest.sku && `SKU ${selectedRequest.sku}`, selectedRequest.barcode && `Barcode ${selectedRequest.barcode}`].filter(Boolean).join(" · ") || "Identity pending"}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${statusClass(selectedRequest.status)}`}>{selectedRequest.status}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <MetricPill label="Current" value={formatMoney(selectedRequest.currency || "₱", selectedRequest.currentPrice)} />
                <MetricPill label="Markdown" value={`${selectedRequest.selectedMarkdownPercent}%`} />
                <MetricPill label="New price" value={formatMoney(selectedRequest.currency || "₱", selectedRequest.selectedMarkdownPrice)} />
                <MetricPill label="Quantity" value={selectedRequest.quantity} />
                <MetricPill label="Expiry" value={compactDate(selectedRequest.expiryDate)} />
                <MetricPill label="Risk" value={selectedRequest.riskLevel} />
              </div>

              <div className="space-y-2 rounded-2xl bg-secondary/50 p-3">
                <InfoLine label="Reason" value={selectedRequest.reasonLabel} />
                <InfoLine label="Rule" value={`${selectedRequest.ruleSummary} · Suggested ${selectedRequest.suggestedRange}`} />
                <InfoLine label="Batch / lot" value={selectedRequest.batchLot || "—"} />
                <InfoLine label="Price mutation" value="No direct price mutation" />
              </div>
            </SectionCard>

            <SectionCard className="space-y-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Approval</p>
                <p className="mt-1 text-sm font-black text-foreground">{selectedRequest.approvalRequired ? `${selectedRequest.approvalRoleRequired} approval required` : "Approval blocked"}</p>
                <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">
                  Current role: {session.actorRole}. {selectedNeedsApproval && !canApprove ? selectedApprovalReason : "Review state only."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {selectedNeedsSubmit && (
                  <button type="button" disabled={!canSubmitSelected} onClick={() => updateSelected("submit")} className="min-h-12 rounded-2xl bg-primary px-3 text-sm font-black text-primary-foreground active:scale-[0.98] disabled:opacity-40">
                    Submit Approval
                  </button>
                )}
                {selectedNeedsSubmit && !canSubmitSelected && <p className="col-span-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">{markdownSubmitPermission.reason}</p>}
                {canApproveSelected && (
                  <>
                    <button type="button" onClick={() => updateSelected("approve")} className="min-h-12 rounded-2xl bg-secondary px-3 text-sm font-black text-secondary-foreground active:bg-border">
                      Approve
                    </button>
                    <button type="button" onClick={() => updateSelected("return")} className="min-h-12 rounded-2xl bg-secondary px-3 text-sm font-black text-secondary-foreground active:bg-border">
                      Return
                    </button>
                    <button type="button" onClick={() => updateSelected("reject")} className="min-h-12 rounded-2xl bg-secondary px-3 text-sm font-black text-secondary-foreground active:bg-border">
                      Reject
                    </button>
                  </>
                )}
                {selectedNeedsApproval && !canApprove && <OperatorAlert title={selectedRequest.approvalRoleRequired === "Manager" ? "Manager approval required" : "Supervisor required"} helper="This markdown cannot be approved by the current role. Save/request state is preserved." tone="info" />}
                {!selectedNeedsSubmit && !selectedNeedsApproval && <p className="col-span-2 rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-black text-muted-foreground">No review action available</p>}
              </div>
              {selectedRequest.blockedReason && <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-xs font-black text-destructive">{selectedRequest.blockedReason}</p>}
            </SectionCard>

            <SectionCard className="space-y-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Label / Printer Handoff</p>
                <p className="mt-1 text-sm font-black text-foreground">{selectedRequest.labelHandoffStatus}</p>
                <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">Printer connection deferred. This records handoff readiness only.</p>
              </div>
              <div className="space-y-2 rounded-2xl bg-secondary/50 p-3">
                <InfoLine label="Label needed" value={selectedRequest.labelRequired ? "Yes" : "No"} />
                <InfoLine label="Method" value={LABEL_HANDOFF_METHOD_OPTIONS.find((method) => method.id === selectedRequest.labelHandoffMethod)?.label || selectedRequest.labelHandoffMethod} />
                <InfoLine label="Printer" value={selectedRequest.printerName || "Printer connection deferred"} />
                <InfoLine label="Shelf ticket" value={selectedRequest.linkedShelfTicketRequestId || "Ready after approval"} />
                <InfoLine label="Print contract" value={selectedRequest.linkedPrintContractId || "Not created"} />
                <InfoLine label="Printer contract" value={selectedRequest.linkedPrinterHandoffId || "Not created"} />
              </div>
              <button type="button" disabled={!canHandoffSelected} onClick={createHandoff} className="min-h-12 w-full rounded-2xl bg-primary px-3 text-sm font-black text-primary-foreground active:scale-[0.98] disabled:opacity-40">
                Ready for Label Handoff
              </button>
            </SectionCard>
          </>
        ) : (
          <EmptyState title="No markdown selected." helper="Scan/search an item to create a markdown request, or select an existing queue item." />
        )}

        {item && (
          <StickyActions
            leftLabel="Cancel Request"
            rightLabel="Create Request"
            onLeft={() => {
              setItem(null);
              setScanValue("");
            }}
            onRight={createRequest}
            rightDisabled={false}
          />
        )}
      </WorkflowMain>
    </PageShell>
  );
}