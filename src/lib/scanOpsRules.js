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

export const MARKDOWN_REASONS = [
  { id: "near_expiry", label: "Near expiry", suggestedDiscount: 30, approvalRequired: false },
  { id: "damaged_packaging", label: "Damaged packaging", suggestedDiscount: 20, approvalRequired: false },
  { id: "clearance", label: "Clearance", suggestedDiscount: 25, approvalRequired: false },
  { id: "overstock", label: "Overstock", suggestedDiscount: 15, approvalRequired: false },
  { id: "seasonal_clearance", label: "Seasonal clearance", suggestedDiscount: 35, approvalRequired: false },
  { id: "discontinued", label: "Discontinued", suggestedDiscount: 40, approvalRequired: true },
  { id: "manager_special", label: "Manager special", suggestedDiscount: 50, approvalRequired: true },
];

export const WASTE_REASONS = [
  { id: "expired", label: "Expired", demandLogic: "reportable_excluded_from_reorder", approvalRisk: "normal" },
  { id: "spoiled", label: "Spoiled", demandLogic: "reportable_excluded_from_reorder", approvalRisk: "normal" },
  { id: "damaged", label: "Damaged", demandLogic: "special_handling", approvalRisk: "normal" },
  { id: "dropped_broken", label: "Dropped/broken", demandLogic: "special_handling", approvalRisk: "normal" },
  { id: "temperature_breach", label: "Temperature breach", demandLogic: "reportable_excluded_from_reorder", approvalRisk: "high" },
  { id: "theft_shrink", label: "Theft/shrink", demandLogic: "special_handling", approvalRisk: "high" },
  { id: "customer_return_unsellable", label: "Return unsellable", demandLogic: "reportable_excluded_from_reorder", approvalRisk: "normal" },
  { id: "production_use", label: "Production use", demandLogic: "special_handling", approvalRisk: "high" },
  { id: "sampling_promos", label: "Sampling/promos", demandLogic: "special_handling", approvalRisk: "high" },
];

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

export function getMarkdownRecommendation(item, reasonId) {
  const reason = MARKDOWN_REASONS.find((entry) => entry.id === reasonId) || MARKDOWN_REASONS[0];
  const currentPrice = Number(item?.current_price || 0);
  const discountPercent = reason.suggestedDiscount;
  const newPrice = Math.max(0, Math.round(currentPrice * (1 - discountPercent / 100)));
  return {
    reason,
    discountPercent,
    newPrice,
    approvalRequired: reason.approvalRequired || discountPercent > 40,
    labelRequired: true,
  };
}

export function getWasteDecision(item, reasonId, quantity) {
  const reason = WASTE_REASONS.find((entry) => entry.id === reasonId) || null;
  const qty = Math.max(1, Number(quantity || 1));
  const unitCost = Number(item?.unit_cost || 0);
  const estimatedValue = qty * unitCost;
  const approvalRequired = Boolean(reason?.approvalRisk === "high" || qty >= 5 || estimatedValue >= 500);
  return {
    reason,
    quantity: qty,
    estimatedValue,
    approvalRequired,
    demandLogic: reason?.demandLogic || "reportable",
  };
}

export function formatActionLabel(action) {
  return String(action || "").toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
