import React, { useEffect, useMemo, useState } from "react";
import { Bell, Minus, PackageSearch, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getScanOpsSession } from "../lib/scanOpsSession";
import { writeReorderBatchRecord } from "../lib/scanOpsRecordWriter";
import { ensureInventoryLoaded, resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { getShelfNeedSnapshot } from "../lib/scanOpsReplenishment";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import PageHeader from "../components/scanner/PageHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import {
  DoneCard,
  EmptyState,
  InfoLine,
  OperatorAlert,
  PageShell,
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

function OrderLineCard({ line, onQuantityChange, onReasonChange, onRemove }) {
  const item = line.item || {};
  const identity = [item.sku && `SKU ${item.sku}`, item.barcode && `Barcode ${item.barcode}`].filter(Boolean).join(" · ") || "—";
  const unit = line.unit || item.unitType || "each";
  return (
    <div className="rounded-2xl bg-secondary/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-black text-foreground">{item.name || item.item_name || "Scanned item"}</p>
          <p className="mt-0.5 break-all font-mono text-[10px] text-muted-foreground">{identity}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">Shelf {line.shelfStock ?? "—"} · Backroom {line.backroomStock ?? "—"} · Below {line.threshold ?? "—"}</p>
        </div>
        <button type="button" onClick={onRemove} className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-card text-muted-foreground active:bg-border" aria-label={`Remove ${item.name || "line"}`}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-[3rem_1fr_3rem] gap-2">
        <button type="button" onClick={() => onQuantityChange(Math.max(0, Number(line.quantity || 0) - 1))} className="flex min-h-11 items-center justify-center rounded-2xl bg-card font-black active:bg-border" aria-label={`Decrease quantity for ${item.name}`}>
          <Minus className="h-4 w-4" />
        </button>
        <div className="flex min-h-11 flex-col items-center justify-center rounded-2xl bg-card px-2">
          <span className="text-xl font-black leading-none text-foreground">{line.quantity}</span>
          <span className="mt-0.5 text-[10px] font-semibold text-muted-foreground">{unit}</span>
        </div>
        <button type="button" onClick={() => onQuantityChange(Number(line.quantity || 0) + 1)} className="flex min-h-11 items-center justify-center rounded-2xl bg-card font-black active:bg-border" aria-label={`Increase quantity for ${item.name}`}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2">
        <TouchSelect
          label="Reason"
          value={line.reason}
          onChange={onReasonChange}
          options={REORDER_REASONS}
          placeholder="Select reason"
        />
      </div>
    </div>
  );
}

export default function Order() {
  const [mode, setMode] = useState("review"); // "review" | "request"
  const [flags, setFlags] = useState([]);
  const [loadingFlags, setLoadingFlags] = useState(true);
  const [scanValue, setScanValue] = useState("");
  const [batch, setBatch] = useState([]);
  const [notes, setNotes] = useState("");
  const [savedResult, setSavedResult] = useState(null);
  const [operatorError, setOperatorError] = useState(null);
  const [lastScanned, setLastScanned] = useState(null);

  useEffect(() => { ensureInventoryLoaded(); }, []);

  const loadFlags = async () => {
    setLoadingFlags(true);
    try {
      const rows = await base44.entities.ReorderFlag.list("-created_date", 100);
      setFlags((rows || []).filter((r) => ACTIVE_FLAG_STATUSES.includes(r.status)));
    } catch {
      setFlags([]);
    } finally {
      setLoadingFlags(false);
    }
  };

  useEffect(() => { loadFlags(); }, []);

  const totalUnits = useMemo(() => batch.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0), [batch]);

  const lineKey = (item) => item?.internalItemId || item?.id || item?.sku || item?.barcode || item?.name;

  const scan = (value) => {
    const found = typeof value === "object" ? value : resolveInventoryIdentity(String(value || "").trim());
    if (!found) return;
    setOperatorError(null);
    const need = getShelfNeedSnapshot(found);
    const key = lineKey(found);
    setBatch((prev) => {
      const existing = prev.find((l) => lineKey(l.item) === key);
      if (existing) {
        return prev.map((l) => (lineKey(l.item) === key ? { ...l, quantity: Number(l.quantity || 0) + 1 } : l));
      }
      return [...prev, {
        item: found,
        quantity: Math.max(0, Number(need?.recommendedMove || 1)),
        reason: "below_min",
        unit: found.unitType || need?.unit || "each",
        shelfStock: need?.shelf ?? found.shelfStock ?? null,
        backroomStock: need?.backroom ?? found.backroomStock ?? null,
        threshold: need?.shelfNeed ?? found.reorderPoint ?? null,
      }];
    });
    setLastScanned(found.name || found.item_name || "Item");
    setScanValue("");
  };

  const startNewRequest = () => {
    setMode("request");
    setBatch([]);
    setScanValue("");
    setNotes("");
    setSavedResult(null);
    setOperatorError(null);
    setLastScanned(null);
  };

  const backToReview = () => {
    setMode("review");
    setBatch([]);
    setScanValue("");
    setNotes("");
    setSavedResult(null);
    setOperatorError(null);
    setLastScanned(null);
    loadFlags();
  };

  const updateLineQuantity = (key, next) => {
    setBatch((prev) => prev.map((l) => (lineKey(l.item) === key ? { ...l, quantity: Number(next || 0) } : l)));
  };

  const updateLineReason = (key, reason) => {
    setBatch((prev) => prev.map((l) => (lineKey(l.item) === key ? { ...l, reason } : l)));
  };

  const removeLine = (key) => {
    setBatch((prev) => prev.filter((l) => lineKey(l.item) !== key));
  };

  const updateFlagStatus = async (flag, status) => {
    try { await base44.entities.ReorderFlag.update(flag.id, { status }); } catch { /* ignore */ }
    setFlags((prev) => prev.filter((f) => f.id !== flag.id));
  };

  const submitOrder = async () => {
    if (batch.length === 0) {
      setOperatorError({ title: "Order is empty", helper: "Scan at least one item before submitting the order request." });
      return;
    }
    const invalid = batch.find((l) => !l.quantity || Number(l.quantity) <= 0);
    if (invalid) {
      setOperatorError({ title: "Quantity missing", helper: `Set a quantity for ${invalid.item?.name || "a line"} before submitting.` });
      return;
    }
    setOperatorError(null);
    const session = getScanOpsSession();
    const orderRequestId = `ord_req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // One evidence-only ScanOpsRecord for the whole batch — no PO, no stock mutation.
    writeReorderBatchRecord({
      orderRequestId,
      lines: batch,
      notes,
      storeId: session.storeId,
      actorName: session.actorName,
      actorRole: session.actorRole,
    });

    // Update/create a ReorderFlag per line, linking to the order request so the flag list reflects it.
    for (const line of batch) {
      const existing = flags.find((f) => f.sku && line.item.sku && f.sku === line.item.sku);
      try {
        if (existing) {
          await base44.entities.ReorderFlag.update(existing.id, { status: "ordered", notes: `Order ${orderRequestId}` });
        } else {
          await base44.entities.ReorderFlag.create({
            itemId: line.item.internalItemId || line.item.id,
            itemName: line.item.name,
            sku: line.item.sku,
            barcode: line.item.barcode,
            shelfStock: line.shelfStock ?? 0,
            backroomStock: line.backroomStock ?? 0,
            threshold: line.threshold ?? 0,
            unit: line.unit,
            flaggedBy: session.actorName,
            flaggedByRole: session.actorRole,
            storeId: session.storeId,
            status: "ordered",
            notes: `Order ${orderRequestId}`,
          });
        }
      } catch { /* best-effort flag sync */ }
    }

    setSavedResult({ lineCount: batch.length, totalUnits, orderRequestId });
    setBatch([]);
    setNotes("");
    setScanValue("");
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
                  <p className="text-sm font-black text-foreground">New order request</p>
                  <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">Scan items into the order list, adjust quantities, then submit as one request. Queued for Inventory Desktop — no PO created here.</p>
                </div>
                <button type="button" onClick={backToReview} className="shrink-0 rounded-xl bg-secondary px-3 py-2 text-xs font-black text-secondary-foreground active:bg-border">Back to flags</button>
              </div>
              {lastScanned && !savedResult && <p className="text-[11px] font-bold text-primary">Added: {lastScanned}</p>}
            </SectionCard>

            {operatorError && <OperatorAlert title={operatorError.title} helper={operatorError.helper} actions={[{ label: "Keep Editing", onClick: () => setOperatorError(null), variant: "primary" }]} />}

            {savedResult ? (
              <DoneCard
                title="Order request submitted"
                helper="Saved locally. Pending future desktop handoff; no purchase order was created by handheld."
                rows={[
                  { label: "Lines", value: `${savedResult.lineCount} item${savedResult.lineCount === 1 ? "" : "s"}` },
                  { label: "Total units", value: `${savedResult.totalUnits}` },
                  { label: "Request ID", value: savedResult.orderRequestId },
                  { label: "Handoff", value: "Pending future handoff" },
                ]}
              />
            ) : (
              <>
                <SectionCard className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Order list</p>
                      <p className="mt-1 text-2xl font-black text-foreground">{batch.length} {batch.length === 1 ? "line" : "lines"}</p>
                    </div>
                    <div className="shrink-0 rounded-2xl bg-secondary px-3 py-2 text-center">
                      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Total units</p>
                      <p className="text-lg font-black text-foreground">{totalUnits}</p>
                    </div>
                  </div>
                  {batch.length > 0 ? (
                    <div className="space-y-2">
                      {batch.map((line) => (
                        <OrderLineCard
                          key={lineKey(line.item)}
                          line={line}
                          onQuantityChange={(next) => updateLineQuantity(lineKey(line.item), next)}
                          onReasonChange={(reason) => updateLineReason(lineKey(line.item), reason)}
                          onRemove={() => removeLine(lineKey(line.item))}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="Order list is empty." helper="Scan or search an item above to add it to the order." />
                  )}
                </SectionCard>

                {batch.length > 0 && (
                  <SectionCard className="space-y-2">
                    <label className="block min-w-0">
                      <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Notes (optional)</span>
                      <textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        rows={2}
                        placeholder="Example: Promo next week, urgent fill."
                        className="mt-2 w-full min-w-0 resize-none rounded-2xl border border-input bg-card px-4 py-3 text-sm font-bold text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                  </SectionCard>
                )}
              </>
            )}

            <StickyActions
              leftLabel={savedResult ? "Back to flags" : "Cancel"}
              rightLabel={savedResult ? "New request" : "Submit order"}
              onLeft={backToReview}
              onRight={savedResult ? startNewRequest : submitOrder}
              rightDisabled={!savedResult && batch.length === 0}
            />
          </>
        )}
      </WorkflowMain>
    </PageShell>
  );
}