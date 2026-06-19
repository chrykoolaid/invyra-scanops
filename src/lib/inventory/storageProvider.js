/**
 * StorageProvider — IndexedDB-backed cache for Inventory item/stock snapshots.
 *
 * localStorage is intentionally NOT used for snapshot data (size limits).
 * Only DATA_MODE config is stored in localStorage (see inventoryConfig.js).
 *
 * Stores:
 *   "snapshot_cache"   — InventorySnapshot items keyed by item_id / sku
 *   "snapshot_meta"    — Cache metadata: last_inventory_sync_at, schema_version, etc.
 *   "event_outbox"     — Captured ScanOps events waiting to sync back to Inventory
 *                        (SEPARATE from snapshot_cache — must never be mixed)
 */

const DB_NAME = "scanops_inventory_db";
const DB_VERSION = 1;
const STORES = {
  SNAPSHOT_ITEMS: "snapshot_cache",
  SNAPSHOT_META: "snapshot_meta",
  EVENT_OUTBOX: "event_outbox",
};

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORES.SNAPSHOT_ITEMS)) {
        db.createObjectStore(STORES.SNAPSHOT_ITEMS, { keyPath: "item_id" });
      }
      if (!db.objectStoreNames.contains(STORES.SNAPSHOT_META)) {
        db.createObjectStore(STORES.SNAPSHOT_META, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORES.EVENT_OUTBOX)) {
        db.createObjectStore(STORES.EVENT_OUTBOX, { keyPath: "event_id", autoIncrement: true });
      }
    };
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(storeName, mode = "readonly") {
  return openDB().then((db) => {
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  });
}

function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// --- Snapshot Cache (read-only item/stock data from Inventory) ---

export async function saveSnapshotItems(items) {
  const store = await tx(STORES.SNAPSHOT_ITEMS, "readwrite");
  for (const item of items) {
    store.put(item);
  }
}

export async function getSnapshotItems() {
  const store = await tx(STORES.SNAPSHOT_ITEMS);
  return promisify(store.getAll());
}

export async function getSnapshotItem(itemId) {
  const store = await tx(STORES.SNAPSHOT_ITEMS);
  return promisify(store.get(itemId));
}

export async function clearSnapshotItems() {
  const store = await tx(STORES.SNAPSHOT_ITEMS, "readwrite");
  return promisify(store.clear());
}

// --- Snapshot Metadata ---

export async function saveSnapshotMeta(meta) {
  const store = await tx(STORES.SNAPSHOT_META, "readwrite");
  return promisify(store.put({ key: "current", ...meta }));
}

export async function getSnapshotMeta() {
  const store = await tx(STORES.SNAPSHOT_META);
  return promisify(store.get("current"));
}

// --- Event Outbox (SEPARATE — captured ScanOps actions, NOT inventory cache) ---

export async function addOutboxEvent(event) {
  const store = await tx(STORES.EVENT_OUTBOX, "readwrite");
  return promisify(store.add({ ...event, queued_at: new Date().toISOString() }));
}

export async function getOutboxEvents() {
  const store = await tx(STORES.EVENT_OUTBOX);
  return promisify(store.getAll());
}

export async function removeOutboxEvent(eventId) {
  const store = await tx(STORES.EVENT_OUTBOX, "readwrite");
  return promisify(store.delete(eventId));
}