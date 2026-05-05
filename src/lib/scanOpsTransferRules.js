export const TRANSFER_TYPES = {
  BACKROOM_TO_SHELF: "BACKROOM_TO_SHELF",
  SHELF_TO_BACKROOM: "SHELF_TO_BACKROOM",
  DAMAGED_TO_HOLDING: "DAMAGED_TO_HOLDING",
  EXPIRY_TO_REVIEW_AREA: "EXPIRY_TO_REVIEW_AREA",
  PROMO_DISPLAY_TRANSFER: "PROMO_DISPLAY_TRANSFER",
};

export const TRANSFER_TYPE_OPTIONS = [
  { id: TRANSFER_TYPES.BACKROOM_TO_SHELF, label: "Backroom → Shelf", helper: "Fill shelf from backroom" },
  { id: TRANSFER_TYPES.SHELF_TO_BACKROOM, label: "Shelf → Backroom", helper: "Move excess stock back" },
  { id: TRANSFER_TYPES.DAMAGED_TO_HOLDING, label: "Damaged → Holding", helper: "Hold damaged stock" },
  { id: TRANSFER_TYPES.EXPIRY_TO_REVIEW_AREA, label: "Expiry → Review", helper: "Move fresh stock for review" },
  { id: TRANSFER_TYPES.PROMO_DISPLAY_TRANSFER, label: "Promo Display", helper: "Move to promo display" },
];


export const TRANSFER_REASON_OPTIONS = {
  DAMAGED_TO_HOLDING: [
    { id: "DAMAGED_PACKAGING", label: "Damaged packaging" },
    { id: "LEAKING_OR_BROKEN", label: "Leaking / broken" },
    { id: "QUALITY_HOLD", label: "Quality hold" },
  ],
  EXPIRY_TO_REVIEW_AREA: [
    { id: "NEAR_EXPIRY", label: "Near expiry" },
    { id: "EXPIRED_OR_USE_BY_TODAY", label: "Expired / use-by today" },
    { id: "FRESHNESS_CHECK", label: "Freshness check" },
  ],
  PROMO_DISPLAY_TRANSFER: [
    { id: "PROMO_SETUP", label: "Promo setup" },
    { id: "ENDCAP_FILL", label: "Endcap fill" },
  ],
};

export function getReasonLabel(reasonId) {
  const groups = Object.values(TRANSFER_REASON_OPTIONS).flat();
  return groups.find((reason) => reason.id === reasonId)?.label || reasonId || "—";
}

export const LOCATION_OPTIONS = [
  { id: "BACKROOM-A", label: "Backroom A" },
  { id: "AISLE-3-DAIRY", label: "Aisle 3 Dairy" },
  { id: "AISLE-4-DRINKS", label: "Aisle 4 Drinks" },
  { id: "FRESH-REVIEW", label: "Fresh Review Area" },
  { id: "DAMAGED-HOLDING", label: "Damaged Holding" },
  { id: "PROMO-ENDCAP-1", label: "Promo Endcap 1" },
];

export function getTransferTypeLabel(type) {
  return TRANSFER_TYPE_OPTIONS.find((option) => option.id === type)?.label || "Transfer";
}

export function getLocationLabel(locationId) {
  return LOCATION_OPTIONS.find((option) => option.id === locationId)?.label || locationId || "—";
}

export function getAvailableStockForTransfer(item, sourceLocation) {
  if (!item) return 0;
  if (String(sourceLocation || "").includes("BACKROOM")) return Number(item.backroomStock ?? item.backroom_stock ?? 0);
  if (String(sourceLocation || "").includes("SHELF") || String(sourceLocation || "").includes("AISLE")) return Number(item.shelfStock ?? item.shelf_stock ?? 0);
  return Number(item.stockOnHand ?? item.stock_on_hand ?? item.shelfStock ?? item.shelf_stock ?? 0);
}

function getRequiredReasonForTransferType(transferType) {
  if (transferType === TRANSFER_TYPES.DAMAGED_TO_HOLDING) return "Damage/holding reason required.";
  if (transferType === TRANSFER_TYPES.EXPIRY_TO_REVIEW_AREA) return "Expiry/freshness review reason required.";
  return "";
}

export function buildTransferPayload({ transferType, item, sourceLocation, destinationLocation, quantity, unitType, decision, reason, reviewRequired = false }) {
  return {
    transferId: `TRF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    transferType,
    transferTypeLabel: getTransferTypeLabel(transferType),
    itemId: item?.internalItemId || item?.internal_item_id || item?.id || null,
    sku: item?.sku || null,
    gtin: item?.gtin || null,
    barcode: item?.barcode || item?.gtin || item?.plu || null,
    plu: item?.plu || null,
    scaleCode: item?.scaleCode || item?.scale_code || null,
    batchId: item?.batchId || item?.batch_id || null,
    lotId: item?.lotId || item?.lot_id || null,
    itemName: item?.name || item?.item_name || "Unknown item",
    sourceLocation,
    sourceLocationLabel: getLocationLabel(sourceLocation),
    destinationLocation,
    destinationLocationLabel: getLocationLabel(destinationLocation),
    quantity: Number(quantity),
    unitType: unitType || item?.unitType || "each",
    reason: reason || decision?.reasonText || "Scanner transfer request",
    decisionRecommendationId: decision?.decisionId || null,
    syncStatus: reviewRequired ? "NEEDS_REVIEW" : "QUEUED",
    appliesStockDirectly: false,
    officialInventoryAppliesAfterSync: true,
    supervisorReviewRequired: Boolean(reviewRequired),
  };
}

export function validateTransfer({ transferType, item, sourceLocation, destinationLocation, quantity, reason }) {
  if (!sourceLocation) return { ok: false, review: false, message: "Scan or select a source location first." };
  if (!item) return { ok: false, review: false, message: "Scan an item before confirming transfer." };
  if (!destinationLocation) return { ok: false, review: false, message: "Scan or select a destination location." };
  if (sourceLocation === destinationLocation) return { ok: false, review: false, message: "Source and destination cannot be the same." };
  const requiredReason = getRequiredReasonForTransferType(transferType);
  if (requiredReason && !String(reason || "").trim()) return { ok: false, review: false, message: requiredReason };
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) return { ok: false, review: false, message: "Quantity must be greater than zero." };
  const available = getAvailableStockForTransfer(item, sourceLocation);
  if (qty > available) return { ok: true, review: true, message: `Quantity exceeds local snapshot availability (${available}). Supervisor review required before Inventory applies movement.` };
  return { ok: true, review: false, message: "Transfer ready to queue. Official stock updates after inventory sync." };
}
