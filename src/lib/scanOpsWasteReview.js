import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "./scanOpsEvents";
import { getScanOpsSession, buildEventIdentity } from "./scanOpsSession";
import { MARKDOWN_STATUSES, getMarkdownApprovalRequests } from "./scanOpsMarkdownApproval";
import { getCurrencySymbol } from "./scanOpsRequestLifecycle";
import { normalizeSelectedScanItem } from "./scanOpsWorkflowBatch";

const REVIEWS_KEY = "invyra_scanops_waste_reviews_v1";
const EVENTS_KEY = "invyra_scanops_waste_review_events_v1";
const CONTRACTS_KEY = "invyra_scanops_inventory_adjustment_contracts_v0";
const MAX_RECORDS = 150;

export const WASTE_REVIEW_VERSION = "SCANOPS_WASTE_REVIEW_V1";
export const ADJUSTMENT_CONTRACT_VERSION = "SCANOPS_INVENTORY_ADJUSTMENT_CONTRACT_V0";

export const WASTE_REVIEW_STATUSES = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending Review",
  PENDING_SUPERVISOR_APPROVAL: "Pending Supervisor Approval",
  PENDING_MANAGER_APPROVAL: "Pending Manager Approval",
  APPROVED: "Approved",
  RETURNED: "Returned",
  REJECTED: "Rejected",
  BLOCKED: "Blocked",
  SHRINK_REVIEW_REQUIRED: "Shrink Review Required",
  ADJUSTMENT_CONTRACT_READY: "Adjustment Contract Ready",
  ADJUSTMENT_CONTRACT_CREATED: "Adjustment Contract Created",
  SYNC_DEFERRED: "Sync Deferred",
};

export const WASTE_REVIEW_FILTERS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "blocked", label: "Blocked" },
  { id: "shrink", label: "Shrink" },
];

export const WASTE_REVIEW_TYPE_OPTIONS = [
  { id: "waste", label: "Waste" },
  { id: "shrink", label: "Shrink" },
  { id: "supplier_fault", label: "Supplier Fault" },
  { id: "operational_use", label: "Operational Use" },
  { id: "markdown_block_escalation", label: "Markdown Block Escalation" },
  { id: "count_discrepancy", label: "Count Discrepancy" },
];

export const WASTE_REVIEW_REASON_OPTIONS = [
  { id: "expired_out_of_date", label: "Expired / out of date", reviewType: "waste", reorderImpact: "EXCLUDED_FROM_REORDER", helper: "Unsafe/expired stock; do not treat as demand." },
  { id: "spoiled_rotten", label: "Spoiled / rotten", reviewType: "waste", reorderImpact: "EXCLUDED_FROM_REORDER", helper: "Quality loss; report without inflating demand." },
  { id: "damaged_in_handling", label: "Damaged in handling", reviewType: "waste", reorderImpact: "INCLUDED_IN_REORDER_INTELLIGENCE", helper: "Operational loss; may still inform replenishment." },
  { id: "spillage", label: "Spillage", reviewType: "waste", reorderImpact: "INCLUDED_IN_REORDER_INTELLIGENCE", helper: "Known store-floor loss." },
  { id: "temperature_issue", label: "Temperature issue", reviewType: "waste", reorderImpact: "EXCLUDED_FROM_REORDER", helper: "Food-safety hold; manager visibility recommended." },
  { id: "packaging_broken", label: "Packaging broken", reviewType: "waste", reorderImpact: "INCLUDED_IN_REORDER_INTELLIGENCE", helper: "Sellability issue with evidence." },
  { id: "contamination_risk", label: "Contamination risk", reviewType: "waste", reorderImpact: "EXCLUDED_FROM_REORDER", helper: "Safety risk; requires escalation." },
  { id: "theft_suspected_theft", label: "Theft / suspected theft", reviewType: "shrink", reorderImpact: "INCLUDED_IN_REORDER_INTELLIGENCE", helper: "Suspicious loss; manager review required." },
  { id: "missing_stock", label: "Missing stock", reviewType: "shrink", reorderImpact: "INCLUDED_IN_REORDER_INTELLIGENCE", helper: "Unexplained variance." },
  { id: "unknown_loss", label: "Unknown loss", reviewType: "shrink", reorderImpact: "INCLUDED_IN_REORDER_INTELLIGENCE", helper: "Reason unclear; requires governance." },
  { id: "count_discrepancy", label: "Count discrepancy", reviewType: "count_discrepancy", reorderImpact: "INCLUDED_IN_REORDER_INTELLIGENCE", helper: "Variance from count or quick count." },
  { id: "seal_tampering", label: "Seal tampering", reviewType: "shrink", reorderImpact: "INCLUDED_IN_REORDER_INTELLIGENCE", helper: "Suspicious product integrity issue." },
  { id: "high_value_discrepancy", label: "High-value discrepancy", reviewType: "shrink", reorderImpact: "INCLUDED_IN_REORDER_INTELLIGENCE", helper: "Manager review required." },
  { id: "production_use", label: "Production use", reviewType: "operational_use", reorderImpact: "INCLUDED_IN_REORDER_INTELLIGENCE", helper: "Used by store production/department." },
  { id: "sampling_promos", label: "Sampling / promos", reviewType: "operational_use", reorderImpact: "INCLUDED_IN_REORDER_INTELLIGENCE", helper: "Known promotional usage." },
  { id: "training_use", label: "Training use", reviewType: "operational_use", reorderImpact: "EXCLUDED_FROM_REORDER", helper: "Reportable internal use." },
  { id: "store_use", label: "Store use", reviewType: "operational_use", reorderImpact: "EXCLUDED_FROM_REORDER", helper: "Internal use; not customer demand." },
  { id: "supplier_fault", label: "Supplier fault", reviewType: "supplier_fault", reorderImpact: "EXCLUDED_FROM_REORDER", helper: "Reportable but should not count as demand." },
  { id: "damaged_on_arrival", label: "Damaged on arrival", reviewType: "supplier_fault", reorderImpact: "EXCLUDED_FROM_REORDER", helper: "Inbound supplier issue." },
  { id: "short_supplied", label: "Short supplied", reviewType: "supplier_fault", reorderImpact: "EXCLUDED_FROM_REORDER", helper: "Inbound discrepancy; credit/return deferred." },
  { id: "wrong_item_supplied", label: "Wrong item supplied", reviewType: "supplier_fault", reorderImpact: "EXCLUDED_FROM_REORDER", helper: "Supplier issue; no store-demand signal." },
];

const SHRINK_REASONS = new Set([
  "theft_suspected_theft",
  "missing_stock",
  "unknown_loss",
  "count_discrepancy",
  "seal_tampering",
  "high_value_discrepancy",
]);

const MANAGER_REASONS = new Set([
  "theft_suspected_theft",
  "missing_stock",
  "unknown_loss",
  "seal_tampering",
  "high_value_discrepancy",
  "contamination_risk",
  "temperature_issue",
]);

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function compactDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function safeRead(key, fallback = []) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`Unable to read ${key}`, error);
    return fallback;
  }
}

function safeWrite(key, rows) {
  if (typeof window === "undefined") return rows;
  try {
    window.localStorage.setItem(key, JSON.stringify(rows.slice(0, MAX_RECORDS)));
  } catch (error) {
    console.warn(`Unable to persist ${key}`, error);
  }
  return rows;
}

function identitySnapshot() {
  const identity = buildEventIdentity(getScanOpsSession());
  return {
    actorUserId: identity.actorUserId || identity.user_id || null,
    actorName: identity.actorName || identity.user_name || "ScanOps user",
    actorRole: identity.actorRole || identity.role || "Staff",
    deviceId: identity.deviceId || identity.scanner_id || null,
    scannerId: identity.scannerId || identity.scanner_id || null,
    storeId: identity.storeId || identity.location_id || null,
    departmentId: identity.departmentId || null,
    sessionId: identity.sessionId || null,
    shiftId: getScanOpsSession()?.shiftId || "shift_demo_001",
  };
}

function appendWasteReviewEvent(eventType, review, extra = {}) {
  const event = {
    eventId: makeId("waste_evt"),
    eventType,
    reviewId: review?.reviewId || extra.reviewId || null,
    itemName: review?.itemName || extra.itemName || null,
    sku: review?.sku || extra.sku || null,
    barcode: review?.barcode || extra.barcode || null,
    status: review?.status || extra.status || "recorded",
    ...identitySnapshot(),
    ...extra,
    createdAt: nowIso(),
  };
  safeWrite(EVENTS_KEY, [event, ...safeRead(EVENTS_KEY)]);
  return event;
}

export function getWasteReviewEvents() {
  return safeRead(EVENTS_KEY);
}

export function getWasteReviewReason(reasonCode) {
  return WASTE_REVIEW_REASON_OPTIONS.find((option) => option.id === reasonCode) || WASTE_REVIEW_REASON_OPTIONS[0];
}

export function getWasteReviewOptionLabel(options, id, fallback = "—") {
  return options.find((option) => option.id === id)?.label || fallback;
}

export function calculateDaysToExpiry(expiryDate, reference = new Date()) {
  const dateOnly = compactDate(expiryDate);
  if (!dateOnly) return null;
  const expiry = new Date(`${dateOnly}T00:00:00`);
  const ref = new Date(reference);
  ref.setHours(0, 0, 0, 0);
  if (Number.isNaN(expiry.getTime())) return null;
  return Math.round((expiry.getTime() - ref.getTime()) / 86400000);
}

export function classifyWasteReview({ reasonCode, quantity = 1, estimatedUnitCost = null, reviewType = null }) {
  const reason = getWasteReviewReason(reasonCode);
  const qty = Math.max(1, Number(quantity || 1));
  const unitCost = estimatedUnitCost == null || estimatedUnitCost === "" ? null : Number(estimatedUnitCost);
  const estimatedTotalCost = Number.isFinite(unitCost) ? Number((unitCost * qty).toFixed(2)) : null;
  const derivedType = reviewType || reason.reviewType || "waste";
  const shrinkReviewRequired = derivedType === "shrink" || SHRINK_REASONS.has(reasonCode);
  const highValue = estimatedTotalCost != null && estimatedTotalCost >= 1000;
  const managerReviewRequired = shrinkReviewRequired || highValue || MANAGER_REASONS.has(reasonCode);
  const approvalRoleRequired = managerReviewRequired ? "Manager" : "Supervisor";
  const approvalRequired = true;
  const riskLevel = shrinkReviewRequired ? (highValue ? "High shrink" : "Shrink") : managerReviewRequired ? "High" : "Normal";
  const reorderImpact = reason.reorderImpact || "EXCLUDED_FROM_REORDER";
  const reorderImpactReason = reorderImpact === "INCLUDED_IN_REORDER_INTELLIGENCE"
    ? "Included in demand/reorder intelligence as an operational loss signal."
    : "Excluded from reorder demand calculations; reportable only.";

  return {
    reviewType: derivedType,
    riskLevel,
    estimatedTotalCost,
    reorderImpact,
    reorderImpactReason,
    approvalRequired,
    approvalRoleRequired,
    shrinkReviewRequired,
    shrinkSeverity: shrinkReviewRequired ? (highValue ? "High" : "Normal") : "None",
    managerReviewRequired,
  };
}

function normalizeItem(item) {
  const selected = /** @type {any} */ (normalizeSelectedScanItem(item, "manual_search") || {});
  const raw = /** @type {any} */ (item || {});
  return {
    itemId: selected.itemId || raw.id || raw.internalItemId || makeId("item"),
    sku: selected.sku || raw.sku || null,
    barcode: selected.barcode || raw.barcode || raw.gtin || null,
    itemName: selected.itemName || raw.name || raw.item_name || "Scanned item",
    department: raw.department || raw.category || selected.department || "Store floor",
    shelfLocation: raw.shelfLocation || raw.location || raw.aisle || raw.shelf || "Shelf location pending",
    unitOfMeasure: raw.unitType || raw.unit_type || selected.unit || "each",
    estimatedUnitCost: raw.unitCost ?? raw.unit_cost ?? null,
    currency: getCurrencySymbol(raw),
    rawItem: selected,
  };
}

function normalizeReview(input = {}) {
  const createdAt = input.createdAt || nowIso();
  const reason = getWasteReviewReason(input.reasonCode || "expired_out_of_date");
  const classification = classifyWasteReview({
    reasonCode: reason.id,
    quantity: input.quantity,
    estimatedUnitCost: input.estimatedUnitCost,
    reviewType: input.reviewType || reason.reviewType,
  });
  const identity = identitySnapshot();
  const status = input.status || WASTE_REVIEW_STATUSES.DRAFT;

  return {
    reviewId: input.reviewId || makeId("waste_review"),
    reviewVersion: WASTE_REVIEW_VERSION,

    status,
    sourceWorkflow: input.sourceWorkflow || "WASTE_REVIEW",
    sourceRequestId: input.sourceRequestId || null,

    itemId: input.itemId || null,
    sku: input.sku || null,
    barcode: input.barcode || null,
    itemName: input.itemName || "Scanned item",
    department: input.department || "Store floor",
    shelfLocation: input.shelfLocation || "Shelf location pending",

    reviewType: input.reviewType || classification.reviewType,
    reasonCode: reason.id,
    reasonLabel: input.reasonLabel || reason.label,
    quantity: Math.max(1, Number(input.quantity || 1)),
    unitOfMeasure: input.unitOfMeasure || "each",

    expiryDate: compactDate(input.expiryDate),
    daysToExpiry: input.daysToExpiry ?? calculateDaysToExpiry(input.expiryDate),
    batchLot: input.batchLot || "",

    riskLevel: input.riskLevel || classification.riskLevel,
    valueImpact: input.valueImpact || (classification.estimatedTotalCost != null ? "Estimated" : "Unpriced"),
    estimatedUnitCost: input.estimatedUnitCost == null || input.estimatedUnitCost === "" ? null : Number(input.estimatedUnitCost),
    estimatedTotalCost: input.estimatedTotalCost ?? classification.estimatedTotalCost,
    currency: input.currency || "₱",

    reorderImpact: input.reorderImpact || classification.reorderImpact,
    reorderImpactReason: input.reorderImpactReason || classification.reorderImpactReason,

    evidenceRequired: input.evidenceRequired ?? true,
    evidenceStatus: input.evidenceStatus || (input.evidenceNote ? "NOTE_CAPTURED_ATTACHMENT_DEFERRED" : "NOTE_REQUIRED"),
    evidenceNote: input.evidenceNote || "",
    evidenceAttachmentDeferred: input.evidenceAttachmentDeferred ?? true,

    approvalRequired: input.approvalRequired ?? classification.approvalRequired,
    approvalRoleRequired: input.approvalRoleRequired || classification.approvalRoleRequired,
    approvalDecision: input.approvalDecision || null,
    approvalReason: input.approvalReason || "",

    adjustmentRequired: input.adjustmentRequired ?? true,
    adjustmentContractStatus: input.adjustmentContractStatus || "Pending",
    linkedAdjustmentContractId: input.linkedAdjustmentContractId || null,

    shrinkReviewRequired: input.shrinkReviewRequired ?? classification.shrinkReviewRequired,
    shrinkSeverity: input.shrinkSeverity || classification.shrinkSeverity,
    managerReviewRequired: input.managerReviewRequired ?? classification.managerReviewRequired,

    requestedBy: input.requestedBy || identity.actorName,
    requestedByRole: input.requestedByRole || identity.actorRole,
    requestedById: input.requestedById || identity.actorUserId,
    approvedBy: input.approvedBy || null,
    approvedByRole: input.approvedByRole || null,

    deviceId: input.deviceId || identity.deviceId,
    scannerId: input.scannerId || identity.scannerId,
    sessionId: input.sessionId || identity.sessionId,
    shiftId: input.shiftId || identity.shiftId,
    storeId: input.storeId || identity.storeId,

    rawItem: input.rawItem || null,
    createdAt,
    submittedAt: input.submittedAt || null,
    updatedAt: input.updatedAt || createdAt,

    appliesStockDirectly: false,
    appliesPriceDirectly: false,
    inventoryMutationImplemented: false,
    syncStatus: input.syncStatus || "SYNC_DEFERRED_STAGE_AH",
  };
}

function getRawWasteReviews() {
  return safeRead(REVIEWS_KEY);
}

function saveRawWasteReviews(reviews) {
  return safeWrite(REVIEWS_KEY, reviews);
}

export function getAdjustmentContracts() {
  return safeRead(CONTRACTS_KEY);
}

export function saveWasteReview(review) {
  const normalized = normalizeReview(review);
  const current = getRawWasteReviews();
  const next = [normalized, ...current.filter((entry) => entry.reviewId !== normalized.reviewId)].slice(0, MAX_RECORDS);
  saveRawWasteReviews(next);
  return normalized;
}

function mapMarkdownReasonToWasteReason(markdownRequest) {
  if (markdownRequest?.wasteReviewRequired) return "expired_out_of_date";
  if (markdownRequest?.daysToExpiry != null && markdownRequest.daysToExpiry < 0) return "expired_out_of_date";
  if (markdownRequest?.reasonCode === "damaged_packaging") return "packaging_broken";
  return "expired_out_of_date";
}

export function ensureMarkdownBlockedWasteReviews() {
  const markdownBlocked = getMarkdownApprovalRequests().filter((request) => (
    request.status === MARKDOWN_STATUSES.BLOCKED_WASTE_REVIEW_REQUIRED || request.wasteReviewRequired
  ));
  if (!markdownBlocked.length) return getRawWasteReviews();

  const current = getRawWasteReviews();
  const currentSourceIds = new Set(current.map((review) => `${review.sourceWorkflow}:${review.sourceRequestId}`));
  const bridged = markdownBlocked
    .filter((request) => !currentSourceIds.has(`MARKDOWN_BLOCK:${request.requestId}`))
    .map((request) => normalizeReview({
      status: WASTE_REVIEW_STATUSES.PENDING_REVIEW,
      sourceWorkflow: "MARKDOWN_BLOCK",
      sourceRequestId: request.requestId,
      itemId: request.itemId,
      sku: request.sku,
      barcode: request.barcode,
      itemName: request.itemName,
      department: request.department,
      shelfLocation: request.shelfLocation,
      reviewType: "markdown_block_escalation",
      reasonCode: mapMarkdownReasonToWasteReason(request),
      quantity: request.quantity || 1,
      unitOfMeasure: "each",
      expiryDate: request.expiryDate,
      batchLot: request.batchLot || "",
      estimatedUnitCost: null,
      currency: request.currency || "₱",
      evidenceNote: request.blockedReason || "Markdown blocked: waste review required.",
      evidenceStatus: "NOTE_CAPTURED_ATTACHMENT_DEFERRED",
      evidenceAttachmentDeferred: true,
      requestedBy: request.requestedBy,
      requestedByRole: request.requestedByRole,
      requestedById: request.requestedById,
      deviceId: request.deviceId,
      scannerId: request.scannerId,
      sessionId: request.sessionId,
      storeId: request.storeId,
      rawItem: request.rawItem,
      createdAt: request.createdAt,
      submittedAt: request.submittedAt || nowIso(),
    }));

  if (!bridged.length) return current;
  const next = [...bridged, ...current].slice(0, MAX_RECORDS);
  saveRawWasteReviews(next);
  bridged.forEach((review) => {
    appendWasteReviewEvent(SCANOPS_EVENT_TYPES.WASTE_REVIEW_BRIDGED_FROM_MARKDOWN, review, {
      source_markdown_request_id: review.sourceRequestId,
      applies_price_directly: false,
      applies_stock_directly: false,
    });
    createScanOpsEvent(SCANOPS_EVENT_TYPES.WASTE_REVIEW_BRIDGED_FROM_MARKDOWN, {
      source_module: "Waste Review",
      review_id: review.reviewId,
      source_markdown_request_id: review.sourceRequestId,
      item_name: review.itemName,
      sku: review.sku,
      barcode: review.barcode,
      status: review.status,
      applies_price_directly: false,
      applies_stock_directly: false,
    });
  });
  return next;
}

export function getWasteReviews() {
  ensureMarkdownBlockedWasteReviews();
  return getRawWasteReviews();
}

export function createWasteReviewDraft({ item, reasonCode, quantity, expiryDate, batchLot, shelfLocation, evidenceNote }) {
  const itemSnapshot = normalizeItem(item || {});
  const review = saveWasteReview({
    status: WASTE_REVIEW_STATUSES.DRAFT,
    sourceWorkflow: "WASTE_REVIEW",
    ...itemSnapshot,
    shelfLocation: shelfLocation || itemSnapshot.shelfLocation,
    reasonCode,
    quantity,
    expiryDate,
    batchLot,
    evidenceNote,
    evidenceStatus: evidenceNote ? "NOTE_CAPTURED_ATTACHMENT_DEFERRED" : "NOTE_REQUIRED",
  });
  appendWasteReviewEvent(SCANOPS_EVENT_TYPES.WASTE_REVIEW_DRAFT_SAVED, review, { applies_stock_directly: false });
  createScanOpsEvent(SCANOPS_EVENT_TYPES.WASTE_REVIEW_DRAFT_SAVED, {
    source_module: "Waste Review",
    review_id: review.reviewId,
    item_name: review.itemName,
    sku: review.sku,
    barcode: review.barcode,
    reason_code: review.reasonCode,
    reason_label: review.reasonLabel,
    quantity: review.quantity,
    status: review.status,
    applies_stock_directly: false,
    applies_price_directly: false,
  });
  return review;
}

function roleRank(role) {
  return { Staff: 1, Supervisor: 2, Manager: 3, Admin: 4 }[role] || 1;
}

export function canSubmitWasteReview(review, session = getScanOpsSession()) {
  return Boolean(review) && [
    WASTE_REVIEW_STATUSES.DRAFT,
    WASTE_REVIEW_STATUSES.RETURNED,
    WASTE_REVIEW_STATUSES.PENDING_REVIEW,
  ].includes(review.status) && roleRank(session.actorRole) >= 1;
}

export function canApproveWasteReview(review, session = getScanOpsSession()) {
  if (!review || [WASTE_REVIEW_STATUSES.APPROVED, WASTE_REVIEW_STATUSES.REJECTED, WASTE_REVIEW_STATUSES.ADJUSTMENT_CONTRACT_CREATED].includes(review.status)) return false;
  const required = review.approvalRoleRequired === "Manager" ? 3 : 2;
  return roleRank(session.actorRole) >= required;
}

export function canCreateAdjustmentContract(review, session = getScanOpsSession()) {
  if (!review) return false;
  if (review.linkedAdjustmentContractId || review.adjustmentContractStatus === "Created") return false;
  if (![WASTE_REVIEW_STATUSES.APPROVED, WASTE_REVIEW_STATUSES.ADJUSTMENT_CONTRACT_READY].includes(review.status)) return false;
  return roleRank(session.actorRole) >= 3;
}

export function submitWasteReview(reviewId) {
  const review = getRawWasteReviews().find((entry) => entry.reviewId === reviewId);
  if (!review) return null;
  const nextStatus = review.managerReviewRequired || review.approvalRoleRequired === "Manager"
    ? WASTE_REVIEW_STATUSES.PENDING_MANAGER_APPROVAL
    : WASTE_REVIEW_STATUSES.PENDING_SUPERVISOR_APPROVAL;
  const updated = saveWasteReview({
    ...review,
    status: review.shrinkReviewRequired ? WASTE_REVIEW_STATUSES.SHRINK_REVIEW_REQUIRED : nextStatus,
    submittedAt: review.submittedAt || nowIso(),
    updatedAt: nowIso(),
  });
  appendWasteReviewEvent(SCANOPS_EVENT_TYPES.WASTE_REVIEW_SUBMITTED, updated, { applies_stock_directly: false });
  createScanOpsEvent(SCANOPS_EVENT_TYPES.WASTE_REVIEW_SUBMITTED, {
    source_module: "Waste Review",
    review_id: updated.reviewId,
    item_name: updated.itemName,
    sku: updated.sku,
    barcode: updated.barcode,
    status: updated.status,
    approval_role_required: updated.approvalRoleRequired,
    shrink_review_required: updated.shrinkReviewRequired,
    applies_stock_directly: false,
    applies_price_directly: false,
  });
  return updated;
}

export function decideWasteReview(reviewId, action, reason = "") {
  const review = getRawWasteReviews().find((entry) => entry.reviewId === reviewId);
  if (!review) return null;
  const identity = identitySnapshot();
  const actionMap = {
    approve: {
      status: WASTE_REVIEW_STATUSES.APPROVED,
      decision: "Approved",
      eventType: SCANOPS_EVENT_TYPES.WASTE_REVIEW_APPROVED,
      adjustmentContractStatus: "Ready",
    },
    return: {
      status: WASTE_REVIEW_STATUSES.RETURNED,
      decision: "Returned",
      eventType: SCANOPS_EVENT_TYPES.WASTE_REVIEW_RETURNED,
      adjustmentContractStatus: "Pending",
    },
    reject: {
      status: WASTE_REVIEW_STATUSES.REJECTED,
      decision: "Rejected",
      eventType: SCANOPS_EVENT_TYPES.WASTE_REVIEW_REJECTED,
      adjustmentContractStatus: "Not Required",
    },
  };
  const mapped = actionMap[action];
  if (!mapped) return review;
  const updated = saveWasteReview({
    ...review,
    status: mapped.status,
    approvalDecision: mapped.decision,
    approvalReason: reason || mapped.decision,
    adjustmentContractStatus: mapped.adjustmentContractStatus,
    approvedBy: action === "approve" ? identity.actorName : review.approvedBy,
    approvedByRole: action === "approve" ? identity.actorRole : review.approvedByRole,
    updatedAt: nowIso(),
  });
  appendWasteReviewEvent(mapped.eventType, updated, { action, approval_reason: updated.approvalReason, applies_stock_directly: false });
  createScanOpsEvent(mapped.eventType, {
    source_module: "Waste Review",
    review_id: updated.reviewId,
    item_name: updated.itemName,
    sku: updated.sku,
    barcode: updated.barcode,
    status: updated.status,
    action,
    approval_decision: updated.approvalDecision,
    approval_reason: updated.approvalReason,
    applies_stock_directly: false,
    applies_price_directly: false,
  });
  return updated;
}

export function createAdjustmentContract(reviewId) {
  const review = getRawWasteReviews().find((entry) => entry.reviewId === reviewId);
  if (!review) return { review: null, contract: null, duplicateBlocked: false };
  const existing = getAdjustmentContracts().find((contract) => contract.sourceReviewId === reviewId);
  if (existing || review.linkedAdjustmentContractId) {
    appendWasteReviewEvent(SCANOPS_EVENT_TYPES.WASTE_ADJUSTMENT_DUPLICATE_BLOCKED, review, {
      existing_adjustment_contract_id: existing?.adjustmentId || review.linkedAdjustmentContractId,
      applies_stock_directly: false,
    });
    createScanOpsEvent(SCANOPS_EVENT_TYPES.WASTE_ADJUSTMENT_DUPLICATE_BLOCKED, {
      source_module: "Waste Review",
      review_id: review.reviewId,
      existing_adjustment_contract_id: existing?.adjustmentId || review.linkedAdjustmentContractId,
      duplicate_blocked: true,
      applies_stock_directly: false,
    });
    return { review, contract: existing || null, duplicateBlocked: true };
  }
  const identity = identitySnapshot();
  const contract = {
    adjustmentContractVersion: ADJUSTMENT_CONTRACT_VERSION,
    adjustmentId: makeId("adj_contract"),
    sourceWorkflow: "WASTE_REVIEW",
    sourceReviewId: review.reviewId,

    itemId: review.itemId,
    sku: review.sku,
    barcode: review.barcode,
    itemName: review.itemName,
    quantity: review.quantity,
    unitOfMeasure: review.unitOfMeasure,
    adjustmentDirection: "DECREASE",
    reasonCode: review.reasonCode,
    reasonLabel: review.reasonLabel,

    inventoryMutationImplemented: false,
    syncStatus: "SYNC_DEFERRED_STAGE_AH",
    status: "SYNC_DEFERRED",

    approvedBy: review.approvedBy || identity.actorName,
    approvedByRole: review.approvedByRole || identity.actorRole,
    deviceId: review.deviceId || identity.deviceId,
    scannerId: review.scannerId || identity.scannerId,
    sessionId: review.sessionId || identity.sessionId,
    shiftId: review.shiftId || identity.shiftId,
    createdAt: nowIso(),
  };
  safeWrite(CONTRACTS_KEY, [contract, ...getAdjustmentContracts()]);
  const updated = saveWasteReview({
    ...review,
    status: WASTE_REVIEW_STATUSES.ADJUSTMENT_CONTRACT_CREATED,
    adjustmentContractStatus: "Created",
    linkedAdjustmentContractId: contract.adjustmentId,
    syncStatus: "SYNC_DEFERRED_STAGE_AH",
    updatedAt: nowIso(),
  });
  appendWasteReviewEvent(SCANOPS_EVENT_TYPES.WASTE_ADJUSTMENT_CONTRACT_CREATED, updated, {
    adjustment_contract_id: contract.adjustmentId,
    inventory_mutation_implemented: false,
    sync_status: contract.syncStatus,
  });
  createScanOpsEvent(SCANOPS_EVENT_TYPES.WASTE_ADJUSTMENT_CONTRACT_CREATED, {
    source_module: "Waste Review",
    review_id: updated.reviewId,
    adjustment_contract_id: contract.adjustmentId,
    item_name: updated.itemName,
    sku: updated.sku,
    barcode: updated.barcode,
    status: updated.status,
    inventory_mutation_implemented: false,
    sync_status: contract.syncStatus,
    applies_stock_directly: false,
    applies_price_directly: false,
  });
  return { review: updated, contract, duplicateBlocked: false };
}

export function filterWasteReviews(reviews = [], filter = "all") {
  if (filter === "all") return reviews;
  if (filter === "draft") return reviews.filter((review) => review.status === WASTE_REVIEW_STATUSES.DRAFT);
  if (filter === "pending") return reviews.filter((review) => [
    WASTE_REVIEW_STATUSES.PENDING_REVIEW,
    WASTE_REVIEW_STATUSES.PENDING_SUPERVISOR_APPROVAL,
    WASTE_REVIEW_STATUSES.PENDING_MANAGER_APPROVAL,
    WASTE_REVIEW_STATUSES.SHRINK_REVIEW_REQUIRED,
  ].includes(review.status));
  if (filter === "approved") return reviews.filter((review) => [
    WASTE_REVIEW_STATUSES.APPROVED,
    WASTE_REVIEW_STATUSES.ADJUSTMENT_CONTRACT_READY,
    WASTE_REVIEW_STATUSES.ADJUSTMENT_CONTRACT_CREATED,
    WASTE_REVIEW_STATUSES.SYNC_DEFERRED,
  ].includes(review.status));
  if (filter === "blocked") return reviews.filter((review) => review.status === WASTE_REVIEW_STATUSES.BLOCKED || review.sourceWorkflow === "MARKDOWN_BLOCK");
  if (filter === "shrink") return reviews.filter((review) => review.shrinkReviewRequired || review.reviewType === "shrink");
  return reviews;
}

export function formatReorderImpact(review) {
  if (!review) return "—";
  return review.reorderImpact === "INCLUDED_IN_REORDER_INTELLIGENCE"
    ? "Included in reorder intelligence"
    : "Excluded from reorder demand";
}
