/**
 * InventoryProvider Interface
 *
 * Both MockInventoryProvider and InventoryBridgeProvider must implement this shape.
 * The active provider is selected by getActiveInventoryProvider() based on DATA_MODE.
 *
 * CONTRACT:
 *   searchItems(query: string, limit?: number): Promise<InventorySnapshotItem[]>
 *   getCachedItems(limit?: number): Promise<InventorySnapshotItem[]>
 *     — Returns all cached items up to limit, without search scoring.
 *       Bridge mode: only cached Inventory items. No mock fallback.
 *       Mock mode: returns dev fixtures (mock/dev mode only).
 *   resolveByBarcode(barcode: string): Promise<InventorySnapshotItem | null>
 *   getItemSnapshot(itemIdOrSku: string): Promise<InventorySnapshotItem | null>
 *   refreshInventoryCache(): Promise<{ ok: boolean; error?: string }>
 *   getCacheStatus(): Promise<CacheStatus>
 *   isStale(): Promise<boolean>
 *   getLastSyncedAt(): Promise<string | null>
 *
 * InventorySnapshotItem shape (aligned to approved contract):
 * {
 *   item_id, sku, barcode, barcode_aliases,
 *   item_name, category, uom,
 *   current_unit_price, last_price_sync_at,
 *   on_hand_qty, available_qty, stock_status,
 *   location_id, location_name,
 *   batch_id, expiry_date, sell_by_date,
 *   markdown_status, active_markdown_overlay_id,
 *   inventory_record_version,
 *   last_inventory_sync_at,
 *   source,           // always "INVENTORY" or "MOCK"
 *   schema_version,   // "1.0.0"
 * }
 *
 * CacheStatus shape:
 * {
 *   isStale: boolean,
 *   lastSyncedAt: string | null,
 *   itemCount: number,
 *   mode: "mock" | "inventory_bridge",
 * }
 *
 * HARD RULE (inventory_bridge mode):
 *   If an item is not found, return null. Never fall back to mock fixtures.
 *   Callers must show "Item not found in Inventory cache / refresh required."
 */