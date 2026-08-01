import React from "react";
import { AlertCircle, CheckCircle2, Database } from "lucide-react";
import { describeItem, identityLabel } from "./itemLookupHelpers";

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

export default function ItemDetailHeader({ item }) {
  if (!item) return null;
  const description = describeItem(item);
  return (
    <section className="scanops-work-card" data-item-detail-header>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Database className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-primary">Operational item view</p>
          <h2 className="mt-1 break-words text-lg font-black leading-tight text-foreground">{item.itemName || "Unknown item"}</h2>
          {item.shortDisplayName && item.shortDisplayName !== item.itemName && (
            <p className="mt-1 text-xs font-bold text-foreground/80">{item.shortDisplayName}</p>
          )}
          {description && <p className="mt-1 text-xs font-bold text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="break-all font-mono text-[11px] font-bold text-muted-foreground">{identityLabel(item)}</span>
        <LifecycleChip item={item} />
      </div>
      <p className="mt-3 text-[11px] font-bold leading-snug text-muted-foreground">
        Authoritative identity and handling data supplied by Inventory. Price is not included in this certified read scope.
      </p>
    </section>
  );
}
