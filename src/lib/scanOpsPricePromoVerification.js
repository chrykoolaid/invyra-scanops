import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "./scanOpsEvents";
import { buildEventIdentity, getScanOpsSession } from "./scanOpsSession";

const STORAGE_KEY = "invyra_scanops_price_promo_verification_events_v1";
const MAX_RECORDS = 100;

export const PRICE_PROMO_RESULTS = {
  LABEL_CORRECT: "label_correct",
  PRICE_MISMATCH: "price_mismatch",
  PROMO_MISSING: "promo_missing",
  PROMO_EXPIRED: "promo_expired",
  WRONG_PRODUCT_LABEL: "wrong_product_label",
  TICKET_NEEDED: "ticket_needed",
  MANAGER_REVIEW: "manager_review",
};

export const PRICE_PROMO_RESULT_OPTIONS = [
  { id: PRICE_PROMO_RESULTS.LABEL_CORRECT, label: "Label Correct", eventType: SCANOPS_EVENT_TYPES.PRICE_LABEL_VERIFIED, status: "Verified" },
  { id: PRICE_PROMO_RESULTS.PRICE_MISMATCH, label: "Price Mismatch", eventType: SCANOPS_EVENT_TYPES.PRICE_MISMATCH_RECORDED, status: "Mismatch" },
  { id: PRICE_PROMO_RESULTS.PROMO_MISSING, label: "Promo Missing", eventType: SCANOPS_EVENT_TYPES.PROMO_LABEL_MISSING, status: "Mismatch" },
  { id: PRICE_PROMO_RESULTS.PROMO_EXPIRED, label: "Promo Expired", eventType: SCANOPS_EVENT_TYPES.PROMO_LABEL_EXPIRED, status: "Mismatch" },
  { id: PRICE_PROMO_RESULTS.WRONG_PRODUCT_LABEL, label: "Wrong Label", eventType: SCANOPS_EVENT_TYPES.WRONG_PRODUCT_LABEL_RECORDED, status: "Mismatch" },
  { id: PRICE_PROMO_RESULTS.TICKET_NEEDED, label: "Ticket Needed", eventType: SCANOPS_EVENT_TYPES.SHELF_TICKET_REQUESTED_FROM_PRICE_CHECK, status: "Ticket Requested" },
  { id: PRICE_PROMO_RESULTS.MANAGER_REVIEW, label: "Manager Review", eventType: SCANOPS_EVENT_TYPES.PRICE_CHECK_MANAGER_REVIEW_REQUESTED, status: "Review Required" },
];

export const PRICE_PROMO_REASON_OPTIONS = [
  { id: "shelf_higher_than_system", label: "Shelf label higher than system" },
  { id: "shelf_lower_than_system", label: "Shelf label lower than system" },
  { id: "promo_price_not_displayed", label: "Promo price not displayed" },
  { id: "old_promo_displayed", label: "Old promo still displayed" },
  { id: "wrong_item_ticket", label: "Wrong item ticket" },
  { id: "missing_ticket", label: "Missing ticket" },
  { id: "unclear_damaged_label", label: "Unclear / damaged label" },
];

const DEMO_PROMOTIONS = [
  {
    id: "promo_coke_125_may_2026",
    itemKeys: ["item_coke_125", "GROC-COKE-NS-125", "930000000001"],
    name: "Coke No Sugar shelf special",
    promoPrice: 88,
    startDate: "2026-05-01",
    endDate: "2026-05-18",
  },
  {
    id: "promo_yoghurt_1kg_may_2026",
    itemKeys: ["item_yoghurt_1kg", "SKU-YOG-1KG", "930000000004"],
    name: "Dairy Direct weekly special",
    promoPrice: 198,
    startDate: "2026-05-06",
    endDate: "2026-05-16",
  },
  {
    id: "promo_strawberries_250g_may_2026",
    itemKeys: ["item_strawberries_250g", "PRODUCE-STRAWBERRIES-250G", "930000000009"],
    name: "Fresh produce weekend label",
    promoPrice: 139,
    startDate: "2026-05-10",
    endDate: "2026-05-15",
  },
];

function readEvents() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn("Unable to read price/promo verification events", error);
    return [];
  }
}

function writeEvents(events) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_RECORDS)));
  } catch (error) {
    console.warn("Unable to persist price/promo verification events", error);
  }
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function itemKeys(item = {}) {
  return [item.internalItemId, item.productId, item.id, item.sku, item.barcode, item.gtin, item.plu, item.scaleCode].filter(Boolean).map(String);
}

function dateValue(value) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getPricePromoResult(resultId) {
  return PRICE_PROMO_RESULT_OPTIONS.find((result) => result.id === resultId) || PRICE_PROMO_RESULT_OPTIONS[0];
}

export function getPricePromoReason(reasonId) {
  return PRICE_PROMO_REASON_OPTIONS.find((reason) => reason.id === reasonId) || null;
}

export function getAllPricePromoVerificationEvents() {
  return readEvents();
}

export function getPriceVerificationEvents() {
  return readEvents().filter((event) => event.eventBucket === "priceVerificationEvents");
}

export function getPromotionVerificationEvents() {
  return readEvents().filter((event) => event.eventBucket === "promotionVerificationEvents");
}

export function getLabelMismatchEvents() {
  return readEvents().filter((event) => event.eventBucket === "labelMismatchEvents");
}

export function getExpectedRegularPrice(item = {}) {
  return numberOrNull(item.currentPrice ?? item.current_price ?? item.regularPrice ?? item.regular_price ?? item.pricePerKg ?? item.price_per_kg);
}

export function getActivePromotionForItem(item = {}, now = new Date()) {
  const keys = new Set(itemKeys(item));
  const promotion = DEMO_PROMOTIONS.find((candidate) => candidate.itemKeys.some((key) => keys.has(String(key))));
  if (!promotion) return null;
  const start = dateValue(promotion.startDate);
  const end = dateValue(promotion.endDate);
  const active = (!start || now >= start) && (!end || now <= end);
  return {
    ...promotion,
    active,
    state: active ? "Active" : end && now > end ? "Expired" : "Upcoming",
  };
}

export function getExpectedShelfPrice(item = {}) {
  const promotion = getActivePromotionForItem(item);
  return promotion?.active ? numberOrNull(promotion.promoPrice) : getExpectedRegularPrice(item);
}

export function formatScanOpsMoney(value, currency = "₱", suffix = "") {
  const amount = numberOrNull(value);
  if (amount == null) return "—";
  return `${currency}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`;
}

function eventBucketFor(resultId) {
  if ([PRICE_PROMO_RESULTS.PROMO_MISSING, PRICE_PROMO_RESULTS.PROMO_EXPIRED].includes(resultId)) return "promotionVerificationEvents";
  if ([PRICE_PROMO_RESULTS.PRICE_MISMATCH, PRICE_PROMO_RESULTS.WRONG_PRODUCT_LABEL, PRICE_PROMO_RESULTS.TICKET_NEEDED, PRICE_PROMO_RESULTS.MANAGER_REVIEW].includes(resultId)) return "labelMismatchEvents";
  return "priceVerificationEvents";
}

function itemSnapshot(item = {}) {
  return {
    itemId: item.internalItemId || item.productId || item.id || null,
    internalItemId: item.internalItemId || item.id || null,
    sku: item.sku || null,
    barcode: item.barcode || item.gtin || null,
    plu: item.plu || item.scaleCode || null,
    itemName: item.name || item.item_name || "Scanned item",
    department: item.department || item.category || "Store floor",
    category: item.category || null,
    shelfLocation: item.shelfLocation || item.location || [item.aisle, item.bay, item.shelf].filter(Boolean).join(" · ") || null,
    unitType: item.unitType || item.unit_type || item.unit || "each",
    currency: item.currency || "₱",
    currentPrice: item.currentPrice ?? item.current_price ?? null,
    pricePerKg: item.pricePerKg ?? item.price_per_kg ?? null,
  };
}

export function savePricePromoVerificationEvent({ item, resultId, reasonId = "", shelfLabelPrice = "", promoLabelVisible = null, notes = "" }) {
  if (!item) return null;
  const result = getPricePromoResult(resultId);
  const reason = getPricePromoReason(reasonId);
  const session = getScanOpsSession();
  const identity = buildEventIdentity(session);
  const snapshot = itemSnapshot(item);
  const regular = getExpectedRegularPrice(item);
  const promotion = getActivePromotionForItem(item);
  const promoPrice = promotion?.active ? numberOrNull(promotion.promoPrice) : null;
  const shelfPrice = numberOrNull(shelfLabelPrice);
  const requestedShelfTicket = result.id === PRICE_PROMO_RESULTS.TICKET_NEEDED;
  const requiresManagerReview = result.id === PRICE_PROMO_RESULTS.MANAGER_REVIEW;
  const traceId = makeId("trace_price");

  const verification = {
    id: makeId("price_check"),
    priceVerificationId: makeId("price_verification"),
    sourceWorkflow: "price_promo_verification",
    workflow_type: "price_promo_verification",
    source_module: "Price Check",
    eventBucket: eventBucketFor(result.id),
    eventType: result.eventType,
    status: result.status,
    result: result.id,
    resultLabel: result.label,
    reasonCode: reason?.id || null,
    reasonLabel: reason?.label || null,
    notes: String(notes || "").trim(),

    itemId: snapshot.itemId,
    sku: snapshot.sku,
    barcode: snapshot.barcode,
    plu: snapshot.plu,
    itemName: snapshot.itemName,
    item_name: snapshot.itemName,
    department: snapshot.department,
    category: snapshot.category,
    shelfLocation: snapshot.shelfLocation,
    item_snapshot: snapshot,

    expectedRegularPrice: regular,
    expected_regular_price: regular,
    expectedPromoPrice: promoPrice,
    expected_promo_price: promoPrice,
    expectedShelfPrice: promoPrice ?? regular,
    expected_shelf_price: promoPrice ?? regular,
    activePromotionId: promotion?.active ? promotion.id : null,
    promotionName: promotion?.active ? promotion.name : null,
    promotionStartDate: promotion?.startDate || null,
    promotionEndDate: promotion?.endDate || null,
    promotionState: promotion?.state || "No active promo",

    shelfLabelPrice: shelfPrice,
    shelf_label_price: shelfPrice,
    promoLabelVisible: promoLabelVisible === null ? null : Boolean(promoLabelVisible),
    promo_label_visible: promoLabelVisible === null ? null : Boolean(promoLabelVisible),

    requestedShelfTicket,
    requested_shelf_ticket: requestedShelfTicket,
    requiresManagerReview,
    requires_manager_review: requiresManagerReview,
    applies_price_directly: false,
    applies_stock_directly: false,
    print_contract_created: false,

    userId: identity.actorUserId || identity.user_id,
    userName: identity.actorName || identity.user_name,
    role: identity.actorRole || identity.role,
    deviceId: identity.deviceId || identity.scanner_id,
    scannerId: identity.scannerId,
    storeId: identity.storeId,
    sessionId: identity.sessionId,
    createdAt: identity.created_at,
    created_at: identity.created_at,
    traceId,
  };

  const next = [verification, ...readEvents()].slice(0, MAX_RECORDS);
  writeEvents(next);

  const event = createScanOpsEvent(result.eventType, {
    traceId,
    source_module: "Price Check",
    sourceWorkflow: "price_promo_verification",
    workflow_type: "price_promo_verification",
    price_verification_id: verification.priceVerificationId,
    status: result.status,
    result: result.id,
    result_label: result.label,
    reason_code: verification.reasonCode,
    reason_label: verification.reasonLabel,
    notes: verification.notes,
    item_id: snapshot.itemId,
    item_name: snapshot.itemName,
    itemName: snapshot.itemName,
    sku: snapshot.sku,
    barcode: snapshot.barcode,
    plu: snapshot.plu,
    department: snapshot.department,
    shelf_location: snapshot.shelfLocation,
    item_snapshot: snapshot,
    expected_regular_price: regular,
    expected_promo_price: promoPrice,
    expected_shelf_price: promoPrice ?? regular,
    active_promotion_id: verification.activePromotionId,
    promotion_name: verification.promotionName,
    promotion_start_date: verification.promotionStartDate,
    promotion_end_date: verification.promotionEndDate,
    promotion_state: verification.promotionState,
    shelf_label_price: shelfPrice,
    promo_label_visible: verification.promoLabelVisible,
    requested_shelf_ticket: requestedShelfTicket,
    requires_manager_review: requiresManagerReview,
    applies_price_directly: false,
    applies_stock_directly: false,
    print_contract_created: false,
  });

  return { verification, event, events: next };
}
