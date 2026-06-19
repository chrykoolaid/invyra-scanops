/**
 * MarkdownSuggestionsPanel — Phase D refactor
 *
 * Now uses the active inventory provider instead of importing fixtures directly.
 * In inventory_bridge mode: uses live IndexedDB cache.
 * In mock mode: uses MOCK_INVENTORY_ITEMS from dev fixtures.
 *
 * Direct import of INVENTORY_SNAPSHOT_ITEMS removed.
 */
import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Lightbulb, Package, Tag, TrendingDown } from "lucide-react";
import { getActiveInventoryProvider } from "../../lib/inventory/activeInventoryProvider";
import { calculateDaysToExpiry } from "../../lib/scanOpsMarkdownApproval";

const OVERSTOCK_RATIO = 2.5;

function categorizeSuggestion(item) {
  const days = calculateDaysToExpiry(item.expiryDate || item.expiry_date);
  const shelf = item.shelfStock ?? item.available_qty ?? 0;
  const min = item.minimumStock ?? 1;

  if (!item.markdownEligible && item.markdown_status !== "eligible") return null;
  if (item.wasteReviewRequired) return null;
  if (days != null && days < 0) return null;

  if (days != null && days === 0) return { urgency: "critical", tag: "Expires today", tagColor: "bg-red-100 text-red-700", reason: "short_dated", suggestedPercent: "50", days };
  if (days != null && days <= 1) return { urgency: "high", tag: `Expires in ${days + 1}d`, tagColor: "bg-red-100 text-red-700", reason: "short_dated", suggestedPercent: "40", days };
  if (days != null && days <= 3) return { urgency: "high", tag: `Expires in ${days}d`, tagColor: "bg-amber-100 text-amber-700", reason: "short_dated", suggestedPercent: "30", days };
  if (days != null && days <= 7) return { urgency: "medium", tag: `Expires in ${days}d`, tagColor: "bg-amber-100 text-amber-700", reason: "short_dated", suggestedPercent: "25", days };
  if (shelf > min * OVERSTOCK_RATIO) return { urgency: "medium", tag: "Overstocked", tagColor: "bg-blue-100 text-blue-700", reason: "overstock", suggestedPercent: "15", days };
  if (item.freshnessStatus && ["Near Expiry", "Poor Appearance", "Temperature Concern", "Condition Led"].includes(item.freshnessStatus)) {
    return { urgency: "medium", tag: item.freshnessStatus, tagColor: "bg-amber-100 text-amber-700", reason: "short_dated", suggestedPercent: "25", days };
  }
  return null;
}

const URGENCY_ORDER = { critical: 0, high: 1, medium: 2 };

function urgencyIcon(urgency) {
  if (urgency === "critical") return <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />;
  if (urgency === "high") return <TrendingDown className="h-4 w-4 shrink-0 text-amber-600" />;
  return <Tag className="h-4 w-4 shrink-0 text-blue-600" />;
}

function urgencyBorder(urgency) {
  if (urgency === "critical") return "border-red-200 bg-red-50";
  if (urgency === "high") return "border-amber-200 bg-amber-50";
  return "border-blue-100 bg-blue-50/50";
}

export default function MarkdownSuggestionsPanel({ onSelectItem }) {
  const [expanded, setExpanded] = useState(true);
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const provider = getActiveInventoryProvider();
    const loader = provider.getCachedItems ? provider.getCachedItems(100) : provider.searchItems("", 100);
    loader
      .then((rows) => { if (!cancelled) setItems(rows || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const suggestions = useMemo(() => {
    return items
      .map((item) => ({ item, cat: categorizeSuggestion(item) }))
      .filter(({ cat }) => cat != null)
      .sort((a, b) => URGENCY_ORDER[a.cat.urgency] - URGENCY_ORDER[b.cat.urgency]);
  }, [items]);

  if (suggestions.length === 0) return null;

  const critical = suggestions.filter(({ cat }) => cat.urgency === "critical").length;
  const high = suggestions.filter(({ cat }) => cat.urgency === "high").length;
  const price = (item) => item.currentPrice || item.current_unit_price;
  const displayName = (item) => item.name || item.item_name;
  const displayLocation = (item) => item.shelfLocation || item.location_name || item.location;
  const displayUom = (item) => item.unitType || item.uom || "each";

  return (
    <div className={`rounded-2xl border ${critical > 0 ? "border-red-200 bg-red-50/30" : "border-amber-200 bg-amber-50/20"}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 active:bg-black/5"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Lightbulb className={`h-4 w-4 shrink-0 ${critical > 0 ? "text-red-600" : "text-amber-600"}`} />
          <div className="text-left min-w-0">
            <p className="text-sm font-black text-foreground">Markdown Suggestions</p>
            <p className="text-xs font-semibold text-muted-foreground">
              {suggestions.length} item{suggestions.length !== 1 ? "s" : ""} flagged
              {critical > 0 ? ` · ${critical} critical` : ""}
              {high > 0 ? ` · ${high} urgent` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${critical > 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
            {suggestions.length}
          </span>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/50 px-3 pb-3 pt-2 space-y-2">
          <p className="text-[11px] font-semibold leading-snug text-muted-foreground px-1">
            Items detected during scan rounds that may benefit from a price reduction. Tap to pre-fill a markdown request.
          </p>
          {suggestions.map(({ item, cat }) => (
            <button
              key={item.internalItemId || item.item_id}
              type="button"
              onClick={() => onSelectItem(item, cat)}
              className={`w-full rounded-2xl border p-3 text-left active:scale-[0.99] ${urgencyBorder(cat.urgency)}`}
            >
              <div className="flex items-start gap-2">
                {urgencyIcon(cat.urgency)}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="break-words text-sm font-black leading-tight text-foreground">{displayName(item)}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${cat.tagColor}`}>{cat.tag}</span>
                  </div>
                  <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                    {displayLocation(item)} · {item.department || item.category}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                      <Package className="h-3 w-3" />
                      {item.shelfStock ?? item.available_qty ?? "—"} {displayUom(item)} shelf
                    </span>
                    {price(item) && (
                      <span className="text-[11px] font-bold text-muted-foreground">
                        ₱{price(item)} → ₱{(price(item) * (1 - Number(cat.suggestedPercent) / 100)).toFixed(2)}
                      </span>
                    )}
                    <span className="rounded-lg bg-white/80 px-2 py-0.5 text-[10px] font-black text-foreground">−{cat.suggestedPercent}% suggested</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}