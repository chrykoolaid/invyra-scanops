import { SCANOPS_USER_CONTEXT } from "./scanOpsInventoryFixtures";
import { recordEventForInventorySync } from "./scanOpsSync";

const STORAGE_KEY = "invyra_scanops_events_v1";

function safeReadEvents() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn("Unable to read ScanOps events", error);
    return [];
  }
}

function safeWriteEvents(events) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (error) {
    console.warn("Unable to persist ScanOps events", error);
  }
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const SCANOPS_EVENT_TYPES = {
  REPLENISHMENT_CREATED: "REPLENISHMENT_CREATED",
  REPLENISHMENT_COMPLETED: "REPLENISHMENT_COMPLETED",
  GAP_CONFIRMED: "GAP_CONFIRMED",
  REORDER_REQUESTED: "REORDER_REQUESTED",
  SHELF_LABEL_ISSUE_FLAGGED: "SHELF_LABEL_ISSUE_FLAGGED",
  PLANOGRAM_ISSUE_FLAGGED: "PLANOGRAM_ISSUE_FLAGGED",
  SUPPLIER_PENDING_CONFIRMED: "SUPPLIER_PENDING_CONFIRMED",
  REPLENISHMENT_CANCELLED: "REPLENISHMENT_CANCELLED",
  STOCK_COUNT_SUBMITTED: "STOCK_COUNT_SUBMITTED",
  RECEIVING_CONFIRMED: "RECEIVING_CONFIRMED",
  MARKDOWN_APPLIED: "MARKDOWN_APPLIED",
  LABEL_PRINT_REQUESTED: "LABEL_PRINT_REQUESTED",
  WASTE_RECORDED: "WASTE_RECORDED",
  WASTE_APPROVAL_REQUIRED: "WASTE_APPROVAL_REQUIRED",
  EXPIRY_CHECK_RECORDED: "EXPIRY_CHECK_RECORDED",
  FRESHNESS_CHECK_RECORDED: "FRESHNESS_CHECK_RECORDED",
  EXPIRY_MARKDOWN_RECOMMENDED: "EXPIRY_MARKDOWN_RECOMMENDED",
  EXPIRY_WASTE_RECOMMENDED: "EXPIRY_WASTE_RECOMMENDED",
  FRESHNESS_REVIEW_REQUIRED: "FRESHNESS_REVIEW_REQUIRED",
  EXPIRY_DATE_UPDATED: "EXPIRY_DATE_UPDATED",
  TASK_CREATED: "TASK_CREATED",
  TASK_STARTED: "TASK_STARTED",
  TASK_COMPLETED: "TASK_COMPLETED",
  TASK_BLOCKED: "TASK_BLOCKED",
  TASK_CANCELLED: "TASK_CANCELLED",
  TASK_REASSIGNED: "TASK_REASSIGNED",
  TASK_ESCALATED: "TASK_ESCALATED",
  TASK_LINKED_ACTION_OPENED: "TASK_LINKED_ACTION_OPENED",
  TASK_FILTER_CHANGED: "TASK_FILTER_CHANGED",
  INVENTORY_SYNC_STARTED: "INVENTORY_SYNC_STARTED",
  INVENTORY_SYNC_SUCCEEDED: "INVENTORY_SYNC_SUCCEEDED",
  INVENTORY_SYNC_FAILED: "INVENTORY_SYNC_FAILED",
  INVENTORY_PULL_STARTED: "INVENTORY_PULL_STARTED",
  INVENTORY_PULL_SUCCEEDED: "INVENTORY_PULL_SUCCEEDED",
  INVENTORY_PULL_FAILED: "INVENTORY_PULL_FAILED",
  INVENTORY_PUSH_STARTED: "INVENTORY_PUSH_STARTED",
  INVENTORY_PUSH_SUCCEEDED: "INVENTORY_PUSH_SUCCEEDED",
  INVENTORY_PUSH_FAILED: "INVENTORY_PUSH_FAILED",
  LOCAL_EVENT_SAVED: "LOCAL_EVENT_SAVED",
  SYNC_QUEUED: "SYNC_QUEUED",
  SYNC_STARTED: "SYNC_STARTED",
  SYNC_SUCCEEDED: "SYNC_SUCCEEDED",
  SYNC_FAILED: "SYNC_FAILED",
  SYNC_RETRY_REQUESTED: "SYNC_RETRY_REQUESTED",
  SYNC_CONFLICT_DETECTED: "SYNC_CONFLICT_DETECTED",
  SYNC_STATUS_VIEWED: "SYNC_STATUS_VIEWED",
  OFFLINE_MODE_ENTERED: "OFFLINE_MODE_ENTERED",
  ONLINE_MODE_RESTORED: "ONLINE_MODE_RESTORED",
};

export function createScanOpsEvent(eventType, payload = {}) {
  const event = {
    event_id: makeId("evt"),
    trace_id: payload.trace_id || makeId("trace"),
    event_type: eventType,
    source_module: payload.source_module || "ScanOps",
    user_id: SCANOPS_USER_CONTEXT.user_id,
    role: SCANOPS_USER_CONTEXT.role,
    scanner_id: SCANOPS_USER_CONTEXT.scanner_id,
    location_id: SCANOPS_USER_CONTEXT.location_id,
    created_at: new Date().toISOString(),
    status: payload.status || "recorded",
    ...payload,
  };
  const events = safeReadEvents();
  safeWriteEvents([event, ...events].slice(0, 80));
  recordEventForInventorySync(event);
  return event;
}

export function getScanOpsEvents() {
  return safeReadEvents();
}
