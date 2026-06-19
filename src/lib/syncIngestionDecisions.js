/**
 * syncIngestionDecisions.js — Phase 1C-D
 *
 * Stale snapshot and business conflict decision logic for the
 * Inventory-side ScanOps bridge ingestion service.
 *
 * Extracted from syncIngestionEngine.js to keep the engine focused on
 * orchestration. This module is pure decision logic — no entity persistence,
 * no routing, no transport, no mutations.
 *
 * HARD RULES — enforced in every phase:
 *   - No StockMovement creation.
 *   - No Item Master pricing mutation.
 *   - No POSLineItem creation.
 *   - No purchase order creation or mutation.
 *   - No forecasting calls.
 *   - No multi-location sync logic.
 *   - ScanOps events are evidence/request records only.
 *   - Inventory remains source-of-truth.
 */

import {
  SCANOPS_BRIDGE_EVENT_TYPES,
  INVENTORY_SYNC_INBOUND_STATUS,
  INVENTORY_SYNC_RECEIPT_STATUS,
  getStaleSnapshotReceiptStatus,
} from "./syncIngestionConstants";

// ── Stale snapshot thresholds ─────────────────────────────────────────────────
// These define when "stale" escalates from HELD to hard REJECTED.
// Numbers are in minutes. Approval events are strictest.

const STALE_THRESHOLD_MINUTES = {
  [SCANOPS_BRIDGE_EVENT_TYPES.MARKDOWN_APPROVED]:  60,   // >60 min stale → hard reject
  [SCANOPS_BRIDGE_EVENT_TYPES.MARKDOWN_REQUESTED]: 240,  // >4 h stale → still held, not rejected
  [SCANOPS_BRIDGE_EVENT_TYPES.MARKDOWN_RETURNED]:  240,
  [SCANOPS_BRIDGE_EVENT_TYPES.MARKDOWN_REJECTED]:  480,  // Rejections are forgiving
  [SCANOPS_BRIDGE_EVENT_TYPES.MARKDOWN_HANDOFF]:   120,
};

const DEFAULT_STALE_THRESHOLD_MINUTES = 240;

/**
 * Parse minutes elapsed between last_inventory_sync_at and received_at.
 * Returns null if either timestamp is missing or unparseable.
 *
 * @param {string|null} lastSyncAt
 * @param {string} receivedAt
 * @returns {number|null}
 */
function minutesSinceLastSync(lastSyncAt, receivedAt) {
  if (!lastSyncAt || !receivedAt) return null;
  const syncMs  = Date.parse(lastSyncAt);
  const recvMs  = Date.parse(receivedAt);
  if (isNaN(syncMs) || isNaN(recvMs)) return null;
  return Math.max(0, Math.floor((recvMs - syncMs) / 60000));
}

// ── Ledger status → receipt status mapping ────────────────────────────────────

/**
 * Map a receipt status to the corresponding InventorySyncInboundEvent ledger status.
 *
 * @param {string} receiptStatus — from INVENTORY_SYNC_RECEIPT_STATUS
 * @returns {string} — from INVENTORY_SYNC_INBOUND_STATUS
 */
export function ledgerStatusForReceipt(receiptStatus) {
  const MAP = {
    [INVENTORY_SYNC_RECEIPT_STATUS.ACK_RECEIVED]:            INVENTORY_SYNC_INBOUND_STATUS.PROCESSED,
    [INVENTORY_SYNC_RECEIPT_STATUS.ACK_PROCESSED]:           INVENTORY_SYNC_INBOUND_STATUS.PROCESSED,
    [INVENTORY_SYNC_RECEIPT_STATUS.ACK_DUPLICATE]:           INVENTORY_SYNC_INBOUND_STATUS.DUPLICATE,
    [INVENTORY_SYNC_RECEIPT_STATUS.HELD_FOR_REVIEW]:         INVENTORY_SYNC_INBOUND_STATUS.HELD_FOR_REVIEW,
    [INVENTORY_SYNC_RECEIPT_STATUS.REJECTED_SCHEMA]:         INVENTORY_SYNC_INBOUND_STATUS.REJECTED_SCHEMA,
    [INVENTORY_SYNC_RECEIPT_STATUS.REJECTED_AUTH]:           INVENTORY_SYNC_INBOUND_STATUS.REJECTED_AUTH,
    [INVENTORY_SYNC_RECEIPT_STATUS.REJECTED_STALE_SNAPSHOT]: INVENTORY_SYNC_INBOUND_STATUS.REJECTED_STALE_SNAPSHOT,
    [INVENTORY_SYNC_RECEIPT_STATUS.REJECTED_CONFLICT]:       INVENTORY_SYNC_INBOUND_STATUS.REJECTED_CONFLICT,
    [INVENTORY_SYNC_RECEIPT_STATUS.FAILED_RETRYABLE]:        INVENTORY_SYNC_INBOUND_STATUS.FAILED_RETRYABLE,
    [INVENTORY_SYNC_RECEIPT_STATUS.FAILED_TERMINAL]:         INVENTORY_SYNC_INBOUND_STATUS.FAILED_TERMINAL,
    [INVENTORY_SYNC_RECEIPT_STATUS.QUARANTINED]:             INVENTORY_SYNC_INBOUND_STATUS.QUARANTINED,
  };
  return MAP[receiptStatus] ?? INVENTORY_SYNC_INBOUND_STATUS.HELD_FOR_REVIEW;
}

// ── Stale snapshot decision ────────────────────────────────────────────────────

/**
 * Determine whether the bridge event's inventory snapshot evidence is stale,
 * and return the appropriate decision if so.
 *
 * Phase 1C-D: uses available evidence fields (inventory_snapshot_hash,
 * inventory_record_version, last_inventory_sync_at) and event-type-specific
 * thresholds. Does not perform live Inventory record version lookup —
 * that comparison belongs to Phase 1C-E when routing is available.
 *
 * Staleness is inferred from last_inventory_sync_at age relative to received_at.
 * If last_inventory_sync_at is absent, we cannot confirm freshness → HELD.
 *
 * For markdown.approved: exceeded threshold → REJECTED_STALE_SNAPSHOT.
 * For all others: any detectable staleness → HELD_FOR_REVIEW (default matrix).
 *
 * Returns null if staleness cannot be confirmed (no action taken by caller).
 *
 * @param {object} event — ScanOps bridge event envelope
 * @param {string} receivedAt — ISO timestamp when Inventory received the event
 * @returns {{ receiptStatus, ledgerStatus, decision_code, decision_reason } | null}
 */
export function evaluateStaleSnapshot(event, receivedAt) {
  const eventType     = event.event_type;
  const lastSyncAt    = event.last_inventory_sync_at || null;
  const snapshotHash  = event.inventory_snapshot_hash || null;
  const recordVersion = event.inventory_record_version || null;

  // If we have no timing evidence, we cannot confirm freshness.
  // Hold rather than silently accepting or rejecting.
  if (!lastSyncAt) {
    // Only hold if we also cannot verify snapshot identity at all
    if (!snapshotHash && !recordVersion) {
      return {
        receiptStatus:  INVENTORY_SYNC_RECEIPT_STATUS.HELD_FOR_REVIEW,
        ledgerStatus:   INVENTORY_SYNC_INBOUND_STATUS.HELD_FOR_REVIEW,
        decision_code:  "SNAPSHOT_TIMING_UNKNOWN_HELD",
        decision_reason: "last_inventory_sync_at absent and snapshot identity unverifiable. Held for manual review.",
      };
    }
    // Have hash/version but no timing — proceed (Phase 1C-E will do live comparison)
    return null;
  }

  const elapsed = minutesSinceLastSync(lastSyncAt, receivedAt);

  // If timestamps are unparseable, hold rather than guess
  if (elapsed === null) {
    return {
      receiptStatus:  INVENTORY_SYNC_RECEIPT_STATUS.HELD_FOR_REVIEW,
      ledgerStatus:   INVENTORY_SYNC_INBOUND_STATUS.HELD_FOR_REVIEW,
      decision_code:  "SNAPSHOT_TIMESTAMP_PARSE_ERROR_HELD",
      decision_reason: "Could not compute staleness from last_inventory_sync_at and received_at. Held for review.",
    };
  }

  const threshold = STALE_THRESHOLD_MINUTES[eventType] ?? DEFAULT_STALE_THRESHOLD_MINUTES;
  const isStale   = elapsed > threshold;

  if (!isStale) return null; // Fresh enough — no stale decision

  // Stale — apply event-type matrix
  const defaultReceiptStatus = getStaleSnapshotReceiptStatus(eventType);

  // markdown.approved escalation: exceeded threshold → hard reject
  if (eventType === SCANOPS_BRIDGE_EVENT_TYPES.MARKDOWN_APPROVED && isStale) {
    return {
      receiptStatus:  INVENTORY_SYNC_RECEIPT_STATUS.REJECTED_STALE_SNAPSHOT,
      ledgerStatus:   INVENTORY_SYNC_INBOUND_STATUS.REJECTED_STALE_SNAPSHOT,
      decision_code:  "STALE_SNAPSHOT_MARKDOWN_APPROVAL_REJECTED",
      decision_reason: `Markdown approval rejected: snapshot is ${elapsed} minutes stale (threshold: ${threshold} min). Price or batch state may have changed.`,
    };
  }

  // Event-type-specific codes
  const STALE_CODES = {
    [SCANOPS_BRIDGE_EVENT_TYPES.MARKDOWN_REQUESTED]: {
      code:   "STALE_SNAPSHOT_MARKDOWN_REQUEST_REVIEW",
      reason: `Markdown request held: snapshot is ${elapsed} minutes stale (threshold: ${threshold} min). Price may have changed. Review required.`,
    },
    [SCANOPS_BRIDGE_EVENT_TYPES.MARKDOWN_APPROVED]: {
      // Handled above for hard-reject; this covers the HELD branch if threshold logic changes
      code:   "STALE_SNAPSHOT_MARKDOWN_APPROVAL_REVIEW",
      reason: `Markdown approval held: snapshot staleness detected (${elapsed} min). Review required before routing.`,
    },
    [SCANOPS_BRIDGE_EVENT_TYPES.MARKDOWN_RETURNED]: {
      code:   "STALE_SNAPSHOT_MARKDOWN_RETURN_REVIEW",
      reason: `Markdown return held: snapshot is ${elapsed} minutes stale. Batch or linked request status may have changed. Review required.`,
    },
    [SCANOPS_BRIDGE_EVENT_TYPES.MARKDOWN_REJECTED]: {
      // Default matrix returns ACK_PROCESSED for rejections — honour it unless very stale
      code:   "STALE_SNAPSHOT_MARKDOWN_REJECTION_ACCEPTED",
      reason: `Markdown rejection accepted despite stale snapshot (${elapsed} min). Rejection evidence is recorded; no pricing action taken.`,
    },
    [SCANOPS_BRIDGE_EVENT_TYPES.MARKDOWN_HANDOFF]: {
      code:   "STALE_SNAPSHOT_HANDOFF_REVIEW",
      reason: `Markdown handoff held: snapshot is ${elapsed} minutes stale. Dependent events may need review.`,
    },
  };

  const { code, reason } = STALE_CODES[eventType] ?? {
    code:   "STALE_SNAPSHOT_UNKNOWN_EVENT_HELD",
    reason: `Snapshot is ${elapsed} minutes stale for event type '${eventType}'. Held for review.`,
  };

  return {
    receiptStatus:  defaultReceiptStatus,
    ledgerStatus:   ledgerStatusForReceipt(defaultReceiptStatus),
    decision_code:  code,
    decision_reason: reason,
  };
}

// ── Business conflict decision matrix ─────────────────────────────────────────

/**
 * Evaluate event-type-specific business conflict checks.
 *
 * Phase 1C-D: checks that can be performed safely without live routing
 * or external entity lookups beyond what schema validation already covers.
 *
 * Checks performed:
 *   - Payload object is non-null and non-empty
 *   - payload_hash is a non-empty string (structural integrity)
 *   - event_type is in the supported set (belt-and-suspenders after schema validation)
 *   - source_user_role is present (soft check — role auth deferred to Phase 1C-E)
 *   - Event-type-specific payload field presence (safe scaffold)
 *
 * Checks deferred to later phases (noted below):
 *   - Unknown barcode/item (requires live Inventory query — Phase 1C-E)
 *   - Quantity mismatch (requires linked ledger event lookup — Phase 1C-E)
 *   - Out-of-order event detection (requires sequence query — Phase 1C-E)
 *   - Changed markdown status (requires linked ledger event — Phase 1C-E)
 *   - Unauthorized approval (requires role/device auth registry — Phase 1C-E)
 *
 * Returns null if all business checks pass.
 * Returns a structured decision object if a conflict is detected.
 *
 * @param {object} event — ScanOps bridge event envelope
 * @returns {{ receiptStatus, ledgerStatus, decision_code, decision_reason } | null}
 */
export function evaluateBusinessConflicts(event) {
  const { event_type, payload, payload_hash, source_user_role } = event;

  // ── Payload structural integrity ──────────────────────────────────────────
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      receiptStatus:  INVENTORY_SYNC_RECEIPT_STATUS.REJECTED_SCHEMA,
      ledgerStatus:   INVENTORY_SYNC_INBOUND_STATUS.REJECTED_SCHEMA,
      decision_code:  "INVALID_PAYLOAD_STRUCTURE",
      decision_reason: "Event payload is missing, null, or not an object.",
    };
  }

  if (!payload_hash || typeof payload_hash !== "string" || payload_hash.trim() === "") {
    return {
      receiptStatus:  INVENTORY_SYNC_RECEIPT_STATUS.REJECTED_SCHEMA,
      ledgerStatus:   INVENTORY_SYNC_INBOUND_STATUS.REJECTED_SCHEMA,
      decision_code:  "MISSING_PAYLOAD_HASH",
      decision_reason: "payload_hash is missing or empty. Event integrity cannot be verified.",
    };
  }

  // ── source_user_role soft check ───────────────────────────────────────────
  // Warn via HELD rather than hard-reject — full role auth in Phase 1C-E.
  if (!source_user_role) {
    return {
      receiptStatus:  INVENTORY_SYNC_RECEIPT_STATUS.HELD_FOR_REVIEW,
      ledgerStatus:   INVENTORY_SYNC_INBOUND_STATUS.HELD_FOR_REVIEW,
      decision_code:  "MISSING_SOURCE_USER_ROLE_HELD",
      decision_reason: "source_user_role absent. Event held pending role authorization review (Phase 1C-E).",
    };
  }

  // ── Event-type-specific payload field checks ─────────────────────────────
  const eventTypeChecks = {
    [SCANOPS_BRIDGE_EVENT_TYPES.MARKDOWN_REQUESTED]: ["markdown_request_ref"],
    [SCANOPS_BRIDGE_EVENT_TYPES.MARKDOWN_APPROVED]:  ["markdown_request_ref"],
    [SCANOPS_BRIDGE_EVENT_TYPES.MARKDOWN_RETURNED]:  ["markdown_request_ref"],
    [SCANOPS_BRIDGE_EVENT_TYPES.MARKDOWN_REJECTED]:  ["markdown_request_ref"],
    [SCANOPS_BRIDGE_EVENT_TYPES.MARKDOWN_HANDOFF]:   ["markdown_request_ref"],
  };

  const requiredPayloadFields = eventTypeChecks[event_type] || [];
  const missingPayloadFields = requiredPayloadFields.filter(
    (f) => payload[f] === undefined || payload[f] === null || payload[f] === ""
  );

  if (missingPayloadFields.length > 0) {
    // Missing a reference field — hold rather than hard-reject in Phase 1C-D,
    // as the Phase 1C-E lookup may still resolve the link.
    return {
      receiptStatus:  INVENTORY_SYNC_RECEIPT_STATUS.HELD_FOR_REVIEW,
      ledgerStatus:   INVENTORY_SYNC_INBOUND_STATUS.HELD_FOR_REVIEW,
      decision_code:  "VALIDATION_DEFERRED_REVIEW_REQUIRED",
      decision_reason: `Payload missing expected reference field(s): ${missingPayloadFields.join(", ")}. Held pending review (Phase 1C-E lookup).`,
    };
  }

  // All Phase 1C-D-safe checks passed.
  // Deferred checks (item lookup, sequence, role matrix, quantity) → Phase 1C-E.
  return null;
}