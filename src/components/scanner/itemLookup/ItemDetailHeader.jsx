import React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { describeItem, hasValue, identityLabel, valueOf } from "./itemLookupHelpers";

function LifecycleChip({ item }) {
  const status = String(item.lifecycleStatus || "UNKNOWN").toUpperCase();
  const active = status === "ACTIVE" && item.isActive !== false;
  const Icon = active ? CheckCircle2 : AlertCircle;
  const tone = active
    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : "bg-amber-500/15 text-amber-300 border-amber-500/30";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${tone}`}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

function PriceCard({ item }) {
  const price = valueOf(item, ["currentPrice", "current_price", "pricePerKg", "price_per_kg"], null);
  const currency = valueOf(item, ["currency"], "₱");
  const display = hasValue(price) ? `${currency}${price}` : "—";
  return (
    <div className="shrink-0 rounded-2xl border border-border bg-secondary/60 px-3 py-2 text-right">
      <p className="text-lg font-black leading-none text-foreground">{display}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Price</p>
    </div>
  );
}

export default function ItemDetailHeader({ item }) {
  if (!item) return null;
  const description = describeItem(item);
  return (
    <section className="scanops-work-card" data-item-detail-header>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-lg font-black leading-tight text-foreground">{item.itemName || "Unknown item"}</h2>
          {description && <p className="mt-1 text-xs font-bold text-muted-foreground">{description}</p>}
        </div>
        <PriceCard item={item} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="break-all font-mono text-[11px] font-bold text-muted-foreground">{identityLabel(item)}</span>
        <LifecycleChip item={item} />
      </div>
    </section>
  );
}