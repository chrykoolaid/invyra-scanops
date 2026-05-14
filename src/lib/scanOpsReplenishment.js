import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "./scanOpsEvents";
import { COLLABORATION_STATES, COLLABORATION_VERSION, TASK_TYPES, registerCollaborationTaskForRecord } from "./scanOpsCollaboration";
import { buildEventIdentity, getScanOpsSession } from "./scanOpsSession";

const STORAGE_KEY = "invyra_scanops_replenishment_tasks_v1";
const MAX_RECORDS = 80;

export const REPLENISHMENT_OUTCOMES = {
  TASK_CREATED: "task_created",
  SHELF_FILLED: "shelf_filled",
  SHORT_FILL: "short_fill",
  NO_BACKROOM_STOCK: "no_backroom_stock",
  DAMAGED_STOCK: "damaged_stock",
  WRONG_LOCATION: "wrong_location",
  MANAGER_REVIEW: "manager_review",
};

export const REPLENISHMENT_STATUS = {
  OPEN: "Open",
  COMPLETED: "Pending Sync",
  EXCEPTION: "Exception",
  REVIEW_REQUIRED: "Review Required",
};

export const REPLENISHMENT_ACTIONS = [
  {
    id: REPLENISHMENT_OUTCOMES.TASK_CREATED,
    label: "Create Task",
    shortLabel: "Task",
    helper: "Queue a replenishment task without marking shelf work complete.",
    status: REPLENISHMENT_STATUS.OPEN,
    eventType: SCANOPS_EVENT_TYPES.REPLENISHMENT_TASK_CREATED,
  },
  {
    id: REPLENISHMENT_OUTCOMES.SHELF_FILLED,
    label: "Shelf Fill Evidence",
    shortLabel: "Evidence",
    helper: "Record local shelf-fill evidence; stock numbers wait for backend sync.",
    status: REPLENISHMENT_STATUS.COMPLETED,
    eventType: SCANOPS_EVENT_TYPES.REPLENISHMENT_SHELF_FILLED,
  },
  {
    id: REPLENISHMENT_OUTCOMES.SHORT_FILL,
    label: "Short Fill",
    shortLabel: "Short",
    helper: "Record local short-fill evidence; stock numbers wait for backend sync.",
    status: REPLENISHMENT_STATUS.EXCEPTION,
    eventType: SCANOPS_EVENT_TYPES.REPLENISHMENT_SHORT_FILL,
  },
  {
    id: REPLENISHMENT_OUTCOMES.NO_BACKROOM_STOCK,
    label: "No Backroom Stock",
    shortLabel: "No Stock",
    helper: "Shelf needs stock, but no usable backroom stock was found.",
    status: REPLENISHMENT_STATUS.EXCEPTION,
    eventType: SCANOPS_EVENT_TYPES.REPLENISHMENT_NO_BACKROOM_STOCK,
  },
  {
    id: REPLENISHMENT_OUTCOMES.DAMAGED_STOCK,
    label: "Damaged / Unsellable",
    shortLabel: "Damaged",
    helper: "Backroom stock exists, but cannot be used for shelf fill.",
    status: REPLENISHMENT_STATUS.EXCEPTION,
    eventType: SCANOPS_EVENT_TYPES.REPLENISHMENT_DAMAGED_STOCK,
  },
  {
    id: REPLENISHMENT_OUTCOMES.WRONG_LOCATION,
    label: "Wrong Location",
    shortLabel: "Wrong Loc.",
    helper: "Stock or shelf label location does not match the expected location.",
    status: REPLENISHMENT_STATUS.EXCEPTION,
    eventType: SCANOPS_EVENT_TYPES.REPLENISHMENT_WRONG_LOCATION,
  },
  {
    id: REPLENISHMENT_OUTCOMES.MANAGER_REVIEW,
    label: "Manager Review",
    shortLabel: "Review",
    helper: "Escalate the item when staff cannot safely resolve it.",
    status: REPLENISHMENT_STATUS.REVIEW_REQUIRED,
    eventType: SCANOPS_EVENT_TYPES.REPLENISHMENT_MANAGER_REVIEW_REQUESTED,
  },
];

function readTasks() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn("Unable to read replenishment tasks", error);
    return [];
  }
}

function writeTasks(tasks) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks.slice(0, MAX_RECORDS)));
  } catch (error) {
    console.warn("Unable to persist replenishment tasks", error);
  }
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getReplenishmentAction(actionId) {
  return REPLENISHMENT_ACTIONS.find((action) => action.id === actionId) || REPLENISHMENT_ACTIONS[0];
}

export function getReplenishmentTasks() {
  return readTasks();
}

export function getOpenReplenishmentTasks() {
  return readTasks().filter((task) => ![REPLENISHMENT_STATUS.COMPLETED, "Cancelled"].includes(task.status));
}

export function clearReplenishmentTasks() {
  writeTasks([]);
  return [];
}

export function getShelfNeedSnapshot(item = {}) {
  const shelf = numberOrNull(item.shelfStock ?? item.shelf_stock);
  const backroom = numberOrNull(item.backroomStock ?? item.backroom_stock);
  const minimum = numberOrNull(item.minimumStock ?? item.minimum_shelf_qty ?? item.reorderPoint ?? item.reorder_point);
  const pending = numberOrNull(item.pendingDeliveryQty ?? item.pending_delivery_qty);
  const shelfNeed = shelf == null || minimum == null ? null : Math.max(0, minimum - shelf);
  const recommendedMove = shelfNeed == null
    ? Math.max(1, Math.min(backroom ?? 1, 6))
    : Math.max(0, Math.min(backroom ?? shelfNeed, shelfNeed));

  let shelfState = "Unknown";
  if (shelf != null && shelf <= 0) shelfState = "Empty";
  else if (shelfNeed != null && shelfNeed > 0) shelfState = "Low";
  else if (shelf != null) shelfState = "OK";

  let backroomState = "Unknown";
  if (backroom != null && backroom <= 0) backroomState = "No stock";
  else if (backroom != null && shelfNeed != null && backroom < shelfNeed) backroomState = "Partial";
  else if (backroom != null) backroomState = "Available";

  return {
    shelf,
    backroom,
    minimum,
    pending,
    shelfNeed,
    recommendedMove,
    shelfState,
    backroomState,
    unit: item.unitType || item.unit_type || item.unit || "each",
    shelfLocation: item.shelfLocation || item.location || [item.aisle, item.bay, item.shelf].filter(Boolean).join(" · ") || "Shelf location not set",
    backroomLocation: item.backroomLocation || item.backroom_location || "Backroom location not set",
    planogramStatus: item.planogramStatus || item.planogram_status || "Unknown",
  };
}

function itemSnapshot(item = {}) {
  return {
    internalItemId: item.internalItemId || item.id || null,
    name: item.name || item.item_name || "Scanned item",
    sku: item.sku || null,
    barcode: item.barcode || item.gtin || null,
    plu: item.plu || item.scaleCode || null,
    department: item.department || item.category || "Store floor",
    category: item.category || null,
    unitType: item.unitType || item.unit_type || item.unit || "each",
    shelfLocation: item.shelfLocation || item.location || [item.aisle, item.bay, item.shelf].filter(Boolean).join(" · ") || null,
    backroomLocation: item.backroomLocation || item.backroom_location || null,
    shelfStock: item.shelfStock ?? item.shelf_stock ?? null,
    backroomStock: item.backroomStock ?? item.backroom_stock ?? null,
    stockOnHand: item.stockOnHand ?? item.stock_on_hand ?? null,
    minimumStock: item.minimumStock ?? item.minimum_shelf_qty ?? null,
    pendingDeliveryQty: item.pendingDeliveryQty ?? item.pending_delivery_qty ?? null,
    planogramStatus: item.planogramStatus || item.planogram_status || null,
  };
}

export function saveReplenishmentAction({ item, actionId, quantity, issueReason, notes = "", evidenceNote = "" }) {
  if (!item) return null;
  const action = getReplenishmentAction(actionId);
  const session = getScanOpsSession();
  const identity = buildEventIdentity(session);
  const snapshot = itemSnapshot(item);
  const need = getShelfNeedSnapshot(item);
  const qty = Math.max(0, Number(quantity || 0));
  const task = {
    id: makeId("repl"),
    replenishmentTaskId: makeId("repl_task"),
    sourceWorkflow: "replenishment",
    workflow_type: "replenishment",
    source_module: "Replenishment",
    status: action.status,
    outcome: action.id,
    outcomeLabel: action.label,
    issueReason,
    notes: String(notes || "").trim(),
    evidenceNote: String(evidenceNote || "").trim(),
    quantityMoved: qty,
    requestedQuantity: qty,
    unit: need.unit,
    item_name: snapshot.name,
    itemName: snapshot.name,
    sku: snapshot.sku,
    barcode: snapshot.barcode,
    plu: snapshot.plu,
    department: snapshot.department,
    item_snapshot: snapshot,
    sourceLocation: need.backroomLocation,
    destinationLocation: need.shelfLocation,
    shelf_need_snapshot: need,
    applies_stock_directly: false,
    requiresManagerReview: action.status === REPLENISHMENT_STATUS.REVIEW_REQUIRED,
    collaborationVersion: COLLABORATION_VERSION,
    collaborationTaskId: `task_${makeId("repl_collab")}`,
    collaborationOwnershipStatus: COLLABORATION_STATES.TASK_CLAIMED,
    collaborationSyncStatus: "SYNC_DEFERRED",
    createdAt: identity.created_at,
    created_at: identity.created_at,
    updatedAt: identity.created_at,
    actorUserId: identity.actorUserId,
    actorName: identity.actorName,
    actorRole: identity.actorRole,
    deviceId: identity.deviceId,
    scannerId: identity.scannerId,
    storeId: identity.storeId,
    location_id: identity.location_id,
    traceId: makeId("trace_repl"),
  };

  task.collaborationTaskId = `task_${task.replenishmentTaskId}`;
  const next = [task, ...readTasks()].slice(0, MAX_RECORDS);
  writeTasks(next);

  registerCollaborationTaskForRecord({
    taskId: task.collaborationTaskId,
    taskType: TASK_TYPES.REPLENISHMENT,
    taskLabel: task.outcome === REPLENISHMENT_OUTCOMES.TASK_CREATED ? `Replenish ${snapshot.name}` : `${action.label} · ${snapshot.name}`,
    taskSummary: `${need.backroomLocation} to ${need.shelfLocation} · ${qty} ${need.unit}`,
    sourceWorkflow: "Replenishment",
    sourceRecordId: task.replenishmentTaskId,
    ownerMode: "current",
    conflictRisk: task.requiresManagerReview ? "HIGH" : "LOW",
  });

  const event = createScanOpsEvent(action.eventType, {
    traceId: task.traceId,
    source_module: "Replenishment",
    sourceWorkflow: "replenishment",
    workflow_type: "replenishment",
    replenishment_task_id: task.replenishmentTaskId,
    item_name: snapshot.name,
    itemName: snapshot.name,
    sku: snapshot.sku,
    barcode: snapshot.barcode,
    plu: snapshot.plu,
    department: snapshot.department,
    quantity: qty,
    quantity_moved: qty,
    unit_type: need.unit,
    issue_reason: issueReason,
    outcome: action.id,
    outcome_label: action.label,
    status: action.status,
    notes: task.notes,
    evidence_note: task.evidenceNote,
    source: need.backroomLocation,
    destination: need.shelfLocation,
    shelf_need_snapshot: need,
    item_snapshot: snapshot,
    applies_stock_directly: false,
    requires_manager_review: task.requiresManagerReview,
  });

  return { task, event, tasks: next };
}
