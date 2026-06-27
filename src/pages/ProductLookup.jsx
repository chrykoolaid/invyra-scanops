import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ClipboardList, MapPin, PackageCheck, RotateCcw, ScanLine } from "lucide-react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import { EmptyState, ItemSummaryCard, MetricPill, OperatorAlert, PageShell, SectionCard, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
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

const lookupKeyFor = (product) => getItemEntryPrimaryValue(product) || product?.barcode || product?.sku || product?.plu || product?.name || "";

const mockMovements = (product, unit) => [
  { type: "Stock In", qty: valueOf(product, ["lastReceivedQty", "last_received_qty"], 24), reason: "Receiving", date: valueOf(product, ["lastReceived", "last_received", "lastReceivedDate"], "Today"), icon: ArrowDownLeft },
  { type: "Stock Out", qty: valueOf(product, ["soldToday", "todaySales"], 6), reason: "Sale", date: valueOf(product, ["lastSold", "last_sold"], "Yesterday"), icon: ArrowUpRight },
  { type: "Adjustment", qty: valueOf(product, ["unavailable", "wasteQty"], 1), reason: "Unavailable stock", date: "Recent", icon: RotateCcw },
].map((movement) => ({ ...movement, unit }));

function TabButton({ tab, active, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`min-h-12 rounded-2xl px-2 text-[11px] font-black uppercase tracking-wide active:scale-[0.98] ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{tab}</button>
  );
}

function LookupAnswerCard({ icon: Icon, label, title, helper, children }) {
  return (
    <SectionCard>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <h2 className="mt-1 text-base font-black leading-tight text-foreground">{title}</h2>
          {helper && <p className="mt-1 text-xs font-bold leading-snug text-muted-foreground">{helper}</p>}
        </div>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </SectionCard>
  );
}

function NextAction({ icon: Icon, label, helper, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-[76px] items-center gap-3 rounded-2xl bg-secondary/70 px-3 py-3 text-left active:bg-border">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-card text-foreground"><Icon className="h-5 w-5" /></span>
      <span className="min-w-0">
        <span className="block text-sm font-black text-foreground">{label}</span>
        <span className="mt-1 block text-xs font-bold leading-snug text-muted-foreground">{helper}</span>
      </span>
    </button>
  );
}

function SummaryTab({ product, price, unit, workSummary, setActiveTab, onScanAgain, onOpenWorkflow }) {
  const shelfLocation = product.shelfLocation || product.location || "Not mapped";
  const backroomLocation = product.backroomLocation || product.backroom_location || product.backroomZone || product.backroom_zone || "Check backroom";
  return (
    <>
      <LookupAnswerCard icon={MapPin} label="Where is it?" title={shelfLocation} helper="Use this as the first physical location to check.">
        <div className="grid grid-cols-2 gap-2">
          <MetricPill label="Shelf" value={valueOf(product, ["shelfStock", "shelf_stock"], "—")} suffix={unit} />
          <MetricPill label="Backroom" value={valueOf(product, ["backroomStock", "backroom_stock"], "—")} suffix={unit} />
          <MetricPill label="Department" value={product.department || "—"} />
          <MetricPill label="Backroom area" value={backroomLocation} />
        </div>
      </LookupAnswerCard>

      <LookupAnswerCard icon={PackageCheck} label="What is the stock view?" title="Read-only stock snapshot" helper="Use this to decide the next workflow, not to change quantities here.">
        <div className="grid grid-cols-3 gap-2">
          <MetricPill label="SOH" value={valueOf(product, ["stockOnHand", "stock_on_hand", "shelfStock", "shelf_stock"])} suffix={unit} />
          <MetricPill label="Status" value={valueOf(product, ["status"], "Active")} />
          <MetricPill label="Price" value={price} />
        </div>
      </LookupAnswerCard>

      <LookupAnswerCard icon={ClipboardList} label="What should I do next?" title="Choose a controlled task" helper="Each action opens the proper workflow for the job.">
        <div className="grid grid-cols-1 gap-2">
          <NextAction icon={ArrowLeftRight} label="Move Stock" helper="Shelf, backroom, or location movement." onClick={() => onOpenWorkflow("/transfers")} />
          <NextAction icon={ClipboardList} label="Count This Item" helper="Start from the formal stock count workflow." onClick={() => onOpenWorkflow("/stock-count")} />
          <NextAction icon={PackageCheck} label="Report Issue" helper="Use shelf issue or stock-out evidence workflow." onClick={() => onOpenWorkflow("/gap-scan")} />
          <NextAction icon={ScanLine} label="Scan Again" helper="Clear this item and lookup another one." onClick={onScanAgain} />
        </div>
      </LookupAnswerCard>

      <SectionCard>
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">My work context</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MetricPill label="Open tasks" value={workSummary.openTasks} />
          <MetricPill label="Pending sync" value={workSummary.waitingSync} />
          <MetricPill label="Blocked" value={workSummary.blocked} />
        </div>
      </SectionCard>

      <OperatorAlert
        tone="info"
        title="Lookup stays read-first"
        helper="Actions route into controlled workflows. Inventory Desktop remains the review and audit layer."
        actions={[{ label: "Stock details", onClick: () => setActiveTab("Inventory") }, { label: "Location details", onClick: () => setActiveTab("Location") }]}
      />
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
  return <SectionCard><p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Movement history</p><p className="mt-1 text-xs font-bold leading-snug text-muted-foreground">Recent activity is shown for context only.</p><div className="mt-3 space-y-2">{mockMovements(product, unit).map((movement) => { const Icon = movement.icon; return <div key={`${movement.type}-${movement.reason}`} className="rounded-2xl border border-border bg-secondary/50 p-3"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-card text-foreground"><Icon className="h-4 w-4" /></div><div className="min-w-0"><p className="text-sm font-black text-foreground">{movement.type}</p><p className="mt-1 text-xs font-bold text-muted-foreground">Reason: {movement.reason}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{movement.date}</p></div></div><p className="shrink-0 text-lg font-black text-foreground">{movement.type === "Stock Out" ? "-" : "+"}{movement.qty}</p></div></div>; })}</div></SectionCard>;
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

  const openWorkflow = (path) => {
    const key = lookupKeyFor(product);
    navigate(key ? `${path}?item=${encodeURIComponent(key)}` : path);
  };

  return (
    <PageShell>
      <WorkflowHeader title="Lookup Item" subtitle="Scan → identify → location → next task" scanValue={scanValue} onScanValueChange={setScanValue} onScan={handleScan} />
      <WorkflowMain>
        {product ? (
          <>
            <ItemSummaryCard item={product}>
              <p className="break-all font-mono text-[11px] text-muted-foreground">{getIdentityDisplay(product)}</p>
              <p className="mt-1 inline-flex rounded-full bg-secondary px-2 py-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">{getMatchReasonDisplay(product)}</p>
            </ItemSummaryCard>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="tablist" aria-label="Item lookup sections">{ITEM_TABS.map((tab) => <TabButton key={tab} tab={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)} />)}</div>
            {activeTab === "Summary" && <SummaryTab product={product} price={price} unit={unit} workSummary={workSummary} setActiveTab={setActiveTab} onScanAgain={() => navigate("/scan")} onOpenWorkflow={openWorkflow} />}
            {activeTab === "Inventory" && <InventoryTab product={product} unit={unit} scanValue={scanValue} />}
            {activeTab === "Movements" && <MovementsTab product={product} unit={unit} />}
            {activeTab === "Location" && <LocationTab product={product} unit={unit} />}
            {activeTab === "Sales" && <SalesTab product={product} unit={unit} />}
          </>
        ) : <EmptyState title="No item selected." helper="Scan an item to identify it, find its location, and choose the next task." />}
      </WorkflowMain>
    </PageShell>
  );
}
