import { getScanOpsSession } from "./scanOpsSession";

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
  REVIEW: "Review",
  SUBMITTED: "Submitted",
  SYNC_PENDING: "Sync Pending",
  SYNCED: "Synced",
  VARIANCE_REVIEW: "Variance Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  ADJUSTED: "Adjusted",
  CANCELLED: "Cancelled",
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

export function getStockCountTypeMeta(countType) {
  return STOCK_COUNT_TYPE_OPTIONS.find((type) => type.id === countType) || STOCK_COUNT_TYPE_OPTIONS[0];
}

export function calculateVariance(expectedQuantity, countedQuantity) {
  const expected = Number(expectedQuantity ?? 0);
  const counted = Number(countedQuantity ?? 0);
  if (Number.isNaN(expected) || Number.isNaN(counted)) return null;
  return Number((counted - expected).toFixed(3));
}

export function makeStockCountId(prefix = "cnt") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createCountSession(countType, patch = {}) {
  const session = getScanOpsSession();
  const now = new Date().toISOString();
  return {
    count_session_id: makeStockCountId("count_session"),
    count_type: countType,
    count_type_label: patch.count_type_label || getStockCountTypeMeta(countType).title,
    count_area: patch.count_area || "dairy_chilled",
    count_area_label: patch.count_area_label || "Dairy / chilled",
    count_mode: patch.count_mode || "unguided_scan_count",
    count_mode_label: patch.count_mode_label || "Unguided scan count",
    store_location_id: session.storeId,
    department_id: session.departmentId,
    zone_id: patch.zone_id || null,
    created_by_user_id: session.actorUserId,
    created_by_name: session.actorName,
    created_by_role: session.actorRole,
    assigned_to_user_id: session.actorUserId,
    status: STOCK_COUNT_STATUSES.IN_PROGRESS,
    started_at: now,
    submitted_at: null,
    synced_at: null,
    approval_status: "Not submitted",
    source: "ScanOps handheld",
    sync_status: "Saved on device",
    applies_stock_directly: false,
    count_lines: [],
    ...patch,
  };
}

export function createCountLine({ session, product, countedQuantity, reason = null, note = "" }) {
  const expectedQuantity = product?.stockOnHand ?? product?.stock_on_hand ?? 0;
  const varianceQuantity = calculateVariance(expectedQuantity, countedQuantity);
  const now = new Date().toISOString();
  return {
    count_line_id: makeStockCountId("count_line"),
    count_session_id: session?.count_session_id,
    count_type: session?.count_type,
    count_area: session?.count_area,
    count_mode: session?.count_mode,
    product_id: product?.internalItemId || product?.id,
    barcode: product?.barcode || product?.gtin || null,
    plu: product?.plu || product?.scaleCode || null,
    sku: product?.sku || null,
    item_name: product?.name || "Unknown item",
    unit_type: product?.unitType || product?.unit_type || "each",
    unitType: product?.unitType || product?.unit_type || "each",
    expected_quantity: expectedQuantity,
    counted_quantity: Number(countedQuantity),
    variance_quantity: varianceQuantity,
    location_id: product?.shelfLocation || product?.location || null,
    reason_code: reason,
    note,
    counted_by_user_id: session?.created_by_user_id,
    counted_at: now,
    applies_stock_directly: false,
    review_status: varianceQuantity === 0 ? "matched" : "variance_review_required",
    sync_status: varianceQuantity === 0 ? "Ready to sync" : "Variance Review",
  };
}

export function getSessionVarianceSummary(lines = []) {
  const varianceLines = lines.filter((line) => Number(line.variance ?? line.variance_quantity ?? 0) !== 0);
  const totalVariance = varianceLines.reduce((total, line) => total + Number(line.variance ?? line.variance_quantity ?? 0), 0);
  return {
    countedItems: lines.length,
    varianceItems: varianceLines.length,
    totalVariance: Number(totalVariance.toFixed(3)),
    requiresReview: varianceLines.length > 0,
  };
}
