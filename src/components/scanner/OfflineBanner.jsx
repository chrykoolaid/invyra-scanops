import React, { useEffect, useRef, useState } from "react";
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { useOfflineSync } from "../../lib/useOfflineSync";

function OfflineActionGuide({ queueCount }) {
  return (
    <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
      <div className="rounded-xl bg-white/55 px-2.5 py-2">
        <p className="text-[10px] font-black uppercase tracking-wide text-amber-900/70">1 · Keep Working</p>
        <p className="mt-0.5 text-[11px] font-bold leading-snug text-amber-950">Scans are saved locally.</p>
      </div>
      <div className="rounded-xl bg-white/55 px-2.5 py-2">
        <p className="text-[10px] font-black uppercase tracking-wide text-amber-900/70">2 · Queue Safe</p>
        <p className="mt-0.5 text-[11px] font-bold leading-snug text-amber-950">{queueCount} item{queueCount === 1 ? "" : "s"} waiting.</p>
      </div>
      <div className="rounded-xl bg-white/55 px-2.5 py-2">
        <p className="text-[10px] font-black uppercase tracking-wide text-amber-900/70">3 · Auto Sync</p>
        <p className="mt-0.5 text-[11px] font-bold leading-snug text-amber-950">Sync resumes when online.</p>
      </div>
    </div>
  );
}

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

  if (isOnline && !flushing && !showSynced && queueCount === 0) return null;

  if (isOnline && flushing) {
    return (
      <div className="border-b border-primary/20 bg-primary/5 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-primary" />
          <p className="flex-1 text-xs font-black text-primary">
            Syncing {queueCount} offline scan record{queueCount !== 1 ? "s" : ""} to the database…
          </p>
        </div>
        <p className="mt-1 pl-6 text-[11px] font-semibold text-primary/80">Keep working. ScanOps will finish the handoff in the background.</p>
      </div>
    );
  }

  if (showSynced && isOnline) {
    return (
      <div className="border-b border-accent/20 bg-accent/10 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
          <p className="flex-1 text-xs font-black text-accent">
            Back online — {lastFlush?.flushed} scan record{lastFlush?.flushed !== 1 ? "s" : ""} synced successfully.
            {lastFlush?.permanentlyFailed > 0 && <span className="ml-1 text-destructive"> {lastFlush.permanentlyFailed} failed.</span>}
          </p>
        </div>
      </div>
    );
  }

  if (isOnline && queueCount > 0) {
    return (
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-amber-900">{queueCount} scan record{queueCount !== 1 ? "s" : ""} waiting to sync</p>
            <p className="mt-0.5 text-[11px] font-semibold text-amber-700">Connection is available. Retry when ready.</p>
          </div>
          <button type="button" onClick={manualFlush} className="shrink-0 flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-black text-white active:opacity-80">
            <RefreshCw className="h-3 w-3" />
            Sync now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-black text-amber-950">Offline Mode</p>
              <p className="mt-0.5 text-xs font-bold leading-snug text-amber-800">Everything you scan is saved locally. Nothing is lost.</p>
            </div>
            <span className="shrink-0 rounded-full bg-white/60 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-900">
              {queueCount} Pending
            </span>
          </div>
          <OfflineActionGuide queueCount={queueCount} />
          <div className="mt-2 flex items-start gap-2 rounded-xl bg-white/55 px-2.5 py-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <p className="text-[11px] font-bold leading-snug text-amber-950">No action required. ScanOps will sync automatically when the device reconnects to the network.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
