/**
 * offlineSyncQueue — buffers ScanOpsRecord writes when offline,
 * flushes them to the DB when the connection is restored.
 * All operations are localStorage-backed and fire-and-forget.
 */
import { base44 } from "@/api/base44Client";
import { getScanOpsSession } from "./scanOpsSession";

const QUEUE_KEY = "scanops_offline_record_queue_v1";
const MAX_QUEUE = 400;

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

export function getOfflineQueueCount() {
  return readQueue().length;
}

/**
 * Enqueue a ScanOpsRecord for later sync.
 */
export function enqueueOfflineRecord(fields) {
  const queue = readQueue();
  queue.unshift({ ...fields, _queuedAt: new Date().toISOString(), _id: `oq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` });
  writeQueue(queue);
}

/**
 * Attempt to flush all queued records to the DB.
 * Returns { flushed, remaining }.
 */
export async function flushOfflineQueue() {
  const queue = readQueue();
  if (!queue.length) return { flushed: 0, remaining: 0 };

  const results = await Promise.allSettled(
    queue.map(({ _queuedAt, _id, ...fields }) =>
      base44.entities.ScanOpsRecord.create({ syncStatus: "synced", ...fields })
    )
  );

  const failed = queue.filter((_, i) => results[i].status === "rejected");
  writeQueue(failed);
  return { flushed: queue.length - failed.length, remaining: failed.length };
}

/**
 * Smart write: if online, write directly to DB; if offline, enqueue locally.
 */
export function writeOrEnqueue(fields) {
  if (!fields?.recordType) return;
  const s = getScanOpsSession();
  const enriched = {
    syncStatus: "pending",
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
      // If the live write fails (e.g. server error), buffer it
      enqueueOfflineRecord(enriched);
    });
  } else {
    enqueueOfflineRecord(enriched);
  }
}