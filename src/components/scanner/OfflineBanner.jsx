import React, { useEffect, useRef, useState } from "react";
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { useOfflineSync } from "../../lib/useOfflineSync";

export default function OfflineBanner() {
  const { isOnline, queueCount, flushing, lastFlush, manualFlush } = useOfflineSync();
  const [showSynced, setShowSynced] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (lastFlush?.flushed > 0 && isOnline) {
      setShowSynced(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setShowSynced(false), 4000);
    }
    return () => clearTimeout(timer.current);
  }, [lastFlush, isOnline]);

  // Online, nothing to show
  if (isOnline && !flushing && !showSynced && queueCount === 0) return null;

  // Back online — flushing in progress
  if (isOnline && flushing) {
    return (
      <div className="flex items-center gap-2 border-b border-primary/20 bg-primary/5 px-4 py-2">
        <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-primary" />
        <p className="flex-1 text-xs font-black text-primary">
          Syncing {queueCount} offline scan record{queueCount !== 1 ? "s" : ""} to the database…
        </p>
      </div>
    );
  }

  // Sync just completed
  if (showSynced && isOnline) {
    return (
      <div className="flex items-center gap-2 border-b border-accent/20 bg-accent/10 px-4 py-2">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
        <p className="flex-1 text-xs font-black text-accent">
          Back online — {lastFlush?.flushed} scan record{lastFlush?.flushed !== 1 ? "s" : ""} synced successfully.
          {lastFlush?.permanentlyFailed > 0 && (
            <span className="ml-1 text-destructive"> {lastFlush.permanentlyFailed} failed.</span>
          )}
        </p>
      </div>
    );
  }

  // Online but still has queued items (e.g. partial failure)
  if (isOnline && queueCount > 0) {
    return (
      <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
        <p className="flex-1 text-xs font-black text-amber-900">
          {queueCount} scan record{queueCount !== 1 ? "s" : ""} waiting to sync
        </p>
        <button
          type="button"
          onClick={manualFlush}
          className="shrink-0 flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-black text-white active:opacity-80"
        >
          <RefreshCw className="h-3 w-3" />
          Sync now
        </button>
      </div>
    );
  }

  // Offline
  return (
    <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5">
      <WifiOff className="h-4 w-4 shrink-0 text-amber-600" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black text-amber-900">
          Offline — scanning in dead zone mode
        </p>
        {queueCount > 0 && (
          <p className="mt-0.5 text-[11px] font-semibold text-amber-700">
            {queueCount} scan record{queueCount !== 1 ? "s" : ""} queued locally — will auto-sync when reconnected.
          </p>
        )}
        {queueCount === 0 && (
          <p className="mt-0.5 text-[11px] font-semibold text-amber-700">
            Keep scanning — all records are saved locally until you reconnect.
          </p>
        )}
      </div>
    </div>
  );
}