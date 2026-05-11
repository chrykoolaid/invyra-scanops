import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import { BatchList, DoneCard, EmptyState, InfoLine, ItemSummaryCard, MetricPill, PageShell, QuantityStepper, SectionCard, StickyActions, TextInputField, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { calculateVariance, createCountSession, getSessionVarianceSummary, STOCK_COUNT_AREA_OPTIONS, STOCK_COUNT_MODE_OPTIONS, STOCK_COUNT_TYPES, STOCK_COUNT_TYPE_OPTIONS, STOCK_COUNT_VARIANCE_REASONS } from "../lib/scanOpsStockCount";
import { makeWorkflowBatchItem, removeWorkflowBatchItem } from "../lib/scanOpsWorkflowBatch";

function findProduct(input) {
  if (!input) return null;
  return typeof input === "object" ? input : resolveInventoryIdentity(String(input || "").trim());
}

function itemKey(line) {
  return line.item?.itemId || line.item?.raw?.internalItemId || line.item?.raw?.id || line.item?.raw?.sku || line.item?.raw?.barcode;
}

function upsertCountLine(current, nextLine) {
  const key = itemKey(nextLine);
  const exists = current.some((line) => itemKey(line) === key);
  return exists
    ? current.map((line) => itemKey(line) === key ? { ...line, ...nextLine, batchItemId: line.batchItemId, createdAt: line.createdAt } : line)
    : [nextLine, ...current];
}

function getOptionLabel(options, value) {
  return options.find((option) => option.id === value)?.label || options.find((option) => option.id === value)?.title || value;
}

function CountTypeButton({ option, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 rounded-2xl border px-3 py-3 text-left active:scale-[0.99] ${selected ? "border-primary bg-primary/10" : "border-border bg-secondary/50"}`}
    >
      <span className="block text-sm font-black text-foreground">{option.title}</span>
      <span className="mt-1 block text-xs font-semibold leading-snug text-muted-foreground">{option.caption}</span>
    </button>
  );
}

function SessionSummary({ session, countType, area, countMode, lines }) {
  const summary = getSessionVarianceSummary(lines);
  return (
    <SectionCard className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <MetricPill label="Items" value={summary.countedItems} />
        <MetricPill label="Variances" value={summary.varianceItems} />
        <MetricPill label="Net diff" value={summary.totalVariance} />
      </div>
      <div className="space-y-2">
        <InfoLine label="Count type" value={getOptionLabel(STOCK_COUNT_TYPE_OPTIONS, countType)} />
        <InfoLine label="Area" value={getOptionLabel(STOCK_COUNT_AREA_OPTIONS, area)} />
        <InfoLine label="Mode" value={getOptionLabel(STOCK_COUNT_MODE_OPTIONS, countMode)} />
        {session?.count_session_id && <InfoLine label="Session" value={session.count_session_id.replace("count_session_", "")} />}
      </div>
    </SectionCard>
  );
}

function ReviewLine({ line, onReasonChange, onRemove }) {
  const variance = Number(line.variance || 0);
  const unit = line.item?.unit || "each";
  const varianceReasonId = line.varianceReasonId || "shelf_empty_unknown";
  return (
    <SectionCard className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-foreground">{line.item?.itemName || "Scanned item"}</p>
          <p className="mt-1 text-xs font-bold text-muted-foreground">Expected {line.expectedQuantity} · Counted {line.countedQuantity} · Diff {variance}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${variance === 0 ? "bg-secondary text-muted-foreground" : "bg-primary/10 text-primary"}`}>
          {variance === 0 ? "Matched" : "Variance"}
        </span>
      </div>
      {variance !== 0 && (
        <TouchSelect
          label="Variance reason"
          value={varianceReasonId}
          onChange={(nextReason) => onReasonChange(line.batchItemId, nextReason)}
          options={STOCK_COUNT_VARIANCE_REASONS}
        />
      )}
      <div className="grid grid-cols-3 gap-2">
        <MetricPill label="Expected" value={line.expectedQuantity} suffix={unit} />
        <MetricPill label="Counted" value={line.countedQuantity} suffix={unit} />
        <MetricPill label="Diff" value={variance} suffix={unit} />
      </div>
      <button type="button" onClick={() => onRemove(line.batchItemId)} className="min-h-9 rounded-xl bg-secondary px-3 text-xs font-black text-muted-foreground active:bg-border">
        Remove line
      </button>
    </SectionCard>
  );
}

export default function StockCount() {
  const navigate = useNavigate();
  const location = useLocation();
  const taskParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [scanValue, setScanValue] = useState("");
  const [view, setView] = useState("setup");
  const [countType, setCountType] = useState(() => taskParams.get("countType") || STOCK_COUNT_TYPES.QUICK_COUNT);
  const [area, setArea] = useState(() => taskParams.get("area") || "dairy_chilled");
  const [countMode, setCountMode] = useState(() => taskParams.get("countMode") || "unguided_scan_count");
  const [session, setSession] = useState(null);
  const [item, setItem] = useState(null);
  const [counted, setCounted] = useState(1);
  const [reason, setReason] = useState("shelf_empty_unknown");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState([]);
  const expected = Number(item?.stockOnHand ?? item?.stock_on_hand ?? item?.shelfStock ?? item?.shelf_stock ?? 0);
  const variance = useMemo(() => calculateVariance(expected, Number(counted || 0)), [expected, counted]);
  const unit = item?.unitType || item?.unit_type || "each";
  const reasonLabel = getOptionLabel(STOCK_COUNT_VARIANCE_REASONS, reason);
  const summary = getSessionVarianceSummary(lines);
  const selectedType = STOCK_COUNT_TYPE_OPTIONS.find((option) => option.id === countType) || STOCK_COUNT_TYPE_OPTIONS[0];
  const showSearch = view === "counting";

  const resetSession = () => {
    setScanValue("");
    setView("setup");
    setSession(null);
    setItem(null);
    setCounted(1);
    setReason("shelf_empty_unknown");
    setNote("");
    setLines([]);
  };

  const start = () => {
    const nextSession = createCountSession(countType, {
      count_area: area,
      count_mode: countMode,
      count_type_label: getOptionLabel(STOCK_COUNT_TYPE_OPTIONS, countType),
      count_area_label: getOptionLabel(STOCK_COUNT_AREA_OPTIONS, area),
      count_mode_label: getOptionLabel(STOCK_COUNT_MODE_OPTIONS, countMode),
    });
    setSession(nextSession);
    setView("counting");
    createScanOpsEvent(SCANOPS_EVENT_TYPES.STOCK_COUNT_SESSION_STARTED, {
      source_module: "Stock Count",
      count_session_id: nextSession.count_session_id,
      count_type: countType,
      count_type_label: nextSession.count_type_label,
      count_area: area,
      count_area_label: nextSession.count_area_label,
      count_mode: countMode,
      count_mode_label: nextSession.count_mode_label,
      status: "in_progress",
      applies_stock_directly: false,
      sync_exempt: true,
    });
  };

  const scan = (value) => {
    const found = findProduct(value);
    if (!found) return;
    setItem(found);
    setCounted(Number(found?.stockOnHand ?? found?.stock_on_hand ?? found?.shelfStock ?? found?.shelf_stock ?? 1));
    setReason("shelf_empty_unknown");
    setNote("");
  };

  const saveLine = () => {
    if (!item || !session) return;
    const isVariance = Number(variance || 0) !== 0;
    const line = makeWorkflowBatchItem({
      workflowType: "stock_count",
      item,
      quantity: counted,
      reason: isVariance ? reasonLabel : "Matched",
      meta: {
        countSessionId: session.count_session_id,
        countType,
        countTypeLabel: getOptionLabel(STOCK_COUNT_TYPE_OPTIONS, countType),
        countArea: area,
        countAreaLabel: getOptionLabel(STOCK_COUNT_AREA_OPTIONS, area),
        countMode,
        countModeLabel: getOptionLabel(STOCK_COUNT_MODE_OPTIONS, countMode),
        expectedQuantity: expected,
        countedQuantity: Number(counted || 0),
        variance,
        varianceReasonId: isVariance ? reason : null,
        varianceReasonLabel: isVariance ? reasonLabel : null,
        note,
        reviewStatus: isVariance ? "variance_review_required" : "matched",
      },
    });
    setLines((current) => upsertCountLine(current, line));
    createScanOpsEvent(isVariance ? SCANOPS_EVENT_TYPES.STOCK_COUNT_VARIANCE_REVIEW_REQUIRED : SCANOPS_EVENT_TYPES.STOCK_COUNT_LINE_SAVED, {
      source_module: "Stock Count",
      count_session_id: session.count_session_id,
      count_type: countType,
      count_area: area,
      count_mode: countMode,
      item_name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      plu: item.plu || item.scaleCode,
      match_reason: item._searchMatch?.displayReason || null,
      expected_quantity: expected,
      counted_quantity: Number(counted || 0),
      variance_quantity: variance,
      variance_reason: isVariance ? reason : null,
      variance_reason_label: isVariance ? reasonLabel : null,
      note,
      applies_stock_directly: false,
      status: isVariance ? "variance_review_required" : "line_saved",
    });
    setItem(null);
    setScanValue("");
    setNote("");
  };

  const updateReviewReason = (batchItemId, nextReason) => {
    const nextLabel = getOptionLabel(STOCK_COUNT_VARIANCE_REASONS, nextReason);
    setLines((current) => current.map((line) => line.batchItemId === batchItemId ? {
      ...line,
      reason: nextLabel,
      varianceReasonId: nextReason,
      varianceReasonLabel: nextLabel,
      reviewStatus: "variance_reason_confirmed",
    } : line));
  };

  const submit = () => {
    if (!lines.length || !session) return;
    const nextSummary = getSessionVarianceSummary(lines);
    createScanOpsEvent(SCANOPS_EVENT_TYPES.STOCK_COUNT_SUBMITTED, {
      source_module: "Stock Count",
      count_session_id: session.count_session_id,
      count_type: countType,
      count_area: area,
      count_mode: countMode,
      counted_items: nextSummary.countedItems,
      variance_items: nextSummary.varianceItems,
      total_variance: nextSummary.totalVariance,
      applies_stock_directly: false,
      status: "submitted_for_review",
      submission_type: "count_evidence_only",
    });
    setView("submitted");
  };

  const renderSetup = () => (
    <>
      <SectionCard className="space-y-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Count type</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {STOCK_COUNT_TYPE_OPTIONS.map((option) => (
              <CountTypeButton key={option.id} option={option} selected={countType === option.id} onClick={() => setCountType(option.id)} />
            ))}
          </div>
        </div>
        <TouchSelect label="Area / location" value={area} onChange={setArea} options={STOCK_COUNT_AREA_OPTIONS} />
        <TouchSelect label="Count mode" value={countMode} onChange={setCountMode} options={STOCK_COUNT_MODE_OPTIONS} />
      </SectionCard>
      <SectionCard>
        <p className="text-sm font-black text-foreground">{selectedType.title}</p>
        <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">{selectedType.helper}</p>
        <div className="mt-3 space-y-2">
          <InfoLine label="Result" value="Creates count evidence only" />
          <InfoLine label="Stock mutation" value="No direct adjustment" />
        </div>
      </SectionCard>
      <StickyActions leftLabel="Back" rightLabel="Start Count" onLeft={() => navigate(-1)} onRight={start} />
    </>
  );

  const renderCounting = () => (
    <>
      <SessionSummary session={session} countType={countType} area={area} countMode={countMode} lines={lines} />
      {!item && <EmptyState title="No item selected." helper={lines.length ? "Scan another item or review the count." : ""} />}
      {item && (
        <>
          <ItemSummaryCard item={item}>
            <div className="grid grid-cols-2 gap-2">
              <MetricPill label="Expected" value={expected} suffix={unit} />
              <MetricPill label="Area" value={getOptionLabel(STOCK_COUNT_AREA_OPTIONS, area)} />
            </div>
          </ItemSummaryCard>
          <SectionCard className="space-y-3">
            <QuantityStepper label="Counted quantity" value={counted} onChange={setCounted} unit={unit} min={0} />
            <div className="rounded-2xl bg-secondary/60 p-3 space-y-2">
              <InfoLine label="Expected" value={`${expected} ${unit}`} />
              <InfoLine label="Counted" value={`${counted} ${unit}`} />
              <InfoLine label="Difference" value={`${variance ?? 0} ${unit}`} />
            </div>
            {variance !== 0 && <TouchSelect label="Variance reason" value={reason} onChange={setReason} options={STOCK_COUNT_VARIANCE_REASONS} />}
            <TextInputField label="Note" value={note} onChange={setNote} placeholder="Optional count note" />
          </SectionCard>
        </>
      )}
      <BatchList
        title="Current count"
        items={lines}
        emptyText="Current count is empty."
        renderMeta={(line) => `Expected ${line.expectedQuantity} · Counted ${line.countedQuantity} · Diff ${line.variance ?? 0}${line.varianceReasonLabel ? ` · ${line.varianceReasonLabel}` : ""}`}
        onRemove={(id) => setLines((current) => removeWorkflowBatchItem(current, id))}
      />
      <StickyActions
        leftLabel={item ? "Cancel Item" : "Reset"}
        rightLabel={item ? "Save Count" : "Review Count"}
        onLeft={() => item ? setItem(null) : resetSession()}
        onRight={item ? saveLine : () => setView("review")}
        rightDisabled={item ? false : !lines.length}
      />
    </>
  );

  const renderReview = () => (
    <>
      <SessionSummary session={session} countType={countType} area={area} countMode={countMode} lines={lines} />
      <SectionCard className="space-y-2">
        <p className="text-sm font-black text-foreground">Review Count</p>
        <p className="text-xs font-semibold leading-snug text-muted-foreground">{summary.countedItems} items · {summary.varianceItems} variance lines · submit evidence only.</p>
      </SectionCard>
      {lines.length ? (
        <div className="space-y-3">
          {lines.map((line) => (
            <ReviewLine
              key={line.batchItemId}
              line={line}
              onReasonChange={updateReviewReason}
              onRemove={(id) => setLines((current) => removeWorkflowBatchItem(current, id))}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="Current count is empty." />
      )}
      <StickyActions leftLabel="Back to Count" rightLabel="Submit Evidence" onLeft={() => setView("counting")} onRight={submit} rightDisabled={!lines.length} />
    </>
  );

  const renderSubmitted = () => (
    <>
      <DoneCard
        title="Count evidence submitted"
        helper="Submitted for review only. Stock is not adjusted by the handheld."
        rows={[
          { label: "Items counted", value: summary.countedItems },
          { label: "Variance lines", value: summary.varianceItems },
          { label: "Net difference", value: summary.totalVariance },
        ]}
      />
      <BatchList
        title="Submitted count"
        items={lines}
        emptyText="No submitted lines."
        renderMeta={(line) => `Expected ${line.expectedQuantity} · Counted ${line.countedQuantity} · Diff ${line.variance ?? 0}${line.varianceReasonLabel ? ` · ${line.varianceReasonLabel}` : ""}`}
      />
      <StickyActions leftLabel="Review" rightLabel="New Count" onLeft={() => setView("review")} onRight={resetSession} />
    </>
  );

  return (
    <PageShell>
      <WorkflowHeader
        title="Stock Count"
        subtitle={view === "setup" ? "Setup count session" : view === "review" ? "Review count evidence" : view === "submitted" ? "Submitted for review" : "Count stock by scan or search"}
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={scan}
        showSearch={showSearch}
      />
      <WorkflowMain>
        {view === "setup" && renderSetup()}
        {view === "counting" && renderCounting()}
        {view === "review" && renderReview()}
        {view === "submitted" && renderSubmitted()}
      </WorkflowMain>
    </PageShell>
  );
}
