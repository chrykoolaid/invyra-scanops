/**
 * scanopsBridgeEventContract.js — Phase 1A
 *
 * Defines the formal ScanOps ↔ Inventory Bridge v1 event envelope and
 * validation helpers for outbound markdown events.
 *
 * HARD RULES:
 *   - This module is read-only / contract-definition only.
 *   - No stock mutation. No price mutation. No StockMovement. No POSLineItem.
 *   - ScanOps events are evidence/request records only.
 *   - Inventory decides what they mean.
 */

export const BRIDGE_EVENT_VERSION = "1.0.0";
export const BRIDGE_SOURCE_SYSTEM = "scanops";

// ── v1 Event Types (markdown-only) ──────────────────────────────────────────
export const BRIDGE_EVENT_TYPES = {
  MARKDOWN_REQUESTED:      "scanops.markdown.requested",
  MARKDOWN_APPROVED:       "scanops.markdown.approved",
  MARKDOWN_RETURNED:       "scanops.markdown.returned",
  MARKDOWN_REJECTED:       "scanops.markdown.rejected",
  MARKDOWN_HANDOFF_CREATED: "scanops.markdown.handoff.created",
};

// Internal ScanOps event type → Bridge event type mapping
export const INTERNAL_TO_BRIDGE_EVENT_TYPE = {
  MARKDOWN_REQUEST_CREATED:       BRIDGE_EVENT_TYPES.MARKDOWN_REQUESTED,
  MARKDOWN_APPROVAL_SUBMITTED:    BRIDGE_EVENT_TYPES.MARKDOWN_REQUESTED,
  MARKDOWN_APPROVED:              BRIDGE_EVENT_TYPES.MARKDOWN_APPROVED,
  MARKDOWN_RETURNED:              BRIDGE_EVENT_TYPES.MARKDOWN_RETURNED,
  MARKDOWN_REJECTED:              BRIDGE_EVENT_TYPES.MARKDOWN_REJECTED,
  MARKDOWN_LABEL_HANDOFF_CREATED: BRIDGE_EVENT_TYPES.MARKDOWN_HANDOFF_CREATED,
  MARKDOWN_PRINTER_HANDOFF_CREATED: BRIDGE_EVENT_TYPES.MARKDOWN_HANDOFF_CREATED,
};

// ── Required fields for a valid bridge event ─────────────────────────────────
const REQUIRED_ENVELOPE_FIELDS = [
  "event_id",
  "event_type",
  "event_version",
  "source_system",
  "created_at",
  "captured_at",
  "payload",
];

const REQUIRED_SNAPSHOT_FIELDS = [
  "inventory_snapshot_id",
  "inventory_snapshot_ref",
  "inventory_snapshot_hash",
];

/**
 * djb2-style deterministic hash of a payload for integrity verification.
 * Not cryptographic — lightweight traceability key only.
 */
function buildPayloadHash(payload) {
  let text;
  try {
    // Stable sort keys so hash is deterministic regardless of insertion order
    text = JSON.stringify(payload, Object.keys(payload || {}).sort());
  } catch {
    text = String(payload ?? "");
  }
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h) ^ text.charCodeAt(i);
    h = h >>> 0;
  }
  return `ph_${h.toString(16).padStart(8, "0")}`;
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * Build a normalised Bridge Event envelope.
 *
 * @param {object} options
 * @param {string} options.event_id           — Globally unique event ID (from outbox record).
 * @param {string} options.event_type         — Bridge event type (from BRIDGE_EVENT_TYPES).
 * @param {string} options.source_device_id
 * @param {string} options.source_session_id
 * @param {string} options.source_user_id
 * @param {string} options.source_user_role
 * @param {object} options.snapshot_evidence  — From buildItemSnapshotEvidence().
 * @param {object} options.payload            — Workflow-specific payload object.
 * @param {string} [options.created_at]       — ISO timestamp from originating event.
 * @returns {{ ok: boolean, event?: object, errors?: string[] }}
 */
export function buildBridgeEvent({
  event_id,
  event_type,
  source_device_id,
  source_session_id,
  source_user_id,
  source_user_role,
  snapshot_evidence,
  payload,
  created_at,
}) {
  const captured_at = nowIso();
  const envelope = {
    event_id,
    event_type,
    event_version: BRIDGE_EVENT_VERSION,

    source_system: BRIDGE_SOURCE_SYSTEM,
    source_device_id: source_device_id || null,
    source_session_id: source_session_id || null,
    source_user_id: source_user_id || null,
    source_user_role: source_user_role || null,

    created_at: created_at || captured_at,
    captured_at,

    inventory_snapshot_id: snapshot_evidence?.inventory_snapshot_id || null,
    inventory_snapshot_ref: snapshot_evidence?.inventory_snapshot_ref || null,
    inventory_snapshot_hash: snapshot_evidence?.inventory_snapshot_hash || null,
    inventory_record_version: snapshot_evidence?.inventory_record_version || null,
    last_inventory_sync_at: snapshot_evidence?.last_inventory_sync_at || null,

    payload: payload || {},
    payload_hash: buildPayloadHash(payload || {}),
  };

  const errors = validateBridgeEvent(envelope);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, event: envelope };
}

/**
 * Validate a bridge event envelope.
 * Returns an array of error strings. Empty array = valid.
 */
export function validateBridgeEvent(envelope) {
  const errors = [];

  for (const field of REQUIRED_ENVELOPE_FIELDS) {
    if (!envelope[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (envelope.event_type && !Object.values(BRIDGE_EVENT_TYPES).includes(envelope.event_type)) {
    errors.push(`Unknown bridge event type: ${envelope.event_type}`);
  }

  const hasAnySnapshotField = REQUIRED_SNAPSHOT_FIELDS.some((f) => !!envelope[f]);
  if (!hasAnySnapshotField) {
    errors.push("Bridge event missing inventory snapshot evidence (snapshot_id, snapshot_ref, snapshot_hash).");
  }

  return errors;
}

/**
 * Map an internal ScanOps event_type string to its bridge event type.
 * Returns null if the event should not be bridged (not a v1 markdown event).
 */
export function toBridgeEventType(internalEventType) {
  return INTERNAL_TO_BRIDGE_EVENT_TYPE[internalEventType] || null;
}

/**
 * Check whether a given internal event type should be bridged in v1.
 */
export function isBridgeableEvent(internalEventType) {
  return !!INTERNAL_TO_BRIDGE_EVENT_TYPE[internalEventType];
}