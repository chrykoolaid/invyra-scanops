/**
 * inventorySnapshot.js — LEGACY SHIM
 *
 * Re-exports from lib/dev/inventoryFixtures.js (mock/dev data only).
 * In inventory_bridge mode the InventoryBridgeProvider is used instead.
 * This shim exists only for backward-compat with Phase-E-pending workflows.
 *
 * DO NOT add new items here. Add them to lib/dev/inventoryFixtures.js.
 * DO NOT import this file in any new code — use getActiveInventoryProvider() instead.
 */
export {
  MOCK_SELL_TYPES as SELL_TYPES,
  MOCK_INVENTORY_META as INVENTORY_SNAPSHOT_META,
  MOCK_INVENTORY_ITEMS as INVENTORY_SNAPSHOT_ITEMS,
  getMockInventorySnapshot as getInventorySnapshot,
} from "./dev/inventoryFixtures";

export function normalizeInventoryItem(item) {
  if (!item) return null;
  return {
    ...item,
    id: item.internalItemId,
    shelf_stock: item.shelfStock,
    backroom_stock: item.backroomStock,
    stock_on_hand: item.stockOnHand,
    minimum_shelf_qty: item.minimumStock,
    pending_delivery_qty: item.pendingDeliveryQty,
    pending_delivery_eta: item.pendingDeliveryEta,
    current_price: item.currentPrice,
    unit_cost: item.unitCost,
    expiry_date: item.expiryDate,
    expiry_status: item.freshnessStatus,
    planogram_status: item.planogramStatus,
    location: item.shelfLocation,
  };
}