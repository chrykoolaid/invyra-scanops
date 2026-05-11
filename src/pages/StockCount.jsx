import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  RefreshCw,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import ScanPlaceholder from "../components/scanner/ScanPlaceholder";
import NumericKeypad from "../components/scanner/NumericKeypad";
import { useToast } from "@/components/ui/use-toast";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { getLocalInventorySnapshot, resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import {
  STOCK_COUNT_STATUSES,
  STOCK_COUNT_TYPES,
  STOCK_COUNT_TYPE_OPTIONS,
  calculateVariance,
  createCountLine,
  createCountSession,
  getSessionVarianceSummary,
  getStockCountTypeMeta,
} from "../lib/scanOpsStockCount";

const SCREENS = {
  MODES: "modes",
  SETUP: "setup",
  SCAN: "scan",
  COUNT: "count",
  REVIEW: "review",
  DONE: "done",
};

const DEFAULT_SCAN_VALUE = "930000000010";

const VARIANCE_REASONS = [
  "Shelf count mismatch",
  "Backroom stock found",
  "Damaged / unsaleable",
  "Theft / shrink",
  "Previous movement not updated",
  "Other",
];

const MODE_ICONS = {
  [STOCK_COUNT_TYPES.QUICK_COUNT]: ScanLine,
  [STOCK_COUNT_TYPES.CYCLE_COUNT]: RefreshCw,
  [STOCK_COUNT_TYPES.GAP_VARIANCE_COUNT]: AlertTriangle,
  [STOCK_COUNT_TYPES.DEPARTMENT_COUNT]: Building2,
  [STOCK_COUNT_TYPES.FULL_STOCKTAKE]: ShieldCheck,
};

function normaliseItem(item) {
  if (!item) return null;
  return {
    ...item,
    id: item.internalItemId || item.id,
    stock_on_hand: item.stockOnHand ?? item.stock_on_hand,
    location: item.shelfLocation || item.location,
  };
}

function resolveCountProduct(input) {
  const value = String(input || "").trim();
  if (!value) return null;
  const resolved = resolveInventoryIdentity(value);
  if (resolved) return resolved;
  const snapshot = getLocalInventorySnapshot();
  const byName = snapshot.items.find((item) => item.name?.toLowerCase().includes(value.toLowerCase()));
  return normaliseItem(byName);
}

function formatQty(value, unit = "each") {
  const numeric = Number(value ?? 0);
  const text = Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2).replace(/\.00$/, "");
  return `${text} ${unit}`;
}

export default function StockCount() {
  const { toast } = useToast();
  const [screen, setScreen] = useState(SCREENS.MODES);
  const [selectedType, setSelectedType] = useState(STOCK_COUNT_TYPES.QUICK_COUNT);
  const [countSession, setCountSession] = useState(null);
  const [scanValue, setScanValue] = useState(DEFAULT_SCAN_VALUE);
  const [product, setProduct] = useState(null);
  const [counted, setCounted] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [lastSubmitted, setLastSubmitted] = useState(null);

  const selectedMeta = useMemo(() => getStockCountTypeMeta(selectedType), [selectedType]);
  const expectedQuantity = product?.stockOnHand ?? product?.stock_on_hand ?? 0;
  const countedQuantity = Number(counted);
  const variance = counted === "" || Number.isNaN(countedQuantity) ? null : calculateVariance(expectedQuantity, countedQuantity);
  const hasVariance = variance !== null && variance !== 0;
  const unitType = product?.unitType || product?.unit_type || "each";
  const allowDecimal = ["kg", "g", "litre", "liter"].includes(String(unitType).toLowerCase());
  const summary = getSessionVarianceSummary(countSession?.count_lines || []);

  const pageTitle = screen === SCREENS.MODES ? "Stock Count" : selectedMeta.title;
  const pageSubtitle = screen === SCREENS.MODES
    ? "Count inventory by item, shelf, department, or event."
    : selectedMeta.helper;

  const goBack = () => {
    if (screen === SCREENS.COUNT) {
      setScreen(SCREENS.SCAN);
      return;
    }
    if ([SCREENS.SCAN, SCREENS.REVIEW, SCREENS.SETUP, SCREENS.DONE].includes(screen)) {
      setScreen(SCREENS.MODES);
      return;
    }
  };

  const openMode = (modeId) => {
    setSelectedType(modeId);
    setScreen(SCREENS.SETUP);
  };

  const startSelectedMode = () => {
    if (!selectedMeta.enabled) {
      toast({ description: `${selectedMeta.title} is scoped as a governed workflow placeholder for this pass.`, duration: 1800 });
      return;
    }
    const nextSession = createCountSession(selectedType);
    setCountSession(nextSession);
    setProduct(null);
    setCounted("");
    setReason("");
    setNote("");
    createScanOpsEvent(SCANOPS_EVENT_TYPES.STOCK_COUNT_SESSION_STARTED, {
      source_module: "Stock Count",
      count_session_id: nextSession.count_session_id,
      count_type: selectedType,
      status: "in_progress",
      sync_exempt: true,
    });
    setScreen(SCREENS.SCAN);
  };

  const handleFindProduct = (value = scanValue) => {
    const found = resolveCountProduct(value || DEFAULT_SCAN_VALUE);
    if (!found) {
      toast({ description: "Item not found. Try barcode 930000000010 or PLU 4011.", duration: 2200 });
      return;
    }
    setProduct(found);
    setCounted("");
    setReason("");
    setNote("");
    setScreen(SCREENS.COUNT);
  };

  const saveCountLine = () => {
    if (!countSession || !product || counted === "" || Number.isNaN(countedQuantity)) return;
    const countLine = createCountLine({ session: countSession, product, countedQuantity, reason, note });
    const requiresReview = Number(countLine.variance_quantity || 0) !== 0;
    const nextSession = {
      ...countSession,
      count_lines: [countLine, ...(countSession.count_lines || [])],
      sync_status: requiresReview ? "Variance Review" : "Saved on device",
      approval_status: requiresReview ? "Variance review required" : countSession.approval_status,
    };
    setCountSession(nextSession);
    createScanOpsEvent(
      requiresReview ? SCANOPS_EVENT_TYPES.STOCK_COUNT_VARIANCE_REVIEW_REQUIRED : SCANOPS_EVENT_TYPES.STOCK_COUNT_LINE_SAVED,
      {
        source_module: "Stock Count",
        count_session_id: nextSession.count_session_id,
        count_type: nextSession.count_type,
        count_line_id: countLine.count_line_id,
        product_id: countLine.product_id,
        sku: countLine.sku,
        barcode: countLine.barcode,
        plu: countLine.plu,
        item_name: countLine.item_name,
        expected_quantity: countLine.expected_quantity,
        counted_quantity: countLine.counted_quantity,
        variance_quantity: countLine.variance_quantity,
        variance_reason: countLine.reason_code,
        note: countLine.note,
        status: requiresReview ? "variance_review_required" : "count_line_saved",
        supervisor_review_required: requiresReview,
      }
    );
    setProduct(null);
    setCounted("");
    setReason("");
    setNote("");
    setScreen(SCREENS.REVIEW);
  };

  const submitSession = () => {
    if (!countSession || !countSession.count_lines?.length) return;
    const currentSummary = getSessionVarianceSummary(countSession.count_lines);
    const submittedAt = new Date().toISOString();
    const nextSession = {
      ...countSession,
      status: currentSummary.requiresReview ? STOCK_COUNT_STATUSES.VARIANCE_REVIEW : STOCK_COUNT_STATUSES.SUBMITTED,
      submitted_at: submittedAt,
      approval_status: currentSummary.requiresReview ? "Manager review required" : "No variance review required",
      sync_status: currentSummary.requiresReview ? "Needs review" : "Waiting to sync",
    };
    setCountSession(nextSession);
    setLastSubmitted(nextSession);
    createScanOpsEvent(SCANOPS_EVENT_TYPES.STOCK_COUNT_SUBMITTED, {
      source_module: "Stock Count",
      count_session_id: nextSession.count_session_id,
      count_type: nextSession.count_type,
      counted_items: currentSummary.countedItems,
      variance_items: currentSummary.varianceItems,
      total_variance: currentSummary.totalVariance,
      submitted_at: submittedAt,
      status: currentSummary.requiresReview ? "variance_review_required" : "count_submitted",
      supervisor_review_required: currentSummary.requiresReview,
      inventory_mutation_applied: false,
      governance_note: "Handheld count submitted only. Inventory adjustment requires review/approval in Invyra Inventory.",
    });
    setScreen(SCREENS.DONE);
  };

  const resetToModes = () => {
    setCountSession(null);
    setProduct(null);
    setCounted("");
    setReason("");
    setNote("");
    setScreen(SCREENS.MODES);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <PageHeader title={pageTitle} subtitle={pageSubtitle} />

      <main className="flex-1 px-4 py-5 overflow-y-auto overflow-x-hidden pb-8">
        {screen !== SCREENS.MODES && (
          <button
            type="button"
            onClick={goBack}
            className="mb-4 w-full rounded-2xl border border-border bg-card px-4 py-3 text-left text-sm font-semibold text-foreground active:scale-[0.99]"
          >
            ← Back to Stock Count modes
          </button>
        )}

        {screen === SCREENS.MODES && (
          <ModeSelector onSelect={openMode} />
        )}

        {screen === SCREENS.SETUP && (
          <ModeSetup meta={selectedMeta} onStart={startSelectedMode} />
        )}

        {screen === SCREENS.SCAN && (
          <ScanStep
            scanValue={scanValue}
            setScanValue={setScanValue}
            onFindProduct={handleFindProduct}
          />
        )}

        {screen === SCREENS.COUNT && product && (
          <CountStep
            product={product}
            counted={counted}
            setCounted={setCounted}
            unitType={unitType}
            allowDecimal={allowDecimal}
            expectedQuantity={expectedQuantity}
            variance={variance}
            hasVariance={hasVariance}
            reason={reason}
            setReason={setReason}
            note={note}
            setNote={setNote}
            onSave={saveCountLine}
          />
        )}

        {screen === SCREENS.REVIEW && countSession && (
          <ReviewStep
            session={countSession}
            summary={summary}
            onAddAnother={() => setScreen(SCREENS.SCAN)}
            onSubmit={submitSession}
          />
        )}

        {screen === SCREENS.DONE && lastSubmitted && (
          <DoneStep session={lastSubmitted} onReset={resetToModes} />
        )}
      </main>
    </div>
  );
}

function ModeSelector({ onSelect }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground">Start a Count</h2>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">
              Stocktake stays inside Stock Count as a formal count type, not a separate launcher tile.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {STOCK_COUNT_TYPE_OPTIONS.map((mode) => {
          const Icon = MODE_ICONS[mode.id] || ClipboardCheck;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onSelect(mode.id)}
              className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${mode.governed ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">{mode.title}</p>
                    {!mode.enabled && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">Governed</span>}
                  </div>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">{mode.helper}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ModeSetup({ meta, onStart }) {
  const Icon = MODE_ICONS[meta.id] || ClipboardCheck;
  const plannedItems = getPlannedItems(meta.id);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${meta.governed ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-foreground">{meta.title}</h2>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">{meta.caption}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Governance rule</p>
        <p className="mt-2 text-sm leading-snug text-foreground">
          The handheld records counted quantities only. Stock changes are reviewed and approved inside Invyra Inventory before any movement ledger adjustment is applied.
        </p>
      </div>

      {!meta.enabled && (
        <div className="rounded-2xl border border-border bg-secondary/50 p-4">
          <p className="text-sm font-bold text-foreground">Planned workflow</p>
          <div className="mt-3 space-y-2">
            {plannedItems.map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {meta.id === STOCK_COUNT_TYPES.FULL_STOCKTAKE && (
        <div className="rounded-2xl border border-accent/25 bg-accent/5 p-4">
          <div className="flex gap-3">
            <FileCheck2 className="h-5 w-5 shrink-0 text-accent" />
            <div>
              <p className="text-sm font-bold text-foreground">Formal stocktake mode</p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">
                Full Stocktake requires an active event, assigned department/zone, submission proof, variance review, and manager approval. It is not a casual adjustment shortcut.
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onStart}
        className={`w-full rounded-2xl px-5 py-4 text-sm font-bold active:scale-[0.98] ${meta.enabled ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
      >
        {meta.enabled ? meta.actionLabel : `${meta.actionLabel} · Placeholder`}
      </button>
    </div>
  );
}

function ScanStep({ scanValue, setScanValue, onFindProduct }) {
  return (
    <div className="space-y-4">
      <ScanPlaceholder onSimulate={() => onFindProduct(scanValue || DEFAULT_SCAN_VALUE)} label="Scan barcode, PLU, SKU, or enter code below" />

      <div className="rounded-2xl border border-border bg-card p-4">
        <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Manual item entry</label>
        <input
          value={scanValue}
          onChange={(event) => setScanValue(event.target.value)}
          placeholder="Barcode / PLU / SKU / item name"
          className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/25"
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setScanValue("4011")}
            className="rounded-xl bg-secondary px-3 py-3 text-xs font-bold text-foreground active:scale-[0.98]"
          >
            Try PLU 4011
          </button>
          <button
            type="button"
            onClick={() => setScanValue(DEFAULT_SCAN_VALUE)}
            className="rounded-xl bg-secondary px-3 py-3 text-xs font-bold text-foreground active:scale-[0.98]"
          >
            Try Barcode
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onFindProduct(scanValue)}
        className="w-full rounded-2xl bg-primary px-5 py-4 text-sm font-bold text-primary-foreground active:scale-[0.98]"
      >
        Find Item
      </button>
    </div>
  );
}

function CountStep({
  product,
  counted,
  setCounted,
  unitType,
  allowDecimal,
  expectedQuantity,
  variance,
  hasVariance,
  reason,
  setReason,
  note,
  setNote,
  onSave,
}) {
  const canSave = counted !== "" && !Number.isNaN(Number(counted));
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs font-semibold text-muted-foreground">{product.sku || product.barcode || product.plu}</p>
        <h2 className="mt-1 text-base font-extrabold leading-tight text-foreground">{product.name}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <InfoPill label="Location" value={product.shelfLocation || product.location || "Location pending"} />
          <InfoPill label="Unit" value={unitType} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <QuantityCard label="Expected Qty" value={formatQty(expectedQuantity, unitType)} />
        <QuantityCard label="Counted Qty" value={counted ? formatQty(counted, unitType) : `0 ${unitType}`} muted={!counted} />
      </div>

      {variance !== null && (
        <div className={`rounded-2xl border p-4 ${hasVariance ? "border-destructive/25 bg-destructive/10" : "border-accent/25 bg-accent/10"}`}>
          <div className="flex items-center gap-3">
            {hasVariance ? <AlertTriangle className="h-5 w-5 text-destructive" /> : <CheckCircle2 className="h-5 w-5 text-accent" />}
            <div>
              <p className="text-sm font-bold text-foreground">{hasVariance ? "Variance detected" : "No variance"}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Difference: <span className="font-bold">{variance > 0 ? "+" : ""}{formatQty(variance, unitType)}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      <NumericKeypad value={counted} onChange={setCounted} allowDecimal={allowDecimal} />

      {hasVariance && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-bold text-foreground">Variance reason</p>
          <p className="mt-1 text-xs text-muted-foreground">Reason is recorded for review. It does not approve a stock adjustment.</p>
          <div className="mt-3 space-y-2">
            {VARIANCE_REASONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setReason(item)}
                className={`w-full rounded-xl border px-3 py-3 text-left text-xs font-bold active:scale-[0.99] ${reason === item ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-4">
        <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Note optional</label>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add shelf, bay, or recount note"
          className="mt-2 min-h-[76px] w-full resize-none rounded-xl border border-input bg-background px-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/25"
        />
      </div>

      <button
        type="button"
        disabled={!canSave}
        onClick={onSave}
        className="w-full rounded-2xl bg-primary px-5 py-4 text-sm font-bold text-primary-foreground active:scale-[0.98] disabled:opacity-40"
      >
        Save Count
      </button>
    </div>
  );
}

function ReviewStep({ session, summary, onAddAnother, onSubmit }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Review Count Session</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <QuantityCard label="Counted Items" value={summary.countedItems} />
          <QuantityCard label="Variances" value={summary.varianceItems ? `${summary.varianceItems} review` : "0"} muted={!summary.varianceItems} />
        </div>
      </div>

      {summary.requiresReview && (
        <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-bold text-foreground">Variance Review required</p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">
                Submission will sync to Inventory review. It will not adjust stock automatically from this handheld.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {session.count_lines.map((line) => (
          <ReviewLine key={line.count_line_id} line={line} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onAddAnother}
          className="rounded-2xl border border-border bg-card px-4 py-4 text-sm font-bold text-foreground active:scale-[0.98]"
        >
          Add Item
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="rounded-2xl bg-accent px-4 py-4 text-sm font-bold text-accent-foreground active:scale-[0.98]"
        >
          Submit Count
        </button>
      </div>
    </div>
  );
}

function DoneStep({ session, onReset }) {
  const meta = getStockCountTypeMeta(session.count_type);
  const summary = getSessionVarianceSummary(session.count_lines || []);
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 text-accent">
        <CheckCircle2 className="h-10 w-10" />
      </div>
      <h2 className="mt-5 text-lg font-extrabold text-foreground">Count Submitted</h2>
      <p className="mt-1 text-sm text-muted-foreground">{meta.title} · {summary.countedItems} item{summary.countedItems === 1 ? "" : "s"}</p>

      <div className="mt-5 w-full rounded-2xl border border-border bg-card p-4 text-left">
        <Row label="Session status" value={session.status} />
        <Row label="Sync state" value={session.sync_status} />
        <Row label="Inventory adjustment" value="Not applied by handheld" />
        <Row label="Approval" value={session.approval_status} />
      </div>

      <button
        type="button"
        onClick={onReset}
        className="mt-5 w-full rounded-2xl bg-primary px-5 py-4 text-sm font-bold text-primary-foreground active:scale-[0.98]"
      >
        Back to Stock Count
      </button>
    </div>
  );
}

function InfoPill({ label, value }) {
  return (
    <div className="rounded-xl bg-secondary px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-xs font-semibold text-foreground">{value}</p>
    </div>
  );
}

function QuantityCard({ label, value, muted = false }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-2 text-xl font-extrabold ${muted ? "text-muted-foreground" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function ReviewLine({ line }) {
  const hasVariance = Number(line.variance_quantity || 0) !== 0;
  const unit = line.unitType || "each";
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold leading-snug text-foreground">{line.item_name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{line.sku || line.barcode || line.plu}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${hasVariance ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"}`}>
          {hasVariance ? "Review" : "OK"}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <MiniMetric label="Expected" value={formatQty(line.expected_quantity, unit)} />
        <MiniMetric label="Counted" value={formatQty(line.counted_quantity, unit)} />
        <MiniMetric label="Variance" value={`${line.variance_quantity > 0 ? "+" : ""}${formatQty(line.variance_quantity, unit)}`} alert={hasVariance} />
      </div>
      {line.reason_code && <p className="mt-3 text-xs text-muted-foreground">Reason: <span className="font-semibold text-foreground">{line.reason_code}</span></p>}
    </div>
  );
}

function MiniMetric({ label, value, alert = false }) {
  return (
    <div className="rounded-xl bg-secondary px-2 py-2">
      <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
      <p className={`mt-1 break-words text-xs font-extrabold ${alert ? "text-destructive" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-bold text-foreground">{value}</span>
    </div>
  );
}

function getPlannedItems(modeId) {
  switch (modeId) {
    case STOCK_COUNT_TYPES.CYCLE_COUNT:
      return ["Assigned SKU list", "Count progress by item", "Submit session to variance review"];
    case STOCK_COUNT_TYPES.GAP_VARIANCE_COUNT:
      return ["Open from Gap Scan or suspected mismatch", "Record shelf/backroom outcome", "Create replenishment or variance review signal"];
    case STOCK_COUNT_TYPES.DEPARTMENT_COUNT:
      return ["Choose department and area", "Count products one by one", "Submit grouped department session"];
    case STOCK_COUNT_TYPES.FULL_STOCKTAKE:
      return ["Select active stocktake event", "Choose assigned zone/department", "Submit audited count for manager approval"];
    default:
      return [];
  }
}
