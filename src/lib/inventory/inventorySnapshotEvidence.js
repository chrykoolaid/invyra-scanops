/**
 * inventorySnapshotEvidence.js
 *
 * Generates standardised inventory snapshot evidence blocks to be attached
 * to all ScanOps Markdown capture / request / approval / reject / return /
 * handoff records.
 *
 * HARD RULES:
 *   - Does NOT mutate inventory stock, price, or any Inventory entity.
 *   - Does NOT create StockMovement or POSLineItem records.
 *   - Read-only snapshot attestation only.
 */

import { getSnapshotMeta } from "./storageProvider";

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
 * Build the outbox event shape for mirroring a Markdown event into IndexedDB.
 *
 * @param {string} eventType        — e.g. "MARKDOWN_REQUEST_CREATED"
 * @param {object} payload          — The full event payload
 * @param {string} snapshotRef      — inventory_snapshot_ref from evidence block
 * @returns {object} Outbox record (ready for addOutboxEvent())
 */
export function buildMarkdownOutboxEvent(eventType, payload, snapshotRef) {
  return {
    event_id: `md_out_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    event_type: eventType,
    workflow: "MARKDOWN",
    source: "SCANOPS",
    payload,
    inventory_snapshot_ref: snapshotRef || null,
    queued_at: nowIso(),
    sync_status: "queued",
  };
}