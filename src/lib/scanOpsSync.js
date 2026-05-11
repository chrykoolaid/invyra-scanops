import { SCANOPS_USER_CONTEXT } from "./scanOpsInventoryFixtures";
import { getInventoryConnection, pushInventoryEvent, setInventoryConnectionMode } from "./inventorySystemAdapter";

const QUEUE_KEY = "invyra_scanops_sync_queue_v2";
const LEGACY_QUEUE_KEY = "invyra_scanops_sync_queue_v1";

export const SYNC_STATUSES = {
  QUEUED: "queued",
  SYNC_PENDING: "sync_pending",
  SYNCING: "syncing",
  SYNCED: "synced",
  SYNC_FAILED: "sync_failed",
  NEEDS_REVIEW: "needs_review",
  CONFLICT: "conflict",
  // Legacy aliases kept so older screens/fixtures do not crash if stored locally.
  LOCAL_SAVED: "LOCAL_SAVED",
  FAILED: "FAILED",
};

export const SYNC_STATUS_LABELS = {
  [SYNC_STATUSES.QUEUED]: "Queued",
  [SYNC_STATUSES.SYNC_PENDING]: "Sync pending",
  [SYNC_STATUSES.SYNCING]: "Syncing",
  [SYNC_STATUSES.SYNCED]: "Synced",
  [SYNC_STATUSES.SYNC_FAILED]: "Sync failed",
  [SYNC_STATUSES.NEEDS_REVIEW]: "Needs review",
  [SYNC_STATUSES.CONFLICT]: "Conflict found",
  [SYNC_STATUSES.LOCAL_SAVED]: "Saved on device",
  [SYNC_STATUSES.FAILED]: "Sync failed",
};

const NON_SYNC_PREFIXES = [
  "SYNC_",
  "INVENTORY_SYNC_",
  "INVENTORY_PULL_",
  "INVENTORY_PUSH_",
  "OFFLINE_MODE_",
  "ONLINE_MODE_",
  "LOCAL_EVENT_SAVED",
  "OPERATIONAL_MENU_",
  "OPERATIONAL_PANEL_",
  "AUDIT_EVENTS_",
  "DEVICE_STATUS_",
  "SCANOPS_SETTINGS_",
  "SESSION_ROLE_PREVIEW_",
];

const SUBMISSION_EVENT_HINTS = [
  "STOCK_COUNT_SUBMITTED",
  "RECEIVING_EVIDENCE_SUBMITTED",
  "TRANSFER_REQUEST_SUBMITTED",
  "WASTE_RECORDED",
  "WASTE_APPROVAL_REQUIRED",
  "MARKDOWN_APPLIED",
  "SHELF_TICKET_BATCH_SENT_TO_DESKTOP",
  "TASK_COMPLETED",
];

function readKey(key) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(queue) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

function read() {
  const current = readKey(QUEUE_KEY);
  if (current.length) return current;
  const legacy = readKey(LEGACY_QUEUE_KEY);
  if (!legacy.length) return [];
  const migrated = legacy.map(normalizeQueueItem);
  write(migrated);
  return migrated;
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeStatus(status) {
  const value = String(status || "").toLowerCase();
  if (["synced", "sync_succeeded"].includes(value)) return SYNC_STATUSES.SYNCED;
  if (["sync_failed", "failed", "failure"].includes(value)) return SYNC_STATUSES.SYNC_FAILED;
  if (["queued", "waiting", "local_saved", "saved on device", "local_saved"].includes(value)) return SYNC_STATUSES.QUEUED;
  if (["syncing"].includes(value)) return SYNC_STATUSES.SYNCING;
  if (["needs_review", "review_required"].includes(value)) return SYNC_STATUSES.NEEDS_REVIEW;
  if (["conflict", "conflict_found"].includes(value)) return SYNC_STATUSES.CONFLICT;
  return SYNC_STATUSES.SYNC_PENDING;
}

function labelFor(status) {
  return SYNC_STATUS_LABELS[normalizeStatus(status)] || SYNC_STATUS_LABELS[status] || "Sync pending";
}

function hist(status, message, extra = {}) {
  const normalized = normalizeStatus(status);
  return {
    status: normalized,
    label: labelFor(normalized),
    message,
    at: nowIso(),
    ...extra,
  };
}

function titleFromEvent(event) {
  const source = event?.source_module || event?.sourceWorkflow || "ScanOps";
  const type = String(event?.event_type || "").replaceAll("_", " ").toLowerCase();
  if (String(event?.event_type || "").startsWith("STOCK_COUNT")) return "Stock Count evidence";
  if (String(event?.event_type || "").startsWith("RECEIVING")) return "Receiving evidence";
  if (String(event?.event_type || "").startsWith("TRANSFER")) return "Transfer request";
  if (String(event?.event_type || "").startsWith("WASTE")) return "Waste evidence";
  if (String(event?.event_type || "").startsWith("MARKDOWN")) return "Markdown request";
  if (String(event?.event_type || "").startsWith("SHELF_TICKET")) return "Shelf ticket request";
  if (String(event?.event_type || "").startsWith("TASK")) return "Task update";
  return `${source} ${type}`.trim();
}

function sourceRequestIdFromEvent(event) {
  return event?.sourceRequestId
    || event?.waste_request_id
    || event?.markdown_request_id
    || event?.shelf_ticket_request_id
    || event?.receiving_request_id
    || event?.transfer_request_id
    || event?.count_session_id
    || event?.task_id
    || event?.event_id
    || makeId("source");
}

function sourceWorkflowFromEvent(event) {
  const source = String(event?.source_module || "").toLowerCase();
  const type = String(event?.event_type || "");
  if (source.includes("stock") || type.startsWith("STOCK_COUNT")) return "stock_count";
  if (source.includes("receiving") || type.startsWith("RECEIVING")) return "receiving";
  if (source.includes("transfer") || type.startsWith("TRANSFER")) return "transfer";
  if (source.includes("waste") || type.startsWith("WASTE")) return "waste";
  if (source.includes("markdown") || type.startsWith("MARKDOWN")) return "markdown";
  if (source.includes("shelf") || type.startsWith("SHELF_TICKET")) return "shelf_tickets";
  if (source.includes("task") || type.startsWith("TASK")) return "task";
  return "scanops";
}

function summaryFromEvent(event) {
  const itemCount = event?.item_count ?? event?.counted_items ?? event?.line_count ?? null;
  const variance = event?.variance_items ?? event?.discrepancy_count ?? event?.review_required_count ?? null;
  const item = event?.item_name || event?.itemName || event?.sku || event?.barcode || event?.plu || event?.task_id || "local record";
  const bits = [];
  if (itemCount != null) bits.push(`${itemCount} item${Number(itemCount) === 1 ? "" : "s"}`);
  if (variance != null) bits.push(`${variance} exception${Number(variance) === 1 ? "" : "s"}`);
  if (event?.supplier_name) bits.push(event.supplier_name);
  if (event?.source_location_label && event?.destination_location_label) bits.push(`${event.source_location_label} → ${event.destination_location_label}`);
  if (!bits.length) bits.push(item);
  return bits.join(" · ");
}

function requiresSyncReview(event) {
  const type = String(event?.event_type || "");
  const status = String(event?.status || "").toLowerCase();
  return type.endsWith("_SUPERVISOR_REVIEW_REQUIRED")
    || status.includes("review_required")
    || event?.supervisor_review_required === true;
}

function normalizeQueueItem(entry = {}) {
  const status = normalizeStatus(entry.status);
  return {
    queueId: entry.queueId || entry.id || makeId("sync"),
    id: entry.id || entry.queueId || makeId("sync"),
    localEventId: entry.localEventId || entry.local_event_id || entry.event_id || entry.payload?.event_id || null,
    inventoryEventId: entry.inventoryEventId || entry.inventory_event_id || null,
    eventType: entry.eventType || entry.event_type || entry.payload?.event_type || "SCANOPS_EVENT",
    sourceWorkflow: entry.sourceWorkflow || sourceWorkflowFromEvent(entry.payload || entry),
    sourceModule: entry.sourceModule || entry.source_module || entry.payload?.source_module || "ScanOps",
    sourceRequestId: entry.sourceRequestId || sourceRequestIdFromEvent(entry.payload || entry),
    status,
    statusLabel: labelFor(status),
    title: entry.title || titleFromEvent(entry.payload || entry),
    summary: entry.summary || entry.payloadSummary || summaryFromEvent(entry.payload || entry),
    payloadSummary: entry.payloadSummary || entry.summary || summaryFromEvent(entry.payload || entry),
    createdBy: entry.createdBy || entry.payload?.actorName || entry.payload?.user_name || SCANOPS_USER_CONTEXT.user_name,
    createdRole: entry.createdRole || entry.payload?.actorRole || entry.payload?.role || SCANOPS_USER_CONTEXT.role,
    createdAt: entry.createdAt || entry.created_at || entry.payload?.created_at || nowIso(),
    lastAttemptAt: entry.lastAttemptAt || entry.last_attempt_at || null,
    syncedAt: entry.syncedAt || entry.synced_at || null,
    failureReason: entry.failureReason || entry.failure_reason || null,
    retryCount: Number(entry.retryCount ?? entry.attemptCount ?? 0),
    attemptCount: Number(entry.attemptCount ?? entry.retryCount ?? 0),
    deviceId: entry.deviceId || entry.payload?.deviceId || entry.payload?.scanner_id || SCANOPS_USER_CONTEXT.scanner_id,
    locationId: entry.locationId || entry.payload?.location_id || SCANOPS_USER_CONTEXT.location_id,
    userRole: entry.userRole || entry.payload?.role || SCANOPS_USER_CONTEXT.role,
    payloadSnapshot: entry.payloadSnapshot || entry.payload || entry,
    payload: entry.payload || entry.payloadSnapshot || entry,
    syncHistory: entry.syncHistory || [],
  };
}

function buildQueueItem(event, initialStatus) {
  const status = normalizeStatus(initialStatus);
  return normalizeQueueItem({
    queueId: makeId("sync"),
    localEventId: event.event_id,
    inventoryEventId: null,
    eventType: event.event_type,
    sourceWorkflow: sourceWorkflowFromEvent(event),
    sourceModule: event.source_module || "ScanOps",
    sourceRequestId: sourceRequestIdFromEvent(event),
    status,
    title: titleFromEvent(event),
    summary: summaryFromEvent(event),
    createdBy: event.actorName || event.user_name || SCANOPS_USER_CONTEXT.user_name,
    createdRole: event.actorRole || event.role || SCANOPS_USER_CONTEXT.role,
    createdAt: event.created_at || nowIso(),
    failureReason: status === SYNC_STATUSES.NEEDS_REVIEW ? "Review required before Inventory applies the record." : null,
    payloadSnapshot: event,
    payload: event,
    syncHistory: [hist(status, status === SYNC_STATUSES.NEEDS_REVIEW ? "Saved on this scanner for review." : "Saved on this scanner and waiting in Sync Queue.")],
  });
}

function isSubmissionEvent(eventType) {
  const type = String(eventType || "");
  return SUBMISSION_EVENT_HINTS.includes(type) || type.endsWith("_SUBMITTED") || type.endsWith("_COMPLETED");
}

export function shouldQueueInventoryEvent(eventType) {
  const value = String(eventType || "");
  if (!value) return false;
  if (NON_SYNC_PREFIXES.some((prefix) => value.startsWith(prefix))) return false;
  return isSubmissionEvent(value);
}

export function getNetworkMode() {
  return getInventoryConnection().mode || "online";
}

export function setNetworkMode(mode) {
  return setInventoryConnectionMode(mode);
}

export function getSyncQueue() {
  return read().map(normalizeQueueItem);
}

export function saveSyncQueue(queue) {
  const normalized = (queue || []).map(normalizeQueueItem);
  write(normalized);
  return normalized;
}

export function getSyncSummary() {
  const q = getSyncQueue();
  const pendingStatuses = new Set([SYNC_STATUSES.QUEUED, SYNC_STATUSES.SYNC_PENDING, SYNC_STATUSES.SYNCING, SYNC_STATUSES.LOCAL_SAVED]);
  const failedStatuses = new Set([SYNC_STATUSES.SYNC_FAILED, SYNC_STATUSES.FAILED, SYNC_STATUSES.CONFLICT, SYNC_STATUSES.NEEDS_REVIEW]);
  const count = (predicate) => q.filter(predicate).length;
  return {
    total: q.length,
    queued: count((e) => e.status === SYNC_STATUSES.QUEUED),
    pending: count((e) => pendingStatuses.has(e.status)),
    syncing: count((e) => e.status === SYNC_STATUSES.SYNCING),
    synced: count((e) => e.status === SYNC_STATUSES.SYNCED),
    failed: count((e) => e.status === SYNC_STATUSES.SYNC_FAILED || e.status === SYNC_STATUSES.FAILED),
    conflict: count((e) => e.status === SYNC_STATUSES.CONFLICT),
    needsReview: count((e) => e.status === SYNC_STATUSES.NEEDS_REVIEW),
    issue: count((e) => failedStatuses.has(e.status)),
  };
}

export function getSyncHeaderState() {
  const mode = getNetworkMode();
  const summary = getSyncSummary();
  if (mode === "offline") return { state: "offline", label: "Offline", summary };
  if (summary.issue > 0) return { state: "issue", label: "Sync Issue", summary };
  if (summary.pending > 0) return { state: "pending", label: "Pending", summary };
  return { state: "synced", label: "Synced", summary };
}

export function recordEventForInventorySync(event) {
  if (!event || event.sync_exempt || !shouldQueueInventoryEvent(event.event_type)) return null;
  const existing = getSyncQueue().find((entry) => entry.localEventId === event.event_id || (entry.sourceRequestId && entry.sourceRequestId === sourceRequestIdFromEvent(event) && entry.eventType === event.event_type));
  if (existing) return existing;
  const initialStatus = requiresSyncReview(event) ? SYNC_STATUSES.NEEDS_REVIEW : SYNC_STATUSES.SYNC_PENDING;
  const record = buildQueueItem(event, initialStatus);
  write([record, ...getSyncQueue()].slice(0, 160));
  return record;
}

export function queueSyncEvent(syncId, reason = "Waiting to sync with Invyra Inventory.") {
  let next = null;
  const updated = getSyncQueue().map((entry) => {
    if (entry.id !== syncId && entry.queueId !== syncId) return entry;
    next = {
      ...entry,
      status: SYNC_STATUSES.QUEUED,
      statusLabel: labelFor(SYNC_STATUSES.QUEUED),
      failureReason: null,
      syncHistory: [hist(SYNC_STATUSES.QUEUED, reason), ...(entry.syncHistory || [])],
    };
    return next;
  });
  write(updated);
  return next;
}

export function attemptSync(syncId) {
  const queue = getSyncQueue();
  const existing = queue.find((entry) => entry.id === syncId || entry.queueId === syncId);
  if (!existing) return null;
  if (existing.status === SYNC_STATUSES.SYNCED) return existing;
  if (existing.status === SYNC_STATUSES.NEEDS_REVIEW) return existing;

  const syncing = {
    ...existing,
    status: SYNC_STATUSES.SYNCING,
    statusLabel: labelFor(SYNC_STATUSES.SYNCING),
    lastAttemptAt: nowIso(),
    retryCount: Number(existing.retryCount || 0) + 1,
    attemptCount: Number(existing.attemptCount || 0) + 1,
    syncHistory: [hist(SYNC_STATUSES.SYNCING, "Sync retry started."), ...(existing.syncHistory || [])],
  };
  write(queue.map((entry) => (entry.id === existing.id ? syncing : entry)));

  if (syncing.payloadSnapshot?.forceSyncConflict || syncing.payload?.forceSyncConflict) {
    return markSyncConflict(syncing.id, "Conflict placeholder: inventory changed since scanner action.");
  }

  const result = pushInventoryEvent(syncing);
  return result.ok
    ? markSyncSucceeded(syncing.id, result.inventoryEventId, result.message || "Synced to Invyra Inventory.")
    : markSyncFailed(syncing.id, result.error || "Inventory sync failed.");
}

export function retrySyncEvent(syncId) {
  const existing = getSyncQueue().find((entry) => entry.id === syncId || entry.queueId === syncId);
  if (!existing) return null;
  if ([SYNC_STATUSES.SYNCED, SYNC_STATUSES.NEEDS_REVIEW].includes(existing.status)) return existing;
  return attemptSync(existing.id);
}

export function retryAllSyncEvents() {
  return getSyncQueue()
    .filter((entry) => ![SYNC_STATUSES.SYNCED, SYNC_STATUSES.NEEDS_REVIEW].includes(entry.status))
    .map((entry) => retrySyncEvent(entry.id));
}

export function markSyncSucceeded(syncId, inventoryEventId, message = "Synced to Invyra Inventory.") {
  let next = null;
  const updated = getSyncQueue().map((entry) => {
    if (entry.id !== syncId && entry.queueId !== syncId) return entry;
    next = {
      ...entry,
      inventoryEventId,
      status: SYNC_STATUSES.SYNCED,
      statusLabel: labelFor(SYNC_STATUSES.SYNCED),
      failureReason: null,
      syncedAt: nowIso(),
      syncHistory: [hist(SYNC_STATUSES.SYNCED, message, { inventoryEventId }), ...(entry.syncHistory || [])],
    };
    return next;
  });
  write(updated);
  return next;
}

export function markSyncFailed(syncId, reason = "Sync failed.") {
  let next = null;
  const updated = getSyncQueue().map((entry) => {
    if (entry.id !== syncId && entry.queueId !== syncId) return entry;
    next = {
      ...entry,
      status: SYNC_STATUSES.SYNC_FAILED,
      statusLabel: labelFor(SYNC_STATUSES.SYNC_FAILED),
      failureReason: reason,
      syncHistory: [hist(SYNC_STATUSES.SYNC_FAILED, reason), ...(entry.syncHistory || [])],
    };
    return next;
  });
  write(updated);
  return next;
}

export function markSyncConflict(syncId, reason = "Conflict found. Needs review.") {
  let next = null;
  const updated = getSyncQueue().map((entry) => {
    if (entry.id !== syncId && entry.queueId !== syncId) return entry;
    next = {
      ...entry,
      status: SYNC_STATUSES.CONFLICT,
      statusLabel: labelFor(SYNC_STATUSES.CONFLICT),
      failureReason: reason,
      syncHistory: [hist(SYNC_STATUSES.CONFLICT, reason), ...(entry.syncHistory || [])],
    };
    return next;
  });
  write(updated);
  return next;
}

export function resetSyncQueue() {
  write([]);
  return [];
}
