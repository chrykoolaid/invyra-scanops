import React, { useMemo, useState } from "react";
import { AlertTriangle, BadgePercent, CheckCircle2, ClipboardCheck, Eye, Printer, ShieldAlert, Tag, Ticket } from "lucide-react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import { BatchList, DoneCard, EmptyState, FieldError, InfoLine, ItemSummaryCard, MetricPill, OperatorAlert, PageShell, SectionCard, StickyActions, TextInputField, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import {
  formatScanOpsMoney,
  getActivePromotionForItem,
  getAllPricePromoVerificationEvents,
  getExpectedRegularPrice,
  getExpectedShelfPrice,
  getPricePromoResult,
  PRICE_PROMO_REASON_OPTIONS,
  PRICE_PROMO_RESULT_OPTIONS,
  PRICE_PROMO_RESULTS,
  savePricePromoVerificationEvent,
} from "../lib/scanOpsPricePromoVerification";
import { getNetworkMode } from "../lib/scanOpsSync";
import { writePriceCheckRecord } from "../lib/scanOpsRecordWriter";

const RESULT_ICON = {
  [PRICE_PROMO_RESULTS.LABEL_CORRECT]: CheckCircle2,
  [PRICE_PROMO_RESULTS.PRICE_MISMATCH]: AlertTriangle,
  [PRICE_PROMO_RESULTS.PROMO_MISSING]: BadgePercent,
  [PRICE_PROMO_RESULTS.PROMO_EXPIRED]: BadgePercent,
  [PRICE_PROMO_RESULTS.WRONG_PRODUCT_LABEL]: Tag,
  [PRICE_PROMO_RESULTS.TICKET_NEEDED]: Ticket,
  [PRICE_PROMO_RESULTS.MANAGER_REVIEW]: ShieldAlert,
};

function ResultButton({ option, active, onClick }) {
  const Icon = RESULT_ICON[option.id] || ClipboardCheck;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[4.25rem] rounded-2xl border p-3 text-left active:scale-[0.99] ${
        active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-card text-foreground active:bg-secondary"
      }`}
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="break-words text-xs font-black leading-tight">{option.label}</p>
          <p className={`mt-1 text-[10px] font-semibold leading-snug ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{option.status}</p>
        </div>
      </div>
    </button>
  );
}

function PressButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-10 rounded-xl px-2 text-xs font-black active:scale-[0.98] ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground active:bg-border"}`}
    >
      {label}
    </button>
  );
}

function PriceStateCard({ item }) {
  const promotion = useMemo(() => getActivePromotionForItem(item), [item]);
  const currency = item?.currency || "₱";
  const regular = getExpectedRegularPrice(item);
  const expected = getExpectedShelfPrice(item);
  const suffix = item?.pricePerKg || item?.price_per_kg ? "/kg" : "";

  return (
    <SectionCard className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <BadgePercent className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-foreground">System price</p>
          <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">Verification only. Prices are not edited here.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricPill label="Regular" value={formatScanOpsMoney(regular, currency, suffix)} />
        <MetricPill label="Expected shelf" value={formatScanOpsMoney(expected, currency, suffix)} />
      </div>

      {promotion?.active ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-start gap-2">
            <Tag className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-black text-foreground">{promotion.name}</p>
              <p className="mt-1 text-xs font-bold text-muted-foreground">Promo: {formatScanOpsMoney(promotion.promoPrice, currency, suffix)} · Active until {promotion.endDate}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-secondary/50 p-3">
          <p className="text-sm font-black text-foreground">No active promo</p>
          <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">Record regular shelf price truth or mark a stale/incorrect promo label if one is present.</p>
        </div>
      )}
    </SectionCard>
  );
}

function RecentPriceChecks({ records }) {
  return (
    <BatchList
      title="Price / promo verification"
      items={records.slice(0, 8).map((record) => ({
        ...record,
        quantity: undefined,
        reason: `${record.status} · ${record.resultLabel}`,
        item: {
          itemName: record.itemName || record.item_name,
          raw: record.item_snapshot,
          unit: "",
        },
      }))}
      emptyText="No price or promo checks yet."
      renderMeta={(line) => [line.status, line.resultLabel, line.reasonLabel, line.requestedShelfTicket ? "Shelf ticket requested" : null, line.requiresManagerReview ? "Manager review" : null].filter(Boolean).join(" · ")}
    />
  );
}

export default function PriceCheck() {
  const [scanValue, setScanValue] = useState("");
  const [item, setItem] = useState(null);
  const [shelfLabelPrice, setShelfLabelPrice] = useState("");
  const [promoLabelVisible, setPromoLabelVisible] = useState(null);
  const [resultId, setResultId] = useState(PRICE_PROMO_RESULTS.LABEL_CORRECT);
  const [reasonId, setReasonId] = useState("");
  const [notes, setNotes] = useState("");
  const [records, setRecords] = useState(() => getAllPricePromoVerificationEvents());
  const [savedResult, setSavedResult] = useState(null);
  const [operatorError, setOperatorError] = useState(null);

  const selectedResult = getPricePromoResult(resultId);
  const activePromo = useMemo(() => item ? getActivePromotionForItem(item) : null, [item]);
  const expectedShelfPrice = item ? getExpectedShelfPrice(item) : null;

  const scan = (value) => {
    const found = typeof value === "object" ? value : resolveInventoryIdentity(String(value || "").trim());
    if (!found) return;
    setOperatorError(null);
    setItem(found);
    const nextExpected = getExpectedShelfPrice(found);
    setShelfLabelPrice(nextExpected == null ? "" : String(nextExpected));
    setPromoLabelVisible(getActivePromotionForItem(found)?.active ? true : null);
    setResultId(PRICE_PROMO_RESULTS.LABEL_CORRECT);
    setReasonId("");
    setNotes("");
    setSavedResult(null);
    setOperatorError(null);
  };

  const clearItem = () => {
    setItem(null);
    setScanValue("");
    setShelfLabelPrice("");
    setPromoLabelVisible(null);
    setResultId(PRICE_PROMO_RESULTS.LABEL_CORRECT);
    setReasonId("");
    setNotes("");
    setSavedResult(null);
    setOperatorError(null);
  };

  const submitVerification = () => {
    if (!item) {
      setOperatorError({ title: "Item required", helper: "Scan or search an item before saving price-check evidence." });
      return;
    }
    if (getNetworkMode() === "offline" && expectedShelfPrice == null) {
      setOperatorError({ title: "Offline — latest price unavailable", helper: "Reconnect or try again later. Do not guess the price while offline." });
      return;
    }
    if (shelfLabelPrice === "" || Number.isNaN(Number(shelfLabelPrice))) {
      setOperatorError({ title: "Shelf label price missing", helper: "Enter the shelf label price before saving. Your item stays on screen." });
      return;
    }
    setOperatorError(null);
    const result = savePricePromoVerificationEvent({ item, resultId, reasonId, shelfLabelPrice, promoLabelVisible, notes });
    if (!result) return;
    writePriceCheckRecord({ item, outcome: resultId, scannedPrice: Number(shelfLabelPrice), expectedPrice: expectedShelfPrice, notes });
    setRecords(result.events);
    setSavedResult({ ...result.verification, syncStatusLabel: result.event?.syncRecord?.statusLabel || "Pending sync" });
    setItem(null);
    setScanValue("");
    setShelfLabelPrice("");
    setPromoLabelVisible(null);
    setReasonId("");
    setNotes("");
  };

  return (
    <PageShell>
      <WorkflowHeader title="Price Check" subtitle="Price + promo label verification" scanValue={scanValue} onScanValueChange={setScanValue} onScan={scan} />
      <WorkflowMain>
        {operatorError && <OperatorAlert title={operatorError.title} helper={operatorError.helper} tone={operatorError.tone || "warning"} actions={[{ label: "Keep Editing", onClick: () => setOperatorError(null), variant: "primary" }]} />}
        <SectionCard className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-black text-foreground">Price check action</p>
              <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">Scan item, compare shelf label, save result.</p>
            </div>
            <div className="shrink-0 rounded-2xl bg-secondary px-3 py-2 text-center">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Events</p>
              <p className="text-lg font-black text-foreground">{records.length}</p>
            </div>
          </div>
        </SectionCard>

        {savedResult && (
          <DoneCard
            title={`${savedResult.resultLabel} saved`}
            helper="Saved locally. Pending sync. Prices, promos, stock, and printer records were not changed."
            rows={[
              { label: "Item", value: savedResult.itemName },
              { label: "Expected shelf", value: formatScanOpsMoney(savedResult.expectedShelfPrice, savedResult.item_snapshot?.currency || "₱", savedResult.item_snapshot?.pricePerKg ? "/kg" : "") },
              { label: "Shelf label", value: formatScanOpsMoney(savedResult.shelfLabelPrice, savedResult.item_snapshot?.currency || "₱", savedResult.item_snapshot?.pricePerKg ? "/kg" : "") },
              { label: "Sync", value: savedResult.syncStatusLabel || "Pending sync" },
            ]}
          />
        )}

        {item ? (
          <>
            <ItemSummaryCard item={item} />
            <PriceStateCard item={item} />

            <SectionCard className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Eye className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-foreground">Shelf label check</p>
                  <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">Enter the shelf label price and confirm whether a promo ticket is visible.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <TextInputField label="Shelf label price" value={shelfLabelPrice} onChange={(value) => { setShelfLabelPrice(value); if (operatorError?.title === "Shelf label price missing") setOperatorError(null); }} type="number" placeholder={expectedShelfPrice == null ? "0.00" : String(expectedShelfPrice)} />
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Promo label visible?</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <PressButton label="Yes" active={promoLabelVisible === true} onClick={() => setPromoLabelVisible(true)} />
                    <PressButton label="No" active={promoLabelVisible === false} onClick={() => setPromoLabelVisible(false)} />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-secondary/60 p-3">
                <InfoLine label="Promo state" value={activePromo?.active ? activePromo.name : "No active promo"} />
                <InfoLine label="Price source" value={getNetworkMode() === "offline" ? "Local snapshot only" : "Local product snapshot"} />
              </div>
              {(shelfLabelPrice === "" || Number.isNaN(Number(shelfLabelPrice))) && <FieldError title="Shelf label price missing" helper="Enter the shelf label price before saving." />}
            </SectionCard>

            <SectionCard className="space-y-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Verification result</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {PRICE_PROMO_RESULT_OPTIONS.map((option) => <ResultButton key={option.id} option={option} active={resultId === option.id} onClick={() => setResultId(option.id)} />)}
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Reason</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {PRICE_PROMO_REASON_OPTIONS.map((option) => <PressButton key={option.id} label={option.label} active={reasonId === option.id} onClick={() => setReasonId(reasonId === option.id ? "" : option.id)} />)}
                </div>
              </div>

              <TextInputField label="Notes / evidence" value={notes} onChange={setNotes} placeholder="Optional note" />

              <div className="rounded-2xl border border-border bg-secondary/50 p-3">
                <div className="flex items-start gap-2">
                  <Printer className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="text-xs font-semibold leading-snug text-muted-foreground">Ticket Needed creates a shelf-ticket request only.</p>
                </div>
              </div>
            </SectionCard>
          </>
        ) : (
          <EmptyState title="No price-check item selected." helper="Scan an item to compare the shelf label. Offline checks use local snapshots only." />
        )}

        <RecentPriceChecks records={records} />

        <StickyActions
          leftLabel="Clear Item"
          rightLabel={selectedResult?.shortLabel ? `Submit ${selectedResult.shortLabel}` : `Submit ${selectedResult.label}`}
          onLeft={clearItem}
          onRight={submitVerification}
          rightDisabled={!item}
          leftDisabled={!item && !scanValue}
        />
      </WorkflowMain>
    </PageShell>
  );
}