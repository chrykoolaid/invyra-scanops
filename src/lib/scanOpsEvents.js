import { SCANOPS_USER_CONTEXT } from "./scanOpsInventoryFixtures";

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
  return event;
}

export function getScanOpsEvents() {
  return safeReadEvents();
}
