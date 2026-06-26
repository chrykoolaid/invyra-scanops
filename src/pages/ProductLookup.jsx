import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, MapPin, PackageCheck, RotateCcw, ScanLine } from "lucide-react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import { EmptyState, ItemSummaryCard, MetricPill, PageShell, SectionCard, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { getItemEntryPrimaryValue } from "../lib/scanOpsItemEntry";
import { getDefaultExpiryDate, getDefaultLotBatch, isWeightedItem, needsWeightedEvidence } from "../lib/scanOpsItemAttributes";
import { getIdentityDisplay, getMatchReasonDisplay } from "../lib/productIdentityResolver";
import { getInitialTaskQueue, getTaskStats } from "../lib/scanOpsTasks";
import { getSyncSummary } from "../lib/scanOpsSync";
import { useScanOpsSession } from "../lib/scanOpsSession";

const ITEM_TABS = ["Summary", "Inventory", "Movements", "Location", "Sales"];

const valueOf = (item, keys, fallback = "—") => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
};

const splitLocation = (location = "") => {
  const parts = String(location || "").split(/[-•·,]/).map((part) => part.trim()).filter(Boolean);
  return {
    aisle: parts[0] || "Not mapped",
    bay: parts[1] || "—",
    shelf: parts[2] || "—",
    position: parts[3] || "—",
  };
};

const mockMovements = (product, unit) => [
  { type: "Stock In", qty: valueOf(product, ["lastReceivedQty", "last_received_qty"], 24), reason: "Receiving", date: valueOf(product, ["lastReceived", "last_received", "lastReceivedDate"], "Today"), icon: ArrowDownLeft },
  { type: "Stock Out", qty: valueOf(product, ["soldToday", "todaySales"], 6), reason: "Sale", date: valueOf(product, ["lastSold", "last_sold"], "Yesterday"), icon: ArrowUpRight },
  { type: "Adjustment", qty: valueOf(product, ["unavailable", "wasteQty"], 1), reason: "Unavailable stock", date: "Recent", icon: RotateCcw },
].map((movement) => ({ ...movement, unit }));

function TabButton({ tab, active, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`min-h-10 shrink-0 rounded-2xl px-3 text-[11px] font-black uppercase tracking-wide active:scale-[0.98] ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{tab}</button>
  );
}

function QuickAction({ icon: Icon, label, onClick }) {
  return <button type="button" onClick={onClick} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-secondary px-3 text-xs font-black text-secondary-foreground active:bg-border"><Icon className="h-4 w-4" />{label}</button>;
}

function SummaryTab({ product, price, unit, workSummary, setActiveTab, onScanAgain }) {
  return (
    <>
      <SectionCard><div className="grid grid-cols-3 gap-2"><MetricPill label="SOH" value={valueOf(product, ["stockOnHand", "stock_on_hand", "shelfStock", "shelf_stock"])} suffix={unit} /><MetricPill label="Status" value={valueOf(product, ["status"], "Active")} /><MetricPill label="Next delivery" value={valueOf(product, ["nextDelivery", "next_delivery"], "—")} /></div></SectionCard>
      <SectionCard><div className="grid grid-cols-2 gap-2"><MetricPill label="Price" value={price} /><MetricPill label="Unit" value={unit} /><MetricPill label="Department" value={product.department || "—"} /><MetricPill label="Barcode" value={product.barcode || product.sku || "—"} /></div></SectionCard>
      <SectionCard><p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Quick actions</p><div className="mt-3 grid grid-cols-2 gap-2"><QuickAction icon={RotateCcw} label="View Movements" onClick={() => setActiveTab("Movements")} /><QuickAction icon={MapPin} label="Check Location" onClick={() => setActiveTab("Location")} /><QuickAction icon={PackageCheck} label="Report Issue" onClick={() => setActiveTab("Inventory")} /><QuickAction icon={ScanLine} label="Scan Again" onClick={onScanAgain} /></div></SectionCard>
      <SectionCard><p className="text-xs font-black uppercase tracking-wider text-muted-foreground">My work</p><div className="mt-3 grid grid-cols-3 gap-2"><MetricPill label="Open tasks" value={workSummary.openTasks} /><MetricPill label="Pending sync" value={workSummary.waitingSync} /><MetricPill label="Blocked" value={workSummary.blocked} /></div></SectionCard>
    </>
  );
}

function InventoryTab({ product, unit, scanValue }) {
  return (
    <>
      <SectionCard><p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Read-only inventory intelligence</p><div className="mt-3 grid grid-cols-2 gap-2"><MetricPill label="SOH" value={valueOf(product, ["stockOnHand", "stock_on_hand"])} suffix={unit} /><MetricPill label="Available" value={valueOf(product, ["available", "availableStock"], valueOf(product, ["shelfStock", "shelf_stock"]))} suffix={unit} /><MetricPill label="Reserved" value={valueOf(product, ["reserved", "reservedStock"], 0)} suffix={unit} /><MetricPill label="In transit" value={valueOf(product, ["inTransit", "in_transit"], 0)} suffix={unit} /><MetricPill label="Last received" value={valueOf(product, ["lastReceived", "last_received", "lastReceivedDate"])} /><MetricPill label="Unavailable" value={valueOf(product, ["unavailable", "wasteQty"], 0)} suffix={unit} /><MetricPill label="Shelf cap" value={valueOf(product, ["shelfCapacity", "shelf_capacity"])} suffix={unit} /><MetricPill label="Carton cap" value={valueOf(product, ["cartonCapacity", "carton_capacity"])} suffix={unit} /></div></SectionCard>
      <SectionCard><p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Attribute capture available</p><div className="mt-3 grid grid-cols-3 gap-2"><MetricPill label="Expiry" value={getDefaultExpiryDate(product) || "Available"} /><MetricPill label="Lot / Batch" value={getDefaultLotBatch(product) || "Available"} /><MetricPill label="Weighted" value={needsWeightedEvidence(product, scanValue) || isWeightedItem(product) ? "Evidence" : "Optional"} /></div><p className="mt-2 text-xs font-semibold leading-snug text-muted-foreground">Capture happens inside controlled workflows such as Markdown, Receiving, or Stock Count.</p></SectionCard>
    </>
  );
}

function MovementsTab({ product, unit }) {
  return <SectionCard><p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Inventory movement timeline</p><div className="mt-3 space-y-2">{mockMovements(product, unit).map((movement) => { const Icon = movement.icon; return <div key={`${movement.type}-${movement.reason}`} className="rounded-2xl border border-border bg-secondary/50 p-3"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-card text-foreground"><Icon className="h-4 w-4" /></div><div className="min-w-0"><p className="text-sm font-black text-foreground">{movement.type}</p><p className="mt-1 text-xs font-bold text-muted-foreground">Reason: {movement.reason}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{movement.date}</p></div></div><p className="shrink-0 text-lg font-black text-foreground">{movement.type === "Stock Out" ? "-" : "+"}{movement.qty}</p></div></div>; })}</div></SectionCard>;
}

function LocationTab({ product, unit }) {
  const shelf = splitLocation(product.shelfLocation || product.location);
  return (
    <>
      <SectionCard><p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Shelf location</p><p className="mt-2 text-sm font-bold text-muted-foreground">Where staff should physically find or place this item.</p><div className="mt-3 grid grid-cols-2 gap-2"><MetricPill label="Aisle" value={valueOf(product, ["aisle"], shelf.aisle)} /><MetricPill label="Bay" value={valueOf(product, ["bay"], shelf.bay)} /><MetricPill label="Shelf" value={valueOf(product, ["shelf"], shelf.shelf)} /><MetricPill label="Position" value={valueOf(product, ["position"], shelf.position)} /><MetricPill label="Facing" value={valueOf(product, ["facing", "facings"], "—")} /><MetricPill label="Planogram" value={valueOf(product, ["planogram"], "Current")} /></div></SectionCard>
      <SectionCard><p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Backroom</p><div className="mt-3 grid grid-cols-2 gap-2"><MetricPill label="Zone" value={valueOf(product, ["backroomZone", "backroom_zone"], "—")} /><MetricPill label="Rack / Bin" value={valueOf(product, ["backroomBin", "backroom_bin"], "—")} /><MetricPill label="Qty" value={valueOf(product, ["backroomStock", "backroom_stock"], 0)} suffix={unit} /><MetricPill label="Status" value={valueOf(product, ["backroomStatus"], "Check if needed")} /></div></SectionCard>
      <SectionCard><p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Display locations</p><div className="mt-3 grid grid-cols-1 gap-2">{(product.displayLocations || ["End cap / promo bay", "Front display if active"]).map((display) => <div key={display} className="rounded-2xl bg-secondary/60 px-3 py-2 text-sm font-black text-foreground">{display}</div>)}</div></SectionCard>
      <SectionCard><p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Other stores</p><p className="mt-2 rounded-2xl bg-secondary/60 px-3 py-2 text-sm font-bold text-muted-foreground">Shown only when multi-location stock visibility is enabled.</p></SectionCard>
    </>
  );
}

function SalesTab({ product, unit }) {
  return <SectionCard><p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Operational sales summary</p><div className="mt-3 grid grid-cols-2 gap-2"><MetricPill label="Today" value={valueOf(product, ["salesToday", "todaySales"], 0)} suffix={unit} /><MetricPill label="Last 7 days" value={valueOf(product, ["sales7d", "last7DaysSales"], "—")} suffix={unit} /><MetricPill label="Last 30 days" value={valueOf(product, ["sales30d", "last30DaysSales"], "—")} suffix={unit} /><MetricPill label="Daily avg" value={valueOf(product, ["dailyAverage", "daily_average"], "—")} suffix={unit} /><MetricPill label="Last sold" value={valueOf(product, ["lastSold", "last_sold"], "—")} /><MetricPill label="Trend" value={valueOf(product, ["salesTrend", "trend"], "Normal")} /></div></SectionCard>;
}

export default function ProductLookup() {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = useScanOpsSession();
  const initialQuery = id && id !== "demo" ? decodeURIComponent(id) : "";
  const [scanValue, setScanValue] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState("Summary");
  const [product, setProduct] = useState(() => initialQuery ? resolveInventoryIdentity(initialQuery) : null);
  const unit = product?.unitType || product?.unit_type || "each";
  const workSummary = useMemo(() => { const taskStats = getTaskStats(getInitialTaskQueue(), session); const syncSummary = getSyncSummary(); return { openTasks: taskStats.mine, waitingSync: syncSummary.pending, blocked: taskStats.escalated + syncSummary.issue }; }, [session]);
  const price = useMemo(() => { if (!product) return "—"; return product.pricePerKg ? `${product.currency || "₱"}${product.pricePerKg}/kg` : `${product.currency || "₱"}${product.currentPrice ?? product.current_price ?? "—"}`; }, [product]);

  const handleScan = (value) => {
    const input = typeof value === "object" ? getItemEntryPrimaryValue(value) : String(value || "").trim();
    if (!input && typeof value !== "object") return;
    const found = typeof value === "object" ? value : resolveInventoryIdentity(input);
    if (!found) return;
    setProduct(found);
    setScanValue(getItemEntryPrimaryValue(found));
    setActiveTab("Summary");
  };

  return (
    <PageShell>
      <WorkflowHeader title="Item Lookup" subtitle="Scan → understand → act" scanValue={scanValue} onScanValueChange={setScanValue} onScan={handleScan} />
      <WorkflowMain>
        {product ? (
          <>
            <ItemSummaryCard item={product}><p className="break-all font-mono text-[11px] text-muted-foreground">{getIdentityDisplay(product)}</p><p className="mt-1 inline-flex rounded-full bg-secondary px-2 py-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">{getMatchReasonDisplay(product)}</p></ItemSummaryCard>
            <div className="-mx-1 overflow-x-auto px-1 pb-1"><div className="flex gap-2">{ITEM_TABS.map((tab) => <TabButton key={tab} tab={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)} />)}</div></div>
            {activeTab === "Summary" && <SummaryTab product={product} price={price} unit={unit} workSummary={workSummary} setActiveTab={setActiveTab} onScanAgain={() => navigate("/scan")} />}
            {activeTab === "Inventory" && <InventoryTab product={product} unit={unit} scanValue={scanValue} />}
            {activeTab === "Movements" && <MovementsTab product={product} unit={unit} />}
            {activeTab === "Location" && <LocationTab product={product} unit={unit} />}
            {activeTab === "Sales" && <SalesTab product={product} unit={unit} />}
          </>
        ) : <EmptyState title="No item selected." helper="Scan an item to open Summary, Inventory, Movements, Location, and Sales." />}
      </WorkflowMain>
    </PageShell>
  );
}
