import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ClipboardList, RefreshCcw, Tags, Trash2, BadgePercent } from "lucide-react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import { EmptyState, ItemSummaryCard, MetricPill, PageShell, SectionCard, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { getItemEntryPrimaryValue } from "../lib/scanOpsItemEntry";
import { getIdentityDisplay, getMatchReasonDisplay } from "../lib/productIdentityResolver";

export default function ProductLookup() {
  const navigate = useNavigate();
  const { id } = useParams();
  const initialQuery = id && id !== "demo" ? decodeURIComponent(id) : "";
  const [scanValue, setScanValue] = useState(initialQuery);
  const [product, setProduct] = useState(() => initialQuery ? resolveInventoryIdentity(initialQuery) : null);
  const unit = product?.unitType || product?.unit_type || "each";
  const price = useMemo(() => {
    if (!product) return "—";
    return product.pricePerKg ? `${product.currency || "₱"}${product.pricePerKg}/kg` : `${product.currency || "₱"}${product.currentPrice ?? product.current_price ?? "—"}`;
  }, [product]);

  const handleScan = (value) => {
    const input = typeof value === "object" ? getItemEntryPrimaryValue(value) : String(value || "").trim();
    if (!input && typeof value !== "object") return;
    const found = typeof value === "object" ? value : resolveInventoryIdentity(input);
    if (!found) return;
    setProduct(found);
    setScanValue(getItemEntryPrimaryValue(found));
  };

  return (
    <PageShell>
      <WorkflowHeader
        title="Product Lookup"
        subtitle="Scan, PLU, SKU, shelf label, or name"
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={handleScan}
      />
      <WorkflowMain>
        {product ? (
          <>
            <ItemSummaryCard item={product}>
              <p className="break-all font-mono text-[11px] text-muted-foreground">{getIdentityDisplay(product)}</p>
              <p className="mt-1 inline-flex rounded-full bg-secondary px-2 py-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">{getMatchReasonDisplay(product)}</p>
            </ItemSummaryCard>
            <SectionCard>
              <div className="grid grid-cols-2 gap-2">
                <MetricPill label="Price" value={price} />
                <MetricPill label="Unit" value={unit} />
                <MetricPill label="Department" value={product.department || "—"} />
                <MetricPill label="Location" value={product.shelfLocation || product.location || "—"} />
              </div>
            </SectionCard>
            <SectionCard>
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Quick actions</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <ActionButton icon={ClipboardList} label="Count" onClick={() => navigate("/stock-count")} />
                <ActionButton icon={RefreshCcw} label="Replenish" onClick={() => navigate("/replenish")} />
                <ActionButton icon={BadgePercent} label="Markdown" onClick={() => navigate("/markdowns")} />
                <ActionButton icon={Trash2} label="Waste" onClick={() => navigate("/waste")} />
                <ActionButton icon={Tags} label="Shelf Ticket" onClick={() => navigate("/shelf-tickets")} />
              </div>
            </SectionCard>
          </>
        ) : (
          <EmptyState title="No item selected." />
        )}
      </WorkflowMain>
    </PageShell>
  );
}

function ActionButton({ icon: Icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-secondary px-3 text-sm font-black text-secondary-foreground active:bg-border">
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
