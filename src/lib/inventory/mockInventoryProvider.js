/**
 * MockInventoryProvider
 *
 * DEV/DEMO MODE ONLY. Active when DATA_MODE = "mock".
 * Uses static fixtures from lib/dev/inventoryFixtures.js.
 * Must never be used in inventory_bridge mode.
 */
import { MOCK_INVENTORY_ITEMS } from "../dev/inventoryFixtures";
import { resolveProductIdentity, searchProductIdentities, attachMatchToItem, resolveProductIdentityWithMatch } from "../productIdentityResolver";

const MOCK_SYNC_AT = "2026-01-01T00:00:00.000Z"; // static — clearly dev-only

function normalize(item) {
  if (!item) return null;
  return {
    item_id: item.internalItemId || item.id || item.sku,
    sku: item.sku,
    barcode: item.barcode,
    barcode_aliases: item.barcodeAliases || item.aliases || [],
    item_name: item.name,
    category: item.category || item.department,
    uom: item.unitType || "each",
    current_unit_price: item.currentPrice ?? item.current_price ?? null,
    last_price_sync_at: MOCK_SYNC_AT,
    on_hand_qty: item.stockOnHand ?? item.stock_on_hand ?? null,
    available_qty: item.shelfStock ?? item.shelf_stock ?? null,
    stock_status: item.status || "active",
    location_id: item.shelfLocation || item.location || null,
    location_name: item.shelfLocation || item.location || null,
    batch_id: item.batchId || item.batch_id || null,
    expiry_date: item.expiryDate || item.expiry_date || null,
    sell_by_date: item.sellByDate || item.sell_by_date || null,
    markdown_status: item.markdownEligible ? "eligible" : "not_eligible",
    active_markdown_overlay_id: null,
    inventory_record_version: null,
    last_inventory_sync_at: MOCK_SYNC_AT,
    source: "MOCK",
    schema_version: "1.0.0",
    // Preserve original fields for backward compat with existing workflow components
    ...item,
  };
}

export const MockInventoryProvider = {
  async searchItems(query, limit = 6) {
    const results = searchProductIdentities(query, MOCK_INVENTORY_ITEMS, limit);
    return results.map((item) => normalize(attachMatchToItem(item))).filter(Boolean);
  },

  async resolveByBarcode(barcode) {
    const found = resolveProductIdentity(barcode, MOCK_INVENTORY_ITEMS);
    return found ? normalize(found) : null;
  },

  async getItemSnapshot(itemIdOrSku) {
    const found = resolveProductIdentity(itemIdOrSku, MOCK_INVENTORY_ITEMS);
    return found ? normalize(found) : null;
  },

  async refreshInventoryCache() {
    // No-op in mock mode — data is static fixtures
    return { ok: true, note: "Mock mode: no real cache to refresh." };
  },

  async getCacheStatus() {
    return {
      isStale: false,
      lastSyncedAt: MOCK_SYNC_AT,
      itemCount: MOCK_INVENTORY_ITEMS.length,
      mode: "mock",
    };
  },

  async isStale() {
    return false;
  },

  async getLastSyncedAt() {
    return MOCK_SYNC_AT;
  },
};