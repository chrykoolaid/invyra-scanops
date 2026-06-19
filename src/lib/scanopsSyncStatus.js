/**
 * scanopsSyncStatus.js — ScanOps ↔ Inventory Bridge v1 status helpers.
 *
 * Guardrails:
 * - No stock, price, POS, order, forecast, Item Master, StockMovement, or POSLineItem mutation.
 * - HELD means pending review. It is not auto-replayable and is not archived to sync_history.
 */

export const OUTBOX_SYNC_STATUS = {
  QUEUED: "QUEUED",
  SENDING: "SENDING",
  ACKED: "ACKED",
  DUPLICATE_ACKED: "DUPLICATE_ACKED",
  HELD: "HELD",
  REJECTED: "REJECTED",
  FAILED_RETRYABLE: "FAILED_RETRYABLE",
  FAILED_TERMINAL: "FAILED_TERMINAL",
  QUARANTINED: "QUARANTINED",
};

export const RECEIPT_STATUS = {
  ACK_RECEIVED: "ACK_RECEIVED",
  ACK_PROCESSED: "ACK_PROCESSED",
  ACK_DUPLICATE: "ACK_DUPLICATE",
  HELD_FOR_REVIEW: "HELD_FOR_REVIEW",
  REJECTED_SCHEMA: "REJECTED_SCHEMA",
  REJECTED_AUTH: "REJECTED_AUTH",
  REJECTED_STALE_SNAPSHOT: "REJECTED_STALE_SNAPSHOT",
  REJECTED_CONFLICT: "REJECTED_CONFLICT",
  FAILED_RETRYABLE: "FAILED_RETRYABLE",
  FAILED_TERMINAL: "FAILED_TERMINAL",
  QUARANTINED: "QUARANTINED",
};

export const OUTBOX_STATUS_LABELS = {
  [OUTBOX_SYNC_STATUS.QUEUED]: "Queued — waiting for sync",
  [OUTBOX_SYNC_STATUS.SENDING]: "Sending to Inventory",
  [OUTBOX_SYNC_STATUS.ACKED]: "Acknowledged by Inventory",
  [OUTBOX_SYNC_STATUS.DUPLICATE_ACKED]: "Duplicate — previous ACK returned",
  [OUTBOX_SYNC_STATUS.HELD]: "Held for Inventory review",
  [OUTBOX_SYNC_STATUS.REJECTED]: "Rejected by Inventory",
  [OUTBOX_SYNC_STATUS.FAILED_RETRYABLE]: "Failed — will retry",
  [OUTBOX_SYNC_STATUS.FAILED_TERMINAL]: "Failed — manual resolution required",
  [OUTBOX_SYNC_STATUS.QUARANTINED]: "Quarantined — admin action required",
};

export const RECEIPT_STATUS_LABELS = {
  [RECEIPT_STATUS.ACK_RECEIVED]: "Received by Inventory",
  [RECEIPT_STATUS.ACK_PROCESSED]: "Processed by Inventory",
  [RECEIPT_STATUS.ACK_DUPLICATE]: "Duplicate — original ACK returned",
  [RECEIPT_STATUS.HELD_FOR_REVIEW]: "Held for Inventory review",
  [RECEIPT_STATUS.REJECTED_SCHEMA]: "Rejected — schema mismatch",
  [RECEIPT_STATUS.REJECTED_AUTH]: "Rejected — auth / device not trusted",
  [RECEIPT_STATUS.REJECTED_STALE_SNAPSHOT]: "Rejected — stale inventory snapshot",
  [RECEIPT_STATUS.REJECTED_CONFLICT]: "Rejected — event conflict",
  [RECEIPT_STATUS.FAILED_RETRYABLE]: "Failed — retryable",
  [RECEIPT_STATUS.FAILED_TERMINAL]: "Failed — terminal",
  [RECEIPT_STATUS.QUARANTINED]: "Quarantined — admin action required",
};

const TERMINAL_OUTBOX_STATUSES = new Set([
  OUTBOX_SYNC_STATUS.ACKED,
  OUTBOX_SYNC_STATUS.DUPLICATE_ACKED,
  OUTBOX_SYNC_STATUS.FAILED_TERMINAL,
  OUTBOX_SYNC_STATUS.QUARANTINED,
  OUTBOX_SYNC_STATUS.REJECTED,
]);

const RETRYABLE_OUTBOX_STATUSES = new Set([
  OUTBOX_SYNC_STATUS.QUEUED,
  OUTBOX_SYNC_STATUS.FAILED_RETRYABLE,
]);

export const RETAINED_OUTBOX_STATUSES = new Set([
  OUTBOX_SYNC_STATUS.ACKED,
  OUTBOX_SYNC_STATUS.DUPLICATE_ACKED,
  OUTBOX_SYNC_STATUS.REJECTED,
  OUTBOX_SYNC_STATUS.FAILED_TERMINAL,
  OUTBOX_SYNC_STATUS.QUARANTINED,
]);

export function mapReceiptToOutboxStatus(receiptStatus) {
  switch (receiptStatus) {
    case RECEIPT_STATUS.ACK_RECEIVED:
    case RECEIPT_STATUS.ACK_PROCESSED:
      return OUTBOX_SYNC_STATUS.ACKED;
    case RECEIPT_STATUS.ACK_DUPLICATE:
      return OUTBOX_SYNC_STATUS.DUPLICATE_ACKED;
    case RECEIPT_STATUS.HELD_FOR_REVIEW:
      return OUTBOX_SYNC_STATUS.HELD;
    case RECEIPT_STATUS.REJECTED_SCHEMA:
    case RECEIPT_STATUS.REJECTED_AUTH:
    case RECEIPT_STATUS.REJECTED_CONFLICT:
      return OUTBOX_SYNC_STATUS.REJECTED;
    case RECEIPT_STATUS.REJECTED_STALE_SNAPSHOT:
      return OUTBOX_SYNC_STATUS.HELD;
    case RECEIPT_STATUS.FAILED_RETRYABLE:
      return OUTBOX_SYNC_STATUS.FAILED_RETRYABLE;
    case RECEIPT_STATUS.FAILED_TERMINAL:
      return OUTBOX_SYNC_STATUS.FAILED_TERMINAL;
    case RECEIPT_STATUS.QUARANTINED:
      return OUTBOX_SYNC_STATUS.QUARANTINED;
    default:
      return OUTBOX_SYNC_STATUS.FAILED_RETRYABLE;
  }
}

export function mapStaleSnapshotReceiptByEventType(bridgeEventType) {
  switch (bridgeEventType) {
    case "scanops.markdown.requested":
      return OUTBOX_SYNC_STATUS.HELD;
    case "scanops.markdown.approved":
      return OUTBOX_SYNC_STATUS.REJECTED;
    case "scanops.markdown.returned":
      return OUTBOX_SYNC_STATUS.HELD;
    case "scanops.markdown.rejected":
      return OUTBOX_SYNC_STATUS.ACKED;
    case "scanops.markdown.handoff.created":
      return OUTBOX_SYNC_STATUS.HELD;
    default:
      return OUTBOX_SYNC_STATUS.HELD;
  }
}

export function isTerminalOutboxStatus(status) {
  return TERMINAL_OUTBOX_STATUSES.has(status);
}

export function isRetryableOutboxStatus(status) {
  return RETRYABLE_OUTBOX_STATUSES.has(status);
}

export function getOutboxStatusLabel(status) {
  return OUTBOX_STATUS_LABELS[status] || "Unknown sync status";
}

export function getReceiptStatusLabel(receiptStatus) {
  return RECEIPT_STATUS_LABELS[receiptStatus] || "Unknown receipt status";
}

export function buildOutboxSyncMetaPatch({
  sync_status,
  sync_attempt_count,
  last_sync_attempt_at,
  receipt_id,
  receipt_status,
  receipt_received_at,
  inventory_ack_ref,
  last_error_code,
  last_error_message,
}) {
  return {
    ...(sync_status !== undefined && { sync_status }),
    ...(sync_attempt_count !== undefined && { sync_attempt_count }),
    ...(last_sync_attempt_at !== undefined && { last_sync_attempt_at }),
    ...(receipt_id !== undefined && { receipt_id }),
    ...(receipt_status !== undefined && { receipt_status }),
    ...(receipt_received_at !== undefined && { receipt_received_at }),
    ...(inventory_ack_ref !== undefined && { inventory_ack_ref }),
    ...(last_error_code !== undefined && { last_error_code }),
    ...(last_error_message !== undefined && { last_error_message }),
    last_sync_meta_updated_at: new Date().toISOString(),
  };
}

export const REPLAY_ELIGIBLE_STATUSES = new Set([
  OUTBOX_SYNC_STATUS.QUEUED,
  OUTBOX_SYNC_STATUS.FAILED_RETRYABLE,
]);

export const STUCK_SENDING_TIMEOUT_MS = 10 * 60 * 1000;

export function isStuckSending(event) {
  if (event?.sync_status !== OUTBOX_SYNC_STATUS.SENDING) return false;
  const attemptedAt = event.last_sync_attempt_at;
  if (!attemptedAt) return true;
  const elapsed = Date.now() - new Date(attemptedAt).getTime();
  return elapsed > STUCK_SENDING_TIMEOUT_MS;
}

export function isReplayEligible(event) {
  if (!event?.event_id) return false;
  if (REPLAY_ELIGIBLE_STATUSES.has(event.sync_status)) return true;
  if (isStuckSending(event)) return true;
  return false;
}

export function replayOrderComparator(a, b) {
  const toMs = (value) => (value ? new Date(value).getTime() : 0);
  const aCreated = toMs(a.created_at);
  const bCreated = toMs(b.created_at);
  if (aCreated !== bCreated) return aCreated - bCreated;
  const aCaptured = toMs(a.captured_at);
  const bCaptured = toMs(b.captured_at);
  if (aCaptured !== bCaptured) return aCaptured - bCaptured;
  const aId = String(a.event_id || "");
  const bId = String(b.event_id || "");
  return aId < bId ? -1 : aId > bId ? 1 : 0;
}

const VALID_RECEIPT_STATUSES = new Set(Object.values(RECEIPT_STATUS));

export function validateReceiptEnvelope(receipt) {
  const errors = [];
  if (!receipt?.receipt_id) errors.push("Missing receipt_id");
  if (!receipt?.event_id) errors.push("Missing event_id");
  if (!receipt?.status) errors.push("Missing status");
  if (receipt?.status && !VALID_RECEIPT_STATUSES.has(receipt.status)) {
    errors.push(`Unknown receipt status: ${receipt.status}`);
  }
  return errors;
}
