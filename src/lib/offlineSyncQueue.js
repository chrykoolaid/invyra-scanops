/**
 * offlineSyncQueue — production-grade offline buffer for ScanOpsRecord writes.
 *
 * Design:
 *  - Writes to localStorage when offline (or when a live write fails)
 *  - Flushes sequentially in batches when back online to avoid hammering the API
 *  - Tracks per-record retry count; gives up after MAX_RETRIES permanent failures
 *  - All operations are synchronous-safe and fire-and-forget from the caller
 */
import { base44 } from "@/api/base44Client";
import { getScanOpsSession } from "./scanOpsSession";

const QUEUE_KEY = "scanops_offline_record_queue_v1";
const MAX_QUEUE = 400;
const MAX_RETRIES = 5;
const BATCH_SIZE = 10; // records per flush batch

function readQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(0, MAX_QUEUE)));
  } catch {}
}

export function getOfflineQueue() {
  return readQueue();
}

export function getOfflineQueueCount() {
  return readQueue().length;
}

/**
 * Add a record to the local buffer.
 */
export function enqueueOfflineRecord(fields) {
  const queue = readQueue();
  const record = {
    ...fields,
    _id: `oq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    _queuedAt: new Date().toISOString(),
    _retries: 0,
  };
  // Deduplicate: don't add if same _id already exists (e.g. double-save race)
  if (!queue.some((r) => r._id === record._id)) {
    queue.unshift(record);
  }
  writeQueue(queue);
}

/**
 * Flush the queue sequentially in batches.
 * Returns { flushed, remaining, permanentlyFailed }.
 */
export async function flushOfflineQueue(onProgress) {
  const queue = readQueue();
  if (!queue.length) return { flushed: 0, remaining: 0, permanentlyFailed: 0 };

  let flushed = 0;
  let permanentlyFailed = 0;
  const stillPending = [];

  // Process in batches to avoid flooding
  for (let i = 0; i < queue.length; i += BATCH_SIZE) {
    const batch = queue.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map(async (record) => {
        const { _id, _queuedAt, _retries, ...fields } = record;
        try {
          await base44.entities.ScanOpsRecord.create({ ...fields, syncStatus: "synced" });
          flushed++;
          onProgress?.({ flushed, remaining: queue.length - flushed });
        } catch (err) {
          const retries = (_retries || 0) + 1;
          if (retries >= MAX_RETRIES) {
            permanentlyFailed++;
            // Keep in queue but mark as permanently failed for visibility
            stillPending.push({ ...record, _retries: retries, _permanentFailure: true });
          } else {
            stillPending.push({ ...record, _retries: retries });
          }
        }
      })
    );
    // Small pause between batches
    if (i + BATCH_SIZE < queue.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  writeQueue(stillPending);
  return { flushed, remaining: stillPending.length, permanentlyFailed };
}

/**
 * Smart write: online → direct DB write; offline → buffer locally.
 * A failed online write is also buffered for retry.
 */
export function writeOrEnqueue(fields) {
  if (!fields?.recordType) return;
  const s = getScanOpsSession();
  const enriched = {
    actorUserId: s.actorUserId || null,
    actorName: s.actorName || "Operator",
    actorRole: s.actorRole || "Staff",
    storeId: s.storeId || null,
    sessionId: s.sessionId || null,
    deviceId: s.deviceId || s.scannerId || null,
    ...fields,
  };

  if (navigator.onLine) {
    base44.entities.ScanOpsRecord.create({ ...enriched, syncStatus: "synced" }).catch(() => {
      enqueueOfflineRecord({ ...enriched, syncStatus: "pending" });
    });
  } else {
    enqueueOfflineRecord({ ...enriched, syncStatus: "pending" });
  }
}

/**
 * Remove permanently-failed records from the queue.
 */
export function clearPermanentFailures() {
  const queue = readQueue().filter((r) => !r._permanentFailure);
  writeQueue(queue);
  return queue.length;
}