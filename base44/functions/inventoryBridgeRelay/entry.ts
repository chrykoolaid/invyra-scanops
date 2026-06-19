/**
 * inventoryBridgeRelay — Phase 1D-B
 *
 * ⚠️  PROTOTYPE CLOUD RELAY — NOT A LOCAL LAN BRIDGE
 *
 * This function is a Base44 cloud-hosted prototype relay.
 * It is NOT a local LAN server.
 * It is NOT a store Wi-Fi/IP bridge host.
 * It is NOT offline-capable.
 * The real production bridge requires a desktop/local server companion service.
 *
 * Purpose:
 *   Accept a batch of ScanOps bridge events (up to MAX_BRIDGE_BATCH_SIZE = 20),
 *   pass each event individually through the Inventory ingestion engine
 *   (processInboundScanOpsEvent), and return InventorySyncReceipt objects to ScanOps.
 *
 * HARD RULES — enforced permanently:
 *   - Every event MUST pass through processInboundScanOpsEvent(event) independently.
 *   - Transport MUST NOT batch-accept or batch-reject without per-event decisions.
 *   - Transport MUST NOT bypass ingestion engine validation.
 *   - Transport MUST NOT create MarkdownSyncReviewQueue records directly.
 *   - Transport MUST NOT mutate stock, pricing, POS, orders, forecasting, or Item Master.
 *   - A 200 HTTP response does NOT mean all events accepted — check each receipt.status.
 *   - No StockMovement, POSLineItem, or PurchaseOrder creation.
 *   - No markdown price activation. No MarkdownRound creation.
 *   - No wastage posting. No multi-location sync.
 *   - Inventory remains source-of-truth. ScanOps remains capture-only.
 *
 * Device pairing / token enforcement: Phase 1D-D (not implemented here).
 * The function is structured to accept an Authorization header for forward compatibility.
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

// ── Constants (inlined — no local imports in Deno functions) ──────────────────

const BRIDGE_PROTOCOL_VERSION  = "1.0.0";
const MAX_BRIDGE_BATCH_SIZE    = 20;
const TRANSPORT_NOTE           = "PROTOTYPE CLOUD RELAY — NOT A LOCAL LAN BRIDGE";

const VALID_EVENT_TYPES = new Set([
  "scanops.markdown.requested",
  "scanops.markdown.approved",
  "scanops.markdown.returned",
  "scanops.markdown.rejected",
  "scanops.markdown.handoff.created",
]);

const REQUIRED_ENVELOPE_FIELDS = [
  "event_id", "event_type", "event_version", "source_system",
  "source_device_id", "source_session_id", "source_user_id",
  "created_at", "captured_at",
  "inventory_snapshot_ref", "inventory_snapshot_hash", "inventory_record_version",
  "payload", "payload_hash",
];

const REQUIRED_SNAPSHOT_FIELDS = [
  "inventory_snapshot_ref", "inventory_snapshot_hash", "inventory_record_version",
];

const REQUIRED_SOURCE_FIELDS = [
  "source_device_id", "source_session_id", "source_user_id",
];

const LEDGER_MAP = {
  ACK_RECEIVED:             "PROCESSED",
  ACK_PROCESSED:            "PROCESSED",
  ACK_DUPLICATE:            "DUPLICATE",
  HELD_FOR_REVIEW:          "HELD_FOR_REVIEW",
  REJECTED_SCHEMA:          "REJECTED_SCHEMA",
  REJECTED_AUTH:            "REJECTED_AUTH",
  REJECTED_STALE_SNAPSHOT:  "REJECTED_STALE_SNAPSHOT",
  REJECTED_CONFLICT:        "REJECTED_CONFLICT",
  FAILED_RETRYABLE:         "FAILED_RETRYABLE",
  FAILED_TERMINAL:          "FAILED_TERMINAL",
  QUARANTINED:              "QUARANTINED",
};

const ROUTE_ELIGIBLE = new Set([
  "ACK_RECEIVED", "ACK_PROCESSED", "HELD_FOR_REVIEW",
]);

const RETRY_ALLOWED = new Set(["FAILED_RETRYABLE"]);

const STALE_THRESHOLDS = {
  "scanops.markdown.approved":         60,
  "scanops.markdown.requested":       240,
  "scanops.markdown.returned":        240,
  "scanops.markdown.rejected":        480,
  "scanops.markdown.handoff.created": 120,
};

const STALE_MATRIX = {
  "scanops.markdown.requested":        "HELD_FOR_REVIEW",
  "scanops.markdown.approved":         "HELD_FOR_REVIEW",
  "scanops.markdown.returned":         "HELD_FOR_REVIEW",
  "scanops.markdown.rejected":         "ACK_PROCESSED",
  "scanops.markdown.handoff.created":  "HELD_FOR_REVIEW",
};

const REVIEW_DEFAULTS = {
  "scanops.markdown.requested":       { status: "PENDING_REVIEW",  reason: "MARKDOWN_REQUEST_FROM_SCANOPS" },
  "scanops.markdown.approved":        { status: "HELD_FOR_REVIEW", reason: "SCANOPS_MARKDOWN_APPROVAL_REQUIRES_INVENTORY_REVIEW" },
  "scanops.markdown.returned":        { status: "HELD_FOR_REVIEW", reason: "SCANOPS_MARKDOWN_RETURN_REQUIRES_REVIEW" },
  "scanops.markdown.rejected":        { status: "PENDING_REVIEW",  reason: "SCANOPS_MARKDOWN_REJECTION_RECEIVED" },
  "scanops.markdown.handoff.created": { status: "HELD_FOR_REVIEW", reason: "SCANOPS_HANDOFF_REQUIRES_REVIEW" },
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function nowIso() { return new Date().toISOString(); }
function makeId(p) { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

function minutesSinceLastSync(lastSyncAt, receivedAt) {
  if (!lastSyncAt || !receivedAt) return null;
  const a = Date.parse(lastSyncAt), b = Date.parse(receivedAt);
  if (isNaN(a) || isNaN(b)) return null;
  return Math.max(0, Math.floor((b - a) / 60000));
}

function classifyReceiptStatus(status) {
  if (!status) return "rejected";
  if (status === "ACK_RECEIVED" || status === "ACK_PROCESSED") return "accepted";
  if (status === "ACK_DUPLICATE") return "duplicate";
  if (status === "HELD_FOR_REVIEW") return "held";
  return "rejected"; // REJECTED_*, FAILED_*, QUARANTINED
}

// ── Stale snapshot evaluator ──────────────────────────────────────────────────

function evaluateStale(event, receivedAt) {
  const { event_type, last_inventory_sync_at: ls,
          inventory_snapshot_hash: sh, inventory_record_version: rv } = event;

  if (!ls) {
    if (!sh && !rv) {
      return {
        receiptStatus: "HELD_FOR_REVIEW", ledgerStatus: "HELD_FOR_REVIEW",
        decision_code: "SNAPSHOT_TIMING_UNKNOWN_HELD",
        decision_reason: "last_inventory_sync_at absent and snapshot identity unverifiable.",
      };
    }
    return null;
  }

  const elapsed = minutesSinceLastSync(ls, receivedAt);
  if (elapsed === null) {
    return {
      receiptStatus: "HELD_FOR_REVIEW", ledgerStatus: "HELD_FOR_REVIEW",
      decision_code: "SNAPSHOT_TIMESTAMP_PARSE_ERROR_HELD",
      decision_reason: "Could not compute staleness from timestamps.",
    };
  }

  const threshold = STALE_THRESHOLDS[event_type] ?? 240;
  if (elapsed <= threshold) return null;

  if (event_type === "scanops.markdown.approved") {
    return {
      receiptStatus: "REJECTED_STALE_SNAPSHOT", ledgerStatus: "REJECTED_STALE_SNAPSHOT",
      decision_code: "STALE_SNAPSHOT_MARKDOWN_APPROVAL_REJECTED",
      decision_reason: `Approval rejected: ${elapsed}min stale (threshold ${threshold}min).`,
    };
  }

  const rs = STALE_MATRIX[event_type] || "HELD_FOR_REVIEW";
  return {
    receiptStatus: rs, ledgerStatus: LEDGER_MAP[rs] || "HELD_FOR_REVIEW",
    decision_code: `STALE_SNAPSHOT_${event_type.toUpperCase().replace(/\./g, "_")}`,
    decision_reason: `Snapshot ${elapsed}min stale (threshold ${threshold}min).`,
  };
}

// ── Business conflict evaluator ───────────────────────────────────────────────

function evaluateConflicts(event) {
  const { payload, payload_hash, source_user_role, event_type } = event;

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      receiptStatus: "REJECTED_SCHEMA", ledgerStatus: "REJECTED_SCHEMA",
      decision_code: "INVALID_PAYLOAD_STRUCTURE",
      decision_reason: "Payload missing or invalid.",
    };
  }
  if (!payload_hash || typeof payload_hash !== "string" || !payload_hash.trim()) {
    return {
      receiptStatus: "REJECTED_SCHEMA", ledgerStatus: "REJECTED_SCHEMA",
      decision_code: "MISSING_PAYLOAD_HASH",
      decision_reason: "payload_hash missing or empty.",
    };
  }
  if (!source_user_role) {
    return {
      receiptStatus: "HELD_FOR_REVIEW", ledgerStatus: "HELD_FOR_REVIEW",
      decision_code: "MISSING_SOURCE_USER_ROLE_HELD",
      decision_reason: "source_user_role absent. Held pending review.",
    };
  }

  // Event-type-specific payload reference checks
  const requiredRef = ["scanops.markdown.requested","scanops.markdown.approved",
    "scanops.markdown.returned","scanops.markdown.rejected","scanops.markdown.handoff.created"];
  if (requiredRef.includes(event_type)) {
    if (!payload.markdown_request_ref) {
      return {
        receiptStatus: "HELD_FOR_REVIEW", ledgerStatus: "HELD_FOR_REVIEW",
        decision_code: "VALIDATION_DEFERRED_REVIEW_REQUIRED",
        decision_reason: "Payload missing markdown_request_ref. Held for review.",
      };
    }
  }

  return null;
}

// ── Review queue router ───────────────────────────────────────────────────────

async function routeToReviewQueue(base44, event, ingestion_id, receipt_status, decision_code, decision_reason) {
  if (!ROUTE_ELIGIBLE.has(receipt_status)) {
    return { routed: false, reason: "NOT_ELIGIBLE_FOR_REVIEW_ROUTING", mutation_performed: false };
  }

  const existing = await base44.asServiceRole.entities.MarkdownSyncReviewQueue
    .filter({ ingestion_id }).catch(() => []);
  if (existing?.[0]) {
    return {
      routed: true, route_type: "MARKDOWN_SYNC_REVIEW",
      linked_workflow_ref: existing[0].review_id,
      mutation_performed: false, _idempotent: true,
    };
  }

  const defaults = REVIEW_DEFAULTS[event.event_type] || { status: "PENDING_REVIEW", reason: "UNKNOWN_EVENT_TYPE_REVIEW" };
  const review_status = receipt_status === "HELD_FOR_REVIEW" ? "HELD_FOR_REVIEW" : defaults.status;
  const p = event.payload || {};
  const review_id = makeId("rev");

  const record = {
    review_id, ingestion_id,
    event_id:                 event.event_id,
    event_type:               event.event_type,
    source_system:            event.source_system || "scanops",
    source_device_id:         event.source_device_id || null,
    source_session_id:        event.source_session_id || null,
    source_user_id:           event.source_user_id || null,
    source_user_role:         event.source_user_role || null,
    inventory_snapshot_ref:   event.inventory_snapshot_ref || null,
    inventory_snapshot_hash:  event.inventory_snapshot_hash || null,
    inventory_record_version: event.inventory_record_version || null,
    payload_hash:             event.payload_hash,
    status:                   review_status,
    review_reason:            defaults.reason,
    decision_code:            decision_code || null,
    decision_reason:          decision_reason || null,
    sku:                      p.sku || null,
    barcode:                  p.barcode || null,
    item_name_snapshot:       p.itemName || p.item_name || null,
    markdown_request_ref:     p.markdown_request_ref || null,
    markdown_batch_ref:       p.markdown_batch_ref || null,
    quantity:                 p.quantity != null ? Number(p.quantity) : null,
    discount_percent:         p.selectedMarkdownPercent != null ? Number(p.selectedMarkdownPercent) : null,
    reason_code:              p.reasonCode || null,
    linked_inbound_event_ref: ingestion_id,
    created_at:               nowIso(),
    updated_at:               nowIso(),
  };

  let persisted;
  try {
    persisted = await base44.asServiceRole.entities.MarkdownSyncReviewQueue.create(record);
  } catch {
    return { routed: false, reason: "REVIEW_QUEUE_PERSIST_FAILED", mutation_performed: false };
  }

  const rid = persisted?.review_id || review_id;

  // Update linked refs on ledger and receipt (best-effort, non-fatal)
  await Promise.all([
    base44.asServiceRole.entities.InventorySyncInboundEvent
      .filter({ ingestion_id }).catch(() => [])
      .then(recs => recs?.[0]?.id
        ? base44.asServiceRole.entities.InventorySyncInboundEvent
            .update(recs[0].id, { linked_inventory_workflow_ref: rid }).catch(() => null)
        : null),
    base44.asServiceRole.entities.InventorySyncReceipt
      .filter({ ingestion_id }).catch(() => [])
      .then(recs => recs?.[0]?.id
        ? base44.asServiceRole.entities.InventorySyncReceipt
            .update(recs[0].id, { linked_workflow_ref: rid }).catch(() => null)
        : null),
  ]);

  return {
    routed: true, route_type: "MARKDOWN_SYNC_REVIEW",
    linked_workflow_ref: rid, mutation_performed: false,
  };
}

// ── Core: processInboundScanOpsEvent (inlined for Deno — no local imports) ────
//
// This is the ingestion engine inlined from lib/syncIngestionEngine.js.
// Deno backend functions cannot import local project files.
// The logic is identical to the frontend lib — kept in sync manually.
// Transport never bypasses this function. Every event passes through it.

async function processInboundScanOpsEvent(base44, event) {
  const ingestion_id = makeId("ing");
  const received_at  = nowIso();
  const safeEventId  = event?.event_id || makeId("schema_rej");

  // ── Step 1: Schema validation ───────────────────────────────────────────────
  if (!event || typeof event !== "object") {
    const receipt = await base44.asServiceRole.entities.InventorySyncReceipt.create({
      receipt_id: makeId("rcpt"), event_id: safeEventId, ingestion_id,
      status: "REJECTED_SCHEMA", inventory_received_at: received_at,
      inventory_processed_at: nowIso(), decision_code: "INVALID_BRIDGE_EVENT_SCHEMA",
      decision_message: "Event is null or not an object.", retry_allowed: false, created_at: nowIso(),
    });
    return { ok: false, ingestion_id, receipt, decision: { stage: "schema", status: "REJECTED_SCHEMA", decision_code: "INVALID_BRIDGE_EVENT_SCHEMA" } };
  }

  const missingEnv = REQUIRED_ENVELOPE_FIELDS.filter(
    f => event[f] === undefined || event[f] === null || event[f] === ""
  );
  if (missingEnv.length) {
    const receipt = await base44.asServiceRole.entities.InventorySyncReceipt.create({
      receipt_id: makeId("rcpt"), event_id: safeEventId, ingestion_id,
      status: "REJECTED_SCHEMA", inventory_received_at: received_at,
      inventory_processed_at: nowIso(), decision_code: "INVALID_BRIDGE_EVENT_SCHEMA",
      decision_message: `Missing: ${missingEnv.join(", ")}`, retry_allowed: false, created_at: nowIso(),
    });
    return { ok: false, ingestion_id, receipt, decision: { stage: "schema", status: "REJECTED_SCHEMA", decision_code: "INVALID_BRIDGE_EVENT_SCHEMA", decision_reason: `Missing: ${missingEnv.join(", ")}` } };
  }

  if (!VALID_EVENT_TYPES.has(event.event_type)) {
    const receipt = await base44.asServiceRole.entities.InventorySyncReceipt.create({
      receipt_id: makeId("rcpt"), event_id: safeEventId, ingestion_id,
      status: "REJECTED_SCHEMA", inventory_received_at: received_at,
      inventory_processed_at: nowIso(), decision_code: "UNSUPPORTED_EVENT_TYPE",
      decision_message: `Unsupported event_type: ${event.event_type}`, retry_allowed: false, created_at: nowIso(),
    });
    return { ok: false, ingestion_id, receipt, decision: { stage: "schema", status: "REJECTED_SCHEMA", decision_code: "UNSUPPORTED_EVENT_TYPE" } };
  }

  if (event.source_system !== "scanops") {
    const receipt = await base44.asServiceRole.entities.InventorySyncReceipt.create({
      receipt_id: makeId("rcpt"), event_id: safeEventId, ingestion_id,
      status: "REJECTED_SCHEMA", inventory_received_at: received_at,
      inventory_processed_at: nowIso(), decision_code: "INVALID_SOURCE_SYSTEM",
      decision_message: `Invalid source_system: ${event.source_system}`, retry_allowed: false, created_at: nowIso(),
    });
    return { ok: false, ingestion_id, receipt, decision: { stage: "schema", status: "REJECTED_SCHEMA", decision_code: "INVALID_SOURCE_SYSTEM" } };
  }

  // ── Step 2: Idempotency key ─────────────────────────────────────────────────
  const ik = [event.event_id, event.source_device_id, event.source_session_id, event.event_type]
    .map(v => String(v || "")).join("::");

  // ── Step 3: Idempotency check ───────────────────────────────────────────────
  const existing = await base44.asServiceRole.entities.InventorySyncInboundEvent
    .filter({ idempotency_key: ik }).catch(() => []);

  if (existing?.length) {
    const prior = existing[0];
    if (prior.payload_hash === event.payload_hash) {
      const priorReceipts = await base44.asServiceRole.entities.InventorySyncReceipt
        .filter({ ingestion_id: prior.ingestion_id }).catch(() => []);
      const pr = priorReceipts?.[0];
      if (pr) return { ok: true, ingestion_id: prior.ingestion_id, receipt: pr, decision: { stage: "idempotency_check", status: "ACK_DUPLICATE", decision_code: "DUPLICATE_EVENT_REPLAY" } };
      const dupR = await base44.asServiceRole.entities.InventorySyncReceipt.create({
        receipt_id: makeId("rcpt"), event_id: event.event_id, ingestion_id: prior.ingestion_id,
        status: "ACK_DUPLICATE", inventory_received_at: received_at, inventory_processed_at: nowIso(),
        decision_code: "DUPLICATE_EVENT_REPLAY", decision_message: "Duplicate ACK.", retry_allowed: false, created_at: nowIso(),
      });
      return { ok: true, ingestion_id: prior.ingestion_id, receipt: dupR, decision: { stage: "idempotency_check", status: "ACK_DUPLICATE", decision_code: "DUPLICATE_EVENT_REPLAY" } };
    }
    // Conflict
    await base44.asServiceRole.entities.InventorySyncInboundEvent.create({
      ingestion_id, event_id: event.event_id, event_type: event.event_type,
      source_system: event.source_system, source_device_id: event.source_device_id,
      source_session_id: event.source_session_id, source_user_id: event.source_user_id,
      received_at, processed_at: nowIso(), status: "REJECTED_CONFLICT",
      idempotency_key: ik, payload_hash: event.payload_hash, decision: "REJECTED",
      decision_code: "IDEMPOTENCY_PAYLOAD_HASH_CONFLICT",
      decision_reason: "Same event identity, different payload_hash.", raw_event_json: event,
    }).catch(() => null);
    const receipt = await base44.asServiceRole.entities.InventorySyncReceipt.create({
      receipt_id: makeId("rcpt"), event_id: event.event_id, ingestion_id,
      status: "REJECTED_CONFLICT", inventory_received_at: received_at, inventory_processed_at: nowIso(),
      decision_code: "IDEMPOTENCY_PAYLOAD_HASH_CONFLICT", decision_message: "Payload hash conflict.",
      retry_allowed: false, created_at: nowIso(),
    });
    return { ok: false, ingestion_id, receipt, decision: { stage: "idempotency_check", status: "REJECTED_CONFLICT", decision_code: "IDEMPOTENCY_PAYLOAD_HASH_CONFLICT" } };
  }

  // ── Step 4: Snapshot evidence validation ────────────────────────────────────
  const missingSnap = REQUIRED_SNAPSHOT_FIELDS.filter(f => !event[f]);
  if (missingSnap.length) {
    await base44.asServiceRole.entities.InventorySyncInboundEvent.create({
      ingestion_id, event_id: event.event_id, event_type: event.event_type,
      source_system: event.source_system, source_device_id: event.source_device_id,
      source_session_id: event.source_session_id, source_user_id: event.source_user_id,
      received_at, processed_at: nowIso(), status: "REJECTED_SCHEMA",
      idempotency_key: ik, payload_hash: event.payload_hash, decision: "REJECTED",
      decision_code: "MISSING_SNAPSHOT_EVIDENCE",
      decision_reason: `Missing snapshot fields: ${missingSnap.join(", ")}`, raw_event_json: event,
    }).catch(() => null);
    const receipt = await base44.asServiceRole.entities.InventorySyncReceipt.create({
      receipt_id: makeId("rcpt"), event_id: event.event_id, ingestion_id,
      status: "REJECTED_SCHEMA", inventory_received_at: received_at, inventory_processed_at: nowIso(),
      decision_code: "MISSING_SNAPSHOT_EVIDENCE",
      decision_message: `Missing: ${missingSnap.join(", ")}`, retry_allowed: false, created_at: nowIso(),
    });
    return { ok: false, ingestion_id, receipt, decision: { stage: "snapshot", status: "REJECTED_SCHEMA", decision_code: "MISSING_SNAPSHOT_EVIDENCE" } };
  }

  const stale = evaluateStale(event, received_at);
  if (stale) {
    const decisionLabel = stale.receiptStatus.startsWith("HELD") ? "HELD" : "REJECTED";
    await base44.asServiceRole.entities.InventorySyncInboundEvent.create({
      ingestion_id, event_id: event.event_id, event_type: event.event_type,
      source_system: event.source_system, source_device_id: event.source_device_id || null,
      source_session_id: event.source_session_id || null, source_user_id: event.source_user_id || null,
      received_at, processed_at: nowIso(), status: stale.ledgerStatus,
      idempotency_key: ik, payload_hash: event.payload_hash,
      decision: decisionLabel, decision_code: stale.decision_code,
      decision_reason: stale.decision_reason, raw_event_json: event,
    }).catch(() => null);
    const receipt = await base44.asServiceRole.entities.InventorySyncReceipt.create({
      receipt_id: makeId("rcpt"), event_id: event.event_id, ingestion_id,
      status: stale.receiptStatus, inventory_received_at: received_at, inventory_processed_at: nowIso(),
      decision_code: stale.decision_code, decision_message: stale.decision_reason,
      retry_allowed: RETRY_ALLOWED.has(stale.receiptStatus), created_at: nowIso(),
    });
    let routing = { routed: false, reason: "NOT_ELIGIBLE_FOR_REVIEW_ROUTING", mutation_performed: false };
    if (ROUTE_ELIGIBLE.has(stale.receiptStatus)) {
      routing = await routeToReviewQueue(base44, event, ingestion_id, stale.receiptStatus, stale.decision_code, stale.decision_reason);
    }
    return {
      ok: stale.receiptStatus === "HELD_FOR_REVIEW" || stale.receiptStatus === "ACK_PROCESSED",
      ingestion_id, receipt,
      decision: { stage: "snapshot_stale", status: stale.ledgerStatus, decision_code: stale.decision_code, routing, mutation_performed: false },
    };
  }

  // ── Step 5: Source validation ───────────────────────────────────────────────
  const missingSource = REQUIRED_SOURCE_FIELDS.filter(f => !event[f]);
  if (missingSource.length) {
    await base44.asServiceRole.entities.InventorySyncInboundEvent.create({
      ingestion_id, event_id: event.event_id, event_type: event.event_type,
      source_system: event.source_system, source_device_id: event.source_device_id || null,
      source_session_id: event.source_session_id || null, source_user_id: event.source_user_id || null,
      received_at, processed_at: nowIso(), status: "REJECTED_AUTH",
      idempotency_key: ik, payload_hash: event.payload_hash, decision: "REJECTED",
      decision_code: "MISSING_SOURCE_IDENTITY",
      decision_reason: `Missing: ${missingSource.join(", ")}`, raw_event_json: event,
    }).catch(() => null);
    const receipt = await base44.asServiceRole.entities.InventorySyncReceipt.create({
      receipt_id: makeId("rcpt"), event_id: event.event_id, ingestion_id,
      status: "REJECTED_AUTH", inventory_received_at: received_at, inventory_processed_at: nowIso(),
      decision_code: "MISSING_SOURCE_IDENTITY",
      decision_message: `Missing identity fields: ${missingSource.join(", ")}`,
      retry_allowed: false, created_at: nowIso(),
    });
    return { ok: false, ingestion_id, receipt, decision: { stage: "source_validation", status: "REJECTED_AUTH", decision_code: "MISSING_SOURCE_IDENTITY" } };
  }

  // ── Step 6: Business rules ──────────────────────────────────────────────────
  const conflict = evaluateConflicts(event);
  if (conflict) {
    const decisionLabel = conflict.receiptStatus === "HELD_FOR_REVIEW" ? "HELD" : "REJECTED";
    await base44.asServiceRole.entities.InventorySyncInboundEvent.create({
      ingestion_id, event_id: event.event_id, event_type: event.event_type,
      source_system: event.source_system, source_device_id: event.source_device_id,
      source_session_id: event.source_session_id, source_user_id: event.source_user_id,
      received_at, processed_at: nowIso(), status: conflict.ledgerStatus,
      idempotency_key: ik, payload_hash: event.payload_hash,
      decision: decisionLabel, decision_code: conflict.decision_code,
      decision_reason: conflict.decision_reason, raw_event_json: event,
    }).catch(() => null);
    const receipt = await base44.asServiceRole.entities.InventorySyncReceipt.create({
      receipt_id: makeId("rcpt"), event_id: event.event_id, ingestion_id,
      status: conflict.receiptStatus, inventory_received_at: received_at, inventory_processed_at: nowIso(),
      decision_code: conflict.decision_code, decision_message: conflict.decision_reason,
      retry_allowed: RETRY_ALLOWED.has(conflict.receiptStatus), created_at: nowIso(),
    });
    return { ok: false, ingestion_id, receipt, decision: { stage: "business_rules", status: conflict.ledgerStatus, decision_code: conflict.decision_code } };
  }

  // ── Step 7: Persist InventorySyncInboundEvent ledger ───────────────────────
  const processed_at = nowIso();
  await base44.asServiceRole.entities.InventorySyncInboundEvent.create({
    ingestion_id, event_id: event.event_id, event_type: event.event_type,
    event_version: event.event_version || null,
    source_system: event.source_system, source_device_id: event.source_device_id,
    source_session_id: event.source_session_id, source_user_id: event.source_user_id,
    source_user_role: event.source_user_role || null,
    received_at, processed_at, status: "PROCESSED", idempotency_key: ik,
    inventory_snapshot_ref: event.inventory_snapshot_ref || null,
    inventory_snapshot_hash: event.inventory_snapshot_hash || null,
    inventory_record_version: event.inventory_record_version || null,
    last_inventory_sync_at: event.last_inventory_sync_at || null,
    payload_hash: event.payload_hash,
    decision: "ACK_RECEIVED", decision_code: "INGESTED_LEDGER_ONLY",
    decision_reason: "Event accepted. Routed to MarkdownSyncReviewQueue.",
    linked_inventory_workflow_ref: null, raw_event_json: event,
  });

  // ── Step 8: Persist InventorySyncReceipt ───────────────────────────────────
  const receipt = await base44.asServiceRole.entities.InventorySyncReceipt.create({
    receipt_id: makeId("rcpt"), event_id: event.event_id, ingestion_id,
    status: "ACK_RECEIVED", inventory_received_at: processed_at, inventory_processed_at: nowIso(),
    decision_code: "INGESTED_LEDGER_ONLY",
    decision_message: "Ledger written. Routed to review queue.",
    retry_allowed: false, created_at: nowIso(),
  });

  // ── Step 9: Route to MarkdownSyncReviewQueue ───────────────────────────────
  const routing = await routeToReviewQueue(
    base44, event, ingestion_id,
    "ACK_RECEIVED", "INGESTED_LEDGER_ONLY",
    "Routed to MarkdownSyncReviewQueue."
  );

  return {
    ok: true, ingestion_id, receipt,
    decision: {
      stage: "ledger_and_review_routed", status: "PROCESSED",
      decision_code: "INGESTED_LEDGER_ONLY", routing,
      linked_workflow_ref: routing?.linked_workflow_ref || null,
      mutation_performed: false,
    },
  };
}

// ── Main relay handler ────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const processed_at = nowIso();

  try {
    const base44 = createClientFromRequest(req);
    const user   = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Parse request body ──────────────────────────────────────────────────
    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({
        error: "INVALID_REQUEST_BODY",
        message: "Request body must be valid JSON.",
        prototype_transport: true,
        transport_note: TRANSPORT_NOTE,
      }, { status: 400 });
    }

    // ── Protocol version validation ─────────────────────────────────────────
    if (body.bridge_protocol_version !== BRIDGE_PROTOCOL_VERSION) {
      return Response.json({
        error:    "PROTOCOL_VERSION_MISMATCH",
        expected: BRIDGE_PROTOCOL_VERSION,
        received: body.bridge_protocol_version || null,
        message:  `ScanOps client must use bridge protocol ${BRIDGE_PROTOCOL_VERSION}.`,
        prototype_transport: true,
        transport_note: TRANSPORT_NOTE,
      }, { status: 400 });
    }

    // ── Events presence check ───────────────────────────────────────────────
    const events = body.events;
    if (!Array.isArray(events) || events.length === 0) {
      return Response.json({
        error:   "EMPTY_EVENT_BATCH",
        message: "events array is required and must be non-empty.",
        prototype_transport: true,
        transport_note: TRANSPORT_NOTE,
      }, { status: 400 });
    }

    // ── Batch size enforcement — reject entire oversized batch before processing ─
    if (events.length > MAX_BRIDGE_BATCH_SIZE) {
      return Response.json({
        error:          "BATCH_SIZE_EXCEEDED",
        max_allowed:    MAX_BRIDGE_BATCH_SIZE,
        received_count: events.length,
        message:        `Batch exceeds maximum size of ${MAX_BRIDGE_BATCH_SIZE} events. No events processed. Split into smaller batches.`,
        prototype_transport: true,
        transport_note: TRANSPORT_NOTE,
      }, { status: 400 });
    }

    // ── Per-event processing ────────────────────────────────────────────────
    // Each event is processed independently through the ingestion engine.
    // One event failure does not affect other events in the batch.
    // Transport never batch-accepts or batch-rejects individual events.

    const receipts = [];
    let accepted_count  = 0;
    let rejected_count  = 0;
    let held_count      = 0;
    let duplicate_count = 0;

    for (const event of events) {
      let result;
      try {
        result = await processInboundScanOpsEvent(base44, event);
      } catch (eventError) {
        // Unexpected engine error for this event — issue a FAILED_RETRYABLE receipt
        // and continue processing remaining events.
        const fallbackReceipt = {
          receipt_id:             makeId("rcpt"),
          event_id:               event?.event_id || null,
          ingestion_id:           makeId("ing_err"),
          status:                 "FAILED_RETRYABLE",
          inventory_received_at:  processed_at,
          inventory_processed_at: nowIso(),
          decision_code:          "ENGINE_UNEXPECTED_ERROR",
          decision_message:       `Unexpected ingestion error: ${eventError.message}`,
          linked_workflow_ref:    null,
          retry_allowed:          true,
          created_at:             nowIso(),
        };
        receipts.push(fallbackReceipt);
        rejected_count++;
        continue;
      }

      // Extract the persisted or in-memory receipt from the engine result
      const receipt = result.receipt || {};
      receipts.push(receipt);

      // Count by receipt status
      const category = classifyReceiptStatus(receipt.status);
      if (category === "accepted")  accepted_count++;
      else if (category === "duplicate") duplicate_count++;
      else if (category === "held")  held_count++;
      else rejected_count++;
    }

    // ── Return response ─────────────────────────────────────────────────────
    return Response.json({
      bridge_protocol_version: BRIDGE_PROTOCOL_VERSION,
      processed_at,
      accepted_count,
      rejected_count,
      held_count,
      duplicate_count,
      receipts,
      prototype_transport: true,
      transport_note: TRANSPORT_NOTE,
      _prototype_disclosure: [
        "This relay runs on Base44 cloud infrastructure, not on a local LAN bridge.",
        "Production LAN bridge requires a desktop companion service (Phase 1D-F).",
        "Each event was processed by processInboundScanOpsEvent() independently.",
        "A 200 response does not mean all events were accepted — check each receipt.status.",
        "No stock, price, POS, order, or forecast mutation was performed.",
      ],
    }, { status: 200 });

  } catch (error) {
    return Response.json({
      error:           "RELAY_INTERNAL_ERROR",
      message:         error.message,
      prototype_transport: true,
      transport_note:  TRANSPORT_NOTE,
    }, { status: 500 });
  }
});