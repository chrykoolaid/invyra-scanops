import { SCANOPS_USER_CONTEXT } from "./scanOpsInventoryFixtures";
import { getInventoryConnection, pushInventoryEvent, setInventoryConnectionMode } from "./inventorySystemAdapter";
import { getScanOpsSession } from "./scanOpsSession";
import { TASK_DUE_STATES, TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES, upsertDerivedTaskFromSource } from "./scanOpsTasks";
import {
  OUTBOX_SYNC_STATUS,
  RECEIPT_STATUS,
  RETAINED_OUTBOX_STATUSES,
  buildOutboxSyncMetaPatch,
  isReplayEligible,
  isStuckSending,
  isTerminalOutboxStatus,
  mapReceiptToOutboxStatus,
  mapStaleSnapshotReceiptByEventType,
  replayOrderComparator,
  validateReceiptEnvelope,
} from "./scanopsSyncStatus";
import {
  getOutboxEvents,
  getOutboxEvent,
  updateOutboxEventSyncMeta,
  archiveOutboxEventToHistory,
} from "./inventory/storageProvider";

const QUEUE_KEY = "invyra_scanops_sync_queue_v3_stage_y";
const LEGACY_QUEUE_KEYS = ["invyra_scanops_sync_queue_v2", "invyra_scanops_sync_queue_v1"];
const ATTEMPTS_KEY = "invyra_scanops_sync_attempts_v1";
const CONFLICTS_KEY = "invyra_scanops_sync_conflicts_v1";
const RESOLUTION_EVENTS_KEY = "invyra_scanops_sync_resolution_events_v1";
const LOCAL_HASHES_KEY = "invyra_scanops_local_snapshot_hashes_v1";
const SERVER_REFS_KEY = "invyra_scanops_server_snapshot_refs_v1";

export const SYNC_STATUSES = {
  QUEUED: "queued",
  SYNC_PENDING: "sync_pending",
  SYNCING: "syncing",
  SYNCED: "synced",
  SYNC_FAILED: "sync_failed",
  NEEDS_REVIEW: "needs_review",
  CONFLICT: "conflict",
  DUPLICATE: "duplicate",
  DISCARDED: "discarded",
  ESCALATED: "escalated",
  // Legacy aliases kept so older screens/fixtures do not crash if stored locally.
  LOCAL_SAVED: "LOCAL_SAVED",
  FAILED: "FAILED",
};

export const SYNC_STATUS_LABELS = {
  [SYNC_STATUSES.QUEUED]: "Pending future handoff",
  [SYNC_STATUSES.SYNC_PENDING]: "Pending future handoff",
  [SYNC_STATUSES.SYNCING]: "Checking handoff",
  [SYNC_STATUSES.SYNCED]: "Ready for handoff",
  [SYNC_STATUSES.SYNC_FAILED]: "Handoff failed",
  [SYNC_STATUSES.NEEDS_REVIEW]: "Needs review",
  [SYNC_STATUSES.CONFLICT]: "Conflict",
  [SYNC_STATUSES.DUPLICATE]: "Needs review",
  [SYNC_STATUSES.DISCARDED]: "Discarded",
  [SYNC_STATUSES.ESCALATED]: "Needs review",
  [SYNC_STATUSES.LOCAL_SAVED]: "Saved locally",
  [SYNC_STATUSES.FAILED]: "Handoff failed",
};

export const SYNC_FAILURE_REASONS = {
  NETWORK_UNAVAILABLE: "Network unavailable",
  SERVER_UNAVAILABLE: "Server unavailable",
  VALIDATION_FAILED: "Validation failed",
  PERMISSION_DENIED: "Permission denied",
  SOURCE_RECORD_CLOSED: "Source record closed",
  DUPLICATE_DETECTED: "Duplicate detected",
  CONFLICT_DETECTED: "Conflict detected",
  MISSING_REQUIRED_FIELD: "Missing required field",
  UNKNOWN_PRODUCT_REFERENCE: "Unknown product reference",
  DEVICE_CLOCK_MISMATCH: "Device clock mismatch",
};

const TECHNICAL_RETRY_REASONS = new Set([
  SYNC_FAILURE_REASONS.NETWORK_UNAVAILABLE,
  SYNC_FAILURE_REASONS.SERVER_UNAVAILABLE,
  "Inventory system unavailable while scanner is offline.",
  "Network unavailable. Event remains saved on device.",
  "Handoff failed.",
]);

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
  "STOCK_COUNT_LINE_SAVED",
  "STOCK_COUNT_RECOUNT_SUBMITTED",
  "RECEIVING_EVIDENCE_SUBMITTED",
  "TRANSFER_BATCH_SUBMITTED",
  "TRANSFER_REQUEST_SUBMITTED",
  "WASTE_RECORDED",
  "WASTE_APPROVAL_REQUIRED",
  "WASTE_REVIEW_DRAFT_SAVED",
  "WASTE_REVIEW_SUBMITTED",
  "MARKDOWN_APPLIED",
  "MARKDOWN_REQUEST_CREATED",
  "MARKDOWN_APPROVAL_SUBMITTED",
  "SHELF_TICKET_REQUEST_CREATED",
  "SHELF_TICKET_REQUEST_IMPORTED_FROM_PRICE_CHECK",
  "SHELF_TICKET_CONTRACT_CREATED",
  "SHELF_TICKET_CONTRACT_UPDATED",
  "SHELF_TICKET_READY_FOR_PRINT_HANDOFF",
  "SHELF_TICKET_BATCH_SENT_TO_DESKTOP",
  "REPLENISHMENT_TASK_CREATED",
  "REPLENISHMENT_SHELF_FILLED",
  "REPLENISHMENT_SHORT_FILL",
  "REPLENISHMENT_NO_BACKROOM_STOCK",
  "REPLENISHMENT_DAMAGED_STOCK",
  "REPLENISHMENT_WRONG_LOCATION",
  "REPLENISHMENT_MANAGER_REVIEW_REQUESTED",
  "PRICE_LABEL_VERIFIED",
  "PRICE_MISMATCH_RECORDED",
  "PROMO_LABEL_VERIFIED",
  "PROMO_LABEL_MISSING",
  "PROMO_LABEL_EXPIRED",
  "WRONG_PRODUCT_LABEL_RECORDED",
  "SHELF_TICKET_REQUESTED_FROM_PRICE_CHECK",
  "PRICE_CHECK_MANAGER_REVIEW_REQUESTED",
  "TASK_COMPLETED",
  "UNKNOWN_ITEM_EVIDENCE_CREATED",
];

const ACTIVE_DUPLICATE_STATUSES = new Set([
  SYNC_STATUSES.QUEUED,
  SYNC_STATUSES.SYNC_PENDING,
  SYNC_STATUSES.SYNCING,
  SYNC_STATUSES.SYNC_FAILED,
  SYNC_STATUSES.NEEDS_REVIEW,
  SYNC_STATUSES.CONFLICT,
  SYNC_STATUSES.DUPLICATE,
  SYNC_STATUSES.ESCALATED,
]);

function readKey(key, fallback = []) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeKey(key, value) {
  if (typeof window === "undefined") return value;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
  return value;
}

function write(queue) {
  return writeKey(QUEUE_KEY, queue);
}

function read() {
  const current = readKey(QUEUE_KEY, []);
  if (current.length) return current;
  for (const legacyKey of LEGACY_QUEUE_KEYS) {
    const legacy = readKey(legacyKey, []);
    if (legacy.length) {
      const migrated = legacy.map(normalizeQueueItem);
      write(migrated);
      return migrated;
    }
  }
  return [];
}

function appendKey(key, row, limit = 240) {
  const rows = readKey(key, []);
  return writeKey(key, [row, ...rows].slice(0, limit));
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function safeStableStringify(value) {
  const seen = new WeakSet();
  const sortValue = (input) => {
    if (input === null || typeof input !== "object") return input;
    if (seen.has(input)) return "[Circular]";
    seen.add(input);
    if (Array.isArray(input)) return input.map(sortValue);
    return Object.keys(input).sort().reduce((acc, key) => {
      if (["rawItem", "payload", "payloadSnapshot"].includes(key)) return acc;
      acc[key] = sortValue(input[key]);
      return acc;
    }, {});
  };
  try {
    return JSON.stringify(sortValue(value ?? {}));
  } catch {
    return String(value ?? "");
  }
}

function hashSnapshot(value) {
  const text = safeStableStringify(value);
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(36)}`;
}

function normalizeStatus(status) {
  const value = String(status || "").toLowerCase();
  if (["synced", "sync_succeeded"].includes(value)) return SYNC_STATUSES.SYNCED;
  if (["sync_failed", "failed", "failure"].includes(value)) return SYNC_STATUSES.SYNC_FAILED;
  if (["queued", "waiting", "local_saved", "saved on device"].includes(value)) return SYNC_STATUSES.QUEUED;
  if (["syncing"].includes(value)) return SYNC_STATUSES.SYNCING;
  if (["needs_review", "review_required"].includes(value)) return SYNC_STATUSES.NEEDS_REVIEW;
  if (["conflict", "conflict_found"].includes(value)) return SYNC_STATUSES.CONFLICT;
  if (["duplicate", "duplicate_detected"].includes(value)) return SYNC_STATUSES.DUPLICATE;
  if (["discarded", "discard_local_draft"].includes(value)) return SYNC_STATUSES.DISCARDED;
  if (["escalated", "escalate"].includes(value)) return SYNC_STATUSES.ESCALATED;
  return SYNC_STATUSES.SYNC_PENDING;
}

function labelFor(status) {
  const normalized = normalizeStatus(status);
  return SYNC_STATUS_LABELS[normalized] || SYNC_STATUS_LABELS[status] || "Pending future handoff";
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

function actorContext() {
  const session = getScanOpsSession?.() || {};
  return {
    actor_id: session.actorUserId || session.user_id || SCANOPS_USER_CONTEXT.user_id,
    actor_name: session.actorName || session.user_name || SCANOPS_USER_CONTEXT.user_name,
    actor_role: session.actorRole || session.role || SCANOPS_USER_CONTEXT.role,
    device_id: session.deviceId || session.scannerId || SCANOPS_USER_CONTEXT.scanner_id,
    store_id: session.storeId || session.location_id || SCANOPS_USER_CONTEXT.location_id,
    department: session.departmentName || session.department || SCANOPS_USER_CONTEXT.department || "Grocery",
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
  if (String(event?.event_type || "").startsWith("REPLENISHMENT")) return "Replenishment update";
  if (String(event?.event_type || "").startsWith("PRICE") || String(event?.event_type || "").startsWith("PROMO") || String(event?.event_type || "").startsWith("WRONG_PRODUCT_LABEL")) return "Price / promo check";
  if (String(event?.event_type || "").startsWith("TASK")) return "Task update";
  if (String(event?.event_type || "") === "UNKNOWN_ITEM_EVIDENCE_CREATED") return "Unknown item evidence";
  return `${source} ${type}`.trim();
}

function sourceRequestIdFromEvent(event) {
  return event?.sourceRequestId
    || event?.source_id
    || event?.sourceId
    || event?.waste_request_id
    || event?.markdown_request_id
    || event?.shelf_ticket_request_id
    || event?.replenishment_task_id
    || event?.price_verification_id
    || event?.receiving_request_id
    || event?.transfer_request_id
    || event?.count_session_id
    || event?.task_id
    || event?.unknown_item_evidence_id
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
  if (source.includes("replenishment") || type.startsWith("REPLENISHMENT")) return "replenishment";
  if (source.includes("price") || source.includes("promo") || type.startsWith("PRICE") || type.startsWith("PROMO") || type.startsWith("WRONG_PRODUCT_LABEL")) return "price_check";
  if (source.includes("task") || type.startsWith("TASK")) return "task";
  if (type === "UNKNOWN_ITEM_EVIDENCE_CREATED") return "unknown_item_evidence";
  return "scanops";
}

function itemIdentityFromPayload(payload = {}) {
  const firstItem = Array.isArray(payload.items) ? payload.items[0] : null;
  return payload.item_name
    || payload.itemName
    || payload.name
    || payload.sku
    || payload.barcode
    || payload.plu
    || payload.entered_code
    || firstItem?.itemName
    || firstItem?.item_name
    || firstItem?.sku
    || firstItem?.barcode
    || firstItem?.plu
    || "local record";
}

function summaryFromEvent(event) {
  const itemCount = event?.item_count ?? event?.counted_items ?? event?.line_count ?? null;
  const variance = event?.variance_items ?? event?.discrepancy_count ?? event?.review_required_count ?? null;
  const item = itemIdentityFromPayload(event);
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

function duplicateKeyFromEvent(event = {}) {
  const workflow = sourceWorkflowFromEvent(event);
  const requestId = sourceRequestIdFromEvent(event);
  const sourceLineId = event.source_line_id || event.line_id || event.requestItemId || event.count_line_id || event.po_line_id || event.transfer_line_id || "line";
  const itemKey = event.sku || event.barcode || event.plu || event.entered_code || itemIdentityFromPayload(event);
  return [workflow, requestId, sourceLineId, itemKey, event.event_type || "event"].map((part) => String(part || "").toLowerCase()).join("|");
}

function snapshotFromEntry(entry = {}) {
  return entry.localSnapshot || entry.payloadSnapshot || entry.payload || entry;
}

function serverSnapshotFromPayload(payload = {}) {
  return payload.serverSnapshot
    || payload.server_snapshot
    || payload.sourceServerSnapshot
    || payload.source_server_snapshot
    || payload.currentServerValue
    || payload.server_value
    || null;
}

function defaultServerSnapshot(entry = {}) {
  const payload = entry.payloadSnapshot || entry.payload || {};
  const localSnapshot = entry.localSnapshot || payload;
  const qty = payload.current_count ?? payload.counted_quantity ?? payload.quantity ?? payload.requested_qty ?? payload.item_count ?? null;
  return {
    source_ref: entry.sourceRef || entry.sourceRequestId || "source record",
    current_evidence: qty != null ? qty : "Current source value not fetched from desktop inventory",
    updated_by: payload.server_updated_by || payload.updated_by || "Inventory source",
    updated_at: payload.server_updated_at || payload.updated_at || nowIso(),
    snapshot_note: "Server/source snapshot placeholder; official source truth is not overwritten by ScanOps.",
    local_hash_at_capture: hashSnapshot(localSnapshot),
  };
}

function normalizeQueueItem(entry = {}) {
  const payload = entry.payloadSnapshot || entry.payload || entry;
  const status = normalizeStatus(entry.status);
  const localSnapshot = entry.localSnapshot || entry.local_snapshot || payload;
  const serverSnapshot = entry.serverSnapshot || entry.server_snapshot || serverSnapshotFromPayload(payload) || null;
  const localSnapshotHash = entry.localSnapshotHash || entry.local_snapshot_hash || hashSnapshot(localSnapshot);
  const serverSnapshotHash = entry.serverSnapshotHash || entry.server_snapshot_hash || (serverSnapshot ? hashSnapshot(serverSnapshot) : null);
  const sourceWorkflow = entry.sourceWorkflow || entry.source_workflow || sourceWorkflowFromEvent(payload);
  const sourceRequestId = entry.sourceRequestId || entry.source_id || entry.sourceId || sourceRequestIdFromEvent(payload);
  return {
    queueId: entry.queueId || entry.id || makeId("sync"),
    id: entry.id || entry.queueId || makeId("sync"),
    sync_ref: entry.sync_ref || entry.syncRef || entry.queueId || entry.id || makeId("sync_ref"),
    localEventId: entry.localEventId || entry.local_event_id || entry.event_id || payload?.event_id || null,
    inventoryEventId: entry.inventoryEventId || entry.inventory_event_id || null,
    eventType: entry.eventType || entry.event_type || payload?.event_type || "SCANOPS_EVENT",
    sourceWorkflow,
    sourceModule: entry.sourceModule || entry.source_module || payload?.source_module || "ScanOps",
    sourceType: entry.sourceType || entry.source_type || sourceWorkflow,
    sourceRequestId,
    sourceRef: entry.sourceRef || entry.source_ref || payload?.source_ref || payload?.po_ref || payload?.transfer_ref || sourceRequestId,
    sourceItemSnapshot: entry.sourceItemSnapshot || entry.source_item_snapshot || payload?.source_item_snapshot || null,
    status,
    sync_state: status,
    statusLabel: labelFor(status),
    title: entry.title || titleFromEvent(payload),
    summary: entry.summary || entry.payloadSummary || summaryFromEvent(payload),
    payloadSummary: entry.payloadSummary || entry.summary || summaryFromEvent(payload),
    createdBy: entry.createdBy || entry.created_by || payload?.actorName || payload?.user_name || SCANOPS_USER_CONTEXT.user_name,
    createdRole: entry.createdRole || entry.created_by_role || payload?.actorRole || payload?.role || SCANOPS_USER_CONTEXT.role,
    createdAt: entry.createdAt || entry.created_at || payload?.created_at || nowIso(),
    lastAttemptAt: entry.lastAttemptAt || entry.last_attempt_at || null,
    lastUpdatedAt: entry.lastUpdatedAt || entry.last_updated_at || entry.updatedAt || null,
    syncedAt: entry.syncedAt || entry.synced_at || null,
    resolvedAt: entry.resolvedAt || entry.resolved_at || null,
    resolvedBy: entry.resolvedBy || entry.resolved_by || null,
    resolvedByRole: entry.resolvedByRole || entry.resolved_by_role || null,
    resolutionAction: entry.resolutionAction || entry.resolution_action || null,
    resolutionReason: entry.resolutionReason || entry.resolution_reason || null,
    conflictType: entry.conflictType || entry.conflict_type || null,
    duplicateKey: entry.duplicateKey || entry.duplicate_key || duplicateKeyFromEvent(payload),
    duplicateOfSyncId: entry.duplicateOfSyncId || entry.duplicate_of_sync_id || null,
    matchingEvidence: entry.matchingEvidence || entry.matching_evidence || null,
    failureReason: entry.failureReason || entry.failure_reason || null,
    failureDetail: entry.failureDetail || entry.failure_detail || null,
    retryCount: Number(entry.retryCount ?? entry.attemptCount ?? 0),
    attemptCount: Number(entry.attemptCount ?? entry.retryCount ?? 0),
    maxRetries: Number(entry.maxRetries ?? entry.max_retries ?? 3),
    deviceId: entry.deviceId || entry.device_id || payload?.deviceId || payload?.scanner_id || SCANOPS_USER_CONTEXT.scanner_id,
    locationId: entry.locationId || entry.location_id || payload?.location_id || SCANOPS_USER_CONTEXT.location_id,
    userId: entry.userId || entry.user_id || payload?.actorUserId || payload?.user_id || SCANOPS_USER_CONTEXT.user_id,
    userRole: entry.userRole || entry.user_role || payload?.role || payload?.actorRole || SCANOPS_USER_CONTEXT.role,
    localSnapshot,
    localSnapshotHash,
    serverSnapshot,
    serverSnapshotHash,
    payloadSnapshot: entry.payloadSnapshot || entry.payload || entry,
    payload: entry.payload || entry.payloadSnapshot || entry,
    syncHistory: Array.isArray(entry.syncHistory) ? entry.syncHistory : [],
  };
}

function recordSnapshotRows(record) {
  appendKey(LOCAL_HASHES_KEY, {
    id: makeId("local_hash"),
    sync_item_id: record.id,
    source_type: record.sourceType || record.sourceWorkflow,
    source_id: record.sourceRequestId,
    hash_value: record.localSnapshotHash,
    snapshot_json: record.localSnapshot,
    created_at: nowIso(),
  }, 320);
  if (record.serverSnapshot) {
    appendKey(SERVER_REFS_KEY, {
      id: makeId("server_ref"),
      sync_item_id: record.id,
      source_type: record.sourceType || record.sourceWorkflow,
      source_id: record.sourceRequestId,
      server_ref: record.sourceRef || record.sourceRequestId,
      server_hash: record.serverSnapshotHash,
      server_snapshot_json: record.serverSnapshot,
      fetched_at: nowIso(),
    }, 320);
  }
}

function recordAttempt(syncItem, result, extra = {}) {
  appendKey(ATTEMPTS_KEY, {
    id: makeId("sync_attempt"),
    sync_item_id: syncItem.id,
    attempt_number: Number(syncItem.attemptCount || syncItem.retryCount || 0),
    attempted_by: actorContext().actor_name,
    attempted_by_role: actorContext().actor_role,
    device_id: actorContext().device_id,
    started_at: extra.started_at || nowIso(),
    completed_at: nowIso(),
    result,
    failure_reason: extra.failure_reason || null,
    response_snapshot: extra.response_snapshot || null,
  }, 320);
}

function recordConflict(syncItem, conflictType, reason) {
  appendKey(CONFLICTS_KEY, {
    id: makeId("sync_conflict"),
    sync_item_id: syncItem.id,
    conflict_type: conflictType,
    local_snapshot: syncItem.localSnapshot,
    server_snapshot: syncItem.serverSnapshot || defaultServerSnapshot(syncItem),
    detected_at: nowIso(),
    detected_by_system: true,
    resolution_status: "open",
    resolution_action: null,
    resolution_reason: reason,
    resolved_by: null,
    resolved_at: null,
  }, 320);
}

function recordResolutionEvent(syncItem, fromState, toState, action, reason, note = null) {
  const actor = actorContext();
  appendKey(RESOLUTION_EVENTS_KEY, {
    id: makeId("sync_resolution"),
    sync_item_id: syncItem.id,
    from_state: fromState,
    to_state: toState,
    actor_id: actor.actor_id,
    actor_name: actor.actor_name,
    actor_role: actor.actor_role,
    action,
    reason,
    note,
    created_at: nowIso(),
  }, 360);
}

function buildQueueItem(event, initialStatus, extra = {}) {
  const status = normalizeStatus(initialStatus);
  const localSnapshot = event;
  const serverSnapshot = serverSnapshotFromPayload(event);
  const record = normalizeQueueItem({
    queueId: makeId("sync"),
    localEventId: event.event_id,
    inventoryEventId: null,
    eventType: event.event_type,
    sourceWorkflow: sourceWorkflowFromEvent(event),
    sourceModule: event.source_module || "ScanOps",
    sourceType: sourceWorkflowFromEvent(event),
    sourceRequestId: sourceRequestIdFromEvent(event),
    sourceRef: event.source_ref || event.po_ref || event.transfer_ref || sourceRequestIdFromEvent(event),
    status,
    title: event.sync_title || titleFromEvent(event),
    summary: event.sync_summary || summaryFromEvent(event),
    createdBy: event.actorName || event.user_name || SCANOPS_USER_CONTEXT.user_name,
    createdRole: event.actorRole || event.role || SCANOPS_USER_CONTEXT.role,
    userId: event.actorUserId || event.user_id || SCANOPS_USER_CONTEXT.user_id,
    createdAt: event.created_at || nowIso(),
    deviceId: event.deviceId || event.scanner_id || SCANOPS_USER_CONTEXT.scanner_id,
    locationId: event.storeId || event.location_id || SCANOPS_USER_CONTEXT.location_id,
    localSnapshot,
    localSnapshotHash: hashSnapshot(localSnapshot),
    serverSnapshot,
    serverSnapshotHash: serverSnapshot ? hashSnapshot(serverSnapshot) : null,
    duplicateKey: duplicateKeyFromEvent(event),
    conflictType: extra.conflictType || null,
    failureReason: extra.failureReason || (status === SYNC_STATUSES.NEEDS_REVIEW ? "Review required before Inventory applies the record." : null),
    payloadSnapshot: event,
    payload: event,
    syncHistory: [hist(status, status === SYNC_STATUSES.NEEDS_REVIEW ? "Saved locally. Needs review before future desktop handoff." : "Saved locally. Pending future desktop handoff.")],
    ...extra,
  });
  recordSnapshotRows(record);
  return record;
}

function isSubmissionEvent(eventType) {
  const type = String(eventType || "");
  return SUBMISSION_EVENT_HINTS.includes(type) || type.endsWith("_SUBMITTED") || type.endsWith("_COMPLETED");
}

function taskTitleFor(record) {
  if (record.status === SYNC_STATUSES.DUPLICATE) return "Review duplicate scan evidence";
  if (record.failureReason === SYNC_FAILURE_REASONS.PERMISSION_DENIED) return "Review failed sync permission issue";
  return "Review sync conflict";
}

function taskDescriptionFor(record, reason) {
  return `${record.title || "Sync Queue item"} needs review. Reason: ${reason || record.failureReason || record.conflictType || "Sync recovery requested"}. Sync Queue is evidence-only and must not mutate live inventory.`;
}

function canRetryReason(record) {
  if (!record) return false;
  if ([SYNC_STATUSES.SYNCED, SYNC_STATUSES.NEEDS_REVIEW, SYNC_STATUSES.CONFLICT, SYNC_STATUSES.DUPLICATE, SYNC_STATUSES.DISCARDED, SYNC_STATUSES.ESCALATED].includes(record.status)) return false;
  if (record.status !== SYNC_STATUSES.SYNC_FAILED && record.status !== SYNC_STATUSES.FAILED) return true;
  return TECHNICAL_RETRY_REASONS.has(record.failureReason) || String(record.failureReason || "").toLowerCase().includes("network") || String(record.failureReason || "").toLowerCase().includes("server unavailable");
}

function updateRecord(syncId, updater) {
  let next = null;
  const updated = getSyncQueue().map((entry) => {
    if (entry.id !== syncId && entry.queueId !== syncId) return entry;
    next = normalizeQueueItem(updater(entry));
    return next;
  });
  write(updated);
  return next;
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

export function getSyncAttempts() {
  return readKey(ATTEMPTS_KEY, []);
}

export function getSyncConflicts() {
  return readKey(CONFLICTS_KEY, []);
}

export function getSyncResolutionEvents() {
  return readKey(RESOLUTION_EVENTS_KEY, []);
}

export function getLocalSnapshotHashes() {
  return readKey(LOCAL_HASHES_KEY, []);
}

export function getServerSnapshotRefs() {
  return readKey(SERVER_REFS_KEY, []);
}

export function getSyncSummary() {
  const q = getSyncQueue();
  const pendingStatuses = new Set([SYNC_STATUSES.QUEUED, SYNC_STATUSES.SYNC_PENDING, SYNC_STATUSES.SYNCING, SYNC_STATUSES.LOCAL_SAVED]);
  const issueStatuses = new Set([SYNC_STATUSES.SYNC_FAILED, SYNC_STATUSES.FAILED, SYNC_STATUSES.CONFLICT, SYNC_STATUSES.NEEDS_REVIEW, SYNC_STATUSES.DUPLICATE, SYNC_STATUSES.ESCALATED]);
  const count = (predicate) => q.filter(predicate).length;
  return {
    total: q.length,
    queued: count((e) => e.status === SYNC_STATUSES.QUEUED),
    pending: count((e) => pendingStatuses.has(e.status)),
    syncing: count((e) => e.status === SYNC_STATUSES.SYNCING),
    synced: count((e) => e.status === SYNC_STATUSES.SYNCED),
    failed: count((e) => e.status === SYNC_STATUSES.SYNC_FAILED || e.status === SYNC_STATUSES.FAILED),
    conflict: count((e) => e.status === SYNC_STATUSES.CONFLICT),
    duplicate: count((e) => e.status === SYNC_STATUSES.DUPLICATE),
    needsReview: count((e) => e.status === SYNC_STATUSES.NEEDS_REVIEW),
    discarded: count((e) => e.status === SYNC_STATUSES.DISCARDED),
    escalated: count((e) => e.status === SYNC_STATUSES.ESCALATED),
    issue: count((e) => issueStatuses.has(e.status)),
  };
}

export function getSyncHeaderState() {
  const mode = getNetworkMode();
  const summary = getSyncSummary();
  if (mode === "offline") return { state: "offline", label: "Offline", summary };
  if (summary.failed > 0) return { state: "issue", label: "Handoff failed", summary };
  if (summary.conflict + summary.duplicate + summary.needsReview + summary.escalated > 0) return { state: "issue", label: "Needs review", summary };
  if (summary.pending > 0) return { state: "pending", label: "Pending handoff", summary };
  return { state: "synced", label: "Ready", summary };
}

export function recordEventForInventorySync(event) {
  if (!event || event.sync_exempt || !shouldQueueInventoryEvent(event.event_type)) return null;
  const duplicateKey = duplicateKeyFromEvent(event);
  const queue = getSyncQueue();
  const exactExisting = queue.find((entry) => entry.localEventId === event.event_id);
  if (exactExisting) return exactExisting;

  const duplicateMatch = queue.find((entry) => entry.duplicateKey === duplicateKey && ACTIVE_DUPLICATE_STATUSES.has(entry.status));
  if (duplicateMatch) {
    const refreshed = updateRecord(duplicateMatch.id, (entry) => ({
      ...entry,
      lastUpdatedAt: nowIso(),
      syncHistory: [hist(entry.status, "Repeat tap ignored. Existing pending handoff item kept."), ...(entry.syncHistory || [])],
    }));
    return refreshed || duplicateMatch;
  }

  const initialStatus = requiresSyncReview(event)
    ? SYNC_STATUSES.NEEDS_REVIEW
    : SYNC_STATUSES.SYNC_PENDING;

  const record = buildQueueItem(event, initialStatus);

  write([record, ...queue].slice(0, 180));
  return record;
}

export function queueSyncEvent(syncId, reason = "Pending future handoff with Invyra Inventory.") {
  return updateRecord(syncId, (entry) => ({
    ...entry,
    status: SYNC_STATUSES.QUEUED,
    statusLabel: labelFor(SYNC_STATUSES.QUEUED),
    failureReason: null,
    lastUpdatedAt: nowIso(),
    syncHistory: [hist(SYNC_STATUSES.QUEUED, reason || "Pending future handoff."), ...(entry.syncHistory || [])],
  }));
}

export function attemptSync(syncId) {
  const queue = getSyncQueue();
  const existing = queue.find((entry) => entry.id === syncId || entry.queueId === syncId);
  if (!existing) return null;
  if (!canRetryReason(existing)) return existing;

  const startedAt = nowIso();
  const syncing = normalizeQueueItem({
    ...existing,
    status: SYNC_STATUSES.SYNCING,
    statusLabel: labelFor(SYNC_STATUSES.SYNCING),
    lastAttemptAt: startedAt,
    retryCount: Number(existing.retryCount || 0) + 1,
    attemptCount: Number(existing.attemptCount || 0) + 1,
    syncHistory: [hist(SYNC_STATUSES.SYNCING, "Retry started for existing pending item."), ...(existing.syncHistory || [])],
  });
  write(queue.map((entry) => (entry.id === existing.id ? syncing : entry)));

  if (syncing.payloadSnapshot?.sourceRecordClosed || syncing.payload?.sourceRecordClosed) {
    recordAttempt(syncing, "conflict", { started_at: startedAt, failure_reason: SYNC_FAILURE_REASONS.SOURCE_RECORD_CLOSED });
    return markSyncConflict(syncing.id, SYNC_FAILURE_REASONS.SOURCE_RECORD_CLOSED, "source_record_closed", syncing.payloadSnapshot?.serverSnapshot || defaultServerSnapshot(syncing));
  }

  if (syncing.payloadSnapshot?.forceSyncConflict || syncing.payload?.forceSyncConflict || (syncing.serverSnapshotHash && syncing.serverSnapshotHash !== syncing.localSnapshotHash && syncing.payloadSnapshot?.requiresServerComparison)) {
    recordAttempt(syncing, "conflict", { started_at: startedAt, failure_reason: SYNC_FAILURE_REASONS.CONFLICT_DETECTED });
    return markSyncConflict(syncing.id, "Server/source value changed after local capture.", "server_changed_after_capture", syncing.serverSnapshot || defaultServerSnapshot(syncing));
  }

  if (syncing.payloadSnapshot?.validationError || syncing.payload?.validationError) {
    recordAttempt(syncing, "needs_review", { started_at: startedAt, failure_reason: SYNC_FAILURE_REASONS.VALIDATION_FAILED });
    return markSyncNeedsReview(syncing.id, syncing.payloadSnapshot.validationError || SYNC_FAILURE_REASONS.VALIDATION_FAILED);
  }

  if (syncing.payloadSnapshot?.permissionDenied || syncing.payload?.permissionDenied) {
    recordAttempt(syncing, "needs_review", { started_at: startedAt, failure_reason: SYNC_FAILURE_REASONS.PERMISSION_DENIED });
    return markSyncNeedsReview(syncing.id, SYNC_FAILURE_REASONS.PERMISSION_DENIED);
  }

  const result = pushInventoryEvent(syncing);
  if (result.ok) {
    recordAttempt(syncing, "synced", { started_at: startedAt, response_snapshot: result });
    return markSyncSucceeded(syncing.id, result.inventoryEventId, result.message || "Inventory Desktop receipt confirmed.");
  }
  const reason = result.error || SYNC_FAILURE_REASONS.NETWORK_UNAVAILABLE;
  recordAttempt(syncing, "failed", { started_at: startedAt, failure_reason: reason, response_snapshot: result });
  return markSyncFailed(syncing.id, reason);
}

export function retrySyncEvent(syncId) {
  const existing = getSyncQueue().find((entry) => entry.id === syncId || entry.queueId === syncId);
  if (!existing) return null;
  if (!canRetryReason(existing)) return existing;
  return attemptSync(existing.id);
}

export function retryAllSyncEvents() {
  return getSyncQueue()
    .filter((entry) => canRetryReason(entry))
    .map((entry) => retrySyncEvent(entry.id));
}

export function isSyncRetryAllowed(record) {
  return canRetryReason(normalizeQueueItem(record || {}));
}

export function markSyncSucceeded(syncId, inventoryEventId, message = "Inventory Desktop receipt confirmed.") {
  return updateRecord(syncId, (entry) => ({
    ...entry,
    inventoryEventId,
    status: SYNC_STATUSES.SYNCED,
    statusLabel: labelFor(SYNC_STATUSES.SYNCED),
    failureReason: null,
    syncedAt: nowIso(),
    lastUpdatedAt: nowIso(),
    syncHistory: [hist(SYNC_STATUSES.SYNCED, message, { inventoryEventId }), ...(entry.syncHistory || [])],
  }));
}

export function markSyncFailed(syncId, reason = "Handoff failed.") {
  return updateRecord(syncId, (entry) => ({
    ...entry,
    status: SYNC_STATUSES.SYNC_FAILED,
    statusLabel: labelFor(SYNC_STATUSES.SYNC_FAILED),
    failureReason: reason,
    lastUpdatedAt: nowIso(),
    syncHistory: [hist(SYNC_STATUSES.SYNC_FAILED, reason), ...(entry.syncHistory || [])],
  }));
}

export function markSyncNeedsReview(syncId, reason = "Review required before Inventory applies the record.") {
  return updateRecord(syncId, (entry) => ({
    ...entry,
    status: SYNC_STATUSES.NEEDS_REVIEW,
    statusLabel: labelFor(SYNC_STATUSES.NEEDS_REVIEW),
    failureReason: reason,
    lastUpdatedAt: nowIso(),
    syncHistory: [hist(SYNC_STATUSES.NEEDS_REVIEW, reason), ...(entry.syncHistory || [])],
  }));
}

export function markSyncConflict(syncId, reason = "Conflict found. Needs review.", conflictType = "source_changed", serverSnapshot = null) {
  let result = null;
  const updated = getSyncQueue().map((entry) => {
    if (entry.id !== syncId && entry.queueId !== syncId) return entry;
    result = normalizeQueueItem({
      ...entry,
      status: SYNC_STATUSES.CONFLICT,
      statusLabel: labelFor(SYNC_STATUSES.CONFLICT),
      failureReason: reason,
      conflictType,
      serverSnapshot: serverSnapshot || entry.serverSnapshot || defaultServerSnapshot(entry),
      serverSnapshotHash: hashSnapshot(serverSnapshot || entry.serverSnapshot || defaultServerSnapshot(entry)),
      lastUpdatedAt: nowIso(),
      syncHistory: [hist(SYNC_STATUSES.CONFLICT, reason), ...(entry.syncHistory || [])],
    });
    return result;
  });
  write(updated);
  if (result) {
    recordSnapshotRows(result);
    recordConflict(result, conflictType, reason);
  }
  return result;
}

export function keepLocalAsEvidence(syncId, reason = "Preserved local evidence without overwrite.") {
  const actor = actorContext();
  const before = getSyncQueue().find((entry) => entry.id === syncId || entry.queueId === syncId);
  if (!before) return null;
  const next = updateRecord(syncId, (entry) => ({
    ...entry,
    status: SYNC_STATUSES.NEEDS_REVIEW,
    statusLabel: labelFor(SYNC_STATUSES.NEEDS_REVIEW),
    resolutionAction: "keep_local_as_evidence",
    resolutionReason: reason,
    resolvedBy: actor.actor_name,
    resolvedByRole: actor.actor_role,
    resolvedAt: nowIso(),
    lastUpdatedAt: nowIso(),
    syncHistory: [hist(SYNC_STATUSES.NEEDS_REVIEW, "Local snapshot preserved as secondary evidence. Server/source truth was not overwritten.", { resolutionReason: reason }), ...(entry.syncHistory || [])],
  }));
  recordResolutionEvent(next, before.status, SYNC_STATUSES.NEEDS_REVIEW, "keep_local_as_evidence", reason, "Evidence-only resolution; no inventory mutation.");
  return next;
}

export function refreshServerValue(syncId, reason = "Refreshed source snapshot from server/source value.") {
  const before = getSyncQueue().find((entry) => entry.id === syncId || entry.queueId === syncId);
  if (!before) return null;
  const serverSnapshot = before.serverSnapshot || defaultServerSnapshot(before);
  const next = updateRecord(syncId, (entry) => ({
    ...entry,
    serverSnapshot,
    serverSnapshotHash: hashSnapshot(serverSnapshot),
    status: SYNC_STATUSES.NEEDS_REVIEW,
    statusLabel: labelFor(SYNC_STATUSES.NEEDS_REVIEW),
    resolutionAction: "refresh_server_value",
    resolutionReason: reason,
    lastUpdatedAt: nowIso(),
    syncHistory: [hist(SYNC_STATUSES.NEEDS_REVIEW, "Server/source display snapshot refreshed. Original local snapshot remains in history.", { resolutionReason: reason, previousLocalSnapshotHash: entry.localSnapshotHash }), ...(entry.syncHistory || [])],
  }));
  recordSnapshotRows(next);
  recordResolutionEvent(next, before.status, SYNC_STATUSES.NEEDS_REVIEW, "refresh_server_value", reason, "Display snapshot refreshed only; no source overwrite.");
  return next;
}

export function discardLocalDraft(syncId, reason = "Discarded by operator.") {
  const actor = actorContext();
  const before = getSyncQueue().find((entry) => entry.id === syncId || entry.queueId === syncId);
  if (!before) return null;
  const next = updateRecord(syncId, (entry) => ({
    ...entry,
    status: SYNC_STATUSES.DISCARDED,
    statusLabel: labelFor(SYNC_STATUSES.DISCARDED),
    resolutionAction: "discard_local_draft",
    resolutionReason: reason,
    resolvedBy: actor.actor_name,
    resolvedByRole: actor.actor_role,
    resolvedAt: nowIso(),
    lastUpdatedAt: nowIso(),
    syncHistory: [hist(SYNC_STATUSES.DISCARDED, "Local draft discarded with reason. Audit evidence preserved.", { resolutionReason: reason }), ...(entry.syncHistory || [])],
  }));
  recordResolutionEvent(next, before.status, SYNC_STATUSES.DISCARDED, "discard_local_draft", reason, "Discarded record stays visible in Discarded history.");
  return next;
}

export function keepDuplicateAsSeparateEvidence(syncId, reason = "Kept as separate evidence for review.") {
  const actor = actorContext();
  if (!['Supervisor', 'Manager', 'Admin'].includes(actor.actor_role)) return null;
  const before = getSyncQueue().find((entry) => entry.id === syncId || entry.queueId === syncId);
  if (!before) return null;
  const next = updateRecord(syncId, (entry) => ({
    ...entry,
    status: SYNC_STATUSES.NEEDS_REVIEW,
    statusLabel: labelFor(SYNC_STATUSES.NEEDS_REVIEW),
    duplicateOfSyncId: null,
    resolutionAction: "keep_duplicate_as_separate_evidence",
    resolutionReason: reason,
    resolvedBy: actor.actor_name,
    resolvedByRole: actor.actor_role,
    resolvedAt: nowIso(),
    lastUpdatedAt: nowIso(),
    syncHistory: [hist(SYNC_STATUSES.NEEDS_REVIEW, "Duplicate retained as separate evidence for review. No source value changed.", { resolutionReason: reason }), ...(entry.syncHistory || [])],
  }));
  recordResolutionEvent(next, before.status, SYNC_STATUSES.NEEDS_REVIEW, "keep_duplicate_as_separate_evidence", reason, "Role-gated duplicate separation.");
  return next;
}

export function escalateSyncItem(syncId, reason = "Escalated from Sync Queue.") {
  const actor = actorContext();
  const before = getSyncQueue().find((entry) => entry.id === syncId || entry.queueId === syncId);
  if (!before) return null;
  const next = updateRecord(syncId, (entry) => ({
    ...entry,
    status: SYNC_STATUSES.ESCALATED,
    statusLabel: labelFor(SYNC_STATUSES.ESCALATED),
    resolutionAction: "escalate",
    resolutionReason: reason,
    resolvedBy: actor.actor_name,
    resolvedByRole: actor.actor_role,
    resolvedAt: nowIso(),
    lastUpdatedAt: nowIso(),
    syncHistory: [hist(SYNC_STATUSES.ESCALATED, "Escalated for supervisor/manager review. Stage X task linked or updated.", { resolutionReason: reason }), ...(entry.syncHistory || [])],
  }));

  const taskResult = upsertDerivedTaskFromSource({
    taskType: TASK_TYPES.SYNC_QUEUE,
    task_kind: next.status === SYNC_STATUSES.DUPLICATE ? "duplicate_sync_evidence_review" : "sync_conflict_review",
    priority: next.failureReason === SYNC_FAILURE_REASONS.PERMISSION_DENIED ? TASK_PRIORITIES.HIGH : TASK_PRIORITIES.MEDIUM,
    status: TASK_STATUSES.ESCALATED,
    due_state: TASK_DUE_STATES.TODAY,
    title: taskTitleFor(before),
    description: taskDescriptionFor(before, reason),
    action_needed: "Review the Sync Queue evidence. Do not approve inventory movement, create products, close receiving/transfer records, or overwrite source truth from this task.",
    evidence_required: "Resolution note",
    source_type: "sync_queue_item",
    source_id: next.id,
    source_ref: next.sourceRef || next.sourceRequestId,
    source_module: "Sync Queue",
    source_status_snapshot: next.statusLabel,
    source_item_snapshot: {
      title: next.title,
      workflow: next.sourceWorkflow,
      local_snapshot_hash: next.localSnapshotHash,
      server_snapshot_hash: next.serverSnapshotHash,
      failure_reason: next.failureReason,
      conflict_type: next.conflictType,
      duplicate_of_sync_id: next.duplicateOfSyncId,
    },
    assigned_department: actor.department || "Manager Review",
    assigned_role: actor.actor_role === "Staff" ? "Supervisor" : actor.actor_role,
    assigned_user_id: "team",
    assigned_user_name: `${actor.department || "Store"} Review Team`,
    linkedWorkflow: "/sync-queue",
    linkedWorkflowLabel: "Sync Queue conflict",
    linkedContext: { syncItemId: next.id, syncStatus: next.status },
    created_by: actor.actor_name,
    created_by_role: actor.actor_role,
  });

  const withTaskLink = updateRecord(syncId, (entry) => ({
    ...entry,
    linkedTaskId: taskResult?.task?.taskId || entry.linkedTaskId || null,
    linkedTaskRef: taskResult?.task?.task_ref || entry.linkedTaskRef || null,
    syncHistory: taskResult?.task
      ? [hist(SYNC_STATUSES.ESCALATED, `Linked Stage X task ${taskResult.task.task_ref}.`, { taskId: taskResult.task.taskId }), ...(entry.syncHistory || [])]
      : entry.syncHistory,
  })) || next;

  recordResolutionEvent(withTaskLink, before.status, SYNC_STATUSES.ESCALATED, "escalate", reason, withTaskLink.linkedTaskRef ? `Linked ${withTaskLink.linkedTaskRef}` : "Task link unavailable");
  return withTaskLink;
}

export function resetSyncQueue() {
  write([]);
  writeKey(ATTEMPTS_KEY, []);
  writeKey(CONFLICTS_KEY, []);
  writeKey(RESOLUTION_EVENTS_KEY, []);
  writeKey(LOCAL_HASHES_KEY, []);
  writeKey(SERVER_REFS_KEY, []);
  return [];
}

// ── Phase 1B: Bridge Outbox Replay & Receipt Handling ────────────────────────
//
// HARD RULES:
//   - No stock mutation, no price mutation, no StockMovement, no POSLineItem.
//   - ScanOps remains capture-only. Inventory decides what events mean.
//   - All outbox mutations go through updateOutboxEventSyncMeta() only.
//   - Immutable fields (event_id, event_type, payload, payload_hash,
//     captured_at, inventory_snapshot_*) are never touched.

/**
 * Collect and sort bridge outbox events eligible for replay.
 *
 * Eligible statuses: QUEUED, FAILED_RETRYABLE.
 * SENDING is eligible only if stuck beyond STUCK_SENDING_TIMEOUT_MS (10 min).
 * All other statuses (ACKED, DUPLICATE_ACKED, HELD, REJECTED,
 * FAILED_TERMINAL, QUARANTINED) are excluded from replay.
 *
 * Ordering: created_at ASC → captured_at ASC → event_id ASC (deterministic).
 *
 * @returns {Promise<{ ok: boolean, queued: object[], skipped: object[], errors: string[] }>}
 */
export async function replayBridgeOutboxEvents() {
  let allEvents;
  try {
    allEvents = await getOutboxEvents();
  } catch (err) {
    return { ok: false, queued: [], skipped: [], errors: [`getOutboxEvents failed: ${err?.message}`] };
  }

  const eligible = [];
  const skipped = [];

  for (const event of allEvents) {
    if (isReplayEligible(event)) {
      eligible.push(event);
    } else {
      skipped.push({ event_id: event.event_id, sync_status: event.sync_status, reason: "ineligible_status" });
    }
  }

  // Sort deterministically before replay
  eligible.sort(replayOrderComparator);

  // For each stuck-SENDING event: reset to QUEUED before replay attempt
  // (conservative — only if past timeout)
  const resetErrors = [];
  for (const event of eligible) {
    if (isStuckSending(event)) {
      try {
        await updateOutboxEventSyncMeta(event.event_id, buildOutboxSyncMetaPatch({
          sync_status: OUTBOX_SYNC_STATUS.QUEUED,
          last_error_code: "STUCK_SENDING_RESET",
          last_error_message: "Event was stuck in SENDING beyond timeout. Reset to QUEUED for replay.",
        }));
      } catch (resetErr) {
        resetErrors.push(`Reset failed for ${event.event_id}: ${resetErr?.message}`);
      }
    }
  }

  // Mark each eligible event as SENDING (sync metadata update only — immutable fields untouched)
  const sendingErrors = [];
  const queued = [];
  for (const event of eligible) {
    try {
      await updateOutboxEventSyncMeta(event.event_id, buildOutboxSyncMetaPatch({
        sync_status: OUTBOX_SYNC_STATUS.SENDING,
        sync_attempt_count: (event.sync_attempt_count ?? 0) + 1,
        last_sync_attempt_at: nowIso(),
      }));
      queued.push({ event_id: event.event_id, event_type: event.event_type, sync_status: OUTBOX_SYNC_STATUS.SENDING });
    } catch (sendErr) {
      sendingErrors.push(`Mark SENDING failed for ${event.event_id}: ${sendErr?.message}`);
    }
  }

  const errors = [...resetErrors, ...sendingErrors];
  return { ok: errors.length === 0, queued, skipped, errors };
}

/**
 * Apply a validated receipt envelope to an outbox event.
 *
 * Updates sync metadata only. Immutable fields are never written.
 * If the resulting status is terminal and archive-eligible, triggers
 * archiveOutboxEventToHistory() with the lossless safety protocol.
 *
 * @param {string} eventId
 * @param {object} receipt — validated receipt envelope from Inventory
 * @returns {Promise<{ ok: boolean, outboxStatus: string, archived: boolean, error?: string }>}
 */
export async function applyReceiptToOutboxEvent(eventId, receipt) {
  const existing = await getOutboxEvent(eventId);
  if (!existing) {
    return { ok: false, outboxStatus: null, archived: false, error: `Event ${eventId} not found in outbox.` };
  }

  // Determine the correct outbox status from the receipt
  let outboxStatus;
  if (receipt.status === RECEIPT_STATUS.REJECTED_STALE_SNAPSHOT) {
    // Event-type dependent — use bridge event_type from the outbox record
    outboxStatus = mapStaleSnapshotReceiptByEventType(existing.event_type);
  } else {
    outboxStatus = mapReceiptToOutboxStatus(receipt.status);
  }

  // Build the safe metadata patch (allowed mutable fields only)
  const patch = buildOutboxSyncMetaPatch({
    sync_status: outboxStatus,
    receipt_id: receipt.receipt_id || null,
    receipt_status: receipt.status,
    receipt_received_at: receipt.inventory_received_at || nowIso(),
    inventory_ack_ref: receipt.linked_workflow_ref || null,
    last_error_code: outboxStatus === OUTBOX_SYNC_STATUS.FAILED_RETRYABLE
      || outboxStatus === OUTBOX_SYNC_STATUS.FAILED_TERMINAL
      || outboxStatus === OUTBOX_SYNC_STATUS.REJECTED
      ? (receipt.decision_code || receipt.status) : null,
    last_error_message: receipt.decision_message || null,
  });

  try {
    await updateOutboxEventSyncMeta(eventId, patch);
  } catch (updateErr) {
    return { ok: false, outboxStatus, archived: false, error: `Metadata update failed: ${updateErr?.message}` };
  }

  // Archive terminal events to sync_history using lossless protocol
  let archived = false;
  if (RETAINED_OUTBOX_STATUSES.has(outboxStatus) && isTerminalOutboxStatus(outboxStatus)) {
    const archiveResult = await archiveOutboxEventToHistory(eventId, outboxStatus);
    archived = archiveResult?.ok === true;
    if (!archiveResult?.ok) {
      // Non-fatal — outbox event is updated correctly; archive can be retried
      console.warn(`[ScanOps Bridge] Archive to sync_history failed for ${eventId}:`, archiveResult?.error);
    }
  }

  return { ok: true, outboxStatus, archived };
}

/**
 * Process an incoming Inventory receipt envelope.
 *
 * Entry point for future Inventory ingestion receipts.
 * Validates the receipt, resolves the outbox event, applies the receipt,
 * and handles Duplicate ACK as a special non-error terminal state.
 *
 * @param {object} receipt — Inventory receipt envelope
 * @returns {Promise<{ ok: boolean, event_id: string, outboxStatus: string, archived: boolean, errors: string[] }>}
 */
export async function processSyncReceipt(receipt) {
  const validationErrors = validateReceiptEnvelope(receipt);
  if (validationErrors.length > 0) {
    return { ok: false, event_id: receipt?.event_id || null, outboxStatus: null, archived: false, errors: validationErrors };
  }

  const { event_id } = receipt;

  // Special handling: ACK_DUPLICATE is not an error — do not replay, do not create correction
  if (receipt.status === RECEIPT_STATUS.ACK_DUPLICATE) {
    const existing = await getOutboxEvent(event_id);
    if (!existing) {
      // Already archived or unknown — treat as safe
      return { ok: true, event_id, outboxStatus: OUTBOX_SYNC_STATUS.DUPLICATE_ACKED, archived: false, errors: [] };
    }

    const patch = buildOutboxSyncMetaPatch({
      sync_status: OUTBOX_SYNC_STATUS.DUPLICATE_ACKED,
      receipt_id: receipt.receipt_id || null,
      receipt_status: receipt.status,
      receipt_received_at: receipt.inventory_received_at || nowIso(),
      inventory_ack_ref: receipt.linked_workflow_ref || null,
    });

    try {
      await updateOutboxEventSyncMeta(event_id, patch);
    } catch (err) {
      return { ok: false, event_id, outboxStatus: OUTBOX_SYNC_STATUS.DUPLICATE_ACKED, archived: false, errors: [`Duplicate ACK metadata update failed: ${err?.message}`] };
    }

    // DUPLICATE_ACKED is terminal → archive
    const archiveResult = await archiveOutboxEventToHistory(event_id, OUTBOX_SYNC_STATUS.DUPLICATE_ACKED);
    return {
      ok: true,
      event_id,
      outboxStatus: OUTBOX_SYNC_STATUS.DUPLICATE_ACKED,
      archived: archiveResult?.ok === true,
      errors: [],
    };
  }

  // General receipt application
  const result = await applyReceiptToOutboxEvent(event_id, receipt);
  return {
    ok: result.ok,
    event_id,
    outboxStatus: result.outboxStatus,
    archived: result.archived,
    errors: result.error ? [result.error] : [],
  };
}