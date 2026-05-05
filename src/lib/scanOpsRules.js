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

export const EXPIRY_STATUSES = {
  EXPIRED: "expired",
  EXPIRES_TODAY: "expires_today",
  EXPIRES_TOMORROW: "expires_tomorrow",
  EXPIRES_2_TO_3_DAYS: "expires_2_to_3_days",
  EXPIRES_4_TO_7_DAYS: "expires_4_to_7_days",
  SAFE_NO_ACTION: "safe_no_action",
  NO_EXPIRY_CAPTURED: "no_expiry_captured",
};

export const FRESHNESS_CONDITIONS = [
  { id: "good", label: "Good", risk: "normal" },
  { id: "monitor", label: "Monitor", risk: "monitor" },
  { id: "near_expiry", label: "Near expiry", risk: "markdown" },
  { id: "damaged_packaging", label: "Damaged packaging", risk: "markdown" },
  { id: "poor_appearance", label: "Poor appearance", risk: "review" },
  { id: "temperature_concern", label: "Temp concern", risk: "review" },
  { id: "smell_concern", label: "Smell concern", risk: "waste" },
  { id: "leaking_spoiled", label: "Leaking / spoiled", risk: "waste" },
  { id: "customer_return_check", label: "Return check", risk: "review" },
  { id: "needs_supervisor_review", label: "Supervisor review", risk: "review" },
];

export function getExpiryStatus(expiryDate, currentDate = "2026-05-05") {
  if (!expiryDate) {
    return {
      status: EXPIRY_STATUSES.NO_EXPIRY_CAPTURED,
      label: "No expiry date captured",
      daysUntilExpiry: null,
      severity: "review",
    };
  }

  const today = new Date(`${currentDate}T00:00:00`);
  const expiry = new Date(`${expiryDate}T00:00:00`);
  if (Number.isNaN(expiry.getTime())) {
    return {
      status: EXPIRY_STATUSES.NO_EXPIRY_CAPTURED,
      label: "No expiry date captured",
      daysUntilExpiry: null,
      severity: "review",
    };
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntilExpiry = Math.round((expiry - today) / msPerDay);

  if (daysUntilExpiry < 0) return { status: EXPIRY_STATUSES.EXPIRED, label: "Expired", daysUntilExpiry, severity: "block" };
  if (daysUntilExpiry === 0) return { status: EXPIRY_STATUSES.EXPIRES_TODAY, label: "Expires today", daysUntilExpiry, severity: "urgent" };
  if (daysUntilExpiry === 1) return { status: EXPIRY_STATUSES.EXPIRES_TOMORROW, label: "Expires tomorrow", daysUntilExpiry, severity: "markdown" };
  if (daysUntilExpiry <= 3) return { status: EXPIRY_STATUSES.EXPIRES_2_TO_3_DAYS, label: "Expires in 2–3 days", daysUntilExpiry, severity: "monitor" };
  if (daysUntilExpiry <= 7) return { status: EXPIRY_STATUSES.EXPIRES_4_TO_7_DAYS, label: "Expires in 4–7 days", daysUntilExpiry, severity: "safe" };
  return { status: EXPIRY_STATUSES.SAFE_NO_ACTION, label: "Safe / no action", daysUntilExpiry, severity: "safe" };
}

function getCategoryGroup(item) {
  const value = `${item?.category || ""} ${item?.department || ""}`.toLowerCase();
  if (value.includes("meat")) return "strict";
  if (value.includes("seafood")) return "strict";
  if (value.includes("ready")) return "strict";
  if (value.includes("produce")) return "condition_led";
  if (value.includes("dairy")) return "markdown_ok";
  if (value.includes("bakery")) return "markdown_ok";
  if (value.includes("deli")) return "markdown_ok";
  if (value.includes("frozen")) return "date_led";
  return "date_led";
}

export function getFreshnessRecommendation(item, expiryStatus, conditionId) {
  const condition = FRESHNESS_CONDITIONS.find((entry) => entry.id === conditionId) || FRESHNESS_CONDITIONS[0];
  const categoryGroup = getCategoryGroup(item);
  const status = expiryStatus?.status || EXPIRY_STATUSES.NO_EXPIRY_CAPTURED;
  const strict = categoryGroup === "strict";

  if (status === EXPIRY_STATUSES.EXPIRED || condition.risk === "waste") {
    return {
      condition,
      result: "Waste required",
      recommendedAction: "Send to waste",
      actionId: "send_to_waste",
      eventType: "EXPIRY_WASTE_RECOMMENDED",
      approvalRequired: strict || condition.risk === "waste",
      helper: strict ? "High-risk fresh category. Remove from sale and route for review." : "Product should be removed from sale and wasted.",
      demandLogicTreatment: "reportable_excluded_from_reorder",
    };
  }

  if (status === EXPIRY_STATUSES.NO_EXPIRY_CAPTURED || condition.risk === "review") {
    return {
      condition,
      result: "Supervisor review required",
      recommendedAction: "Flag for supervisor",
      actionId: "flag_for_supervisor",
      eventType: "FRESHNESS_REVIEW_REQUIRED",
      approvalRequired: true,
      helper: "Missing date, condition concern, or borderline freshness needs supervisor review.",
      demandLogicTreatment: "special_handling",
    };
  }

  if (status === EXPIRY_STATUSES.EXPIRES_TODAY) {
    return {
      condition,
      result: strict ? "Supervisor review required" : "Sellable with markdown",
      recommendedAction: strict ? "Flag for supervisor" : "Apply markdown",
      actionId: strict ? "flag_for_supervisor" : "apply_markdown",
      eventType: strict ? "FRESHNESS_REVIEW_REQUIRED" : "EXPIRY_MARKDOWN_RECOMMENDED",
      approvalRequired: strict,
      helper: strict ? "Same-day expiry in a strict fresh category needs review." : "Still sellable if condition is acceptable; markdown is recommended.",
      demandLogicTreatment: "reportable",
    };
  }

  if (status === EXPIRY_STATUSES.EXPIRES_TOMORROW || condition.risk === "markdown") {
    return {
      condition,
      result: "Sellable with markdown",
      recommendedAction: "Apply markdown",
      actionId: "apply_markdown",
      eventType: "EXPIRY_MARKDOWN_RECOMMENDED",
      approvalRequired: false,
      helper: "Near-expiry product should be marked down if still sellable.",
      demandLogicTreatment: "reportable",
    };
  }

  if (status === EXPIRY_STATUSES.EXPIRES_2_TO_3_DAYS || condition.risk === "monitor") {
    return {
      condition,
      result: "Monitor next check",
      recommendedAction: "Monitor",
      actionId: "monitor_next_check",
      eventType: "FRESHNESS_CHECK_RECORDED",
      approvalRequired: false,
      helper: "No removal yet. Recheck during the next freshness sweep.",
      demandLogicTreatment: "reportable",
    };
  }

  return {
    condition,
    result: "Sellable",
    recommendedAction: "No action",
    actionId: "no_action",
    eventType: "FRESHNESS_CHECK_RECORDED",
    approvalRequired: false,
    helper: categoryGroup === "condition_led" ? "Condition is acceptable for sale." : "Date and freshness condition are acceptable.",
    demandLogicTreatment: "reportable",
  };
}

export function requiresFreshnessReview(item, expiryStatus, conditionId) {
  return getFreshnessRecommendation(item, expiryStatus, conditionId).approvalRequired;
}
