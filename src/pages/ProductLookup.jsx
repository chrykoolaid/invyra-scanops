import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ClipboardList, Tags, Trash2, ArrowRightLeft } from "lucide-react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import { PageShell, WorkflowMain, ItemSummaryCard, SectionCard, MetricPill, ReadyCard } from "../components/scanner/WorkflowPrimitives";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { getIdentityDisplay } from "../lib/productIdentityResolver";

export default function ProductLookup() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [scanValue, setScanValue] = useState(id === "demo" ? "" : decodeURIComponent(id || ""));
  const product = resolveInventoryIdentity(id === "demo" ? "930000000004" : id) || resolveInventoryIdentity("930000000004");
  const unit = product?.unitType || product?.unit_type || "each";
  const price = product?.pricePerKg ? `${product.currency}${product.pricePerKg}/kg` : `${product?.currency || "₱"}${product?.currentPrice ?? product?.current_price ?? "—"}`;

  const handleScan = (value) => {
    const input = String(value || "").trim() || "demo";
    navigate(`/product/${encodeURIComponent(input)}`);
  };

  return (
    <PageShell>
      <WorkflowHeader
        title="Product Lookup"
        subtitle="Instant item search"
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={handleScan}
      />
      <WorkflowMain>
        {product ? (
          <>
            <ItemSummaryCard item={product}>
              <p className="break-all font-mono text-[11px] text-muted-foreground">{getIdentityDisplay(product)}</p>
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
                <ActionButton icon={ClipboardList} label="Stock Count" onClick={() => navigate("/stock-count")} />
                <ActionButton icon={Tags} label="Shelf Ticket" onClick={() => navigate("/shelf-tickets")} />
                <ActionButton icon={Trash2} label="Waste" onClick={() => navigate("/waste")} />
                <ActionButton icon={ArrowRightLeft} label="Transfer" onClick={() => navigate("/transfers")} />
              </div>
            </SectionCard>
          </>
        ) : (
          <ReadyCard title="Item not found" helper="Try a barcode, PLU, SKU, shelf label, or item name." />
        )}
      </WorkflowMain>
    </PageShell>
  );
}

function ActionButton({ icon: Icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-secondary px-3 text-sm font-black text-secondary-foreground active:bg-border">
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
