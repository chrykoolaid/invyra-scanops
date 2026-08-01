import React, { forwardRef } from "react";
import { Barcode, Loader2, Search, X } from "lucide-react";

const MODES = [
  { key: "EXACT", label: "Scan / SKU", icon: Barcode },
  { key: "NAME", label: "Search name", icon: Search },
];

const ItemLookupSearch = forwardRef(function ItemLookupSearch(
  { mode = "EXACT", onModeChange, value, onChange, onSubmit, busy },
  ref,
) {
  const nameMode = mode === "NAME";
  const placeholder = nameMode
    ? "Enter an item name, brand, or pack description"
    : "Scan barcode or enter exact SKU / sell ID";
  const actionLabel = nameMode ? "Search" : "Lookup";

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.();
  };

  return (
    <div className="space-y-2" data-item-lookup-search>
      <div
        className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1"
        role="tablist"
        aria-label="Item lookup mode"
      >
        {MODES.map(({ key, label, icon: Icon }) => {
          const selected = mode === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={busy}
              onClick={() => onModeChange?.(key)}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-black transition-colors disabled:opacity-50 ${
                selected
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground active:bg-secondary"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-2xl border border-input bg-background px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20"
      >
        {nameMode ? (
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <Barcode className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <input
          ref={ref}
          value={value}
          onChange={(event) => onChange(event.target.value.slice(0, 128))}
          placeholder={placeholder}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={nameMode}
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground outline-none"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground active:bg-border"
            aria-label="Clear lookup input"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <button
          type="submit"
          disabled={busy || !value.trim()}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-black text-primary-foreground active:scale-[0.98] disabled:opacity-40"
          aria-label={nameMode ? "Search Inventory by item name" : "Run exact Inventory lookup"}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : nameMode ? <Search className="h-4 w-4" /> : <Barcode className="h-4 w-4" />}
          <span className="hidden sm:inline">{busy ? "Working" : actionLabel}</span>
        </button>
      </form>

      <p className="px-1 text-[11px] font-bold leading-snug text-muted-foreground">
        {nameMode
          ? "Search returns candidates only. Choose an item explicitly to open its Inventory view."
          : "Use this mode for a hardware scan or an exact barcode, SKU, or sell ID."}
      </p>
    </div>
  );
});

export default ItemLookupSearch;
