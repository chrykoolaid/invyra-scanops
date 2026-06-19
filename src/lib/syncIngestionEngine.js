/**
 * syncIngestionEngine.js — Phase 1C-B
 *
 * Inventory-side ingestion service skeleton for the ScanOps ↔ Inventory Bridge v1.
 *
 * Phase 1C-B scope: function skeletons only.
 *   - Schema validation stub (required field checks only)
 *   - Idempotency stub (placeholder — full logic in Phase 1C-C)
 *   - Snapshot evidence stub (field presence only — comparison in Phase 1C-D)
 *   - Source validation stub (field presence only — auth enforcement in Phase 1C-D)
 *   - Business rules stub (placeholder — rules in Phase 1C-D)
 *   - Receipt builder skeleton (local object only — persistence in Phase 1C-C)
 *   - Review queue routing stub (non-mutating placeholder)
 *
 * HARD RULES — enforced in every phase:
 *   - No StockMovement creation.
 *   - No Item Master pricing mutation.
 *   - No POSLineItem creation.
 *   - No purchase order creation or mutation.
 *   - No forecasting calls.
 *   - No multi-location sync logic.
 *   - No Wi-Fi/IP transport.
 *   - No device pairing or trusted device registry.
 *   - ScanOps events are evidence/request records only.
 *   - Inventory remains source-of-truth.
 */

import {
  SCANOPS_BRIDGE_EVENT_TYPE_VALUES,
  INVENTORY_SYNC_INBOUND_STATUS,
  INVENTORY_SYNC_RECEIPT_STATUS,
  isReceiptRetryAllowed,
  isReceiptStatusTerminal,
  getStaleSnapshotReceiptStatus,
  getIdempotencyKeyComponents,
} from "./syncIngestionConstants";

// ── Utilities ─────────────────────────────────────────────────────────────────

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Required bridge envelope fields for schema validation ─────────────────────

const REQUIRED_ENVELOPE_FIELDS = [
  "event_id",
  "event_type",
  "event_version",
  "source_system",
  "source_device_id",
  "source_session_id",
  "source_user_id",
  "created_at",
  "captured_at",
  "inventory_snapshot_ref",
  "inventory_snapshot_hash",
  "inventory_record_version",
  "payload",
  "payload_hash",
];

// Required snapshot evidence fields for presence check
const REQUIRED_SNAPSHOT_FIELDS = [
  "inventory_snapshot_ref",
  "inventory_snapshot_hash",
  "inventory_record_version",
];

// Required source identity fields for presence check
const REQUIRED_SOURCE_FIELDS = [
  "source_device_id",
  "source_session_id",
  "source_user_id",
];

// ── 1. Schema Validation ──────────────────────────────────────────────────────

/**
 * Validate the minimum required fields of a ScanOps bridge event envelope.
 *
 * Phase 1C-B: checks required field presence and event_type membership only.
 * Does not validate payload contents, business rules, or snapshot staleness.
 *
 * @param {object} event — ScanOps bridge event envelope
 * @returns {{ ok: boolean, status: string, decision_code: string, decision_reason: string, missing?: string[] }}
 */
export function validateBridgeEventSchema(event) {
  if (!event || typeof event !== "object") {
    return {
      ok: false,
      status: INVENTORY_SYNC_INBOUND_STATUS.REJECTED_SCHEMA,
      decision_code: "INVALID_BRIDGE_EVENT_SCHEMA",
      decision_reason: "Event envelope is null or not an object.",
    };
  }

  const missing = REQUIRED_ENVELOPE_FIELDS.filter(
    (field) => event[field] === undefined || event[field] === null || event[field] === ""
  );

  if (missing.length > 0) {
    return {
      ok: false,
      status: INVENTORY_SYNC_INBOUND_STATUS.REJECTED_SCHEMA,
      decision_code: "INVALID_BRIDGE_EVENT_SCHEMA",
      decision_reason: `Missing required bridge event field(s): ${missing.join(", ")}.`,
      missing,
    };
  }

  if (!SCANOPS_BRIDGE_EVENT_TYPE_VALUES.has(event.event_type)) {
    return {
      ok: false,
      status: INVENTORY_SYNC_INBOUND_STATUS.REJECTED_SCHEMA,
      decision_code: "UNSUPPORTED_EVENT_TYPE",
      decision_reason: `Unsupported bridge event type: '${event.event_type}'. Phase 1C supports markdown events only.`,
    };
  }

  if (event.source_system !== "scanops") {
    return {
      ok: false,
      status: INVENTORY_SYNC_INBOUND_STATUS.REJECTED_SCHEMA,
      decision_code: "INVALID_SOURCE_SYSTEM",
      decision_reason: `Expected source_system 'scanops', received '${event.source_system}'.`,
    };
  }

  return {
    ok: true,
    status: INVENTORY_SYNC_INBOUND_STATUS.VALIDATING,
    decision_code: "SCHEMA_VALID",
    decision_reason: "Bridge event envelope passed schema validation.",
  };
}

// ── 2. Idempotency Check ──────────────────────────────────────────────────────

/**
 * Check whether this event has already been received and processed.
 *
 * Phase 1C-B: returns safe placeholder only.
 * Full database lookup and conflict detection implemented in Phase 1C-C.
 *
 * Idempotency key: event_id + source_device_id + source_session_id + event_type.
 * Conflict rule: same event_id + different payload_hash → REJECTED_CONFLICT.
 *
 * @param {object} event — ScanOps bridge event envelope
 * @returns {{ ok: boolean, duplicate: boolean, conflict: boolean, existing?: object }}
 */
export function checkIdempotency(event) {
  // Phase 1C-B: no live database lookup yet.
  // Phase 1C-C will implement: query InventorySyncInboundEvent by idempotency_key,
  // compare payload_hash, and return conflict/duplicate result.
  const keyComponents = getIdempotencyKeyComponents(event);
  return {
    ok: true,
    duplicate: false,
    conflict: false,
    _phase: "1C-B",
    _note: "Idempotency database lookup not yet implemented. Phase 1C-C.",
    _key_components: keyComponents,
  };
}

// ── 3. Snapshot Evidence Validation ──────────────────────────────────────────

/**
 * Validate that the inventory snapshot evidence fields are present
 * and structurally sound.
 *
 * Phase 1C-B: field presence check only.
 * Full staleness comparison (hash vs. current Inventory record version)
 * and event-type-specific stale handling implemented in Phase 1C-D.
 *
 * @param {object} event — ScanOps bridge event envelope
 * @returns {{ ok: boolean, status?: string, decision_code?: string, decision_reason?: string }}
 */
export function validateSnapshotEvidence(event) {
  const missing = REQUIRED_SNAPSHOT_FIELDS.filter(
    (field) => !event[field]
  );

  if (missing.length > 0) {
    return {
      ok: false,
      status: INVENTORY_SYNC_INBOUND_STATUS.REJECTED_SCHEMA,
      decision_code: "MISSING_SNAPSHOT_EVIDENCE",
      decision_reason: `Missing inventory snapshot evidence field(s): ${missing.join(", ")}.`,
      missing,
    };
  }

  // Phase 1C-D will add: fetch current Inventory record version, compare hashes,
  // apply event-type-specific stale snapshot decision matrix.
  return {
    ok: true,
    decision_code: "SNAPSHOT_EVIDENCE_PRESENT",
    decision_reason: "Snapshot evidence fields present. Full staleness comparison deferred to Phase 1C-D.",
    _phase: "1C-B",
  };
}

// ── 4. Source Validation ──────────────────────────────────────────────────────

/**
 * Validate the ScanOps source identity fields.
 *
 * Phase 1C-B: required field presence check only.
 * Full auth enforcement (trusted device registry, session validity, role
 * authorization) implemented in Phase 1C-D.
 * No Wi-Fi/IP transport, device pairing, or bridge host settings.
 *
 * @param {object} event — ScanOps bridge event envelope
 * @returns {{ ok: boolean, status?: string, decision_code?: string, decision_reason?: string }}
 */
export function validateScanOpsSource(event) {
  const missing = REQUIRED_SOURCE_FIELDS.filter(
    (field) => !event[field]
  );

  if (missing.length > 0) {
    return {
      ok: false,
      status: INVENTORY_SYNC_INBOUND_STATUS.REJECTED_AUTH,
      decision_code: "MISSING_SOURCE_IDENTITY",
      decision_reason: `Missing source identity field(s): ${missing.join(", ")}.`,
      missing,
    };
  }

  // Phase 1C-D will add: trusted device registry lookup, session expiry check,
  // role authorization matrix for event_type.
  return {
    ok: true,
    decision_code: "SOURCE_IDENTITY_PRESENT",
    decision_reason: "Source identity fields present. Full auth enforcement deferred to Phase 1C-D.",
    _phase: "1C-B",
  };
}

// ── 5. Business Rules Validation ──────────────────────────────────────────────

/**
 * Validate event-type-specific business rules.
 *
 * Phase 1C-B: stub only — returns passing placeholder.
 * Phase 1C-D will implement:
 *   - Markdown request: item/barcode reference exists in Inventory
 *   - Markdown approved: linked request is still open and not superseded
 *   - Markdown returned: linked approved event exists
 *   - Markdown rejected: linked request still exists
 *   - Handoff created: linked approved event exists and is not already handed off
 *   - Quantity mismatch and out-of-order event detection
 *
 * @param {object} event — ScanOps bridge event envelope
 * @returns {{ ok: boolean, status?: string, decision_code?: string, decision_reason?: string }}
 */
export function validateEventBusinessRules(event) {
  // Phase 1C-D will implement event-type-specific rule evaluation.
  return {
    ok: true,
    decision_code: "BUSINESS_RULES_DEFERRED",
    decision_reason: "Business rule validation not yet implemented. Phase 1C-D.",
    _phase: "1C-B",
  };
}

// ── 6. Receipt Builder ────────────────────────────────────────────────────────

/**
 * Build an InventorySyncReceipt-compatible object from an ingestion decision.
 *
 * Phase 1C-B: returns a local receipt object only.
 * Persistence to the InventorySyncReceipt entity implemented in Phase 1C-C.
 *
 * @param {object} event — ScanOps bridge event envelope
 * @param {{ ingestion_id, status, decision_code, decision_message, linked_workflow_ref? }} decision
 * @returns {object} Receipt envelope (not yet persisted)
 */
export function buildInventorySyncReceipt(event, decision) {
  const receiptStatus = decision?.status || INVENTORY_SYNC_RECEIPT_STATUS.ACK_RECEIVED;

  return {
    receipt_id:              makeId("rcpt"),
    event_id:                event?.event_id || null,
    ingestion_id:            decision?.ingestion_id || null,
    status:                  receiptStatus,
    inventory_received_at:   decision?.received_at || nowIso(),
    inventory_processed_at:  nowIso(),
    decision_code:           decision?.decision_code || receiptStatus,
    decision_message:        decision?.decision_message || decision?.decision_reason || null,
    linked_workflow_ref:     decision?.linked_workflow_ref || null,
    retry_allowed:           isReceiptRetryAllowed(receiptStatus),
    created_at:              nowIso(),
    // Phase 1C-B marker — remove before Phase 1C-C persistence is enabled
    _persisted:              false,
    _phase:                  "1C-B",
  };
}

// ── 7. Review Queue Routing ───────────────────────────────────────────────────

/**
 * Route an accepted or held event to the appropriate review queue.
 *
 * Phase 1C-B: non-mutating stub only.
 * Does NOT create MarkdownReviewQueue records, StockMovement, POSLineItem,
 * Item Master pricing updates, purchase orders, or forecasting records.
 *
 * Phase 1C-E will implement: safe routing to MarkdownSyncReviewQueue
 * or equivalent review-only holding area.
 *
 * @param {object} event — ScanOps bridge event envelope
 * @param {object} decision — ingestion decision from processInboundScanOpsEvent
 * @returns {{ routed: boolean, reason: string }}
 */
export function routeAcceptedEventToReviewQueue(event, decision) {
  // Phase 1C-E will implement safe routing logic.
  // This stub exists to satisfy the service contract without mutation risk.
  return {
    routed: false,
    reason: "ROUTING_NOT_ENABLED_IN_PHASE_1C_B",
    _phase: "1C-B",
  };
}

// ── 8. Main Ingestion Entry Point ─────────────────────────────────────────────

/**
 * Process an inbound ScanOps bridge event through the Inventory ingestion pipeline.
 *
 * Pipeline order (Phase 1C-B skeleton):
 *   1. Schema validation
 *   2. Idempotency check (stub)
 *   3. Snapshot evidence validation (field presence only)
 *   4. Source validation (field presence only)
 *   5. Business rules validation (stub)
 *   6. Build receipt
 *   7. Route to review queue (non-mutating stub)
 *
 * Returns a structured result with the ingestion decision and receipt.
 * Does NOT persist anything in Phase 1C-B.
 * Persistence of InventorySyncInboundEvent and InventorySyncReceipt: Phase 1C-C.
 *
 * @param {object} event — ScanOps bridge event envelope
 * @returns {Promise<{ ok: boolean, ingestion_id: string, receipt: object, decision: object }>}
 */
export async function processInboundScanOpsEvent(event) {
  const ingestion_id = makeId("ing");
  const received_at = nowIso();

  // ── Step 1: Schema validation ─────────────────────────────────────────────
  const schemaResult = validateBridgeEventSchema(event);
  if (!schemaResult.ok) {
    const receipt = buildInventorySyncReceipt(event, {
      ingestion_id,
      received_at,
      status: INVENTORY_SYNC_RECEIPT_STATUS.REJECTED_SCHEMA,
      decision_code: schemaResult.decision_code,
      decision_reason: schemaResult.decision_reason,
    });
    return {
      ok: false,
      ingestion_id,
      receipt,
      decision: {
        stage: "schema_validation",
        status: schemaResult.status,
        decision_code: schemaResult.decision_code,
        decision_reason: schemaResult.decision_reason,
      },
    };
  }

  // ── Step 2: Idempotency check (stub) ─────────────────────────────────────
  const idempotencyResult = checkIdempotency(event);
  if (!idempotencyResult.ok) {
    const receiptStatus = idempotencyResult.conflict
      ? INVENTORY_SYNC_RECEIPT_STATUS.REJECTED_CONFLICT
      : INVENTORY_SYNC_RECEIPT_STATUS.ACK_DUPLICATE;
    const receipt = buildInventorySyncReceipt(event, {
      ingestion_id,
      received_at,
      status: receiptStatus,
      decision_code: idempotencyResult.conflict ? "PAYLOAD_HASH_CONFLICT" : "DUPLICATE_EVENT",
      decision_reason: idempotencyResult.conflict
        ? "Same event_id received with a different payload_hash. Rejected as conflict."
        : "Exact duplicate of a previously processed event. Returning original decision.",
    });
    return {
      ok: false,
      ingestion_id,
      receipt,
      decision: {
        stage: "idempotency_check",
        status: receiptStatus,
        decision_code: receipt.decision_code,
        decision_reason: receipt.decision_message,
      },
    };
  }

  // ── Step 3: Snapshot evidence validation ─────────────────────────────────
  const snapshotResult = validateSnapshotEvidence(event);
  if (!snapshotResult.ok) {
    const receipt = buildInventorySyncReceipt(event, {
      ingestion_id,
      received_at,
      status: INVENTORY_SYNC_RECEIPT_STATUS.REJECTED_SCHEMA,
      decision_code: snapshotResult.decision_code,
      decision_reason: snapshotResult.decision_reason,
    });
    return {
      ok: false,
      ingestion_id,
      receipt,
      decision: {
        stage: "snapshot_evidence",
        status: snapshotResult.status,
        decision_code: snapshotResult.decision_code,
        decision_reason: snapshotResult.decision_reason,
      },
    };
  }

  // ── Step 4: Source validation ─────────────────────────────────────────────
  const sourceResult = validateScanOpsSource(event);
  if (!sourceResult.ok) {
    const receipt = buildInventorySyncReceipt(event, {
      ingestion_id,
      received_at,
      status: INVENTORY_SYNC_RECEIPT_STATUS.REJECTED_AUTH,
      decision_code: sourceResult.decision_code,
      decision_reason: sourceResult.decision_reason,
    });
    return {
      ok: false,
      ingestion_id,
      receipt,
      decision: {
        stage: "source_validation",
        status: sourceResult.status,
        decision_code: sourceResult.decision_code,
        decision_reason: sourceResult.decision_reason,
      },
    };
  }

  // ── Step 5: Business rules validation (stub) ──────────────────────────────
  const rulesResult = validateEventBusinessRules(event);
  if (!rulesResult.ok) {
    const receipt = buildInventorySyncReceipt(event, {
      ingestion_id,
      received_at,
      status: INVENTORY_SYNC_RECEIPT_STATUS.HELD_FOR_REVIEW,
      decision_code: rulesResult.decision_code,
      decision_reason: rulesResult.decision_reason,
    });
    return {
      ok: false,
      ingestion_id,
      receipt,
      decision: {
        stage: "business_rules",
        status: rulesResult.status,
        decision_code: rulesResult.decision_code,
        decision_reason: rulesResult.decision_reason,
      },
    };
  }

  // ── Step 6: Build ACK_RECEIVED receipt ────────────────────────────────────
  // Phase 1C-B: all valid events receive ACK_RECEIVED (not yet fully processed).
  // Phase 1C-C will persist the ledger record and return ACK_PROCESSED.
  const receipt = buildInventorySyncReceipt(event, {
    ingestion_id,
    received_at,
    status: INVENTORY_SYNC_RECEIPT_STATUS.ACK_RECEIVED,
    decision_code: "EVENT_RECEIVED",
    decision_reason: "Event passed Phase 1C-B validation skeleton. Ledger persistence and full processing deferred to Phase 1C-C.",
  });

  // ── Step 7: Route to review queue (non-mutating stub) ─────────────────────
  const routingResult = routeAcceptedEventToReviewQueue(event, { ingestion_id, status: receipt.status });

  return {
    ok: true,
    ingestion_id,
    receipt,
    decision: {
      stage: "completed_skeleton",
      status: INVENTORY_SYNC_INBOUND_STATUS.RECEIVED,
      decision_code: "EVENT_RECEIVED",
      decision_reason: "Phase 1C-B skeleton complete. No mutations performed.",
      routing: routingResult,
    },
    _phase: "1C-B",
  };
}