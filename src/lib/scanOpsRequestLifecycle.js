import { getNetworkMode } from "./scanOpsSync";
import { getScanOpsSession } from "./scanOpsSession";
import { normalizeSelectedScanItem } from "./scanOpsWorkflowBatch";

const RECEIVING_STORAGE_KEY = "invyra_scanops_receiving_requests_v1";
const TRANSFER_STORAGE_KEY = "invyra_scanops_transfer_requests_v1";
const WASTE_STORAGE_KEY = "invyra_scanops_waste_requests_v1";
const MARKDOWN_STORAGE_KEY = "invyra_scanops_markdown_requests_v1";
const SHELF_TICKET_STORAGE_KEY = "invyra_scanops_shelf_ticket_requests_v1";

const WASTE_DRAFT_KEY = "invyra_scanops_waste_draft_v1";
const MARKDOWN_DRAFT_KEY = "invyra_scanops_markdown_draft_v1";
const SHELF_TICKET_DRAFT_KEY = "invyra_scanops_shelf_ticket_draft_v1";

function nowIso() {
  return new Date().toISOString();
}

function safeRead(key) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn(`Unable to read ${key}`, error);
    return [];
  }
}

function safeWrite(key, rows) {
  if (typeof window === "undefined") return rows;
  try {
    window.localStorage.setItem(key, JSON.stringify(rows));
  } catch (error) {
    console.warn(`Unable to write ${key}`, error);
  }
  return rows;
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getActorFields() {
  const session = getScanOpsSession();
  return {
    createdBy: session.actorName || session.user_name || "Scanner operator",
    createdRole: session.actorRole || session.role || "Staff",
    actorUserId: session.actorUserId || session.user_id || "staff_001",
    deviceId: session.deviceId || session.scannerId || "SCANOPS_001",
    storeId: session.storeId || session.location_id || "store_001",
  };
}

function requestStatusForNetwork() {
  return getNetworkMode() === "offline" ? "sync_pending" : "submitted";
}

export const RECEIVING_MODES = {
  AGAINST_PO: "against_po",
  ADHOC_DELIVERY: "adhoc_delivery",
};

export const RECEIVING_MODE_OPTIONS = [
  { id: RECEIVING_MODES.AGAINST_PO, label: "Against PO", helper: "Expected delivery or purchase order" },
  { id: RECEIVING_MODES.ADHOC_DELIVERY, label: "Ad-hoc Delivery", helper: "Delivery evidence without matched PO" },
];

export const RECEIVING_CONDITION_OPTIONS = [
  { id: "good", label: "Good" },
  { id: "damaged", label: "Damaged" },
  { id: "short_dated", label: "Short dated" },
  { id: "wrong_item", label: "Wrong item" },
  { id: "temperature_concern", label: "Temperature concern" },
  { id: "other", label: "Other" },
];

export const RECEIVING_DISCREPANCY_OPTIONS = [
  { id: "none", label: "None" },
  { id: "short_received", label: "Short received" },
  { id: "over_received", label: "Over received" },
  { id: "damaged_on_arrival", label: "Damaged on arrival" },
  { id: "wrong_item_supplied", label: "Wrong item supplied" },
  { id: "not_on_po", label: "Not on PO" },
  { id: "other", label: "Other" },
];

export const TRANSFER_REQUEST_TYPES = {
  BACKROOM_TO_SHELF: "backroom_to_shelf",
  SHELF_TO_BACKROOM: "shelf_to_backroom",
  STORE_TO_STORE: "store_to_store",
  DEPARTMENT_TO_DEPARTMENT: "department_to_department",
};

export const TRANSFER_REQUEST_TYPE_OPTIONS = [
  { id: TRANSFER_REQUEST_TYPES.BACKROOM_TO_SHELF, label: "Backroom → Shelf", helper: "Fill shelf from backroom" },
  { id: TRANSFER_REQUEST_TYPES.SHELF_TO_BACKROOM, label: "Shelf → Backroom", helper: "Move excess stock back" },
  { id: TRANSFER_REQUEST_TYPES.STORE_TO_STORE, label: "Store → Store", helper: "Request stock movement between stores" },
  { id: TRANSFER_REQUEST_TYPES.DEPARTMENT_TO_DEPARTMENT, label: "Department → Department", helper: "Move ownership between departments" },
];

export const TRANSFER_REASON_OPTIONS = [
  { id: "replenishment", label: "Replenishment" },
  { id: "stock_relocation", label: "Stock relocation" },
  { id: "customer_demand", label: "Customer demand" },
  { id: "display_fill", label: "Display fill" },
  { id: "damaged_area_cleanup", label: "Damaged area cleanup" },
  { id: "correction_request", label: "Correction request" },
  { id: "other", label: "Other" },
];

export const TRANSFER_LOCATION_OPTIONS = [
  { id: "backroom_a", label: "Backroom A" },
  { id: "dairy_shelf", label: "Dairy Shelf" },
  { id: "grocery_shelf", label: "Grocery Shelf" },
  { id: "produce_display", label: "Produce Display" },
  { id: "fresh_coolroom", label: "Fresh Coolroom" },
  { id: "store_002", label: "Store 002" },
  { id: "grocery_department", label: "Grocery Department" },
  { id: "fresh_department", label: "Fresh Department" },
];

export function getOptionLabel(options, id, fallback = "—") {
  return options.find((option) => option.id === id)?.label || id || fallback;
}

export function normalizeReceivingLine({ item, quantity, condition, discrepancy, supplierId, supplierName, poReference, receivingMode, attributeSnapshot }) {
  const selected = normalizeSelectedScanItem(item, "manual_search");
  const expectedQty = Number(item?.pendingDeliveryQty ?? item?.pending_delivery_qty ?? 24);
  const receivedQty = Number(quantity || 0);
  return {
    requestItemId: makeId("recv_item"),
    itemId: selected?.itemId || makeId("item"),
    itemName: selected?.itemName || "Scanned item",
    sku: selected?.sku,
    barcode: selected?.barcode,
    expectedQty: Number.isFinite(expectedQty) ? expectedQty : undefined,
    alreadyReceivedQty: 0,
    receivedQty,
    quantity: receivedQty,
    unit: selected?.unit || item?.unitType || item?.unit_type || "each",
    condition,
    discrepancy,
    supplierId,
    supplierName,
    poReference,
    receivingMode,
    shelfStock: item?.shelfStock ?? item?.shelf_stock,
    backroomStock: item?.backroomStock ?? item?.backroom_stock,
    stockOnHand: item?.stockOnHand ?? item?.stock_on_hand,
    shelfLocation: item?.shelfLocation || item?.location || item?.shelf,
    expiryDateEvidence: attributeSnapshot?.expiry_snapshot?.expiry_date || undefined,
    lotBatchEvidence: attributeSnapshot?.lot_batch_snapshot?.lot_batch_value || undefined,
    weightedEvidence: attributeSnapshot?.weighted_snapshot || undefined,
    attributeSnapshot,
    rawItem: selected,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

export function getReceivingLineKey(line) {
  return [line.itemId, line.condition || "good", line.discrepancy || "none", line.expiryDateEvidence || "", line.lotBatchEvidence || "", line.attributeSnapshot?.attributeKey || ""].join("|");
}

export function upsertReceivingLine(current = [], nextLine) {
  const nextKey = getReceivingLineKey(nextLine);
  let merged = false;
  const next = current.map((line) => {
    if (getReceivingLineKey(line) !== nextKey) return line;
    merged = true;
    const receivedQty = Number(line.receivedQty || 0) + Number(nextLine.receivedQty || 0);
    return {
      ...line,
      receivedQty: Number(receivedQty.toFixed(3)),
      quantity: Number(receivedQty.toFixed(3)),
      attributeSnapshot: nextLine.attributeSnapshot || line.attributeSnapshot,
      expiryDateEvidence: nextLine.expiryDateEvidence || line.expiryDateEvidence,
      lotBatchEvidence: nextLine.lotBatchEvidence || line.lotBatchEvidence,
      weightedEvidence: nextLine.weightedEvidence || line.weightedEvidence,
      updatedAt: nowIso(),
    };
  });
  return merged ? next : [nextLine, ...current];
}

export function buildReceivingRequest({ supplierId, supplierName, poReference, receivingMode, items = [] }) {
  const createdAt = nowIso();
  return {
    requestId: makeId("recv_req"),
    supplierId,
    supplierName,
    poReference: poReference || undefined,
    receivingMode,
    status: requestStatusForNetwork(),
    sourceWorkflow: "ScanOps Receiving",
    items,
    ...getActorFields(),
    createdAt,
    submittedAt: createdAt,
    appliesStockDirectly: false,
    stockPostingOwner: "Invyra Inventory",
  };
}

export function saveReceivingRequest(request) {
  safeWrite(RECEIVING_STORAGE_KEY, [request, ...safeRead(RECEIVING_STORAGE_KEY)].slice(0, 100));
  return request;
}

export function getReceivingRequests() {
  return safeRead(RECEIVING_STORAGE_KEY);
}

export function buildTransferRequest({ transferType, sourceLocationId, destinationLocationId, reason, item, quantity, availableAtSource }) {
  const selected = normalizeSelectedScanItem(item, "manual_search");
  const createdAt = nowIso();
  return {
    requestId: makeId("trf_req"),
    transferType,
    sourceLocationId,
    destinationLocationId,
    reason,
    status: requestStatusForNetwork(),
    sourceWorkflow: "ScanOps Transfers",
    items: [
      {
        requestItemId: makeId("trf_item"),
        itemId: selected?.itemId || makeId("item"),
        itemName: selected?.itemName || "Scanned item",
        sku: selected?.sku,
        barcode: selected?.barcode,
        requestedQty: Number(quantity || 0),
        quantity: Number(quantity || 0),
        unit: selected?.unit || item?.unitType || item?.unit_type || "each",
        availableAtSource,
        sourceSnapshotAt: createdAt,
        rawItem: selected,
      },
    ],
    ...getActorFields(),
    createdAt,
    submittedAt: createdAt,
    appliesStockDirectly: false,
    stockPostingOwner: "Invyra Inventory",
  };
}

export function saveTransferRequest(request) {
  safeWrite(TRANSFER_STORAGE_KEY, [request, ...safeRead(TRANSFER_STORAGE_KEY)].slice(0, 100));
  return request;
}

export function getTransferRequests() {
  return safeRead(TRANSFER_STORAGE_KEY);
}


export const WASTE_REASON_OPTIONS = [
  { id: "expired_short_dated", label: "Expired / short dated" },
  { id: "damaged_in_handling", label: "Damaged in handling" },
  { id: "spoiled_temperature_concern", label: "Spoiled / temperature concern" },
  { id: "customer_return_unsellable", label: "Customer return unsellable" },
  { id: "packaging_damaged", label: "Packaging damaged" },
  { id: "theft_shrink_evidence", label: "Theft / shrink evidence" },
  { id: "production_use", label: "Production use" },
  { id: "sampling_promos", label: "Sampling / promos" },
  { id: "spillage", label: "Spillage" },
  { id: "other", label: "Other" },
];

export const WASTE_CONDITION_OPTIONS = [
  { id: "unsellable", label: "Unsellable" },
  { id: "sellable", label: "Sellable" },
  { id: "damaged", label: "Damaged" },
  { id: "temperature_concern", label: "Temperature concern" },
  { id: "manager_review_required", label: "Manager review required" },
  { id: "other", label: "Other" },
];

export const WASTE_DISPOSAL_ACTION_OPTIONS = [
  { id: "discarded", label: "Discarded" },
  { id: "held_for_manager_review", label: "Held for manager review" },
  { id: "returned_to_supplier", label: "Returned to supplier" },
  { id: "donation_candidate", label: "Donation candidate" },
  { id: "quarantine_food_safety_hold", label: "Quarantine / food safety hold" },
  { id: "other", label: "Other" },
];

export const MARKDOWN_REASON_OPTIONS = [
  { id: "short_dated", label: "Short dated" },
  { id: "damaged_packaging", label: "Damaged packaging" },
  { id: "clearance", label: "Clearance" },
  { id: "overstock", label: "Overstock" },
  { id: "promotional_sell_through", label: "Promotional sell-through" },
  { id: "discontinued_item", label: "Discontinued item" },
  { id: "manager_instruction", label: "Manager instruction" },
  { id: "competitor_response", label: "Competitor response" },
  { id: "other", label: "Other" },
];

export const MARKDOWN_TYPE_OPTIONS = [
  { id: "fixed_new_price", label: "Fixed new price" },
  { id: "percentage_discount", label: "Percentage discount" },
  { id: "amount_off", label: "Amount off" },
  { id: "clearance_ticket_only", label: "Clearance ticket only" },
  { id: "manager_review_only", label: "Manager review only" },
];

export const SHELF_TICKET_REQUEST_TYPE_OPTIONS = [
  { id: "standard_shelf_ticket", label: "Standard shelf ticket" },
  { id: "markdown_ticket", label: "Markdown ticket" },
  { id: "promo_ticket", label: "Promo ticket" },
  { id: "clearance_ticket", label: "Clearance ticket" },
  { id: "replacement_ticket", label: "Replacement ticket" },
  { id: "price_check_ticket", label: "Price check ticket" },
];

export const SHELF_TICKET_PAPER_SIZE_OPTIONS = [
  { id: "small_shelf_edge", label: "Small shelf edge" },
  { id: "medium_shelf_edge", label: "Medium shelf edge" },
  { id: "large_promo_card", label: "Large promo card" },
  { id: "a6", label: "A6" },
  { id: "a5", label: "A5" },
  { id: "custom_manager_review", label: "Custom / manager review" },
];

export const SHELF_TICKET_REQUEST_REASON_OPTIONS = [
  { id: "missing_ticket", label: "Missing ticket" },
  { id: "damaged_ticket", label: "Damaged ticket" },
  { id: "price_mismatch", label: "Price mismatch" },
  { id: "promo_change", label: "Promo change" },
  { id: "markdown_required", label: "Markdown required" },
  { id: "planogram_reset", label: "Planogram reset" },
  { id: "new_item", label: "New item" },
  { id: "other", label: "Other" },
];

export function getCurrentPriceSnapshot(item) {
  const value = item?.currentPrice ?? item?.current_price ?? item?.pricePerKg ?? item?.price_per_kg ?? null;
  return value == null || value === "" ? null : Number(value);
}

export function getCurrencySymbol(item) {
  return item?.currency || "₱";
}

export function normalizeWasteRequestLine({ item, quantity, reason, condition, disposalAction, notes, attributeSnapshot }) {
  const selected = normalizeSelectedScanItem(item, "manual_search");
  const qty = Number(quantity || 0);
  return {
    requestItemId: makeId("waste_item"),
    itemId: selected?.itemId || makeId("item"),
    itemName: selected?.itemName || "Scanned item",
    sku: selected?.sku,
    barcode: selected?.barcode,
    quantity: Number(qty.toFixed(3)),
    unit: selected?.unit || item?.unitType || item?.unit_type || "each",
    reason,
    condition,
    disposalAction,
    notes: notes || undefined,
    shelfStock: item?.shelfStock ?? item?.shelf_stock,
    backroomStock: item?.backroomStock ?? item?.backroom_stock,
    stockOnHand: item?.stockOnHand ?? item?.stock_on_hand,
    expiryDate: item?.expiryDate || item?.expiry_date || undefined,
    freshnessStatus: item?.freshnessStatus || item?.expiry_status || undefined,
    expiryDateEvidence: attributeSnapshot?.expiry_snapshot?.expiry_date || undefined,
    lotBatchEvidence: attributeSnapshot?.lot_batch_snapshot?.lot_batch_value || undefined,
    weightedEvidence: attributeSnapshot?.weighted_snapshot || undefined,
    attributeSnapshot,
    rawItem: selected,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

export function getWasteLineKey(line) {
  return [line.itemId, line.reason || "", line.condition || "", line.disposalAction || "", line.expiryDateEvidence || "", line.lotBatchEvidence || "", line.attributeSnapshot?.attributeKey || ""].join("|");
}

export function upsertWasteRequestLine(current = [], nextLine) {
  const nextKey = getWasteLineKey(nextLine);
  let merged = false;
  const next = current.map((line) => {
    if (getWasteLineKey(line) !== nextKey) return line;
    merged = true;
    const quantity = Number(line.quantity || 0) + Number(nextLine.quantity || 0);
    return {
      ...line,
      quantity: Number(quantity.toFixed(3)),
      notes: nextLine.notes || line.notes,
      attributeSnapshot: nextLine.attributeSnapshot || line.attributeSnapshot,
      expiryDateEvidence: nextLine.expiryDateEvidence || line.expiryDateEvidence,
      lotBatchEvidence: nextLine.lotBatchEvidence || line.lotBatchEvidence,
      weightedEvidence: nextLine.weightedEvidence || line.weightedEvidence,
      updatedAt: nowIso(),
    };
  });
  return merged ? next : [nextLine, ...current];
}

export function buildWasteRequest({ items = [] }) {
  const createdAt = nowIso();
  const reviewRequired = items.some((line) => ["held_for_manager_review", "quarantine_food_safety_hold"].includes(line.disposalAction) || line.condition === "manager_review_required");
  return {
    requestId: makeId("waste_req"),
    status: reviewRequired ? "review_required" : requestStatusForNetwork(),
    sourceWorkflow: "waste",
    items,
    ...getActorFields(),
    createdAt,
    submittedAt: createdAt,
    appliesStockDirectly: false,
    stockPostingOwner: "Invyra Inventory",
    reviewRequired,
  };
}

export function saveWasteRequest(request) {
  safeWrite(WASTE_STORAGE_KEY, [request, ...safeRead(WASTE_STORAGE_KEY)].slice(0, 100));
  clearWorkflowDraft("waste");
  return request;
}

export function getWasteRequests() {
  return safeRead(WASTE_STORAGE_KEY);
}

export function normalizeMarkdownRequestLine({ item, reason, markdownType, requestedPrice, requestedPercentOff, requestedAmountOff, ticketRequired, notes, attributeSnapshot }) {
  const selected = normalizeSelectedScanItem(item, "manual_search");
  const currentPrice = getCurrentPriceSnapshot(item);
  const price = requestedPrice === "" || requestedPrice == null ? null : Number(requestedPrice);
  const percent = requestedPercentOff === "" || requestedPercentOff == null ? null : Number(requestedPercentOff);
  const amount = requestedAmountOff === "" || requestedAmountOff == null ? null : Number(requestedAmountOff);
  return {
    requestItemId: makeId("md_item"),
    itemId: selected?.itemId || makeId("item"),
    itemName: selected?.itemName || "Scanned item",
    sku: selected?.sku,
    barcode: selected?.barcode,
    currentPrice: Number.isFinite(currentPrice) ? currentPrice : null,
    currency: getCurrencySymbol(item),
    requestedPrice: Number.isFinite(price) ? price : null,
    requestedPercentOff: Number.isFinite(percent) ? percent : null,
    requestedAmountOff: Number.isFinite(amount) ? amount : null,
    reason,
    markdownType,
    ticketRequired: Boolean(ticketRequired),
    notes: notes || undefined,
    expiryDate: item?.expiryDate || item?.expiry_date || undefined,
    freshnessStatus: item?.freshnessStatus || item?.expiry_status || undefined,
    expiryDateEvidence: attributeSnapshot?.expiry_snapshot?.expiry_date || undefined,
    lotBatchEvidence: attributeSnapshot?.lot_batch_snapshot?.lot_batch_value || undefined,
    weightedEvidence: attributeSnapshot?.weighted_snapshot || undefined,
    attributeSnapshot,
    stockOnHand: item?.stockOnHand ?? item?.stock_on_hand,
    rawItem: selected,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

export function getMarkdownLineKey(line) {
  return [line.itemId, line.reason || "", line.markdownType || "", line.ticketRequired ? "ticket" : "no_ticket", line.expiryDateEvidence || "", line.lotBatchEvidence || "", line.attributeSnapshot?.attributeKey || ""].join("|");
}

export function upsertMarkdownRequestLine(current = [], nextLine) {
  const nextKey = getMarkdownLineKey(nextLine);
  let merged = false;
  const next = current.map((line) => {
    if (getMarkdownLineKey(line) !== nextKey) return line;
    merged = true;
    return {
      ...line,
      ...nextLine,
      requestItemId: line.requestItemId,
      createdAt: line.createdAt,
      updatedAt: nowIso(),
    };
  });
  return merged ? next : [nextLine, ...current];
}

export function buildMarkdownRequest({ items = [] }) {
  const createdAt = nowIso();
  return {
    requestId: makeId("md_req"),
    status: requestStatusForNetwork(),
    sourceWorkflow: "markdown",
    items,
    ...getActorFields(),
    createdAt,
    submittedAt: createdAt,
    appliesPriceDirectly: false,
    priceActivationOwner: "Invyra Inventory",
    linkedTicketIntent: items.some((line) => line.ticketRequired),
  };
}

export function saveMarkdownRequest(request) {
  safeWrite(MARKDOWN_STORAGE_KEY, [request, ...safeRead(MARKDOWN_STORAGE_KEY)].slice(0, 100));
  clearWorkflowDraft("markdown");
  return request;
}

export function getMarkdownRequests() {
  return safeRead(MARKDOWN_STORAGE_KEY);
}

export function normalizeShelfTicketRequestLine({ item, ticketType, paperSize, copies, reason, notes }) {
  const selected = normalizeSelectedScanItem(item, "manual_search");
  const qty = Math.max(1, Number(copies || 1));
  return {
    requestItemId: makeId("ticket_item"),
    itemId: selected?.itemId || makeId("item"),
    itemName: selected?.itemName || "Scanned item",
    sku: selected?.sku,
    barcode: selected?.barcode,
    currentPrice: getCurrentPriceSnapshot(item),
    currency: getCurrencySymbol(item),
    ticketType,
    paperSize,
    copies: Number(qty.toFixed(0)),
    reason,
    notes: notes || undefined,
    shelfLocation: item?.shelfLocation || item?.location || item?.shelf || undefined,
    rawItem: selected,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

export function getShelfTicketLineKey(line) {
  return [line.itemId, line.ticketType || "", line.paperSize || "", line.reason || ""].join("|");
}

export function upsertShelfTicketRequestLine(current = [], nextLine) {
  const nextKey = getShelfTicketLineKey(nextLine);
  let merged = false;
  const next = current.map((line) => {
    if (getShelfTicketLineKey(line) !== nextKey) return line;
    merged = true;
    const copies = Number(line.copies || 0) + Number(nextLine.copies || 0);
    return {
      ...line,
      copies: Number(copies.toFixed(0)),
      notes: nextLine.notes || line.notes,
      updatedAt: nowIso(),
    };
  });
  return merged ? next : [nextLine, ...current];
}

export function buildShelfTicketRequest({ items = [] }) {
  const createdAt = nowIso();
  return {
    requestId: makeId("ticket_req"),
    status: requestStatusForNetwork(),
    sourceWorkflow: "shelf_tickets",
    items,
    ...getActorFields(),
    createdAt,
    submittedAt: createdAt,
    printsDirectly: false,
    printerRoutingOwner: "Invyra Inventory",
  };
}

export function saveShelfTicketRequest(request) {
  safeWrite(SHELF_TICKET_STORAGE_KEY, [request, ...safeRead(SHELF_TICKET_STORAGE_KEY)].slice(0, 100));
  clearWorkflowDraft("shelf_tickets");
  return request;
}

export function getShelfTicketRequests() {
  return safeRead(SHELF_TICKET_STORAGE_KEY);
}

function draftKeyForWorkflow(workflow) {
  if (workflow === "waste") return WASTE_DRAFT_KEY;
  if (workflow === "markdown") return MARKDOWN_DRAFT_KEY;
  if (workflow === "shelf_tickets") return SHELF_TICKET_DRAFT_KEY;
  return null;
}

export function saveWorkflowDraft(workflow, draft) {
  const key = draftKeyForWorkflow(workflow);
  if (!key || typeof window === "undefined") return draft;
  try {
    window.localStorage.setItem(key, JSON.stringify({ ...draft, updatedAt: nowIso() }));
  } catch (error) {
    console.warn(`Unable to save ${workflow} draft`, error);
  }
  return draft;
}

export function loadWorkflowDraft(workflow) {
  const key = draftKeyForWorkflow(workflow);
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn(`Unable to load ${workflow} draft`, error);
    return null;
  }
}

export function clearWorkflowDraft(workflow) {
  const key = draftKeyForWorkflow(workflow);
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Unable to clear ${workflow} draft`, error);
  }
}
