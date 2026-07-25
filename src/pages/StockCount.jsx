import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { MapPin, ScanBarcode, ChevronDown } from "lucide-react";
import AttributeEvidenceFields from "../components/scanner/AttributeEvidenceFields";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import PageHeader from "../components/scanner/PageHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import { ItemSummaryCard, OperatorAlert, QuantityStepper, TextInputField, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
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
  if ([STOCK_COUNT_STATUSES.APPROVED, STOCK_COUNT_STATUSES.CLOSED, STOCK_COUNT_VARIANCE_STATUSES.ACCEPTED, STOCK_COUNT_VARIANCE_STATUSES.NO_VARIANCE].includes(status)) return "bg-emerald-500 text-[#0a0a0a]";
  if ([STOCK_COUNT_STATUSES.RECOUNT_REQUIRED, STOCK_COUNT_VARIANCE_STATUSES.RECOUNT_REQUESTED].includes(status)) return "bg-red-500 text-white";
  if ([STOCK_COUNT_STATUSES.REVIEW_REQUIRED, STOCK_COUNT_STATUSES.SUBMITTED, STOCK_COUNT_VARIANCE_STATUSES.REVIEW_REQUIRED, STOCK_COUNT_VARIANCE_STATUSES.EXPECTED_UNAVAILABLE].includes(status)) return "bg-emerald-950 text-emerald-400 border border-emerald-500";
  if ([STOCK_COUNT_STATUSES.CANCELLED, STOCK_COUNT_VARIANCE_STATUSES.REJECTED].includes(status)) return "bg-gray-800 text-gray-400";
  return "bg-emerald-950 text-emerald-400 border border-emerald-500";
}

function Block({ children, className = "", ...rest }) {
  return <section className={`rounded-2xl border border-emerald-500 bg-[#0a0a0a] p-4 ${className}`} {...rest}>{children}</section>;
}

function BlockLabel({ children, className = "" }) {
  return <p className={`text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 ${className}`}>{children}</p>;
}

function BoldMiniMetric({ label, value, suffix = "" }) {
  return (
    <div className="rounded-xl border border-emerald-500/50 bg-[#0a0a0a] px-2 py-2 text-center">
      <p className="font-mono text-lg font-black text-white">{value}{suffix ? ` ${suffix}` : ""}</p>
      <BlockLabel className="mt-0.5">{label}</BlockLabel>
    </div>
  );
}

function BoldMetric({ label, value }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-mono text-2xl font-black text-white">{value}</span>
      <BlockLabel className="mt-0.5">{label}</BlockLabel>
    </div>
  );
}

function StatusBadge({ value }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${statusTone(value)}`}>{value}</span>;
}

function BoldActions({ leftLabel, rightLabel, onLeft, onRight, rightDisabled = false, leftDisabled = false }) {
  return (
    <div className="scanops-sticky-actions grid grid-cols-2 gap-3">
      <button type="button" disabled={leftDisabled} onClick={onLeft} className="min-h-12 rounded-2xl border border-emerald-500/60 px-3 text-sm font-black uppercase tracking-wide text-emerald-400 active:bg-emerald-950 disabled:opacity-40">
        {leftLabel}
      </button>
      <button type="button" disabled={rightDisabled} onClick={onRight} className="min-h-12 rounded-2xl bg-emerald-500 px-3 text-sm font-black uppercase tracking-wide text-[#0a0a0a] active:scale-[0.98] disabled:opacity-40">
        {rightLabel}
      </button>
    </div>
  );
}

function CountTypeButton({ option, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 rounded-2xl border px-3 py-3 text-left active:scale-[0.99] ${selected ? "border-emerald-500 bg-emerald-950" : "border-emerald-500/40 bg-[#0a0a0a]"}`}
    >
      <span className="block text-sm font-black text-white">{option.title}</span>
      <span className="mt-1 block text-xs font-semibold leading-snug text-gray-400">{option.caption}</span>
    </button>
  );
}

function CurrentLocationBlock({ session }) {
  const areaLabel = session?.area_label || session?.count_area_label || "Dairy / chilled";
  return (
    <Block>
      <BlockLabel>Current Location</BlockLabel>
      <div className="mt-3 flex flex-col items-center text-center">
        <MapPin className="h-10 w-10 text-emerald-500" />
        <p className="mt-2 text-lg font-black text-white">{areaLabel}</p>
        <p className="mt-1 text-xs font-semibold text-gray-400">Location is locked for this count session.</p>
      </div>
      <div className="mt-4">
        <BlockLabel>Change Location</BlockLabel>
        <div className="mt-2 flex items-center justify-between rounded-xl border border-emerald-500/60 bg-[#0a0a0a] px-3 py-2">
          <span className="text-sm font-bold text-white">{areaLabel}</span>
          <ChevronDown className="h-4 w-4 text-emerald-500" />
        </div>
      </div>
    </Block>
  );
}

function SessionProgressBlock({ summary, session }) {
  const counted = summary.countedItems;
  const filled = Math.min(counted, 6);
  const statusText = counted === 0 ? "Ready to count. • Scan an item to begin this count session." : `${counted} counted • Scan next item or submit session.`;
  return (
    <Block>
      <BlockLabel>Session Progress</BlockLabel>
      <p className="mt-2 font-mono text-4xl font-black text-white">
        {counted}<span className="ml-2 align-middle text-base font-black text-emerald-500">COUNTED</span>
      </p>
      <div className="mt-3 grid grid-cols-6 gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`h-2 rounded-full ${i < filled ? "bg-emerald-500" : "bg-gray-800"}`} />
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold text-white">{statusText}</p>
    </Block>
  );
}

function ReadyToCountBlock({ session }) {
  const areaLabel = session?.area_label || session?.count_area_label || "this area";
  return (
    <Block className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500 text-emerald-500">
        <ScanBarcode className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-black uppercase tracking-wide text-white">Ready to Count</p>
        <p className="mt-0.5 text-xs font-semibold text-white">Scan an item in {areaLabel} to enter a physical count.</p>
      </div>
    </Block>
  );
}

function SessionHeaderCard({ session, lines }) {
  const summary = getSessionVarianceSummary(lines);
  const status = session?.status || STOCK_COUNT_STATUSES.DRAFT;
  return (
    <Block>
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black uppercase tracking-wide text-emerald-500">{session?.session_name || "Count Stock"}</p>
          <p className="mt-0.5 text-xs font-semibold text-white">Scan item, enter count, save, repeat</p>
        </div>
        <BoldMetric label="Items" value={summary.countedItems} />
        <BoldMetric label="Variances" value={summary.varianceItems} />
        <div className="flex flex-col items-center gap-1">
          <StatusBadge value={status} />
          <BlockLabel>Status</BlockLabel>
        </div>
      </div>
    </Block>
  );
}

function SessionCard({ session, lines, onOpen }) {
  const summary = getSessionVarianceSummary(lines);
  const actionLabel = [STOCK_COUNT_STATUSES.DRAFT, STOCK_COUNT_STATUSES.IN_PROGRESS].includes(session.status) ? "Continue Count" : "Open Session";
  return (
    <Block className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-white">{session.session_name}</p>
          <p className="mt-1 text-xs font-semibold text-gray-400">{session.area_label || session.count_area_label} · {session.department || "Store"}</p>
        </div>
        <StatusBadge value={session.status} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <BoldMiniMetric label="Items" value={summary.countedItems} />
        <BoldMiniMetric label="Variances" value={summary.varianceItems} />
        <BoldMiniMetric label="Recount" value={summary.recountRequired} />
      </div>
      <div className="space-y-1">
        <p className="text-xs font-semibold text-gray-400"><span className="text-gray-500">Assigned:</span> <span className="text-white">{session.assigned_user_name || session.assigned_user_id || "—"}</span></p>
        <p className="text-xs font-semibold text-gray-400"><span className="text-gray-500">Updated:</span> <span className="text-white">{formatDateTime(session.submitted_at || session.started_at || session.created_at)}</span></p>
      </div>
      <button type="button" onClick={() => onOpen(session)} className="min-h-11 w-full rounded-xl bg-emerald-500 px-3 text-sm font-black uppercase tracking-wide text-[#0a0a0a] active:scale-[0.98]">
        {actionLabel}
      </button>
    </Block>
  );
}

function CountLineSummaryCard({ line, onRemove = null, editable = false }) {
  const unit = lineUnit(line);
  const variance = line.variance_quantity ?? line.variance;
  return (
    <Block className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-white">{lineName(line)}</p>
          {lineIdentity(line) && <p className="mt-1 break-all font-mono text-[11px] uppercase tracking-wide text-gray-400">{lineIdentity(line)}</p>}
          {line.attribute_snapshot && <p className="mt-1 break-words text-xs font-semibold text-gray-400">{summarizeAttributeSnapshot(line.attribute_snapshot)}</p>}
        </div>
        <StatusBadge value={line.variance_status || STOCK_COUNT_VARIANCE_STATUSES.NO_VARIANCE} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <BoldMiniMetric label="Expected" value={line.expected_quantity == null ? "—" : line.expected_quantity} suffix={line.expected_quantity == null ? "" : unit} />
        <BoldMiniMetric label="Counted" value={line.counted_quantity} suffix={unit} />
        <BoldMiniMetric label="Diff" value={variance == null ? "—" : variance} suffix={variance == null ? "" : unit} />
      </div>
      {line.evidence_note && <p className="text-xs font-semibold text-gray-400"><span className="text-gray-500">Note:</span> {line.evidence_note}</p>}
      {editable && onRemove && (
        <button type="button" onClick={() => onRemove(line.id || line.count_line_id)} className="min-h-9 rounded-xl border border-emerald-500/60 px-3 text-xs font-black uppercase tracking-wide text-emerald-400 active:bg-emerald-950">
          Remove line
        </button>
      )}
    </Block>
  );
}

function RecountEntry({ line, onSubmit }) {
  const [quantity, setQuantity] = useState(Number(line.counted_quantity || 0));
  const [note, setNote] = useState("");
  const unit = lineUnit(line);
  return (
    <Block className="space-y-3">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-500">Recount required</p>
      <div className="grid grid-cols-2 gap-2">
        <BoldMiniMetric label="Original" value={line.counted_quantity} suffix={unit} />
        <BoldMiniMetric label="Expected" value={line.expected_quantity == null ? "—" : line.expected_quantity} suffix={line.expected_quantity == null ? "" : unit} />
      </div>
      <QuantityStepper label="Recounted" value={quantity} onChange={setQuantity} unit={unit} min={0} />
      <TextInputField label="Evidence note" value={note} onChange={setNote} placeholder="Optional recount note" />
      <button type="button" onClick={() => onSubmit(line, quantity, note)} className="min-h-11 w-full rounded-2xl bg-emerald-500 px-3 text-sm font-black uppercase tracking-wide text-[#0a0a0a] active:scale-[0.98]">
        Submit Recount
      </button>
    </Block>
  );
}

function ReviewLine({ line, canReview, canRecount, onRequestRecount, onAccept, onSubmitRecount }) {
  const unit = lineUnit(line);
  const variance = line.variance_quantity ?? line.variance;
  const recounts = line.recounts || [];
  const reviewable = ![STOCK_COUNT_VARIANCE_STATUSES.NO_VARIANCE, STOCK_COUNT_VARIANCE_STATUSES.ACCEPTED].includes(line.variance_status);
  return (
    <Block className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-white">{lineName(line)}</p>
          {lineIdentity(line) && <p className="mt-1 break-all font-mono text-[11px] uppercase tracking-wide text-gray-400">{lineIdentity(line)}</p>}
          <p className="mt-1 text-xs font-semibold text-gray-400">Expected {line.expected_quantity == null ? "unavailable" : line.expected_quantity} · Counted {line.counted_quantity} · Diff {variance == null ? "—" : variance}</p>
        </div>
        <StatusBadge value={line.variance_status || STOCK_COUNT_VARIANCE_STATUSES.NO_VARIANCE} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <BoldMiniMetric label="Expected" value={line.expected_quantity == null ? "—" : line.expected_quantity} suffix={line.expected_quantity == null ? "" : unit} />
        <BoldMiniMetric label="Counted" value={line.counted_quantity} suffix={unit} />
        <BoldMiniMetric label="Diff" value={variance == null ? "—" : variance} suffix={variance == null ? "" : unit} />
      </div>
      {line.attribute_snapshot && <p className="break-words rounded-xl border border-emerald-500/40 bg-[#0a0a0a] p-3 text-xs font-semibold text-gray-400">{summarizeAttributeSnapshot(line.attribute_snapshot)}</p>}
      {line.condition_note && <p className="text-xs font-semibold text-gray-400"><span className="text-gray-500">Condition:</span> <span className="text-white">{getOptionLabel(COUNT_CONDITION_NOTE_OPTIONS, line.condition_note)}</span></p>}
      {line.evidence_note && <p className="text-xs font-semibold text-gray-400"><span className="text-gray-500">Evidence note:</span> {line.evidence_note}</p>}
      {recounts.length > 0 && (
        <div className="rounded-xl border border-emerald-500/40 bg-[#0a0a0a] p-3 space-y-1">
          <BlockLabel>Recount evidence</BlockLabel>
          {recounts.map((entry) => (
            <p key={entry.id} className="text-xs font-semibold text-gray-400"><span className="text-white">{entry.recount_quantity} {unit}</span> — {entry.evidence_note || formatDateTime(entry.created_at)}</p>
          ))}
        </div>
      )}
      {line.variance_status === STOCK_COUNT_VARIANCE_STATUSES.RECOUNT_REQUESTED && canRecount && <RecountEntry line={line} onSubmit={onSubmitRecount} />}
      {canReview && reviewable && line.variance_status !== STOCK_COUNT_VARIANCE_STATUSES.RECOUNT_REQUESTED && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onRequestRecount(line)} className="min-h-10 rounded-xl border border-emerald-500/60 px-3 text-xs font-black uppercase tracking-wide text-emerald-400 active:bg-emerald-950">
            Request Recount
          </button>
          <button type="button" onClick={() => onAccept(line)} className="min-h-10 rounded-xl bg-emerald-500 px-3 text-xs font-black uppercase tracking-wide text-[#0a0a0a] active:scale-[0.98]">
            Accept Evidence
          </button>
        </div>
      )}
    </Block>
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
      <Block className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-black text-white">Active Sessions</p>
            <p className="mt-1 text-xs font-semibold leading-snug text-gray-400">Open counts, add evidence, review variances.</p>
          </div>
          <StatusBadge value={actorSession.actorRole} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <BoldMiniMetric label="Visible" value={visibleSessions.length} />
          <BoldMiniMetric label="Review" value={visibleSessions.filter((session) => [STOCK_COUNT_STATUSES.REVIEW_REQUIRED, STOCK_COUNT_STATUSES.SUBMITTED].includes(session.status)).length} />
          <BoldMiniMetric label="Recount" value={visibleSessions.filter((session) => session.status === STOCK_COUNT_STATUSES.RECOUNT_REQUIRED).length} />
        </div>
      </Block>
      {visibleSessions.length ? (
        <div className="space-y-3">
          {visibleSessions.map((session) => (
            <SessionCard key={session.id || session.count_session_id} session={session} lines={getCountSessionItems(session.id || session.count_session_id)} onOpen={openSession} />
          ))}
        </div>
      ) : (
        <Block><p className="text-sm font-bold text-gray-400">No active count sessions. Start a count session.</p></Block>
      )}
      <div className="scanops-sticky-actions">
        <button
          type="button"
          onClick={() => setView("new")}
          className="min-h-12 w-full rounded-2xl bg-emerald-500 px-3 text-sm font-black uppercase tracking-wide text-[#0a0a0a] active:scale-[0.98]"
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
        <Block className="space-y-3">
          <TextInputField label="Session name" value={sessionName} onChange={setSessionName} placeholder="e.g. Dairy Morning Count" />
          <div>
            <BlockLabel>Count type</BlockLabel>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {STOCK_COUNT_TYPE_OPTIONS.map((option) => (
                <CountTypeButton key={option.id} option={option} selected={countType === option.id} onClick={() => setCountType(option.id)} />
              ))}
            </div>
          </div>
          <TouchSelect label="Area / location" value={area} onChange={setArea} options={STOCK_COUNT_AREA_OPTIONS} />
          <TouchSelect label="Count mode" value={countMode} onChange={setCountMode} options={STOCK_COUNT_MODE_OPTIONS} />
        </Block>
        <Block className="space-y-1">
          <p className="text-sm font-black text-white">{selectedType.title}</p>
          <p className="text-xs font-semibold text-gray-400"><span className="text-gray-500">Creates:</span> Controlled count session</p>
          <p className="text-xs font-semibold text-gray-400"><span className="text-gray-500">Stock mutation:</span> No direct adjustment</p>
          <p className="text-xs font-semibold text-gray-400"><span className="text-gray-500">Review path:</span> Submit → variance review → evidence acceptance</p>
        </Block>
        <BoldActions leftLabel="Back" rightLabel="Start Session" onLeft={() => setView("landing")} onRight={startNewSession} rightDisabled={!String(sessionName || "").trim()} />
      </>
    );
  };

  const renderCounting = () => (
    <>
      <SessionHeaderCard session={activeSession} lines={lines} />
      {operatorError && <OperatorAlert title={operatorError.title} helper={operatorError.helper} tone={operatorError.tone || "warning"} actions={[{ label: "Keep Editing", onClick: () => setOperatorError(null), variant: "primary" }]} />}
      {continuousScan && canAddCountEvidence && (
        <Block className="flex items-center gap-2">
          <span className="text-xs font-black text-emerald-500">⚡ Continuous scan on</span>
          <span className="text-xs font-semibold text-gray-400">— each new scan auto-saves the current count.</span>
        </Block>
      )}
      {lastSyncMessage && (
        <Block>
          <p className="text-sm font-black text-white">Saved locally</p>
          <p className="mt-1 text-xs font-semibold text-gray-400">{lastSyncMessage}</p>
        </Block>
      )}
      {!canAddCountEvidence && (
        <Block><p className="text-sm font-bold text-gray-400">Session is read-only. This session is locked for handheld edits.</p></Block>
      )}
      {canAddCountEvidence && (
        <>
          <CurrentLocationBlock session={activeSession} />
          <SessionProgressBlock summary={summary} session={activeSession} />
          {!item && <ReadyToCountBlock session={activeSession} />}
        </>
      )}
      {item && canAddCountEvidence && (
        <>
          <ItemSummaryCard item={item}>
            <div className="grid grid-cols-2 gap-2">
              <BoldMiniMetric label="Expected" value={expected === null ? "Unavailable" : expected} suffix={expected === null ? "" : unit} />
              <BoldMiniMetric label="Variance" value={variance === null ? "—" : variance} suffix={variance === null ? "" : unit} />
            </div>
          </ItemSummaryCard>
          <Block className="space-y-3">
            <QuantityStepper label="Counted" value={counted} onChange={(value) => { setCounted(value); if (operatorError?.title === "Count missing") setOperatorError(null); }} unit={unit} min={0} />
            {(counted === "" || Number.isNaN(Number(counted)) || Number(counted) < 0) && (
              <p className="rounded-xl border border-red-500/60 bg-red-950/40 px-3 py-2 text-xs font-black text-red-400">Count missing. Enter a valid count before saving.</p>
            )}
            <div className="rounded-xl border border-emerald-500/40 bg-[#0a0a0a] p-3 space-y-1">
              <p className="text-xs font-semibold text-gray-400"><span className="text-gray-500">System expected:</span> <span className="text-white">{expectedLabel(expected, unit)}</span></p>
              <p className="text-xs font-semibold text-gray-400"><span className="text-gray-500">Counted:</span> <span className="text-white">{counted} {unit}</span></p>
              <p className="text-xs font-semibold text-gray-400"><span className="text-gray-500">Variance:</span> <span className="text-white">{variance === null ? "Review required" : `${variance} ${unit}`}</span></p>
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
          </Block>
        </>
      )}
      <div className="space-y-3">
        {lines.length ? lines.map((line) => <CountLineSummaryCard key={line.id || line.count_line_id} line={line} editable={canAddCountEvidence} onRemove={removeLine} />) : null}
      </div>
      <BoldActions
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
      <Block className="space-y-1">
        <p className="text-sm font-black text-white">Session Variances</p>
        <p className="text-xs font-semibold text-gray-400">{summary.countedItems} items · {summary.varianceItems} variance lines · handheld evidence only.</p>
        <p className="text-xs font-semibold text-gray-400"><span className="text-gray-500">Edit state:</span> <span className="text-white">{sessionReadOnly || activeSession?.status !== STOCK_COUNT_STATUSES.IN_PROGRESS ? "Read-only evidence" : "Counting in progress"}</span></p>
      </Block>
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
        )) : <Block><p className="text-sm font-bold text-gray-400">No evidence in this session.</p></Block>}
      </div>
      {activeSession?.status === STOCK_COUNT_STATUSES.APPROVED ? (
        <BoldActions leftLabel="Back" rightLabel="Lock Evidence" onLeft={goLanding} onRight={closeSession} rightDisabled={!canClose} />
      ) : [STOCK_COUNT_STATUSES.CLOSED, STOCK_COUNT_STATUSES.CANCELLED].includes(activeSession?.status) ? (
        <BoldActions leftLabel="Back" rightLabel="New Session" onLeft={goLanding} onRight={() => setView("new")} />
      ) : (
        <BoldActions
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
      <Block className="space-y-2">
        <p className="text-base font-black text-emerald-500">Evidence locked</p>
        <p className="text-xs font-semibold text-gray-400">Count evidence is locked locally. No stock adjusted here.</p>
        <div className="mt-2 space-y-1">
          <p className="text-xs font-semibold text-gray-400"><span className="text-gray-500">Items counted:</span> <span className="text-white">{summary.countedItems}</span></p>
          <p className="text-xs font-semibold text-gray-400"><span className="text-gray-500">Variance lines:</span> <span className="text-white">{summary.varianceItems}</span></p>
          <p className="text-xs font-semibold text-gray-400"><span className="text-gray-500">Net difference:</span> <span className="text-white">{summary.totalVariance}</span></p>
        </div>
      </Block>
      <BoldActions leftLabel="Back" rightLabel="New Session" onLeft={goLanding} onRight={() => setView("new")} />
    </>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col overflow-x-hidden">
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
    </div>
  );
}