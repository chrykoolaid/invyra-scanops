import React from "react";
import { ChevronLeft, ChevronRight, Eye, PackageSearch } from "lucide-react";
import { describeItem, hasValue } from "./itemLookupHelpers";

function LifecycleChip({ status }) {
  const normalized = String(status || "UNKNOWN").toUpperCase();
  const active = normalized === "ACTIVE";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${active ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
      {normalized}
    </span>
  );
}

export default function ItemSearchResults({ searchResult, onSelect, onPage, viewing }) {
  if (!searchResult) return null;
  if (!searchResult.ok) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-red-300">
        <p className="text-sm font-black">Search needs attention</p>
        <p className="mt-1 text-xs font-bold opacity-85">{searchResult.message || "The Inventory search could not be completed."}</p>
      </div>
    );
  }

  const result = searchResult.result;
  const candidates = Array.isArray(result?.results) ? result.results : [];

  if (searchResult.status === "NO_RESULTS") {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-4 text-amber-300">
        <div className="flex items-start gap-2">
          <PackageSearch className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-black">No matching items</p>
            <p className="mt-1 text-xs font-bold opacity-85">Try a clearer product name, brand, or pack description.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-xs font-black text-muted-foreground">
          {result?.matchCount ?? candidates.length} matches · Page {result?.page || 1} of {result?.totalPages || 1}
        </p>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-primary">No auto-select</span>
      </div>
      {candidates.map((candidate) => (
        <button
          key={candidate.canonicalItemId}
          type="button"
          onClick={() => onSelect(candidate.canonicalItemId)}
          disabled={viewing}
          className="block w-full rounded-2xl border border-border bg-card p-3 text-left active:scale-[0.99] disabled:opacity-50"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-black leading-tight text-foreground">{candidate.itemName}</p>
              <p className="mt-1 text-[11px] font-bold text-muted-foreground">{describeItem(candidate) || "Inventory item"}</p>
            </div>
            <LifecycleChip status={candidate.lifecycleStatus} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {hasValue(candidate.sku) && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">SKU: {candidate.sku}</span>}
            {hasValue(candidate.primaryBarcode) && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">Barcode: {candidate.primaryBarcode}</span>}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-black text-primary">
            <Eye className="h-3.5 w-3.5" /> View this item
          </div>
        </button>
      ))}
      {(result?.hasPrevious || result?.hasNext) && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!result?.hasPrevious || viewing}
            onClick={() => onPage((result?.page || 1) - 1)}
            className="min-h-10 rounded-2xl border border-border bg-card px-3 text-xs font-black text-foreground active:bg-secondary disabled:opacity-40"
          >
            <ChevronLeft className="mr-1 inline h-4 w-4" /> Previous
          </button>
          <button
            type="button"
            disabled={!result?.hasNext || viewing}
            onClick={() => onPage((result?.page || 1) + 1)}
            className="min-h-10 rounded-2xl border border-border bg-card px-3 text-xs font-black text-foreground active:bg-secondary disabled:opacity-40"
          >
            Next <ChevronRight className="ml-1 inline h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
