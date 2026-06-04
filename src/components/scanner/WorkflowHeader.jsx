import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Home, ScanLine, Search, Wifi, WifiOff, X, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getNetworkMode, getSyncSummary } from "../../lib/scanOpsSync";
import { useScanOpsSession } from "../../lib/scanOpsSession";
import { getItemEntryMatchLabel, getItemEntryPrimaryValue, getItemEntrySecondaryLabel, resolveItemEntry, searchItemEntries } from "../../lib/scanOpsItemEntry";

export default function WorkflowHeader({
  title,
  subtitle,
  scanValue,
  onScanValueChange,
  onScan,
  placeholder = "Search / scan item, PLU, SKU, barcode...",
  disabled = false,
  showSearch = true,
  showHeaderChrome = true,
  continuousScan = false,
  onContinuousScanChange,
  onNewScanWhileItemActive,
  hasActiveItem = false,
}) {
  const navigate = useNavigate();
  const session = useScanOpsSession();
  const { mode, summary } = useMemo(() => ({ mode: getNetworkMode(), summary: getSyncSummary() }), [session]);
  const online = mode !== "offline";
  const pendingCount = Number(summary?.pending || 0);
  const issueCount = Number(summary?.failed || 0) + Number(summary?.conflict || 0) + Number(summary?.needsReview || 0);
  const syncLabel = !online
    ? `Offline${pendingCount ? ` · ${pendingCount} pending` : ""}`
    : issueCount
      ? `Handoff failed · ${issueCount}`
      : pendingCount
        ? `Pending handoff · ${pendingCount}`
        : "Ready";
  const [manualFocused, setManualFocused] = useState(false);
  const [matches, setMatches] = useState([]);
  const [lookupState, setLookupState] = useState("idle");
  const [showKeyboardFallback, setShowKeyboardFallback] = useState(false);
  const [keyboardCaps, setKeyboardCaps] = useState(false);
  const [keyboardMode, setKeyboardMode] = useState("letters");
  const inputRef = useRef(null);
  const keyboardFallbackTimer = useRef(null);
  const focusViewportHeight = useRef(null);
  const scannerBuffer = useRef("");
  const scannerTimer = useRef(null);
  const debounceTimer = useRef(null);
  const currentValue = scanValue || "";

  const requestNativeKeyboard = useCallback(() => {
    if (disabled || !showSearch) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus({ preventScroll: true });
    try {
      navigator?.virtualKeyboard?.show?.();
    } catch {
      // Native keyboard APIs are best-effort only; desktop browsers often ignore them.
    }
  }, [disabled, showSearch]);

  const scheduleKeyboardFallback = useCallback(() => {
    window.clearTimeout(keyboardFallbackTimer.current);
    setShowKeyboardFallback(false);
    focusViewportHeight.current = window.visualViewport?.height || window.innerHeight;
    keyboardFallbackTimer.current = window.setTimeout(() => {
      const before = focusViewportHeight.current || window.innerHeight;
      const after = window.visualViewport?.height || window.innerHeight;
      const nativeKeyboardLikelyOpen = before - after > 90;
      if (!nativeKeyboardLikelyOpen && document.activeElement === inputRef.current) {
        setShowKeyboardFallback(true);
      }
    }, 450);
  }, []);

  const handleManualFocus = useCallback(() => {
    setManualFocused(true);
    scheduleKeyboardFallback();
    try {
      navigator?.virtualKeyboard?.show?.();
    } catch {
      // Ignore browsers that do not expose the VirtualKeyboard API.
    }
  }, [scheduleKeyboardFallback]);

  const appendKeyboardText = (text) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? currentValue.length;
    const end = input?.selectionEnd ?? currentValue.length;
    const next = `${currentValue.slice(0, start)}${text}${currentValue.slice(end)}`;
    updateValue(next);
    requestAnimationFrame(() => {
      requestNativeKeyboard();
      const caret = start + text.length;
      inputRef.current?.setSelectionRange?.(caret, caret);
    });
  };

  const backspaceKeyboardText = () => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? currentValue.length;
    const end = input?.selectionEnd ?? currentValue.length;
    if (start !== end) {
      const next = `${currentValue.slice(0, start)}${currentValue.slice(end)}`;
      updateValue(next);
      requestAnimationFrame(() => {
        requestNativeKeyboard();
        inputRef.current?.setSelectionRange?.(start, start);
      });
      return;
    }
    if (start <= 0) return;
    const next = `${currentValue.slice(0, start - 1)}${currentValue.slice(start)}`;
    updateValue(next);
    requestAnimationFrame(() => {
      requestNativeKeyboard();
      const caret = start - 1;
      inputRef.current?.setSelectionRange?.(caret, caret);
    });
  };

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

    const nextMatches = searchItemEntries(value, 6);
    const firstMatch = nextMatches[0] || resolveItemEntry(value);
    const matchType = firstMatch?._searchMatch?.matchType;
    const autoLoadTypes = new Set(["barcode_exact", "barcode_alias", "plu_exact", "sku_exact", "supplier_code"]);

    if (firstMatch && nextMatches.length === 1 && source !== "manualTyping" && autoLoadTypes.has(matchType)) {
      clearResults();
      if (continuousScan && hasActiveItem) {
        onNewScanWhileItemActive?.(firstMatch);
      } else {
        onScan?.(firstMatch);
      }
      return;
    }

    setMatches(nextMatches);
    setLookupState(nextMatches.length ? "multiple" : "none");
  }, [clearResults, disabled, onScan, showSearch]);

  const submit = (event) => {
    event?.preventDefault?.();
    window.clearTimeout(debounceTimer.current);
    runLookup(currentValue, "submit");
    setShowKeyboardFallback(false);
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
    onScan?.(item);
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

  useEffect(() => {
    document.documentElement.classList.toggle("scanops-keyboard-open", Boolean(showKeyboardFallback && manualFocused));
    return () => document.documentElement.classList.remove("scanops-keyboard-open");
  }, [showKeyboardFallback, manualFocused]);

  useEffect(() => () => {
    window.clearTimeout(debounceTimer.current);
    window.clearTimeout(keyboardFallbackTimer.current);
    document.documentElement.classList.remove("scanops-keyboard-open");
  }, []);

  return (
    <header className="scanops-workflow-header bg-card border-b border-border px-4 py-3">
      {showHeaderChrome && (
      <div className="flex items-start justify-between gap-3" data-scanops-workflow-chrome>
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground active:bg-border"
            aria-label="Return to Home"
          >
            <Home className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-black leading-tight text-foreground">{title}</h1>
            {subtitle && <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <div className="mt-2 flex shrink-0 items-center gap-1.5">
          {online ? <Wifi className="h-4 w-4 text-accent" /> : <WifiOff className="h-4 w-4 text-destructive" />}
          <span className={`text-[11px] font-bold ${online && !issueCount ? "text-accent" : "text-destructive"}`}>
            {syncLabel}
          </span>
        </div>
      </div>
      )}

      {showSearch && (
        <>
          {onContinuousScanChange && (
            <div className={`${showHeaderChrome ? "mt-3" : ""} mb-2 flex items-center justify-between gap-2`}>
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Scan mode</span>
              <button
                type="button"
                onClick={() => onContinuousScanChange(!continuousScan)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-colors active:scale-[0.98] ${
                  continuousScan ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
                }`}
                aria-pressed={continuousScan}
              >
                <Zap className="h-3 w-3" />
                {continuousScan ? "Continuous" : "Single"}
              </button>
            </div>
          )}
          <form
            onSubmit={submit}
            onPointerDown={(event) => {
              if (event.target.closest("button")) return;
              requestAnimationFrame(requestNativeKeyboard);
            }}
            data-scanops-workflow-search
            className={`${showHeaderChrome ? "mt-3" : ""} flex min-w-0 items-center gap-2 rounded-2xl border border-input bg-background px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20`}
          >
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={currentValue}
              onChange={(event) => updateValue(event.target.value)}
              onFocus={handleManualFocus}
              onClick={requestNativeKeyboard}
              onBlur={() => window.setTimeout(() => {
                setManualFocused(false);
                setShowKeyboardFallback(false);
                window.clearTimeout(keyboardFallbackTimer.current);
              }, 120)}
              placeholder={placeholder}
              disabled={disabled}
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
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

          {(manualFocused || matches.length > 0 || lookupState === "none" || lookupState === "evidence_created") && lookupState !== "idle" && (
            <div className="mt-2 rounded-2xl border border-border bg-background p-2 shadow-sm">
              {matches.length > 0 ? (
                <div className="space-y-2">
                  <p className="px-2 pb-1 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    {lookupState === "multiple" ? "Search results" : "Suggestions"}
                  </p>
                  {matches.map((item) => (
                    <div
                      key={item.internalItemId || item.sku || item.barcode || item.plu || item.name}
                      className="w-full min-w-0 rounded-xl bg-secondary/50 px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <span className="block break-words text-sm font-black text-foreground">{item.name || item.item_name}</span>
                          <span className="mt-0.5 block break-words text-[11px] font-semibold text-muted-foreground">{getItemEntrySecondaryLabel(item)}</span>
                          <span className="mt-1 inline-flex rounded-full bg-card px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-muted-foreground">{getItemEntryMatchLabel(item)}</span>
                        </div>
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectMatch(item)}
                          className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground active:scale-[0.98]"
                        >
                          Select
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : lookupState === "evidence_created" ? (
                <div className="px-2 py-2">
                  <p className="text-sm font-black text-foreground">Unknown item evidence saved</p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">It is queued for Product Identity Review only. No product, stock, price, markdown, transfer, or ticket action was created.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => navigate("/product-identity-review")}
                      className="min-h-10 rounded-xl bg-primary px-3 text-xs font-black text-primary-foreground"
                    >
                      Open Review
                    </button>
                    <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={clearField} className="min-h-10 rounded-xl bg-secondary px-3 text-xs font-black text-secondary-foreground">
                      Clear Search
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-2 py-2">
                  <p className="text-sm font-black text-foreground">{online ? (String(currentValue || "").trim().length < 3 ? "Item not recognised" : "Item not found") : "Offline — item lookup unavailable"}</p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{online ? (String(currentValue || "").trim().length < 3 ? "Scan again or search manually." : "Try another barcode or search manually.") : "Reconnect or try again later. Work already saved locally will stay pending sync."}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => { clearField(); requestAnimationFrame(requestNativeKeyboard); }}
                      className="min-h-10 rounded-xl bg-secondary px-3 text-xs font-black text-secondary-foreground"
                    >
                      Scan Again
                    </button>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => requestAnimationFrame(requestNativeKeyboard)}
                      className="min-h-10 rounded-xl bg-primary px-3 text-xs font-black text-primary-foreground"
                    >
                      Search Manually
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}


          {showKeyboardFallback && manualFocused && (
            <div
              className="scanops-keyboard-fallback fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/98 px-2 pt-1 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur"
              aria-label="On-screen search keyboard"
              onMouseDown={(event) => event.preventDefault()}
            >
              <div className="mx-auto w-full max-w-[480px] pb-[max(0.25rem,env(safe-area-inset-bottom))]">
                <div className="mb-0.5 flex h-4 items-center justify-between gap-2 px-1">
                  <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Manual search</p>
                  <button
                    type="button"
                    className="rounded-full bg-secondary px-2 py-0 text-[9px] font-black leading-4 text-muted-foreground active:bg-border"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      setShowKeyboardFallback(false);
                      requestAnimationFrame(() => inputRef.current?.blur?.());
                    }}
                  >
                    Hide
                  </button>
                </div>

                {keyboardMode === "letters" ? (
                  <>
                    {[
                      ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
                      ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
                    ].map((row, rowIndex) => (
                      <div key={rowIndex} className="mb-1 flex justify-center gap-1">
                        {row.map((key) => {
                          const visibleKey = keyboardCaps ? key.toUpperCase() : key;
                          return (
                            <button
                              key={key}
                              type="button"
                              className="scanops-kbd-key flex min-w-0 flex-1 items-center justify-center rounded-md bg-secondary px-0.5 text-[11px] font-black text-foreground active:bg-border"
                              onPointerDown={(event) => {
                                event.preventDefault();
                                appendKeyboardText(visibleKey);
                              }}
                            >
                              {visibleKey}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                    <div className="mb-1 grid grid-cols-[1.1fr_repeat(7,1fr)_1.35fr] gap-1">
                      <button
                        type="button"
                        aria-pressed={keyboardCaps}
                        className={`scanops-kbd-key rounded-md px-0.5 text-[10px] font-black active:bg-border ${keyboardCaps ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          setKeyboardCaps((value) => !value);
                        }}
                      >
                        {keyboardCaps ? "ABC" : "abc"}
                      </button>
                      {["z", "x", "c", "v", "b", "n", "m"].map((key) => {
                        const visibleKey = keyboardCaps ? key.toUpperCase() : key;
                        return (
                          <button
                            key={key}
                            type="button"
                            className="scanops-kbd-key rounded-md bg-secondary px-0.5 text-[11px] font-black text-foreground active:bg-border"
                            onPointerDown={(event) => {
                              event.preventDefault();
                              appendKeyboardText(visibleKey);
                            }}
                          >
                            {visibleKey}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        className="scanops-kbd-key rounded-md bg-secondary px-0.5 text-[10px] font-black text-foreground active:bg-border"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          backspaceKeyboardText();
                        }}
                      >
                        Del
                      </button>
                    </div>
                    <div className="grid grid-cols-[0.9fr_0.7fr_2.2fr_1.15fr] gap-1">
                      <button
                        type="button"
                        className="scanops-kbd-action rounded-md bg-secondary px-1 text-[10px] font-black text-foreground active:bg-border"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          setKeyboardMode("numbers");
                        }}
                      >
                        123
                      </button>
                      <button
                        type="button"
                        className="scanops-kbd-action rounded-md bg-secondary px-1 text-[11px] font-black text-foreground active:bg-border"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          appendKeyboardText("-");
                        }}
                      >
                        -
                      </button>
                      <button
                        type="button"
                        className="scanops-kbd-action rounded-md bg-secondary px-1 text-[10px] font-black text-foreground active:bg-border"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          appendKeyboardText(" ");
                        }}
                      >
                        Space
                      </button>
                      <button
                        type="button"
                        className="scanops-kbd-action rounded-md bg-primary px-1 text-[10px] font-black text-primary-foreground active:opacity-90"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          submit(event);
                        }}
                      >
                        Search
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {[
                      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
                      ["-", "/", ".", "#", "A", "B", "C", "D", "E", "F"],
                      ["G", "H", "I", "J", "K", "L", "M", "N", "O", "P"],
                    ].map((row, rowIndex) => (
                      <div key={rowIndex} className="mb-1 flex justify-center gap-1">
                        {row.map((key) => (
                          <button
                            key={key}
                            type="button"
                            className="scanops-kbd-key flex min-w-0 flex-1 items-center justify-center rounded-md bg-secondary px-0.5 text-[11px] font-black text-foreground active:bg-border"
                            onPointerDown={(event) => {
                              event.preventDefault();
                              appendKeyboardText(key);
                            }}
                          >
                            {key}
                          </button>
                        ))}
                      </div>
                    ))}
                    <div className="grid grid-cols-[0.9fr_2.3fr_1fr_1.15fr] gap-1">
                      <button
                        type="button"
                        className="scanops-kbd-action rounded-md bg-secondary px-1 text-[10px] font-black text-foreground active:bg-border"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          setKeyboardMode("letters");
                        }}
                      >
                        ABC
                      </button>
                      <button
                        type="button"
                        className="scanops-kbd-action rounded-md bg-secondary px-1 text-[10px] font-black text-foreground active:bg-border"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          appendKeyboardText(" ");
                        }}
                      >
                        Space
                      </button>
                      <button
                        type="button"
                        className="scanops-kbd-action rounded-md bg-secondary px-1 text-[10px] font-black text-foreground active:bg-border"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          backspaceKeyboardText();
                        }}
                      >
                        Del
                      </button>
                      <button
                        type="button"
                        className="scanops-kbd-action rounded-md bg-primary px-1 text-[10px] font-black text-primary-foreground active:opacity-90"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          submit(event);
                        }}
                      >
                        Search
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </header>
  );
}