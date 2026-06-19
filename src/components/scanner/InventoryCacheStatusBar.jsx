/**
 * InventoryCacheStatusBar
 * 
 * Shows inventory cache sync status on price-sensitive workflow screens.
 * - Standard mode: soft amber warning when stale.
 * - Price-sensitive mode (isStrict=true): red hard warning, blocks actions.
 */
import React from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, WifiOff } from "lucide-react";

function formatSyncTime(isoString) {
  if (!isoString) return "Never synced";
  try {
    const d = new Date(isoString);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch { return isoString; }
}

export default function InventoryCacheStatusBar({ cacheStatus, onRefresh, isStrict = false }) {
  if (!cacheStatus) return null;

  const { isStale, lastSyncedAt, itemCount, mode, isBridgeMode, refreshing, refreshError } = cacheStatus;

  // Mock mode: show a quiet dev-only pill, no blocking
  if (mode === "mock" || !isBridgeMode) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
        <p className="text-[11px] font-black text-amber-800">DEV / DEMO — Mock inventory data. Not real stock.</p>
      </div>
    );
  }

  if (!isStale && lastSyncedAt) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background/70 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-accent" />
          <p className="text-[11px] font-bold text-muted-foreground truncate">
            Inventory cache · {itemCount} items · Synced {formatSyncTime(lastSyncedAt)}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="shrink-0 rounded-lg bg-secondary px-2 py-1 text-[10px] font-black text-muted-foreground active:bg-border disabled:opacity-40"
        >
          {refreshing ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Refresh"}
        </button>
      </div>
    );
  }

  // Stale cache
  const tone = isStrict
    ? "border-destructive/30 bg-destructive/10 text-destructive"
    : "border-amber-200 bg-amber-50 text-amber-800";
  const Icon = isStrict ? WifiOff : AlertTriangle;

  return (
    <div className={`rounded-xl border px-3 py-2 space-y-2 ${tone}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-black leading-tight">
              {isStrict ? "Inventory cache stale — submit blocked" : "Inventory cache may be stale"}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold">
              Last sync: {formatSyncTime(lastSyncedAt)} · {itemCount} items cached
              {isStrict ? " · Refresh required before submit/print." : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="shrink-0 rounded-lg bg-white/60 px-2 py-1 text-[10px] font-black active:bg-white/80 disabled:opacity-40"
        >
          {refreshing ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Refresh"}
        </button>
      </div>
      {refreshError && (
        <p className="text-[10px] font-black text-destructive">{refreshError}</p>
      )}
    </div>
  );
}