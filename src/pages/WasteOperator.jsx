import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardList, PackagePlus, RotateCcw, ScanLine, Trash2 } from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import {
  EmptyState,
  ItemSummaryCard,
  MetricPill,
  OperatorAlert,
  PageShell,
  SectionCard,
  StickyActions,
  TextInputField,
  WorkflowMain,
} from "../components/scanner/WorkflowPrimitives";
import { resolveInventoryIdentity, ensureInventoryLoaded } from "../lib/inventorySystemAdapter";
import { writeWasteRecord } from "../lib/scanOpsRecordWriter";
import { getDefaultExpiryDate, getDefaultLotBatch } from "../lib/scanOpsItemAttributes";
import { GOVERNED_ACTIONS, canPerformScanOpsAction, recordGovernedAction, useScanOpsGovernanceContext } from "../lib/scanOpsGovernance";
import { createWasteReviewDraft, filterWasteReviews, getWasteReviews, getWasteReviewReason, submitWasteReview, WASTE_REVIEW_REASON_OPTIONS } from "../lib/scanOpsWasteReview";

const STOCK_OUT_TYPES = [
  { id: "wastage_damage", label: "Waste / Damage", helper: "Damaged, broken, contaminated", defaultReason: "damaged_in_handling", reasonIds: ["damaged_in_handling", "packaging_broken", "spillage", "contamination_risk"] },
  { id: "expired_spoiled", label: "Expired / Spoiled", helper: "Expired, spoiled, temperature issue", defaultReason: "expired_out_of_date", reasonIds: ["expired_out_of_date", "spoiled_rotten", "temperature_issue"] },
  { id: "store_use", label: "Store Use", helper: "Business consumption or sampling", defaultReason: "store_use", reasonIds: ["store_use", "production_use", "sampling_promos", "training_use"] },
  { id: "suspected_theft_loss", label: "Theft / Loss", helper: "Missing, tampered, suspected theft", defaultReason: "theft_suspected_theft", noteRequired: true, reasonIds: ["theft_suspected_theft", "seal_tampering", "missing_stock"] },
  { id: "unknown_shrinkage", label: "Unknown Loss", helper: "Unexplained stock loss", defaultReason: "unknown_loss", noteRequired: true, reasonIds: ["unknown_loss", "count_discrepancy", "high_value_discrepancy"] },
];

function itemName(item) {
  return item?.name || item?.item_name || "Scanned item";
}

function itemUnit(item) {
  return item?.unitType || item?.unit_type || "each";
}

function itemAvailable(item) {
  return item?.stockOnHand ?? item?.stock_on_hand ?? item?.available ?? item?.availableStock ?? item?.shelfStock ?? item?.shelf_stock ?? "—";
}

function primaryScanValue(item) {
  return item?.barcode || item?.gtin || item?.sku || item?.plu || item?.scaleCode || item?.name || "";
}

function WasteSessionCard({ queue }) {
  const reviewCount = queue.filter((entry) => entry.reasonCode?.includes("theft") || entry.reasonCode?.includes("unknown") || entry.reasonCode?.includes("discrepancy")).length;
  const totalQty = queue.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
  return (
    <SectionCard>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Trash2 className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Waste Session</p>
          <h2 className="mt-1 text-base font-black text-foreground">Stock-out evidence</h2>
          <p className="mt-1 text-xs font-bold text-muted-foreground">Scan → classify → quantity → queue → submit</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MetricPill label="Items" value={queue.length} />
        <MetricPill label="Qty" value={totalQty} />
        <MetricPill label="Review" value={reviewCount} />
      </div>
    </SectionCard>
  );
}

function TypeButton({ type, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-16 rounded-2xl border px-3 py-3 text-left active:scale-[0.99] ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/50 text-foreground"}`}
    >
      <span className="block text-sm font-black">{type.label}</span>
      <span className="mt-1 block text-[11px] font-bold leading-snug opacity-80">{type.helper}</span>
    </button>
  );
}

function WasteKeypad({ value, onChange }) {
  const append = (digit) => onChange(String(value || "") === "0" ? digit : `${value || ""}${digit}`);
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLR", "0", "⌫"];
  return (
    <div className="grid grid-cols-3 gap-1 rounded-3xl bg-secondary/60 p-1">
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => {
            if (key === "CLR") onChange("");
            else if (key === "⌫") onChange(String(value || "").slice(0, -1));
            else append(key);
          }}
          className="min-h-14 rounded-2xl bg-background px-3 text-lg font-black text-foreground active:scale-[0.98] active:bg-primary/10"
        >
          {key}
        </button>
      ))}
    </div>
  );
}

function QueueCard({ review }) {
  return (
    <div className="rounded-2xl bg-secondary/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-foreground">{review.itemName}</p>
          <p className="mt-1 text-xs font-bold text-muted-foreground">Qty {review.quantity} {review.unitOfMeasure} · {review.reasonLabel}</p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">{review.syncStatus || "Ready for review queue"}</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black text-primary">Queued</span>
      </div>
    </div>
  );
}

export default function WasteOperator() {
  const governance = useScanOpsGovernanceContext();
  const [scanValue, setScanValue] = useState("");
  const [item, setItem] = useState(null);
  const [stockOutType, setStockOutType] = useState("wastage_damage");
  const [quantity, setQuantity] = useState("1");
  const [reasonCode, setReasonCode] = useState("damaged_in_handling");
  const [expiryDate, setExpiryDate] = useState("");
  const [batchLot, setBatchLot] = useState("");
  const [shelfLocation, setShelfLocation] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [reviews, setReviews] = useState([]);
  const [operatorError, setOperatorError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);

  const currentType = STOCK_OUT_TYPES.find((type) => type.id === stockOutType) || STOCK_OUT_TYPES[0];
  const reason = getWasteReviewReason(reasonCode);
  const unit = itemUnit(item || {});
  const queue = useMemo(() => filterWasteReviews(reviews, "draft"), [reviews]);
  const reasonOptions = useMemo(() => WASTE_REVIEW_REASON_OPTIONS.filter((option) => new Set(currentType.reasonIds).has(option.id)), [currentType]);

  const refreshReviews = () => setReviews(getWasteReviews());

  useEffect(() => {
    ensureInventoryLoaded();
    refreshReviews();
  }, []);

  const resetItem = () => {
    setItem(null);
    setScanValue("");
    setQuantity("1");
    setEvidenceNote("");
    setOperatorError(null);
  };

  const selectType = (type) => {
    setStockOutType(type.id);
    setReasonCode(type.defaultReason);
    setOperatorError(null);
  };

  const scan = (value) => {
    const input = typeof value === "object" ? primaryScanValue(value) : String(value || "").trim();
    const found = typeof value === "object" ? value : resolveInventoryIdentity(input);
    if (!found) {
      setOperatorError({ title: "Item not found", helper: "Scan again or use barcode, SKU, PLU, or item name." });
      setLastSaved(null);
      return;
    }

    const defaultType = found?.wasteReviewRequired || found?.expiry_status === "Expired" || found?.freshness_default === "needs_supervisor_review" ? "expired_spoiled" : stockOutType;
    const nextType = STOCK_OUT_TYPES.find((type) => type.id === defaultType) || STOCK_OUT_TYPES[0];

    setOperatorError(null);
    setLastSaved(null);
    setItem(found);
    setScanValue(primaryScanValue(found));
    setQuantity("1");
    setStockOutType(nextType.id);
    setReasonCode(nextType.defaultReason);
    setExpiryDate(getDefaultExpiryDate(found));
    setBatchLot(getDefaultLotBatch(found));
    setShelfLocation(found?.shelfLocation || found?.location || found?.aisle || found?.shelf || "");
    setEvidenceNote("");
  };

  const addToQueue = () => {
    if (!item) {
      setOperatorError({ title: "Item required", helper: "Scan an item before adding waste evidence." });
      return;
    }
    if (quantity === "" || Number.isNaN(Number(quantity)) || Number(quantity) <= 0) {
      setOperatorError({ title: "Quantity missing", helper: "Enter a valid affected quantity before adding." });
      return;
    }
    if (!reasonCode) {
      setOperatorError({ title: "Reason required", helper: "Choose a reason before adding this item." });
      return;
    }
    if (currentType.noteRequired && !evidenceNote.trim()) {
      setOperatorError({ title: "Note required", helper: `${currentType.label} needs a short note for review.` });
      return;
    }

    const permission = canPerformScanOpsAction(GOVERNED_ACTIONS.WASTE_SUBMIT, governance);
    if (!permission.allowed) {
      recordGovernedAction(GOVERNED_ACTIONS.WASTE_SUBMIT, "Waste Review", null, permission);
      setOperatorError({ title: "Permission required", helper: permission.reason || "This stock-out action is blocked for the current role." });
      return;
    }

    recordGovernedAction(GOVERNED_ACTIONS.WASTE_SUBMIT, "Waste Review", null, permission, { eventLabel: "Waste item added to operator queue" });
    const review = createWasteReviewDraft({ item, reasonCode, quantity: Number(quantity), expiryDate, batchLot, shelfLocation, evidenceNote });
    writeWasteRecord({ item, reasonCode, quantity: Number(quantity), expiryDate, batchLot, evidenceNote, status: "draft", reviewId: review.reviewId });
    refreshReviews();
    setLastSaved(review);
    resetItem();
  };

  const submitSession = () => {
    if (!queue.length) {
      setOperatorError({ title: "Queue empty", helper: "Add at least one item before submitting." });
      return;
    }

    const permission = canPerformScanOpsAction(GOVERNED_ACTIONS.WASTE_SUBMIT, governance);
    if (!permission.allowed) {
      recordGovernedAction(GOVERNED_ACTIONS.WASTE_SUBMIT, "Waste Review", null, permission);
      setOperatorError({ title: "Permission required", helper: permission.reason || "This stock-out session is blocked for the current role." });
      return;
    }

    const submitted = queue.map((review) => submitWasteReview(review.reviewId)).filter(Boolean);
    refreshReviews();
    setLastSaved({ itemName: `${submitted.length} item${submitted.length === 1 ? "" : "s"}`, sessionSubmitted: true });
    setOperatorError(null);
  };

  return (
    <PageShell unthemed>
      <PageHeader title="Waste" subtitle="Scan item, classify loss, queue evidence" />
      <WorkflowHeader
        title="Waste"
        subtitle="Scan → classify → quantity → queue"
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={scan}
        placeholder="Scan item barcode, SKU, PLU, or name..."
        showHeaderChrome={false}
      />
      <WorkflowMain>
        {operatorError && (
          <OperatorAlert
            title={operatorError.title}
            helper={operatorError.helper}
            tone="warning"
            actions={[{ label: "Keep Editing", onClick: () => setOperatorError(null), variant: "primary" }]}
          />
        )}

        {lastSaved && (
          <OperatorAlert
            tone="success"
            title={lastSaved.sessionSubmitted ? "Waste session submitted" : "Waste evidence queued"}
            helper={lastSaved.sessionSubmitted ? `${lastSaved.itemName} submitted for review.` : `${lastSaved.itemName || "Item"} queued. Ready for next scan.`}
          />
        )}

        <WasteSessionCard queue={queue} />

        {item ? (
          <>
            <ItemSummaryCard item={item}>
              <div className="grid grid-cols-3 gap-2">
                <MetricPill label="Available" value={itemAvailable(item)} suffix={itemAvailable(item) === "—" ? "" : unit} />
                <MetricPill label="Qty" value={quantity || "—"} suffix={quantity ? unit : ""} />
                <MetricPill label="Type" value={currentType.label} />
              </div>
            </ItemSummaryCard>

            <SectionCard className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Classify Stock-Out</p>
                  <h2 className="mt-1 text-base font-black text-foreground">What happened?</h2>
                  <p className="mt-1 text-xs font-bold text-muted-foreground">Theft and unknown loss require a note.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {STOCK_OUT_TYPES.map((type) => <TypeButton key={type.id} type={type} active={stockOutType === type.id} onClick={() => selectType(type)} />)}
              </div>
              <TouchSelect label="Reason" value={reasonCode} onChange={setReasonCode} options={reasonOptions} helper={reason.helper} />
            </SectionCard>

            <SectionCard className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <PackagePlus className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Quantity Affected</p>
                  <h2 className="mt-1 text-3xl font-black text-foreground">{quantity || "—"}</h2>
                  <p className="mt-1 text-xs font-bold text-muted-foreground">Enter how many units are affected.</p>
                </div>
              </div>
              <WasteKeypad value={quantity} onChange={setQuantity} />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <TextInputField label="Shelf / location" value={shelfLocation} onChange={setShelfLocation} placeholder="Aisle / bay / shelf" />
                <TextInputField label="Expiry" value={expiryDate} onChange={setExpiryDate} placeholder="YYYY-MM-DD" />
                <TextInputField label="Lot / batch" value={batchLot} onChange={setBatchLot} placeholder="Batch if visible" />
              </div>
              <TextInputField
                label={currentType.noteRequired ? "Note required" : "Note"}
                value={evidenceNote}
                onChange={setEvidenceNote}
                placeholder={currentType.noteRequired ? "Required: describe what was observed..." : "Optional note, e.g. broken pack or expired on shelf"}
              />
            </SectionCard>

            <StickyActions leftLabel="Clear Item" rightLabel="Add to Queue" onLeft={resetItem} onRight={addToQueue} rightDisabled={quantity === "" || Number(quantity) <= 0} />
          </>
        ) : (
          <SectionCard className="border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <ScanLine className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-black leading-tight text-foreground">Ready to record waste</p>
                <p className="mt-1 text-sm font-bold leading-snug text-muted-foreground">Scan an item, classify the stock-out, then add it to the review queue.</p>
              </div>
            </div>
          </SectionCard>
        )}

        <SectionCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Current Queue</p>
              <h2 className="mt-1 text-lg font-black text-foreground">{queue.length} item{queue.length === 1 ? "" : "s"}</h2>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-black text-muted-foreground">Draft</span>
          </div>
          <div className="mt-3 space-y-2">
            {queue.length ? queue.map((review) => <QueueCard key={review.reviewId} review={review} />) : <EmptyState title="Queue empty" helper="Scan an item and add waste evidence before submitting." />}
          </div>
        </SectionCard>

        <SectionCard className="space-y-2">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <RotateCcw className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-foreground">Waste stays review-controlled</p>
              <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">This handheld workflow captures stock-out evidence only. Inventory Desktop remains the posting, audit, and review layer.</p>
            </div>
          </div>
        </SectionCard>
      </WorkflowMain>
      <StickyActions
        leftLabel="Refresh Queue"
        rightLabel={queue.length ? `Submit Session (${queue.length})` : "Submit Session"}
        onLeft={refreshReviews}
        onRight={submitSession}
        rightDisabled={!queue.length}
      />
    </PageShell>
  );
}