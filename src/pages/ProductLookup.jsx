import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeftRight,
  ClipboardList,
  Clock,
  MapPin,
  PackageCheck,
  PackageOpen,
  ScanLine,
  Tags,
  Trash2,
} from "lucide-react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import {
  EmptyState,
  ItemSummaryCard,
  MetricPill,
  OperatorAlert,
  PageShell,
  SectionCard,
  WorkflowMain,
} from "../components/scanner/WorkflowPrimitives";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { getItemEntryPrimaryValue } from "../lib/scanOpsItemEntry";
import { getIdentityDisplay, getMatchReasonDisplay } from "../lib/productIdentityResolver";

const valueOf = (item, keys, fallback = "—") => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
};

const hasValue = (value) => value !== undefined && value !== null && value !== "";
const lookupKeyFor = (product) => getItemEntryPrimaryValue(product) || product?.barcode || product?.sku || product?.plu || product?.name || "";

function QuickAction({ icon: Icon, label, helper, tone = "default", onClick }) {
  const tones = {
    blue: "bg-blue-950/95 text-blue-50 active:bg-blue-900",
    green: "bg-emerald-950/95 text-emerald-50 active:bg-emerald-900",
    purple: "bg-purple-950/95 text-purple-50 active:bg-purple-900",
    amber: "bg-amber-900/95 text-amber-50 active:bg-amber-800",
    default: "bg-slate-800 text-slate-50 active:bg-slate-700",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[82px] flex-col items-center justify-center rounded-2xl border border-white/5 px-2 py-2 text-center transition active:scale-[0.98] ${tones[tone] || tones.default}`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
        <Icon className="h-4 w-4" />
      </span>
      <span className="mt-1.5 text-[12px] font-black leading-tight">{label}</span>
      {helper && <span className="mt-0.5 text-[9.5px] font-bold leading-snug text-current/70">{helper}</span>}
    </button>
  );
}

function StockLocationCard({ product, unit, price }) {
  const shelfLocation = product.shelfLocation || product.location || "Not mapped";
  const backroomLocation = product.backroomLocation || product.backroom_location || product.backroomZone || product.backroom_zone || "Check backroom";
  const lastMovement = valueOf(product, ["lastMovement", "last_movement", "lastReceived", "last_received", "lastReceivedDate"], "Not supplied");

  return (
    <SectionCard>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MapPin className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Stock & Location</p>
          <h2 className="mt-1 text-base font-black leading-tight text-foreground">{shelfLocation}</h2>
          <p className="mt-1 text-xs font-bold leading-snug text-muted-foreground">Backroom: {backroomLocation}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <MetricPill label="On Hand" value={valueOf(product, ["stockOnHand", "stock_on_hand", "shelfStock", "shelf_stock"])} suffix={unit} />
        <MetricPill label="Available" value={valueOf(product, ["available", "availableStock", "available_stock", "shelfStock", "shelf_stock"])} suffix={unit} />
        <MetricPill label="Shelf" value={valueOf(product, ["shelfStock", "shelf_stock"], "—")} suffix={unit} />
        <MetricPill label="Backroom" value={valueOf(product, ["backroomStock", "backroom_stock"], "—")} suffix={unit} />
        <MetricPill label="Last Move" value={lastMovement} />
        <MetricPill label="Price" value={price} />
      </div>
    </SectionCard>
  );
}

function QuickActionsGrid({ product, onOpenWorkflow, onScanAgain }) {
  const actions = [
    { icon: PackageOpen, label: "Receive", helper: "Delivery", path: "/receiving", tone: "blue" },
    { icon: ClipboardList, label: "Count", helper: "Stocktake", path: "/stock-count", tone: "blue" },
    { icon: ArrowLeftRight, label: "Transfers", helper: "Locations", path: "/transfers", tone: "green" },
    { icon: Trash2, label: "Waste", helper: "Record loss", path: "/waste", tone: "green" },
    { icon: Tags, label: "Markdown", helper: "Labels", path: "/markdowns", tone: "purple" },
    { icon: Clock, label: "Expiry", helper: "Freshness", path: "/expiry-check", tone: "purple" },
  ];

  return (
    <SectionCard>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <PackageCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Next Action</p>
          <h2 className="mt-1 text-base font-black leading-tight text-foreground">Choose the controlled workflow</h2>
          <p className="mt-1 text-xs font-bold leading-snug text-muted-foreground">The selected item is carried into the workflow where supported.</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1">
        {actions.map((action) => (
          <QuickAction
            key={action.label}
            icon={action.icon}
            label={action.label}
            helper={action.helper}
            tone={action.tone}
            onClick={() => onOpenWorkflow(action.path)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onScanAgain}
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-secondary px-3 text-sm font-black text-secondary-foreground active:bg-border"
      >
        <ScanLine className="h-4 w-4" /> Scan another item
      </button>
    </SectionCard>
  );
}

function LookupError({ query }) {
  if (!query) return null;
  return (
    <OperatorAlert
      tone="warning"
      title="No item found"
      helper="Scan again or enter a barcode, PLU, SKU, or item name."
    />
  );
}

export default function ProductLookup() {
  const { id } = useParams();
  const navigate = useNavigate();
  const initialQuery = id && id !== "demo" ? decodeURIComponent(id) : "";
  const [scanValue, setScanValue] = useState(initialQuery);
  const [lastQuery, setLastQuery] = useState(initialQuery);
  const [product, setProduct] = useState(() => initialQuery ? resolveInventoryIdentity(initialQuery) : null);
  const unit = product?.unitType || product?.unit_type || "each";

  const price = useMemo(() => {
    if (!product) return "—";
    if (product.pricePerKg) return `${product.currency || "₱"}${product.pricePerKg}/kg`;
    const currentPrice = product.currentPrice ?? product.current_price;
    return hasValue(currentPrice) ? `${product.currency || "₱"}${currentPrice}` : "—";
  }, [product]);

  const handleScan = (value) => {
    const input = typeof value === "object" ? getItemEntryPrimaryValue(value) : String(value || "").trim();
    if (!input && typeof value !== "object") return;
    const found = typeof value === "object" ? value : resolveInventoryIdentity(input);
    setLastQuery(input || getItemEntryPrimaryValue(found));
    setProduct(found || null);
    if (found) setScanValue(getItemEntryPrimaryValue(found));
  };

  const openWorkflow = (path) => {
    const key = lookupKeyFor(product);
    navigate(key ? `${path}?item=${encodeURIComponent(key)}` : path);
  };

  return (
    <PageShell className="bold-blocks">
      <WorkflowHeader
        title="Scan or Lookup Item"
        subtitle="Scan → item → stock/location → next action"
        placeholder="Scan barcode, PLU, SKU, or item name..."
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={handleScan}
      />
      <WorkflowMain>
        {product ? (
          <>
            <ItemSummaryCard item={product}>
              <div className="grid grid-cols-2 gap-2">
                <MetricPill label="Status" value={valueOf(product, ["status"], "Active")} />
                <MetricPill label="Department" value={valueOf(product, ["department"], "—")} />
              </div>
              <p className="mt-3 break-all font-mono text-[11px] text-muted-foreground">{getIdentityDisplay(product)}</p>
              <p className="mt-1 inline-flex rounded-full bg-secondary px-2 py-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">{getMatchReasonDisplay(product)}</p>
            </ItemSummaryCard>

            <StockLocationCard product={product} unit={unit} price={price} />
            <QuickActionsGrid product={product} onOpenWorkflow={openWorkflow} onScanAgain={() => navigate("/scan")} />

            <OperatorAlert
              tone="info"
              title="Lookup stays read-only"
              helper="Quantities and audited records are changed only inside controlled workflows."
            />
          </>
        ) : (
          <>
            <SectionCard className="border-primary/20 bg-primary/5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <ScanLine className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-black leading-tight text-foreground">Ready for lookup</p>
                  <p className="mt-1 text-sm font-bold leading-snug text-muted-foreground">Scan an item to show item summary, stock, location, and quick actions.</p>
                </div>
              </div>
            </SectionCard>
            <LookupError query={lastQuery} />
            <EmptyState title="No item selected." helper="Scan an item or enter a barcode, SKU, PLU, or item name." />
          </>
        )}
      </WorkflowMain>
    </PageShell>
  );
}