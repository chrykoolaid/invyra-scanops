import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "./scanOpsEvents";
import { getScanOpsSession, buildEventIdentity } from "./scanOpsSession";
import {
  SHELF_TICKET_SOURCE_TYPES,
  SHELF_TICKET_STATUSES,
  saveShelfTicketPrintContract,
  saveShelfTicketQueueRequest,
  updateShelfTicketRequestStatus,
} from "./scanOpsShelfTicketContracts";
import { getCurrentPriceSnapshot, getCurrencySymbol, getOptionLabel, MARKDOWN_REASON_OPTIONS } from "./scanOpsRequestLifecycle";
import { writeMarkdownRecord, writeMarkdownApprovalAudit } from "./scanOpsRecordWriter";
import { normalizeSelectedScanItem } from "./scanOpsWorkflowBatch";
import { buildGovernanceSnapshot } from "./scanOpsGovernance";
import { COLLABORATION_STATES, COLLABORATION_VERSION, TASK_TYPES, registerCollaborationTaskForRecord } from "./scanOpsCollaboration";
import { buildItemSnapshotEvidence, buildMarkdownOutboxEvent } from "./inventory/inventorySnapshotEvidence";
import { addOutboxEvent } from "./inventory/storageProvider";

const REQUESTS_KEY = "invyra_scanops_markdown_approval_requests_v1";
const EVENTS_KEY = "invyra_scanops_markdown_approval_events_v1";
const PRINTER_HANDOFF_KEY = "invyra_scanops_printer_handoff_contracts_v0";
const MAX_RECORDS = 150;

export const MARKDOWN_REQUEST_VERSION = "SCANOPS_MARKDOWN_REQUEST_V1";
export const PRINTER_HANDOFF_VERSION = "SCANOPS_PRINTER_HANDOFF_V0";

export const MARKDOWN_STATUSES = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  NEEDS_REVIEW: "Needs Review",
  APPROVED: "Approved",
  RETURNED: "Returned",
  REJECTED: "Rejected",
  BLOCKED_WASTE_REVIEW_REQUIRED: "Blocked - Waste Review Required",
  READY_FOR_LABEL_HANDOFF: "Ready for Label Handoff",
  QUEUED_DESKTOP_PRINT: "Queued for Desktop Print",
  QUEUED_MOBILE_PRINTER: "Queued for Mobile Printer",
  PRINTED_COMPLETED_MANUAL: "Printed / Completed Manually",
};

export const LABEL_HANDOFF_STATUSES = {
  NOT_REQUIRED: "Not Required",
  LABEL_NEEDED: "Label Needed",
  READY_FOR_LABEL_HANDOFF: "Ready for Label Handoff",
  QUEUED_DESKTOP_PRINT: "Queued for Desktop Print",
  QUEUED_MOBILE_PRINTER: "Queued for Mobile Printer",
  PRINTED_COMPLETED_MANUAL: "Printed / Completed Manually",
  PRINTER_CONNECTION_DEFERRED: "Printer Connection Deferred",
};

export const LABEL_HANDOFF_METHODS = {
  MOBILE_PRINTER_LATER: "MOBILE_PRINTER_LATER",
  DESKTOP_PRINT_STATION: "DESKTOP_PRINT_STATION",
  STORE_PRINT_QUEUE: "STORE_PRINT_QUEUE",
};

export const LABEL_HANDOFF_METHOD_OPTIONS = [
  { id: LABEL_HANDOFF_METHODS.STORE_PRINT_QUEUE, label: "Store Print Queue", helper: "Shared queue; desktop/API consumes later" },
  { id: LABEL_HANDOFF_METHODS.DESKTOP_PRINT_STATION, label: "Desktop Print Station", helper: "Back office prints the approved label batch" },
  { id: LABEL_HANDOFF_METHODS.MOBILE_PRINTER_LATER, label: "Mobile Printer Later", helper: "Future Bluetooth/Wi-Fi printer path only" },
];

export const MARKDOWN_PERCENT_OPTIONS = [
  { id: "15", label: "15%" },
  { id: "25", label: "25%" },
  { id: "30", label: "30%" },
  { id: "40", label: "40%" },
  { id: "50", label: "50%" },
  { id: "60", label: "60%" },
];

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampPercent(value) {
  const parsed = numberOrNull(value);
  if (parsed == null) return 0;
  return Math.max(0, Math.min(95, parsed));
}

function compactDate(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
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

function actorSnapshot() {
  const identity = buildEventIdentity(getScanOpsSession());
  const governance = buildGovernanceSnapshot();
  return {
    requestedBy: identity.actorName || identity.user_name || "ScanOps user",
    requestedByRole: identity.actorRole || identity.role || "Staff",
    requestedById: identity.actorUserId || identity.user_id || null,
    deviceId: identity.deviceId || identity.scanner_id || null,
    scannerId: identity.scannerId || identity.scanner_id || null,
    sessionId: identity.sessionId || null,
    storeId: identity.storeId || identity.location_id || null,
    shiftId: governance.shiftId || identity.shiftId || null,
    shiftLabel: governance.shiftLabel || identity.shiftLabel || null,
    shiftStatus: governance.shiftStatus || identity.shiftStatus || null,
    deviceLabel: governance.deviceLabel || identity.deviceLabel || null,
    locationId: governance.locationId || identity.locationId || null,
    locationName: governance.locationName || identity.locationName || null,
    governanceContext: governance,
  };
}

function appendMarkdownEvent(eventType, request, extra = {}) {
  const snapshotEvidence = request?._snapshotEvidence || extra._snapshotEvidence || null;
  const event = {
    eventId: makeId("md_evt"),
    eventType,
    requestId: request?.requestId || extra.requestId || null,
    itemName: request?.itemName || extra.itemName || null,
    sku: request?.sku || extra.sku || null,
    barcode: request?.barcode || extra.barcode || null,
    status: request?.status || extra.status || "recorded",
    ...actorSnapshot(),
    // Inventory snapshot evidence (read-only attestation)
    ...(snapshotEvidence ? {
      inventory_snapshot_id: snapshotEvidence.inventory_snapshot_id,
      inventory_snapshot_ref: snapshotEvidence.inventory_snapshot_ref,
      inventory_snapshot_hash: snapshotEvidence.inventory_snapshot_hash,
      inventory_record_version: snapshotEvidence.inventory_record_version,
      last_inventory_sync_at: snapshotEvidence.last_inventory_sync_at,
      schema_version: snapshotEvidence.schema_version,
      source: snapshotEvidence.source,
    } : {}),
    ...extra,
    createdAt: nowIso(),
  };
  safeWrite(EVENTS_KEY, [event, ...safeRead(EVENTS_KEY)]);

  // Mirror into IndexedDB event_outbox (fire-and-forget)
  addOutboxEvent(
    buildMarkdownOutboxEvent(eventType, event, snapshotEvidence?.inventory_snapshot_ref || null)
  ).catch(() => {});

  return event;
}

export function getMarkdownApprovalEvents() {
  return safeRead(EVENTS_KEY);
}

export function getPrinterHandoffContracts() {
  return safeRead(PRINTER_HANDOFF_KEY);
}

export function evaluateMarkdownRule({ expiryDate, reasonCode, selectedMarkdownPercent, currentPrice, quantity }) {
  const daysToExpiry = calculateDaysToExpiry(expiryDate);
  const percent = clampPercent(selectedMarkdownPercent);
  const price = numberOrNull(currentPrice);
  const selectedMarkdownPrice = price == null ? null : Number(Math.max(0, price * (1 - percent / 100)).toFixed(2));

  if (daysToExpiry != null && daysToExpiry < 0) {
    return {
      status: MARKDOWN_STATUSES.BLOCKED_WASTE_REVIEW_REQUIRED,
      riskLevel: "Blocked",
      suggestedRange: "No markdown",
      suggestedPercent: 0,
      approvalRequired: false,
      approvalRoleRequired: "Manager",
      wasteReviewRequired: true,
      blockedReason: "Expired item must go to Waste Review, not markdown approval.",
      ruleSummary: "Expired · waste review required",
      selectedMarkdownPrice,
    };
  }

  if (daysToExpiry === 0) {
    return {
      status: MARKDOWN_STATUSES.NEEDS_REVIEW,
      riskLevel: "High",
      suggestedRange: "40%–60%",
      suggestedPercent: 50,
      approvalRequired: true,
      approvalRoleRequired: "Supervisor",
      wasteReviewRequired: false,
      blockedReason: null,
      ruleSummary: "Expires today · high markdown review",
      selectedMarkdownPrice,
    };
  }

  if (daysToExpiry === 1) {
    return {
      status: MARKDOWN_STATUSES.PENDING_APPROVAL,
      riskLevel: "Medium",
      suggestedRange: "30%–50%",
      suggestedPercent: 40,
      approvalRequired: true,
      approvalRoleRequired: "Supervisor",
      wasteReviewRequired: false,
      blockedReason: null,
      ruleSummary: "Expires tomorrow · approval required",
      selectedMarkdownPrice,
    };
  }

  if (daysToExpiry != null && daysToExpiry <= 3) {
    return {
      status: MARKDOWN_STATUSES.PENDING_APPROVAL,
      riskLevel: "Medium",
      suggestedRange: "25%–40%",
      suggestedPercent: 30,
      approvalRequired: true,
      approvalRoleRequired: "Supervisor",
      wasteReviewRequired: false,
      blockedReason: null,
      ruleSummary: "Short dated · approval required",
      selectedMarkdownPrice,
    };
  }

  const managerReview = ["manager_instruction", "competitor_response", "other"].includes(reasonCode) || Number(quantity || 1) >= 20;
  return {
    status: managerReview ? MARKDOWN_STATUSES.NEEDS_REVIEW : MARKDOWN_STATUSES.PENDING_APPROVAL,
    riskLevel: managerReview ? "Review" : "Low",
    suggestedRange: managerReview ? "Manager set" : "10%–25%",
    suggestedPercent: managerReview ? percent || 25 : 15,
    approvalRequired: true,
    approvalRoleRequired: managerReview ? "Manager" : "Supervisor",
    wasteReviewRequired: false,
    blockedReason: null,
    ruleSummary: managerReview ? "Manager review required" : "Standard markdown approval",
    selectedMarkdownPrice,
  };
}

function normalizeRequest(input = {}) {
  const createdAt = input.createdAt || nowIso();
  const currentPrice = numberOrNull(input.currentPrice);
  const percent = clampPercent(input.selectedMarkdownPercent);
  const rule = input.ruleEvaluation || evaluateMarkdownRule({
    expiryDate: input.expiryDate,
    reasonCode: input.reasonCode,
    selectedMarkdownPercent: percent,
    currentPrice,
    quantity: input.quantity,
  });
  const actor = actorSnapshot();
  const requestId = input.requestId || makeId("md_req");
  const actorInput = input.actorSnapshot || {};
  const status = input.status || rule.status || MARKDOWN_STATUSES.DRAFT;
  const selectedMarkdownPrice = numberOrNull(input.selectedMarkdownPrice ?? rule.selectedMarkdownPrice);

  return {
    requestId,
    requestVersion: MARKDOWN_REQUEST_VERSION,
    status,

    itemId: input.itemId || null,
    sku: input.sku || null,
    barcode: input.barcode || null,
    itemName: input.itemName || "Scanned item",
    department: input.department || "Store floor",
    shelfLocation: input.shelfLocation || "Shelf location pending",

    currentPrice,
    currency: input.currency || "₱",
    selectedMarkdownPercent: percent,
    selectedMarkdownPrice,

    quantity: Math.max(1, Number(input.quantity || 1)),
    expiryDate: compactDate(input.expiryDate),
    daysToExpiry: input.daysToExpiry ?? calculateDaysToExpiry(input.expiryDate),
    batchLot: input.batchLot || null,
    reasonCode: input.reasonCode || "short_dated",
    reasonLabel: input.reasonLabel || getOptionLabel(MARKDOWN_REASON_OPTIONS, input.reasonCode || "short_dated"),
    riskLevel: input.riskLevel || rule.riskLevel,
    suggestedRange: input.suggestedRange || rule.suggestedRange,
    suggestedPercent: input.suggestedPercent ?? rule.suggestedPercent,
    ruleSummary: input.ruleSummary || rule.ruleSummary,
    notes: input.notes || "",

    approvalRequired: input.approvalRequired ?? rule.approvalRequired,
    approvalRoleRequired: input.approvalRoleRequired || rule.approvalRoleRequired || "Supervisor",
    approvalDecision: input.approvalDecision || null,
    approvalReason: input.approvalReason || null,

    wasteReviewRequired: input.wasteReviewRequired ?? rule.wasteReviewRequired,
    blockedReason: input.blockedReason || rule.blockedReason || null,

    labelRequired: input.labelRequired ?? true,
    labelHandoffStatus: input.labelHandoffStatus || (input.labelRequired === false ? LABEL_HANDOFF_STATUSES.NOT_REQUIRED : LABEL_HANDOFF_STATUSES.LABEL_NEEDED),
    labelHandoffMethod: input.labelHandoffMethod || LABEL_HANDOFF_METHODS.STORE_PRINT_QUEUE,
    linkedShelfTicketRequestId: input.linkedShelfTicketRequestId || null,
    linkedPrintContractId: input.linkedPrintContractId || null,
    linkedPrinterHandoffId: input.linkedPrinterHandoffId || null,

    printerConnectionMode: input.printerConnectionMode || "BLUETOOTH_OR_WIFI_LATER",
    printerStatus: input.printerStatus || "NOT_CONNECTED_STAGE_DEFERRED",
    printerId: input.printerId || null,
    printerName: input.printerName || "Printer connection deferred",
    printerConnectionDeferred: input.printerConnectionDeferred ?? true,

    requestedBy: input.requestedBy || actorInput.requestedBy || actor.requestedBy,
    requestedByRole: input.requestedByRole || actorInput.requestedByRole || actor.requestedByRole,
    requestedById: input.requestedById || actorInput.requestedById || actor.requestedById,
    approvedBy: input.approvedBy || null,
    approvedByRole: input.approvedByRole || null,

    deviceId: input.deviceId || actorInput.deviceId || actor.deviceId,
    scannerId: input.scannerId || actorInput.scannerId || actor.scannerId,
    sessionId: input.sessionId || actorInput.sessionId || actor.sessionId,
    storeId: input.storeId || actorInput.storeId || actor.storeId,
    shiftId: input.shiftId || actorInput.shiftId || actor.shiftId,
    shiftLabel: input.shiftLabel || actorInput.shiftLabel || actor.shiftLabel,
    shiftStatus: input.shiftStatus || actorInput.shiftStatus || actor.shiftStatus,
    deviceLabel: input.deviceLabel || actorInput.deviceLabel || actor.deviceLabel,
    locationId: input.locationId || actorInput.locationId || actor.locationId,
    locationName: input.locationName || actorInput.locationName || actor.locationName,
    attributeSnapshot: input.attributeSnapshot || null,
    rawItem: input.rawItem || null,
    collaborationVersion: input.collaborationVersion || COLLABORATION_VERSION,
    collaborationTaskId: input.collaborationTaskId || `task_${requestId}`,
    collaborationOwnershipStatus: input.collaborationOwnershipStatus || COLLABORATION_STATES.TASK_CLAIMED,
    collaborationSyncStatus: input.collaborationSyncStatus || "SYNC_DEFERRED",
    createdAt,
    submittedAt: input.submittedAt || (status === MARKDOWN_STATUSES.DRAFT ? null : createdAt),
    updatedAt: input.updatedAt || createdAt,
    appliesPriceDirectly: false,
    priceActivationOwner: "Invyra Inventory",
    hardwareConnectionImplemented: false,
  };
}

export function getMarkdownApprovalRequests() {
  return safeRead(REQUESTS_KEY);
}

export function saveMarkdownApprovalRequest(request) {
  const normalized = normalizeRequest(request);
  const current = getMarkdownApprovalRequests();
  const next = [normalized, ...current.filter((entry) => entry.requestId !== normalized.requestId)].slice(0, MAX_RECORDS);
  safeWrite(REQUESTS_KEY, next);
  return normalized;
}

export function createMarkdownApprovalRequest({ item, reasonCode, selectedMarkdownPercent, quantity, expiryDate, batchLot, notes, labelRequired, labelHandoffMethod, attributeSnapshot, snapshotEvidence }) {
  const selected = normalizeSelectedScanItem(item, "manual_search");
  const currentPrice = getCurrentPriceSnapshot(item);
  const ruleEvaluation = evaluateMarkdownRule({ expiryDate, reasonCode, selectedMarkdownPercent, currentPrice, quantity });

  // Build snapshot evidence if not provided by caller
  const evidence = snapshotEvidence || buildItemSnapshotEvidence(item);

  const request = saveMarkdownApprovalRequest({
    status: MARKDOWN_STATUSES.DRAFT,
    itemId: selected?.itemId,
    sku: selected?.sku,
    barcode: selected?.barcode,
    itemName: selected?.itemName || item?.name || item?.item_name || "Scanned item",
    department: item?.department || item?.category || "Store floor",
    shelfLocation: item?.shelfLocation || item?.location || item?.shelf || "Shelf location pending",
    currentPrice,
    currency: getCurrencySymbol(item),
    selectedMarkdownPercent,
    selectedMarkdownPrice: ruleEvaluation.selectedMarkdownPrice,
    quantity,
    expiryDate,
    daysToExpiry: calculateDaysToExpiry(expiryDate),
    batchLot,
    reasonCode,
    reasonLabel: getOptionLabel(MARKDOWN_REASON_OPTIONS, reasonCode),
    riskLevel: ruleEvaluation.riskLevel,
    suggestedRange: ruleEvaluation.suggestedRange,
    suggestedPercent: ruleEvaluation.suggestedPercent,
    ruleSummary: ruleEvaluation.ruleSummary,
    approvalRequired: ruleEvaluation.approvalRequired,
    approvalRoleRequired: ruleEvaluation.approvalRoleRequired,
    wasteReviewRequired: ruleEvaluation.wasteReviewRequired,
    blockedReason: ruleEvaluation.blockedReason,
    labelRequired,
    labelHandoffStatus: labelRequired ? LABEL_HANDOFF_STATUSES.LABEL_NEEDED : LABEL_HANDOFF_STATUSES.NOT_REQUIRED,
    labelHandoffMethod,
    attributeSnapshot,
    rawItem: selected,
    // Attach snapshot evidence for downstream event mirroring
    _snapshotEvidence: evidence,
  });

  // Persist to DB (offline-safe) — links via syncStatus: `md_req:<requestId>`
  writeMarkdownRecord({
    item,
    reasonCode,
    selectedPercent: selectedMarkdownPercent,
    quantity,
    expiryDate,
    notes,
    status: "pending_approval",
    requestId: request.requestId,
    currentPrice: ruleEvaluation.selectedMarkdownPrice != null ? currentPrice : null,
    selectedMarkdownPrice: ruleEvaluation.selectedMarkdownPrice,
    currency: getCurrencySymbol(item),
    approvalRoleRequired: ruleEvaluation.approvalRoleRequired,
    riskLevel: ruleEvaluation.riskLevel,
    snapshotEvidence: evidence,
  });

  appendMarkdownEvent(SCANOPS_EVENT_TYPES.MARKDOWN_REQUEST_CREATED, request, {
    status: request.status,
    rule_summary: request.ruleSummary,
    applies_price_directly: false,
    printer_connection_deferred: true,
  });
  registerCollaborationTaskForRecord({
    taskId: request.collaborationTaskId || `task_${request.requestId}`,
    taskType: TASK_TYPES.MARKDOWN_APPROVAL,
    taskLabel: `Markdown Approval · ${request.itemName}`,
    taskSummary: `${request.selectedMarkdownPercent}% off · ${request.reasonLabel}`,
    sourceWorkflow: "Markdown Approval",
    sourceRecordId: request.requestId,
    ownerMode: "current",
    conflictRisk: request.approvalRoleRequired === "Manager" ? "HIGH" : "LOW",
  });

  createScanOpsEvent(SCANOPS_EVENT_TYPES.MARKDOWN_REQUEST_CREATED, {
    source_module: "Markdowns",
    markdown_request_id: request.requestId,
    item_name: request.itemName,
    sku: request.sku,
    barcode: request.barcode,
    status: request.status,
    rule_summary: request.ruleSummary,
    suggested_range: request.suggestedRange,
    selected_markdown_percent: request.selectedMarkdownPercent,
    selected_markdown_price: request.selectedMarkdownPrice,
    label_required: request.labelRequired,
    label_handoff_method: request.labelHandoffMethod,
    applies_price_directly: false,
    printer_connection_deferred: true,
  });
  return request;
}

function saveUpdatedRequest(request, eventType, extra = {}) {
  const updated = saveMarkdownApprovalRequest({ ...request, updatedAt: nowIso() });
  appendMarkdownEvent(eventType, updated, extra);
  createScanOpsEvent(eventType, {
    source_module: "Markdowns",
    markdown_request_id: updated.requestId,
    item_name: updated.itemName,
    sku: updated.sku,
    barcode: updated.barcode,
    status: updated.status,
    approval_decision: updated.approvalDecision,
    approval_reason: updated.approvalReason,
    applies_price_directly: false,
    printer_connection_deferred: true,
    ...extra,
  });
  return updated;
}

export function updateMarkdownApprovalStatus(requestId, action, reason = "") {
  const current = getMarkdownApprovalRequests();
  const request = current.find((entry) => entry.requestId === requestId);
  if (!request) return null;
  const actor = actorSnapshot();

  if (action === "submit") {
    const status = request.wasteReviewRequired ? MARKDOWN_STATUSES.BLOCKED_WASTE_REVIEW_REQUIRED : request.riskLevel === "High" || request.riskLevel === "Review" ? MARKDOWN_STATUSES.NEEDS_REVIEW : MARKDOWN_STATUSES.PENDING_APPROVAL;
    const eventType = request.wasteReviewRequired ? SCANOPS_EVENT_TYPES.MARKDOWN_WASTE_REVIEW_BLOCKED : SCANOPS_EVENT_TYPES.MARKDOWN_APPROVAL_SUBMITTED;
    return saveUpdatedRequest({ ...request, status, submittedAt: nowIso(), approvalDecision: null, approvalReason: reason || null }, eventType, {
      action,
      blocked_reason: request.blockedReason,
    });
  }

  if (action === "approve") {
    const updated = saveUpdatedRequest({
      ...request,
      status: MARKDOWN_STATUSES.APPROVED,
      approvalDecision: "Approved",
      approvalReason: reason || "Approved for label handoff",
      approvedBy: actor.requestedBy,
      approvedByRole: actor.requestedByRole,
      labelHandoffStatus: request.labelRequired ? LABEL_HANDOFF_STATUSES.LABEL_NEEDED : LABEL_HANDOFF_STATUSES.NOT_REQUIRED,
    }, SCANOPS_EVENT_TYPES.MARKDOWN_APPROVED, { action });
    writeMarkdownApprovalAudit({
      requestId: request.requestId,
      action: "approved",
      actorName: actor.requestedBy,
      actorRole: actor.requestedByRole,
      itemName: request.itemName,
      itemSku: request.sku,
      itemBarcode: request.barcode,
      reason: reason || "Approved for label handoff",
      selectedPercent: request.selectedMarkdownPercent,
      selectedMarkdownPrice: request.selectedMarkdownPrice,
      currentPrice: request.currentPrice,
      currency: request.currency,
    });
    return updated;
  }

  if (action === "return") {
    const updated = saveUpdatedRequest({
      ...request,
      status: MARKDOWN_STATUSES.RETURNED,
      approvalDecision: "Returned",
      approvalReason: reason || "Returned for correction",
    }, SCANOPS_EVENT_TYPES.MARKDOWN_RETURNED, { action });
    writeMarkdownApprovalAudit({
      requestId: request.requestId,
      action: "returned",
      actorName: actor.requestedBy,
      actorRole: actor.requestedByRole,
      itemName: request.itemName,
      itemSku: request.sku,
      itemBarcode: request.barcode,
      reason: reason || "Returned for correction",
      selectedPercent: request.selectedMarkdownPercent,
      selectedMarkdownPrice: request.selectedMarkdownPrice,
      currentPrice: request.currentPrice,
      currency: request.currency,
    });
    return updated;
  }

  if (action === "reject") {
    const updated = saveUpdatedRequest({
      ...request,
      status: MARKDOWN_STATUSES.REJECTED,
      approvalDecision: "Rejected",
      approvalReason: reason || "Rejected",
      labelHandoffStatus: LABEL_HANDOFF_STATUSES.NOT_REQUIRED,
    }, SCANOPS_EVENT_TYPES.MARKDOWN_REJECTED, { action });
    writeMarkdownApprovalAudit({
      requestId: request.requestId,
      action: "rejected",
      actorName: actor.requestedBy,
      actorRole: actor.requestedByRole,
      itemName: request.itemName,
      itemSku: request.sku,
      itemBarcode: request.barcode,
      reason: reason || "Rejected",
      selectedPercent: request.selectedMarkdownPercent,
      selectedMarkdownPrice: request.selectedMarkdownPrice,
      currentPrice: request.currentPrice,
      currency: request.currency,
    });
    return updated;
  }

  return request;
}

function handoffTargetType(method) {
  if (method === LABEL_HANDOFF_METHODS.MOBILE_PRINTER_LATER) return "MOBILE_LABEL_PRINTER";
  if (method === LABEL_HANDOFF_METHODS.DESKTOP_PRINT_STATION) return "DESKTOP_PRINT_STATION";
  return "STORE_PRINT_QUEUE";
}

function handoffStatusForMethod(method) {
  if (method === LABEL_HANDOFF_METHODS.MOBILE_PRINTER_LATER) return LABEL_HANDOFF_STATUSES.QUEUED_MOBILE_PRINTER;
  if (method === LABEL_HANDOFF_METHODS.DESKTOP_PRINT_STATION) return LABEL_HANDOFF_STATUSES.QUEUED_DESKTOP_PRINT;
  return LABEL_HANDOFF_STATUSES.READY_FOR_LABEL_HANDOFF;
}

function markdownStatusForMethod(method) {
  if (method === LABEL_HANDOFF_METHODS.MOBILE_PRINTER_LATER) return MARKDOWN_STATUSES.QUEUED_MOBILE_PRINTER;
  if (method === LABEL_HANDOFF_METHODS.DESKTOP_PRINT_STATION) return MARKDOWN_STATUSES.QUEUED_DESKTOP_PRINT;
  return MARKDOWN_STATUSES.READY_FOR_LABEL_HANDOFF;
}

export function createMarkdownLabelHandoff(requestId) {
  const current = getMarkdownApprovalRequests();
  const request = current.find((entry) => entry.requestId === requestId);
  if (!request) return null;

  if (request.linkedShelfTicketRequestId || request.linkedPrintContractId || request.linkedPrinterHandoffId) {
    appendMarkdownEvent(SCANOPS_EVENT_TYPES.MARKDOWN_DUPLICATE_HANDOFF_BLOCKED, request, {
      duplicate_blocked: true,
      linked_shelf_ticket_request_id: request.linkedShelfTicketRequestId,
      linked_print_contract_id: request.linkedPrintContractId,
      linked_printer_handoff_id: request.linkedPrinterHandoffId,
    });
    createScanOpsEvent(SCANOPS_EVENT_TYPES.MARKDOWN_DUPLICATE_HANDOFF_BLOCKED, {
      source_module: "Markdowns",
      markdown_request_id: request.requestId,
      duplicate_blocked: true,
      applies_price_directly: false,
      printer_connection_deferred: true,
    });
    return { request, duplicateBlocked: true };
  }

  if (request.status !== MARKDOWN_STATUSES.APPROVED && request.status !== MARKDOWN_STATUSES.READY_FOR_LABEL_HANDOFF) {
    return { request, blocked: true };
  }

  const shelfTicketRequest = saveShelfTicketQueueRequest({
    sourceEventId: request.requestId,
    sourceWorkflow: "markdowns",
    sourceType: SHELF_TICKET_SOURCE_TYPES.MARKDOWN_LABEL,
    sourceLabel: "Markdown Label",
    status: SHELF_TICKET_STATUSES.NEEDS_REVIEW,
    itemId: request.itemId,
    sku: request.sku,
    barcode: request.barcode,
    itemName: request.itemName,
    department: request.department,
    shelfLocation: request.shelfLocation,
    regularPrice: request.currentPrice,
    expectedShelfPrice: request.selectedMarkdownPrice,
    currency: request.currency || "₱",
    notes: `Markdown approved · ${request.selectedMarkdownPercent}% off · ${request.reasonLabel}`,
    quantity: request.quantity,
    copies: request.quantity,
    itemSnapshot: request.rawItem,
    requestedBy: request.requestedBy,
    requestedByRole: request.requestedByRole,
    requestedById: request.requestedById,
    deviceId: request.deviceId,
    scannerId: request.scannerId,
    sessionId: request.sessionId,
    storeId: request.storeId,
    shiftId: request.shiftId,
    shiftLabel: request.shiftLabel,
    shiftStatus: request.shiftStatus,
    deviceLabel: request.deviceLabel,
    createdAt: nowIso(),
  });

  const contractResult = saveShelfTicketPrintContract({
    request: shelfTicketRequest,
    formatId: "MARKDOWN_LABEL",
    copies: request.quantity || 1,
    quantity: request.quantity || 1,
  });
  const readyResult = updateShelfTicketRequestStatus(contractResult.request.requestId, SHELF_TICKET_STATUSES.READY_FOR_PRINT_HANDOFF);
  const shelfRequest = readyResult?.request || contractResult.request;
  const printContract = readyResult?.contract || contractResult.contract;

  const printerHandoff = {
    printerContractVersion: PRINTER_HANDOFF_VERSION,
    handoffId: makeId("printer_handoff"),
    sourceWorkflow: "MARKDOWNS",
    sourceRequestId: request.requestId,
    labelType: "MARKDOWN_LABEL",
    handoffMethod: request.labelHandoffMethod || LABEL_HANDOFF_METHODS.STORE_PRINT_QUEUE,
    targetPrinterType: handoffTargetType(request.labelHandoffMethod),
    connectionMode: "BLUETOOTH_OR_WIFI_LATER",
    status: "READY_FOR_HANDOFF",
    hardwareConnectionImplemented: false,
    linkedShelfTicketRequestId: shelfRequest.requestId,
    linkedPrintContractId: printContract?.contractId || null,
    printerStatus: "NOT_CONNECTED_STAGE_DEFERRED",
    printerConnectionDeferred: true,
    createdAt: nowIso(),
    createdBy: actorSnapshot().requestedBy,
    createdByRole: actorSnapshot().requestedByRole,
    deviceId: request.deviceId,
    deviceLabel: request.deviceLabel,
    sessionId: request.sessionId,
    shiftId: request.shiftId,
    shiftLabel: request.shiftLabel,
    shiftStatus: request.shiftStatus,
    storeId: request.storeId,
  };
  safeWrite(PRINTER_HANDOFF_KEY, [printerHandoff, ...getPrinterHandoffContracts()]);

  const updated = saveUpdatedRequest({
    ...request,
    status: markdownStatusForMethod(request.labelHandoffMethod),
    labelHandoffStatus: handoffStatusForMethod(request.labelHandoffMethod),
    linkedShelfTicketRequestId: shelfRequest.requestId,
    linkedPrintContractId: printContract?.contractId || null,
    linkedPrinterHandoffId: printerHandoff.handoffId,
    printerStatus: "NOT_CONNECTED_STAGE_DEFERRED",
    printerName: "Printer connection deferred",
    printerConnectionDeferred: true,
  }, SCANOPS_EVENT_TYPES.MARKDOWN_LABEL_HANDOFF_CREATED, {
    label_handoff_method: request.labelHandoffMethod,
    linked_shelf_ticket_request_id: shelfRequest.requestId,
    linked_print_contract_id: printContract?.contractId || null,
    linked_printer_handoff_id: printerHandoff.handoffId,
    printer_contract_version: PRINTER_HANDOFF_VERSION,
  });

  createScanOpsEvent(SCANOPS_EVENT_TYPES.MARKDOWN_PRINTER_HANDOFF_CREATED, {
    source_module: "Markdowns",
    markdown_request_id: updated.requestId,
    printer_handoff_id: printerHandoff.handoffId,
    linked_shelf_ticket_request_id: shelfRequest.requestId,
    linked_print_contract_id: printContract?.contractId || null,
    handoff_method: printerHandoff.handoffMethod,
    hardware_connection_implemented: false,
    printer_connection_deferred: true,
    applies_price_directly: false,
  });

  return { request: updated, shelfTicketRequest: shelfRequest, printContract, printerHandoff, duplicateBlocked: false };
}