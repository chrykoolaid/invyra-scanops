import React, { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Check, ChevronDown, ClipboardList, PackageOpen, RefreshCw, Search, SlidersHorizontal, Tags, X } from "lucide-react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import { EmptyState, ItemSummaryCard, PageShell, SectionCard, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { getItemEntryPrimaryValue } from "../lib/scanOpsItemEntry";

const FILTERS = ["All", "Receiving", "Sales", "Transfers", "Adjustments", "Markdown", "Stock Count"];

const getMovements = (product) => [
  { id: "mov-1", type: "Adjustment", direction: "out", quantity: 98, reason: "Stock out", source: "Adjustment", date: "18/03/2026", time: "07:32", icon: ArrowUpRight, detail: "Stock was reduced after an approved stock-out adjustment." },
  { id: "mov-2", type: "Adjustment", direction: "in", quantity: 102, reason: "Stock in", source: "Adjustment", date: "17/03/2026", time: "10:14", icon: ArrowDownLeft, detail: "Stock was increased after a controlled adjustment." },
  { id: "mov-3", type: "Receiving", direction: "in", quantity: product?.lastReceivedQty || product?.last_received_qty || 192, reason: "Received", source: "Receiving", date: product?.lastReceived || "15/03/2026", time: "09:21", icon: PackageOpen, detail: "Delivery evidence was accepted into the receiving workflow." },
  { id: "mov-4", type: "Transfer", direction: "in", quantity: 24, reason: "Backroom to shelf", source: "Transfer", date: "14/03/2026", time: "13:05", icon: ArrowLeftRight, detail: "Stock was moved between operational locations." },
  { id: "mov-5", type: "Markdown", direction: "out", quantity: 3, reason: "Markdown sale", source: "Markdown", date: "13/03/2026", time: "16:40", icon: Tags, detail: "Units left stock through the markdown workflow." },
  { id: "mov-6", type: "Stock Count", direction: "in", quantity: 1, reason: "Count variance", source: "Stock Count", date: "12/03/2026", time: "08:12", icon: ClipboardList, detail: "A signed stock count variance changed the stock position." },
];

function FilterSheet({ open, activeFilter, onSelect, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end bg-foreground/35 px-3 pb-3" role="dialog" aria-modal="true" aria-label="Movement filters">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close movement filters" onClick={onClose} />
      <section className="relative w-full rounded-3xl border border-border bg-card p-4 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-foreground">Filter movements</p>
            <p className="mt-1 text-xs font-bold text-muted-foreground">Choose one view. Movement history remains read-only.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-foreground active:bg-border" aria-label="Close filters">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {FILTERS.map((filter) => {
            const active = filter === activeFilter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => onSelect(filter)}
                className={`flex min-h-13 items-center justify-between rounded-2xl border px-3 py-3 text-left active:scale-[0.99] ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary text-foreground"}`}
              >
                <span className="text-sm font-black">{filter}</span>
                {active && <Check className="h-5 w-5" />}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function MovementCard({ movement }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = movement.icon || RefreshCw;
  const sign = movement.direction === "out" ? "-" : "+";
  return (
    <article className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <button type="button" onClick={() => setExpanded((value) => !value)} className="w-full text-left" aria-expanded={expanded}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-foreground"><Icon className="h-6 w-6" /></div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">{movement.type}</p>
              <p className="mt-1 text-base font-black text-foreground">{movement.source}</p>
              <p className="mt-1 text-xs font-bold text-muted-foreground">Reason: {movement.reason}</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-4xl font-black leading-none text-foreground">{sign}{movement.quantity}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">Qty</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-secondary/70 px-3 py-2">
          <p className="text-xs font-black text-foreground">{movement.date} · {movement.time}</p>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>
      {expanded && (
        <div className="mt-3 rounded-2xl border border-border bg-secondary/40 p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">What happened?</p>
          <p className="mt-1 text-sm font-bold leading-snug text-foreground">{movement.detail}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div><p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Date</p><p className="text-sm font-black text-foreground">{movement.date}</p></div>
            <div><p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Time</p><p className="text-sm font-black text-foreground">{movement.time}</p></div>
          </div>
        </div>
      )}
    </article>
  );
}

export default function Movements() {
  const [scanValue, setScanValue] = useState("");
  const [product, setProduct] = useState(null);
  const [filter, setFilter] = useState("All");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const movements = useMemo(() => {
    const source = getMovements(product);
    if (filter === "All") return source;
    if (filter === "Transfers") return source.filter((m) => m.type === "Transfer");
    if (filter === "Sales") return source.filter((m) => m.type === "Sale" || m.reason.toLowerCase().includes("sale"));
    if (filter === "Adjustments") return source.filter((m) => m.type === "Adjustment");
    return source.filter((m) => m.type === filter);
  }, [filter, product]);

  const handleScan = (value) => {
    const input = typeof value === "object" ? getItemEntryPrimaryValue(value) : String(value || "").trim();
    if (!input && typeof value !== "object") return;
    const found = typeof value === "object" ? value : resolveInventoryIdentity(input);
    if (!found) return;
    setProduct(found);
    setScanValue(getItemEntryPrimaryValue(found));
    setFilter("All");
  };

  return (
    <PageShell className="bold-blocks">
      <WorkflowHeader title="Inventory Movements" subtitle="What happened to stock" scanValue={scanValue} onScanValueChange={setScanValue} onScan={handleScan} />
      <WorkflowMain>
        {product ? <ItemSummaryCard item={product} /> : <EmptyState title="Scan an item to review movements." helper="Newest movement cards appear first. This screen is read-only." />}
        <SectionCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Movement history</p>
              <p className="mt-1 text-sm font-bold text-foreground">Last 30 days · {filter}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-muted-foreground"><Search className="h-5 w-5" /></div>
              <button type="button" onClick={() => setFiltersOpen(true)} className="flex min-h-11 items-center gap-2 rounded-2xl bg-primary px-3 text-xs font-black text-primary-foreground active:scale-[0.98]">
                <SlidersHorizontal className="h-4 w-4" /> Filter
              </button>
            </div>
          </div>
          <p className="mt-3 rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-bold leading-snug text-muted-foreground">Read-only timeline. Tap a card to understand the reason, source, and time.</p>
        </SectionCard>
        <div className="relative space-y-3 pl-4 before:absolute before:bottom-3 before:left-1 before:top-3 before:w-0.5 before:rounded-full before:bg-border">
          {movements.map((movement) => <MovementCard key={movement.id} movement={movement} />)}
        </div>
      </WorkflowMain>
      <FilterSheet open={filtersOpen} activeFilter={filter} onSelect={(value) => { setFilter(value); setFiltersOpen(false); }} onClose={() => setFiltersOpen(false)} />
    </PageShell>
  );
}