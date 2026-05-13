import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import { EmptyState, ItemSummaryCard, MetricPill, PageShell, SectionCard, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { getItemEntryPrimaryValue } from "../lib/scanOpsItemEntry";
import { getDefaultExpiryDate, getDefaultLotBatch, isWeightedItem, needsWeightedEvidence } from "../lib/scanOpsItemAttributes";
import { getIdentityDisplay, getMatchReasonDisplay } from "../lib/productIdentityResolver";
import { getInitialTaskQueue, getTaskStats } from "../lib/scanOpsTasks";
import { getSyncSummary } from "../lib/scanOpsSync";
import { useScanOpsSession } from "../lib/scanOpsSession";

export default function ProductLookup() {
  const { id } = useParams();
  const session = useScanOpsSession();
  const initialQuery = id && id !== "demo" ? decodeURIComponent(id) : "";
  const [scanValue, setScanValue] = useState(initialQuery);
  const [product, setProduct] = useState(() => initialQuery ? resolveInventoryIdentity(initialQuery) : null);
  const unit = product?.unitType || product?.unit_type || "each";
  const workSummary = useMemo(() => {
    const taskStats = getTaskStats(getInitialTaskQueue(), session);
    const syncSummary = getSyncSummary();
    return {
      openTasks: taskStats.mine,
      waitingSync: syncSummary.pending,
      blocked: taskStats.escalated + syncSummary.issue,
    };
  }, [session]);

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
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Attribute capture available</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <MetricPill label="Expiry" value={getDefaultExpiryDate(product) || "Available"} />
                <MetricPill label="Lot / Batch" value={getDefaultLotBatch(product) || "Available"} />
                <MetricPill label="Weighted" value={needsWeightedEvidence(product, scanValue) || isWeightedItem(product) ? "Evidence" : "Optional"} />
              </div>
              <p className="mt-2 text-xs font-semibold leading-snug text-muted-foreground">Capture happens inside Waste, Markdown, Receiving, or Stock Count.</p>
            </SectionCard>
            <SectionCard>
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">My work</p>
              <p className="mt-2 text-sm font-bold leading-snug text-foreground">Current local work status for this device.</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <MetricPill label="Open tasks" value={workSummary.openTasks} />
                <MetricPill label="Waiting sync" value={workSummary.waitingSync} />
                <MetricPill label="Blocked" value={workSummary.blocked} />
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

