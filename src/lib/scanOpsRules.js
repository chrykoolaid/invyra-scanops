export const GAP_TYPES = {
  TRUE_OUT_OF_STOCK: "TRUE_OUT_OF_STOCK",
  BACKROOM_AVAILABLE: "BACKROOM_AVAILABLE",
  SHELF_LABEL_PLANOGRAM_ISSUE: "SHELF_LABEL_PLANOGRAM_ISSUE",
  SUPPLIER_PENDING: "SUPPLIER_PENDING",
};

export const RECOMMENDED_ACTIONS = {
  REPLENISH_FROM_BACKROOM: "REPLENISH_FROM_BACKROOM",
  REQUEST_REORDER: "REQUEST_REORDER",
  CONFIRM_SUPPLIER_PENDING: "CONFIRM_SUPPLIER_PENDING",
  FLAG_LABEL_ISSUE: "FLAG_LABEL_ISSUE",
  NO_ACTION: "NO_ACTION",
};

export function getReplenishmentRecommendation(item) {
  if (!item) {
    return { recommended_action: RECOMMENDED_ACTIONS.NO_ACTION, title: "Scan an item", helper: "Scan a shelf item or shelf label to check stock position." };
  }
  if ((item.shelf_stock ?? 0) <= item.minimum_shelf_qty && (item.backroom_stock ?? 0) > 0) {
    return { recommended_action: RECOMMENDED_ACTIONS.REPLENISH_FROM_BACKROOM, title: "Replenish from backroom", helper: "Shelf is low or empty and stock is available in the backroom." };
  }
  return { recommended_action: RECOMMENDED_ACTIONS.NO_ACTION, title: "No replenishment required", helper: "Current shelf position does not need a replenishment task." };
}

export function classifyGap(item) {
  if (!item) {
    return { gap_type: null, recommended_action: RECOMMENDED_ACTIONS.NO_ACTION, title: "Scan a shelf gap", helper: "Scan the shelf label, product barcode, or manually enter SKU." };
  }
  if (item.label_issue || item.planogram_status === "MISMATCH") {
    return { gap_type: GAP_TYPES.SHELF_LABEL_PLANOGRAM_ISSUE, recommended_action: RECOMMENDED_ACTIONS.FLAG_LABEL_ISSUE, title: "Shelf label / planogram issue", helper: "The shelf label is missing, mismatched, or not linked to a valid SKU." };
  }
  if ((item.shelf_stock ?? 0) === 0 && (item.backroom_stock ?? 0) > 0) {
    return { gap_type: GAP_TYPES.BACKROOM_AVAILABLE, recommended_action: RECOMMENDED_ACTIONS.REPLENISH_FROM_BACKROOM, title: "Backroom available", helper: "Do not request reorder yet. Replenish from backroom first." };
  }
  if ((item.shelf_stock ?? 0) === 0 && (item.backroom_stock ?? 0) === 0 && (item.pending_delivery_qty ?? 0) > 0) {
    return { gap_type: GAP_TYPES.SUPPLIER_PENDING, recommended_action: RECOMMENDED_ACTIONS.CONFIRM_SUPPLIER_PENDING, title: "Supplier pending", helper: "Incoming delivery exists, so reorder should not be the primary action." };
  }
  if ((item.shelf_stock ?? 0) === 0 && (item.backroom_stock ?? 0) === 0 && (item.pending_delivery_qty ?? 0) === 0) {
    return { gap_type: GAP_TYPES.TRUE_OUT_OF_STOCK, recommended_action: RECOMMENDED_ACTIONS.REQUEST_REORDER, title: "True out of stock", helper: "No shelf, backroom, or pending delivery stock is available." };
  }
  return { gap_type: null, recommended_action: RECOMMENDED_ACTIONS.NO_ACTION, title: "No gap action required", helper: "The scanned item does not currently look like a gap." };
}

export function formatActionLabel(action) {
  return String(action || "").toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
