import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, BellOff, ClipboardList, MapPin, PackageCheck, PackageX, ShieldAlert, Warehouse } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getScanOpsSession } from "../lib/scanOpsSession";
import { writeReplenishRecord, writeReorderFlagRecord } from "../lib/scanOpsRecordWriter";
import { ensureInventoryLoaded } from "../lib/inventorySystemAdapter";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import PageHeader from "../components/scanner/PageHeader";
import { BatchList, DoneCard, EmptyState, FieldError, InfoLine, ItemSummaryCard, MetricPill, OperatorAlert, PageShell, QuantityStepper, SectionCard, StickyActions, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import {
  getOpenReplenishmentTasks,
  getReplenishmentAction,
  getReplenishmentTasks,
  getShelfNeedSnapshot,
  REPLENISHMENT_ACTIONS,
  REPLENISHMENT_OUTCOMES,
  saveReplenishmentAction,
} from "../lib/scanOpsReplenishment";

const REORDER_SETTING_KEY = "invyra_scanops_reorder_threshold_v1";

function readReorderSetting() {
  try {
    const raw = window.localStorage.getItem(REORDER_SETTING_KEY);
    return raw ? JSON.parse(raw) : { enabled: false, threshold: 5 };
  } catch {
    return { enabled: false, threshold: 5 };
  }
}

function writeReorderSetting(setting) {
  try {
    window.localStorage.setItem(REORDER_SETTING_KEY, JSON.stringify(setting));
  } catch {
    // ignore
  }
}

function checkReorderFlag(item, threshold) {
  const need = getShelfNeedSnapshot(item);
  const relevant = need.shelf != null ? need.shelf : (need.backroom ?? 0);
  return relevant < threshold;
}

async function fireThresholdNotification(itemName, shelf, threshold, unit) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
  if (Notification.permission === "granted") {
    new Notification("⚠️ Low Stock Alert — ScanOps", {
      body: `${itemName}: shelf stock ${shelf ?? 0} ${unit} is below minimum threshold of ${threshold} ${unit}.`,
      icon: "/favicon.ico",
      tag: `reorder_${itemName}`,
    });
  }
}

const ISSUE_OPTIONS = [
  { id: "shelf_low", label: "Shelf low" },
  { id: "shelf_empty", label: "Shelf empty" },
  { id: "gap_found", label: "Gap found" },
  { id: "promo_fill", label: "Promo fill" },
  { id: "customer_request", label: "Customer request" },
  { id: "manual_check", label: "Manual check" },
];

const ACTION_ICON = {
  [REPLENISHMENT_OUTCOMES.TASK_CREATED]: ClipboardList,
  [REPLENISHMENT_OUTCOMES.SHELF_FILLED]: PackageCheck,
  [REPLENISHMENT_OUTCOMES.SHORT_FILL]: AlertTriangle,
  [REPLENISHMENT_OUTCOMES.NO_BACKROOM_STOCK]: PackageX,
  [REPLENISHMENT_OUTCOMES.DAMAGED_STOCK]: AlertTriangle,
  [REPLENISHMENT_OUTCOMES.WRONG_LOCATION]: MapPin,
  [REPLENISHMENT_OUTCOMES.MANAGER_REVIEW]: ShieldAlert,
};

function pillTone(value) {
  const normalized = String(value || "").toLowerCase();
  if (["empty", "no stock", "exception", "review required"].includes(normalized)) return "bg-destructive/10 text-destructive border-destructive/20";
  if (["low", "partial"].includes(normalized)) return "bg-amber-100 text-amber-800 border-amber-200";
  if (["available", "ok", "pending sync"].includes(normalized)) return "bg-primary/10 text-primary border-primary/20";
  return "bg-secondary text-muted-foreground border-border";
}

function ActionButton({ action, active, onClick }) {
  const Icon = ACTION_ICON[action.id] || ClipboardList;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[4.5rem] rounded-2xl border p-3 text-left active:scale-[0.99] ${
        active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-card text-foreground active:bg-secondary"
      }`}
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="break-words text-xs font-black leading-tight">{action.label}</p>
          <p className={`mt-1 text-[10px] font-semibold leading-snug ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{action.helper}</p>
        </div>
      </div>
    </button>
  );
}

function IssueButton({ option, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-10 rounded-xl px-2 text-xs font-black active:scale-[0.98] ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground active:bg-border"}`}
    >
      {option.label}
    </button>
  );
}

function ShelfNeedCard({ item, quantity, setQuantity, reorderSetting }) {
  const need = useMemo(() => getShelfNeedSnapshot(item), [item]);
  const recommended = Number(need.recommendedMove || 0);
  const isBelowThreshold = reorderSetting?.enabled && need.shelf != null && need.shelf < reorderSetting.threshold;
  const isNearThreshold = reorderSetting?.enabled && need.shelf != null && !isBelowThreshold && need.shelf < reorderSetting.threshold * 1.5;

  return (
    <SectionCard className={`space-y-3 ${isBelowThreshold ? "border-red-300 bg-red-50/40" : isNearThreshold ? "border-amber-200 bg-amber-50/30" : ""}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${isBelowThreshold ? "bg-red-100 text-red-600" : isNearThreshold ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary"}`}>
          <Warehouse className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-foreground">Shelf / backroom need</p>
          <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">Evidence only. Live inventory is not changed here.</p>
        </div>
        {isBelowThreshold && (
          <span className="shrink-0 rounded-xl bg-red-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-red-700">⚠ Below min</span>
        )}
        {isNearThreshold && (
          <span className="shrink-0 rounded-xl bg-amber-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700">Near min</span>
        )}
      </div>

      {isBelowThreshold && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-100 px-3 py-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <p className="text-xs font-black text-red-800">Shelf stock ({need.shelf} {need.unit}) is below the minimum threshold of {reorderSetting.threshold} {need.unit}.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className={`rounded-2xl border px-3 py-2 ${isBelowThreshold ? "border-red-300 bg-red-100 text-red-800" : pillTone(need.shelfState)}`}>
          <p className="text-[10px] font-black uppercase tracking-wider opacity-80">Shelf state</p>
          <p className="mt-0.5 text-sm font-black">{need.shelfState}</p>
        </div>
        <div className={`rounded-2xl border px-3 py-2 ${pillTone(need.backroomState)}`}>
          <p className="text-[10px] font-black uppercase tracking-wider opacity-80">Backroom</p>
          <p className="mt-0.5 text-sm font-black">{need.backroomState}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className={`min-w-0 rounded-2xl px-3 py-2 ${isBelowThreshold ? "bg-red-100" : isNearThreshold ? "bg-amber-100" : "bg-secondary/70"}`}>
          <p className={`text-[10px] font-black uppercase tracking-wider ${isBelowThreshold ? "text-red-700" : isNearThreshold ? "text-amber-700" : "text-muted-foreground"}`}>Shelf stock</p>
          <p className={`mt-0.5 truncate text-sm font-black ${isBelowThreshold ? "text-red-800" : isNearThreshold ? "text-amber-800" : "text-foreground"}`}>{need.shelf ?? "—"}{need.shelf != null ? ` ${need.unit}` : ""}</p>
        </div>
        <MetricPill label="Need" value={need.shelfNeed ?? "—"} suffix={need.shelfNeed == null ? "" : need.unit} />
        <MetricPill label="Suggested" value={recommended || "—"} suffix={recommended ? need.unit : ""} />
      </div>

      <div className="rounded-2xl bg-secondary/60 p-3">
        <InfoLine label="Shelf location" value={need.shelfLocation} />
        <InfoLine label="Backroom source" value={need.backroomLocation} />
        <InfoLine label="Planogram" value={need.planogramStatus} />
      </div>

      <QuantityStepper label="Qty evidenced / requested" value={quantity} onChange={setQuantity} unit={need.unit} min={0} />
    </SectionCard>
  );
}

function RecentReplenishmentList({ records }) {
  return (
    <BatchList
      title="Replenishment activity"
      items={records.slice(0, 8).map((task) => ({
        ...task,
        quantity: task.quantityMoved,
        reason: `${task.status} · ${task.outcomeLabel}`,
        item: {
          itemName: task.itemName || task.item_name,
          raw: task.item_snapshot,
          unit: task.unit,
        },
      }))}
      emptyText="No replenishment activity yet."
      renderMeta={(line) => `${line.status} · ${line.sourceLocation || "Backroom"} → ${line.destinationLocation || "Shelf"}`}
    />
  );
}

export default function Replenish() {
  const [scanValue, setScanValue] = useState("");
  const [item, setItem] = useState(null);
  const [issue, setIssue] = useState("shelf_low");
  const [quantity, setQuantity] = useState(0);
  const [actionId, setActionId] = useState(REPLENISHMENT_OUTCOMES.TASK_CREATED);
  const [notes, setNotes] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [records, setRecords] = useState(() => getReplenishmentTasks());
  const [savedResult, setSavedResult] = useState(null);
  const [operatorError, setOperatorError] = useState(null);
  const [continuousScan, setContinuousScan] = useState(false);
  const [reorderSetting, setReorderSetting] = useState(() => readReorderSetting());
  const [reorderFlags, setReorderFlags] = useState([]);
  const [showReorderSettings, setShowReorderSettings] = useState(false);

  // Warm DB inventory cache on mount
  useEffect(() => { ensureInventoryLoaded(); }, []);

  // Load persisted reorder flags from DB on mount
  useEffect(() => {
    base44.entities.ReorderFlag.filter({ status: "open" }, "-created_date", 50)
      .then((rows) => {
        if (rows && rows.length > 0) {
          setReorderFlags(rows.map((r) => ({
            id: r.id,
            name: r.itemName,
            sku: r.sku,
            barcode: r.barcode,
            shelf: r.shelfStock,
            backroom: r.backroomStock,
            threshold: r.threshold,
            unit: r.unit,
            flaggedAt: r.created_date,
          })));
        }
      })
      .catch(() => {});
  }, []);

  const selectedAction = getReplenishmentAction(actionId);
  const openCount = getOpenReplenishmentTasks().length;

  const updateReorderSetting = (next) => {
    setReorderSetting(next);
    writeReorderSetting(next);
  };

  const scan = (value) => {
    const found = typeof value === "object" ? value : resolveInventoryIdentity(String(value || "").trim());
    if (!found) return;
    setOperatorError(null);
    const need = getShelfNeedSnapshot(found);
    setItem(found);
    setQuantity(Math.max(0, Number(need.recommendedMove || 0)));
    setSavedResult(null);
    setOperatorError(null);
    // Auto-flag for reorder if threshold setting is enabled
    if (reorderSetting.enabled && checkReorderFlag(found, reorderSetting.threshold)) {
      setReorderFlags((prev) => {
        const alreadyFlagged = prev.some((f) => f.sku === found.sku && f.barcode === found.barcode && f.name === found.name);
        if (alreadyFlagged) return prev;
        fireThresholdNotification(found.name, need.shelf, reorderSetting.threshold, need.unit);
        // Persist to DB
        const session = getScanOpsSession();
        base44.entities.ReorderFlag.create({
          itemId: found.internalItemId || found.id,
          itemName: found.name,
          sku: found.sku,
          barcode: found.barcode,
          shelfStock: need.shelf,
          backroomStock: need.backroom,
          threshold: reorderSetting.threshold,
          unit: need.unit,
          flaggedBy: session.actorName,
          flaggedByRole: session.actorRole,
          storeId: session.storeId,
          status: "open",
        }).catch(() => {});
        return [{ id: `reorder_${Date.now()}`, name: found.name, sku: found.sku, barcode: found.barcode, shelf: need.shelf, backroom: need.backroom, threshold: reorderSetting.threshold, unit: need.unit, flaggedAt: new Date().toISOString() }, ...prev];
      });
    }
  };

  const clearItem = () => {
    setItem(null);
    setScanValue("");
    setNotes("");
    setEvidenceNote("");
    setSavedResult(null);
    setOperatorError(null);
  };

  const handleNewScanWhileActive = (nextItem) => {
    // Auto-submit with current values then load new item
    if (item && actionId && !(quantity === "" || Number.isNaN(Number(quantity)) || Number(quantity) < 0)) {
      const issueLabel = ISSUE_OPTIONS.find((o) => o.id === issue)?.label || issue;
      const result = saveReplenishmentAction({ item, actionId, quantity, issueReason: issueLabel, notes, evidenceNote });
      if (result) {
        setRecords(result.tasks);
        setSavedResult({ ...result.task, syncStatusLabel: result.event?.syncRecord?.statusLabel || "Pending future handoff" });
      }
    }
    scan(nextItem);
  };

  const submitAction = () => {
    if (!item) {
      setOperatorError({ title: "Item required", helper: "Scan or search an item before saving replenishment work." });
      return;
    }
    if (quantity === "" || Number.isNaN(Number(quantity)) || Number(quantity) < 0) {
      setOperatorError({ title: "Quantity missing", helper: "Enter a valid quantity before saving. Your item stays on screen." });
      return;
    }
    if (!actionId) {
      setOperatorError({ title: "Action required", helper: "Choose what happened before saving the replenishment result." });
      return;
    }
    setOperatorError(null);
    const issueLabel = ISSUE_OPTIONS.find((option) => option.id === issue)?.label || issue;
    const result = saveReplenishmentAction({ item, actionId, quantity, issueReason: issueLabel, notes, evidenceNote });
    if (!result) return;
    writeReplenishRecord({ item, quantity: Number(quantity), unit: item?.unitType || "each", outcome: actionId, notes });
    setRecords(result.tasks);
    setSavedResult({ ...result.task, syncStatusLabel: result.event?.syncRecord?.statusLabel || "Pending future handoff" });
    setItem(null);
    setScanValue("");
    setNotes("");
    setEvidenceNote("");
  };

  return (
    <PageShell>
      <PageHeader title="Replenishment" subtitle="Backroom-to-shelf execution" />
      <WorkflowHeader
        title="Replenishment"
        subtitle="Backroom-to-shelf execution"
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={scan}
        showHeaderChrome={false}
        continuousScan={continuousScan}
        onContinuousScanChange={setContinuousScan}
        hasActiveItem={!!item}
        onNewScanWhileItemActive={handleNewScanWhileActive}
      />
      <WorkflowMain>
        {operatorError && <OperatorAlert title={operatorError.title} helper={operatorError.helper} tone={operatorError.tone || "warning"} actions={[{ label: "Keep Editing", onClick: () => setOperatorError(null), variant: "primary" }]} />}
        <SectionCard className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-black text-foreground">Replenishment action</p>
              <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">Scan item, confirm quantity, save local evidence.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowReorderSettings((v) => !v)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition-colors active:scale-[0.98] ${reorderSetting.enabled ? "bg-amber-100 text-amber-800" : "bg-secondary text-muted-foreground"}`}
                title="Reorder threshold settings"
              >
                {reorderSetting.enabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                Reorder
              </button>
              <div className="rounded-2xl bg-secondary px-3 py-2 text-center">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Open</p>
                <p className="text-lg font-black text-foreground">{openCount}</p>
              </div>
            </div>
          </div>

          {showReorderSettings && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black text-amber-900">Auto-flag for reorder below threshold</p>
                <button
                  type="button"
                  onClick={() => updateReorderSetting({ ...reorderSetting, enabled: !reorderSetting.enabled })}
                  className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-black transition-colors ${reorderSetting.enabled ? "bg-amber-600 text-white" : "bg-secondary text-muted-foreground"}`}
                >
                  {reorderSetting.enabled ? "ON" : "OFF"}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xs font-semibold text-amber-800 shrink-0">Min threshold</p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => updateReorderSetting({ ...reorderSetting, threshold: Math.max(1, reorderSetting.threshold - 1) })} className="h-8 w-8 rounded-xl bg-white border border-amber-200 text-amber-800 font-black text-sm active:bg-amber-100">−</button>
                  <span className="w-10 text-center text-sm font-black text-amber-900">{reorderSetting.threshold}</span>
                  <button type="button" onClick={() => updateReorderSetting({ ...reorderSetting, threshold: Math.min(999, reorderSetting.threshold + 1) })} className="h-8 w-8 rounded-xl bg-white border border-amber-200 text-amber-800 font-black text-sm active:bg-amber-100">+</button>
                </div>
                <p className="text-xs text-amber-700">units</p>
              </div>
              <p className="text-[11px] leading-snug text-amber-700">When enabled, scanning an item with shelf stock below this number automatically adds it to the reorder flag list below and triggers a push notification if allowed. Evidence only — no purchase order is created.</p>
              {"Notification" in window && Notification.permission === "default" && (
                <button type="button" onClick={() => Notification.requestPermission()} className="mt-1 w-full rounded-xl border border-amber-300 bg-white py-2 text-xs font-black text-amber-800 active:bg-amber-50">
                  Enable push notifications
                </button>
              )}
              {"Notification" in window && Notification.permission === "denied" && (
                <p className="text-[11px] text-red-600 font-semibold">Push notifications are blocked in your browser settings.</p>
              )}
            </div>
          )}
        </SectionCard>

        {reorderSetting.enabled && item && checkReorderFlag(item, reorderSetting.threshold) && (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2.5">
            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <p className="text-xs font-black text-amber-900">Reorder flag triggered</p>
              <p className="mt-0.5 text-xs font-semibold text-amber-700">Shelf stock is below the {reorderSetting.threshold}-unit threshold. Item added to reorder list.</p>
            </div>
          </div>
        )}

        {savedResult && (
          <DoneCard
            title={`${savedResult.outcomeLabel} saved`}
            helper="Saved locally. Pending future desktop handoff; no live stock was changed by handheld."
            rows={[
              { label: "Item", value: savedResult.itemName },
              { label: "Status", value: savedResult.status },
              { label: "Handoff", value: savedResult.syncStatusLabel || "Pending future handoff" },
              { label: "Qty evidence", value: `${savedResult.quantityMoved} ${savedResult.unit}` },
            ]}
          />
        )}

        {item ? (
          <>
            <ItemSummaryCard item={item} />
            <ShelfNeedCard item={item} quantity={quantity} setQuantity={(value) => { setQuantity(value); if (operatorError?.title === "Quantity missing") setOperatorError(null); }} reorderSetting={reorderSetting} />
            {(quantity === "" || Number.isNaN(Number(quantity)) || Number(quantity) < 0) && <FieldError title="Quantity missing" helper="Enter a valid quantity before saving." />}

            <SectionCard className="space-y-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Reason</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {ISSUE_OPTIONS.map((option) => <IssueButton key={option.id} option={option} active={issue === option.id} onClick={() => setIssue(option.id)} />)}
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Outcome</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {REPLENISHMENT_ACTIONS.map((action) => <ActionButton key={action.id} action={action} active={actionId === action.id} onClick={() => setActionId(action.id)} />)}
                </div>
              </div>
            </SectionCard>

            <SectionCard className="space-y-3">
              <label className="block min-w-0">
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Evidence note</span>
                <textarea
                  value={evidenceNote}
                  onChange={(event) => setEvidenceNote(event.target.value)}
                  rows={2}
                  placeholder="Example: Backroom rack checked, only 2 cases found."
                  className="mt-2 w-full min-w-0 resize-none rounded-2xl border border-input bg-card px-4 py-3 text-sm font-bold text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="block min-w-0">
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Operator note optional</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={2}
                  placeholder="Add detail only if useful."
                  className="mt-2 w-full min-w-0 resize-none rounded-2xl border border-input bg-card px-4 py-3 text-sm font-bold text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </SectionCard>
          </>
        ) : (
          <EmptyState title="No replenishment item selected." helper="Scan an item, confirm quantity and outcome, then save. No live stock changes are made here." />
        )}

        <RecentReplenishmentList records={records} />

        {reorderFlags.length > 0 && (
          <SectionCard className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-black text-foreground">Reorder Flags</p>
              </div>
              <button type="button" onClick={() => {
                setReorderFlags([]);
                base44.entities.ReorderFlag.filter({ status: "open" }).then((rows) => {
                  rows.forEach((r) => base44.entities.ReorderFlag.update(r.id, { status: "dismissed" }).catch(() => {}));
                }).catch(() => {});
              }} className="rounded-xl bg-secondary px-2 py-1 text-[10px] font-black text-muted-foreground active:bg-border">Clear all</button>
            </div>
            <p className="text-xs font-semibold text-muted-foreground">Items flagged below the {reorderSetting.threshold}-unit threshold this session. Evidence only — no order created.</p>
            <div className="space-y-2">
              {reorderFlags.map((flag) => (
                <div key={flag.id} className="flex items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="break-words text-xs font-black text-amber-900">{flag.name}</p>
                    <p className="mt-0.5 break-all font-mono text-[10px] text-amber-700">{[flag.sku && `SKU ${flag.sku}`, flag.barcode && `Barcode ${flag.barcode}`].filter(Boolean).join(" · ") || "—"}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-amber-700">Shelf {flag.shelf ?? "—"} · Backroom {flag.backroom ?? "—"} · Below {flag.threshold} {flag.unit}</p>
                  </div>
                  <button type="button" onClick={() => {
                    setReorderFlags((prev) => prev.filter((f) => f.id !== flag.id));
                    // Dismiss in DB if it's a real DB id (not a temp local id)
                    if (flag.id && !String(flag.id).startsWith("reorder_")) {
                      base44.entities.ReorderFlag.update(flag.id, { status: "dismissed" }).catch(() => {});
                    }
                  }} className="shrink-0 rounded-xl bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-800 active:bg-amber-200">Dismiss</button>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        <StickyActions
          leftLabel="Clear Item"
          rightLabel={selectedAction.shortLabel ? `Submit ${selectedAction.shortLabel}` : "Submit"}
          onLeft={clearItem}
          onRight={submitAction}
          rightDisabled={!item}
          leftDisabled={!item && !scanValue}
        />
      </WorkflowMain>
    </PageShell>
  );
}