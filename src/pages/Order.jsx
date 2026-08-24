import React, { useEffect, useMemo, useState } from "react";
import { Bell, PackageSearch, ShoppingCart } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getScanOpsSession } from "../lib/scanOpsSession";
import { writeReorderRequestRecord } from "../lib/scanOpsRecordWriter";
import { ensureInventoryLoaded, resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { getShelfNeedSnapshot } from "../lib/scanOpsReplenishment";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import PageHeader from "../components/scanner/PageHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import {
  DoneCard,
  EmptyState,
  FieldError,
  InfoLine,
  ItemSummaryCard,
  MetricPill,
  OperatorAlert,
  PageShell,
  QuantityStepper,
  SectionCard,
  StickyActions,
  WorkflowMain,
} from "../components/scanner/WorkflowPrimitives";

const REORDER_REASONS = [
  { id: "below_min", label: "Below minimum", helper: "Stock below reorder point" },
  { id: "shelf_empty", label: "Shelf empty", helper: "Zero shelf stock" },
  { id: "fast_mover", label: "Fast mover", helper: "High velocity item" },
  { id: "promo_demand", label: "Promo demand", helper: "Upcoming promotion" },
  { id: "supplier_shortage", label: "Supplier shortage", helper: "Known supply gap" },
  { id: "manual", label: "Manual", helper: "Operator judgement" },
];

const ACTIVE_FLAG_STATUSES = ["open", "acknowledged"];

function statusBadge(status) {
  if (status === "ordered") return "Ordered";
  if (status === "acknowledged") return "Acknowledged";
  return "Open";
}

function ReorderFlagCard({ flag, onAcknowledge, onOrder, onDismiss }) {
  const identity = [flag.sku && `SKU ${flag.sku}`, flag.barcode && `Barcode ${flag.barcode}`].filter(Boolean).join(" · ") || "—";
  const stockLine = `Shelf ${flag.shelfStock ?? "—"} · Backroom ${flag.backroomStock ?? "—"} · Below ${flag.threshold ?? "—"}`;
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-amber-900">{flag.itemName}</p>
          <p className="mt-0.5 break-all font-mono text-[10px] text-amber-700">{identity}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-amber-700">{stockLine} {flag.unit || ""}</p>
          {flag.flaggedBy && <p className="mt-0.5 text-[10px] font-bold text-amber-600">Flagged by {flag.flaggedBy}{flag.flaggedByRole ? ` · ${flag.flaggedByRole}` : ""}</p>}
        </div>
        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-amber-800">{statusBadge(flag.status)}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button type="button" onClick={onAcknowledge} disabled={flag.status === "acknowledged"} className="min-h-9 rounded-xl bg-amber-100 px-2 text-[11px] font-black text-amber-800 active:bg-amber-200 disabled:opacity-40">Acknowledge</button>
        <button type="button" onClick={onOrder} className="min-h-9 rounded-xl bg-primary px-2 text-[11px] font-black text-primary-foreground active:scale-[0.98]">Mark Ordered</button>
        <button type="button" onClick={onDismiss} className="min-h-9 rounded-xl bg-secondary px-2 text-[11px] font-black text-secondary-foreground active:bg-border">Dismiss</button>
      </div>
    </div>
  );
}

export default function Order() {
  const [mode, setMode] = useState("review"); // "review" | "request"
  const [flags, setFlags] = useState([]);
  const [loadingFlags, setLoadingFlags] = useState(true);
  const [scanValue, setScanValue] = useState("");
  const [item, setItem] = useState(null);
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState("below_min");
  const [notes, setNotes] = useState("");
  const [savedResult, setSavedResult] = useState(null);
  const [operatorError, setOperatorError] = useState(null);

  useEffect(() => { ensureInventoryLoaded(); }, []);

  const loadFlags = async () => {
    setLoadingFlags(true);
    try {
      const rows = await base44.entities.ReorderFlag.list("-created_date", 100);
      const active = (rows || []).filter((r) => ACTIVE_FLAG_STATUSES.includes(r.status));
      setFlags(active);
    } catch {
      setFlags([]);
    } finally {
      setLoadingFlags(false);
    }
  };

  useEffect(() => { loadFlags(); }, []);

  const need = useMemo(() => (item ? getShelfNeedSnapshot(item) : null), [item]);

  const scan = (value) => {
    const found = typeof value === "object" ? value : resolveInventoryIdentity(String(value || "").trim());
    if (!found) return;
    setOperatorError(null);
    setItem(found);
    setQuantity(Math.max(0, Number(need?.recommendedMove || 0)));
    setSavedResult(null);
  };

  const startNewRequest = () => {
    setMode("request");
    setItem(null);
    setScanValue("");
    setQuantity(0);
    setReason("below_min");
    setNotes("");
    setSavedResult(null);
    setOperatorError(null);
  };

  const backToReview = () => {
    setMode("review");
    setItem(null);
    setScanValue("");
    setNotes("");
    setSavedResult(null);
    setOperatorError(null);
    loadFlags();
  };

  const updateFlagStatus = async (flag, status) => {
    try {
      await base44.entities.ReorderFlag.update(flag.id, { status });
    } catch { /* ignore */ }
    setFlags((prev) => prev.filter((f) => f.id !== flag.id));
  };

  const submitRequest = () => {
    if (!item) {
      setOperatorError({ title: "Item required", helper: "Scan or search an item before submitting a reorder request." });
      return;
    }
    if (quantity === "" || Number.isNaN(Number(quantity)) || Number(quantity) <= 0) {
      setOperatorError({ title: "Quantity missing", helper: "Enter a valid requested quantity before submitting." });
      return;
    }
    setOperatorError(null);
    const session = getScanOpsSession();
    const unit = item.unitType || need?.unit || "each";
    const reasonLabel = REORDER_REASONS.find((r) => r.id === reason)?.label || reason;

    // Create / update a ReorderFlag so the request flows through the existing lifecycle.
    const existing = flags.find((f) => f.sku && item.sku && f.sku === item.sku);
    const flagPromise = existing
      ? base44.entities.ReorderFlag.update(existing.id, { status: "ordered", notes: notes || existing.notes }).catch(() => {})
      : base44.entities.ReorderFlag.create({
          itemId: item.internalItemId || item.id,
          itemName: item.name,
          sku: item.sku,
          barcode: item.barcode,
          shelfStock: need?.shelf ?? 0,
          backroomStock: need?.backroom ?? 0,
          threshold: need?.shelfNeed ?? 0,
          unit,
          flaggedBy: session.actorName,
          flaggedByRole: session.actorRole,
          storeId: session.storeId,
          status: "ordered",
          notes,
        }).catch(() => {});

    // Evidence-only ScanOpsRecord — no PO created, no stock mutation.
    writeReorderRequestRecord({
      item,
      requestedQty: Number(quantity),
      reason: reasonLabel,
      notes,
      threshold: need?.shelfNeed ?? 0,
      shelfStock: need?.shelf ?? 0,
      backroomStock: need?.backroom ?? 0,
      unit,
    });

    setSavedResult({
      itemName: item.name,
      quantity: Number(quantity),
      unit,
      reason: reasonLabel,
      flagId: existing?.id,
    });
    setItem(null);
    setScanValue("");
    setNotes("");
    setQuantity(0);
    // Refresh flags after the flag write settles
    flagPromise?.then?.(() => loadFlags());
  };

  const openCount = flags.filter((f) => f.status === "open").length;
  const acknowledgedCount = flags.filter((f) => f.status === "acknowledged").length;

  return (
    <PageShell className="bold-blocks">
      <PageHeader title="Order" subtitle="Review flags and submit reorder requests" />
      <WorkflowHeader
        title="Order"
        subtitle="Review flags and submit reorder requests"
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={scan}
        showHeaderChrome={false}
        showSearch={mode === "request"}
      />
      <WorkflowMain>
        {mode === "review" ? (
          <>
            <SectionCard className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-foreground">Reorder flags</p>
                  <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">Review open flags, mark ordered, or submit a new reorder request. Evidence only — no purchase order is created.</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="rounded-2xl bg-secondary px-3 py-2 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Open</p>
                    <p className="text-lg font-black text-foreground">{openCount}</p>
                  </div>
                  <div className="rounded-2xl bg-secondary px-3 py-2 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Ack</p>
                    <p className="text-lg font-black text-foreground">{acknowledgedCount}</p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={startNewRequest}
                className="flex w-full min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground active:scale-[0.98]"
              >
                <ShoppingCart className="h-4 w-4" />
                New request
              </button>
            </SectionCard>

            {operatorError && <OperatorAlert title={operatorError.title} helper={operatorError.helper} actions={[{ label: "Dismiss", onClick: () => setOperatorError(null), variant: "primary" }]} />}

            {loadingFlags ? (
              <EmptyState title="Loading reorder flags…" />
            ) : flags.length > 0 ? (
              <SectionCard className="space-y-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-amber-600" />
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Open flags</p>
                </div>
                <div className="space-y-2">
                  {flags.map((flag) => (
                    <ReorderFlagCard
                      key={flag.id}
                      flag={flag}
                      onAcknowledge={() => updateFlagStatus(flag, "acknowledged")}
                      onOrder={() => updateFlagStatus(flag, "ordered")}
                      onDismiss={() => updateFlagStatus(flag, "dismissed")}
                    />
                  ))}
                </div>
              </SectionCard>
            ) : (
              <EmptyState title="No open reorder flags." helper="Submit a new request when shelf stock falls below threshold." />
            )}
          </>
        ) : (
          <>
            <SectionCard className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-foreground">New reorder request</p>
                  <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">Scan item, confirm quantity and reason, submit. Queued for Inventory Desktop — no PO created here.</p>
                </div>
                <button type="button" onClick={backToReview} className="shrink-0 rounded-xl bg-secondary px-3 py-2 text-xs font-black text-secondary-foreground active:bg-border">Back to flags</button>
              </div>
            </SectionCard>

            {operatorError && <OperatorAlert title={operatorError.title} helper={operatorError.helper} actions={[{ label: "Keep Editing", onClick: () => setOperatorError(null), variant: "primary" }]} />}

            {savedResult ? (
              <DoneCard
                title="Reorder request submitted"
                helper="Saved locally. Pending future desktop handoff; no purchase order was created by handheld."
                rows={[
                  { label: "Item", value: savedResult.itemName },
                  { label: "Qty requested", value: `${savedResult.quantity} ${savedResult.unit}` },
                  { label: "Reason", value: savedResult.reason },
                  { label: "Handoff", value: "Pending future handoff" },
                ]}
              />
            ) : item ? (
              <>
                <ItemSummaryCard item={item} />
                <SectionCard className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <PackageSearch className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-foreground">Stock evidence</p>
                      <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">Read-only snapshot. Live inventory is not changed here.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <MetricPill label="Shelf" value={need?.shelf ?? "—"} suffix={need?.shelf == null ? "" : need.unit} />
                    <MetricPill label="Backroom" value={need?.backroom ?? "—"} suffix={need?.backroom == null ? "" : need.unit} />
                    <MetricPill label="SOH" value={need?.soh ?? need?.shelf ?? "—"} suffix={(need?.soh ?? need?.shelf) == null ? "" : need.unit} />
                  </div>
                  <div className="rounded-2xl bg-secondary/60 p-3">
                    <InfoLine label="Shelf location" value={need?.shelfLocation || "—"} />
                    <InfoLine label="Reorder point" value={item.reorderPoint ?? "—"} />
                    <InfoLine label="Min stock" value={item.minimumStock ?? "—"} />
                  </div>
                </SectionCard>

                <QuantityStepper label="Qty requested" value={quantity} onChange={(v) => { setQuantity(v); if (operatorError?.title === "Quantity missing") setOperatorError(null); }} unit={need?.unit || item.unitType || "each"} min={0} />
                {(quantity === "" || Number.isNaN(Number(quantity)) || Number(quantity) <= 0) && <FieldError title="Quantity missing" helper="Enter a valid requested quantity before submitting." />}

                <TouchSelect
                  label="Reason"
                  value={reason}
                  onChange={setReason}
                  options={REORDER_REASONS}
                  placeholder="Select reason"
                />

                <SectionCard className="space-y-3">
                  <label className="block min-w-0">
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Notes (optional)</span>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={2}
                      placeholder="Example: Promo next week, need 3 cases."
                      className="mt-2 w-full min-w-0 resize-none rounded-2xl border border-input bg-card px-4 py-3 text-sm font-bold text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                </SectionCard>
              </>
            ) : (
              <EmptyState title="No item selected." helper="Scan or search an item to start a reorder request." />
            )}

            <StickyActions
              leftLabel={savedResult ? "Back to flags" : "Cancel"}
              rightLabel={savedResult ? "New request" : "Submit request"}
              onLeft={savedResult ? backToReview : backToReview}
              onRight={savedResult ? startNewRequest : submitRequest}
              rightDisabled={!item && !savedResult}
            />
          </>
        )}
      </WorkflowMain>
    </PageShell>
  );
}