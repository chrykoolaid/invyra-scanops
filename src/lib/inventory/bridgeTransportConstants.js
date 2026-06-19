/**
 * bridgeTransportConstants.js — Phase 1D-A
 *
 * Bridge transport constants and contract definitions for the
 * ScanOps ↔ Inventory Bridge v1.
 *
 * Phase 1D-A scope: constants and object-shape helpers ONLY.
 *   - No API calls.
 *   - No entity writes.
 *   - No event processing.
 *   - No transport client.
 *   - No backend relay function.
 *   - No device pairing entity.
 *   - No UI.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️  BASE44 PROTOTYPE LIMITATION — READ BEFORE BUILDING ON THIS FILE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Base44 backend functions run on Deno Deploy (cloud-hosted).
 * Base44 CANNOT expose a true local LAN/IP server.
 * Base44 CANNOT act as the final production desktop bridge.
 * Base44 CAN ONLY simulate/prototype the bridge transport via cloud relay.
 *
 * The Base44 prototype transport (Phase 1D-B) will be a cloud relay:
 *   ScanOps → Base44 HTTPS cloud function → Inventory entity writes → receipts
 *   This is NOT a local LAN bridge. It exercises the ingestion engine correctly
 *   but does not represent production LAN latency, LAN isolation, or offline mode.
 *
 * The real production bridge requires a desktop/local server companion service
 * (Node.js / Electron / Go) running on the Inventory machine, accessible over
 * store Wi-Fi. This is specified in Phase 1D-F — it cannot be built in Base44.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HARD RULES — enforced in every transport phase:
 *   - Transport MUST NEVER bypass processInboundScanOpsEvent(event).
 *   - Transport MUST NEVER mutate stock, pricing, POS, orders, forecasting,
 *     or Item Master.
 *   - Transport MUST NOT create MarkdownSyncReviewQueue records directly.
 *   - Transport MUST NOT activate markdown prices.
 *   - Transport MUST NOT create StockMovements, POSLineItems, or PurchaseOrders.
 *   - A transport 200 OK does NOT mean event accepted — check each receipt.status.
 *   - Transport trust (device pairing) ≠ ingestion trust (engine validation).
 *   - Inventory remains source-of-truth. ScanOps remains capture-only.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Protocol Identity ─────────────────────────────────────────────────────────

/** Semantic version of the bridge wire protocol. Bump on breaking changes. */
export const BRIDGE_PROTOCOL_VERSION = "1.0.0";

/** Display name of the Inventory-side bridge service. */
export const BRIDGE_NAME = "Invyra Inventory Bridge";

/** Version of the bridge service itself (distinct from protocol version). */
export const BRIDGE_VERSION = "1.0.0";

// ── Endpoint Paths ────────────────────────────────────────────────────────────
// These are the canonical URL path segments for both:
//   - Base44 prototype cloud relay (Phase 1D-B): appended to the Base44 function URL
//   - Production desktop bridge service (Phase 1D-F): served on local LAN IP:port
//
// Note: In the Base44 prototype, all requests route through a single backend
// function (inventoryBridgeRelay) since Base44 does not support true path routing
// on backend functions. The path constants are preserved here for production
// fidelity and documentation accuracy.

export const BRIDGE_ENDPOINT_PATHS = Object.freeze({
  /** Liveness / readiness check. Returns bridge status and capabilities list. */
  health:           "/scanops-bridge/health",

  /** Supported event types and feature flags. ScanOps checks before submitting. */
  capabilities:     "/scanops-bridge/capabilities",

  /** Event ingestion. Accepts a batch of ScanOps bridge events. Returns receipts. */
  events:           "/scanops-bridge/events",

  /** Inventory snapshot publish (read-only). Not active in Phase 1D. */
  snapshot:         "/scanops-bridge/snapshot",

  /** Markdown overlay publish (read-only). Not active in Phase 1D. */
  markdownOverlays: "/scanops-bridge/markdown-overlays",
});

// ── Environments ──────────────────────────────────────────────────────────────
// Environment tag is embedded in pairing config and validated at transport layer.
// A LIVE ScanOps device must only connect to a LIVE bridge.
// A TRAINING device must only connect to a TRAINING bridge.
// Mismatch → transport returns ENVIRONMENT_MISMATCH error; event not processed.

export const BRIDGE_ENVIRONMENTS = Object.freeze({
  /** Production store environment. Real Inventory data. Real markdown events. */
  LIVE:     "LIVE",

  /** Sandbox clone. Safe for staff training without affecting live data. */
  TRAINING: "TRAINING",

  /** Automated verification only (e.g. Phase 1C-F style runs). */
  TEST:     "TEST",
});

// ── Device Statuses ───────────────────────────────────────────────────────────
// Lifecycle of a paired ScanOps device in the InventoryBridgeDevice registry.
// Status is managed on the Inventory side; ScanOps only reads it via receipts.
//
// PENDING  → device has presented pairing credentials, not yet approved
// TRUSTED  → approved by Inventory operator; events accepted at transport layer
//            (ingestion engine still validates every event independently)
// REVOKED  → manually revoked; all future events rejected at transport layer
// EXPIRED  → pairing token TTL exceeded; re-pair required
// BLOCKED  → security hold; requires admin release before any re-pair

export const BRIDGE_DEVICE_STATUS = Object.freeze({
  PENDING:  "PENDING",
  TRUSTED:  "TRUSTED",
  REVOKED:  "REVOKED",
  EXPIRED:  "EXPIRED",
  BLOCKED:  "BLOCKED",
});

/** Device statuses that permit event submission at the transport layer. */
export const BRIDGE_DEVICE_STATUS_ACTIVE = new Set([
  BRIDGE_DEVICE_STATUS.TRUSTED,
]);

/** Device statuses that are terminal (no auto-recovery; require operator action). */
export const BRIDGE_DEVICE_STATUS_TERMINAL = new Set([
  BRIDGE_DEVICE_STATUS.REVOKED,
  BRIDGE_DEVICE_STATUS.BLOCKED,
]);

// ── Pairing Methods ───────────────────────────────────────────────────────────

export const BRIDGE_PAIRING_METHOD = Object.freeze({
  /** Operator manually enters bridge host IP and port on the ScanOps device. */
  MANUAL_IP:          "MANUAL_IP",

  /**
   * Inventory displays a pairing QR code; ScanOps scans it.
   * QR payload: { bridge_host, bridge_port, pairing_token, token_expiry,
   *               store_id, environment, bridge_version }
   */
  QR_CODE:            "QR_CODE",

  /** Device pre-configured by an admin (e.g. MDM or provisioning script). */
  ADMIN_PROVISIONED:  "ADMIN_PROVISIONED",
});

// ── Capabilities ──────────────────────────────────────────────────────────────
// Named capability identifiers returned in the health and capabilities responses.
// ScanOps checks capabilities before sending events or requesting data.
//
// Only include capabilities that are defined or planned in the v1 specification.
// Do not add capabilities that have no defined endpoint or contract.

export const BRIDGE_CAPABILITIES = Object.freeze({
  /** ScanOps can submit markdown bridge events and receive receipts. */
  scanops_markdown_sync:       "scanops_markdown_sync",

  /** Bridge returns InventorySyncReceipt objects per submitted event. */
  receipt_return:              "receipt_return",

  /**
   * Inventory can publish read-only item snapshots to ScanOps.
   * Not active in Phase 1D. Will be enabled in a future phase.
   */
  inventory_snapshot_publish:  "inventory_snapshot_publish",

  /**
   * Inventory can publish markdown overlay data (review statuses) to ScanOps.
   * Not active in Phase 1D. Will be enabled in a future phase.
   */
  markdown_overlay_publish:    "markdown_overlay_publish",

  /** Bridge supports device pairing via token exchange. */
  device_pairing:              "device_pairing",

  /**
   * Bridge accepts batched event arrays (up to MAX_BRIDGE_BATCH_SIZE per request).
   * Each event in a batch is processed independently by the ingestion engine.
   */
  batch_events:                "batch_events",
});

/** Capabilities active in Phase 1D-B prototype. Others are advertised as false. */
export const BRIDGE_CAPABILITIES_ACTIVE_PHASE_1D = new Set([
  BRIDGE_CAPABILITIES.scanops_markdown_sync,
  BRIDGE_CAPABILITIES.receipt_return,
  BRIDGE_CAPABILITIES.device_pairing,
  BRIDGE_CAPABILITIES.batch_events,
]);

// ── Limits ────────────────────────────────────────────────────────────────────

/** Maximum number of ScanOps bridge events per POST /scanops-bridge/events request. */
export const MAX_BRIDGE_BATCH_SIZE = 20;

/** Milliseconds between ScanOps health poll requests to the bridge. */
export const HEALTH_POLL_INTERVAL_MS = 60_000; // 60 seconds

/** Minutes until a QR or manually-issued pairing token expires. */
export const PAIRING_TOKEN_TTL_MINUTES = 5;

/** Maximum number of FAILED_RETRYABLE replay attempts before surfacing as FAILED_TERMINAL display. */
export const MAX_BRIDGE_RETRY_ATTEMPTS = 3;

/** Milliseconds to wait between bridge retry attempts (exponential base). */
export const BRIDGE_RETRY_BASE_DELAY_MS = 5_000; // 5 seconds

// ── Device Types ──────────────────────────────────────────────────────────────

export const BRIDGE_DEVICE_TYPE = Object.freeze({
  HANDHELD_SCANNER: "HANDHELD_SCANNER",
  TABLET:           "TABLET",
  DESKTOP:          "DESKTOP",
  UNKNOWN:          "UNKNOWN",
});

// ── Transport Error Codes ─────────────────────────────────────────────────────
// Returned by the bridge transport layer (not the ingestion engine).
// Ingestion engine errors are expressed as receipt.status values.

export const BRIDGE_TRANSPORT_ERROR = Object.freeze({
  PROTOCOL_VERSION_MISMATCH: "PROTOCOL_VERSION_MISMATCH",
  DEVICE_NOT_TRUSTED:        "DEVICE_NOT_TRUSTED",
  ENVIRONMENT_MISMATCH:      "ENVIRONMENT_MISMATCH",
  PAIRING_TOKEN_EXPIRED:     "PAIRING_TOKEN_EXPIRED",
  PAIRING_TOKEN_INVALID:     "PAIRING_TOKEN_INVALID",
  BATCH_SIZE_EXCEEDED:       "BATCH_SIZE_EXCEEDED",
  BRIDGE_UNAVAILABLE:        "BRIDGE_UNAVAILABLE",
  CAPABILITY_NOT_SUPPORTED:  "CAPABILITY_NOT_SUPPORTED",
});

// ── Contract Object Builders ──────────────────────────────────────────────────
// These functions return plain object shapes only.
// They do NOT call APIs, write entities, process events, or call processInboundScanOpsEvent().
// They are used as documentation of the expected wire contract shape.

/**
 * Shape of a GET /scanops-bridge/health response.
 * Actual values are filled in by the bridge service at runtime.
 *
 * @param {object} overrides — partial field values
 * @returns {object} health response shape
 */
export function buildBridgeHealthResponse(overrides = {}) {
  return {
    status:                  overrides.status                  ?? "ok",       // "ok" | "degraded" | "unavailable"
    bridge_name:             overrides.bridge_name             ?? BRIDGE_NAME,
    bridge_version:          overrides.bridge_version          ?? BRIDGE_VERSION,
    bridge_protocol_version: overrides.bridge_protocol_version ?? BRIDGE_PROTOCOL_VERSION,
    inventory_instance_id:   overrides.inventory_instance_id   ?? null,
    store_id:                overrides.store_id                ?? null,
    environment:             overrides.environment             ?? BRIDGE_ENVIRONMENTS.LIVE,
    current_time:            overrides.current_time            ?? new Date().toISOString(),
    uptime_seconds:          overrides.uptime_seconds          ?? null,
    capabilities:            overrides.capabilities            ?? [],
    // Only present when status !== "ok"
    reason:                  overrides.reason                  ?? undefined,
    retry_after_seconds:     overrides.retry_after_seconds     ?? undefined,
    // Prototype disclosure — included in prototype mode only
    _prototype_note: "BASE44 PROTOTYPE: This response is served by a cloud relay function, not a local LAN bridge service.",
  };
}

/**
 * Shape of a GET /scanops-bridge/capabilities response.
 *
 * @param {object} overrides — partial field values
 * @returns {object} capabilities response shape
 */
export function buildBridgeCapabilitiesResponse(overrides = {}) {
  return {
    bridge_protocol_version: overrides.bridge_protocol_version ?? BRIDGE_PROTOCOL_VERSION,
    supported_event_types:   overrides.supported_event_types   ?? [
      "scanops.markdown.requested",
      "scanops.markdown.approved",
      "scanops.markdown.returned",
      "scanops.markdown.rejected",
      "scanops.markdown.handoff.created",
    ],
    capabilities: overrides.capabilities ?? {
      [BRIDGE_CAPABILITIES.scanops_markdown_sync]:      true,
      [BRIDGE_CAPABILITIES.receipt_return]:             true,
      [BRIDGE_CAPABILITIES.inventory_snapshot_publish]: false,  // Phase 1D: not yet active
      [BRIDGE_CAPABILITIES.markdown_overlay_publish]:   false,  // Phase 1D: not yet active
      [BRIDGE_CAPABILITIES.device_pairing]:             true,
      [BRIDGE_CAPABILITIES.batch_events]:               true,
    },
    max_batch_size: overrides.max_batch_size ?? MAX_BRIDGE_BATCH_SIZE,
    phase:          overrides.phase          ?? "1D",
    notes:          overrides.notes          ?? "inventory_snapshot_publish and markdown_overlay_publish are not yet active in Phase 1D.",
  };
}

/**
 * Shape of a POST /scanops-bridge/events request body.
 * events array must contain valid ScanOps bridge event envelopes.
 *
 * @param {object} overrides — partial field values
 * @returns {object} event batch request shape
 */
export function buildBridgeEventBatchRequest(overrides = {}) {
  return {
    bridge_protocol_version: overrides.bridge_protocol_version ?? BRIDGE_PROTOCOL_VERSION,
    source_device_id:        overrides.source_device_id        ?? null,
    source_session_id:       overrides.source_session_id       ?? null,
    submitted_at:            overrides.submitted_at            ?? new Date().toISOString(),
    events:                  overrides.events                  ?? [],
    // events[] must each be a valid ScanOps bridge event envelope.
    // Each event will be passed to processInboundScanOpsEvent(event) independently.
    // Transport MUST NOT batch-accept or batch-reject without per-event engine decisions.
  };
}

/**
 * Shape of a POST /scanops-bridge/events response body.
 * receipts array contains one InventorySyncReceipt per submitted event.
 *
 * IMPORTANT: A 200 HTTP response does NOT mean all events were accepted.
 * ScanOps MUST check each receipt.status individually.
 * ACK_RECEIVED / ACK_PROCESSED = accepted.
 * HELD_FOR_REVIEW = held, do not auto-retry.
 * REJECTED_* / FAILED_* = see receipt.decision_code for details.
 * ACK_DUPLICATE = already processed, original receipt returned.
 *
 * @param {object} overrides — partial field values
 * @returns {object} event batch response shape
 */
export function buildBridgeEventBatchResponse(overrides = {}) {
  return {
    bridge_protocol_version: overrides.bridge_protocol_version ?? BRIDGE_PROTOCOL_VERSION,
    processed_at:            overrides.processed_at            ?? new Date().toISOString(),
    accepted_count:          overrides.accepted_count          ?? 0,
    rejected_count:          overrides.rejected_count          ?? 0,
    held_count:              overrides.held_count              ?? 0,
    duplicate_count:         overrides.duplicate_count         ?? 0,
    receipts:                overrides.receipts                ?? [],
    // receipts[] shape (one per event):
    // {
    //   receipt_id, event_id, ingestion_id, status,
    //   decision_code, decision_message, linked_workflow_ref,
    //   retry_allowed, inventory_received_at, inventory_processed_at
    // }
  };
}