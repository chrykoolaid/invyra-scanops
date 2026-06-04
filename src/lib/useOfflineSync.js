/**
 * useOfflineSync — React hook for offline/online state + auto-flush.
 *
 * Fixes stale-closure bug by using a ref for the flush function so that
 * the window event listener always calls the latest version.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { flushOfflineQueue, getOfflineQueueCount } from "./offlineSyncQueue";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [queueCount, setQueueCount] = useState(() => getOfflineQueueCount());
  const [lastFlush, setLastFlush] = useState(null);
  const [flushing, setFlushing] = useState(false);
  const flushingRef = useRef(false);

  const doFlush = useCallback(async () => {
    if (flushingRef.current) return;
    if (getOfflineQueueCount() === 0) return;
    flushingRef.current = true;
    setFlushing(true);
    try {
      const result = await flushOfflineQueue((progress) => {
        setQueueCount(getOfflineQueueCount());
      });
      setLastFlush({ ...result, at: new Date().toISOString() });
    } finally {
      setQueueCount(getOfflineQueueCount());
      flushingRef.current = false;
      setFlushing(false);
    }
  }, []);

  // Stable ref so event listeners always call the latest doFlush
  const doFlushRef = useRef(doFlush);
  useEffect(() => { doFlushRef.current = doFlush; }, [doFlush]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      // Delay slightly to let the connection stabilise
      setTimeout(() => doFlushRef.current(), 1500);
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Also flush on mount in case the app was opened while offline then came back online
  useEffect(() => {
    if (navigator.onLine && getOfflineQueueCount() > 0) {
      setTimeout(() => doFlushRef.current(), 2000);
    }
  }, []);

  // Poll queue count every 4s so the badge stays accurate
  useEffect(() => {
    const id = setInterval(() => setQueueCount(getOfflineQueueCount()), 4000);
    return () => clearInterval(id);
  }, []);

  return { isOnline, queueCount, lastFlush, flushing, manualFlush: doFlush };
}