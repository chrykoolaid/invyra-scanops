export const SHELF_TICKET_TYPES = {
  STANDARD_SHELF_TICKET: "STANDARD_SHELF_TICKET",
  SMALL_SHELF_TICKET: "SMALL_SHELF_TICKET",
  LARGE_PROMO_TICKET: "LARGE_PROMO_TICKET",
  A4_PROMO_SHEET: "A4_PROMO_SHEET",
  CLEARANCE_TICKET: "CLEARANCE_TICKET",
  MISSING_TICKET_REPLACEMENT: "MISSING_TICKET_REPLACEMENT",
  PRICE_CHECK_TICKET: "PRICE_CHECK_TICKET",
};

export const SHELF_TICKET_TYPE_OPTIONS = [
  { id: SHELF_TICKET_TYPES.STANDARD_SHELF_TICKET, label: "Standard", helper: "Normal shelf edge ticket" },
  { id: SHELF_TICKET_TYPES.SMALL_SHELF_TICKET, label: "Small", helper: "Compact shelf ticket" },
  { id: SHELF_TICKET_TYPES.LARGE_PROMO_TICKET, label: "Promo", helper: "Large promotional ticket" },
  { id: SHELF_TICKET_TYPES.A4_PROMO_SHEET, label: "A4", helper: "A4 promo sheet" },
  { id: SHELF_TICKET_TYPES.CLEARANCE_TICKET, label: "Clearance", helper: "Clearance / markdown ticket" },
  { id: SHELF_TICKET_TYPES.MISSING_TICKET_REPLACEMENT, label: "Missing", helper: "Missing or damaged ticket" },
  { id: SHELF_TICKET_TYPES.PRICE_CHECK_TICKET, label: "Price Check", helper: "Price mismatch check" },
];

export const SHELF_TICKET_REASONS = {
  MISSING_OR_DAMAGED: "MISSING_OR_DAMAGED",
  PRICE_CHANGE: "PRICE_CHANGE",
  PROMOTION: "PROMOTION",
  CLEARANCE: "CLEARANCE",
  SHELF_LOCATION_CORRECTION: "SHELF_LOCATION_CORRECTION",
  PRODUCT_INFORMATION_CORRECTION: "PRODUCT_INFORMATION_CORRECTION",
  EXPIRY_OR_FRESHNESS_REVIEW: "EXPIRY_OR_FRESHNESS_REVIEW",
};

export const SHELF_TICKET_REASON_OPTIONS = [
  { id: SHELF_TICKET_REASONS.MISSING_OR_DAMAGED, label: "Missing / Damaged" },
  { id: SHELF_TICKET_REASONS.PRICE_CHANGE, label: "Price Change" },
  { id: SHELF_TICKET_REASONS.PROMOTION, label: "Promotion" },
  { id: SHELF_TICKET_REASONS.CLEARANCE, label: "Clearance" },
  { id: SHELF_TICKET_REASONS.SHELF_LOCATION_CORRECTION, label: "Shelf Correction" },
  { id: SHELF_TICKET_REASONS.PRODUCT_INFORMATION_CORRECTION, label: "Product Correction" },
  { id: SHELF_TICKET_REASONS.EXPIRY_OR_FRESHNESS_REVIEW, label: "Freshness Review" },
];

export function getShelfTicketTypeLabel(type) {
  return SHELF_TICKET_TYPE_OPTIONS.find((option) => option.id === type)?.label || "Shelf Ticket";
}

export function getShelfTicketReasonLabel(reason) {
  return SHELF_TICKET_REASON_OPTIONS.find((option) => option.id === reason)?.label || "Shelf ticket request";
}

export function getTicketPrice(item) {
  if (!item) return "—";
  const currency = item.currency || "₱";
  if (item.pricePerKg) return `${currency}${item.pricePerKg}/kg`;
  const price = item.currentPrice ?? item.current_price;
  return price === null || price === undefined ? "Price pending" : `${currency}${price}`;
}

function value(item, camel, snake, fallback = null) {
  return item?.[camel] ?? item?.[snake] ?? fallback;
}

export function buildShelfTicketLine(item, ticketType, ticketReason, extra = {}) {
  const now = Date.now();
  return {
    ticketLineId: extra.ticketLineId || `STL-${now}-${Math.random().toString(36).slice(2, 6)}`,
    itemId: value(item, "internalItemId", "internal_item_id", item?.id || null),
    sku: item?.sku || null,
    gtin: item?.gtin || null,
    barcode: item?.barcode || item?.gtin || item?.plu || null,
    plu: item?.plu || null,
    scaleCode: item?.scaleCode || item?.scale_code || null,
    batchId: value(item, "batchId", "batch_id"),
    lotId: value(item, "lotId", "lot_id"),
    description: item?.name || item?.item_name || "Unknown item",
    department: item?.department || "—",
    category: item?.category || "—",
    shelfLocation: item?.shelfLocation || item?.location || item?.shelf || "Shelf location pending",
    ticketSize: ticketType,
    ticketSizeLabel: getShelfTicketTypeLabel(ticketType),
    ticketReason,
    ticketReasonLabel: getShelfTicketReasonLabel(ticketReason),
    priceSource: "INVENTORY_SNAPSHOT",
    price: item?.currentPrice ?? item?.current_price ?? null,
    pricePerKg: item?.pricePerKg || null,
    currency: item?.currency || "₱",
    displayPrice: getTicketPrice(item),
    promo: extra.promo || null,
    syncTarget: "DESKTOP_TICKET_QUEUE",
    syncStatus: "LOCAL_BATCH",
    createdAt: new Date().toISOString(),
    ...extra,
  };
}

export function validateShelfTicketBatch(batch) {
  if (!batch) return { ok: false, message: "No shelf ticket batch exists." };
  if (!Array.isArray(batch.lines) || batch.lines.length === 0) return { ok: false, message: "Scan at least one item before sending to desktop." };
  return { ok: true, message: `${batch.lines.length} ticket item${batch.lines.length === 1 ? "" : "s"} ready for desktop.` };
}
