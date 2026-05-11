import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ScanLine, Search, Wifi, WifiOff, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getNetworkMode, getSyncSummary } from "../../lib/scanOpsSync";
import { useScanOpsSession } from "../../lib/scanOpsSession";
import { getItemEntryPrimaryValue, getItemEntrySecondaryLabel, resolveItemEntry, searchItemEntries } from "../../lib/scanOpsItemEntry";

export default function WorkflowHeader({
  title,
  subtitle,
  scanValue,
  onScanValueChange,
  onScan,
  placeholder = "Search or scan item",
  disabled = false,
  showSearch = true,
}) {
  const navigate = useNavigate();
  const session = useScanOpsSession();
  const { mode, summary } = useMemo(() => ({ mode: getNetworkMode(), summary: getSyncSummary() }), [session]);
  const online = mode !== "offline";
  const waiting = Number(summary?.queued || 0) + Number(summary?.failed || 0) + Number(summary?.conflict || 0);
  const [manualFocused, setManualFocused] = useState(false);
  const [matches, setMatches] = useState([]);
  const [lookupState, setLookupState] = useState("idle");
  const scannerBuffer = useRef("");
  const scannerTimer = useRef(null);
  const debounceTimer = useRef(null);
  const currentValue = scanValue || "";

  const clearResults = useCallback(() => {
    setMatches([]);
    setLookupState("idle");
  }, []);

  const runLookup = useCallback((rawValue, source = "manual") => {
    if (disabled || !showSearch) return;
    const value = String(rawValue || "").trim();
    if (!value) {
      clearResults();
      return;
    }

    const exact = resolveItemEntry(value);
    if (exact) {
      clearResults();
      onScan?.(value);
      return;
    }

    const nextMatches = searchItemEntries(value, 5);
    if (nextMatches.length === 1 && source !== "manualTyping") {
      clearResults();
      onScan?.(getItemEntryPrimaryValue(nextMatches[0]));
      return;
    }

    setMatches(nextMatches);
    setLookupState(nextMatches.length ? "multiple" : "none");
  }, [clearResults, disabled, onScan, showSearch]);

  const submit = (event) => {
    event?.preventDefault?.();
    window.clearTimeout(debounceTimer.current);
    runLookup(currentValue, "submit");
  };

  const updateValue = (next) => {
    onScanValueChange?.(next);
    window.clearTimeout(debounceTimer.current);
    if (!String(next || "").trim()) {
      clearResults();
      return;
    }
    debounceTimer.current = window.setTimeout(() => {
      const nextMatches = searchItemEntries(next, 5);
      setMatches(nextMatches);
      setLookupState(nextMatches.length ? "suggestions" : "none");
    }, 320);
  };

  const selectMatch = (item) => {
    const value = getItemEntryPrimaryValue(item);
    onScanValueChange?.(value);
    clearResults();
    onScan?.(value);
  };

  const clearField = () => {
    onScanValueChange?.("");
    clearResults();
  };

  useEffect(() => {
    if (!showSearch || disabled) return undefined;

    const flushBuffer = () => {
      const value = scannerBuffer.current.trim();
      scannerBuffer.current = "";
      if (!value) return;
      onScanValueChange?.(value);
      runLookup(value, "scanner");
    };

    const onKeyDown = (event) => {
      const target = event.target;
      const typingTarget = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (typingTarget || event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === "Enter") {
        if (scannerBuffer.current) {
          event.preventDefault();
          window.clearTimeout(scannerTimer.current);
          flushBuffer();
        }
        return;
      }

      if (event.key.length === 1) {
        scannerBuffer.current += event.key;
        window.clearTimeout(scannerTimer.current);
        scannerTimer.current = window.setTimeout(flushBuffer, 120);
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.clearTimeout(scannerTimer.current);
    };
  }, [disabled, onScanValueChange, runLookup, showSearch]);

  useEffect(() => () => window.clearTimeout(debounceTimer.current), []);

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

      {showSearch && (
        <>
          <form onSubmit={submit} className="mt-3 flex min-w-0 items-center gap-2 rounded-2xl border border-input bg-background px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={currentValue}
              onChange={(event) => updateValue(event.target.value)}
              onFocus={() => setManualFocused(true)}
              onBlur={() => window.setTimeout(() => setManualFocused(false), 120)}
              placeholder={placeholder}
              disabled={disabled}
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent py-1.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-60"
            />
            {currentValue ? (
              <button
                type="button"
                onClick={clearField}
                disabled={disabled}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground active:bg-border disabled:opacity-40"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={disabled}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground active:bg-border disabled:opacity-40"
                aria-label="Run scan lookup"
              >
                <ScanLine className="h-4 w-4" />
              </button>
            )}
          </form>

          {(manualFocused || matches.length > 0 || lookupState === "none") && lookupState !== "idle" && (
            <div className="mt-2 rounded-2xl border border-border bg-background p-2 shadow-sm">
              {matches.length > 0 ? (
                <div className="space-y-1">
                  <p className="px-2 pb-1 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    {lookupState === "multiple" ? "Multiple matches found" : "Suggestions"}
                  </p>
                  {matches.map((item) => (
                    <button
                      key={item.internalItemId || item.sku || item.barcode || item.name}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectMatch(item)}
                      className="w-full min-w-0 rounded-xl px-2 py-2 text-left active:bg-secondary"
                    >
                      <span className="block truncate text-sm font-black text-foreground">{item.name || item.item_name}</span>
                      <span className="mt-0.5 block truncate text-[11px] font-semibold text-muted-foreground">{getItemEntrySecondaryLabel(item)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-2 py-1.5">
                  <p className="text-sm font-black text-foreground">No matching item found</p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">Check barcode, PLU, SKU, shelf label, or try item name.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </header>
  );
}
