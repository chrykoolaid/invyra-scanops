/**
 * inventorySnapshotEvidence.js — Phase 1A update
 *
 * Generates standardised inventory snapshot evidence blocks AND normalised
 * outbox events for the ScanOps ↔ Inventory Bridge v1.
 *
 * HARD RULES:
 *   - Does NOT mutate inventory stock, price, or any Inventory entity.
 *   - Does NOT create StockMovement or POSLineItem records.
 *   - Read-only snapshot attestation only.
 *   - Outbox events are immutable once queued (Phase 1A contract).
 */

import { getSnapshotMeta } from "./storageProvider";
import { buildBridgeEvent, toBridgeEventType } from "../scanopsBridgeEventContract";
import { getScanOpsSession, buildEventIdentity } from "../scanOpsSession";
import { buildGovernanceSnapshot } from "../scanOpsGovernance";

const SCHEMA_VERSION = "1.0.0";

/**
 * Derives a short, deterministic reference string from an item snapshot.
 * Not a cryptographic hash — a lightweight traceability key for audit logs.
 */
function buildSnapshotHash(item, syncedAt) {
  const parts = [
    item?.item_id || item?.internalItemId || "",
    item?.sku || "",
    item?.inventory_record_version || "",
    syncedAt || "",
    String(item?.current_unit_price ?? item?.currentPrice ?? ""),
    String(item?.on_hand_qty ?? item?.stockOnHand ?? ""),
  ].join("|");

  // djb2-style numeric hash → hex string (fast, collision-tolerant, no crypto needed)
  let h = 5381;
  for (let i = 0; i < parts.length; i++) {
    h = ((h << 5) + h) ^ parts.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  return h.toString(16).padStart(8, "0");
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * Build a full snapshot evidence block from a normalised inventory item.
 *
 * @param {object} item   — Normalised snapshot item (from provider).
 * @param {object} [meta] — Optional pre-fetched snapshot_meta to avoid
 *                          an extra async call when caller already has it.
 * @returns {object} Evidence block.
 */
export function buildItemSnapshotEvidence(item, meta = null) {
  const syncedAt =
    meta?.last_inventory_sync_at ||
    item?.last_inventory_sync_at ||
    item?.updated_date ||
    null;

  const snapshotId = [
    "snap",
    item?.item_id || item?.internalItemId || "unknown",
    Date.now().toString(36),
  ].join("_");

  return {
    inventory_snapshot_id: snapshotId,
    inventory_snapshot_ref: `${item?.sku || item?.item_id || "item"}_${Date.now().toString(36)}`,
    inventory_snapshot_hash: buildSnapshotHash(item, syncedAt),
    inventory_record_version: item?.inventory_record_version || null,
    last_inventory_sync_at: syncedAt,
    schema_version: SCHEMA_VERSION,
    source: item?.source || "INVENTORY",

    // Item identity
    item_id: item?.item_id || item?.internalItemId || null,
    sku: item?.sku || null,
    barcode: item?.barcode || null,

    // Price snapshot (read-only — does NOT change POS or Item Master)
    current_unit_price: item?.current_unit_price ?? item?.currentPrice ?? null,

    // Stock snapshot (read-only — does NOT mutate stock)
    on_hand_qty: item?.on_hand_qty ?? item?.stockOnHand ?? null,
    available_qty: item?.available_qty ?? item?.shelfStock ?? null,

    // Markdown state at time of capture
    markdown_status: item?.markdown_status || null,
    active_markdown_overlay_id: item?.active_markdown_overlay_id || null,
  };
}

/**
 * Async version — fetches snapshot_meta from IndexedDB automatically.
 * Use in bridge mode when the caller does not have pre-fetched meta.
 */
export async function buildItemSnapshotEvidenceAsync(item) {
  let meta = null;
  try {
    meta = await getSnapshotMeta();
  } catch {
    // IndexedDB unavailable (SSR, test env) — continue without meta
  }
  return buildItemSnapshotEvidence(item, meta);
}

/**
 * Build a normalised Bridge v1 outbox event for mirroring a Markdown event into IndexedDB.
 *
 * Produces a fully-compliant bridge envelope (Phase 1A).
 * Falls back gracefully with validation errors logged — never silently queues
 * an incomplete event.
 *
 * @param {string} internalEventType — e.g. "MARKDOWN_REQUEST_CREATED"
 * @param {object} payload           — The full internal event payload
 * @param {object|null} snapshotEvidence — Full evidence block from buildItemSnapshotEvidence()
 * @returns {object|null} Bridge event envelope (ready for addOutboxEvent()), or null on validation failure
 */
export function buildMarkdownOutboxEvent(internalEventType, payload, snapshotEvidence) {
  const bridgeEventType = toBridgeEventType(internalEventType);

  // If event type is not in the v1 bridge set, fall back to legacy shape
  // so existing non-markdown workflows are unaffected.
  if (!bridgeEventType) {
    return {
      event_id: `md_out_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      event_type: internalEventType,
      workflow: "MARKDOWN",
      source: "SCANOPS",
      payload,
      inventory_snapshot_ref: typeof snapshotEvidence === "string" ? snapshotEvidence : (snapshotEvidence?.inventory_snapshot_ref || null),
      queued_at: nowIso(),
      sync_status: "QUEUED",
    };
  }

  // Resolve actor identity for bridge envelope
  let session = {};
  let governance = {};
  try { session = getScanOpsSession() || {}; } catch {}
  try { governance = buildGovernanceSnapshot() || {}; } catch {}
  const identity = buildEventIdentity(session);

  const eventId = payload?.eventId
    || `md_bridge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // snapshotEvidence may be a string (legacy snapshot_ref) or a full evidence object
  const evidence = typeof snapshotEvidence === "object" && snapshotEvidence !== null
    ? snapshotEvidence
    : null;

  const result = buildBridgeEvent({
    event_id: eventId,
    event_type: bridgeEventType,
    source_device_id: identity.deviceId || identity.scannerId || governance.deviceId || null,
    source_session_id: identity.sessionId || governance.sessionId || null,
    source_user_id: identity.actorUserId || governance.userId || null,
    source_user_role: identity.actorRole || governance.role || null,
    snapshot_evidence: evidence,
    payload,
    created_at: payload?.createdAt || nowIso(),
  });

  if (!result.ok) {
    // Do not silently queue an invalid event — log errors and return null
    // Caller (appendMarkdownEvent) must handle null gracefully
    console.warn("[ScanOps Bridge] Outbox event failed validation:", result.errors, { internalEventType, bridgeEventType });
    return null;
  }

  return {
    ...result.event,
    workflow: "MARKDOWN",
    queued_at: nowIso(),
    sync_status: "QUEUED",
  };
}