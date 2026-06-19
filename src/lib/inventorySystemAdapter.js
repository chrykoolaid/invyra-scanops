/**
 * inventorySystemAdapter.js — Phase C refactor
 *
 * All item lookup is now routed through the active InventoryProvider.
 * Provider is selected by DATA_MODE (see lib/inventory/inventoryConfig.js).
 *
 * HARD RULES:
 *   - In inventory_bridge mode, null means "not in Inventory cache."
 *     Callers must show "Item not found in Inventory cache / refresh required."
 *   - No stock or price mutation.
 *   - Sync/connection state is tracked separately from snapshot cache.
 */
import { getActiveInventoryProvider } from "./inventory/activeInventoryProvider";
import { fetchInventoryItems } from "./useInventoryItems";
import { resolveProductIdentity } from "./productIdentityResolver";
import { isMockMode, getDataMode } from "./inventory/inventoryConfig";
import { MOCK_INVENTORY_ITEMS } from "./dev/inventoryFixtures";

// ── In-memory warm cache for synchronous resolveInventoryIdentity calls ──
// Populated on ensureInventoryLoaded(). Used only as a sync bridge for
// legacy workflow components that call resolveInventoryIdentity() synchronously.
let _syncCache = null;
let _syncCacheAt = 0;
let _syncCacheMode = null; // tracks which DATA_MODE populated the cache
const SYNC_CACHE_TTL = 60_000;

/**
 * Leakage guard: if DATA_MODE has changed since the cache was warmed,
 * discard the stale cache so mock data never bleeds into bridge mode.
 */
function isSyncCacheStillValid() {
  if (!_syncCache) return false;
  if (_syncCacheMode !== getDataMode()) return false; // mode changed — purge
  if (Date.now() - _syncCacheAt >= SYNC_CACHE_TTL) return false;
  return true;
}

export async function ensureInventoryLoaded() {
  if (isSyncCacheStillValid()) return;
  // Clear cache if mode has changed to prevent mock leakage into bridge mode
  if (_syncCacheMode !== null && _syncCacheMode !== getDataMode()) {
    _syncCache = null;
    _syncCacheAt = 0;
  }
  try {
    const provider = getActiveInventoryProvider();
    await provider.refreshInventoryCache();
    // Populate sync cache from live DB for bridge mode, fixtures for mock mode
    const rows = await fetchInventoryItems();
    const currentMode = getDataMode();
    if (rows && rows.length > 0) {
      _syncCache = rows;
      _syncCacheAt = Date.now();
      _syncCacheMode = currentMode;
    } else if (isMockMode()) {
      // Only allowed to fall back to mock data when explicitly in mock mode
      _syncCache = MOCK_INVENTORY_ITEMS;
      _syncCacheAt = Date.now();
      _syncCacheMode = currentMode;
    }
    // In bridge mode with no rows: leave cache null — callers get empty/null, not mock data
  } catch {}
}

/**
 * Synchronous item resolver — used by existing workflow scan handlers.
 *
 * In bridge mode: resolves against live DB cache warmed by ensureInventoryLoaded().
 * Returns null (never mock) if item not found in bridge mode.
 * Leakage guard: never uses a mock-warmed cache in bridge mode.
 */
export function resolveInventoryIdentity(input) {
  // If cache was warmed in mock mode but we are now in bridge mode, do not use it
  const safeMockFallback = isMockMode() ? MOCK_INVENTORY_ITEMS : [];
  const cacheIsClean = _syncCacheMode === getDataMode();
  const items = (cacheIsClean && _syncCache) ? _syncCache : safeMockFallback;
  return resolveProductIdentity(input, items);
}

// ── Connection/sync status (non-mutating, event-handoff only) ──
const CONNECTION_KEY = "invyra_scanops_inventory_connection_v1";
function readLS(key, fallback) { try { const r = window.localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; } }
function writeLS(key, value) { try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {} }

export function getInventoryConnection() {
  return readLS(CONNECTION_KEY, { mode: "online", statusLabel: "Online", adapterName: "Invyra Inventory Bridge Adapter", lastPullAt: null, lastPushAt: null });
}
export function setInventoryConnectionMode(mode) {
  const next = { ...getInventoryConnection(), mode, statusLabel: mode === "offline" ? "Offline" : "Online", updatedAt: new Date().toISOString() };
  writeLS(CONNECTION_KEY, next);
  return next;
}

/** @deprecated Use getActiveInventoryProvider().refreshInventoryCache() */
export function getLocalInventorySnapshot() {
  const items = _syncCache || (isMockMode() ? MOCK_INVENTORY_ITEMS : []);
  return { items };
}

export function pullInventorySnapshot() {
  const c = getInventoryConnection();
  if (c.mode === "offline") return { ok: false, error: "Inventory system unavailable while scanner is offline.", snapshot: getLocalInventorySnapshot() };
  ensureInventoryLoaded();
  const pulledAt = new Date().toISOString();
  writeLS(CONNECTION_KEY, { ...c, mode: "online", statusLabel: "Online", lastPullAt: pulledAt });
  return { ok: true, snapshot: getLocalInventorySnapshot() };
}

export function pushInventoryEvent(syncRecord) {
  const c = getInventoryConnection();
  if (c.mode === "offline") return { ok: false, error: "Network unavailable. Event remains saved on device." };
  const attemptedAt = new Date().toISOString();
  writeLS(CONNECTION_KEY, { ...c, mode: "online", statusLabel: "Bridge stub", lastPushAt: null, lastPushAttemptAt: attemptedAt });
  return { ok: false, attemptedAt, inventoryEventId: null, error: "Desktop inventory connection is not configured. Event remains saved locally.", localEventId: syncRecord?.localEventId || null };
}

export function simulateInventoryConnection(mode) { return setInventoryConnectionMode(mode); }

// Convenience aliases
export function getInventoryItemByBarcode(barcode) { return resolveInventoryIdentity(barcode); }
export function getInventoryItemBySku(sku) { return resolveInventoryIdentity(sku); }
export function getInventoryItemByPLU(plu) { return resolveInventoryIdentity(plu); }
export function getStockForLocation(identity) {
  const item = resolveInventoryIdentity(identity);
  if (!item) return null;
  return { shelfStock: item.shelfStock ?? item.shelf_stock, backroomStock: item.backroomStock ?? item.backroom_stock, stockOnHand: item.stockOnHand ?? item.stock_on_hand, unitType: item.unitType || "each", shelfLocation: item.shelfLocation || item.location, backroomLocation: item.backroomLocation };
}
export function getExpiryBatches(identity) {
  const item = resolveInventoryIdentity(identity);
  if (!item) return [];
  return [{ batchId: item.batchId || item.batch_id || "batch_pending", lotId: item.lotId || item.lot_id || null, expiryDate: item.expiryDate || item.expiry_date || null, freshnessStatus: item.freshnessStatus || item.expiry_status || "OK", stockOnHand: item.stockOnHand ?? item.stock_on_hand ?? null }];
}