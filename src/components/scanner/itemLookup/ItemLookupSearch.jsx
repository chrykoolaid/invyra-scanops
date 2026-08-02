import React, { forwardRef } from "react";
import { Barcode, Loader2, Search, X } from "lucide-react";
import { detectLookupType } from "./itemLookupHelpers";

const ItemLookupSearch = forwardRef(function ItemLookupSearch(
  { value, onChange, onSubmit, busy },
  ref,
) {
  const nameInput = detectLookupType(value) === "NAME";

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.();
  };

  return (
    <div className="space-y-2" data-item-lookup-search data-unified-item-lookup>
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-2xl border border-input bg-background px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20"
      >
        <span className="relative flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground" aria-hidden="true">
          <Search className="h-4 w-4" />
          <Barcode className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-sm bg-background" />
        </span>
        <input
          ref={ref}
          value={value}
          onChange={(event) => onChange(event.target.value.slice(0, 128))}
          placeholder="Scan barcode or enter SKU, sell ID, or item name"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={nameInput}
          enterKeyHint="search"
          aria-label="Scan barcode or search Inventory by SKU, sell ID, or item name"
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
          aria-label="Find item in Inventory"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <span className="hidden sm:inline">{busy ? "Working" : "Find item"}</span>
        </button>
      </form>

      <p className="px-1 text-[11px] font-bold leading-snug text-muted-foreground">
        Type one or more letters to get a candidate list, such as “b”, “ble”, or “det”. Scans and exact IDs still use the same field, and no result opens automatically.
      </p>
    </div>
  );
});

export default ItemLookupSearch;
