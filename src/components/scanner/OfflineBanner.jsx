import React, { useEffect, useRef, useState } from "react";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { useOfflineSync } from "../../lib/useOfflineSync";

/**
 * Shows a sticky offline banner when the device loses connectivity.
 * Auto-disappears when back online (after flush). Also shows a brief
 * "synced" confirmation after a successful flush.
 */
export default function OfflineBanner() {
  const { isOnline, queueCount, flushing, lastFlush, manualFlush } = useOfflineSync();

  // Show synced confirmation briefly after flush completes
  const [showSynced, setShowSynced] = React.useState(false);
  const syncedTimer = React.useRef(null);

  React.useEffect(() => {
    if (lastFlush && lastFlush.flushed > 0 && isOnline) {
      setShowSynced(true);
      clearTimeout(syncedTimer.current);
      syncedTimer.current = setTimeout(() => setShowSynced(false), 3500);
    }
    return () => clearTimeout(syncedTimer.current);
  }, [lastFlush, isOnline]);

  // Nothing to show if online and no pending flush to confirm
  if (isOnline && !flushing && !showSynced) return null;

  if (showSynced && isOnline) {
    return (
      <div className="flex items-center gap-2 bg-accent/10 border-b border-accent/20 px-4 py-2">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
        <p className="flex-1 text-xs font-black text-accent">
          Back online — {lastFlush?.flushed} scan record{lastFlush?.flushed !== 1 ? "s" : ""} synced successfully.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-amber-50 border-b border-amber-200 px-4 py-2.5">
      <WifiOff className="h-4 w-4 shrink-0 text-amber-600" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black text-amber-900">
          No internet connection — scanning in offline mode
        </p>
        {queueCount > 0 && (
          <p className="text-[11px] font-semibold text-amber-700 mt-0.5">
            {queueCount} scan record{queueCount !== 1 ? "s" : ""} saved locally, will sync automatically when reconnected.
          </p>
        )}
      </div>
      {queueCount > 0 && isOnline && (
        <button
          type="button"
          onClick={manualFlush}
          disabled={flushing}
          className="shrink-0 flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-black text-white active:opacity-80 disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${flushing ? "animate-spin" : ""}`} />
          {flushing ? "Syncing…" : "Sync now"}
        </button>
      )}
    </div>
  );
}