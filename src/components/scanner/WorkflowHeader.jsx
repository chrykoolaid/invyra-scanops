import React, { useMemo } from "react";
import { ChevronLeft, Search, Wifi, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getNetworkMode, getSyncSummary } from "../../lib/scanOpsSync";
import { useScanOpsSession } from "../../lib/scanOpsSession";

export default function WorkflowHeader({
  title,
  subtitle,
  scanValue,
  onScanValueChange,
  onScan,
  placeholder = "Search or scan item, PLU, SKU, barcode, shelf label",
  disabled = false,
}) {
  const navigate = useNavigate();
  const session = useScanOpsSession();
  const { mode, summary } = useMemo(() => ({ mode: getNetworkMode(), summary: getSyncSummary() }), [session]);
  const online = mode !== "offline";
  const waiting = Number(summary?.queued || 0) + Number(summary?.failed || 0) + Number(summary?.conflict || 0);

  const submit = (event) => {
    event?.preventDefault?.();
    if (disabled) return;
    onScan?.(scanValue);
  };

  return (
    <header className="scanops-workflow-header bg-card border-b border-border px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground active:bg-border"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-black leading-tight text-foreground">{title}</h1>
            {subtitle && <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <div className="mt-2 flex shrink-0 items-center gap-1.5">
          {online ? <Wifi className="h-4 w-4 text-accent" /> : <WifiOff className="h-4 w-4 text-destructive" />}
          <span className={`text-[11px] font-bold ${online ? "text-accent" : "text-destructive"}`}>
            {online ? (waiting ? `${waiting} queued` : "Synced") : "Offline"}
          </span>
        </div>
      </div>

      <form onSubmit={submit} className="mt-3 flex min-w-0 items-center gap-2 rounded-2xl border border-input bg-background p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/20">
        <Search className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={scanValue || ""}
          onChange={(event) => onScanValueChange?.(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="min-w-0 flex-1 bg-transparent py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={disabled}
          className="min-h-10 shrink-0 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground active:scale-[0.98] disabled:opacity-40"
        >
          Scan
        </button>
      </form>
    </header>
  );
}
