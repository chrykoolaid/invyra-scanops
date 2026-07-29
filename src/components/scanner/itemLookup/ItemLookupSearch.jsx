import React, { forwardRef } from "react";
import { Loader2, ScanLine, Search, X } from "lucide-react";

const ItemLookupSearch = forwardRef(function ItemLookupSearch(
  { value, onChange, onSubmit, busy, placeholder = "Scan barcode or search item name, SKU…" },
  ref,
) {
  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-2xl border border-input bg-background px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20"
    >
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input
        ref={ref}
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, 128))}
        placeholder={placeholder}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        className="min-w-0 flex-1 bg-transparent py-1.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground outline-none"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground active:bg-border"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
      <button
        type="submit"
        disabled={busy || !value.trim()}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-black text-primary-foreground active:scale-[0.98] disabled:opacity-40"
        aria-label="Run lookup"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
        <span className="hidden sm:inline">{busy ? "Searching" : "Scan"}</span>
      </button>
    </form>
  );
});

export default ItemLookupSearch;