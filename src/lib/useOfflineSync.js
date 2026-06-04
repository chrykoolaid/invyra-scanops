/**
 * useOfflineSync — React hook that:
 *  1. Tracks real-time online/offline state
 *  2. Auto-flushes the offline record queue when connectivity is restored
 *  3. Exposes queue count and last-sync result for UI
 */
import { useEffect, useState, useCallback } from "react";
import { flushOfflineQueue, getOfflineQueueCount } from "./offlineSyncQueue";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [queueCount, setQueueCount] = useState(() => getOfflineQueueCount());
  const [lastFlush, setLastFlush] = useState(null); // { flushed, remaining, at }
  const [flushing, setFlushing] = useState(false);

  const doFlush = useCallback(async () => {
    if (flushing) return;
    const count = getOfflineQueueCount();
    if (!count) return;
    setFlushing(true);
    const result = await flushOfflineQueue();
    setQueueCount(getOfflineQueueCount());
    setLastFlush({ ...result, at: new Date().toISOString() });
    setFlushing(false);
  }, [flushing]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      // Small delay so the network is actually stable
      setTimeout(doFlush, 1200);
    };
    const onOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [doFlush]);

  // Refresh queue count periodically
  useEffect(() => {
    const id = setInterval(() => {
      setQueueCount(getOfflineQueueCount());
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return { isOnline, queueCount, lastFlush, flushing, manualFlush: doFlush };
}