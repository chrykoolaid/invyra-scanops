import { getInventorySnapshot } from "./inventorySnapshot";
import { resolveProductIdentity } from "./productIdentityResolver";
import { fetchInventoryItems } from "./useInventoryItems";

// In-memory cache of DB items so resolveInventoryIdentity stays synchronous
let _dbItemsCache = null;
let _dbItemsCacheAt = 0;
const DB_CACHE_TTL = 60_000; // 1 minute

async function warmDbCache() {
  const now = Date.now();
  if (_dbItemsCache && now - _dbItemsCacheAt < DB_CACHE_TTL) return;
  try {
    const rows = await fetchInventoryItems();
    if (rows && rows.length > 0) {
      _dbItemsCache = rows;
      _dbItemsCacheAt = now;
    }
  } catch {}
}

// Kick off cache warm immediately on module load
warmDbCache();

const SNAPSHOT_KEY = "invyra_scanops_inventory_snapshot_v1";
const CONNECTION_KEY = "invyra_scanops_inventory_connection_v1";
function read(key, fallback) { if (typeof window === "undefined") return fallback; try { const raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
function write(key, value) { if (typeof window === "undefined") return; try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {} }

export function getInventoryConnection() { return read(CONNECTION_KEY, { mode: "online", statusLabel: "Online", adapterName: "Invyra Inventory Local Pilot Adapter", lastPullAt: null, lastPushAt: null }); }
export function setInventoryConnectionMode(mode) { const next = { ...getInventoryConnection(), mode, statusLabel: mode === "offline" ? "Offline" : "Online", updatedAt: new Date().toISOString() }; write(CONNECTION_KEY, next); return next; }
export function getLocalInventorySnapshot() { return read(SNAPSHOT_KEY, getInventorySnapshot()); }
export function pullInventorySnapshot() { const c = getInventoryConnection(); if (c.mode === "offline") return { ok: false, error: "Inventory system unavailable while scanner is offline.", snapshot: getLocalInventorySnapshot() }; const snapshot = { ...getInventorySnapshot(), pulledAt: new Date().toISOString() }; write(SNAPSHOT_KEY, snapshot); write(CONNECTION_KEY, { ...c, mode: "online", statusLabel: "Online", lastPullAt: snapshot.pulledAt }); return { ok: true, snapshot }; }
export function pushInventoryEvent(syncRecord) { const c = getInventoryConnection(); if (c.mode === "offline") return { ok: false, error: "Network unavailable. Event remains saved on device." }; const attemptedAt = new Date().toISOString(); write(CONNECTION_KEY, { ...c, mode: "online", statusLabel: "Pilot local", lastPushAt: null, lastPushAttemptAt: attemptedAt }); return { ok: false, attemptedAt, inventoryEventId: null, error: "Desktop inventory connection is not configured. Event remains saved locally for pilot review.", localEventId: syncRecord?.localEventId || null }; }
export function resolveInventoryIdentity(input) {
  // Prefer live DB cache; fall back to static snapshot
  const items = (_dbItemsCache && _dbItemsCache.length > 0)
    ? _dbItemsCache
    : getLocalInventorySnapshot().items;
  return resolveProductIdentity(input, items);
}

// Call this from workflow pages to ensure DB items are loaded before scanning
export async function ensureInventoryLoaded() {
  await warmDbCache();
}
export function getInventoryItemByBarcode(barcode) { return resolveInventoryIdentity(barcode); }
export function getInventoryItemBySku(sku) { return resolveInventoryIdentity(sku); }
export function getInventoryItemByPLU(plu) { return resolveInventoryIdentity(plu); }
export function getStockForLocation(identity) { const item = resolveInventoryIdentity(identity); if (!item) return null; return { shelfStock: item.shelfStock ?? item.shelf_stock, backroomStock: item.backroomStock ?? item.backroom_stock, stockOnHand: item.stockOnHand ?? item.stock_on_hand, unitType: item.unitType || "each", shelfLocation: item.shelfLocation || item.location, backroomLocation: item.backroomLocation }; }
export function getExpiryBatches(identity) { const item = resolveInventoryIdentity(identity); if (!item) return []; return [{ batchId: item.batchId || item.batch_id || "batch_pending", lotId: item.lotId || item.lot_id || null, expiryDate: item.expiryDate || item.expiry_date || null, freshnessStatus: item.freshnessStatus || item.expiry_status || "OK", stockOnHand: item.stockOnHand ?? item.stock_on_hand ?? null }]; }
export function simulateInventoryConnection(mode) { return setInventoryConnectionMode(mode); }