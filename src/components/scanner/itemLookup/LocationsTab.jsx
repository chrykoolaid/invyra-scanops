import React, { useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { hasValue, valueOf } from "./itemLookupHelpers";

function LocationCard({ name, quantity, unit, highlighted }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-3 ${highlighted ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
          <MapPin className="h-4 w-4" />
        </span>
        <span className="text-sm font-black text-foreground">{name}</span>
      </div>
      <span className={`text-sm font-black ${hasValue(quantity) ? "text-foreground" : "text-muted-foreground"}`}>
        {hasValue(quantity) ? `${quantity} ${unit}`.trim() : "—"}
      </span>
    </div>
  );
}

export default function LocationsTab({ item }) {
  const [query, setQuery] = useState("");
  if (!item) return null;
  const unit = valueOf(item, ["unitOfMeasure", "unit_of_measure", "uom"], "");
  const primaryLocation = valueOf(item, ["primaryLocation", "primary_location"], null);
  const locations = hasValue(primaryLocation)
    ? [{ name: primaryLocation, quantity: valueOf(item, ["authoritativeQuantity", "authoritative_quantity"], null), highlighted: true }]
    : [];
  const filtered = query.trim()
    ? locations.filter((loc) => String(loc.name).toLowerCase().includes(query.trim().toLowerCase()))
    : locations;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-2xl border border-input bg-background px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find stock at other locations"
          className="min-w-0 flex-1 bg-transparent py-1 text-sm font-semibold text-foreground placeholder:text-muted-foreground outline-none"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground" aria-label="Clear location search">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((loc) => (
            <LocationCard key={loc.name} {...loc} unit={unit} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card px-3 py-6 text-center">
          <p className="text-sm font-black text-foreground">No location stock supplied</p>
          <p className="mt-1 text-xs font-bold text-muted-foreground">Inventory has not returned multi-location stock for this item.</p>
        </div>
      )}

      <button
        type="button"
        disabled
        className="min-h-11 w-full rounded-2xl border border-border bg-secondary px-3 text-sm font-black text-muted-foreground"
      >
        View All Locations
      </button>
    </div>
  );
}