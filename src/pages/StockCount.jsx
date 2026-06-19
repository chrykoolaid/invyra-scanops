import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import AttributeEvidenceFields from "../components/scanner/AttributeEvidenceFields";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import PageHeader from "../components/scanner/PageHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import { DoneCard, EmptyState, FieldError, InfoLine, ItemSummaryCard, MetricPill, OperatorAlert, PageShell, QuantityStepper, SectionCard, StickyActions, TextInputField, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import {
  buildWorkflowItemAttributeSnapshot,
  COUNT_CONDITION_NOTE_OPTIONS,
  getDefaultExpiryDate,
  getDefaultLotBatch,
  getDefaultQuantityType,
  saveWorkflowItemAttributeSnapshot,
  summarizeAttributeSnapshot,
} from "../lib/scanOpsItemAttributes";
import {
  acceptCountEvidence,
  calculateVariance,
  canApproveCountSession,
  canCloseCountSession,
  canReviewCountSession,
  createCountLine,
  createCountSession,
  deleteCountSessionItem,
  expectedQuantityForItem,
  getCountRecountRequests,
  getCountSessionItems,
  getCountSessions,
  getSessionVarianceSummary,
  isCountSessionReadOnly,
  isSessionVisibleToRole,
  requestCountRecount,
  saveCountItemAttributeSnapshot,
  setCountSessionStatus,
  STOCK_COUNT_AREA_OPTIONS,
  STOCK_COUNT_MODE_OPTIONS,
  STOCK_COUNT_STATUSES,
  STOCK_COUNT_TYPES,
  STOCK_COUNT_TYPE_OPTIONS,
  STOCK_COUNT_VARIANCE_REASONS,
  STOCK_COUNT_VARIANCE_STATUSES,
  submitCountRecount,
  upsertCountSession,
  upsertCountSessionItem,
} from "../lib/scanOpsStockCount";
import { useScanOpsSession } from "../lib/scanOpsSession";
import { TASK_DUE_STATES, TASK_PRIORITIES, TASK_TYPES, upsertDerivedTaskFromSource } from "../lib/scanOpsTasks";
import { writeStockCountRecord } from "../lib/scanOpsRecordWriter";

function findProduct(input) {
  if (!input) return null;
  return typeof input === "object" ? input : resolveInventoryIdentity(String(input || "").trim());
}

function getOptionLabel(options, value) {
  return options.find((option) => option.id === value)?.label || options.find((option) => option.id === value)?.title || value;
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return value;
  }
}

function lineName(line) {
  return line.item_snapshot?.name || line.item_name || "Scanned item";
}

function lineUnit(line) {
  return line.item_snapshot?.unit_type || line.unit_type || line.unitType || "each";
}

function lineIdentity(line) {
  return [line.sku && `SKU ${line.sku}`, line.barcode && `Barcode ${line.barcode}`, line.plu && `PLU ${line.plu}`].filter(Boolean).join(" · ");
}

function expectedLabel(value, unit = "each") {
  return value === null || value === undefined ? "Expected unavailable" : `${value} ${unit}`;
}

function statusTone(status) {
  if ([STOCK_COUNT_STATUSES.APPROVED, STOCK_COUNT_STATUSES.CLOSED, STOCK_COUNT_VARIANCE_STATUSES.ACCEPTED, STOCK_COUNT_VARIANCE_STATUSES.NO_VARIANCE].includes(status)) return "bg-accent/10 text-accent";
  if ([STOCK_COUNT_STATUSES.RECOUNT_REQUIRED, STOCK_COUNT_VARIANCE_STATUSES.RECOUNT_REQUESTED].includes(status)) return "bg-destructive/10 text-destructive";
  if ([STOCK_COUNT_STATUSES.REVIEW_REQUIRED, STOCK_COUNT_STATUSES.SUBMITTED, STOCK_COUNT_VARIANCE_STATUSES.REVIEW_REQUIRED, STOCK_COUNT_VARIANCE_STATUSES.EXPECTED_UNAVAILABLE].includes(status)) return "bg-primary/10 text-primary";
  if ([STOCK_COUNT_STATUSES.CANCELLED, STOCK_COUNT_VARIANCE_STATUSES.REJECTED].includes(status)) return "bg-secondary text-muted-foreground";
  return "bg-secondary text-muted-foreground";
}

function StatusBadge({ value }) {
  return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${statusTone(value)}`}>{value}</span>;
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

function SessionMetrics({ lines }) {
  const summary = getSessionVarianceSummary(lines);
  return (
    <div className="grid grid-cols-3 gap-2">
      <MetricPill label="Items" value={summary.countedItems} />
      <MetricPill label="Variances" value={summary.varianceItems} />
      <MetricPill label="Recounts" value={summary.recountRequired} />
    </div>
  );
}

function SessionHeaderCard({ session, lines }) {
  const summary = getSessionVarianceSummary(lines);
  return (
    <SectionCard className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-base font-black leading-tight text-foreground">{session?.session_name || "Stock Count Session"}</p>
          <p className="mt-1 text-xs font-bold text-muted-foreground">{session?.area_label || session?.count_area_label || "Area"} · {session?.department || "Department"}</p>
        </div>
        <StatusBadge value={session?.status || STOCK_COUNT_STATUSES.DRAFT} />
      </div>
      <SessionMetrics lines={lines} />
      <div className="space-y-2">
        <InfoLine label="Assigned to" value={session?.assigned_user_name || session?.assigned_user_id || "—"} />
        <InfoLine label="Type" value={session?.count_type_label || "Quick Count"} />
        <InfoLine label="Mode" value={session?.count_mode_label || "Unguided scan count"} />
        <InfoLine label="Stock mutation" value="No direct adjustment" />
        {summary.totalVariance !== 0 && <InfoLine label="Net diff" value={summary.totalVariance} />}
      </div>
    </SectionCard>
  );
}

function SessionCard({ session, lines, onOpen }) {
  const summary = getSessionVarianceSummary(lines);
  const actionLabel = [STOCK_COUNT_STATUSES.DRAFT, STOCK_COUNT_STATUSES.IN_PROGRESS].includes(session.status) ? "Continue Count" : "Open Session";
  return (
    <SectionCard className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-foreground">{session.session_name}</p>
          <p className="mt-1 text-xs font-bold text-muted-foreground">{session.area_label || session.count_area_label} · {session.department || "Store"}</p>
        </div>
        <StatusBadge value={session.status} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MetricPill label="Items" value={summary.countedItems} />
        <MetricPill label="Variances" value={summary.varianceItems} />
        <MetricPill label="Recount" value={summary.recountRequired} />
      </div>
      <div className="space-y-2">
        <InfoLine label="Assigned" value={session.assigned_user_name || session.assigned_user_id || "—"} />
        <InfoLine label="Updated" value={formatDateTime(session.submitted_at || session.started_at || session.created_at)} />
      </div>
      <button type="button" onClick={() => onOpen(session)} className="min-h-11 w-full rounded-2xl bg-primary px-3 text-sm font-black text-primary-foreground active:scale-[0.98]">
        {actionLabel}
      </button>
    </SectionCard>
  );
}

function CountLineSummaryCard({ line, onRemove = null, editable = false }) {
  const unit = lineUnit(line);
  const variance = line.variance_quantity ?? line.variance;
  return (
    <SectionCard className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-foreground">{lineName(line)}</p>
          {lineIdentity(line) && <p className="mt-1 break-all font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{lineIdentity(line)}</p>}
          {line.attribute_snapshot && <p className="mt-1 break-words text-xs font-semibold text-muted-foreground">{summarizeAttributeSnapshot(line.attribute_snapshot)}</p>}
        </div>
        <StatusBadge value={line.variance_status || STOCK_COUNT_VARIANCE_STATUSES.NO_VARIANCE} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MetricPill label="Expected" value={line.expected_quantity == null ? "—" : line.expected_quantity} suffix={line.expected_quantity == null ? "" : unit} />
        <MetricPill label="Counted" value={line.counted_quantity} suffix={unit} />
        <MetricPill label="Diff" value={variance == null ? "—" : variance} suffix={variance == null ? "" : unit} />
      </div>
      {line.evidence_note && <InfoLine label="Note" value={line.evidence_note} />}
      {editable && onRemove && (
        <button type="button" onClick={() => onRemove(line.id || line.count_line_id)} className="min-h-9 rounded-xl bg-secondary px-3 text-xs font-black text-muted-foreground active:bg-border">
          Remove line
        </button>
      )}
    </SectionCard>
  );
}

function RecountEntry({ line, onSubmit }) {
  const [quantity, setQuantity] = useState(Number(line.counted_quantity || 0));
  const [note, setNote] = useState("");
  const unit = lineUnit(line);
  return (
    <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-3 space-y-3">
      <p className="text-xs font-black uppercase tracking-wider text-primary">Recount required</p>
      <div className="grid grid-cols-2 gap-2">
        <MetricPill label="Original" value={line.counted_quantity} suffix={unit} />
        <MetricPill label="Expected" value={line.expected_quantity == null ? "—" : line.expected_quantity} suffix={line.expected_quantity == null ? "" : unit} />
      </div>
      <QuantityStepper label="Recounted" value={quantity} onChange={setQuantity} unit={unit} min={0} />
      <TextInputField label="Evidence note" value={note} onChange={setNote} placeholder="Optional recount note" />
      <button type="button" onClick={() => onSubmit(line, quantity, note)} className="min-h-11 w-full rounded-2xl bg-primary px-3 text-sm font-black text-primary-foreground active:scale-[0.98]">
        Submit Recount
      </button>
    </div>
  );
}

function ReviewLine({ line, canReview, canRecount, onRequestRecount, onAccept, onSubmitRecount }) {
  const unit = lineUnit(line);
  const variance = line.variance_quantity ?? line.variance;
  const recounts = line.recounts || [];
  const reviewable = ![STOCK_COUNT_VARIANCE_STATUSES.NO_VARIANCE, STOCK_COUNT_VARIANCE_STATUSES.ACCEPTED].includes(line.variance_status);
  return (
    <SectionCard className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-foreground">{lineName(line)}</p>
          {lineIdentity(line) && <p className="mt-1 break-all font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{lineIdentity(line)}</p>}
          <p className="mt-1 text-xs font-bold text-muted-foreground">Expected {line.expected_quantity == null ? "unavailable" : line.expected_quantity} · Counted {line.counted_quantity} · Diff {variance == null ? "—" : variance}</p>
        </div>
        <StatusBadge value={line.variance_status || STOCK_COUNT_VARIANCE_STATUSES.NO_VARIANCE} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MetricPill label="Expected" value={line.expected_quantity == null ? "—" : line.expected_quantity} suffix={line.expected_quantity == null ? "" : unit} />
        <MetricPill label="Counted" value={line.counted_quantity} suffix={unit} />
        <MetricPill label="Diff" value={variance == null ? "—" : variance} suffix={variance == null ? "" : unit} />
      </div>
      {line.attribute_snapshot && <p className="break-words rounded-2xl bg-secondary/60 p-3 text-xs font-semibold text-muted-foreground">{summarizeAttributeSnapshot(line.attribute_snapshot)}</p>}
      {line.condition_note && <InfoLine label="Condition" value={getOptionLabel(COUNT_CONDITION_NOTE_OPTIONS, line.condition_note)} />}
      {line.evidence_note && <InfoLine label="Evidence note" value={line.evidence_note} />}
      {recounts.length > 0 && (
        <div className="rounded-2xl bg-secondary/60 p-3 space-y-2">
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Recount evidence</p>
          {recounts.map((entry) => (
            <InfoLine key={entry.id} label={`${entry.recount_quantity} ${unit}`} value={entry.evidence_note || formatDateTime(entry.created_at)} />
          ))}
        </div>
      )}
      {line.variance_status === STOCK_COUNT_VARIANCE_STATUSES.RECOUNT_REQUESTED && canRecount && <RecountEntry line={line} onSubmit={onSubmitRecount} />}
      {canReview && reviewable && line.variance_status !== STOCK_COUNT_VARIANCE_STATUSES.RECOUNT_REQUESTED && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onRequestRecount(line)} className="min-h-10 rounded-xl bg-secondary px-3 text-xs font-black text-secondary-foreground active:bg-border">
            Request Recount
          </button>
          <button type="button" onClick={() => onAccept(line)} className="min-h-10 rounded-xl bg-primary px-3 text-xs font-black text-primary-foreground active:scale-[0.98]">
            Accept Evidence
          </button>
        </div>
      )}
    </SectionCard>
  );
}

export default function StockCount() {
  const location = useLocation();
  const actorSession = useScanOpsSession();
  const taskParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [scanValue, setScanValue] = useState("");
  const [view, setView] = useState("landing");
  const [sessions, setSessions] = useState(() => getCountSessions());
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [lines, setLines] = useState([]);
  const [sessionName, setSessionName] = useState("Morning Count");
  const [countType, setCountType] = useState(() => taskParams.get("countType") || STOCK_COUNT_TYPES.QUICK_COUNT);
  const [area, setArea] = useState(() => taskParams.get("area") || "dairy_chilled");
  const [countMode, setCountMode] = useState(() => taskParams.get("countMode") || "unguided_scan_count");
  const [item, setItem] = useState(null);
  const [counted, setCounted] = useState(1);
  const [reason, setReason] = useState("shelf_empty_unknown");
  const [expiryDate, setExpiryDate] = useState("");
  const [lotBatch, setLotBatch] = useState("");
  const [conditionNote, setConditionNote] = useState("normal");
  const [quantityType, setQuantityType] = useState("each");
  const [enteredWeight, setEnteredWeight] = useState("");
  const [weightSource, setWeightSource] = useState("label_weight");
  const [note, setNote] = useState("");
  const [lastSyncMessage, setLastSyncMessage] = useState("");
  const [operatorError, setOperatorError] = useState(null);
  const [continuousScan, setContinuousScan] = useState(false);

  const activeSession = useMemo(() => sessions.find((entry) => (entry.id || entry.count_session_id) === activeSessionId) || null, [activeSessionId, sessions]);
  const visibleSessions = useMemo(() => sessions.filter((session) => isSessionVisibleToRole(session, actorSession)), [actorSession, sessions]);
  const expected = expectedQuantityForItem(item);
  const variance = useMemo(() => calculateVariance(expected, Number(counted || 0)), [expected, counted]);
  const unit = item?.unitType || item?.unit_type || item?.unit || "each";
  const summary = getSessionVarianceSummary(lines);
  const canReview = canReviewCountSession(actorSession.actorRole);
  const canApprove = canApproveCountSession(actorSession.actorRole, summary);
  const canClose = canCloseCountSession(actorSession.actorRole);
  const sessionReadOnly = isCountSessionReadOnly(activeSession?.status) || ([STOCK_COUNT_STATUSES.SUBMITTED, STOCK_COUNT_STATUSES.REVIEW_REQUIRED].includes(activeSession?.status) && actorSession.actorRole === "Staff");
  const canAddCountEvidence = activeSession && [STOCK_COUNT_STATUSES.DRAFT, STOCK_COUNT_STATUSES.IN_PROGRESS].includes(activeSession.status) && !sessionReadOnly;
  const canSubmitRecount = activeSession?.status === STOCK_COUNT_STATUSES.RECOUNT_REQUIRED && (actorSession.actorRole === "Staff" || canReview);
  const showSearch = view === "counting" && canAddCountEvidence;
  const reasonLabel = getOptionLabel(STOCK_COUNT_VARIANCE_REASONS, reason);

  const refreshSessions = () => setSessions(getCountSessions());
  const refreshLines = (sessionId = activeSessionId) => setLines(sessionId ? getCountSessionItems(sessionId) : []);

  const resetItem = () => {
    setOperatorError(null);
    setItem(null);
    setScanValue("");
    setCounted(1);
    setReason("shelf_empty_unknown");
    setExpiryDate("");
    setLotBatch("");
    setConditionNote("normal");
    setQuantityType("each");
    setEnteredWeight("");
    setNote("");
  };

  const goLanding = () => {
    resetItem();
    setOperatorError(null);
    setActiveSessionId(null);
    setLines([]);
    refreshSessions();
    setLastSyncMessage("");
    setView("landing");
  };

  const openSession = (session) => {
    setOperatorError(null);
    let nextSession = session;
    const sessionId = session.id || session.count_session_id;
    if (session.status === STOCK_COUNT_STATUSES.DRAFT) {
      nextSession = setCountSessionStatus(sessionId, STOCK_COUNT_STATUSES.IN_PROGRESS) || session;
      createScanOpsEvent(SCANOPS_EVENT_TYPES.STOCK_COUNT_SESSION_STARTED, {
        source_module: "Stock Count",
        count_session_id: sessionId,
        session_name: session.session_name,
        status: "in_progress",
        applies_stock_directly: false,
      });
      refreshSessions();
    }
    setActiveSessionId(sessionId);
    setLines(getCountSessionItems(sessionId));
    setView([STOCK_COUNT_STATUSES.IN_PROGRESS, STOCK_COUNT_STATUSES.DRAFT].includes(nextSession.status) ? "counting" : "review");
  };

  const startNewSession = () => {
    if (!String(sessionName || "").trim()) {
      setOperatorError({ title: "Session name required", helper: "Enter a short count session name before starting." });
      return;
    }
    setOperatorError(null);
    const nextSession = createCountSession(countType, {
      session_name: sessionName || `${getOptionLabel(STOCK_COUNT_AREA_OPTIONS, area)} Count`,
      area,
      count_area: area,
      area_label: getOptionLabel(STOCK_COUNT_AREA_OPTIONS, area),
      count_area_label: getOptionLabel(STOCK_COUNT_AREA_OPTIONS, area),
      count_mode: countMode,
      count_mode_label: getOptionLabel(STOCK_COUNT_MODE_OPTIONS, countMode),
      count_type_label: getOptionLabel(STOCK_COUNT_TYPE_OPTIONS, countType),
      status: STOCK_COUNT_STATUSES.IN_PROGRESS,
    });
    upsertCountSession(nextSession);
    setSessions(getCountSessions());
    setActiveSessionId(nextSession.id);
    setLines([]);
    setView("counting");
    createScanOpsEvent(SCANOPS_EVENT_TYPES.STOCK_COUNT_SESSION_CREATED, {
      source_module: "Stock Count",
      count_session_id: nextSession.id,
      session_name: nextSession.session_name,
      count_type: countType,
      count_area: area,
      count_mode: countMode,
      status: "in_progress",
      applies_stock_directly: false,
    });
    createScanOpsEvent(SCANOPS_EVENT_TYPES.STOCK_COUNT_SESSION_STARTED, {
      source_module: "Stock Count",
      count_session_id: nextSession.id,
      session_name: nextSession.session_name,
      status: "in_progress",
      applies_stock_directly: false,
    });
  };

  const scan = (value) => {
    if (!canAddCountEvidence) {
      setOperatorError({ title: "Count session is read-only", helper: "This session cannot accept new count evidence. Your work was not changed." });
      return;
    }
    const found = findProduct(value);
    if (!found) return;
    setOperatorError(null);
    const rawScanValue = typeof value === "object" ? value?._searchMatch?.matchedValue || value?.barcode || value?.gtin || "" : String(value || "").trim();
    const expectedQuantity = expectedQuantityForItem(found);
    setItem(found);
    setCounted(expectedQuantity === null ? 1 : expectedQuantity);
    setReason("shelf_empty_unknown");
    setExpiryDate(getDefaultExpiryDate(found));
    setLotBatch(getDefaultLotBatch(found));
    setConditionNote("normal");
    setQuantityType(getDefaultQuantityType(found));
    setEnteredWeight("");
    setWeightSource(rawScanValue?.startsWith("2") ? "label_weight" : "manual_entry");
    setNote("");
  };

  const saveLine = () => {
    if (!activeSession) {
      setOperatorError({ title: "Count session required", helper: "Open or start a count session before saving count evidence." });
      return;
    }
    if (!canAddCountEvidence) {
      setOperatorError({ title: "Count session is read-only", helper: "This session is locked. Your scanned item was not cleared." });
      return;
    }
    if (!item) {
      setOperatorError({ title: "Item required", helper: "Scan or search an item before saving count evidence." });
      return;
    }
    if (counted === "" || Number.isNaN(Number(counted)) || Number(counted) < 0) {
      setOperatorError({ title: "Count missing", helper: "Enter a valid count before saving. Your scanned item stays on screen." });
      return;
    }
    setOperatorError(null);
    const varianceStatus = expected === null ? STOCK_COUNT_VARIANCE_STATUSES.EXPECTED_UNAVAILABLE : variance === 0 ? STOCK_COUNT_VARIANCE_STATUSES.NO_VARIANCE : Math.abs(Number(variance || 0)) <= 1 ? STOCK_COUNT_VARIANCE_STATUSES.WITHIN_TOLERANCE : STOCK_COUNT_VARIANCE_STATUSES.REVIEW_REQUIRED;
    const isVariance = varianceStatus !== STOCK_COUNT_VARIANCE_STATUSES.NO_VARIANCE;
    const attributeSnapshot = buildWorkflowItemAttributeSnapshot({
      workflowType: "stock_count",
      workflowItemId: activeSession.id || activeSession.count_session_id,
      item,
      scanValue,
      expiryDate,
      lotBatch,
      quantityType,
      enteredQuantity: enteredWeight || counted,
      weightSource,
      conditionNote,
      source: "stock_count_session_evidence_card",
    });
    saveWorkflowItemAttributeSnapshot(attributeSnapshot);
    const line = createCountLine({
      session: activeSession,
      product: item,
      countedQuantity: counted,
      reason: isVariance ? reason : null,
      note,
      attributeSnapshot,
      conditionNote,
    });
    const savedLine = upsertCountSessionItem({ ...line, variance_status: varianceStatus, reason_code: isVariance ? reason : null, variance_reason_label: isVariance ? reasonLabel : null });
    saveCountItemAttributeSnapshot({
      id: `count_attr_${savedLine.id}`,
      session_item_id: savedLine.id,
      session_id: activeSession.id || activeSession.count_session_id,
      expiry_snapshot: attributeSnapshot.expiry_snapshot || null,
      lot_batch_snapshot: attributeSnapshot.lot_batch_snapshot || null,
      weighted_snapshot: attributeSnapshot.weighted_snapshot || null,
      created_at: new Date().toISOString(),
    });
    createScanOpsEvent(attributeSnapshot.weighted_snapshot ? SCANOPS_EVENT_TYPES.WEIGHTED_ITEM_EVIDENCE_CAPTURED : SCANOPS_EVENT_TYPES.ATTRIBUTE_EVIDENCE_CAPTURED, {
      source_module: "Stock Count",
      count_session_id: activeSession.id || activeSession.count_session_id,
      session_item_id: savedLine.id,
      item_name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      workflow_type: "stock_count",
      expiry_date: attributeSnapshot.expiry_snapshot?.expiry_date || null,
      lot_batch: attributeSnapshot.lot_batch_snapshot?.lot_batch_value || null,
      condition_note: conditionNote,
      weighted_candidate: Boolean(attributeSnapshot.weighted_snapshot?.weighted_candidate),
      raw_barcode: attributeSnapshot.weighted_snapshot?.raw_barcode || scanValue || null,
      quantity_type: attributeSnapshot.weighted_snapshot?.quantity_type || null,
      entered_quantity: attributeSnapshot.weighted_snapshot?.entered_quantity || null,
      applies_stock_directly: false,
      applies_price_directly: false,
      status: "attribute_evidence_saved",
    });
    const lineEvent = createScanOpsEvent(isVariance ? SCANOPS_EVENT_TYPES.STOCK_COUNT_VARIANCE_REVIEW_REQUIRED : SCANOPS_EVENT_TYPES.STOCK_COUNT_LINE_SAVED, {
      source_module: "Stock Count",
      count_session_id: activeSession.id || activeSession.count_session_id,
      session_item_id: savedLine.id,
      item_name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      plu: item.plu || item.scaleCode,
      match_reason: item._searchMatch?.displayReason || null,
      expected_quantity: expected,
      counted_quantity: Number(counted || 0),
      variance_quantity: variance,
      variance_status: varianceStatus,
      variance_reason: isVariance ? reason : null,
      variance_reason_label: isVariance ? reasonLabel : null,
      expiry_date: attributeSnapshot.expiry_snapshot?.expiry_date || null,
      lot_batch: attributeSnapshot.lot_batch_snapshot?.lot_batch_value || null,
      condition_note: conditionNote,
      weighted_candidate: Boolean(attributeSnapshot.weighted_snapshot?.weighted_candidate),
      note,
      applies_stock_directly: false,
      status: isVariance ? "variance_review_required" : "line_saved",
    });
    writeStockCountRecord({ item, counted: Number(counted || 0), expected, unit, sessionId: activeSession.id || activeSession.count_session_id, status: varianceStatus });
    setLastSyncMessage(`${item.name || "Count entry"} · ${lineEvent?.syncRecord?.statusLabel || "Pending future handoff"}`);
    refreshLines(activeSession.id || activeSession.count_session_id);
    refreshSessions();
    resetItem();
  };

  const pendingContinuousScanRef = useRef(null);

  const handleNewScanWhileActive = (nextItem) => {
    // Auto-save current count line, then load next item after reset
    if (item && canAddCountEvidence && !(counted === "" || Number.isNaN(Number(counted)) || Number(counted) < 0)) {
      pendingContinuousScanRef.current = nextItem;
      saveLine();
    } else {
      scan(nextItem);
    }
  };

  // After saveLine → resetItem clears item; pick up pending continuous scan
  useEffect(() => {
    if (!item && pendingContinuousScanRef.current) {
      const nextItem = pendingContinuousScanRef.current;
      pendingContinuousScanRef.current = null;
      scan(nextItem);
    }
     
  }, [item]);

  const removeLine = (lineId) => {
    deleteCountSessionItem(lineId);
    refreshLines(activeSessionId);
  };

  const submitSession = () => {
    if (!activeSession) {
      setOperatorError({ title: "Count session required", helper: "Open a count session before submitting." });
      return;
    }
    if (!lines.length) {
      setOperatorError({ title: "Nothing to submit", helper: "Add at least one count line before submitting the session." });
      return;
    }
    setOperatorError(null);
    const nextSummary = getSessionVarianceSummary(lines);
    const status = nextSummary.requiresReview ? STOCK_COUNT_STATUSES.REVIEW_REQUIRED : STOCK_COUNT_STATUSES.SUBMITTED;
    setCountSessionStatus(activeSession.id || activeSession.count_session_id, status, { approval_status: nextSummary.requiresReview ? "Review required" : "Submitted" });
    const submitEvent = createScanOpsEvent(SCANOPS_EVENT_TYPES.STOCK_COUNT_SUBMITTED, {
      source_module: "Stock Count",
      count_session_id: activeSession.id || activeSession.count_session_id,
      counted_items: nextSummary.countedItems,
      variance_items: nextSummary.varianceItems,
      total_variance: nextSummary.totalVariance,
      next_status: status,
      applies_stock_directly: false,
      status: "submitted_for_review",
      submission_type: "count_evidence_only",
    });
    setLastSyncMessage(`Session submitted · ${submitEvent?.syncRecord?.statusLabel || "Pending future handoff"}`);
    refreshSessions();
    setView("review");
  };

  const requestRecount = (line) => {
    if (!activeSession || !canReview) return;
    const request = requestCountRecount({
      sessionId: activeSession.id || activeSession.count_session_id,
      sessionItemId: line.id || line.count_line_id,
      reason: line.variance_status === STOCK_COUNT_VARIANCE_STATUSES.EXPECTED_UNAVAILABLE ? "Expected quantity unavailable" : "Variance exceeds threshold",
    });
    createScanOpsEvent(SCANOPS_EVENT_TYPES.STOCK_COUNT_RECOUNT_REQUESTED, {
      source_module: "Stock Count",
      count_session_id: activeSession.id || activeSession.count_session_id,
      session_item_id: line.id || line.count_line_id,
      recount_request_id: request.id,
      item_name: lineName(line),
      reason: request.reason,
      applies_stock_directly: false,
      status: "recount_requested",
    });
    upsertDerivedTaskFromSource({
      taskType: TASK_TYPES.STOCK_COUNT,
      task_kind: "stock_count_recount",
      title: "Recount stock variance",
      description: `${lineName(line)} requires a recount before desktop stock review.`,
      action_needed: "Open the Stock Count source and record recount evidence. Task completion does not approve or post stock.",
      evidence_required: "Recount quantity and note",
      priority: TASK_PRIORITIES.HIGH,
      due_state: TASK_DUE_STATES.TODAY,
      source_type: "stock_count_recount",
      source_id: request.id,
      source_ref: activeSession.session_ref || activeSession.count_session_ref || activeSession.id || activeSession.count_session_id,
      source_module: "Stock Count",
      source_status_snapshot: "Recount Required",
      source_item_snapshot: {
        item_name: lineName(line),
        sku: line.sku,
        barcode: line.barcode,
        plu: line.plu,
        expected_quantity: line.expected_quantity,
        counted_quantity: line.counted_quantity,
        variance_quantity: line.variance_quantity,
        variance_reason: line.variance_reason_label || line.variance_reason,
      },
      assigned_department: line.item_snapshot?.department || activeSession.area_label || "Grocery",
      assigned_role: "Staff",
      assigned_user_id: "team",
      assigned_user_name: `${line.item_snapshot?.department || activeSession.area_label || "Stock Count"} Team`,
      linkedWorkflow: "/stock-count",
      linkedWorkflowLabel: "Stock Count · Recount source",
      linkedContext: { sessionId: activeSession.id || activeSession.count_session_id, recountRequestId: request.id },
    });
    refreshSessions();
    refreshLines(activeSession.id || activeSession.count_session_id);
  };

  const acceptEvidence = (line) => {
    if (!activeSession || !canReview) return;
    acceptCountEvidence(activeSession.id || activeSession.count_session_id, line.id || line.count_line_id, "Evidence accepted from handheld review");
    createScanOpsEvent(SCANOPS_EVENT_TYPES.STOCK_COUNT_EVIDENCE_ACCEPTED, {
      source_module: "Stock Count",
      count_session_id: activeSession.id || activeSession.count_session_id,
      session_item_id: line.id || line.count_line_id,
      item_name: lineName(line),
      applies_stock_directly: false,
      status: "evidence_accepted",
    });
    refreshLines(activeSession.id || activeSession.count_session_id);
  };

  const submitRecount = (line, recountQuantity, evidenceNote) => {
    if (!canSubmitRecount) return;
    const requestId = line.recount_request_id || getCountRecountRequests(activeSession.id || activeSession.count_session_id).find((request) => request.session_item_id === (line.id || line.count_line_id) && request.status === "Open")?.id;
    if (!requestId) return;
    const evidence = submitCountRecount({ requestId, sessionItemId: line.id || line.count_line_id, recountQuantity, evidenceNote });
    createScanOpsEvent(SCANOPS_EVENT_TYPES.STOCK_COUNT_RECOUNT_SUBMITTED, {
      source_module: "Stock Count",
      count_session_id: activeSession.id || activeSession.count_session_id,
      session_item_id: line.id || line.count_line_id,
      recount_request_id: requestId,
      original_count_quantity: evidence.original_count_quantity,
      recount_quantity: evidence.recount_quantity,
      recount_variance_quantity: evidence.recount_variance_quantity,
      evidence_note: evidenceNote,
      applies_stock_directly: false,
      status: "recount_completed",
    });
    refreshSessions();
    refreshLines(activeSession.id || activeSession.count_session_id);
  };

  const approveSession = () => {
    if (!activeSession || !canApprove) return;
    setCountSessionStatus(activeSession.id || activeSession.count_session_id, STOCK_COUNT_STATUSES.APPROVED, {
      approval_status: "Evidence Accepted",
      approved_by: actorSession.actorUserId,
      approved_by_name: actorSession.actorName,
    });
    createScanOpsEvent(SCANOPS_EVENT_TYPES.STOCK_COUNT_SESSION_APPROVED, {
      source_module: "Stock Count",
      count_session_id: activeSession.id || activeSession.count_session_id,
      counted_items: summary.countedItems,
      variance_items: summary.varianceItems,
      applies_stock_directly: false,
      status: "evidence_accepted_only",
    });
    refreshSessions();
  };

  const closeSession = () => {
    if (!activeSession || !canClose) return;
    setCountSessionStatus(activeSession.id || activeSession.count_session_id, STOCK_COUNT_STATUSES.CLOSED);
    createScanOpsEvent(SCANOPS_EVENT_TYPES.STOCK_COUNT_SESSION_CLOSED, {
      source_module: "Stock Count",
      count_session_id: activeSession.id || activeSession.count_session_id,
      applies_stock_directly: false,
      status: "evidence_locked_only",
    });
    refreshSessions();
    setView("review");
  };

  const renderLanding = () => (
    <>
      <SectionCard className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-black text-foreground">Active Sessions</p>
            <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">Open counts, add evidence, review variances.</p>
          </div>
          <StatusBadge value={actorSession.actorRole} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <MetricPill label="Visible" value={visibleSessions.length} />
          <MetricPill label="Review" value={visibleSessions.filter((session) => [STOCK_COUNT_STATUSES.REVIEW_REQUIRED, STOCK_COUNT_STATUSES.SUBMITTED].includes(session.status)).length} />
          <MetricPill label="Recount" value={visibleSessions.filter((session) => session.status === STOCK_COUNT_STATUSES.RECOUNT_REQUIRED).length} />
        </div>
      </SectionCard>
      {visibleSessions.length ? (
        <div className="space-y-3">
          {visibleSessions.map((session) => (
            <SessionCard key={session.id || session.count_session_id} session={session} lines={getCountSessionItems(session.id || session.count_session_id)} onOpen={openSession} />
          ))}
        </div>
      ) : (
        <EmptyState title="No active count sessions." helper="Start a count session." />
      )}
      <div className="scanops-sticky-actions">
        <button
          type="button"
          onClick={() => setView("new")}
          className="min-h-12 w-full rounded-2xl bg-primary px-3 text-sm font-black text-primary-foreground active:scale-[0.98]"
        >
          Start New Count Session
        </button>
      </div>
    </>
  );

  const renderNewSession = () => {
    const selectedType = STOCK_COUNT_TYPE_OPTIONS.find((option) => option.id === countType) || STOCK_COUNT_TYPE_OPTIONS[0];
    return (
      <>
        {operatorError && <OperatorAlert title={operatorError.title} helper={operatorError.helper} tone="warning" actions={[{ label: "Keep Editing", onClick: () => setOperatorError(null), variant: "primary" }]} />}
        <SectionCard className="space-y-3">
          <TextInputField label="Session name" value={sessionName} onChange={setSessionName} placeholder="e.g. Dairy Morning Count" />
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
        <SectionCard className="space-y-2">
          <p className="text-sm font-black text-foreground">{selectedType.title}</p>
          <InfoLine label="Creates" value="Controlled count session" />
          <InfoLine label="Stock mutation" value="No direct adjustment" />
          <InfoLine label="Review path" value="Submit → variance review → evidence acceptance" />
        </SectionCard>
        <StickyActions leftLabel="Back" rightLabel="Start Session" onLeft={() => setView("landing")} onRight={startNewSession} rightDisabled={!String(sessionName || "").trim()} />
      </>
    );
  };

  const renderCounting = () => (
    <>
      <SessionHeaderCard session={activeSession} lines={lines} />
      {operatorError && <OperatorAlert title={operatorError.title} helper={operatorError.helper} tone={operatorError.tone || "warning"} actions={[{ label: "Keep Editing", onClick: () => setOperatorError(null), variant: "primary" }]} />}
      {continuousScan && canAddCountEvidence && (
        <div className="flex items-center gap-2 rounded-2xl bg-accent/10 px-3 py-2">
          <span className="text-xs font-black text-accent">⚡ Continuous scan on</span>
          <span className="text-xs font-semibold text-muted-foreground">— each new scan auto-saves the current count.</span>
        </div>
      )}
      {lastSyncMessage && <SectionCard className="border-primary/20 bg-primary/5"><p className="text-sm font-black text-foreground">Saved locally</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{lastSyncMessage}</p></SectionCard>}
      {!canAddCountEvidence && <EmptyState title="Session is read-only." helper="This session is locked for handheld edits." />}
      {!item && canAddCountEvidence && <EmptyState title="No item selected." helper={lines.length ? "Scan another item or review the session." : "Scan/search an item."} />}
      {item && canAddCountEvidence && (
        <>
          <ItemSummaryCard item={item}>
            <div className="grid grid-cols-2 gap-2">
              <MetricPill label="Expected" value={expected === null ? "Unavailable" : expected} suffix={expected === null ? "" : unit} />
              <MetricPill label="Variance" value={variance === null ? "—" : variance} suffix={variance === null ? "" : unit} />
            </div>
          </ItemSummaryCard>
          <SectionCard className="space-y-3">
            <QuantityStepper label="Counted" value={counted} onChange={(value) => { setCounted(value); if (operatorError?.title === "Count missing") setOperatorError(null); }} unit={unit} min={0} />
            {(counted === "" || Number.isNaN(Number(counted)) || Number(counted) < 0) && <FieldError title="Count missing" helper="Enter a valid count before saving." />}
            <div className="rounded-2xl bg-secondary/60 p-3 space-y-2">
              <InfoLine label="System expected" value={expectedLabel(expected, unit)} />
              <InfoLine label="Counted" value={`${counted} ${unit}`} />
              <InfoLine label="Variance" value={variance === null ? "Review required" : `${variance} ${unit}`} />
            </div>
            {variance !== 0 && <TouchSelect label="Variance reason" value={reason} onChange={setReason} options={STOCK_COUNT_VARIANCE_REASONS} />}
            <AttributeEvidenceFields
              item={item}
              scanValue={scanValue}
              expiryDate={expiryDate}
              onExpiryDateChange={setExpiryDate}
              lotBatch={lotBatch}
              onLotBatchChange={setLotBatch}
              quantityType={quantityType}
              onQuantityTypeChange={setQuantityType}
              enteredQuantity={enteredWeight}
              onEnteredQuantityChange={setEnteredWeight}
              weightSource={weightSource}
              onWeightSourceChange={setWeightSource}
              expiryLabel="Expiry note"
            />
            <TouchSelect label="Condition" value={conditionNote} onChange={setConditionNote} options={COUNT_CONDITION_NOTE_OPTIONS} />
            <TextInputField label="Evidence note" value={note} onChange={setNote} placeholder="Optional count note" />
          </SectionCard>
        </>
      )}
      <div className="space-y-3">
        {lines.length ? lines.map((line) => <CountLineSummaryCard key={line.id || line.count_line_id} line={line} editable={canAddCountEvidence} onRemove={removeLine} />) : <EmptyState title="Current count is empty." helper="Scan an item and add count evidence before submitting." />}
      </div>
      <StickyActions
        leftLabel={item ? "Cancel Item" : "Back"}
        rightLabel={item ? "Add Count Evidence" : "Submit Session"}
        onLeft={() => item ? resetItem() : goLanding()}
        onRight={item ? saveLine : submitSession}
        rightDisabled={item ? false : !lines.length || !canAddCountEvidence}
      />
    </>
  );

  const renderReview = () => (
    <>
      <SessionHeaderCard session={activeSession} lines={lines} />
      <SectionCard className="space-y-2">
        <p className="text-sm font-black text-foreground">Session Variances</p>
        <p className="text-xs font-semibold leading-snug text-muted-foreground">{summary.countedItems} items · {summary.varianceItems} variance lines · handheld evidence only.</p>
        <InfoLine label="Edit state" value={sessionReadOnly || activeSession?.status !== STOCK_COUNT_STATUSES.IN_PROGRESS ? "Read-only evidence" : "Counting in progress"} />
      </SectionCard>
      <div className="space-y-3">
        {lines.length ? lines.map((line) => (
          <ReviewLine
            key={line.id || line.count_line_id}
            line={line}
            canReview={canReview && ![STOCK_COUNT_STATUSES.CLOSED, STOCK_COUNT_STATUSES.CANCELLED, STOCK_COUNT_STATUSES.APPROVED].includes(activeSession?.status)}
            canRecount={canSubmitRecount}
            onRequestRecount={requestRecount}
            onAccept={acceptEvidence}
            onSubmitRecount={submitRecount}
          />
        )) : <EmptyState title="No evidence in this session." />}
      </div>
      {activeSession?.status === STOCK_COUNT_STATUSES.APPROVED ? (
        <StickyActions leftLabel="Back" rightLabel="Lock Evidence" onLeft={goLanding} onRight={closeSession} rightDisabled={!canClose} />
      ) : [STOCK_COUNT_STATUSES.CLOSED, STOCK_COUNT_STATUSES.CANCELLED].includes(activeSession?.status) ? (
        <StickyActions leftLabel="Back" rightLabel="New Session" onLeft={goLanding} onRight={() => setView("new")} />
      ) : (
        <StickyActions
          leftLabel="Back"
          rightLabel={canApprove ? "Accept Evidence" : "Review Only"}
          onLeft={goLanding}
          onRight={approveSession}
          rightDisabled={!canApprove || activeSession?.status === STOCK_COUNT_STATUSES.RECOUNT_REQUIRED || !lines.length}
        />
      )}
    </>
  );

  const renderClosed = () => (
    <>
      <DoneCard
        title="Evidence locked"
        helper="Count evidence is locked locally. No stock adjusted here."
        rows={[
          { label: "Items counted", value: summary.countedItems },
          { label: "Variance lines", value: summary.varianceItems },
          { label: "Net difference", value: summary.totalVariance },
        ]}
      />
      <StickyActions leftLabel="Back" rightLabel="New Session" onLeft={goLanding} onRight={() => setView("new")} />
    </>
  );

  return (
    <PageShell>
      <PageHeader
        title="Stock Count"
        subtitle={view === "landing" ? "Session workspace" : view === "new" ? "Start count session" : view === "review" ? "Variance review" : activeSession?.status || "Count stock by scan or search"}
      />
      <WorkflowHeader
        title="Stock Count"
        subtitle={view === "landing" ? "Session workspace" : view === "new" ? "Start count session" : view === "review" ? "Variance review" : activeSession?.status || "Count stock by scan or search"}
        showHeaderChrome={false}
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={scan}
        showSearch={showSearch}
        continuousScan={continuousScan}
        onContinuousScanChange={setContinuousScan}
        hasActiveItem={!!item && canAddCountEvidence}
        onNewScanWhileItemActive={handleNewScanWhileActive}
      />
      <WorkflowMain>
        {view === "landing" && renderLanding()}
        {view === "new" && renderNewSession()}
        {view === "counting" && renderCounting()}
        {view === "review" && renderReview()}
        {view === "closed" && renderClosed()}
      </WorkflowMain>
    </PageShell>
  );
}