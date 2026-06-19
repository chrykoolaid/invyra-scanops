/**
 * syncIngestionConstants.js — Phase 1C-A
 *
 * Vocabulary constants for the Inventory-side ScanOps bridge ingestion ledger.
 *
 * Phase 1C-A scope: constants/schema only.
 * No ingestion business logic. No routing logic. No transport.
 *
 * HARD RULES:
 *   - No StockMovement creation.
 *   - No Item Master pricing mutation.
 *   - No POSLineItem creation.
 *   - No purchase order creation or mutation.
 *   - No forecasting calls.
 *   - No multi-location sync logic.
 *   - ScanOps events are evidence records only.
 */

// ── ScanOps bridge event types supported in Phase 1C ─────────────────────────
// Only markdown workflow events are in scope for Phase 1C.
// Do not add stock, transfer, POS, or ordering event types here.

export const SCANOPS_BRIDGE_EVENT_TYPES = {
  MARKDOWN_REQUESTED:    "scanops.markdown.requested",
  MARKDOWN_APPROVED:     "scanops.markdown.approved",
  MARKDOWN_RETURNED:     "scanops.markdown.returned",
  MARKDOWN_REJECTED:     "scanops.markdown.rejected",
  MARKDOWN_HANDOFF:      "scanops.markdown.handoff.created",
};

export const SCANOPS_BRIDGE_EVENT_TYPE_VALUES = new Set(
  Object.values(SCANOPS_BRIDGE_EVENT_TYPES)
);

// ── InventorySyncInboundEvent statuses ────────────────────────────────────────
// Lifecycle of an inbound event through the Inventory ingestion ledger.
// Conflict and quarantine are expressed as status values — no separate entity.

export const INVENTORY_SYNC_INBOUND_STATUS = {
  // Transient states
  RECEIVED:                "RECEIVED",       // Event received; ledger record written; not yet validated
  VALIDATING:              "VALIDATING",     // Validation in progress

  // Terminal — positive
  PROCESSED:               "PROCESSED",      // Successfully validated and routed

  // Terminal — held/review
  HELD_FOR_REVIEW:         "HELD_FOR_REVIEW",// Held pending manual review or release; not auto-retried

  // Terminal — rejected
  REJECTED_SCHEMA:         "REJECTED_SCHEMA",        // Event envelope failed schema validation
  REJECTED_AUTH:           "REJECTED_AUTH",           // Unknown device, session, or unauthorized role
  REJECTED_STALE_SNAPSHOT: "REJECTED_STALE_SNAPSHOT", // Inventory snapshot evidence is too stale
  REJECTED_CONFLICT:       "REJECTED_CONFLICT",       // Same event_id with different payload_hash

  // Terminal — failure
  FAILED_RETRYABLE:        "FAILED_RETRYABLE",// Transient failure; ScanOps may replay
  FAILED_TERMINAL:         "FAILED_TERMINAL", // Permanent failure; manual resolution required

  // Special
  QUARANTINED:             "QUARANTINED",    // Admin hold; event requires elevated review
  DUPLICATE:               "DUPLICATE",      // Exact duplicate of a previously processed event (idempotency hit)
};

// Set of statuses that represent a held-or-pending state (not yet fully resolved)
export const INBOUND_STATUS_PENDING = new Set([
  INVENTORY_SYNC_INBOUND_STATUS.RECEIVED,
  INVENTORY_SYNC_INBOUND_STATUS.VALIDATING,
  INVENTORY_SYNC_INBOUND_STATUS.HELD_FOR_REVIEW,
  INVENTORY_SYNC_INBOUND_STATUS.FAILED_RETRYABLE,
]);

// Set of statuses that are fully terminal (no further ingestion processing)
export const INBOUND_STATUS_TERMINAL = new Set([
  INVENTORY_SYNC_INBOUND_STATUS.PROCESSED,
  INVENTORY_SYNC_INBOUND_STATUS.REJECTED_SCHEMA,
  INVENTORY_SYNC_INBOUND_STATUS.REJECTED_AUTH,
  INVENTORY_SYNC_INBOUND_STATUS.REJECTED_STALE_SNAPSHOT,
  INVENTORY_SYNC_INBOUND_STATUS.REJECTED_CONFLICT,
  INVENTORY_SYNC_INBOUND_STATUS.FAILED_TERMINAL,
  INVENTORY_SYNC_INBOUND_STATUS.QUARANTINED,
  INVENTORY_SYNC_INBOUND_STATUS.DUPLICATE,
]);

// ── InventorySyncReceipt statuses ─────────────────────────────────────────────
// Status vocabulary returned to ScanOps in the receipt envelope.
// ScanOps maps these to its internal OUTBOX_SYNC_STATUS values.

export const INVENTORY_SYNC_RECEIPT_STATUS = {
  ACK_RECEIVED:              "ACK_RECEIVED",           // Event received and ledger record written
  ACK_PROCESSED:             "ACK_PROCESSED",          // Event fully processed and accepted
  ACK_DUPLICATE:             "ACK_DUPLICATE",          // Exact duplicate; original receipt returned
  HELD_FOR_REVIEW:           "HELD_FOR_REVIEW",        // Held; not auto-retried by ScanOps
  REJECTED_SCHEMA:           "REJECTED_SCHEMA",        // Schema validation failure
  REJECTED_AUTH:             "REJECTED_AUTH",          // Auth / device / role failure
  REJECTED_STALE_SNAPSHOT:   "REJECTED_STALE_SNAPSHOT",// Inventory snapshot evidence stale
  REJECTED_CONFLICT:         "REJECTED_CONFLICT",      // event_id conflict with different payload_hash
  FAILED_RETRYABLE:          "FAILED_RETRYABLE",       // Transient; ScanOps may replay
  FAILED_TERMINAL:           "FAILED_TERMINAL",        // Permanent failure
  QUARANTINED:               "QUARANTINED",            // Admin hold
};

// Receipt statuses that permit ScanOps to replay the event
export const RECEIPT_RETRY_ALLOWED = new Set([
  INVENTORY_SYNC_RECEIPT_STATUS.FAILED_RETRYABLE,
  // HELD_FOR_REVIEW: ScanOps does NOT auto-retry HELD events.
  // A future approved workflow must explicitly release the event back to QUEUED.
]);

// Receipt statuses that are terminal from ScanOps perspective
export const RECEIPT_STATUS_TERMINAL = new Set([
  INVENTORY_SYNC_RECEIPT_STATUS.ACK_PROCESSED,
  INVENTORY_SYNC_RECEIPT_STATUS.ACK_DUPLICATE,
  INVENTORY_SYNC_RECEIPT_STATUS.REJECTED_SCHEMA,
  INVENTORY_SYNC_RECEIPT_STATUS.REJECTED_AUTH,
  INVENTORY_SYNC_RECEIPT_STATUS.REJECTED_STALE_SNAPSHOT,
  INVENTORY_SYNC_RECEIPT_STATUS.REJECTED_CONFLICT,
  INVENTORY_SYNC_RECEIPT_STATUS.FAILED_TERMINAL,
  INVENTORY_SYNC_RECEIPT_STATUS.QUARANTINED,
]);

// ── Stale snapshot decision matrix ────────────────────────────────────────────
// Maps ScanOps bridge event type to the correct receipt status when the
// inventory snapshot evidence is determined to be stale.
//
// This is event-type-specific and must not be collapsed to a single rule.
// Do not use this map for any stock, price, or order mutation decisions.

export const STALE_SNAPSHOT_RECEIPT_BY_EVENT_TYPE = {
  // Request is valid evidence but price may have changed — hold for review
  [SCANOPS_BRIDGE_EVENT_TYPES.MARKDOWN_REQUESTED]:
    INVENTORY_SYNC_RECEIPT_STATUS.HELD_FOR_REVIEW,

  // Approval based on a stale price is potentially incorrect.
  // Severity determines whether to hold or hard-reject; ingestion engine
  // evaluates staleness duration and item risk level in Phase 1C-D.
  // Default: HELD_FOR_REVIEW. Engine may escalate to REJECTED_STALE_SNAPSHOT
  // if staleness threshold is exceeded or item is high-value.
  [SCANOPS_BRIDGE_EVENT_TYPES.MARKDOWN_APPROVED]:
    INVENTORY_SYNC_RECEIPT_STATUS.HELD_FOR_REVIEW,

  // Return is accepted as correction evidence but may need batch/status
  // re-evaluation if the linked markdown batch state has changed.
  [SCANOPS_BRIDGE_EVENT_TYPES.MARKDOWN_RETURNED]:
    INVENTORY_SYNC_RECEIPT_STATUS.HELD_FOR_REVIEW,

  // Rejection is generally safe to accept as evidence if the linked
  // markdown request is still open in Inventory.
  [SCANOPS_BRIDGE_EVENT_TYPES.MARKDOWN_REJECTED]:
    INVENTORY_SYNC_RECEIPT_STATUS.ACK_PROCESSED,

  // Handoff events depend on prior events being correctly processed.
  // Hold for review if any dependent event is also stale or held.
  [SCANOPS_BRIDGE_EVENT_TYPES.MARKDOWN_HANDOFF]:
    INVENTORY_SYNC_RECEIPT_STATUS.HELD_FOR_REVIEW,
};

// ── Idempotency key builder (Phase 1C-C will implement engine; constants only here) ──

/**
 * Returns the idempotency key components for a given bridge event envelope.
 * The key is a composite of event_id + source_device_id + source_session_id + event_type.
 *
 * Note: This returns the raw components. The ingestion engine (Phase 1C-C)
 * is responsible for joining and hashing the key for storage.
 *
 * @param {object} event — ScanOps bridge envelope
 * @returns {{ event_id, source_device_id, source_session_id, event_type }}
 */
export function getIdempotencyKeyComponents(event) {
  return {
    event_id:          event?.event_id          || null,
    source_device_id:  event?.source_device_id  || null,
    source_session_id: event?.source_session_id || null,
    event_type:        event?.event_type         || null,
  };
}

/**
 * Returns true if the receipt status permits ScanOps to replay the event.
 *
 * HELD_FOR_REVIEW is intentionally excluded from auto-retry.
 * Only a future approved workflow explicitly releasing the event allows replay.
 *
 * @param {string} receiptStatus — from INVENTORY_SYNC_RECEIPT_STATUS
 * @returns {boolean}
 */
export function isReceiptRetryAllowed(receiptStatus) {
  return RECEIPT_RETRY_ALLOWED.has(receiptStatus);
}

/**
 * Returns true if the receipt status is terminal from ScanOps' perspective.
 * Terminal receipts should be archived to sync_history by ScanOps.
 *
 * @param {string} receiptStatus — from INVENTORY_SYNC_RECEIPT_STATUS
 * @returns {boolean}
 */
export function isReceiptStatusTerminal(receiptStatus) {
  return RECEIPT_STATUS_TERMINAL.has(receiptStatus);
}

/**
 * Returns the correct receipt status for a stale snapshot receipt,
 * based on the bridge event type.
 *
 * @param {string} eventType — from SCANOPS_BRIDGE_EVENT_TYPES
 * @returns {string} — from INVENTORY_SYNC_RECEIPT_STATUS
 */
export function getStaleSnapshotReceiptStatus(eventType) {
  return STALE_SNAPSHOT_RECEIPT_BY_EVENT_TYPE[eventType]
    ?? INVENTORY_SYNC_RECEIPT_STATUS.HELD_FOR_REVIEW; // Safe default
}