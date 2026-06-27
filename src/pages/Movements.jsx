import React, { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ClipboardList, PackageOpen, RefreshCw, Search, Tags } from "lucide-react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import { EmptyState, ItemSummaryCard, PageShell, SectionCard, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { getItemEntryPrimaryValue } from "../lib/scanOpsItemEntry";

const FILTERS = ["All", "Receiving", "Sales", "Transfers", "Adjustments", "Markdown", "Stock Count"];

const getMovements = (product) => [
  { id: "mov-1", type: "Adjustment", direction: "out", quantity: 98, reason: "Stock out", source: "Adjustment", date: "18/03/2026", time: "07:32", icon: ArrowUpRight },
  { id: "mov-2", type: "Adjustment", direction: "in", quantity: 102, reason: "Stock in", source: "Adjustment", date: "17/03/2026", time: "10:14", icon: ArrowDownLeft },
  { id: "mov-3", type: "Receiving", direction: "in", quantity: product?.lastReceivedQty || product?.last_received_qty || 192, reason: "Received", source: "Receiving", date: product?.lastReceived || "15/03/2026", time: "09:21", icon: PackageOpen },
  { id: "mov-4", type: "Transfer", direction: "in", quantity: 24, reason: "Backroom to shelf", source: "Transfer", date: "14/03/2026", time: "13:05", icon: ArrowLeftRight },
  { id: "mov-5", type: "Markdown", direction: "out", quantity: 3, reason: "Markdown sale", source: "Markdown", date: "13/03/2026", time: "16:40", icon: Tags },
  { id: "mov-6", type: "Stock Count", direction: "in", quantity: 1, reason: "Count variance", source: "Stock Count", date: "12/03/2026", time: "08:12", icon: ClipboardList },
];

function FilterChip({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`min-h-10 shrink-0 rounded-2xl px-3 text-[11px] font-black uppercase tracking-wide active:scale-[0.98] ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{label}</button>
  );
}

function MovementCard({ movement }) {
  const Icon = movement.icon || RefreshCw;
  const sign = movement.direction === "out" ? "-" : "+";
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-foreground"><Icon className="h-5 w-5" /></div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">{movement.type}</p>
            <p className="mt-1 text-sm font-black text-foreground">{movement.source}</p>
            <p className="mt-1 text-xs font-bold text-muted-foreground">Reason: {movement.reason}</p>
          </div>
        </div>
        <p className="shrink-0 text-3xl font-black leading-none text-foreground">{sign}{movement.quantity}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
        <div><p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Date</p><p className="text-sm font-black text-foreground">{movement.date}</p></div>
        <div><p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Time</p><p className="text-sm font-black text-foreground">{movement.time}</p></div>
      </div>
    </article>
  );
}

export default function Movements() {
  const [scanValue, setScanValue] = useState("");
  const [product, setProduct] = useState(null);
  const [filter, setFilter] = useState("All");
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
    <PageShell>
      <WorkflowHeader title="Inventory Movements" subtitle="Read-only stock activity timeline" scanValue={scanValue} onScanValueChange={setScanValue} onScan={handleScan} />
      <WorkflowMain>
        {product ? <ItemSummaryCard item={product} /> : <EmptyState title="Scan an item to review movements." helper="Newest movement cards appear first. This screen is read-only." />}
        <SectionCard>
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Movement history</p><p className="mt-1 text-sm font-bold text-foreground">Last 30 days</p></div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-muted-foreground"><Search className="h-4 w-4" /></div>
          </div>
          <div className="-mx-1 mt-3 overflow-x-auto px-1 pb-1"><div className="flex gap-2">{FILTERS.map((item) => <FilterChip key={item} label={item} active={filter === item} onClick={() => setFilter(item)} />)}</div></div>
        </SectionCard>
        <div className="space-y-3">{movements.map((movement) => <MovementCard key={movement.id} movement={movement} />)}</div>
      </WorkflowMain>
    </PageShell>
  );
}
