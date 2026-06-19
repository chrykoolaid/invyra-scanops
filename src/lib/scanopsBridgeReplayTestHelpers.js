/**
 * scanopsBridgeReplayTestHelpers.js — Phase 1B
 *
 * Test helpers for the ScanOps ↔ Inventory Bridge v1 replay and receipt system.
 *
 * USE ONLY in development / test contexts. Do not call from production workflows.
 *
 * HARD RULES:
 *   - No stock mutation. No price mutation. No StockMovement. No POSLineItem.
 *   - No real Inventory API calls. Transport stub only.
 *   - Does not create InventorySyncInboundEvent or InventorySyncReceipt entities.
 *   - ScanOps remains capture-only.
 */

import {
  RECEIPT_STATUS,
  OUTBOX_SYNC_STATUS,
  mapReceiptToOutboxStatus,
  mapStaleSnapshotReceiptByEventType,
  replayOrderComparator,
  isReplayEligible,
  isTerminalOutboxStatus,
  validateReceiptEnvelope,
  buildOutboxSyncMetaPatch,
} from "./scanopsSyncStatus";

import {
  getOutboxEvents,
  getOutboxEvent,
  getSyncHistory,
  getSyncHistoryEvent,
} from "./inventory/storageProvider";

import {
  processSyncReceipt,
  replayBridgeOutboxEvents,
  applyReceiptToOutboxEvent,
} from "./scanOpsSync";

// ── Helpers ───────────────────────────────────────────────────────────────────

function nowIso() {
  return new Date().toISOString();
}

function makeReceiptId() {
  return `test_receipt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Build a synthetic Inventory receipt envelope for a known event_id.
 * Used to drive receipt handling tests without a live Inventory system.
 *
 * @param {string} event_id
 * @param {string} receiptStatus — from RECEIPT_STATUS
 * @param {object} [overrides] — optional field overrides
 * @returns {object} Synthetic receipt envelope
 */
export function buildTestReceipt(event_id, receiptStatus, overrides = {}) {
  return {
    receipt_id: makeReceiptId(),
    event_id,
    status: receiptStatus,
    inventory_received_at: nowIso(),
    inventory_processed_at: nowIso(),
    decision_code: receiptStatus,
    decision_message: `Test receipt: ${receiptStatus}`,
    linked_workflow_ref: null,
    retry_allowed: !isTerminalOutboxStatus(mapReceiptToOutboxStatus(receiptStatus)),
    _test_generated: true,
    ...overrides,
  };
}

/**
 * Simulate an Inventory receipt arriving for a given outbox event.
 *
 * This is the primary test entry point. It:
 *   1. Builds a synthetic receipt envelope.
 *   2. Validates it using the same path as real receipts.
 *   3. Calls processSyncReceipt() — the real handler, not a mock.
 *   4. Returns the full result for assertion.
 *
 * @param {string} event_id
 * @param {string} receiptStatus — from RECEIPT_STATUS
 * @param {object} [overrides] — optional receipt field overrides
 * @returns {Promise<{ ok, event_id, outboxStatus, archived, errors, _receipt }>}
 */
export async function simulateInventoryReceiptForTest(event_id, receiptStatus, overrides = {}) {
  const receipt = buildTestReceipt(event_id, receiptStatus, overrides);

  const validationErrors = validateReceiptEnvelope(receipt);
  if (validationErrors.length > 0) {
    return {
      ok: false,
      event_id,
      outboxStatus: null,
      archived: false,
      errors: [`[test] Receipt validation failed: ${validationErrors.join(", ")}`],
      _receipt: receipt,
    };
  }

  const result = await processSyncReceipt(receipt);
  return { ...result, _receipt: receipt };
}

/**
 * Run a full replay cycle and return the ordered eligible event list
 * without actually marking events as SENDING (read-only diagnostic).
 *
 * Useful to assert ordering, eligibility filtering, and stuck-SENDING detection
 * without side effects.
 *
 * @returns {Promise<{ eligible: object[], skipped: object[], order: string[] }>}
 */
export async function inspectReplayOrder() {
  const allEvents = await getOutboxEvents();
  const eligible = allEvents.filter(isReplayEligible);
  const skipped = allEvents
    .filter((e) => !isReplayEligible(e))
    .map((e) => ({ event_id: e.event_id, sync_status: e.sync_status }));

  eligible.sort(replayOrderComparator);

  return {
    eligible,
    skipped,
    order: eligible.map((e) => e.event_id),
  };
}

/**
 * Assert the receipt-to-outbox status mapping for a given receipt status and bridge event type.
 * Returns a result object documenting the mapping decision — does not mutate any state.
 *
 * @param {string} receiptStatus — from RECEIPT_STATUS
 * @param {string} [bridgeEventType] — from BRIDGE_EVENT_TYPES (required for stale snapshot)
 * @returns {{ receiptStatus, bridgeEventType, outboxStatus, isTerminal, isStaleSnapshotPath }}
 */
export function assertReceiptMapping(receiptStatus, bridgeEventType = null) {
  const isStaleSnapshotPath = receiptStatus === RECEIPT_STATUS.REJECTED_STALE_SNAPSHOT && !!bridgeEventType;
  const outboxStatus = isStaleSnapshotPath
    ? mapStaleSnapshotReceiptByEventType(bridgeEventType)
    : mapReceiptToOutboxStatus(receiptStatus);

  return {
    receiptStatus,
    bridgeEventType,
    outboxStatus,
    isTerminal: isTerminalOutboxStatus(outboxStatus),
    isStaleSnapshotPath,
  };
}

/**
 * Verify the sync_history store contains a complete archived record for a given event_id.
 * Checks that all required fields are preserved (immutability verification).
 *
 * @param {string} event_id
 * @returns {Promise<{ found: boolean, immutableFieldsIntact: boolean, missing: string[], record: object|null }>}
 */
export async function verifySyncHistoryRecord(event_id) {
  const record = await getSyncHistoryEvent(event_id);
  if (!record) {
    return { found: false, immutableFieldsIntact: false, missing: ["record not found"], record: null };
  }

  const REQUIRED_IMMUTABLE_FIELDS = [
    "event_id",
    "event_type",
    "event_version",
    "payload",
    "payload_hash",
    "captured_at",
  ];

  const missing = REQUIRED_IMMUTABLE_FIELDS.filter((f) => !record[f]);
  const ARCHIVE_REQUIRED_FIELDS = ["final_status", "archived_at", "archive_schema_version"];
  const missingArchive = ARCHIVE_REQUIRED_FIELDS.filter((f) => !record[f]);

  return {
    found: true,
    immutableFieldsIntact: missing.length === 0,
    archiveFieldsPresent: missingArchive.length === 0,
    missing: [...missing, ...missingArchive],
    record,
  };
}

/**
 * Convenience: run all receipt mapping assertions and return a summary table.
 * Does not mutate any state.
 *
 * @returns {object[]} Array of mapping result rows for all RECEIPT_STATUS values.
 */
export function runAllReceiptMappingAssertions() {
  const BRIDGE_EVENT_TYPES_FOR_STALE = [
    "scanops.markdown.requested",
    "scanops.markdown.approved",
    "scanops.markdown.returned",
    "scanops.markdown.rejected",
    "scanops.markdown.handoff.created",
  ];

  const results = [];

  for (const rs of Object.values(RECEIPT_STATUS)) {
    if (rs === RECEIPT_STATUS.REJECTED_STALE_SNAPSHOT) {
      // Run per bridge event type
      for (const bet of BRIDGE_EVENT_TYPES_FOR_STALE) {
        results.push(assertReceiptMapping(rs, bet));
      }
    } else {
      results.push(assertReceiptMapping(rs));
    }
  }

  return results;
}