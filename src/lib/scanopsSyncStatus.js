/**
 * scanopsSyncStatus.js — Phase 1A
 *
 * Receipt status mapping helpers for the ScanOps ↔ Inventory Bridge v1.
 *
 * Defines all statuses that the Inventory ingestion layer may return,
 * plus helpers to map receipts into ScanOps outbox/queue state.
 *
 * This module contains mapping helpers only.
 * The full Inventory ingestion connection is Phase 1B+.
 *
 * HARD RULES:
 *   - No stock mutation.
 *   - No price mutation.
 *   - No StockMovement or POSLineItem creation.
 */

// ── Outbound outbox sync statuses ────────────────────────────────────────────

export const OUTBOX_SYNC_STATUS = {
  QUEUED:            "QUEUED",
  SENDING:           "SENDING",
  ACKED:             "ACKED",
  DUPLICATE_ACKED:   "DUPLICATE_ACKED",
  HELD:              "HELD",
  REJECTED:          "REJECTED",
  FAILED_RETRYABLE:  "FAILED_RETRYABLE",
  FAILED_TERMINAL:   "FAILED_TERMINAL",
  QUARANTINED:       "QUARANTINED",
};

// ── Inventory receipt decision codes ─────────────────────────────────────────

export const RECEIPT_STATUS = {
  ACK_RECEIVED:              "ACK_RECEIVED",
  ACK_PROCESSED:             "ACK_PROCESSED",
  ACK_DUPLICATE:             "ACK_DUPLICATE",
  HELD_FOR_REVIEW:           "HELD_FOR_REVIEW",
  REJECTED_SCHEMA:           "REJECTED_SCHEMA",
  REJECTED_AUTH:             "REJECTED_AUTH",
  REJECTED_STALE_SNAPSHOT:   "REJECTED_STALE_SNAPSHOT",
  REJECTED_CONFLICT:         "REJECTED_CONFLICT",
  FAILED_RETRYABLE:          "FAILED_RETRYABLE",
  FAILED_TERMINAL:           "FAILED_TERMINAL",
};

// ── Labels for UI display ────────────────────────────────────────────────────

export const OUTBOX_STATUS_LABELS = {
  [OUTBOX_SYNC_STATUS.QUEUED]:           "Queued — waiting for sync",
  [OUTBOX_SYNC_STATUS.SENDING]:          "Sending to Inventory",
  [OUTBOX_SYNC_STATUS.ACKED]:            "Acknowledged by Inventory",
  [OUTBOX_SYNC_STATUS.DUPLICATE_ACKED]:  "Duplicate — previous ACK returned",
  [OUTBOX_SYNC_STATUS.HELD]:             "Held for Inventory review",
  [OUTBOX_SYNC_STATUS.REJECTED]:         "Rejected by Inventory",
  [OUTBOX_SYNC_STATUS.FAILED_RETRYABLE]: "Failed — will retry",
  [OUTBOX_SYNC_STATUS.FAILED_TERMINAL]:  "Failed — manual resolution required",
  [OUTBOX_SYNC_STATUS.QUARANTINED]:      "Quarantined — admin action required",
};

export const RECEIPT_STATUS_LABELS = {
  [RECEIPT_STATUS.ACK_RECEIVED]:            "Received by Inventory",
  [RECEIPT_STATUS.ACK_PROCESSED]:           "Processed by Inventory",
  [RECEIPT_STATUS.ACK_DUPLICATE]:           "Duplicate — original ACK returned",
  [RECEIPT_STATUS.HELD_FOR_REVIEW]:         "Held for Inventory review",
  [RECEIPT_STATUS.REJECTED_SCHEMA]:         "Rejected — schema mismatch",
  [RECEIPT_STATUS.REJECTED_AUTH]:           "Rejected — auth / device not trusted",
  [RECEIPT_STATUS.REJECTED_STALE_SNAPSHOT]: "Rejected — stale inventory snapshot",
  [RECEIPT_STATUS.REJECTED_CONFLICT]:       "Rejected — event conflict",
  [RECEIPT_STATUS.FAILED_RETRYABLE]:        "Failed — retryable",
  [RECEIPT_STATUS.FAILED_TERMINAL]:         "Failed — terminal",
};

// ── Terminal statuses (no further retry allowed) ──────────────────────────────

const TERMINAL_OUTBOX_STATUSES = new Set([
  OUTBOX_SYNC_STATUS.ACKED,
  OUTBOX_SYNC_STATUS.DUPLICATE_ACKED,
  OUTBOX_SYNC_STATUS.FAILED_TERMINAL,
  OUTBOX_SYNC_STATUS.QUARANTINED,
  OUTBOX_SYNC_STATUS.REJECTED,
]);

// Retrying after HELD is allowed — Inventory may re-evaluate
const RETRYABLE_OUTBOX_STATUSES = new Set([
  OUTBOX_SYNC_STATUS.QUEUED,
  OUTBOX_SYNC_STATUS.FAILED_RETRYABLE,
  OUTBOX_SYNC_STATUS.HELD,
]);

// Statuses retained in sync_history (all non-transient)
export const RETAINED_OUTBOX_STATUSES = new Set([
  OUTBOX_SYNC_STATUS.ACKED,
  OUTBOX_SYNC_STATUS.DUPLICATE_ACKED,
  OUTBOX_SYNC_STATUS.REJECTED,
  OUTBOX_SYNC_STATUS.FAILED_TERMINAL,
  OUTBOX_SYNC_STATUS.QUARANTINED,
  OUTBOX_SYNC_STATUS.HELD,
]);

/**
 * Map an Inventory receipt status to the corresponding ScanOps outbox sync status.
 * Used when Inventory returns a receipt in Phase 1B+.
 *
 * @param {string} receiptStatus — from RECEIPT_STATUS
 * @returns {string} — from OUTBOX_SYNC_STATUS
 */
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
      // Stale snapshot for markdown requests → HELD so Inventory can decide
      // Stale snapshot for approvals/rejections → treat as REJECTED (caller should check event_type)
      return OUTBOX_SYNC_STATUS.HELD;

    case RECEIPT_STATUS.FAILED_RETRYABLE:
      return OUTBOX_SYNC_STATUS.FAILED_RETRYABLE;

    case RECEIPT_STATUS.FAILED_TERMINAL:
      return OUTBOX_SYNC_STATUS.FAILED_TERMINAL;

    default:
      return OUTBOX_SYNC_STATUS.FAILED_RETRYABLE;
  }
}

/**
 * Map a stale-snapshot receipt to the correct outbox status,
 * accounting for event-type-specific rules (Correction 1).
 *
 * @param {string} bridgeEventType — from BRIDGE_EVENT_TYPES
 * @returns {string} — from OUTBOX_SYNC_STATUS
 */
export function mapStaleSnapshotReceiptByEventType(bridgeEventType) {
  switch (bridgeEventType) {
    case "scanops.markdown.requested":
      return OUTBOX_SYNC_STATUS.HELD; // HELD_FOR_REVIEW — standard for requests

    case "scanops.markdown.approved":
      return OUTBOX_SYNC_STATUS.REJECTED; // Stricter for approvals

    case "scanops.markdown.returned":
      return OUTBOX_SYNC_STATUS.HELD; // Accepted as evidence with flag

    case "scanops.markdown.rejected":
      return OUTBOX_SYNC_STATUS.ACKED; // Generally safe if linked request exists

    case "scanops.markdown.handoff.created":
      return OUTBOX_SYNC_STATUS.HELD; // Hold for review

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

/**
 * Build a safe sync metadata update for an outbox record.
 * Only allowed mutable fields are included — original payload/evidence not touched.
 *
 * IMMUTABILITY CONTRACT:
 *   Do NOT pass event_id, event_type, payload, payload_hash,
 *   captured_at, inventory_snapshot_ref, inventory_snapshot_hash,
 *   inventory_record_version to this function.
 *
 * @param {object} options
 * @returns {object} Safe sync metadata patch
 */
export function buildOutboxSyncMetaPatch({
  sync_status,
  sync_attempt_count,
  last_sync_attempt_at,
  receipt_id,
  receipt_status,
  last_error_code,
  last_error_message,
}) {
  return {
    // Allowed mutable fields only
    ...(sync_status !== undefined && { sync_status }),
    ...(sync_attempt_count !== undefined && { sync_attempt_count }),
    ...(last_sync_attempt_at !== undefined && { last_sync_attempt_at }),
    ...(receipt_id !== undefined && { receipt_id }),
    ...(receipt_status !== undefined && { receipt_status }),
    ...(last_error_code !== undefined && { last_error_code }),
    ...(last_error_message !== undefined && { last_error_message }),
    last_sync_meta_updated_at: new Date().toISOString(),
  };
}