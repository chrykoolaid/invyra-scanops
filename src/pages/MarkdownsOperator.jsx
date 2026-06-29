import React, { useEffect, useMemo, useState } from "react";
import { BadgePercent, Printer, RotateCcw, ScanLine, Tag } from "lucide-react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import PageHeader from "../components/scanner/PageHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import {
  EmptyState,
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
import { useInventoryCacheStatus, isStaleCacheBlockingForPriceSensitiveWorkflow } from "../lib/inventory/useInventoryCacheStatus";
import InventoryCacheStatusBar from "../components/scanner/InventoryCacheStatusBar";
import {
  buildWorkflowItemAttributeSnapshot,
  getDefaultExpiryDate,
  getDefaultLotBatch,
  getDefaultQuantityType,
  saveWorkflowItemAttributeSnapshot,
} from "../lib/scanOpsItemAttributes";
import { GOVERNED_ACTIONS, canPerformScanOpsAction, recordGovernedAction, useScanOpsGovernanceContext } from "../lib/scanOpsGovernance";
import { getCurrencySymbol, getCurrentPriceSnapshot, MARKDOWN_REASON_OPTIONS } from "../lib/scanOpsRequestLifecycle";
import {
  createMarkdownApprovalRequest,
  evaluateMarkdownRule,
  getMarkdownApprovalRequests,
  LABEL_HANDOFF_METHODS,
  MARKDOWN_PERCENT_OPTIONS,
  MARKDOWN_STATUSES,
} from "../lib/scanOpsMarkdownApproval";

function formatMoney(currency, value) {
  if (value === null || value === undefined || value === "" || Number.isNaN(Number(value))) return "—";
  return `${currency}${Number(value).toFixed(2)}`;
}

function itemName(item) {
  return item?.name || item?.item_name || "Scanned item";
}

function primaryScanValue(item) {
  return item?.barcode || item?.gtin || item?.sku || item?.plu || item?.scaleCode || item?.name || "";
}

function MarkdownSessionCard({ requests }) {
  const pending = requests.filter((request) => [MARKDOWN_STATUSES.DRAFT, MARKDOWN_STATUSES.PENDING_APPROVAL, MARKDOWN_STATUSES.NEEDS_REVIEW, MARKDOWN_STATUSES.RETURNED].includes(request.status)).length;
  const approved = requests.filter((request) => [MARKDOWN_STATUSES.APPROVED, MARKDOWN_STATUSES.READY_FOR_LABEL_HANDOFF, MARKDOWN_STATUSES.QUEUED_DESKTOP_PRINT, MARKDOWN_STATUSES.QUEUED_MOBILE_PRINTER].includes(request.status)).length;
  const blocked = requests.filter((request) => request.status === MARKDOWN_STATUSES.BLOCKED_WASTE_REVIEW_REQUIRED).length;
  return (
    <SectionCard>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <BadgePercent className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Markdown Session</p>
          <h2 className="mt-1 text-base font-black text-foreground">Approval-led price request</h2>
          <p className="mt-1 text-xs font-bold text-muted-foreground">Scan → markdown → queue → approval → label handoff</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MetricPill label="Pending" value={pending} />
        <MetricPill label="Approved" value={approved} />
        <MetricPill label="Blocked" value={blocked} />
      </div>
    </SectionCard>
  );
}

function PercentGrid({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-3xl bg-secondary/60 p-1">
      {MARKDOWN_PERCENT_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`min-h-14 rounded-2xl px-3 text-base font-black active:scale-[0.98] ${value === option.id ? "bg-primary text-primary-foreground" : "bg-background text-foreground active:bg-primary/10"}`}
        >
          {option.label || `${option.id}%`}
        </button>
      ))}
    </div>
  );
}

function QueueCard({ request }) {
  return (
    <div className="rounded-2xl bg-secondary/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-foreground">{request.itemName}</p>
          <p className="mt-1 text-xs font-bold text-muted-foreground">{request.reasonLabel} · Qty {request.quantity} · {request.selectedMarkdownPercent}%</p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">New price {formatMoney(request.currency || "₱", request.selectedMarkdownPrice)}</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black text-primary">{request.status}</span>
      </div>
    </div>
  );
}

export default function MarkdownsOperator() {
  const governance = useScanOpsGovernanceContext();
  const cacheStatus = useInventoryCacheStatus();
  const staleCacheBlocking = isStaleCacheBlockingForPriceSensitiveWorkflow(cacheStatus);
  const markdownSubmitPermission = canPerformScanOpsAction(GOVERNED_ACTIONS.MARKDOWN_SUBMIT, governance);

  const [scanValue, setScanValue] = useState("");
  const [item, setItem] = useState(null);
  const [reason, setReason] = useState("short_dated");
  const [selectedPercent, setSelectedPercent] = useState("40");
  const [quantity, setQuantity] = useState("1");
  const [expiryDate, setExpiryDate] = useState("");
  const [batchLot, setBatchLot] = useState("");
  const [quantityType, setQuantityType] = useState("each");
  const [notes, setNotes] = useState("");
  const [requests, setRequests] = useState([]);
  const [operatorError, setOperatorError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);

  const currentPrice = getCurrentPriceSnapshot(item);
  const currency = getCurrencySymbol(item) || "₱";
  const rule = useMemo(() => evaluateMarkdownRule({ expiryDate, reasonCode: reason, selectedMarkdownPercent: selectedPercent, currentPrice, quantity }), [expiryDate, reason, selectedPercent, currentPrice, quantity]);

  const refreshRequests = () => setRequests(getMarkdownApprovalRequests());

  useEffect(() => {
    ensureInventoryLoaded();
    refreshRequests();
  }, []);

  const scan = (value) => {
    const input = typeof value === "object" ? primaryScanValue(value) : String(value || "").trim();
    const found = typeof value === "object" ? value : resolveInventoryIdentity(input);
    if (!found) {
      setOperatorError({ title: "Item not found", helper: "Scan again or use barcode, SKU, PLU, or item name." });
      setLastSaved(null);
      return;
    }
    const defaultExpiry = getDefaultExpiryDate(found);
    const price = getCurrentPriceSnapshot(found);
    const defaultRule = evaluateMarkdownRule({ expiryDate: defaultExpiry, reasonCode: "short_dated", selectedMarkdownPercent: "40", currentPrice: price, quantity: 1 });
    setOperatorError(null);
    setLastSaved(null);
    setItem(found);
    setScanValue(primaryScanValue(found));
    setReason(found?.markdownEligible === false ? "manager_instruction" : "short_dated");
    setSelectedPercent(String(defaultRule.suggestedPercent || 40));
    setQuantity("1");
    setExpiryDate(defaultExpiry);
    setBatchLot(getDefaultLotBatch(found));
    setQuantityType(getDefaultQuantityType(found));
    setNotes("");
  };

  const resetItem = () => {
    setItem(null);
    setScanValue("");
    setQuantity("1");
    setNotes("");
    setOperatorError(null);
  };

  const createRequest = () => {
    if (!item) {
      setOperatorError({ title: "Item required", helper: "Scan an item before creating a markdown request." });
      return;
    }
    if (!reason) {
      setOperatorError({ title: "Reason required", helper: "Choose a markdown reason before saving." });
      return;
    }
    if (!Number(quantity || 0)) {
      setOperatorError({ title: "Quantity missing", helper: "Enter a valid markdown quantity before saving." });
      return;
    }
    if (!selectedPercent) {
      setOperatorError({ title: "Markdown missing", helper: "Choose a markdown percent before saving." });
      return;
    }
    if (staleCacheBlocking) {
      setOperatorError({ title: "Inventory cache stale", helper: "Refresh the inventory cache before creating markdown evidence.", tone: "danger" });
      return;
    }
    if (!markdownSubmitPermission.allowed) {
      recordGovernedAction(GOVERNED_ACTIONS.MARKDOWN_SUBMIT, "Markdowns", null, markdownSubmitPermission);
      setOperatorError({ title: "Permission required", helper: markdownSubmitPermission.reason || "This markdown action is blocked for the current role." });
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
      source: "markdown_operator_workflow",
    });
    saveWorkflowItemAttributeSnapshot(attributeSnapshot);
    recordGovernedAction(GOVERNED_ACTIONS.MARKDOWN_SUBMIT, "Markdowns", null, markdownSubmitPermission, { eventLabel: "Markdown request created from operator workflow" });
    const request = createMarkdownApprovalRequest({
      item,
      reasonCode: reason,
      selectedMarkdownPercent: selectedPercent,
      quantity,
      expiryDate,
      batchLot,
      notes,
      labelRequired: true,
      labelHandoffMethod: LABEL_HANDOFF_METHODS.STORE_PRINT_QUEUE,
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
    setLastSaved(request);
    refreshRequests();
    resetItem();
  };

  return (
    <PageShell>
      <PageHeader title="Markdown" subtitle="Scan item, choose markdown, request label" />
      <WorkflowHeader
        title="Markdown"
        subtitle="Scan → markdown → approval queue"
        showHeaderChrome={false}
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={scan}
        placeholder="Scan item barcode, SKU, PLU, or name..."
      />
      <WorkflowMain>
        <InventoryCacheStatusBar cacheStatus={cacheStatus} onRefresh={cacheStatus.refresh} isStrict={true} />
        {staleCacheBlocking && (
          <OperatorAlert
            title="Inventory cache stale"
            helper="Markdown pricing depends on current inventory data. Refresh the cache before creating requests."
            tone="danger"
            actions={[{ label: "Refresh Cache", onClick: cacheStatus.refresh, variant: "primary" }]}
          />
        )}
        {operatorError && <OperatorAlert title={operatorError.title} helper={operatorError.helper} tone={operatorError.tone || "warning"} actions={[{ label: "Keep Editing", onClick: () => setOperatorError(null), variant: "primary" }]} />}
        {lastSaved && <OperatorAlert tone="success" title="Markdown request saved" helper={`${lastSaved.itemName || "Item"} queued for approval. No price changed on handheld.`} />}

        <MarkdownSessionCard requests={requests} />

        {item ? (
          <>
            <ItemSummaryCard item={item}>
              <div className="grid grid-cols-3 gap-2">
                <MetricPill label="Current" value={formatMoney(currency, currentPrice)} />
                <MetricPill label="New" value={formatMoney(currency, rule.selectedMarkdownPrice)} />
                <MetricPill label="Qty" value={quantity || "—"} />
              </div>
            </ItemSummaryCard>

            <SectionCard className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Tag className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Markdown Request</p>
                  <h2 className="mt-1 text-base font-black text-foreground">{itemName(item)}</h2>
                  <p className="mt-1 text-xs font-bold text-muted-foreground">Request only. Product master and POS prices stay unchanged.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <TextInputField label="Quantity" value={quantity} onChange={setQuantity} type="number" placeholder="1" />
                <TextInputField label="Expiry" value={expiryDate} onChange={setExpiryDate} type="date" />
              </div>
              <TextInputField label="Batch / lot" value={batchLot} onChange={setBatchLot} placeholder="Optional" />
              <TouchSelect label="Reason" value={reason} onChange={setReason} options={MARKDOWN_REASON_OPTIONS} />
            </SectionCard>

            <SectionCard className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <BadgePercent className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Markdown Percent</p>
                  <h2 className="mt-1 text-3xl font-black text-foreground">{selectedPercent}%</h2>
                  <p className="mt-1 text-xs font-bold text-muted-foreground">Suggested: {rule.suggestedRange} · Risk: {rule.riskLevel}</p>
                </div>
              </div>
              <PercentGrid value={selectedPercent} onChange={setSelectedPercent} />
              <div className="rounded-2xl bg-secondary/60 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <MetricPill label="Current" value={formatMoney(currency, currentPrice)} />
                  <MetricPill label="New price" value={formatMoney(currency, rule.selectedMarkdownPrice)} />
                  <MetricPill label="Role" value={rule.approvalRoleRequired} />
                  <MetricPill label="Risk" value={rule.riskLevel} />
                </div>
                <p className="mt-3 text-xs font-bold leading-snug text-muted-foreground">{rule.ruleSummary}</p>
                {rule.blockedReason && <p className="mt-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-black text-destructive">{rule.blockedReason}</p>}
              </div>
              <TextInputField label="Notes" value={notes} onChange={setNotes} placeholder="Optional approval context" />
            </SectionCard>

            <StickyActions leftLabel="Clear Item" rightLabel={staleCacheBlocking ? "Refresh Cache" : "Create Request"} onLeft={resetItem} onRight={staleCacheBlocking ? cacheStatus.refresh : createRequest} rightDisabled={cacheStatus.refreshing} />
          </>
        ) : (
          <SectionCard className="border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <ScanLine className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-black leading-tight text-foreground">Ready to markdown</p>
                <p className="mt-1 text-sm font-bold leading-snug text-muted-foreground">Scan an item, choose the markdown, then create an approval request.</p>
              </div>
            </div>
          </SectionCard>
        )}

        <SectionCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Approval Queue</p>
              <h2 className="mt-1 text-lg font-black text-foreground">{requests.length} request{requests.length === 1 ? "" : "s"}</h2>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <Printer className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {requests.length ? requests.slice(0, 6).map((request) => <QueueCard key={request.requestId} request={request} />) : <EmptyState title="Queue empty" helper="Scan an item and create a markdown request." />}
          </div>
        </SectionCard>

        <SectionCard className="space-y-2">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <RotateCcw className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-foreground">Markdown stays approval-led</p>
              <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">This handheld workflow creates markdown requests and label readiness only. Inventory Desktop and POS remain the authoritative price layers.</p>
            </div>
          </div>
        </SectionCard>
      </WorkflowMain>
    </PageShell>
  );
}
