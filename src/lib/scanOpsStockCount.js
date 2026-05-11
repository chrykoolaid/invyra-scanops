import { getScanOpsSession } from "./scanOpsSession";

export const STOCK_COUNT_TYPES = {
  QUICK_COUNT: "QUICK_COUNT",
  CYCLE_COUNT: "CYCLE_COUNT",
  GAP_VARIANCE_COUNT: "GAP_VARIANCE_COUNT",
  DEPARTMENT_COUNT: "DEPARTMENT_COUNT",
  FULL_STOCKTAKE: "FULL_STOCKTAKE",
};

export const STOCK_COUNT_STATUSES = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
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
    helper: "Count one item or a small shelf area.",
    caption: "Best for spot checks and small mismatches.",
    actionLabel: "Start Quick Count",
    enabled: true,
  },
  {
    id: STOCK_COUNT_TYPES.CYCLE_COUNT,
    title: "Cycle Count",
    helper: "Work through scheduled partial counts.",
    caption: "Assigned SKU/category counts, high-shrink items, or routine checks.",
    actionLabel: "Open Assigned Cycle Counts",
    enabled: false,
  },
  {
    id: STOCK_COUNT_TYPES.GAP_VARIANCE_COUNT,
    title: "Gap / Variance Count",
    helper: "Confirm shelf gaps or stock mismatches.",
    caption: "Feeds Gap Scan, replenishment confidence, and variance review.",
    actionLabel: "Open Gap Count",
    enabled: false,
  },
  {
    id: STOCK_COUNT_TYPES.DEPARTMENT_COUNT,
    title: "Department Count",
    helper: "Count a selected department or area.",
    caption: "Use for Grocery, Dairy, Produce, freezer, backroom, or promo ends.",
    actionLabel: "Choose Department",
    enabled: false,
  },
  {
    id: STOCK_COUNT_TYPES.FULL_STOCKTAKE,
    title: "Full Stocktake",
    helper: "Formal scheduled inventory event.",
    caption: "Requires active event, assigned zone, audit trail, and manager variance approval.",
    actionLabel: "View Active Stocktake Events",
    enabled: false,
    governed: true,
  },
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
    sync_status: varianceQuantity === 0 ? "Ready to sync" : "Variance Review",
  };
}

export function getSessionVarianceSummary(lines = []) {
  const varianceLines = lines.filter((line) => Number(line.variance_quantity || 0) !== 0);
  const totalVariance = varianceLines.reduce((total, line) => total + Number(line.variance_quantity || 0), 0);
  return {
    countedItems: lines.length,
    varianceItems: varianceLines.length,
    totalVariance: Number(totalVariance.toFixed(3)),
    requiresReview: varianceLines.length > 0,
  };
}
