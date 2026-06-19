/**
 * InventoryBridgeProvider
 *
 * Active when DATA_MODE = "inventory_bridge".
 * 
 * Phase D stub: This provider reads from the Base44 InventoryItem entity
 * (the same DB used by the desktop Inventory system) and caches results in
 * IndexedDB via StorageProvider.
 *
 * HARD RULES:
 *   - If item is not found, return null. Never fall back to mock fixtures.
 *   - No stock quantity mutation.
 *   - No Item Master price mutation.
 *   - Cached data is read-only.
 *   - Event outbox is SEPARATE from this cache (see storageProvider.js).
 *
 * Bridge status: CONTROLLED STUB
 *   Real Inventory API endpoint is not yet connected.
 *   This provider reads from the shared Base44 InventoryItem entity as a
 *   development-safe proxy. Data in that entity must be treated as
 *   Inventory-owned; ScanOps must not mutate it.
 *   Label: DEVELOPMENT BRIDGE — not production-ready until real API is wired.
 */
import { base44 } from "@/api/base44Client";
import {
  clearSnapshotItems,
  getSnapshotItem,
  getSnapshotItems,
  getSnapshotMeta,
  saveSnapshotItems,
  saveSnapshotMeta,
} from "./storageProvider";
import { resolveProductIdentity, searchProductIdentities, attachMatchToItem } from "../productIdentityResolver";

const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const SCHEMA_VERSION = "1.0.0";

// ── Normalise a raw InventoryItem DB record into the approved snapshot contract ──
function normalize(item) {
  if (!item) return null;
  const now = new Date().toISOString();
  return {
    item_id: item.internalItemId || item.id,
    sku: item.sku,
    barcode: item.barcode,
    barcode_aliases: item.barcodeAliases || item.aliases || [],
    item_name: item.name,
    category: item.category || item.department,
    uom: item.unitType || "each",
    current_unit_price: item.currentPrice ?? null,
    last_price_sync_at: item.updated_date || now,
    on_hand_qty: item.stockOnHand ?? null,
    available_qty: item.shelfStock ?? null,
    stock_status: item.status || "active",
    location_id: item.shelfLocation || null,
    location_name: item.shelfLocation || null,
    batch_id: item.batchId || null,
    expiry_date: item.expiryDate || null,
    sell_by_date: item.expiryDate || null, // map until sell_by_date field added to entity
    markdown_status: item.markdownEligible ? "eligible" : "not_eligible",
    active_markdown_overlay_id: null,
    inventory_record_version: item.updated_date || null,
    last_inventory_sync_at: item.updated_date || now,
    source: "INVENTORY",
    schema_version: SCHEMA_VERSION,
    // Preserve all original fields so existing workflow components still work
    ...item,
  };
}

// ── Load from IndexedDB cache, warming from DB if empty ──
async function getOrWarmCache() {
  let items = await getSnapshotItems();
  if (!items || items.length === 0) {
    await InventoryBridgeProvider.refreshInventoryCache();
    items = await getSnapshotItems();
  }
  return items || [];
}

export const InventoryBridgeProvider = {
  async searchItems(query, limit = 6) {
    const items = await getOrWarmCache();
    const results = searchProductIdentities(query, items, limit);
    return results.map((item) => normalize(attachMatchToItem(item))).filter(Boolean);
  },

  /**
   * getCachedItems — returns up to `limit` cached items without search scoring.
   * Bridge mode only: pulls directly from IndexedDB. No mock fallback ever.
   */
  async getCachedItems(limit = 100) {
    const items = await getOrWarmCache();
    return items.slice(0, limit).map(normalize).filter(Boolean);
  },

  async resolveByBarcode(barcode) {
    const items = await getOrWarmCache();
    const found = resolveProductIdentity(barcode, items);
    return found ? normalize(found) : null;
  },

  async getItemSnapshot(itemIdOrSku) {
    const items = await getOrWarmCache();
    const found = resolveProductIdentity(itemIdOrSku, items);
    return found ? normalize(found) : null;
  },

  async refreshInventoryCache() {
    try {
      const rows = await base44.entities.InventoryItem.list("-updated_date", 500);
      if (!rows || rows.length === 0) {
        return { ok: false, error: "No inventory items returned from Inventory system." };
      }
      const normalized = rows.map(normalize).filter(Boolean);
      await clearSnapshotItems();
      await saveSnapshotItems(normalized);
      const meta = {
        last_inventory_sync_at: new Date().toISOString(),
        item_count: normalized.length,
        schema_version: SCHEMA_VERSION,
        source: "INVENTORY",
        bridge_mode: "development_stub",
      };
      await saveSnapshotMeta(meta);
      return { ok: true, itemCount: normalized.length };
    } catch (err) {
      return { ok: false, error: err?.message || "Inventory cache refresh failed." };
    }
  },

  async getCacheStatus() {
    const meta = await getSnapshotMeta();
    const items = await getSnapshotItems();
    const lastSync = meta?.last_inventory_sync_at || null;
    const stale = lastSync
      ? Date.now() - new Date(lastSync).getTime() > STALE_THRESHOLD_MS
      : true;
    return {
      isStale: stale,
      lastSyncedAt: lastSync,
      itemCount: items?.length || 0,
      mode: "inventory_bridge",
    };
  },

  async isStale() {
    const status = await this.getCacheStatus();
    return status.isStale;
  },

  async getLastSyncedAt() {
    const meta = await getSnapshotMeta();
    return meta?.last_inventory_sync_at || null;
  },
};