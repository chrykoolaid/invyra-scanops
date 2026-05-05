import {
  classifyGap,
  getFreshnessRecommendation,
  getMarkdownRecommendation,
  getReplenishmentRecommendation,
  getWasteDecision,
  EXPIRY_STATUSES,
} from "./scanOpsRules";
import { TASK_PRIORITIES, TASK_TYPES } from "./scanOpsTasks";

export const DECISION_RECOMMENDATION_TYPES = {
  REPLENISHMENT_RECOMMENDATION: "REPLENISHMENT_RECOMMENDATION",
  GAP_SCAN_RECOMMENDATION: "GAP_SCAN_RECOMMENDATION",
  MARKDOWN_RECOMMENDATION: "MARKDOWN_RECOMMENDATION",
  WASTE_RECOMMENDATION: "WASTE_RECOMMENDATION",
  EXPIRY_RECOMMENDATION: "EXPIRY_RECOMMENDATION",
  FRESHNESS_RECOMMENDATION: "FRESHNESS_RECOMMENDATION",
  TASK_PRIORITY_RECOMMENDATION: "TASK_PRIORITY_RECOMMENDATION",
  SUPERVISOR_REVIEW_RECOMMENDATION: "SUPERVISOR_REVIEW_RECOMMENDATION",
  SHELF_TICKET_RECOMMENDATION: "SHELF_TICKET_RECOMMENDATION",
  TRANSFER_RECOMMENDATION: "TRANSFER_RECOMMENDATION",
};

export const DECISION_CONFIDENCE = { HIGH: "High", MEDIUM: "Medium", LOW: "Low" };
export const DECISION_RISK_LEVELS = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", REVIEW: "Review" };
export const DECISION_WORKFLOWS = {
  GAP_SCAN: "gap_scan",
  REPLENISHMENT: "replenishment",
  MARKDOWN: "markdown",
  WASTE: "waste",
  EXPIRY_FRESHNESS: "expiry_freshness",
  TASK_PRIORITY: "task_priority",
  SUPERVISOR_REVIEW: "supervisor_review",
  SHELF_TICKETS: "shelf_tickets",
  TRANSFER: "transfer",
};

function value(item, camel, snake, fallback = 0) { return item?.[camel] ?? item?.[snake] ?? fallback; }
function text(valueToFormat, fallback = "—") { return valueToFormat === null || valueToFormat === undefined || valueToFormat === "" ? fallback : valueToFormat; }
function stockNumber(item, camel, snake) { const number = Number(value(item, camel, snake, 0)); return Number.isFinite(number) ? number : 0; }
function normalizeWorkflow(workflow) { return String(workflow || "").trim().toLowerCase(); }
function simpleHash(input) { let hash = 0; const value = String(input || "decision"); for (let i = 0; i < value.length; i += 1) { hash = ((hash << 5) - hash) + value.charCodeAt(i); hash |= 0; } return Math.abs(hash).toString(36); }

function makeDecision(workflow, item, details) {
  const recommendationType = details.recommendationType || DECISION_RECOMMENDATION_TYPES.SUPERVISOR_REVIEW_RECOMMENDATION;
  const source = [workflow, recommendationType, item?.internalItemId || item?.id || item?.sku || item?.barcode || item?.plu || "no_item", details.recommendedAction || "review", details.contextKey || "default"].join("|");
  return {
    decisionId: `dec_${simpleHash(source)}`,
    sourceWorkflow: workflow,
    recommendationType,
    recommendedAction: details.recommendedAction || "Review item",
    confidence: details.confidence || DECISION_CONFIDENCE.MEDIUM,
    reasonText: details.reasonText || "Scanner information is incomplete. Review before taking action.",
    riskLevel: details.riskLevel || DECISION_RISK_LEVELS.MEDIUM,
    requiredRole: details.requiredRole || "Staff",
    linkedWorkflow: details.linkedWorkflow || null,
    eventToCreate: details.eventToCreate || null,
    taskToCreate: details.taskToCreate || null,
    taskPriority: details.taskPriority || TASK_PRIORITIES.NORMAL,
    nextStepText: details.nextStepText || "Operator must confirm before any action is recorded.",
    supervisorReviewRequired: Boolean(details.supervisorReviewRequired || details.requiredRole === "Supervisor"),
    noStockMutation: true,
    itemIdentity: buildDecisionItemIdentity(item),
    rawRule: details.rawRule || null,
  };
}

export function buildDecisionItemIdentity(item) {
  if (!item) return {};
  return {
    internal_item_id: item.internalItemId || item.internal_item_id || item.id || null,
    sku: item.sku || null,
    barcode: item.barcode || null,
    gtin: item.gtin || null,
    plu: item.plu || null,
    scale_code: item.scaleCode || item.scale_code || null,
    batch_id: item.batchId || item.batch_id || null,
    lot_id: item.lotId || item.lot_id || null,
    sell_type: item.sellType || item.sell_type || null,
    item_name: item.name || item.itemName || item.item_name || null,
    department: item.department || null,
    category: item.category || null,
    location: item.shelfLocation || item.location || null,
  };
}

export function getGapScanDecision(item) {
  const rule = classifyGap(item);
  const shelf = stockNumber(item, "shelfStock", "shelf_stock");
  const backroom = stockNumber(item, "backroomStock", "backroom_stock");
  const pending = stockNumber(item, "pendingDeliveryQty", "pending_delivery_qty");
  const minimum = stockNumber(item, "minimumStock", "minimum_shelf_qty");
  if (!item) return makeDecision(DECISION_WORKFLOWS.GAP_SCAN, item, { recommendationType: DECISION_RECOMMENDATION_TYPES.GAP_SCAN_RECOMMENDATION, recommendedAction: "Scan item or shelf label", confidence: DECISION_CONFIDENCE.LOW, reasonText: "No product identity has been resolved yet.", riskLevel: DECISION_RISK_LEVELS.LOW, linkedWorkflow: "/gap-scan", eventToCreate: "GAP_CONFIRMED", rawRule: rule });
  if (rule.gap_type === "BACKROOM_AVAILABLE") return makeDecision(DECISION_WORKFLOWS.GAP_SCAN, item, { recommendationType: DECISION_RECOMMENDATION_TYPES.GAP_SCAN_RECOMMENDATION, recommendedAction: "Create replenishment task", confidence: DECISION_CONFIDENCE.HIGH, reasonText: `Shelf stock is ${shelf}, minimum is ${minimum}, and backroom has ${backroom} available. Replenish before requesting reorder.`, riskLevel: DECISION_RISK_LEVELS.LOW, requiredRole: "Staff", linkedWorkflow: "/replenish", eventToCreate: "REPLENISHMENT_CREATED", taskToCreate: TASK_TYPES.REPLENISHMENT_TASK, taskPriority: TASK_PRIORITIES.HIGH, nextStepText: "Confirm to create a replenishment task and queue the event for Inventory Sync.", rawRule: rule });
  if (rule.gap_type === "TRUE_OUT_OF_STOCK") return makeDecision(DECISION_WORKFLOWS.GAP_SCAN, item, { recommendationType: DECISION_RECOMMENDATION_TYPES.GAP_SCAN_RECOMMENDATION, recommendedAction: "Request reorder review", confidence: DECISION_CONFIDENCE.HIGH, reasonText: "Shelf, backroom, and pending delivery are all zero. This is a true out-of-stock exception.", riskLevel: DECISION_RISK_LEVELS.MEDIUM, requiredRole: "Staff", linkedWorkflow: "/gap-scan", eventToCreate: "REORDER_REQUESTED", taskToCreate: TASK_TYPES.GAP_SCAN_TASK, taskPriority: TASK_PRIORITIES.HIGH, nextStepText: "Confirm out-of-stock first, then request reorder review through sync.", rawRule: rule });
  if (rule.gap_type === "SUPPLIER_PENDING") return makeDecision(DECISION_WORKFLOWS.GAP_SCAN, item, { recommendationType: DECISION_RECOMMENDATION_TYPES.GAP_SCAN_RECOMMENDATION, recommendedAction: "Confirm supplier pending", confidence: DECISION_CONFIDENCE.HIGH, reasonText: `Shelf and backroom are zero, but ${pending} units are already pending from supplier. Avoid duplicate reorder.`, riskLevel: DECISION_RISK_LEVELS.LOW, requiredRole: "Staff", linkedWorkflow: "/gap-scan", eventToCreate: "SUPPLIER_PENDING_CONFIRMED", taskToCreate: TASK_TYPES.GAP_SCAN_TASK, taskPriority: TASK_PRIORITIES.NORMAL, nextStepText: "Confirm the pending delivery state and queue the decision event.", rawRule: rule });
  if (rule.gap_type === "SHELF_LABEL_PLANOGRAM_ISSUE") return makeDecision(DECISION_WORKFLOWS.GAP_SCAN, item, { recommendationType: DECISION_RECOMMENDATION_TYPES.GAP_SCAN_RECOMMENDATION, recommendedAction: "Flag label or planogram issue", confidence: DECISION_CONFIDENCE.HIGH, reasonText: "The shelf label or planogram does not resolve cleanly to the scanned item. Treat as layout/data issue, not stock shortage.", riskLevel: DECISION_RISK_LEVELS.MEDIUM, requiredRole: "Staff", linkedWorkflow: "/gap-scan", eventToCreate: "SHELF_LABEL_ISSUE_FLAGGED", taskToCreate: TASK_TYPES.GAP_SCAN_TASK, taskPriority: TASK_PRIORITIES.NORMAL, nextStepText: "Flag the issue so labels/planogram can be handled later.", rawRule: rule });
  return makeDecision(DECISION_WORKFLOWS.GAP_SCAN, item, { recommendationType: DECISION_RECOMMENDATION_TYPES.GAP_SCAN_RECOMMENDATION, recommendedAction: "No gap action required", confidence: DECISION_CONFIDENCE.MEDIUM, reasonText: "The scan does not currently show a replenishment, reorder, supplier, or label issue.", riskLevel: DECISION_RISK_LEVELS.LOW, linkedWorkflow: "/gap-scan", eventToCreate: "GAP_CONFIRMED", rawRule: rule });
}

export function getReplenishmentDecision(item) {
  const rule = getReplenishmentRecommendation(item);
  const shelf = stockNumber(item, "shelfStock", "shelf_stock");
  const backroom = stockNumber(item, "backroomStock", "backroom_stock");
  const minimum = stockNumber(item, "minimumStock", "minimum_shelf_qty");
  const shouldMove = rule.recommended_action === "REPLENISH_FROM_BACKROOM";
  return makeDecision(DECISION_WORKFLOWS.REPLENISHMENT, item, { recommendationType: DECISION_RECOMMENDATION_TYPES.REPLENISHMENT_RECOMMENDATION, recommendedAction: shouldMove ? "Create replenishment" : "No replenishment required", confidence: shouldMove ? DECISION_CONFIDENCE.HIGH : DECISION_CONFIDENCE.MEDIUM, reasonText: shouldMove ? `Shelf stock is ${shelf}, minimum is ${minimum}, and backroom has ${backroom}. Move stock only after operator confirmation.` : "Shelf position does not require backroom movement from the current snapshot.", riskLevel: DECISION_RISK_LEVELS.LOW, requiredRole: "Staff", linkedWorkflow: "/replenish", eventToCreate: shouldMove ? "REPLENISHMENT_CREATED" : "REPLENISHMENT_CANCELLED", taskToCreate: shouldMove ? TASK_TYPES.REPLENISHMENT_TASK : null, taskPriority: shouldMove ? TASK_PRIORITIES.NORMAL : TASK_PRIORITIES.LOW, nextStepText: shouldMove ? "Confirm quantity before event is written to the sync queue." : "Confirm no-action only if the shelf has already been filled.", rawRule: rule });
}

export function getMarkdownDecision(item, reasonId) {
  const rule = getMarkdownRecommendation(item, reasonId);
  const price = Number(value(item, "currentPrice", "current_price", 0));
  return makeDecision(DECISION_WORKFLOWS.MARKDOWN, item, { recommendationType: DECISION_RECOMMENDATION_TYPES.MARKDOWN_RECOMMENDATION, recommendedAction: rule.approvalRequired ? "Send markdown for review" : "Apply markdown", confidence: rule.reason?.id === "near_expiry" ? DECISION_CONFIDENCE.HIGH : DECISION_CONFIDENCE.MEDIUM, reasonText: `${rule.reason.label} selected. Current price ${text(item?.currency || "₱")}${price}; suggested ${rule.discountPercent}% off to ${text(item?.currency || "₱")}${rule.newPrice}.`, riskLevel: rule.approvalRequired ? DECISION_RISK_LEVELS.REVIEW : DECISION_RISK_LEVELS.MEDIUM, requiredRole: rule.approvalRequired ? "Supervisor" : "Staff", linkedWorkflow: "/markdowns", eventToCreate: "MARKDOWN_APPLIED", taskToCreate: TASK_TYPES.MARKDOWN_TASK, taskPriority: rule.approvalRequired ? TASK_PRIORITIES.HIGH : TASK_PRIORITIES.NORMAL, supervisorReviewRequired: rule.approvalRequired, nextStepText: "Operator must confirm before markdown or label events are queued.", contextKey: reasonId, rawRule: rule });
}

export function getWasteRecommendationDecision(item, reasonId, quantity) {
  const rule = getWasteDecision(item, reasonId, quantity);
  const reasonLabel = rule.reason?.label || "Waste reason required";
  return makeDecision(DECISION_WORKFLOWS.WASTE, item, { recommendationType: DECISION_RECOMMENDATION_TYPES.WASTE_RECOMMENDATION, recommendedAction: rule.approvalRequired ? "Request supervisor review" : "Record waste", confidence: rule.reason ? DECISION_CONFIDENCE.HIGH : DECISION_CONFIDENCE.LOW, reasonText: `${reasonLabel}; quantity ${rule.quantity}; estimated value ${text(item?.currency || "₱")}${rule.estimatedValue}. Demand treatment: ${String(rule.demandLogic).replaceAll("_", " ")}.`, riskLevel: rule.approvalRequired ? DECISION_RISK_LEVELS.REVIEW : DECISION_RISK_LEVELS.MEDIUM, requiredRole: rule.approvalRequired ? "Supervisor" : "Staff", linkedWorkflow: "/waste", eventToCreate: rule.approvalRequired ? "WASTE_APPROVAL_REQUIRED" : "WASTE_RECORDED", taskToCreate: rule.approvalRequired ? TASK_TYPES.WASTE_REVIEW_TASK : null, taskPriority: rule.approvalRequired ? TASK_PRIORITIES.HIGH : TASK_PRIORITIES.NORMAL, supervisorReviewRequired: rule.approvalRequired, nextStepText: "Waste is only queued after the operator confirms the recommendation.", contextKey: `${reasonId}-${quantity}`, rawRule: rule });
}

export function getExpiryFreshnessDecision(item, expiryStatus, freshnessId) {
  const rule = getFreshnessRecommendation(item, expiryStatus, freshnessId);
  const status = expiryStatus?.status || EXPIRY_STATUSES.NO_EXPIRY_CAPTURED;
  const isWaste = rule.actionId === "send_to_waste";
  const isMarkdown = rule.actionId === "apply_markdown";
  const isReview = rule.actionId === "flag_for_supervisor" || rule.approvalRequired;
  const isSafe = rule.actionId === "no_action" || rule.actionId === "monitor_next_check";
  let taskToCreate = TASK_TYPES.EXPIRY_CHECK_TASK;
  if (isMarkdown) taskToCreate = TASK_TYPES.MARKDOWN_TASK;
  if (isWaste) taskToCreate = TASK_TYPES.WASTE_REVIEW_TASK;
  if (isReview) taskToCreate = TASK_TYPES.FRESHNESS_REVIEW_TASK;
  return makeDecision(DECISION_WORKFLOWS.EXPIRY_FRESHNESS, item, { recommendationType: rule.actionId === "apply_markdown" ? DECISION_RECOMMENDATION_TYPES.EXPIRY_RECOMMENDATION : DECISION_RECOMMENDATION_TYPES.FRESHNESS_RECOMMENDATION, recommendedAction: rule.recommendedAction, confidence: [EXPIRY_STATUSES.EXPIRED, EXPIRY_STATUSES.EXPIRES_TODAY, EXPIRY_STATUSES.EXPIRES_TOMORROW].includes(status) ? DECISION_CONFIDENCE.HIGH : DECISION_CONFIDENCE.MEDIUM, reasonText: `${expiryStatus?.label || "No expiry status"}; freshness condition ${rule.condition.label}. ${rule.helper}`, riskLevel: isReview || isWaste ? DECISION_RISK_LEVELS.REVIEW : isMarkdown ? DECISION_RISK_LEVELS.MEDIUM : DECISION_RISK_LEVELS.LOW, requiredRole: isReview || isWaste ? "Supervisor" : "Staff", linkedWorkflow: isMarkdown ? "/markdowns" : isWaste ? "/waste" : "/expiry-check", eventToCreate: rule.eventType, taskToCreate: isSafe ? null : taskToCreate, taskPriority: isWaste || isReview ? TASK_PRIORITIES.URGENT : isMarkdown ? TASK_PRIORITIES.HIGH : TASK_PRIORITIES.NORMAL, supervisorReviewRequired: isReview || isWaste, nextStepText: "Confirm the recommendation or reject it with the current scanner context.", contextKey: `${status}-${freshnessId}`, rawRule: rule });
}

export function getTaskPriorityDecision(task) {
  if (!task) return makeDecision(DECISION_WORKFLOWS.TASK_PRIORITY, null, { recommendationType: DECISION_RECOMMENDATION_TYPES.TASK_PRIORITY_RECOMMENDATION, recommendedAction: "Select task", confidence: DECISION_CONFIDENCE.LOW, reasonText: "No task is selected.", linkedWorkflow: "/tasks" });
  const review = Boolean(task.requiresSupervisor || task.status === "Needs Supervisor");
  const urgent = task.priority === TASK_PRIORITIES.URGENT;
  const high = task.priority === TASK_PRIORITIES.HIGH;
  return makeDecision(DECISION_WORKFLOWS.TASK_PRIORITY, task, { recommendationType: review ? DECISION_RECOMMENDATION_TYPES.SUPERVISOR_REVIEW_RECOMMENDATION : DECISION_RECOMMENDATION_TYPES.TASK_PRIORITY_RECOMMENDATION, recommendedAction: review ? "Route for supervisor review" : urgent || high ? "Work task next" : "Work when queue allows", confidence: urgent || review ? DECISION_CONFIDENCE.HIGH : DECISION_CONFIDENCE.MEDIUM, reasonText: `${task.priority} priority ${task.type?.replaceAll("_", " ") || "task"}; status ${task.status}; reason: ${task.reason}.`, riskLevel: review ? DECISION_RISK_LEVELS.REVIEW : urgent ? DECISION_RISK_LEVELS.HIGH : high ? DECISION_RISK_LEVELS.MEDIUM : DECISION_RISK_LEVELS.LOW, requiredRole: review ? "Supervisor" : "Staff", linkedWorkflow: task.linkedWorkflow || "/tasks", eventToCreate: "TASK_STARTED", taskPriority: task.priority, supervisorReviewRequired: review, nextStepText: review ? "Staff can start or block, but completion needs supervisor review." : "Open the linked workflow or start the task from this screen.", contextKey: `${task.id}-${task.status}-${task.priority}`, rawRule: task });
}


export function getShelfTicketDecision(item, context = {}) {
  if (!item) return makeDecision(DECISION_WORKFLOWS.SHELF_TICKETS, item, {
    recommendationType: DECISION_RECOMMENDATION_TYPES.SHELF_TICKET_RECOMMENDATION,
    recommendedAction: "Scan item for shelf ticket",
    confidence: DECISION_CONFIDENCE.LOW,
    reasonText: "No product identity has been resolved yet. Scan a barcode, PLU, GTIN, or SKU before adding a shelf ticket line.",
    riskLevel: DECISION_RISK_LEVELS.LOW,
    requiredRole: "Staff",
    linkedWorkflow: "/shelf-tickets",
    eventToCreate: "SHELF_TICKET_ITEM_SCANNED",
    nextStepText: "Select ticket size and scan an item into the desktop ticket batch.",
  });
  const location = item.shelfLocation || item.location || item.shelf || "shelf location pending";
  const ticketType = context.ticketType || "STANDARD_SHELF_TICKET";
  const ticketReason = context.ticketReason || "MISSING_OR_DAMAGED";
  return makeDecision(DECISION_WORKFLOWS.SHELF_TICKETS, item, {
    recommendationType: DECISION_RECOMMENDATION_TYPES.SHELF_TICKET_RECOMMENDATION,
    recommendedAction: "Add to shelf ticket batch",
    confidence: item.sku || item.gtin || item.barcode || item.plu ? DECISION_CONFIDENCE.HIGH : DECISION_CONFIDENCE.MEDIUM,
    reasonText: `Resolved ${item.name || "item"} for ${location}. Ticket type ${String(ticketType).replaceAll("_", " ").toLowerCase()}; reason ${String(ticketReason).replaceAll("_", " ").toLowerCase()}. Batch syncs to desktop; ScanOps does not claim printing.`,
    riskLevel: DECISION_RISK_LEVELS.LOW,
    requiredRole: "Staff",
    linkedWorkflow: "/shelf-tickets",
    eventToCreate: "SHELF_TICKET_ITEM_ADDED",
    taskToCreate: null,
    taskPriority: TASK_PRIORITIES.LOW,
    nextStepText: "Add the item to the current shelf-ticket batch, then send the batch to the desktop queue.",
    contextKey: `${ticketType}-${ticketReason}`,
  });
}

export function getTransferDecision(item, context = {}) {
  const quantity = Number(context.quantity || 0);
  const source = context.sourceLocation || "source pending";
  const destination = context.destinationLocation || "destination pending";
  const transferType = context.transferType || "BACKROOM_TO_SHELF";
  const available = source.includes("BACKROOM") ? stockNumber(item, "backroomStock", "backroom_stock") : source.includes("AISLE") || source.includes("SHELF") ? stockNumber(item, "shelfStock", "shelf_stock") : stockNumber(item, "stockOnHand", "stock_on_hand");
  const review = Boolean(context.validation?.review || (quantity > 0 && available >= 0 && quantity > available));
  if (!item) return makeDecision(DECISION_WORKFLOWS.TRANSFER, item, {
    recommendationType: DECISION_RECOMMENDATION_TYPES.TRANSFER_RECOMMENDATION,
    recommendedAction: "Scan item for transfer",
    confidence: DECISION_CONFIDENCE.LOW,
    reasonText: "Source and destination can be selected, but the item identity is not resolved yet.",
    riskLevel: DECISION_RISK_LEVELS.LOW,
    requiredRole: "Staff",
    linkedWorkflow: "/transfers",
    eventToCreate: "TRANSFER_ITEM_SCANNED",
    nextStepText: "Scan the item, enter quantity, then confirm only after reviewing the transfer.",
  });
  return makeDecision(DECISION_WORKFLOWS.TRANSFER, item, {
    recommendationType: DECISION_RECOMMENDATION_TYPES.TRANSFER_RECOMMENDATION,
    recommendedAction: review ? "Queue transfer for supervisor review" : "Queue transfer request",
    confidence: review ? DECISION_CONFIDENCE.MEDIUM : DECISION_CONFIDENCE.HIGH,
    reasonText: review ? `Requested quantity ${quantity} exceeds local snapshot availability ${available}. Queue the transfer for supervisor review; do not mutate stock on the scanner.` : `${String(transferType).replaceAll("_", " ").toLowerCase()} from ${source} to ${destination}. Quantity ${quantity}; available snapshot ${available}. Official movement happens after Inventory Sync.`,
    riskLevel: review ? DECISION_RISK_LEVELS.REVIEW : DECISION_RISK_LEVELS.LOW,
    requiredRole: review ? "Supervisor" : "Staff",
    linkedWorkflow: "/transfers",
    eventToCreate: review ? "TRANSFER_SUPERVISOR_REVIEW_REQUIRED" : "TRANSFER_COMPLETED",
    taskToCreate: review ? TASK_TYPES.STOCK_COUNT_RECHECK_TASK : null,
    taskPriority: review ? TASK_PRIORITIES.HIGH : TASK_PRIORITIES.NORMAL,
    supervisorReviewRequired: review,
    nextStepText: "Confirm to queue the transfer event. ScanOps does not directly adjust official stock.",
    contextKey: `${transferType}-${source}-${destination}-${quantity}`,
  });
}

export function getDecisionForWorkflow({ workflow, item, context = {} }) {
  const normalizedWorkflow = normalizeWorkflow(workflow);
  switch (normalizedWorkflow) {
    case DECISION_WORKFLOWS.GAP_SCAN: return getGapScanDecision(item);
    case DECISION_WORKFLOWS.REPLENISHMENT: return getReplenishmentDecision(item);
    case DECISION_WORKFLOWS.MARKDOWN: return getMarkdownDecision(item, context.reasonId);
    case DECISION_WORKFLOWS.WASTE: return getWasteRecommendationDecision(item, context.reasonId, context.quantity);
    case DECISION_WORKFLOWS.EXPIRY_FRESHNESS: return getExpiryFreshnessDecision(item, context.expiryStatus, context.freshnessId);
    case DECISION_WORKFLOWS.TASK_PRIORITY: return getTaskPriorityDecision(item || context.task);
    case DECISION_WORKFLOWS.SHELF_TICKETS: return getShelfTicketDecision(item, context);
    case DECISION_WORKFLOWS.TRANSFER: return getTransferDecision(item, context);
    default: return makeDecision(normalizedWorkflow || "scanops", item, { recommendationType: DECISION_RECOMMENDATION_TYPES.SUPERVISOR_REVIEW_RECOMMENDATION, recommendedAction: "Review scanner context", confidence: DECISION_CONFIDENCE.LOW, reasonText: "No deterministic workflow rule is mapped for this scanner context.", riskLevel: DECISION_RISK_LEVELS.REVIEW, requiredRole: "Supervisor" });
  }
}
