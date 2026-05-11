import { getScanOpsSession } from "./scanOpsSession";

const STORAGE_KEYS = {
  sessions: "invyra_scanops_count_sessions_v2",
  items: "invyra_scanops_count_session_items_v2",
  attributeSnapshots: "invyra_scanops_count_item_attribute_snapshots_v2",
  varianceRules: "invyra_scanops_count_variance_rules_v2",
  recountRequests: "invyra_scanops_count_recount_requests_v2",
  recountEvidence: "invyra_scanops_count_recount_evidence_v2",
  approvalEvents: "invyra_scanops_count_approval_events_v2",
};

export const STOCK_COUNT_TYPES = {
  QUICK_COUNT: "QUICK_COUNT",
  STOCKTAKE_SESSION: "STOCKTAKE_SESSION",
  CYCLE_COUNT: "CYCLE_COUNT",
  GAP_VARIANCE_COUNT: "GAP_VARIANCE_COUNT",
  DEPARTMENT_COUNT: "DEPARTMENT_COUNT",
  FULL_STOCKTAKE: "FULL_STOCKTAKE",
};

export const STOCK_COUNT_STATUSES = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  REVIEW_REQUIRED: "Review Required",
  RECOUNT_REQUIRED: "Recount Required",
  APPROVED: "Approved",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
  // Legacy statuses kept for older imports / stored data safety.
  REVIEW: "Review",
  SYNC_PENDING: "Sync Pending",
  SYNCED: "Synced",
  VARIANCE_REVIEW: "Variance Review",
  REJECTED: "Rejected",
  ADJUSTED: "Adjusted",
};

export const STOCK_COUNT_VARIANCE_STATUSES = {
  NO_VARIANCE: "No Variance",
  WITHIN_TOLERANCE: "Within Tolerance",
  REVIEW_REQUIRED: "Review Required",
  RECOUNT_REQUESTED: "Recount Requested",
  RECOUNT_COMPLETED: "Recount Completed",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPECTED_UNAVAILABLE: "Expected Unavailable",
};

export const STOCK_COUNT_TYPE_OPTIONS = [
  {
    id: STOCK_COUNT_TYPES.QUICK_COUNT,
    title: "Quick Count",
    label: "Quick Count",
    helper: "Spot-check one item, a small shelf area, or a suspected mismatch.",
    caption: "Fast shelf count",
    actionLabel: "Start Quick Count",
    enabled: true,
  },
  {
    id: STOCK_COUNT_TYPES.STOCKTAKE_SESSION,
    title: "Stocktake Session",
    label: "Stocktake Session",
    helper: "Formal count evidence for a defined area or stocktake zone.",
    caption: "Governed session",
    actionLabel: "Start Stocktake Session",
    enabled: true,
  },
];

export const STOCK_COUNT_AREA_OPTIONS = [
  { id: "dairy_chilled", label: "Dairy / chilled" },
  { id: "grocery_aisles", label: "Grocery aisles" },
  { id: "produce", label: "Produce" },
  { id: "fresh_meat", label: "Fresh meat" },
  { id: "frozen", label: "Frozen" },
  { id: "backroom", label: "Backroom" },
  { id: "promo_ends", label: "Promo ends" },
  { id: "whole_store", label: "Whole store" },
];

export const STOCK_COUNT_MODE_OPTIONS = [
  { id: "unguided_scan_count", label: "Unguided scan count", helper: "Scan any item in the selected area." },
  { id: "shelf_area_sweep", label: "Shelf / area sweep", helper: "Work through a small shelf bay or fixture." },
  { id: "gap_confirmation", label: "Gap confirmation", helper: "Confirm gaps or mismatch exceptions." },
  { id: "variance_recount", label: "Variance recount", helper: "Recount lines already flagged for review." },
];

export const STOCK_COUNT_VARIANCE_REASONS = [
  { id: "shelf_empty_unknown", label: "Shelf empty / unknown" },
  { id: "shelf_count_mismatch", label: "Shelf count mismatch" },
  { id: "backroom_stock_found", label: "Backroom stock found" },
  { id: "damaged_unsaleable", label: "Damaged / unsaleable" },
  { id: "theft_shrink", label: "Theft / shrink" },
  { id: "previous_movement_not_updated", label: "Previous movement not updated" },
  { id: "other", label: "Other" },
];

export const DEFAULT_COUNT_VARIANCE_RULES = [
  {
    id: "rule_default_low",
    department: "default",
    category: "default",
    absolute_threshold: 1,
    percentage_threshold: 0.05,
    requires_recount: false,
    requires_manager_review: false,
  },
  {
    id: "rule_default_review",
    department: "default",
    category: "default",
    absolute_threshold: 3,
    percentage_threshold: 0.1,
    requires_recount: true,
    requires_manager_review: true,
  },
];

function read(key, fallback = []) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, records) {
  if (typeof window === "undefined") return records;
  try {
    window.localStorage.setItem(key, JSON.stringify(records));
  } catch {}
  return records;
}

function nowIso() {
  return new Date().toISOString();
}

function asNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
}

function getOptionLabel(options, value) {
  return options.find((option) => option.id === value)?.label || options.find((option) => option.id === value)?.title || value;
}

function currentActor() {
  const session = getScanOpsSession();
  return {
    actorUserId: session.actorUserId,
    actorName: session.actorName,
    actorRole: session.actorRole,
    storeId: session.storeId,
    departmentId: session.departmentId,
    departmentName: session.departmentName,
  };
}

function riskForVariance(absVariance, expectedQuantity) {
  const expected = Math.abs(Number(expectedQuantity || 0));
  const pct = expected > 0 ? absVariance / expected : 0;
  if (absVariance === 0) return "none";
  if (absVariance <= 1 || pct <= 0.05) return "low";
  if (absVariance <= 3 || pct <= 0.1) return "medium";
  return "high";
}

export function getStockCountTypeMeta(countType) {
  return STOCK_COUNT_TYPE_OPTIONS.find((type) => type.id === countType) || STOCK_COUNT_TYPE_OPTIONS[0];
}

export function makeStockCountId(prefix = "cnt") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function calculateVariance(expectedQuantity, countedQuantity) {
  const expected = asNumberOrNull(expectedQuantity);
  const counted = asNumberOrNull(countedQuantity);
  if (expected === null || counted === null) return null;
  return Number((counted - expected).toFixed(3));
}

export function expectedQuantityForItem(product) {
  const value = product?.stockOnHand ?? product?.stock_on_hand ?? product?.shelfStock ?? product?.shelf_stock ?? product?.soh ?? product?.quantity_on_hand;
  return asNumberOrNull(value);
}

export function getCountVarianceStatus(expectedQuantity, countedQuantity, product = {}) {
  const expected = asNumberOrNull(expectedQuantity);
  const counted = asNumberOrNull(countedQuantity);
  if (expected === null || counted === null) return STOCK_COUNT_VARIANCE_STATUSES.EXPECTED_UNAVAILABLE;
  const variance = calculateVariance(expected, counted);
  const absVariance = Math.abs(Number(variance || 0));
  if (absVariance === 0) return STOCK_COUNT_VARIANCE_STATUSES.NO_VARIANCE;
  const risk = riskForVariance(absVariance, expected);
  if (risk === "low") return STOCK_COUNT_VARIANCE_STATUSES.WITHIN_TOLERANCE;
  return STOCK_COUNT_VARIANCE_STATUSES.REVIEW_REQUIRED;
}

export function isCountSessionReadOnly(status) {
  return [STOCK_COUNT_STATUSES.SUBMITTED, STOCK_COUNT_STATUSES.APPROVED, STOCK_COUNT_STATUSES.CLOSED, STOCK_COUNT_STATUSES.CANCELLED].includes(status);
}

export function canReviewCountSession(role) {
  return ["Supervisor", "Manager", "Admin"].includes(role);
}

export function canApproveCountSession(role, summary = {}) {
  if (["Manager", "Admin"].includes(role)) return true;
  if (role !== "Supervisor") return false;
  return Number(summary.recountRequired || 0) === 0 && Number(summary.highRiskVariances || 0) === 0;
}

export function canCloseCountSession(role) {
  return ["Manager", "Admin"].includes(role);
}

export function getCountSessions() {
  return read(STORAGE_KEYS.sessions, []);
}

export function saveCountSessions(sessions) {
  return write(STORAGE_KEYS.sessions, sessions);
}

export function getCountSessionItems(sessionId = null) {
  const items = read(STORAGE_KEYS.items, []);
  return sessionId ? items.filter((item) => item.session_id === sessionId || item.count_session_id === sessionId) : items;
}

export function saveCountSessionItems(items) {
  return write(STORAGE_KEYS.items, items);
}

export function getCountItemAttributeSnapshots() {
  return read(STORAGE_KEYS.attributeSnapshots, []);
}

export function saveCountItemAttributeSnapshot(snapshot) {
  if (!snapshot) return null;
  write(STORAGE_KEYS.attributeSnapshots, [snapshot, ...getCountItemAttributeSnapshots()].slice(0, 300));
  return snapshot;
}

export function getCountVarianceRules() {
  const existing = read(STORAGE_KEYS.varianceRules, []);
  if (existing.length) return existing;
  write(STORAGE_KEYS.varianceRules, DEFAULT_COUNT_VARIANCE_RULES);
  return DEFAULT_COUNT_VARIANCE_RULES;
}

export function getCountRecountRequests(sessionId = null) {
  const requests = read(STORAGE_KEYS.recountRequests, []);
  return sessionId ? requests.filter((request) => request.session_id === sessionId) : requests;
}

export function getCountRecountEvidence(requestId = null) {
  const evidence = read(STORAGE_KEYS.recountEvidence, []);
  return requestId ? evidence.filter((entry) => entry.recount_request_id === requestId) : evidence;
}

export function getCountApprovalEvents(sessionId = null) {
  const events = read(STORAGE_KEYS.approvalEvents, []);
  return sessionId ? events.filter((event) => event.session_id === sessionId) : events;
}

export function createCountSession(countType, patch = {}) {
  const actor = currentActor();
  const now = nowIso();
  const session = {
    id: makeStockCountId("count_session"),
    count_session_id: null,
    session_name: patch.session_name || `${getStockCountTypeMeta(countType).title}`,
    area: patch.area || patch.count_area || "dairy_chilled",
    area_label: patch.area_label || patch.count_area_label || getOptionLabel(STOCK_COUNT_AREA_OPTIONS, patch.area || patch.count_area || "dairy_chilled"),
    department: patch.department || actor.departmentName || actor.departmentId || "Grocery",
    assigned_user_id: patch.assigned_user_id || actor.actorUserId,
    assigned_user_name: patch.assigned_user_name || actor.actorName,
    assigned_role_scope: patch.assigned_role_scope || "assigned_user",
    status: patch.status || STOCK_COUNT_STATUSES.DRAFT,
    count_type: countType,
    count_type_label: patch.count_type_label || getStockCountTypeMeta(countType).title,
    count_area: patch.count_area || patch.area || "dairy_chilled",
    count_area_label: patch.count_area_label || patch.area_label || getOptionLabel(STOCK_COUNT_AREA_OPTIONS, patch.count_area || patch.area || "dairy_chilled"),
    count_mode: patch.count_mode || "unguided_scan_count",
    count_mode_label: patch.count_mode_label || getOptionLabel(STOCK_COUNT_MODE_OPTIONS, patch.count_mode || "unguided_scan_count"),
    store_location_id: actor.storeId,
    department_id: actor.departmentId,
    zone_id: patch.zone_id || null,
    created_by: actor.actorUserId,
    created_by_user_id: actor.actorUserId,
    created_by_name: actor.actorName,
    created_by_role: actor.actorRole,
    created_at: now,
    started_at: patch.status === STOCK_COUNT_STATUSES.IN_PROGRESS ? now : null,
    submitted_at: null,
    approved_by: null,
    approved_by_name: null,
    approved_at: null,
    closed_at: null,
    cancelled_reason: "",
    source: "ScanOps handheld",
    sync_status: "Saved on device",
    approval_status: "Not submitted",
    applies_stock_directly: false,
    count_lines: [],
    ...patch,
  };
  session.count_session_id = session.count_session_id || session.id;
  return session;
}

export function upsertCountSession(session) {
  if (!session?.id && !session?.count_session_id) return null;
  const sessionId = session.id || session.count_session_id;
  const normalized = { ...session, id: sessionId, count_session_id: session.count_session_id || sessionId };
  const sessions = getCountSessions();
  const exists = sessions.some((entry) => (entry.id || entry.count_session_id) === sessionId);
  const next = exists ? sessions.map((entry) => ((entry.id || entry.count_session_id) === sessionId ? normalized : entry)) : [normalized, ...sessions];
  saveCountSessions(next);
  return normalized;
}

export function updateCountSession(sessionId, patch = {}) {
  let updated = null;
  const next = getCountSessions().map((session) => {
    const id = session.id || session.count_session_id;
    if (id !== sessionId) return session;
    updated = { ...session, ...patch, id, count_session_id: session.count_session_id || id };
    return updated;
  });
  saveCountSessions(next);
  return updated;
}

export function setCountSessionStatus(sessionId, status, patch = {}) {
  const timestampPatch = {};
  if (status === STOCK_COUNT_STATUSES.IN_PROGRESS) timestampPatch.started_at = patch.started_at || nowIso();
  if (status === STOCK_COUNT_STATUSES.SUBMITTED || status === STOCK_COUNT_STATUSES.REVIEW_REQUIRED) timestampPatch.submitted_at = patch.submitted_at || nowIso();
  if (status === STOCK_COUNT_STATUSES.APPROVED) timestampPatch.approved_at = patch.approved_at || nowIso();
  if (status === STOCK_COUNT_STATUSES.CLOSED) timestampPatch.closed_at = patch.closed_at || nowIso();
  return updateCountSession(sessionId, { ...timestampPatch, ...patch, status });
}

export function createCountLine({ session, product, countedQuantity, reason = null, note = "", attributeSnapshot = null, conditionNote = "normal" }) {
  const actor = currentActor();
  const expectedQuantity = expectedQuantityForItem(product);
  const varianceQuantity = calculateVariance(expectedQuantity, countedQuantity);
  const varianceStatus = getCountVarianceStatus(expectedQuantity, countedQuantity, product);
  const absVariance = Math.abs(Number(varianceQuantity || 0));
  const riskLevel = expectedQuantity === null ? "unknown" : riskForVariance(absVariance, expectedQuantity);
  const now = nowIso();
  return {
    id: makeStockCountId("count_item"),
    count_line_id: null,
    session_id: session?.id || session?.count_session_id,
    count_session_id: session?.count_session_id || session?.id,
    item_id: product?.internalItemId || product?.itemId || product?.productId || product?.id,
    product_id: product?.internalItemId || product?.productId || product?.id,
    sku: product?.sku || null,
    barcode: product?.barcode || product?.gtin || null,
    plu: product?.plu || product?.scaleCode || null,
    item_snapshot: {
      name: product?.name || product?.item_name || "Scanned item",
      sku: product?.sku || "",
      barcode: product?.barcode || product?.gtin || "",
      plu: product?.plu || product?.scaleCode || "",
      department: product?.department || product?.category || "",
      unit_type: product?.unitType || product?.unit_type || product?.unit || "each",
      match_reason: product?._searchMatch?.displayReason || null,
    },
    item_name: product?.name || product?.item_name || "Scanned item",
    unit_type: product?.unitType || product?.unit_type || product?.unit || "each",
    unitType: product?.unitType || product?.unit_type || product?.unit || "each",
    expected_quantity: expectedQuantity,
    counted_quantity: Number(countedQuantity || 0),
    variance_quantity: varianceQuantity,
    variance_status: varianceStatus,
    variance_risk: riskLevel,
    location_id: product?.shelfLocation || product?.location || null,
    reason_code: reason,
    evidence_note: note,
    condition_note: conditionNote,
    attribute_snapshot: attributeSnapshot,
    recounts: [],
    recount_request_id: null,
    created_by: actor.actorUserId,
    created_by_name: actor.actorName,
    created_by_role: actor.actorRole,
    counted_by_user_id: actor.actorUserId,
    counted_at: now,
    created_at: now,
    updated_at: now,
    applies_stock_directly: false,
    review_status: varianceStatus,
    sync_status: varianceStatus === STOCK_COUNT_VARIANCE_STATUSES.NO_VARIANCE ? "Ready to sync" : "Review Required",
  };
}

export function upsertCountSessionItem(line) {
  if (!line?.session_id && !line?.count_session_id) return null;
  const lineId = line.id || line.count_line_id || makeStockCountId("count_item");
  const normalized = { ...line, id: lineId, count_line_id: line.count_line_id || lineId, updated_at: nowIso() };
  const itemKey = `${normalized.session_id || normalized.count_session_id}|${normalized.item_id || normalized.sku || normalized.barcode}|${normalized.attribute_snapshot?.attributeKey || normalized.attribute_snapshot?.attribute_key || "none"}`;
  const items = getCountSessionItems();
  const exists = items.some((item) => {
    const currentKey = `${item.session_id || item.count_session_id}|${item.item_id || item.sku || item.barcode}|${item.attribute_snapshot?.attributeKey || item.attribute_snapshot?.attribute_key || "none"}`;
    return item.id === lineId || item.count_line_id === lineId || currentKey === itemKey;
  });
  const next = exists ? items.map((item) => {
    const currentKey = `${item.session_id || item.count_session_id}|${item.item_id || item.sku || item.barcode}|${item.attribute_snapshot?.attributeKey || item.attribute_snapshot?.attribute_key || "none"}`;
    return item.id === lineId || item.count_line_id === lineId || currentKey === itemKey ? { ...normalized, id: item.id || lineId, count_line_id: item.count_line_id || lineId, created_at: item.created_at || normalized.created_at } : item;
  }) : [normalized, ...items];
  saveCountSessionItems(next);
  return normalized;
}

export function updateCountSessionItem(lineId, patch = {}) {
  let updated = null;
  const next = getCountSessionItems().map((line) => {
    if ((line.id || line.count_line_id) !== lineId) return line;
    updated = { ...line, ...patch, updated_at: nowIso() };
    return updated;
  });
  saveCountSessionItems(next);
  return updated;
}


export function deleteCountSessionItem(lineId) {
  const next = getCountSessionItems().filter((line) => (line.id || line.count_line_id) !== lineId);
  saveCountSessionItems(next);
  return next;
}

export function requestCountRecount({ sessionId, sessionItemId, reason = "Variance exceeds threshold" }) {
  const actor = currentActor();
  const request = {
    id: makeStockCountId("recount_request"),
    session_id: sessionId,
    session_item_id: sessionItemId,
    requested_by: actor.actorUserId,
    requested_by_name: actor.actorName,
    requested_by_role: actor.actorRole,
    requested_at: nowIso(),
    reason,
    status: "Open",
  };
  write(STORAGE_KEYS.recountRequests, [request, ...getCountRecountRequests()].slice(0, 200));
  updateCountSessionItem(sessionItemId, {
    variance_status: STOCK_COUNT_VARIANCE_STATUSES.RECOUNT_REQUESTED,
    review_status: STOCK_COUNT_VARIANCE_STATUSES.RECOUNT_REQUESTED,
    recount_request_id: request.id,
  });
  setCountSessionStatus(sessionId, STOCK_COUNT_STATUSES.RECOUNT_REQUIRED);
  return request;
}

export function submitCountRecount({ requestId, sessionItemId, recountQuantity, evidenceNote = "" }) {
  const actor = currentActor();
  const line = getCountSessionItems().find((item) => (item.id || item.count_line_id) === sessionItemId);
  const expectedQuantity = line?.expected_quantity;
  const varianceQuantity = calculateVariance(expectedQuantity, recountQuantity);
  const evidence = {
    id: makeStockCountId("recount_evidence"),
    recount_request_id: requestId,
    session_item_id: sessionItemId,
    original_count_quantity: line?.counted_quantity,
    recount_quantity: Number(recountQuantity || 0),
    recount_variance_quantity: varianceQuantity,
    evidence_note: evidenceNote,
    created_by: actor.actorUserId,
    created_by_name: actor.actorName,
    created_by_role: actor.actorRole,
    created_at: nowIso(),
  };
  write(STORAGE_KEYS.recountEvidence, [evidence, ...getCountRecountEvidence()].slice(0, 200));
  const nextRequests = getCountRecountRequests().map((request) => request.id === requestId ? { ...request, status: "Completed", completed_at: evidence.created_at, completed_by: actor.actorUserId } : request);
  write(STORAGE_KEYS.recountRequests, nextRequests);
  updateCountSessionItem(sessionItemId, {
    variance_status: STOCK_COUNT_VARIANCE_STATUSES.RECOUNT_COMPLETED,
    review_status: STOCK_COUNT_VARIANCE_STATUSES.RECOUNT_COMPLETED,
    recounts: [...(line?.recounts || []), evidence],
  });
  if (line?.session_id || line?.count_session_id) setCountSessionStatus(line.session_id || line.count_session_id, STOCK_COUNT_STATUSES.REVIEW_REQUIRED);
  return evidence;
}

export function recordCountApprovalEvent({ sessionId, sessionItemId = null, action, reason = "" }) {
  const actor = currentActor();
  const event = {
    id: makeStockCountId("count_approval_event"),
    session_id: sessionId,
    session_item_id: sessionItemId,
    action,
    actor_id: actor.actorUserId,
    actor_name: actor.actorName,
    actor_role: actor.actorRole,
    reason,
    created_at: nowIso(),
  };
  write(STORAGE_KEYS.approvalEvents, [event, ...getCountApprovalEvents()].slice(0, 240));
  return event;
}

export function acceptCountEvidence(sessionId, sessionItemId, reason = "Evidence accepted") {
  const line = updateCountSessionItem(sessionItemId, {
    variance_status: STOCK_COUNT_VARIANCE_STATUSES.ACCEPTED,
    review_status: STOCK_COUNT_VARIANCE_STATUSES.ACCEPTED,
  });
  recordCountApprovalEvent({ sessionId, sessionItemId, action: "accept_evidence", reason });
  return line;
}

export function getSessionVarianceSummary(lines = []) {
  const varianceLines = lines.filter((line) => {
    const status = line.varianceStatus || line.variance_status;
    if (status === STOCK_COUNT_VARIANCE_STATUSES.EXPECTED_UNAVAILABLE) return true;
    return Number(line.variance ?? line.variance_quantity ?? 0) !== 0;
  });
  const totalVariance = varianceLines.reduce((total, line) => total + Number(line.variance ?? line.variance_quantity ?? 0), 0);
  const recountRequired = lines.filter((line) => [STOCK_COUNT_VARIANCE_STATUSES.RECOUNT_REQUESTED].includes(line.variance_status || line.varianceStatus)).length;
  const accepted = lines.filter((line) => (line.variance_status || line.varianceStatus) === STOCK_COUNT_VARIANCE_STATUSES.ACCEPTED).length;
  const highRiskVariances = varianceLines.filter((line) => (line.variance_risk || "") === "high").length;
  return {
    countedItems: lines.length,
    varianceItems: varianceLines.length,
    totalVariance: Number(totalVariance.toFixed(3)),
    recountRequired,
    accepted,
    highRiskVariances,
    requiresReview: varianceLines.length > 0,
  };
}

export function isSessionVisibleToRole(session, actor = getScanOpsSession()) {
  const role = actor.actorRole;
  if (["Manager", "Admin"].includes(role)) return true;
  if (role === "Supervisor") return session.department_id === actor.departmentId || session.department === actor.departmentName || session.assigned_role_scope === "team";
  return (session.assigned_user_id || session.created_by_user_id || session.created_by) === actor.actorUserId;
}
