/**
 * StorageProvider — IndexedDB-backed cache for Inventory item/stock snapshots.
 *
 * localStorage is intentionally NOT used for snapshot data (size limits).
 * Only DATA_MODE config is stored in localStorage (see inventoryConfig.js).
 *
 * Stores (DB_VERSION 1):
 *   "snapshot_cache"   — InventorySnapshot items keyed by item_id / sku
 *   "snapshot_meta"    — Cache metadata: last_inventory_sync_at, schema_version, etc.
 *   "event_outbox"     — Captured ScanOps events waiting to sync back to Inventory
 *
 * Stores (DB_VERSION 2 — Phase 1A):
 *   "sync_history"     — Retained copies of terminal outbox events (ACK/REJECT/etc.)
 *                        No event is silently deleted. All ACKED, DUPLICATE_ACKED,
 *                        REJECTED, FAILED_TERMINAL, and QUARANTINED records are kept.
 *
 * IMMUTABILITY CONTRACT (event_outbox):
 *   Only the following fields may be updated after an event is queued:
 *     sync_status, sync_attempt_count, last_sync_attempt_at,
 *     receipt_id, receipt_status, last_error_code, last_error_message,
 *     last_sync_meta_updated_at
 *
 *   These fields must NEVER be overwritten via updateOutboxEventSyncMeta():
 *     event_id, event_type, event_version, payload, payload_hash,
 *     captured_at, inventory_snapshot_ref, inventory_snapshot_hash,
 *     inventory_record_version
 */

const DB_NAME = "scanops_inventory_db";
const DB_VERSION = 2; // Phase 1A: adds sync_history store
const STORES = {
  SNAPSHOT_ITEMS: "snapshot_cache",
  SNAPSHOT_META: "snapshot_meta",
  EVENT_OUTBOX: "event_outbox",
  SYNC_HISTORY: "sync_history",   // Phase 1A — retained terminal outbox events
};

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      // ── v1 stores (idempotent) ──────────────────────────────────────────
      if (!db.objectStoreNames.contains(STORES.SNAPSHOT_ITEMS)) {
        db.createObjectStore(STORES.SNAPSHOT_ITEMS, { keyPath: "item_id" });
      }
      if (!db.objectStoreNames.contains(STORES.SNAPSHOT_META)) {
        db.createObjectStore(STORES.SNAPSHOT_META, { keyPath: "key" });
      }

      // event_outbox: v1 used autoIncrement; v2 uses event_id string keyPath.
      // If upgrading from v1, recreate the store with the correct keyPath so
      // bridge event_id strings are usable as keys.
      if (db.objectStoreNames.contains(STORES.EVENT_OUTBOX)) {
        // Only recreate if the old store used autoIncrement (keyPath was numeric).
        // We detect this by checking oldVersion.
        if (e.oldVersion < 2) {
          db.deleteObjectStore(STORES.EVENT_OUTBOX);
        }
      }
      if (!db.objectStoreNames.contains(STORES.EVENT_OUTBOX)) {
        const outboxStore = db.createObjectStore(STORES.EVENT_OUTBOX, { keyPath: "event_id" });
        outboxStore.createIndex("by_sync_status", "sync_status", { unique: false });
        outboxStore.createIndex("by_event_type", "event_type", { unique: false });
        outboxStore.createIndex("by_queued_at", "queued_at", { unique: false });
      }

      // ── v2 stores ───────────────────────────────────────────────────────
      if (!db.objectStoreNames.contains(STORES.SYNC_HISTORY)) {
        const histStore = db.createObjectStore(STORES.SYNC_HISTORY, { keyPath: "event_id" });
        histStore.createIndex("by_final_status", "final_status", { unique: false });
        histStore.createIndex("by_archived_at", "archived_at", { unique: false });
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

// ── Snapshot Cache (read-only item/stock data from Inventory) ─────────────────

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

// ── Snapshot Metadata ─────────────────────────────────────────────────────────

export async function saveSnapshotMeta(meta) {
  const store = await tx(STORES.SNAPSHOT_META, "readwrite");
  return promisify(store.put({ key: "current", ...meta }));
}

export async function getSnapshotMeta() {
  const store = await tx(STORES.SNAPSHOT_META);
  return promisify(store.get("current"));
}

// ── Event Outbox (SEPARATE — captured ScanOps bridge events) ─────────────────
// IMMUTABILITY: event_id is the keyPath; original payload/evidence must never
// be overwritten. Only sync metadata fields may be updated via
// updateOutboxEventSyncMeta().

/**
 * Add a new outbox event.
 * event.event_id must be a non-empty string (bridge contract requirement).
 * @param {object} event — must include event_id, event_type, event_version, payload, payload_hash, captured_at
 * @returns {Promise}
 */
export async function addOutboxEvent(event) {
  if (!event?.event_id) {
    throw new Error("addOutboxEvent: event_id is required.");
  }
  const store = await tx(STORES.EVENT_OUTBOX, "readwrite");
  const record = {
    ...event,
    queued_at: event.queued_at || new Date().toISOString(),
    sync_status: event.sync_status || "QUEUED",
    sync_attempt_count: event.sync_attempt_count ?? 0,
    last_sync_attempt_at: event.last_sync_attempt_at ?? null,
    receipt_id: event.receipt_id ?? null,
    receipt_status: event.receipt_status ?? null,
    last_error_code: event.last_error_code ?? null,
    last_error_message: event.last_error_message ?? null,
    last_sync_meta_updated_at: event.last_sync_meta_updated_at ?? null,
  };
  return promisify(store.put(record));
}

export async function getOutboxEvents() {
  const store = await tx(STORES.EVENT_OUTBOX);
  return promisify(store.getAll());
}

export async function getOutboxEvent(eventId) {
  const store = await tx(STORES.EVENT_OUTBOX);
  return promisify(store.get(eventId));
}

/**
 * Update ONLY sync metadata fields of an existing outbox event.
 * Enforces immutability: original payload, evidence, and identity fields are preserved.
 *
 * Allowed fields: sync_status, sync_attempt_count, last_sync_attempt_at,
 *                 receipt_id, receipt_status, last_error_code, last_error_message
 *
 * @param {string} eventId
 * @param {object} metaPatch — from buildOutboxSyncMetaPatch() in scanopsSyncStatus.js
 */
export async function updateOutboxEventSyncMeta(eventId, metaPatch) {
  const store = await tx(STORES.EVENT_OUTBOX, "readwrite");
  const existing = await promisify(store.get(eventId));
  if (!existing) return null;

  // Enforce immutability — strip any attempt to overwrite protected fields
  const IMMUTABLE_FIELDS = [
    "event_id", "event_type", "event_version", "source_system",
    "payload", "payload_hash", "captured_at",
    "inventory_snapshot_id", "inventory_snapshot_ref",
    "inventory_snapshot_hash", "inventory_record_version",
  ];
  const safePatch = { ...metaPatch };
  for (const field of IMMUTABLE_FIELDS) {
    delete safePatch[field];
  }

  const updated = { ...existing, ...safePatch };
  return promisify(store.put(updated));
}

/**
 * @deprecated Use updateOutboxEventSyncMeta for sync metadata updates.
 * Retained for compatibility with legacy callers that delete by event_id.
 * In Bridge v1, events are never deleted — they are moved to sync_history.
 */
export async function removeOutboxEvent(eventId) {
  const store = await tx(STORES.EVENT_OUTBOX, "readwrite");
  return promisify(store.delete(eventId));
}

// ── Sync History (Phase 1A) ───────────────────────────────────────────────────
// Terminal outbox events are archived here rather than deleted.
// Retained statuses: ACKED, DUPLICATE_ACKED, REJECTED, FAILED_TERMINAL, QUARANTINED.
// No event is silently deleted.

/**
 * Archive a terminal outbox event to sync_history for audit retention.
 * The original event record is preserved; a final_status and archived_at stamp are added.
 *
 * @param {string} eventId
 * @param {string} finalStatus — one of OUTBOX_SYNC_STATUS terminal values
 */
export async function archiveOutboxEventToHistory(eventId, finalStatus) {
  const outboxStore = await tx(STORES.EVENT_OUTBOX, "readwrite");
  const event = await promisify(outboxStore.get(eventId));
  if (!event) return null;

  const histStore = await tx(STORES.SYNC_HISTORY, "readwrite");
  const archived = {
    ...event,
    final_status: finalStatus || event.sync_status || "UNKNOWN",
    archived_at: new Date().toISOString(),
  };
  await promisify(histStore.put(archived));

  // Remove from live outbox after successful archive
  await promisify(outboxStore.delete(eventId));
  return archived;
}

export async function getSyncHistory() {
  const store = await tx(STORES.SYNC_HISTORY);
  return promisify(store.getAll());
}

export async function getSyncHistoryEvent(eventId) {
  const store = await tx(STORES.SYNC_HISTORY);
  return promisify(store.get(eventId));
}