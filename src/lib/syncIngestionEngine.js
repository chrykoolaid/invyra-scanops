/**
 * syncIngestionEngine.js — Phase 1C-D
 *
 * Inventory-side ingestion service for the ScanOps ↔ Inventory Bridge v1.
 *
 * Phase 1C-D additions (over Phase 1C-C):
 *   - Stale snapshot evaluation (event-type-specific, threshold-based)
 *   - Business conflict decision handling (payload integrity, role presence,
 *     event-type payload field checks; deferred checks noted inline)
 *   - Ledger status always derived from receipt status via ledgerStatusForReceipt()
 *   - validateSnapshotEvidence() wired to evaluateStaleSnapshot()
 *   - validateEventBusinessRules() wired to evaluateBusinessConflicts()
 *   - routeAcceptedEventToReviewQueue() updated to Phase 1C-D reason
 *   - Decision logic extracted to syncIngestionDecisions.js
 *
 * Preserved from Phase 1C-C (unchanged):
 *   - Full idempotency database lookup (InventorySyncInboundEvent)
 *   - Duplicate same payload_hash → ACK_DUPLICATE or prior receipt
 *   - Same event_id, different payload_hash → REJECTED_CONFLICT
 *   - InventorySyncInboundEvent ledger record persisted on new events
 *   - InventorySyncReceipt persisted for every ingestion decision
 *   - Compact payload_summary + full raw_event_json retained
 *
 * Deferred to Phase 1C-E:
 *   - Live Inventory record version comparison
 *   - Unknown item/barcode entity lookup
 *   - Sequence/out-of-order detection
 *   - Role authorization matrix
 *   - Workflow routing to MarkdownSyncReviewQueue
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

import { base44 } from "@/api/base44Client";
import {
  SCANOPS_BRIDGE_EVENT_TYPE_VALUES,
  INVENTORY_SYNC_INBOUND_STATUS,
  INVENTORY_SYNC_RECEIPT_STATUS,
  isReceiptRetryAllowed,
  getIdempotencyKeyComponents,
} from "./syncIngestionConstants";
import {
  evaluateStaleSnapshot,
  evaluateBusinessConflicts,
  ledgerStatusForReceipt,
} from "./syncIngestionDecisions";
import { routeToMarkdownSyncReviewQueue } from "./syncIngestionRouter";

// ── Utilities ─────────────────────────────────────────────────────────────────

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Build the deterministic idempotency key string.
 * Format: <event_id>::<source_device_id>::<source_session_id>::<event_type>
 */
function buildIdempotencyKey(event) {
  const { event_id, source_device_id, source_session_id, event_type } = getIdempotencyKeyComponents(event);
  return [event_id, source_device_id, source_session_id, event_type]
    .map((v) => String(v || ""))
    .join("::");
}

/**
 * Extract a compact, safe payload summary for ledger display.
 * Never used for business logic. Hard cap at 500 chars.
 */
function buildPayloadSummary(event) {
  const p = event?.payload || {};
  const parts = [
    event.event_type,
    p.sku                         && `SKU:${p.sku}`,
    p.barcode                     && `Barcode:${p.barcode}`,
    p.itemName                    && `Item:${p.itemName}`,
    p.markdown_request_ref        && `Req:${p.markdown_request_ref}`,
    p.markdown_batch_ref          && `Batch:${p.markdown_batch_ref}`,
    p.quantity !== undefined      && `Qty:${p.quantity}`,
    p.reasonCode                  && `Reason:${p.reasonCode}`,
    p.selectedMarkdownPercent !== undefined && `Pct:${p.selectedMarkdownPercent}%`,
  ].filter(Boolean);
  return parts.join(" | ").slice(0, 500);
}

// ── Required bridge envelope fields ──────────────────────────────────────────

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

const REQUIRED_SNAPSHOT_FIELDS = [
  "inventory_snapshot_ref",
  "inventory_snapshot_hash",
  "inventory_record_version",
];

const REQUIRED_SOURCE_FIELDS = [
  "source_device_id",
  "source_session_id",
  "source_user_id",
];

// ── Entity persistence helpers ────────────────────────────────────────────────

/**
 * Persist an InventorySyncInboundEvent ledger record.
 * raw_event_json holds the full original envelope verbatim.
 * Only called once per new unique event — never for duplicates.
 */
async function persistInboundEvent(event, {
  ingestion_id,
  received_at,
  processed_at,
  status,
  idempotency_key,
  decision,
  decision_code,
  decision_reason,
}) {
  const record = {
    ingestion_id,
    event_id:                 event.event_id,
    event_type:               event.event_type,
    event_version:            event.event_version || null,
    source_system:            event.source_system,
    source_device_id:         event.source_device_id,
    source_session_id:        event.source_session_id,
    source_user_id:           event.source_user_id,
    source_user_role:         event.source_user_role || null,
    received_at,
    processed_at,
    status,
    idempotency_key,
    inventory_snapshot_id:    event.inventory_snapshot_id || null,
    inventory_snapshot_ref:   event.inventory_snapshot_ref || null,
    inventory_snapshot_hash:  event.inventory_snapshot_hash || null,
    inventory_record_version: event.inventory_record_version || null,
    last_inventory_sync_at:   event.last_inventory_sync_at || null,
    payload_hash:             event.payload_hash,
    payload_summary:          buildPayloadSummary(event),
    decision:                 decision || "ACK_RECEIVED",
    decision_code,
    decision_reason,
    linked_inventory_workflow_ref: null, // Phase 1C-E
    linked_markdown_ref:           null, // Phase 1C-E
    audit_log_ref:                 null, // Phase 1C-E
    raw_event_json:           event,     // Full verbatim envelope retained
  };

  return await base44.entities.InventorySyncInboundEvent.create(record);
}

/**
 * Persist an InventorySyncReceipt record.
 * Strips internal phase markers before writing.
 */
async function persistReceipt(receiptObj) {
  const { _persisted, _phase, _persist_failed, ...persistable } = receiptObj;
  return await base44.entities.InventorySyncReceipt.create(persistable);
}

// ── Shared pipeline rejection helper ─────────────────────────────────────────

/**
 * Persist ledger + receipt for a failed validation step, then return
 * a standardised pipeline result object.
 *
 * @param {object}  event
 * @param {object}  ctx        — { ingestion_id, received_at, idempotency_key }
 * @param {string}  stage      — pipeline stage label for the result
 * @param {string}  receiptStatus
 * @param {string}  decision_code
 * @param {string}  decision_reason
 * @param {string}  [decisionLabel="REJECTED"]
 */
async function rejectWithLedgerAndReceipt(event, ctx, stage, receiptStatus, decision_code, decision_reason, decisionLabel = "REJECTED") {
  const processed_at = nowIso();
  const ledgerStatus = ledgerStatusForReceipt(receiptStatus);

  await persistInboundEvent(event, {
    ...ctx,
    processed_at,
    status: ledgerStatus,
    decision: decisionLabel,
    decision_code,
    decision_reason,
  }).catch(() => null); // Non-fatal — receipt is the authoritative signal

  const receipt = await buildInventorySyncReceipt(event, {
    ingestion_id:   ctx.ingestion_id,
    received_at:    processed_at,
    status:         receiptStatus,
    decision_code,
    decision_message: decision_reason,
  });

  return {
    ok: false,
    ingestion_id: ctx.ingestion_id,
    receipt,
    decision: { stage, status: ledgerStatus, decision_code, decision_reason },
  };
}

// ── 1. Schema Validation ──────────────────────────────────────────────────────

/**
 * Validate the minimum required fields of a ScanOps bridge event envelope.
 * Checks field presence, event_type membership, and source_system identity.
 *
 * @param {object} event
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

// ── 2. Idempotency Check (Phase 1C-C: live DB lookup, unchanged) ──────────────

/**
 * Check whether this event has already been received and processed.
 *
 * Outcomes:
 *   No existing record → { ok: true, duplicate: false, conflict: false }
 *   Same idempotency_key + same payload_hash → duplicate
 *   Same idempotency_key + different payload_hash → conflict
 *
 * @param {object} event
 * @param {string} idempotency_key
 * @returns {Promise<{ ok: boolean, duplicate: boolean, conflict: boolean, existing?: object }>}
 */
export async function checkIdempotency(event, idempotency_key) {
  const existing = await base44.entities.InventorySyncInboundEvent.filter({ idempotency_key });

  if (!existing || existing.length === 0) {
    return { ok: true, duplicate: false, conflict: false };
  }

  const prior = existing[0];

  if (prior.payload_hash === event.payload_hash) {
    return { ok: false, duplicate: true, conflict: false, existing: prior };
  }

  return { ok: false, duplicate: false, conflict: true, existing: prior };
}

// ── 3. Snapshot Evidence Validation (Phase 1C-D: wired to stale evaluation) ──

/**
 * Validate inventory snapshot evidence field presence, then run the
 * event-type-specific stale snapshot decision matrix.
 *
 * Field presence failures → REJECTED_SCHEMA.
 * Stale snapshot decisions → per evaluateStaleSnapshot() matrix.
 * Fresh or indeterminate → ok: true (proceed to business rules).
 *
 * @param {object} event
 * @param {string} receivedAt — ISO timestamp when Inventory received the event
 * @returns {{ ok: boolean, receiptStatus?, ledgerStatus?, decision_code?, decision_reason? }}
 */
export function validateSnapshotEvidence(event, receivedAt) {
  // Field presence check
  const missing = REQUIRED_SNAPSHOT_FIELDS.filter((field) => !event[field]);
  if (missing.length > 0) {
    return {
      ok: false,
      receiptStatus: INVENTORY_SYNC_RECEIPT_STATUS.REJECTED_SCHEMA,
      ledgerStatus:  INVENTORY_SYNC_INBOUND_STATUS.REJECTED_SCHEMA,
      decision_code: "MISSING_SNAPSHOT_EVIDENCE",
      decision_reason: `Missing inventory snapshot evidence field(s): ${missing.join(", ")}.`,
    };
  }

  // Stale snapshot decision matrix (Phase 1C-D)
  const staleDecision = evaluateStaleSnapshot(event, receivedAt);
  if (staleDecision) {
    return { ok: false, ...staleDecision };
  }

  return {
    ok: true,
    decision_code: "SNAPSHOT_EVIDENCE_PRESENT",
    decision_reason: "Snapshot evidence fields present and staleness check passed. Live version comparison deferred to Phase 1C-E.",
  };
}

// ── 4. Source Validation (unchanged from Phase 1C-C) ─────────────────────────

/**
 * Validate ScanOps source identity field presence.
 * Full auth enforcement deferred to Phase 1C-E.
 *
 * @param {object} event
 * @returns {{ ok: boolean, receiptStatus?, ledgerStatus?, decision_code?, decision_reason? }}
 */
export function validateScanOpsSource(event) {
  const missing = REQUIRED_SOURCE_FIELDS.filter((field) => !event[field]);

  if (missing.length > 0) {
    return {
      ok: false,
      receiptStatus: INVENTORY_SYNC_RECEIPT_STATUS.REJECTED_AUTH,
      ledgerStatus:  INVENTORY_SYNC_INBOUND_STATUS.REJECTED_AUTH,
      decision_code: "MISSING_SOURCE_IDENTITY",
      decision_reason: `Missing source identity field(s): ${missing.join(", ")}.`,
    };
  }

  return {
    ok: true,
    decision_code: "SOURCE_IDENTITY_PRESENT",
    decision_reason: "Source identity fields present. Full auth enforcement deferred to Phase 1C-E.",
  };
}

// ── 5. Business Rules Validation (Phase 1C-D: wired to conflict matrix) ───────

/**
 * Evaluate event-type-specific business conflict checks.
 * Wired to evaluateBusinessConflicts() in syncIngestionDecisions.js.
 *
 * Checks performed in Phase 1C-D:
 *   - Payload structural integrity
 *   - payload_hash non-empty string
 *   - source_user_role presence (soft hold)
 *   - Event-type-specific payload reference field presence
 *
 * Deferred to Phase 1C-E:
 *   - Unknown barcode/item lookup
 *   - Quantity mismatch
 *   - Out-of-order sequence detection
 *   - Changed markdown status
 *   - Unauthorized approval (role matrix)
 *
 * @param {object} event
 * @returns {{ ok: boolean, receiptStatus?, ledgerStatus?, decision_code?, decision_reason? }}
 */
export function validateEventBusinessRules(event) {
  const conflict = evaluateBusinessConflicts(event);
  if (conflict) {
    return { ok: false, ...conflict };
  }

  return {
    ok: true,
    decision_code: "BUSINESS_RULES_PHASE_1C_D_PASSED",
    decision_reason: "Phase 1C-D business checks passed. Deferred checks (item lookup, sequence, role matrix) run in Phase 1C-E.",
  };
}

// ── 6. Receipt Builder ────────────────────────────────────────────────────────

/**
 * Build and persist an InventorySyncReceipt record.
 *
 * @param {object} event
 * @param {{ ingestion_id, received_at, status, decision_code, decision_message, linked_workflow_ref? }} decision
 * @param {boolean} [persist=true]
 * @returns {Promise<object>}
 */
export async function buildInventorySyncReceipt(event, decision, persist = true) {
  const receiptStatus = decision?.status || INVENTORY_SYNC_RECEIPT_STATUS.ACK_RECEIVED;

  const receiptObj = {
    receipt_id:             makeId("rcpt"),
    event_id:               event?.event_id || null,
    ingestion_id:           decision?.ingestion_id || null,
    status:                 receiptStatus,
    inventory_received_at:  decision?.received_at || nowIso(),
    inventory_processed_at: nowIso(),
    decision_code:          decision?.decision_code || receiptStatus,
    decision_message:       decision?.decision_message || decision?.decision_reason || null,
    linked_workflow_ref:    decision?.linked_workflow_ref || null,
    retry_allowed:          isReceiptRetryAllowed(receiptStatus),
    created_at:             nowIso(),
  };

  if (persist) {
    try {
      const persisted = await persistReceipt(receiptObj);
      return persisted || receiptObj;
    } catch {
      return { ...receiptObj, _persist_failed: true };
    }
  }

  return receiptObj;
}

// ── 7. Review Queue Routing (Phase 1C-E: live routing) ───────────────────────

/**
 * Route an eligible ScanOps bridge event to the MarkdownSyncReviewQueue.
 *
 * Phase 1C-E: delegates to routeToMarkdownSyncReviewQueue() in syncIngestionRouter.js.
 *
 * Eligible receipt statuses: ACK_RECEIVED, ACK_PROCESSED, HELD_FOR_REVIEW.
 * Ineligible: ACK_DUPLICATE, REJECTED_*, FAILED_*, QUARANTINED.
 *
 * Routing is idempotent — duplicate ingestion_ids do not create duplicate records.
 * mutation_performed is always false — review record creation is not an
 * operational mutation (no stock, price, POS, order, or forecast change).
 *
 * @param {object} event
 * @param {object} decision — { ingestion_id, status, decision_code, decision_reason }
 * @returns {Promise<{ routed: boolean, route_type?: string, linked_workflow_ref?: string, mutation_performed: boolean, reason?: string }>}
 */
export async function routeAcceptedEventToReviewQueue(event, decision) {
  return routeToMarkdownSyncReviewQueue(event, decision);
}

// ── 8. Main Ingestion Entry Point ─────────────────────────────────────────────

/**
 * Process an inbound ScanOps bridge event through the Inventory ingestion pipeline.
 *
 * Pipeline order (Phase 1C-E — Ledger First + Review Routing):
 *   1.  Validate bridge event schema
 *   2.  Build idempotency key
 *   3.  Check idempotency (live DB)
 *       a. Exact duplicate → ACK_DUPLICATE receipt → return (no reprocessing)
 *       b. Payload conflict → REJECTED_CONFLICT ledger + receipt → return
 *   4.  Validate snapshot evidence (field presence + stale snapshot matrix)
 *   5.  Validate source identity (field presence)
 *   6.  Validate business rules (conflict matrix — Phase 1C-D safe checks)
 *   7.  Persist InventorySyncInboundEvent ledger record
 *   8.  Persist InventorySyncReceipt (ACK_RECEIVED)
 *   9.  Route to MarkdownSyncReviewQueue (idempotent; updates linked_workflow_ref)
 *
 * NEVER mutates stock, price, POS, orders, forecasting, or Item Master.
 *
 * @param {object} event — ScanOps bridge event envelope
 * @returns {Promise<{ ok: boolean, ingestion_id: string, receipt: object, decision: object }>}
 */
export async function processInboundScanOpsEvent(event) {
  const ingestion_id = makeId("ing");
  const received_at  = nowIso();

  // ── Step 1: Schema validation ─────────────────────────────────────────────
  const schemaResult = validateBridgeEventSchema(event);
  if (!schemaResult.ok) {
    // Schema failures: receipt only — event envelope is too malformed for a full ledger record
    const receipt = await buildInventorySyncReceipt(event, {
      ingestion_id,
      received_at,
      status:          INVENTORY_SYNC_RECEIPT_STATUS.REJECTED_SCHEMA,
      decision_code:   schemaResult.decision_code,
      decision_message: schemaResult.decision_reason,
    });
    return {
      ok: false, ingestion_id, receipt,
      decision: {
        stage: "schema_validation",
        status: schemaResult.status,
        decision_code: schemaResult.decision_code,
        decision_reason: schemaResult.decision_reason,
      },
    };
  }

  // ── Step 2: Build idempotency key ─────────────────────────────────────────
  const idempotency_key = buildIdempotencyKey(event);
  const ctx = { ingestion_id, received_at, idempotency_key };

  // ── Step 3: Idempotency check (live DB) ──────────────────────────────────
  const idempotencyResult = await checkIdempotency(event, idempotency_key);

  if (idempotencyResult.duplicate) {
    // Attempt to return the original receipt
    const priorReceipts = await base44.entities.InventorySyncReceipt.filter({
      ingestion_id: idempotencyResult.existing?.ingestion_id,
    }).catch(() => []);
    const priorReceipt = priorReceipts?.[0];

    if (priorReceipt) {
      return {
        ok: true,
        ingestion_id: idempotencyResult.existing?.ingestion_id,
        receipt: priorReceipt,
        decision: {
          stage: "idempotency_check",
          status: INVENTORY_SYNC_RECEIPT_STATUS.ACK_DUPLICATE,
          decision_code: "DUPLICATE_EVENT_REPLAY",
          decision_reason: "Exact duplicate of a previously processed event. Returning original receipt.",
        },
      };
    }

    // No prior receipt — issue a fresh ACK_DUPLICATE referencing the prior ingestion
    const dupReceipt = await buildInventorySyncReceipt(event, {
      ingestion_id:    idempotencyResult.existing?.ingestion_id || ingestion_id,
      received_at,
      status:          INVENTORY_SYNC_RECEIPT_STATUS.ACK_DUPLICATE,
      decision_code:   "DUPLICATE_EVENT_REPLAY",
      decision_message: "Event was already received by Inventory. Returning duplicate acknowledgement.",
    });
    return {
      ok: true,
      ingestion_id: idempotencyResult.existing?.ingestion_id || ingestion_id,
      receipt: dupReceipt,
      decision: {
        stage: "idempotency_check",
        status: INVENTORY_SYNC_RECEIPT_STATUS.ACK_DUPLICATE,
        decision_code: "DUPLICATE_EVENT_REPLAY",
        decision_reason: "Exact duplicate replay. ACK_DUPLICATE receipt issued.",
      },
    };
  }

  if (idempotencyResult.conflict) {
    return rejectWithLedgerAndReceipt(
      event, ctx,
      "idempotency_check",
      INVENTORY_SYNC_RECEIPT_STATUS.REJECTED_CONFLICT,
      "IDEMPOTENCY_PAYLOAD_HASH_CONFLICT",
      "Same event identity was received with a different payload hash.",
      "REJECTED"
    );
  }

  // ── Step 4: Snapshot evidence validation + stale snapshot matrix ──────────
  const snapshotResult = validateSnapshotEvidence(event, received_at);
  if (!snapshotResult.ok) {
    return rejectWithLedgerAndReceipt(
      event, ctx,
      "snapshot_evidence",
      snapshotResult.receiptStatus,
      snapshotResult.decision_code,
      snapshotResult.decision_reason,
      snapshotResult.receiptStatus.startsWith("HELD") ? "HELD" : "REJECTED"
    );
  }

  // ── Step 5: Source validation ─────────────────────────────────────────────
  const sourceResult = validateScanOpsSource(event);
  if (!sourceResult.ok) {
    return rejectWithLedgerAndReceipt(
      event, ctx,
      "source_validation",
      sourceResult.receiptStatus,
      sourceResult.decision_code,
      sourceResult.decision_reason,
      "REJECTED"
    );
  }

  // ── Step 6: Business rules validation (Phase 1C-D conflict matrix) ────────
  const rulesResult = validateEventBusinessRules(event);
  if (!rulesResult.ok) {
    const decisionLabel = rulesResult.receiptStatus === INVENTORY_SYNC_RECEIPT_STATUS.HELD_FOR_REVIEW
      ? "HELD"
      : "REJECTED";
    return rejectWithLedgerAndReceipt(
      event, ctx,
      "business_rules",
      rulesResult.receiptStatus,
      rulesResult.decision_code,
      rulesResult.decision_reason,
      decisionLabel
    );
  }

  // ── Step 7: Persist InventorySyncInboundEvent ledger record ───────────────
  // Status: PROCESSED — ledger written; review routing follows in Step 9.
  const processed_at = nowIso();
  await persistInboundEvent(event, {
    ...ctx,
    processed_at,
    status:          INVENTORY_SYNC_INBOUND_STATUS.PROCESSED,
    decision:        "ACK_RECEIVED",
    decision_code:   "INGESTED_LEDGER_ONLY",
    decision_reason: "Event accepted into Inventory sync ledger. Routing to MarkdownSyncReviewQueue in Phase 1C-E.",
  });

  // ── Step 8: Persist InventorySyncReceipt ─────────────────────────────────
  const receipt = await buildInventorySyncReceipt(event, {
    ingestion_id,
    received_at: processed_at,
    status:          INVENTORY_SYNC_RECEIPT_STATUS.ACK_RECEIVED,
    decision_code:   "INGESTED_LEDGER_ONLY",
    decision_message: "Event received and stored in Inventory sync ledger. Routed to MarkdownSyncReviewQueue for review.",
  });

  // ── Step 9: Route to MarkdownSyncReviewQueue ──────────────────────────────
  // Idempotent — duplicate ingestion_ids return the existing review_id.
  // linked_workflow_ref is written back to both ledger and receipt by the router.
  // mutation_performed is always false — no stock/price/POS/order/forecast change.
  const routingResult = await routeAcceptedEventToReviewQueue(event, {
    ingestion_id,
    status:          receipt.status,
    decision_code:   "INGESTED_LEDGER_ONLY",
    decision_reason: "Event passed all Phase 1C-E ingestion checks. Routed to MarkdownSyncReviewQueue.",
  });

  return {
    ok: true,
    ingestion_id,
    receipt,
    decision: {
      stage:               "ledger_and_review_routed",
      status:              INVENTORY_SYNC_INBOUND_STATUS.PROCESSED,
      decision_code:       "INGESTED_LEDGER_ONLY",
      decision_reason:     "Phase 1C-E complete. Ledger, receipt, and review queue record persisted. No operational mutations performed.",
      routing:             routingResult,
      linked_workflow_ref: routingResult?.linked_workflow_ref || null,
      mutation_performed:  false,
    },
  };
}