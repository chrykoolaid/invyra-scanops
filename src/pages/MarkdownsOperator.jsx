import React, { useEffect, useMemo, useRef, useState } from "react";
import { BadgePercent, CheckCircle2, Printer, ScanLine, Tag } from "lucide-react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import PageHeader from "../components/scanner/PageHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import {
  ItemSummaryCard,
  MetricPill,
  OperatorAlert,
  PageShell,
  SectionCard,
  StickyActions,
  TextInputField,
  WorkflowMain,
} from "../components/scanner/WorkflowPrimitives";
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
  getMarkdownScheduleForItem,
  retryMarkdownPrint,
  submitMarkdownAndPrint,
} from "../lib/scanOpsMarkdownLifecycle";
import { MARKDOWN_STAGES, validateMarkdownInput } from "../lib/scanOpsMarkdownPolicy";

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

function calculateMarkdownPrice(currentPrice, percent) {
  const price = Number(currentPrice);
  const markdownPercent = Number(percent);
  if (!Number.isFinite(price) || !Number.isFinite(markdownPercent)) return null;
  return Number(Math.max(0, price * (1 - markdownPercent / 100)).toFixed(2));
}

function labelCopies(quantity, quantityType) {
  if (["weight", "volume", "length"].includes(String(quantityType || "").toLowerCase())) return 1;
  return Math.max(1, Math.ceil(Number(quantity || 1)));
}

export default function MarkdownsOperator() {
  const governance = useScanOpsGovernanceContext();
  const cacheStatus = useInventoryCacheStatus();
  const staleCacheBlocking = isStaleCacheBlockingForPriceSensitiveWorkflow(cacheStatus);
  const markdownSubmitPermission = canPerformScanOpsAction(GOVERNED_ACTIONS.MARKDOWN_SUBMIT, governance);
  const submitTokenRef = useRef(null);

  const [scanValue, setScanValue] = useState("");
  const [item, setItem] = useState(null);
  const [reason, setReason] = useState("short_dated");
  const [selectedPercent, setSelectedPercent] = useState("25");
  const [quantity, setQuantity] = useState("1");
  const [expiryDate, setExpiryDate] = useState("");
  const [batchLot, setBatchLot] = useState("");
  const [quantityType, setQuantityType] = useState("each");
  const [operatorError, setOperatorError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [printFailure, setPrintFailure] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const currentPrice = getCurrentPriceSnapshot(item);
  const currency = getCurrencySymbol(item) || "₱";
  const markdownPrice = useMemo(() => calculateMarkdownPrice(currentPrice, selectedPercent), [currentPrice, selectedPercent]);
  const saving = useMemo(() => {
    if (!Number.isFinite(Number(currentPrice)) || !Number.isFinite(Number(markdownPrice))) return null;
    return Number((Number(currentPrice) - Number(markdownPrice)).toFixed(2));
  }, [currentPrice, markdownPrice]);
  const copies = labelCopies(quantity, quantityType);
  const schedule = useMemo(() => getMarkdownScheduleForItem({ item, batchLot, expiryDate }), [item, batchLot, expiryDate]);
  const editingLocked = Boolean(printFailure) || submitting;

  useEffect(() => {
    ensureInventoryLoaded();
  }, []);

  useEffect(() => {
    if (!item || !expiryDate || editingLocked) return;
    if (!selectedPercent || selectedPercent === "25" || selectedPercent === "50" || selectedPercent === "60") {
      setSelectedPercent(String(schedule.suggestedPercent || 25));
    }
  }, [item, expiryDate, schedule.suggestedPercent, editingLocked]);

  const scan = (value) => {
    if (printFailure) {
      setOperatorError({
        title: "Printing still required",
        helper: "Retry the existing label print before scanning another item. The markdown record is already saved.",
        tone: "danger",
      });
      return;
    }

    const input = typeof value === "object" ? primaryScanValue(value) : String(value || "").trim();
    const found = typeof value === "object" ? value : resolveInventoryIdentity(input);
    if (!found) {
      setOperatorError({ title: "Item not found", helper: "Scan again or use barcode, SKU, PLU, or item name." });
      setLastSaved(null);
      return;
    }
    const defaultExpiry = getDefaultExpiryDate(found);
    const defaultBatch = getDefaultLotBatch(found);
    const initialSchedule = getMarkdownScheduleForItem({ item: found, batchLot: defaultBatch, expiryDate: defaultExpiry });
    setOperatorError(null);
    setLastSaved(null);
    setPrintFailure(null);
    setItem(found);
    setScanValue(primaryScanValue(found));
    setReason(found?.markdownEligible === false ? "manager_instruction" : "short_dated");
    setSelectedPercent(String(initialSchedule.suggestedPercent || 25));
    setQuantity("1");
    setExpiryDate(defaultExpiry);
    setBatchLot(defaultBatch);
    setQuantityType(getDefaultQuantityType(found));
    submitTokenRef.current = null;
  };

  const resetItem = () => {
    if (printFailure || submitting) return;
    setItem(null);
    setScanValue("");
    setQuantity("1");
    setOperatorError(null);
    setPrintFailure(null);
    submitTokenRef.current = null;
  };

  const completeSuccessfulPrint = (record) => {
    setLastSaved(record);
    setPrintFailure(null);
    setItem(null);
    setScanValue("");
    setQuantity("1");
    setOperatorError(null);
    submitTokenRef.current = null;
  };

  const submit = async () => {
    if (!item) {
      setOperatorError({ title: "Item required", helper: "Scan an item before submitting a markdown." });
      return;
    }
    if (!reason) {
      setOperatorError({ title: "Reason required", helper: "Choose a markdown reason before submitting." });
      return;
    }

    const inputValidation = validateMarkdownInput({
      quantity,
      percent: selectedPercent,
      expiryDate,
      batchLot,
    });
    if (!inputValidation.valid) {
      setOperatorError({
        title: "Check markdown details",
        helper: inputValidation.errors[0].message,
        tone: "danger",
      });
      return;
    }

    if (!Number.isFinite(Number(currentPrice)) || Number(currentPrice) < 0) {
      setOperatorError({
        title: "Current price required",
        helper: "Refresh the authoritative item record before creating a markdown label.",
        tone: "danger",
      });
      return;
    }
    if (staleCacheBlocking) {
      setOperatorError({ title: "Inventory cache stale", helper: "Refresh the inventory cache before submitting this price-sensitive markdown.", tone: "danger" });
      return;
    }
    if (!markdownSubmitPermission.allowed) {
      recordGovernedAction(GOVERNED_ACTIONS.MARKDOWN_SUBMIT, "Markdowns", null, markdownSubmitPermission);
      setOperatorError({ title: "Permission required", helper: markdownSubmitPermission.reason || "This markdown action is blocked for the current role." });
      return;
    }
    if (schedule.stage === MARKDOWN_STAGES.EXPIRED) {
      setOperatorError({ title: "Expired batch — sale blocked", helper: schedule.helper, tone: "danger" });
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
      source: "markdown_operator_direct_submit_v2",
    });
    saveWorkflowItemAttributeSnapshot(attributeSnapshot);

    if (!submitTokenRef.current) submitTokenRef.current = `markdown_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setSubmitting(true);
    setOperatorError(null);
    setPrintFailure(null);

    let result;
    try {
      result = await submitMarkdownAndPrint({
        item,
        quantity,
        quantityType,
        expiryDate,
        batchLot,
        reasonCode: reason,
        selectedMarkdownPercent: selectedPercent,
        attributeSnapshot,
        idempotencyKey: submitTokenRef.current,
      });
    } catch (error) {
      setOperatorError({
        title: "Markdown could not be submitted",
        helper: error?.message || "An unexpected error interrupted the markdown workflow.",
        tone: "danger",
      });
      return;
    } finally {
      setSubmitting(false);
    }

    if (result.record?.submissionId) {
      recordGovernedAction(GOVERNED_ACTIONS.MARKDOWN_SUBMIT, "Markdowns", result.record.submissionId, markdownSubmitPermission, {
        eventLabel: "Markdown submitted for immediate label printing",
      });
    }

    if (!result.ok) {
      if (result.record?.submissionId && result.record?.printStatus === "PRINT_FAILED") {
        setPrintFailure(result.record);
        setOperatorError({ title: "Labels could not be printed", helper: result.message || result.record.printErrorMessage, tone: "danger" });
      } else {
        setOperatorError({ title: result.code === "EXPIRED_BATCH_SALE_BLOCKED" ? "Expired batch — sale blocked" : "Markdown could not be submitted", helper: result.message, tone: "danger" });
      }
      return;
    }
    completeSuccessfulPrint(result.record);
  };

  const retryPrint = async () => {
    if (!printFailure?.submissionId || submitting) return;
    setSubmitting(true);
    setOperatorError(null);
    try {
      const result = await retryMarkdownPrint(printFailure.submissionId);
      if (!result.ok) {
        setPrintFailure(result.record || printFailure);
        setOperatorError({ title: "Labels could not be printed", helper: result.message || result.record?.printErrorMessage, tone: "danger" });
        return;
      }
      completeSuccessfulPrint(result.record);
    } catch (error) {
      setOperatorError({ title: "Labels could not be printed", helper: error?.message || "The print retry failed.", tone: "danger" });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePercentChange = (value) => {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 2);
    setSelectedPercent(digits);
  };

  return (
    <PageShell unthemed>
      <PageHeader title="Markdown" subtitle="Scan item, enter markdown, print labels" />
      <WorkflowHeader
        title="Markdown"
        subtitle="Scan → details → submit → labels print"
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
            helper="Markdown pricing depends on current inventory data. Refresh the cache before submitting."
            tone="danger"
            actions={[{ label: "Refresh Cache", onClick: cacheStatus.refresh, variant: "primary" }]}
          />
        )}
        {operatorError && (
          <OperatorAlert
            title={operatorError.title}
            helper={operatorError.helper}
            tone={operatorError.tone || "warning"}
            actions={printFailure ? [{ label: submitting ? "Printing…" : "Retry Printing", onClick: retryPrint, variant: "primary", disabled: submitting }] : [{ label: "Keep Editing", onClick: () => setOperatorError(null), variant: "primary" }]}
          />
        )}
        {lastSaved && (
          <OperatorAlert
            tone="success"
            title="Markdown submitted"
            helper={`${lastSaved.printedCopies || lastSaved.labelCopies || 1} label${Number(lastSaved.printedCopies || lastSaved.labelCopies || 1) === 1 ? "" : "s"} printed. Product Master and POS base prices remain unchanged.`}
          />
        )}

        {item ? (
          <>
            <ItemSummaryCard item={item}>
              <div className="grid grid-cols-3 gap-2">
                <MetricPill label="Current" value={formatMoney(currency, currentPrice)} />
                <MetricPill label="New" value={formatMoney(currency, markdownPrice)} />
                <MetricPill label="Qty" value={quantity || "—"} />
              </div>
            </ItemSummaryCard>

            <fieldset disabled={editingLocked} className="contents">
              <SectionCard className="space-y-3 disabled:opacity-70">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Tag className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Markdown Request</p>
                    <h2 className="mt-1 text-base font-black text-foreground">{itemName(item)}</h2>
                    <p className="mt-1 text-xs font-bold text-muted-foreground">Batch-linked label price only. Product Master and POS base prices stay unchanged.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <TextInputField label="Quantity" value={quantity} onChange={setQuantity} type="number" placeholder="1" />
                  <TextInputField label="Expiry" value={expiryDate} onChange={setExpiryDate} type="date" />
                </div>
                <TextInputField label="Batch / lot" value={batchLot} onChange={setBatchLot} placeholder="Required" />
                <TouchSelect label="Reason" value={reason} onChange={setReason} options={MARKDOWN_REASON_OPTIONS} />
              </SectionCard>

              <SectionCard className="space-y-3 disabled:opacity-70">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <BadgePercent className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Markdown Percent</p>
                    <div className="mt-2 flex items-center rounded-2xl border border-input bg-background px-4 focus-within:ring-2 focus-within:ring-primary/20">
                      <input
                        value={selectedPercent}
                        onChange={(event) => handlePercentChange(event.target.value)}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        aria-label="Markdown percentage"
                        className="h-16 min-w-0 flex-1 bg-transparent text-3xl font-black text-foreground outline-none"
                        placeholder="25"
                      />
                      <span className="text-2xl font-black text-muted-foreground">%</span>
                    </div>
                    <p className="mt-2 text-xs font-bold text-muted-foreground">{schedule.helper}</p>
                    {schedule.holidayAdjusted && (
                      <p className="mt-1 rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-300">Holiday-adjusted · final sellable trading day {schedule.finalSellableDate}</p>
                    )}
                    {schedule.reducedHoursAdjusted && (
                      <p className="mt-1 rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-300">Reduced-hours sessions · {schedule.effectiveEarlySessionTime} and {schedule.effectiveFinalSessionTime}</p>
                    )}
                    {schedule.insufficientSessionWindow && (
                      <p className="mt-1 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-black text-destructive">Accelerated markdown required · insufficient trading time remains for normal session spacing.</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <MetricPill label="Current" value={formatMoney(currency, currentPrice)} />
                  <MetricPill label="New price" value={formatMoney(currency, markdownPrice)} />
                  <MetricPill label="Saving" value={formatMoney(currency, saving)} />
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-secondary/60 px-3 py-3 text-xs font-bold text-muted-foreground">
                  <Printer className="h-4 w-4 shrink-0" />
                  Submit prints {copies} label{copies === 1 ? "" : "s"} automatically. A failed print stays on this screen and retries the same submission.
                </div>
              </SectionCard>
            </fieldset>

            <StickyActions
              leftLabel={printFailure ? "Print Pending" : "Clear Item"}
              rightLabel={submitting ? "Printing…" : printFailure ? "Retry Printing" : "Submit"}
              onLeft={resetItem}
              onRight={printFailure ? retryPrint : submit}
              leftDisabled={editingLocked}
              rightDisabled={submitting || cacheStatus.refreshing}
            />
          </>
        ) : (
          <SectionCard className="border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <ScanLine className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-black leading-tight text-foreground">Ready to markdown</p>
                <p className="mt-1 text-sm font-bold leading-snug text-muted-foreground">Scan an item, confirm its batch and expiry, enter the percentage, then submit.</p>
              </div>
            </div>
          </SectionCard>
        )}

        <SectionCard>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-foreground">D-1 batch lifecycle</p>
              <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">Initial 25% on the previous open trading day, 50% early on the final sellable day, 60% later that day, then a hard sale block after expiry. Closed and reduced-hours dates come from the location trading calendar.</p>
            </div>
          </div>
        </SectionCard>
      </WorkflowMain>
    </PageShell>
  );
}
