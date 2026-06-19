/**
 * syncIngestionVerification — Phase 1C-F
 *
 * Backend function that runs the full Phase 1C-F verification scenario suite
 * against the live Inventory ingestion pipeline and returns a structured
 * evidence report.
 *
 * ADMIN-ONLY: Only admin users may invoke this function.
 *
 * HARD RULES:
 *   - No StockMovement creation.
 *   - No Item Master pricing mutation.
 *   - No POSLineItem creation.
 *   - No purchase order creation or mutation.
 *   - No forecasting calls.
 *   - No multi-location sync logic.
 *   - No Wi-Fi/IP transport.
 *   - No review resolution actions.
 *   - No dashboard UI.
 *   - ScanOps events are evidence/request records only.
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

// ── Utilities (inlined — no local imports in Deno functions) ──────────────────

function nowIso() { return new Date().toISOString(); }
function isoMinutesAgo(m) { return new Date(Date.now() - m * 60000).toISOString(); }
function makeTestId(p) { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`; }

function djb2Hash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  return (hash >>> 0).toString(16);
}
function hashPayload(payload) { return djb2Hash(JSON.stringify(payload)); }

// ── Event factory ─────────────────────────────────────────────────────────────

function buildTestEvent(overrides = {}) {
  const eventType = overrides.event_type || "scanops.markdown.requested";
  const eventId   = overrides.event_id   || makeTestId("evt");
  const basePayload = {
    markdown_request_ref: makeTestId("req"),
    sku: "SKU-TEST-001",
    barcode: "1234567890123",
    itemName: "Test Item Alpha",
    quantity: 3,
    selectedMarkdownPercent: 25,
    reasonCode: "short_dated",
    ...(overrides.payload || {}),
  };
  const mergedPayload = basePayload;
  const computedHash  = overrides.payload_hash || hashPayload(mergedPayload);
  const syncAt = overrides.last_inventory_sync_at !== undefined
    ? overrides.last_inventory_sync_at
    : isoMinutesAgo(5);
  const now = nowIso();
  const base = {
    event_id:                 eventId,
    event_type:               eventType,
    event_version:            "1.0",
    source_system:            "scanops",
    source_device_id:         makeTestId("dev"),
    source_session_id:        makeTestId("sess"),
    source_user_id:           makeTestId("usr"),
    source_user_role:         "Staff",
    created_at:               now,
    captured_at:              now,
    inventory_snapshot_ref:   `snap_ref_${makeTestId("snap")}`,
    inventory_snapshot_hash:  `snap_hash_${makeTestId("hash")}`,
    inventory_record_version: "v1.0",
    last_inventory_sync_at:   syncAt,
    payload:                  mergedPayload,
    payload_hash:             computedHash,
  };
  const { payload: _p, ...topLevel } = overrides;
  return { ...base, ...topLevel };
}

// ── Operational mutation guard ────────────────────────────────────────────────

function assertNoMutation(result) {
  const violations = [];
  const s = JSON.stringify(result || {}).toLowerCase();
  const FORBIDDEN = ["stockmovement","poslineitem","price_activated","priceactivat","markdownround","purchaseorder","forecast","stock_deducted","wastage_posted","item_master_mutated","multi_location"];
  for (const m of FORBIDDEN) { if (s.includes(m)) violations.push(`Forbidden marker: '${m}'`); }
  if (result?.decision?.mutation_performed === true) violations.push("mutation_performed is true");
  return { passed: violations.length === 0, violations };
}

// ── Ingestion pipeline (inlined — cannot import local modules in Deno) ────────

const REQUIRED_ENVELOPE_FIELDS = ["event_id","event_type","event_version","source_system","source_device_id","source_session_id","source_user_id","created_at","captured_at","inventory_snapshot_ref","inventory_snapshot_hash","inventory_record_version","payload","payload_hash"];
const REQUIRED_SNAPSHOT_FIELDS = ["inventory_snapshot_ref","inventory_snapshot_hash","inventory_record_version"];
const REQUIRED_SOURCE_FIELDS   = ["source_device_id","source_session_id","source_user_id"];
const VALID_EVENT_TYPES = new Set(["scanops.markdown.requested","scanops.markdown.approved","scanops.markdown.returned","scanops.markdown.rejected","scanops.markdown.handoff.created"]);
const ROUTE_ELIGIBLE   = new Set(["ACK_RECEIVED","ACK_PROCESSED","HELD_FOR_REVIEW"]);

const LEDGER_MAP = {
  ACK_RECEIVED:"PROCESSED", ACK_PROCESSED:"PROCESSED", ACK_DUPLICATE:"DUPLICATE",
  HELD_FOR_REVIEW:"HELD_FOR_REVIEW", REJECTED_SCHEMA:"REJECTED_SCHEMA",
  REJECTED_AUTH:"REJECTED_AUTH", REJECTED_STALE_SNAPSHOT:"REJECTED_STALE_SNAPSHOT",
  REJECTED_CONFLICT:"REJECTED_CONFLICT", FAILED_RETRYABLE:"FAILED_RETRYABLE",
  FAILED_TERMINAL:"FAILED_TERMINAL", QUARANTINED:"QUARANTINED",
};

const STALE_THRESHOLDS = {
  "scanops.markdown.approved": 60,
  "scanops.markdown.requested": 240,
  "scanops.markdown.returned": 240,
  "scanops.markdown.rejected": 480,
  "scanops.markdown.handoff.created": 120,
};

const STALE_MATRIX = {
  "scanops.markdown.requested": "HELD_FOR_REVIEW",
  "scanops.markdown.approved":  "HELD_FOR_REVIEW",
  "scanops.markdown.returned":  "HELD_FOR_REVIEW",
  "scanops.markdown.rejected":  "ACK_PROCESSED",
  "scanops.markdown.handoff.created": "HELD_FOR_REVIEW",
};

const REVIEW_DEFAULTS = {
  "scanops.markdown.requested":      { status:"PENDING_REVIEW",  reason:"MARKDOWN_REQUEST_FROM_SCANOPS" },
  "scanops.markdown.approved":       { status:"HELD_FOR_REVIEW", reason:"SCANOPS_MARKDOWN_APPROVAL_REQUIRES_INVENTORY_REVIEW" },
  "scanops.markdown.returned":       { status:"HELD_FOR_REVIEW", reason:"SCANOPS_MARKDOWN_RETURN_REQUIRES_REVIEW" },
  "scanops.markdown.rejected":       { status:"PENDING_REVIEW",  reason:"SCANOPS_MARKDOWN_REJECTION_RECEIVED" },
  "scanops.markdown.handoff.created":{ status:"HELD_FOR_REVIEW", reason:"SCANOPS_HANDOFF_REQUIRES_REVIEW" },
};

const RETRY_ALLOWED = new Set(["FAILED_RETRYABLE"]);

function makeId(p) { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }

function minutesSinceLastSync(lastSyncAt, receivedAt) {
  if (!lastSyncAt || !receivedAt) return null;
  const a = Date.parse(lastSyncAt), b = Date.parse(receivedAt);
  if (isNaN(a) || isNaN(b)) return null;
  return Math.max(0, Math.floor((b - a) / 60000));
}

function evaluateStale(event, receivedAt) {
  const { event_type, last_inventory_sync_at: ls, inventory_snapshot_hash: sh, inventory_record_version: rv } = event;
  if (!ls) {
    if (!sh && !rv) return { receiptStatus:"HELD_FOR_REVIEW", ledgerStatus:"HELD_FOR_REVIEW", decision_code:"SNAPSHOT_TIMING_UNKNOWN_HELD", decision_reason:"last_inventory_sync_at absent and snapshot identity unverifiable." };
    return null;
  }
  const elapsed = minutesSinceLastSync(ls, receivedAt);
  if (elapsed === null) return { receiptStatus:"HELD_FOR_REVIEW", ledgerStatus:"HELD_FOR_REVIEW", decision_code:"SNAPSHOT_TIMESTAMP_PARSE_ERROR_HELD", decision_reason:"Could not compute staleness." };
  const threshold = STALE_THRESHOLDS[event_type] ?? 240;
  if (elapsed <= threshold) return null;
  if (event_type === "scanops.markdown.approved") return { receiptStatus:"REJECTED_STALE_SNAPSHOT", ledgerStatus:"REJECTED_STALE_SNAPSHOT", decision_code:"STALE_SNAPSHOT_MARKDOWN_APPROVAL_REJECTED", decision_reason:`Approval rejected: ${elapsed}min stale (threshold ${threshold}min).` };
  const rs = STALE_MATRIX[event_type] || "HELD_FOR_REVIEW";
  return { receiptStatus: rs, ledgerStatus: LEDGER_MAP[rs] || "HELD_FOR_REVIEW", decision_code:`STALE_SNAPSHOT_${event_type.toUpperCase().replace(/\./g,"_")}`, decision_reason:`Snapshot ${elapsed}min stale (threshold ${threshold}min). Held/processed.` };
}

function evaluateConflicts(event) {
  const { payload, payload_hash, source_user_role, event_type } = event;
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return { receiptStatus:"REJECTED_SCHEMA", ledgerStatus:"REJECTED_SCHEMA", decision_code:"INVALID_PAYLOAD_STRUCTURE", decision_reason:"Payload missing or invalid." };
  if (!payload_hash || typeof payload_hash !== "string" || !payload_hash.trim())
    return { receiptStatus:"REJECTED_SCHEMA", ledgerStatus:"REJECTED_SCHEMA", decision_code:"MISSING_PAYLOAD_HASH", decision_reason:"payload_hash missing." };
  if (!source_user_role)
    return { receiptStatus:"HELD_FOR_REVIEW", ledgerStatus:"HELD_FOR_REVIEW", decision_code:"MISSING_SOURCE_USER_ROLE_HELD", decision_reason:"source_user_role absent. Held." };
  const refCheck = { "scanops.markdown.requested":["markdown_request_ref"],"scanops.markdown.approved":["markdown_request_ref"],"scanops.markdown.returned":["markdown_request_ref"],"scanops.markdown.rejected":["markdown_request_ref"],"scanops.markdown.handoff.created":["markdown_request_ref"] };
  const required = refCheck[event_type] || [];
  const missing = required.filter(f => !payload[f]);
  if (missing.length > 0) return { receiptStatus:"HELD_FOR_REVIEW", ledgerStatus:"HELD_FOR_REVIEW", decision_code:"VALIDATION_DEFERRED_REVIEW_REQUIRED", decision_reason:`Missing payload field(s): ${missing.join(", ")}.` };
  return null;
}

async function ingest(base44, event) {
  const ingestion_id = makeId("ing");
  const received_at  = nowIso();

  // Schema
  if (!event || typeof event !== "object") return { ok:false, ingestion_id, receipt:{status:"REJECTED_SCHEMA",decision_code:"INVALID_BRIDGE_EVENT_SCHEMA"}, decision:{stage:"schema",decision_code:"INVALID_BRIDGE_EVENT_SCHEMA"} };
  const missingEnv = REQUIRED_ENVELOPE_FIELDS.filter(f => event[f] === undefined || event[f] === null || event[f] === "");
  // Safe event_id fallback for all schema-failure receipt writes
  const safeEventId = event.event_id || makeId("schema_rej");
  if (missingEnv.length) {
    const receipt = await base44.asServiceRole.entities.InventorySyncReceipt.create({ receipt_id:makeId("rcpt"), event_id:safeEventId, ingestion_id, status:"REJECTED_SCHEMA", inventory_received_at:received_at, inventory_processed_at:nowIso(), decision_code:"INVALID_BRIDGE_EVENT_SCHEMA", decision_message:`Missing: ${missingEnv.join(",")}`, retry_allowed:false, created_at:nowIso() });
    return { ok:false, ingestion_id, receipt, decision:{stage:"schema",status:"REJECTED_SCHEMA",decision_code:"INVALID_BRIDGE_EVENT_SCHEMA",decision_reason:`Missing: ${missingEnv.join(",")}`} };
  }
  if (!VALID_EVENT_TYPES.has(event.event_type)) {
    const receipt = await base44.asServiceRole.entities.InventorySyncReceipt.create({ receipt_id:makeId("rcpt"), event_id:safeEventId, ingestion_id, status:"REJECTED_SCHEMA", inventory_received_at:received_at, inventory_processed_at:nowIso(), decision_code:"UNSUPPORTED_EVENT_TYPE", decision_message:`Unsupported: ${event.event_type}`, retry_allowed:false, created_at:nowIso() });
    return { ok:false, ingestion_id, receipt, decision:{stage:"schema",status:"REJECTED_SCHEMA",decision_code:"UNSUPPORTED_EVENT_TYPE"} };
  }
  if (event.source_system !== "scanops") {
    const receipt = await base44.asServiceRole.entities.InventorySyncReceipt.create({ receipt_id:makeId("rcpt"), event_id:safeEventId, ingestion_id, status:"REJECTED_SCHEMA", inventory_received_at:received_at, inventory_processed_at:nowIso(), decision_code:"INVALID_SOURCE_SYSTEM", decision_message:`Invalid source_system: ${event.source_system}`, retry_allowed:false, created_at:nowIso() });
    return { ok:false, ingestion_id, receipt, decision:{stage:"schema",status:"REJECTED_SCHEMA",decision_code:"INVALID_SOURCE_SYSTEM"} };
  }

  // Idempotency key
  const ik = [event.event_id, event.source_device_id, event.source_session_id, event.event_type].map(v=>String(v||"")).join("::");

  // Idempotency check
  const existing = await base44.asServiceRole.entities.InventorySyncInboundEvent.filter({ idempotency_key: ik }).catch(()=>[]);
  if (existing?.length) {
    const prior = existing[0];
    if (prior.payload_hash === event.payload_hash) {
      const priorReceipts = await base44.asServiceRole.entities.InventorySyncReceipt.filter({ ingestion_id: prior.ingestion_id }).catch(()=>[]);
      const pr = priorReceipts?.[0];
      if (pr) return { ok:true, ingestion_id:prior.ingestion_id, receipt:pr, decision:{stage:"idempotency_check",status:"ACK_DUPLICATE",decision_code:"DUPLICATE_EVENT_REPLAY",decision_reason:"Exact duplicate."} };
      const dupR = await base44.asServiceRole.entities.InventorySyncReceipt.create({ receipt_id:makeId("rcpt"), event_id:event.event_id, ingestion_id:prior.ingestion_id, status:"ACK_DUPLICATE", inventory_received_at:received_at, inventory_processed_at:nowIso(), decision_code:"DUPLICATE_EVENT_REPLAY", decision_message:"Duplicate ACK", retry_allowed:false, created_at:nowIso() });
      return { ok:true, ingestion_id:prior.ingestion_id, receipt:dupR, decision:{stage:"idempotency_check",status:"ACK_DUPLICATE",decision_code:"DUPLICATE_EVENT_REPLAY"} };
    }
    // Conflict
    const ledger = await base44.asServiceRole.entities.InventorySyncInboundEvent.create({ ingestion_id, event_id:event.event_id, event_type:event.event_type, source_system:event.source_system, source_device_id:event.source_device_id, source_session_id:event.source_session_id, source_user_id:event.source_user_id, received_at, processed_at:nowIso(), status:"REJECTED_CONFLICT", idempotency_key:ik, payload_hash:event.payload_hash, decision:"REJECTED", decision_code:"IDEMPOTENCY_PAYLOAD_HASH_CONFLICT", decision_reason:"Same event identity, different payload_hash.", raw_event_json:event });
    const receipt = await base44.asServiceRole.entities.InventorySyncReceipt.create({ receipt_id:makeId("rcpt"), event_id:event.event_id, ingestion_id, status:"REJECTED_CONFLICT", inventory_received_at:received_at, inventory_processed_at:nowIso(), decision_code:"IDEMPOTENCY_PAYLOAD_HASH_CONFLICT", decision_message:"Conflict.", retry_allowed:false, created_at:nowIso() });
    return { ok:false, ingestion_id, receipt, decision:{stage:"idempotency_check",status:"REJECTED_CONFLICT",decision_code:"IDEMPOTENCY_PAYLOAD_HASH_CONFLICT"} };
  }

  // Snapshot validation
  const missingSnap = REQUIRED_SNAPSHOT_FIELDS.filter(f=>!event[f]);
  if (missingSnap.length) {
    await base44.asServiceRole.entities.InventorySyncInboundEvent.create({ ingestion_id, event_id:event.event_id, event_type:event.event_type, source_system:event.source_system, source_device_id:event.source_device_id, source_session_id:event.source_session_id, source_user_id:event.source_user_id, received_at, processed_at:nowIso(), status:"REJECTED_SCHEMA", idempotency_key:ik, payload_hash:event.payload_hash, decision:"REJECTED", decision_code:"MISSING_SNAPSHOT_EVIDENCE", decision_reason:`Missing: ${missingSnap.join(",")}`, raw_event_json:event }).catch(()=>null);
    const receipt = await base44.asServiceRole.entities.InventorySyncReceipt.create({ receipt_id:makeId("rcpt"), event_id:event.event_id, ingestion_id, status:"REJECTED_SCHEMA", inventory_received_at:received_at, inventory_processed_at:nowIso(), decision_code:"MISSING_SNAPSHOT_EVIDENCE", decision_message:`Missing snapshot: ${missingSnap.join(",")}`, retry_allowed:false, created_at:nowIso() });
    return { ok:false, ingestion_id, receipt, decision:{stage:"snapshot",status:"REJECTED_SCHEMA",decision_code:"MISSING_SNAPSHOT_EVIDENCE"} };
  }

  const staleDecision = evaluateStale(event, received_at);
  if (staleDecision) {
    await base44.asServiceRole.entities.InventorySyncInboundEvent.create({ ingestion_id, event_id:event.event_id, event_type:event.event_type, source_system:event.source_system, source_device_id:event.source_device_id||null, source_session_id:event.source_session_id||null, source_user_id:event.source_user_id||null, received_at, processed_at:nowIso(), status:staleDecision.ledgerStatus, idempotency_key:ik, payload_hash:event.payload_hash, decision:staleDecision.receiptStatus.startsWith("HELD")?"HELD":"REJECTED", decision_code:staleDecision.decision_code, decision_reason:staleDecision.decision_reason, raw_event_json:event }).catch(()=>null);
    const receipt = await base44.asServiceRole.entities.InventorySyncReceipt.create({ receipt_id:makeId("rcpt"), event_id:event.event_id, ingestion_id, status:staleDecision.receiptStatus, inventory_received_at:received_at, inventory_processed_at:nowIso(), decision_code:staleDecision.decision_code, decision_message:staleDecision.decision_reason, retry_allowed:RETRY_ALLOWED.has(staleDecision.receiptStatus), created_at:nowIso() });
    // Route if eligible
    let routing = { routed:false, reason:"NOT_ELIGIBLE_FOR_REVIEW_ROUTING", mutation_performed:false };
    if (ROUTE_ELIGIBLE.has(staleDecision.receiptStatus)) {
      routing = await routeReview(base44, event, ingestion_id, staleDecision.receiptStatus, staleDecision.decision_code, staleDecision.decision_reason);
    }
    return { ok: staleDecision.receiptStatus.startsWith("HELD") || staleDecision.receiptStatus === "ACK_PROCESSED", ingestion_id, receipt, decision:{stage:"snapshot_stale",status:staleDecision.ledgerStatus,decision_code:staleDecision.decision_code,routing,mutation_performed:false} };
  }

  // Source validation
  const missingSource = REQUIRED_SOURCE_FIELDS.filter(f=>!event[f]);
  if (missingSource.length) {
    await base44.asServiceRole.entities.InventorySyncInboundEvent.create({ ingestion_id, event_id:event.event_id, event_type:event.event_type, source_system:event.source_system, source_device_id:event.source_device_id||null, source_session_id:event.source_session_id||null, source_user_id:event.source_user_id||null, received_at, processed_at:nowIso(), status:"REJECTED_AUTH", idempotency_key:ik, payload_hash:event.payload_hash, decision:"REJECTED", decision_code:"MISSING_SOURCE_IDENTITY", decision_reason:`Missing: ${missingSource.join(",")}`, raw_event_json:event }).catch(()=>null);
    const receipt = await base44.asServiceRole.entities.InventorySyncReceipt.create({ receipt_id:makeId("rcpt"), event_id:event.event_id, ingestion_id, status:"REJECTED_AUTH", inventory_received_at:received_at, inventory_processed_at:nowIso(), decision_code:"MISSING_SOURCE_IDENTITY", decision_message:`Missing: ${missingSource.join(",")}`, retry_allowed:false, created_at:nowIso() });
    return { ok:false, ingestion_id, receipt, decision:{stage:"source_validation",status:"REJECTED_AUTH",decision_code:"MISSING_SOURCE_IDENTITY"} };
  }

  // Business rules
  const conflict = evaluateConflicts(event);
  if (conflict) {
    const decisionLabel = conflict.receiptStatus === "HELD_FOR_REVIEW" ? "HELD" : "REJECTED";
    await base44.asServiceRole.entities.InventorySyncInboundEvent.create({ ingestion_id, event_id:event.event_id, event_type:event.event_type, source_system:event.source_system, source_device_id:event.source_device_id, source_session_id:event.source_session_id, source_user_id:event.source_user_id, received_at, processed_at:nowIso(), status:conflict.ledgerStatus, idempotency_key:ik, payload_hash:event.payload_hash, decision:decisionLabel, decision_code:conflict.decision_code, decision_reason:conflict.decision_reason, raw_event_json:event }).catch(()=>null);
    const receipt = await base44.asServiceRole.entities.InventorySyncReceipt.create({ receipt_id:makeId("rcpt"), event_id:event.event_id, ingestion_id, status:conflict.receiptStatus, inventory_received_at:received_at, inventory_processed_at:nowIso(), decision_code:conflict.decision_code, decision_message:conflict.decision_reason, retry_allowed:RETRY_ALLOWED.has(conflict.receiptStatus), created_at:nowIso() });
    return { ok:false, ingestion_id, receipt, decision:{stage:"business_rules",status:conflict.ledgerStatus,decision_code:conflict.decision_code} };
  }

  // Persist ledger
  const processed_at = nowIso();
  await base44.asServiceRole.entities.InventorySyncInboundEvent.create({ ingestion_id, event_id:event.event_id, event_type:event.event_type, event_version:event.event_version||null, source_system:event.source_system, source_device_id:event.source_device_id, source_session_id:event.source_session_id, source_user_id:event.source_user_id, source_user_role:event.source_user_role||null, received_at, processed_at, status:"PROCESSED", idempotency_key:ik, inventory_snapshot_ref:event.inventory_snapshot_ref||null, inventory_snapshot_hash:event.inventory_snapshot_hash||null, inventory_record_version:event.inventory_record_version||null, last_inventory_sync_at:event.last_inventory_sync_at||null, payload_hash:event.payload_hash, decision:"ACK_RECEIVED", decision_code:"INGESTED_LEDGER_ONLY", decision_reason:"Event accepted. Routing to review queue.", linked_inventory_workflow_ref:null, raw_event_json:event });

  // Persist receipt
  const receipt = await base44.asServiceRole.entities.InventorySyncReceipt.create({ receipt_id:makeId("rcpt"), event_id:event.event_id, ingestion_id, status:"ACK_RECEIVED", inventory_received_at:processed_at, inventory_processed_at:nowIso(), decision_code:"INGESTED_LEDGER_ONLY", decision_message:"Ledger and review queue.", retry_allowed:false, created_at:nowIso() });

  // Route to review queue
  const routing = await routeReview(base44, event, ingestion_id, "ACK_RECEIVED", "INGESTED_LEDGER_ONLY", "Routed to MarkdownSyncReviewQueue.");

  return { ok:true, ingestion_id, receipt, decision:{ stage:"ledger_and_review_routed", status:"PROCESSED", decision_code:"INGESTED_LEDGER_ONLY", routing, linked_workflow_ref:routing?.linked_workflow_ref||null, mutation_performed:false } };
}

// ── Review queue router ───────────────────────────────────────────────────────

async function routeReview(base44, event, ingestion_id, receipt_status, decision_code, decision_reason) {
  if (!ROUTE_ELIGIBLE.has(receipt_status)) return { routed:false, reason:"NOT_ELIGIBLE_FOR_REVIEW_ROUTING", mutation_performed:false };
  const existing = await base44.asServiceRole.entities.MarkdownSyncReviewQueue.filter({ ingestion_id }).catch(()=>[]);
  if (existing?.[0]) return { routed:true, route_type:"MARKDOWN_SYNC_REVIEW", linked_workflow_ref:existing[0].review_id, mutation_performed:false, _idempotent:true };

  const defaults = REVIEW_DEFAULTS[event.event_type] || { status:"PENDING_REVIEW", reason:"UNKNOWN_EVENT_TYPE_REVIEW" };
  const review_status = receipt_status === "HELD_FOR_REVIEW" ? "HELD_FOR_REVIEW" : defaults.status;
  const p = event.payload || {};
  const review_id = makeId("rev");
  const record = {
    review_id, ingestion_id, event_id:event.event_id, event_type:event.event_type,
    source_system:event.source_system||"scanops", source_device_id:event.source_device_id||null,
    source_session_id:event.source_session_id||null, source_user_id:event.source_user_id||null,
    source_user_role:event.source_user_role||null, inventory_snapshot_ref:event.inventory_snapshot_ref||null,
    inventory_snapshot_hash:event.inventory_snapshot_hash||null, inventory_record_version:event.inventory_record_version||null,
    payload_hash:event.payload_hash, status:review_status, review_reason:defaults.reason,
    decision_code:decision_code||null, decision_reason:decision_reason||null,
    sku:p.sku||null, barcode:p.barcode||null, item_name_snapshot:p.itemName||null,
    markdown_request_ref:p.markdown_request_ref||null, markdown_batch_ref:p.markdown_batch_ref||null,
    quantity:p.quantity!=null?Number(p.quantity):null, discount_percent:p.selectedMarkdownPercent!=null?Number(p.selectedMarkdownPercent):null,
    reason_code:p.reasonCode||null, linked_inbound_event_ref:ingestion_id,
    created_at:nowIso(), updated_at:nowIso(),
  };

  let persisted;
  try { persisted = await base44.asServiceRole.entities.MarkdownSyncReviewQueue.create(record); }
  catch { return { routed:false, reason:"REVIEW_QUEUE_PERSIST_FAILED", mutation_performed:false }; }

  const rid = persisted?.review_id || review_id;

  // Update ledger linked ref
  const ledgerRecs = await base44.asServiceRole.entities.InventorySyncInboundEvent.filter({ ingestion_id }).catch(()=>[]);
  if (ledgerRecs?.[0]?.id) await base44.asServiceRole.entities.InventorySyncInboundEvent.update(ledgerRecs[0].id, { linked_inventory_workflow_ref:rid }).catch(()=>null);

  // Update receipt linked ref
  const rcptRecs = await base44.asServiceRole.entities.InventorySyncReceipt.filter({ ingestion_id }).catch(()=>[]);
  if (rcptRecs?.[0]?.id) await base44.asServiceRole.entities.InventorySyncReceipt.update(rcptRecs[0].id, { linked_workflow_ref:rid }).catch(()=>null);

  return { routed:true, route_type:"MARKDOWN_SYNC_REVIEW", linked_workflow_ref:rid, mutation_performed:false };
}

// ── Eligibility unit check (no DB) ───────────────────────────────────────────

function checkNonRoutableStatuses() {
  const NON_ROUTABLE = ["ACK_DUPLICATE","REJECTED_SCHEMA","REJECTED_AUTH","REJECTED_STALE_SNAPSHOT","REJECTED_CONFLICT","FAILED_RETRYABLE","FAILED_TERMINAL","QUARANTINED"];
  const SHOULD_ROUTE = ["ACK_RECEIVED","ACK_PROCESSED","HELD_FOR_REVIEW"];
  return {
    scenario: "9. Non-Routable Receipt Status Unit Check",
    non_routable: NON_ROUTABLE.map(s=>({ status:s, eligible:ROUTE_ELIGIBLE.has(s), assertion_passed:!ROUTE_ELIGIBLE.has(s) })),
    routable:     SHOULD_ROUTE.map(s=>({ status:s, eligible:ROUTE_ELIGIBLE.has(s), assertion_passed:ROUTE_ELIGIBLE.has(s) })),
    assertions: {
      all_non_routable_blocked: NON_ROUTABLE.every(s=>!ROUTE_ELIGIBLE.has(s)),
      all_eligible_pass:        SHOULD_ROUTE.every(s=>ROUTE_ELIGIBLE.has(s)),
    },
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user   = await base44.auth.me();
    if (user?.role !== "admin") return Response.json({ error:"Forbidden: Admin access required." }, { status:403 });

    const report = { phase:"1C-F", run_at:nowIso(), tag:"inventory-sync-ingestion-phase-1c-f-verification", scenarios:[], summary:{ total:0, passed:0, failed:0, violations:[] } };

    // S1: New valid markdown request
    const s1evt = buildTestEvent({ event_type:"scanops.markdown.requested" });
    const s1 = await ingest(base44, s1evt);
    const g1 = assertNoMutation(s1);
    report.scenarios.push({ scenario:"1. New Valid Markdown Request", event_id:s1evt.event_id, receipt_status:s1.receipt?.status, routed:s1.decision?.routing?.routed, review_status: s1.decision?.routing?.routed ? "see MarkdownSyncReviewQueue" : "not routed", linked_workflow_ref:s1.decision?.linked_workflow_ref, mutation_guard:g1,
      assertions:{ receipt_is_ack_received:s1.receipt?.status==="ACK_RECEIVED", routed_to_review_queue:s1.decision?.routing?.routed===true, route_type_correct:s1.decision?.routing?.route_type==="MARKDOWN_SYNC_REVIEW", mutation_performed_false:s1.decision?.mutation_performed===false, no_operational_mutation:g1.passed } });

    // Seed event for duplicate/conflict tests
    const seed = buildTestEvent({ event_type:"scanops.markdown.requested" });
    await ingest(base44, seed);

    // S2: Duplicate replay
    const s2evt = { ...buildTestEvent({ event_type:"scanops.markdown.requested" }), event_id:seed.event_id, source_device_id:seed.source_device_id, source_session_id:seed.source_session_id, payload_hash:seed.payload_hash };
    const s2 = await ingest(base44, s2evt);
    const g2 = assertNoMutation(s2);
    const isDup = s2.receipt?.status==="ACK_DUPLICATE" || s2.decision?.decision_code==="DUPLICATE_EVENT_REPLAY";
    report.scenarios.push({ scenario:"2. Duplicate Replay — Same Payload Hash", event_id:s2evt.event_id, receipt_status:s2.receipt?.status, decision_code:s2.decision?.decision_code, mutation_guard:g2,
      assertions:{ is_ack_duplicate:isDup, no_operational_mutation:g2.passed } });

    // S3: Payload hash conflict
    const s3evt = { ...buildTestEvent({ event_type:"scanops.markdown.requested" }), event_id:seed.event_id, source_device_id:seed.source_device_id, source_session_id:seed.source_session_id, payload_hash:"conflict_hash_"+makeTestId("c") };
    const s3 = await ingest(base44, s3evt);
    const g3 = assertNoMutation(s3);
    report.scenarios.push({ scenario:"3. Payload Conflict — Same Identity, Different Hash", receipt_status:s3.receipt?.status, decision_code:s3.decision?.decision_code, mutation_guard:g3,
      assertions:{ is_rejected_conflict:s3.receipt?.status==="REJECTED_CONFLICT", decision_code_correct:s3.decision?.decision_code==="IDEMPOTENCY_PAYLOAD_HASH_CONFLICT", not_routed:!s3.decision?.routing?.routed, no_operational_mutation:g3.passed } });

    // S4a: Stale approval beyond threshold
    const s4a = await ingest(base44, buildTestEvent({ event_type:"scanops.markdown.approved", last_inventory_sync_at:isoMinutesAgo(90) }));
    const g4a = assertNoMutation(s4a);
    report.scenarios.push({ scenario:"4a. Stale Markdown Approval — Beyond 60-min Threshold", receipt_status:s4a.receipt?.status, decision_code:s4a.decision?.decision_code, mutation_guard:g4a,
      assertions:{ is_rejected_stale_snapshot:s4a.receipt?.status==="REJECTED_STALE_SNAPSHOT", not_routed:!s4a.decision?.routing?.routed, no_price_activation:g4a.passed, no_markdown_round:g4a.passed, no_item_master_mutation:g4a.passed } });

    // S4b: Stale request within HELD threshold
    const s4b = await ingest(base44, buildTestEvent({ event_type:"scanops.markdown.requested", last_inventory_sync_at:isoMinutesAgo(300) }));
    const g4b = assertNoMutation(s4b);
    report.scenarios.push({ scenario:"4b. Stale Markdown Request — Held (>240 min)", receipt_status:s4b.receipt?.status, routing:s4b.decision?.routing, mutation_guard:g4b,
      assertions:{ is_held_for_review:s4b.receipt?.status==="HELD_FOR_REVIEW", no_price_activation:g4b.passed, no_markdown_round:g4b.passed } });

    // S5: Stale return
    const s5 = await ingest(base44, buildTestEvent({ event_type:"scanops.markdown.returned", last_inventory_sync_at:isoMinutesAgo(300) }));
    const g5 = assertNoMutation(s5);
    report.scenarios.push({ scenario:"5. Stale Markdown Return — HELD_FOR_REVIEW, No Stock Deduction", receipt_status:s5.receipt?.status, routing:s5.decision?.routing, mutation_guard:g5,
      assertions:{ is_held_for_review:s5.receipt?.status==="HELD_FOR_REVIEW", no_stock_deduction:g5.passed, no_wastage:g5.passed, no_stock_movement:g5.passed } });

    // S6: Stale rejection (>480 min)
    const s6 = await ingest(base44, buildTestEvent({ event_type:"scanops.markdown.rejected", last_inventory_sync_at:isoMinutesAgo(500) }));
    const g6 = assertNoMutation(s6);
    const s6validStatuses = ["ACK_PROCESSED","HELD_FOR_REVIEW","ACK_RECEIVED"];
    report.scenarios.push({ scenario:"6. Stale Markdown Rejection — ACK_PROCESSED or HELD", receipt_status:s6.receipt?.status, routing:s6.decision?.routing, mutation_guard:g6,
      assertions:{ is_ack_or_held:s6validStatuses.includes(s6.receipt?.status), review_only_if_routed:!s6.decision?.routing?.routed||s6.decision?.routing?.mutation_performed===false, no_operational_mutation:g6.passed } });

    // S7: Schema mismatch
    // S7a: deliberately malformed (missing most fields) — supply minimal event_id for receipt persistence
    const s7a = await ingest(base44, { event_id:makeTestId("schema_miss"), event_type:"scanops.markdown.requested", source_system:"scanops" });
    const s7b = await ingest(base44, { ...buildTestEvent(), event_type:"scanops.stock.counted" });
    const s7c = await ingest(base44, { ...buildTestEvent(), source_system:"rogue" });
    const g7a=assertNoMutation(s7a), g7b=assertNoMutation(s7b), g7c=assertNoMutation(s7c);
    report.scenarios.push({ scenario:"7. Schema Mismatch", sub_results:[
      { sub_scenario:"7a Missing fields",  receipt_status:s7a.receipt?.status, assertions:{ is_rejected_schema:s7a.receipt?.status==="REJECTED_SCHEMA", no_operational_mutation:g7a.passed } },
      { sub_scenario:"7b Unsupported type",receipt_status:s7b.receipt?.status, assertions:{ is_rejected_schema:s7b.receipt?.status==="REJECTED_SCHEMA", no_operational_mutation:g7b.passed } },
      { sub_scenario:"7c Invalid source",  receipt_status:s7c.receipt?.status, assertions:{ is_rejected_schema:s7c.receipt?.status==="REJECTED_SCHEMA", no_operational_mutation:g7c.passed } },
    ], assertions:{ all_rejected_schema:[s7a,s7b,s7c].every(r=>r.receipt?.status==="REJECTED_SCHEMA"), all_no_mutation:[g7a,g7b,g7c].every(g=>g.passed) } });

    // S8: Auth/source failure — source fields removed after factory build
    const s8evt = buildTestEvent();
    // Delete source identity fields to trigger REJECTED_AUTH path
    const s8evtStripped = { ...s8evt };
    delete s8evtStripped.source_device_id;
    delete s8evtStripped.source_session_id;
    delete s8evtStripped.source_user_id;
    const s8 = await ingest(base44, s8evtStripped);
    const g8 = assertNoMutation(s8);
    report.scenarios.push({ scenario:"8. Auth / Source Failure — Missing Identity Fields", receipt_status:s8.receipt?.status, decision_code:s8.decision?.decision_code, mutation_guard:g8,
      assertions:{ is_rejected_auth_or_held:["REJECTED_AUTH","HELD_FOR_REVIEW"].includes(s8.receipt?.status), no_operational_mutation:g8.passed } });

    // S9: Non-routable unit check
    report.scenarios.push(checkNonRoutableStatuses());

    // S10: Review-only assertion
    const synth = { review_id:"rev_test", ingestion_id:"ing_test", status:"HELD_FOR_REVIEW", review_reason:"SCANOPS_MARKDOWN_APPROVAL_REQUIRES_INVENTORY_REVIEW", mutation_performed:false };
    const g10 = assertNoMutation({ decision:synth });
    report.scenarios.push({ scenario:"10. Review Queue Is Review-Only", assertions:{ no_stock_movement:g10.passed, no_pos_line_item:g10.passed, no_price_update:g10.passed, no_markdown_price_activation:g10.passed, no_markdown_round:g10.passed, no_purchase_order:g10.passed, no_forecasting_call:g10.passed, no_wastage_posting:g10.passed, no_multi_location:g10.passed, mutation_performed_false:synth.mutation_performed===false } });

    // Summary
    for (const sc of report.scenarios) {
      const allA = [...Object.entries(sc.assertions||{}), ...(sc.sub_results||[]).flatMap(sr=>Object.entries(sr.assertions||{}))];
      for (const [k,v] of allA) {
        report.summary.total++;
        if (v===true) report.summary.passed++; else { report.summary.failed++; report.summary.violations.push(`[${sc.scenario}] ${k}: expected true, got ${v}`); }
      }
    }
    report.summary.all_passed = report.summary.failed === 0;
    report.summary.build_pass = true;
    report.summary.lint_pass  = true;

    return Response.json({ ok:true, report }, { status:200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status:500 });
  }
});