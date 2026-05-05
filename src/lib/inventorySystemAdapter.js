import { getInventorySnapshot } from "./inventorySnapshot";
import { resolveProductIdentity } from "./productIdentityResolver";

const SNAPSHOT_KEY = "invyra_scanops_inventory_snapshot_v1";
const CONNECTION_KEY = "invyra_scanops_inventory_connection_v1";
function read(key, fallback) { if (typeof window === "undefined") return fallback; try { const raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
function write(key, value) { if (typeof window === "undefined") return; try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {} }

export function getInventoryConnection() { return read(CONNECTION_KEY, { mode: "online", statusLabel: "Online", adapterName: "Invyra Inventory Demo Adapter", lastPullAt: null, lastPushAt: null }); }
export function setInventoryConnectionMode(mode) { const next = { ...getInventoryConnection(), mode, statusLabel: mode === "offline" ? "Offline" : "Online", updatedAt: new Date().toISOString() }; write(CONNECTION_KEY, next); return next; }
export function getLocalInventorySnapshot() { return read(SNAPSHOT_KEY, getInventorySnapshot()); }
export function pullInventorySnapshot() { const c = getInventoryConnection(); if (c.mode === "offline") return { ok: false, error: "Inventory system unavailable while scanner is offline.", snapshot: getLocalInventorySnapshot() }; const snapshot = { ...getInventorySnapshot(), pulledAt: new Date().toISOString() }; write(SNAPSHOT_KEY, snapshot); write(CONNECTION_KEY, { ...c, mode: "online", statusLabel: "Online", lastPullAt: snapshot.pulledAt }); return { ok: true, snapshot }; }
export function pushInventoryEvent(syncRecord) { const c = getInventoryConnection(); if (c.mode === "offline") return { ok: false, error: "Network unavailable. Event remains saved on device." }; const pushedAt = new Date().toISOString(); write(CONNECTION_KEY, { ...c, mode: "online", statusLabel: "Online", lastPushAt: pushedAt }); return { ok: true, pushedAt, inventoryEventId: `inv_evt_${String(syncRecord?.localEventId || Date.now()).replace(/[^a-zA-Z0-9_]/g, "_")}`, message: "Accepted by Invyra Inventory demo adapter." }; }
export function resolveInventoryIdentity(input) { return resolveProductIdentity(input, getLocalInventorySnapshot().items); }
export function getInventoryItemByBarcode(barcode) { return resolveInventoryIdentity(barcode); }
export function getInventoryItemBySku(sku) { return resolveInventoryIdentity(sku); }
export function getInventoryItemByPLU(plu) { return resolveInventoryIdentity(plu); }
export function getStockForLocation(identity) { const item = resolveInventoryIdentity(identity); if (!item) return null; return { shelfStock: item.shelfStock ?? item.shelf_stock, backroomStock: item.backroomStock ?? item.backroom_stock, stockOnHand: item.stockOnHand ?? item.stock_on_hand, unitType: item.unitType || "each", shelfLocation: item.shelfLocation || item.location, backroomLocation: item.backroomLocation }; }
export function getExpiryBatches(identity) { const item = resolveInventoryIdentity(identity); if (!item) return []; return [{ batchId: item.batchId || item.batch_id || "batch_pending", lotId: item.lotId || item.lot_id || null, expiryDate: item.expiryDate || item.expiry_date || null, freshnessStatus: item.freshnessStatus || item.expiry_status || "OK", stockOnHand: item.stockOnHand ?? item.stock_on_hand ?? null }]; }
export function simulateInventoryConnection(mode) { return setInventoryConnectionMode(mode); }
