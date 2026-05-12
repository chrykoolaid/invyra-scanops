import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "./scanOpsEvents";
import { getAllPricePromoVerificationEvents, PRICE_PROMO_RESULTS } from "./scanOpsPricePromoVerification";
import { buildEventIdentity, getScanOpsSession } from "./scanOpsSession";

const REQUESTS_KEY = "invyra_scanops_shelf_ticket_queue_requests_v2";
const CONTRACTS_KEY = "invyra_scanops_shelf_ticket_print_contracts_v1";
const QUEUE_EVENTS_KEY = "invyra_scanops_shelf_ticket_queue_events_v1";
const MAX_RECORDS = 150;

export const SHELF_TICKET_STATUSES = {
  DRAFT: "Draft",
  NEEDS_REVIEW: "Needs Review",
  READY_FOR_PRINT_HANDOFF: "Ready for Print Handoff",
  PRINTED_COMPLETED: "Printed / Completed",
  CANCELLED: "Cancelled",
};

export const SHELF_TICKET_SOURCE_TYPES = {
  PRICE_CHECK_MISMATCH: "PRICE_CHECK_MISMATCH",
  PROMO_LABEL_MISSING: "PROMO_LABEL_MISSING",
  PROMO_LABEL_EXPIRED: "PROMO_LABEL_EXPIRED",
  WRONG_PRODUCT_LABEL: "WRONG_PRODUCT_LABEL",
  MANUAL_SHELF_TICKET: "MANUAL_SHELF_TICKET",
  MISSING_TICKET: "MISSING_TICKET",
  DAMAGED_TICKET: "DAMAGED_TICKET",
  UNCLEAR_LABEL: "UNCLEAR_LABEL",
};

export const SHELF_TICKET_FORMATS = [
  { id: "STANDARD_SHELF_LABEL", label: "Standard Shelf", templateKey: "STANDARD_SHELF_LABEL", size: "Shelf Edge", orientation: "Landscape" },
  { id: "PROMO_SHELF_LABEL", label: "Promo Label", templateKey: "PROMO_SHELF_LABEL", size: "Promo Card", orientation: "Landscape" },
  { id: "MISSING_LABEL_REPLACEMENT", label: "Missing Label", templateKey: "MISSING_LABEL_REPLACEMENT", size: "Shelf Edge", orientation: "Landscape" },
  { id: "WRONG_PRODUCT_LABEL_REPLACEMENT", label: "Wrong Label", templateKey: "WRONG_PRODUCT_LABEL_REPLACEMENT", size: "Shelf Edge", orientation: "Landscape" },
  { id: "PRICE_MISMATCH_REVIEW_LABEL", label: "Price Review", templateKey: "PRICE_MISMATCH_REVIEW_LABEL", size: "Review Label", orientation: "Landscape" },
];

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

function safeWrite(key, records) {
  if (typeof window === "undefined") return records;
  try {
    window.localStorage.setItem(key, JSON.stringify(records.slice(0, MAX_RECORDS)));
  } catch (error) {
    console.warn(`Unable to persist ${key}`, error);
  }
  return records;
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getActorSnapshot() {
  const identity = buildEventIdentity(getScanOpsSession());
  return {
    requestedBy: identity.actorName || identity.user_name || "ScanOps user",
    requestedByRole: identity.actorRole || identity.role || "Staff",
    requestedById: identity.actorUserId || identity.user_id || null,
    deviceId: identity.deviceId || identity.scanner_id || null,
    scannerId: identity.scannerId || identity.scanner_id || null,
    sessionId: identity.sessionId || null,
    storeId: identity.storeId || identity.location_id || null,
  };
}

function sourceEventIdFor(event = {}) {
  return event.id || event.event_id || event.priceVerificationId || event.price_verification_id || event.traceId || event.trace_id || null;
}

function sourceTypeForPriceEvent(event = {}) {
  if (event.result === PRICE_PROMO_RESULTS.PROMO_MISSING || event.eventType === "PROMO_LABEL_MISSING") return SHELF_TICKET_SOURCE_TYPES.PROMO_LABEL_MISSING;
  if (event.result === PRICE_PROMO_RESULTS.PROMO_EXPIRED || event.eventType === "PROMO_LABEL_EXPIRED") return SHELF_TICKET_SOURCE_TYPES.PROMO_LABEL_EXPIRED;
  if (event.result === PRICE_PROMO_RESULTS.WRONG_PRODUCT_LABEL || event.eventType === "WRONG_PRODUCT_LABEL_RECORDED") return SHELF_TICKET_SOURCE_TYPES.WRONG_PRODUCT_LABEL;
  if (event.result === PRICE_PROMO_RESULTS.PRICE_MISMATCH || event.eventType === "PRICE_MISMATCH_RECORDED") return SHELF_TICKET_SOURCE_TYPES.PRICE_CHECK_MISMATCH;
  if (event.reasonCode === "missing_ticket") return SHELF_TICKET_SOURCE_TYPES.MISSING_TICKET;
  if (event.reasonCode === "unclear_damaged_label") return SHELF_TICKET_SOURCE_TYPES.UNCLEAR_LABEL;
  return SHELF_TICKET_SOURCE_TYPES.PRICE_CHECK_MISMATCH;
}

function sourceLabel(sourceType) {
  return {
    [SHELF_TICKET_SOURCE_TYPES.PRICE_CHECK_MISMATCH]: "Price Mismatch",
    [SHELF_TICKET_SOURCE_TYPES.PROMO_LABEL_MISSING]: "Promo Missing",
    [SHELF_TICKET_SOURCE_TYPES.PROMO_LABEL_EXPIRED]: "Promo Expired",
    [SHELF_TICKET_SOURCE_TYPES.WRONG_PRODUCT_LABEL]: "Wrong Product Label",
    [SHELF_TICKET_SOURCE_TYPES.MANUAL_SHELF_TICKET]: "Manual Ticket",
    [SHELF_TICKET_SOURCE_TYPES.MISSING_TICKET]: "Missing Ticket",
    [SHELF_TICKET_SOURCE_TYPES.DAMAGED_TICKET]: "Damaged Ticket",
    [SHELF_TICKET_SOURCE_TYPES.UNCLEAR_LABEL]: "Unclear Label",
  }[sourceType] || "Shelf Ticket";
}

function itemNameFromSnapshot(snapshot = {}) {
  return snapshot.itemName || snapshot.item_name || snapshot.name || "Scanned item";
}

function normalizeRequest(input = {}) {
  const createdAt = input.createdAt || nowIso();
  const sourceType = input.sourceType || SHELF_TICKET_SOURCE_TYPES.MANUAL_SHELF_TICKET;
  const actor = getActorSnapshot();
  const actorInput = input.actorSnapshot || {};
  return {
    requestId: input.requestId || makeId("shelf_ticket_req"),
    sourceEventId: input.sourceEventId || null,
    sourceWorkflow: input.sourceWorkflow || "shelf_tickets",
    sourceType,
    sourceLabel: input.sourceLabel || sourceLabel(sourceType),
    status: input.status || SHELF_TICKET_STATUSES.DRAFT,
    ticketContractId: input.ticketContractId || null,

    itemId: input.itemId || null,
    sku: input.sku || null,
    barcode: input.barcode || null,
    itemName: input.itemName || "Scanned item",
    brand: input.brand || null,
    department: input.department || "Store floor",
    shelfLocation: input.shelfLocation || "Shelf location pending",

    regularPrice: numberOrNull(input.regularPrice),
    promoPrice: numberOrNull(input.promoPrice),
    shelfLabelPrice: numberOrNull(input.shelfLabelPrice),
    expectedShelfPrice: numberOrNull(input.expectedShelfPrice),
    currency: input.currency || "₱",
    promoName: input.promoName || null,
    promoStartDate: input.promoStartDate || null,
    promoEndDate: input.promoEndDate || null,

    notes: input.notes || "",
    quantity: Math.max(1, Number(input.quantity || 1)),
    copies: Math.max(1, Number(input.copies || 1)),
    itemSnapshot: input.itemSnapshot || null,

    requestedBy: input.requestedBy || actorInput.requestedBy || actor.requestedBy,
    requestedByRole: input.requestedByRole || actorInput.requestedByRole || actor.requestedByRole,
    requestedById: input.requestedById || actorInput.requestedById || actor.requestedById,
    deviceId: input.deviceId || actorInput.deviceId || actor.deviceId,
    scannerId: input.scannerId || actorInput.scannerId || actor.scannerId,
    sessionId: input.sessionId || actorInput.sessionId || actor.sessionId,
    storeId: input.storeId || actorInput.storeId || actor.storeId,
    createdAt,
    updatedAt: input.updatedAt || createdAt,
  };
}

function queueEvent(eventType, request, extra = {}) {
  const event = {
    queueEventId: makeId("shelf_ticket_evt"),
    eventType,
    requestId: request?.requestId || extra.requestId || null,
    contractId: extra.contractId || request?.ticketContractId || null,
    sourceEventId: request?.sourceEventId || null,
    sourceWorkflow: request?.sourceWorkflow || "shelf_tickets",
    itemName: request?.itemName || null,
    sku: request?.sku || null,
    barcode: request?.barcode || null,
    status: request?.status || extra.status || "recorded",
    ...getActorSnapshot(),
    ...extra,
    createdAt: nowIso(),
  };
  safeWrite(QUEUE_EVENTS_KEY, [event, ...safeRead(QUEUE_EVENTS_KEY)]);
  return event;
}

export function getShelfTicketQueueRequests() {
  return safeRead(REQUESTS_KEY);
}

export function getShelfTicketPrintContracts() {
  return safeRead(CONTRACTS_KEY);
}

export function getShelfTicketQueueEvents() {
  return safeRead(QUEUE_EVENTS_KEY);
}

export function saveShelfTicketQueueRequest(request) {
  const normalized = normalizeRequest(request);
  const current = getShelfTicketQueueRequests();
  const next = [normalized, ...current.filter((entry) => entry.requestId !== normalized.requestId)].slice(0, MAX_RECORDS);
  safeWrite(REQUESTS_KEY, next);
  return normalized;
}

export function importShelfTicketRequestsFromPriceCheck() {
  const current = getShelfTicketQueueRequests();
  const convertedSourceIds = new Set(current.map((request) => request.sourceEventId).filter(Boolean));
  const priceEvents = getAllPricePromoVerificationEvents();
  const candidates = priceEvents.filter((event) => Boolean(event.requestedShelfTicket || event.requested_shelf_ticket));
  const imported = [];

  candidates.forEach((event) => {
    const sourceEventId = sourceEventIdFor(event);
    if (!sourceEventId || convertedSourceIds.has(sourceEventId)) return;
    const snapshot = event.item_snapshot || {};
    const sourceType = sourceTypeForPriceEvent(event);
    const request = normalizeRequest({
      sourceEventId,
      sourceWorkflow: "price_promo_verification",
      sourceType,
      sourceLabel: sourceLabel(sourceType),
      status: SHELF_TICKET_STATUSES.NEEDS_REVIEW,
      itemId: event.itemId || event.item_id || snapshot.itemId || snapshot.internalItemId,
      sku: event.sku || snapshot.sku,
      barcode: event.barcode || snapshot.barcode,
      itemName: event.itemName || event.item_name || itemNameFromSnapshot(snapshot),
      department: event.department || snapshot.department,
      shelfLocation: event.shelfLocation || event.shelf_location || snapshot.shelfLocation,
      regularPrice: event.expectedRegularPrice ?? event.expected_regular_price ?? snapshot.currentPrice,
      promoPrice: event.expectedPromoPrice ?? event.expected_promo_price,
      shelfLabelPrice: event.shelfLabelPrice ?? event.shelf_label_price,
      expectedShelfPrice: event.expectedShelfPrice ?? event.expected_shelf_price,
      currency: snapshot.currency || "₱",
      promoName: event.promotionName || event.promotion_name,
      promoStartDate: event.promotionStartDate || event.promotion_start_date,
      promoEndDate: event.promotionEndDate || event.promotion_end_date,
      notes: [event.resultLabel, event.reasonLabel, event.notes].filter(Boolean).join(" · "),
      itemSnapshot: snapshot,
      actorSnapshot: {
        requestedBy: event.userName || event.user_name || undefined,
        requestedByRole: event.role || undefined,
        requestedById: event.userId || event.user_id || undefined,
        deviceId: event.deviceId || event.device_id || undefined,
        sessionId: event.sessionId || event.session_id || undefined,
        storeId: event.storeId || event.store_id || undefined,
      },
      createdAt: event.createdAt || event.created_at || nowIso(),
    });
    imported.push(request);
    convertedSourceIds.add(sourceEventId);
  });

  if (!imported.length) return { requests: current, imported: [] };

  const next = [...imported, ...current].slice(0, MAX_RECORDS);
  safeWrite(REQUESTS_KEY, next);

  imported.forEach((request) => {
    queueEvent(SCANOPS_EVENT_TYPES.SHELF_TICKET_REQUEST_IMPORTED_FROM_PRICE_CHECK, request, {
      source_type: request.sourceType,
      status: request.status,
    });
    createScanOpsEvent(SCANOPS_EVENT_TYPES.SHELF_TICKET_REQUEST_IMPORTED_FROM_PRICE_CHECK, {
      source_module: "Shelf Tickets",
      sourceWorkflow: "shelf_tickets",
      shelf_ticket_request_id: request.requestId,
      source_event_id: request.sourceEventId,
      source_type: request.sourceType,
      item_name: request.itemName,
      sku: request.sku,
      barcode: request.barcode,
      status: request.status,
      print_contract_created: false,
      print_claimed: false,
      applies_price_directly: false,
      applies_stock_directly: false,
    });
  });

  return { requests: next, imported };
}

export function createManualShelfTicketRequest(item = {}, overrides = {}) {
  const sourceType = overrides.sourceType || SHELF_TICKET_SOURCE_TYPES.MANUAL_SHELF_TICKET;
  const request = saveShelfTicketQueueRequest({
    sourceWorkflow: "shelf_tickets",
    sourceType,
    status: SHELF_TICKET_STATUSES.DRAFT,
    itemId: item.internalItemId || item.productId || item.id || null,
    sku: item.sku || null,
    barcode: item.barcode || item.gtin || item.plu || null,
    itemName: item.name || item.item_name || "Scanned item",
    brand: item.brand || null,
    department: item.department || item.category || "Store floor",
    shelfLocation: item.shelfLocation || item.location || [item.aisle, item.bay, item.shelf].filter(Boolean).join(" · ") || "Shelf location pending",
    regularPrice: item.currentPrice ?? item.current_price ?? item.pricePerKg ?? item.price_per_kg ?? null,
    expectedShelfPrice: item.currentPrice ?? item.current_price ?? item.pricePerKg ?? item.price_per_kg ?? null,
    currency: item.currency || "₱",
    itemSnapshot: item,
    notes: overrides.notes || "Manual shelf ticket request",
    copies: overrides.copies || 1,
  });

  queueEvent(SCANOPS_EVENT_TYPES.SHELF_TICKET_REQUEST_CREATED, request, { source_type: request.sourceType });
  createScanOpsEvent(SCANOPS_EVENT_TYPES.SHELF_TICKET_REQUEST_CREATED, {
    source_module: "Shelf Tickets",
    sourceWorkflow: "shelf_tickets",
    shelf_ticket_request_id: request.requestId,
    source_type: request.sourceType,
    item_name: request.itemName,
    sku: request.sku,
    barcode: request.barcode,
    status: request.status,
    print_contract_created: false,
    print_claimed: false,
    applies_price_directly: false,
    applies_stock_directly: false,
  });
  return request;
}

export function recommendedTicketFormatForRequest(request = {}) {
  if (request.sourceType === SHELF_TICKET_SOURCE_TYPES.PROMO_LABEL_MISSING || request.sourceType === SHELF_TICKET_SOURCE_TYPES.PROMO_LABEL_EXPIRED || request.promoPrice != null) return "PROMO_SHELF_LABEL";
  if (request.sourceType === SHELF_TICKET_SOURCE_TYPES.WRONG_PRODUCT_LABEL) return "WRONG_PRODUCT_LABEL_REPLACEMENT";
  if (request.sourceType === SHELF_TICKET_SOURCE_TYPES.MISSING_TICKET || request.sourceType === SHELF_TICKET_SOURCE_TYPES.DAMAGED_TICKET) return "MISSING_LABEL_REPLACEMENT";
  if (request.sourceType === SHELF_TICKET_SOURCE_TYPES.PRICE_CHECK_MISMATCH) return "PRICE_MISMATCH_REVIEW_LABEL";
  return "STANDARD_SHELF_LABEL";
}

export function getShelfTicketFormat(formatId) {
  return SHELF_TICKET_FORMATS.find((format) => format.id === formatId) || SHELF_TICKET_FORMATS[0];
}

export function formatShelfTicketMoney(value, currency = "₱") {
  const amount = numberOrNull(value);
  if (amount == null) return "Price pending";
  return `${currency}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildShelfTicketPreview(request = {}, formatId = recommendedTicketFormatForRequest(request)) {
  const format = getShelfTicketFormat(formatId);
  const isPromo = format.id === "PROMO_SHELF_LABEL" || request.promoPrice != null;
  const primaryPrice = isPromo ? request.promoPrice ?? request.expectedShelfPrice ?? request.regularPrice : request.expectedShelfPrice ?? request.regularPrice ?? request.shelfLabelPrice;
  const secondaryPrice = isPromo && request.regularPrice != null ? request.regularPrice : request.shelfLabelPrice;
  const badgeText = isPromo ? "PROMO" : format.id === "PRICE_MISMATCH_REVIEW_LABEL" ? "REVIEW" : request.sourceLabel || "SHELF";
  const footerText = isPromo && request.promoEndDate ? `Ends ${request.promoEndDate}` : request.shelfLocation || "Location pending";
  return {
    labelTitle: String(request.itemName || "Scanned item").toUpperCase(),
    labelPrimaryPrice: formatShelfTicketMoney(primaryPrice, request.currency),
    labelSecondaryPrice: secondaryPrice == null ? "" : `Regular ${formatShelfTicketMoney(secondaryPrice, request.currency)}`,
    labelBadgeText: badgeText,
    labelFooterText: footerText,
    templateKey: format.templateKey,
    size: format.size,
    orientation: format.orientation,
  };
}

export function saveShelfTicketPrintContract({ request, formatId, copies = 1, quantity = 1 }) {
  if (!request) return null;
  const format = getShelfTicketFormat(formatId || recommendedTicketFormatForRequest(request));
  const preview = buildShelfTicketPreview(request, format.id);
  const existingContracts = getShelfTicketPrintContracts();
  const existing = existingContracts.find((contract) => contract.requestId === request.requestId);
  const contract = {
    contractVersion: "SCANOPS_SHELF_TICKET_V1",
    contractId: existing?.contractId || makeId("shelf_ticket_contract"),
    requestId: request.requestId,
    sourceEventId: request.sourceEventId,
    sourceWorkflow: request.sourceWorkflow,

    status: existing?.status || SHELF_TICKET_STATUSES.DRAFT,
    ticketType: format.id,
    templateKey: preview.templateKey,

    itemId: request.itemId,
    sku: request.sku,
    barcode: request.barcode,
    itemName: request.itemName,
    brand: request.brand,
    department: request.department,
    shelfLocation: request.shelfLocation,

    regularPrice: request.regularPrice,
    promoPrice: request.promoPrice,
    promoName: request.promoName,
    promoStartDate: request.promoStartDate,
    promoEndDate: request.promoEndDate,

    labelTitle: preview.labelTitle,
    labelPrimaryPrice: preview.labelPrimaryPrice,
    labelSecondaryPrice: preview.labelSecondaryPrice,
    labelBadgeText: preview.labelBadgeText,
    labelFooterText: preview.labelFooterText,

    quantity: Math.max(1, Number(quantity || request.quantity || 1)),
    copies: Math.max(1, Number(copies || request.copies || 1)),
    size: preview.size,
    orientation: preview.orientation,

    requestedBy: request.requestedBy,
    requestedByRole: request.requestedByRole,
    deviceId: request.deviceId,
    sessionId: request.sessionId,
    createdAt: existing?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };

  const nextContracts = [contract, ...existingContracts.filter((entry) => entry.contractId !== contract.contractId && entry.requestId !== request.requestId)].slice(0, MAX_RECORDS);
  safeWrite(CONTRACTS_KEY, nextContracts);

  const updatedRequest = saveShelfTicketQueueRequest({
    ...request,
    status: request.status === SHELF_TICKET_STATUSES.DRAFT ? SHELF_TICKET_STATUSES.NEEDS_REVIEW : request.status,
    ticketContractId: contract.contractId,
    copies: contract.copies,
    updatedAt: nowIso(),
  });

  queueEvent(existing ? SCANOPS_EVENT_TYPES.SHELF_TICKET_CONTRACT_UPDATED : SCANOPS_EVENT_TYPES.SHELF_TICKET_CONTRACT_CREATED, updatedRequest, {
    contractId: contract.contractId,
    ticket_type: format.id,
  });
  createScanOpsEvent(existing ? SCANOPS_EVENT_TYPES.SHELF_TICKET_CONTRACT_UPDATED : SCANOPS_EVENT_TYPES.SHELF_TICKET_CONTRACT_CREATED, {
    source_module: "Shelf Tickets",
    sourceWorkflow: "shelf_tickets",
    shelf_ticket_request_id: request.requestId,
    shelf_ticket_contract_id: contract.contractId,
    source_event_id: request.sourceEventId,
    ticket_type: format.id,
    template_key: contract.templateKey,
    copies: contract.copies,
    status: contract.status,
    print_claimed: false,
    applies_price_directly: false,
    applies_stock_directly: false,
  });

  return { contract, request: updatedRequest };
}

export function updateShelfTicketRequestStatus(requestId, status) {
  const current = getShelfTicketQueueRequests();
  const request = current.find((entry) => entry.requestId === requestId);
  if (!request) return null;
  const updatedRequest = { ...request, status, updatedAt: nowIso() };
  safeWrite(REQUESTS_KEY, [updatedRequest, ...current.filter((entry) => entry.requestId !== requestId)].slice(0, MAX_RECORDS));

  let updatedContract = null;
  if (updatedRequest.ticketContractId) {
    const contracts = getShelfTicketPrintContracts();
    updatedContract = contracts.find((contract) => contract.contractId === updatedRequest.ticketContractId) || null;
    if (updatedContract) {
      updatedContract = { ...updatedContract, status, updatedAt: nowIso() };
      safeWrite(CONTRACTS_KEY, [updatedContract, ...contracts.filter((contract) => contract.contractId !== updatedContract.contractId)].slice(0, MAX_RECORDS));
    }
  }

  const eventMap = {
    [SHELF_TICKET_STATUSES.READY_FOR_PRINT_HANDOFF]: SCANOPS_EVENT_TYPES.SHELF_TICKET_READY_FOR_PRINT_HANDOFF,
    [SHELF_TICKET_STATUSES.PRINTED_COMPLETED]: SCANOPS_EVENT_TYPES.SHELF_TICKET_MARKED_COMPLETED,
    [SHELF_TICKET_STATUSES.CANCELLED]: SCANOPS_EVENT_TYPES.SHELF_TICKET_CANCELLED,
  };
  const eventType = eventMap[status] || SCANOPS_EVENT_TYPES.SHELF_TICKET_CONTRACT_UPDATED;
  queueEvent(eventType, updatedRequest, { contractId: updatedContract?.contractId || updatedRequest.ticketContractId, status });
  createScanOpsEvent(eventType, {
    source_module: "Shelf Tickets",
    sourceWorkflow: "shelf_tickets",
    shelf_ticket_request_id: updatedRequest.requestId,
    shelf_ticket_contract_id: updatedRequest.ticketContractId,
    source_event_id: updatedRequest.sourceEventId,
    status,
    print_claimed: status === SHELF_TICKET_STATUSES.PRINTED_COMPLETED,
    printer_integration: false,
    applies_price_directly: false,
    applies_stock_directly: false,
  });

  return { request: updatedRequest, contract: updatedContract };
}
