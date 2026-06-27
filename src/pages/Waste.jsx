import React, { useEffect, useMemo, useState } from "react";
import { PackagePlus, Trash2 } from "lucide-react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import GovernanceContextStrip from "../components/scanner/GovernanceContextStrip";
import TouchSelect from "../components/scanner/TouchSelect";
import {
  EmptyState,
  FieldError,
  ItemSummaryCard,
  OperatorAlert,
  PageShell,
  QuantityStepper,
  SectionCard,
  StickyActions,
  TextInputField,
  WorkflowMain,
} from "../components/scanner/WorkflowPrimitives";
import { resolveInventoryIdentity, ensureInventoryLoaded } from "../lib/inventorySystemAdapter";
import { writeWasteRecord } from "../lib/scanOpsRecordWriter";
import { getDefaultExpiryDate, getDefaultLotBatch } from "../lib/scanOpsItemAttributes";
import {
  GOVERNED_ACTIONS,
  canPerformScanOpsAction,
  recordGovernedAction,
  useScanOpsGovernanceContext,
} from "../lib/scanOpsGovernance";
import {
  createWasteReviewDraft,
  filterWasteReviews,
  getWasteReviews,
  getWasteReviewReason,
  submitWasteReview,
  WASTE_REVIEW_REASON_OPTIONS,
} from "../lib/scanOpsWasteReview";

const STOCK_OUT_TYPES = [
  {
    id: "wastage_damage",
    label: "Wastage / Damage",
    tone: "border-red-200 bg-red-50 text-red-800",
    helper: "Unsaleable stock loss",
    examples: "Damaged, broken, contaminated",
    defaultReason: "damaged_in_handling",
    reasonIds: ["damaged_in_handling", "packaging_broken", "spillage", "contamination_risk"],
  },
  {
    id: "expired_spoiled",
    label: "Expired / Spoiled",
    tone: "border-orange-200 bg-orange-50 text-orange-800",
    helper: "Expired or spoiled stock",
    examples: "Expired, spoiled, temperature issue",
    defaultReason: "expired_out_of_date",
    reasonIds: ["expired_out_of_date", "spoiled_rotten", "temperature_issue"],
  },
  {
    id: "store_use",
    label: "Store Use",
    tone: "border-blue-200 bg-blue-50 text-blue-800",
    helper: "Business consumption",
    examples: "Cleaning, office, staff, display",
    defaultReason: "store_use",
    reasonIds: ["store_use", "production_use", "sampling_promos", "training_use"],
  },
  {
    id: "suspected_theft_loss",
    label: "Suspected Theft / Loss",
    tone: "border-amber-200 bg-amber-50 text-amber-800",
    helper: "Controlled loss review",
    examples: "Suspected theft, empty pack, tampering",
    defaultReason: "theft_suspected_theft",
    noteRequired: true,
    reasonIds: ["theft_suspected_theft", "seal_tampering", "missing_stock"],
  },
  {
    id: "unknown_shrinkage",
    label: "Unknown Shrinkage",
    tone: "border-slate-300 bg-slate-50 text-slate-800",
    helper: "Unexplained stock loss",
    examples: "Unknown loss, count discrepancy",
    defaultReason: "unknown_loss",
    noteRequired: true,
    reasonIds: ["unknown_loss", "count_discrepancy", "high_value_discrepancy"],
  },
];

const QUEUE_CLASS_META = {
  expired_out_of_date: { label: "Expired / Spoiled", tone: "bg-orange-50 text-orange-800 border-orange-200" },
  spoiled_rotten: { label: "Expired / Spoiled", tone: "bg-orange-50 text-orange-800 border-orange-200" },
  temperature_issue: { label: "Expired / Spoiled", tone: "bg-orange-50 text-orange-800 border-orange-200" },
  damaged_in_handling: { label: "Wastage / Damage", tone: "bg-red-50 text-red-800 border-red-200" },
  packaging_broken: { label: "Wastage / Damage", tone: "bg-red-50 text-red-800 border-red-200" },
  spillage: { label: "Wastage / Damage", tone: "bg-red-50 text-red-800 border-red-200" },
  contamination_risk: { label: "Wastage / Damage", tone: "bg-red-50 text-red-800 border-red-200" },
  store_use: { label: "Store Use", tone: "bg-blue-50 text-blue-800 border-blue-200" },
  production_use: { label: "Store Use", tone: "bg-blue-50 text-blue-800 border-blue-200" },
  sampling_promos: { label: "Store Use", tone: "bg-blue-50 text-blue-800 border-blue-200" },
  training_use: { label: "Store Use", tone: "bg-blue-50 text-blue-800 border-blue-200" },
  theft_suspected_theft: { label: "Suspected Theft / Loss", tone: "bg-amber-50 text-amber-800 border-amber-200" },
  seal_tampering: { label: "Suspected Theft / Loss", tone: "bg-amber-50 text-amber-800 border-amber-200" },
  missing_stock: { label: "Suspected Theft / Loss", tone: "bg-amber-50 text-amber-800 border-amber-200" },
  unknown_loss: { label: "Unknown Shrinkage", tone: "bg-slate-50 text-slate-800 border-slate-300" },
  count_discrepancy: { label: "Unknown Shrinkage", tone: "bg-slate-50 text-slate-800 border-slate-300" },
  high_value_discrepancy: { label: "Unknown Shrinkage", tone: "bg-slate-50 text-slate-800 border-slate-300" },
};

function getUnit(item) {
  return item?.unitType || item?.unit_type || "each";
}

function getAvailable(item) {
  return item?.stockOnHand ?? item?.stock_on_hand ?? item?.available ?? item?.availableStock ?? item?.shelfStock ?? item?.shelf_stock ?? "—";
}

function StatusPill({ children }) {
  return <span className="inline-flex rounded-full border border-border bg-secondary px-2 py-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">{children}</span>;
}

function TypeButton({ type, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-24 rounded-3xl border p-3 text-left active:scale-[0.99] ${active ? type.tone : "border-border bg-card text-foreground"}`}
    >
      <p className="text-sm font-black">{type.label}</p>
      <p className="mt-1 text-xs font-bold opacity-80">{type.helper}</p>
      <p className="mt-2 text-[11px] font-bold opacity-70">{type.examples}</p>
    </button>
  );
}

function QueueCard({ review }) {
  const meta = QUEUE_CLASS_META[review.reasonCode] || { label: review.reviewType === "operational_use" ? "Store Use" : review.reviewType === "shrink" ? "Loss Review" : "Wastage / Damage", tone: "bg-secondary text-muted-foreground border-border" };

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-black text-foreground">{review.itemName}</p>
          <p className="mt-1 text-xs font-bold text-muted-foreground">Qty {review.quantity} {review.unitOfMeasure} · {review.reasonLabel}</p>
          <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{review.syncStatus || "Sync deferred"}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${meta.tone}`}>{meta.label}</span>
      </div>
    </div>
  );
}

export default function Waste() {
  const governance = useScanOpsGovernanceContext();
  const [scanValue, setScanValue] = useState("");
  const [item, setItem] = useState(null);
  const [stockOutType, setStockOutType] = useState("wastage_damage");
  const [quantity, setQuantity] = useState(1);
  const [reasonCode, setReasonCode] = useState("damaged_in_handling");
  const [expiryDate, setExpiryDate] = useState("");
  const [batchLot, setBatchLot] = useState("");
  const [shelfLocation, setShelfLocation] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [reviews, setReviews] = useState([]);
  const [inlineMessage, setInlineMessage] = useState("");
  const [operatorError, setOperatorError] = useState(null);

  const currentType = STOCK_OUT_TYPES.find((type) => type.id === stockOutType) || STOCK_OUT_TYPES[0];
  const reason = getWasteReviewReason(reasonCode);
  const unit = getUnit(item);
  const currentSession = useMemo(() => filterWasteReviews(reviews, "draft"), [reviews]);
  const reasonOptions = useMemo(() => {
    const allowed = new Set(currentType.reasonIds);
    return WASTE_REVIEW_REASON_OPTIONS.filter((option) => allowed.has(option.id));
  }, [currentType]);

  const refreshReviews = () => setReviews(getWasteReviews());

  useEffect(() => {
    ensureInventoryLoaded();
    refreshReviews();
  }, []);

  const resetCurrentItem = () => {
    setItem(null);
    setScanValue("");
    setQuantity(1);
    setEvidenceNote("");
    setInlineMessage("");
    setOperatorError(null);
  };

  const scan = (value) => {
    const found = typeof value === "object" ? value : resolveInventoryIdentity(String(value || "").trim());
    if (!found) return;
    const rawScanValue = typeof value === "object" ? value?._searchMatch?.matchedValue || value?.barcode || value?.gtin || "" : String(value || "").trim();
    const defaultType = found?.wasteReviewRequired || found?.expiry_status === "Expired" || found?.freshness_default === "needs_supervisor_review" ? "expired_spoiled" : stockOutType;
    const nextType = STOCK_OUT_TYPES.find((type) => type.id === defaultType) || STOCK_OUT_TYPES[0];

    setOperatorError(null);
    setItem(found);
    setScanValue(rawScanValue);
    setQuantity(1);
    setStockOutType(nextType.id);
    setReasonCode(nextType.defaultReason);
    setExpiryDate(getDefaultExpiryDate(found));
    setBatchLot(getDefaultLotBatch(found));
    setShelfLocation(found?.shelfLocation || found?.location || found?.aisle || found?.shelf || "");
    setEvidenceNote("");
    setInlineMessage("");
  };

  const selectType = (type) => {
    setStockOutType(type.id);
    setReasonCode(type.defaultReason);
    setOperatorError(null);
  };

  const addToQueue = () => {
    if (!item) {
      setOperatorError({ title: "Item required", helper: "Scan or search an item before adding it to the session." });
      return;
    }
    if (quantity <= 0 || Number.isNaN(Number(quantity))) {
      setOperatorError({ title: "Quantity missing", helper: "Enter a valid quantity before adding this item." });
      return;
    }
    if (!reasonCode) {
      setOperatorError({ title: "Reason required", helper: "Choose a reason before adding this item." });
      return;
    }
    if (currentType.noteRequired && !evidenceNote.trim()) {
      setOperatorError({ title: "Note required", helper: `${currentType.label} events require a note before adding to the queue.` });
      return;
    }

    const permission = canPerformScanOpsAction(GOVERNED_ACTIONS.WASTE_SUBMIT, governance);
    if (!permission.allowed) {
      recordGovernedAction(GOVERNED_ACTIONS.WASTE_SUBMIT, "Waste Review", null, permission);
      setOperatorError({ title: "Permission required", helper: permission.reason || "This stock-out action is blocked for the current role." });
      return;
    }

    recordGovernedAction(GOVERNED_ACTIONS.WASTE_SUBMIT, "Waste Review", null, permission, { eventLabel: "Stock-out item added to session" });
    const review = createWasteReviewDraft({ item, reasonCode, quantity, expiryDate, batchLot, shelfLocation, evidenceNote });
    writeWasteRecord({ item, reasonCode, quantity, expiryDate, batchLot, evidenceNote, status: "draft", reviewId: review.reviewId });
    refreshReviews();
    resetCurrentItem();
    setInlineMessage("Added to queue. Ready for next scan.");
  };

  const submitSession = () => {
    if (!currentSession.length) {
      setOperatorError({ title: "Queue empty", helper: "Add at least one item before submitting the session." });
      return;
    }

    const permission = canPerformScanOpsAction(GOVERNED_ACTIONS.WASTE_SUBMIT, governance);
    if (!permission.allowed) {
      recordGovernedAction(GOVERNED_ACTIONS.WASTE_SUBMIT, "Waste Review", null, permission);
      setOperatorError({ title: "Permission required", helper: permission.reason || "This stock-out session is blocked for the current role." });
      return;
    }

    const submitted = currentSession.map((review) => submitWasteReview(review.reviewId)).filter(Boolean);
    refreshReviews();
    setInlineMessage(`${submitted.length} item${submitted.length === 1 ? "" : "s"} submitted. Queue cleared for the next session.`);
    setOperatorError(null);
  };

  return (
    <PageShell>
      <WorkflowHeader
        title="Stock-Out Session"
        subtitle="Scan → qty → class → reason → add to queue"
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={scan}
        placeholder="Scan item barcode or search..."
      />
      <WorkflowMain>
        <GovernanceContextStrip />
        {operatorError && <OperatorAlert title={operatorError.title} helper={operatorError.helper} tone={operatorError.tone || "warning"} actions={[{ label: "Keep Editing", onClick: () => setOperatorError(null), variant: "primary" }]} />}
        {inlineMessage && (
          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold leading-snug text-muted-foreground">
            {inlineMessage}
          </div>
        )}

        {item ? (
          <>
            <ItemSummaryCard item={item}>
              <p className="text-xs font-bold text-muted-foreground">Available: {getAvailable(item)} {unit} · Location: {shelfLocation || "—"}</p>
            </ItemSummaryCard>

            <SectionCard className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Current Item</p>
                  <h2 className="mt-1 text-lg font-black text-foreground">What happened?</h2>
                </div>
                <StatusPill>Step 2</StatusPill>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {STOCK_OUT_TYPES.map((type) => <TypeButton key={type.id} type={type} active={stockOutType === type.id} onClick={() => selectType(type)} />)}
              </div>
              <QuantityStepper label="Quantity" value={quantity} onChange={(value) => { setQuantity(value); if (operatorError?.title === "Quantity missing") setOperatorError(null); }} unit={unit} min={1} />
              {(quantity <= 0 || Number.isNaN(Number(quantity))) && <FieldError title="Quantity missing" helper="Enter a valid quantity before adding." />}
              <TouchSelect label="Reason" value={reasonCode} onChange={(value) => { setReasonCode(value); if (operatorError?.title === "Reason required") setOperatorError(null); }} options={reasonOptions} helper={reason.helper} />
              <TextInputField label={currentType.noteRequired ? "Note required" : "Note"} value={evidenceNote} onChange={setEvidenceNote} placeholder={currentType.noteRequired ? "Required: describe what was observed..." : "Optional note, for example: expired on shelf or opened packaging..."} />
              {currentType.noteRequired && !evidenceNote.trim() && <FieldError title="Note required" helper={`${currentType.label} needs a note for desktop review.`} />}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={resetCurrentItem} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-secondary px-3 text-xs font-black text-secondary-foreground active:bg-border">
                  <Trash2 className="h-4 w-4" /> Clear
                </button>
                <button type="button" onClick={addToQueue} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-3 text-xs font-black text-primary-foreground active:scale-[0.98]">
                  <PackagePlus className="h-4 w-4" /> Add to Queue
                </button>
              </div>
            </SectionCard>
          </>
        ) : (
          <SectionCard className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Ready to Scan</p>
                <h2 className="mt-1 text-lg font-black text-foreground">Scan an item to start</h2>
              </div>
              <StatusPill>Step 1</StatusPill>
            </div>
            <p className="rounded-2xl bg-secondary/60 px-3 py-2 text-sm font-bold leading-snug text-muted-foreground">
              After adding an item, the form resets and the scanner is ready for the next item.
            </p>
          </SectionCard>
        )}

        <SectionCard className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Current Session Queue</p>
              <h2 className="mt-1 text-xl font-black text-foreground">{currentSession.length} item{currentSession.length === 1 ? "" : "s"}</h2>
            </div>
            <StatusPill>Draft</StatusPill>
          </div>

          {currentSession.length ? (
            <div className="space-y-2">
              {currentSession.map((review) => <QueueCard key={review.reviewId} review={review} />)}
            </div>
          ) : (
            <EmptyState title="Queue is empty." helper="Scan an item, enter quantity, choose a class and reason, then add it to the queue." />
          )}
        </SectionCard>
      </WorkflowMain>
      <StickyActions
        leftLabel="Refresh Queue"
        rightLabel={currentSession.length ? `Submit Session (${currentSession.length})` : "Submit Session"}
        onLeft={() => { refreshReviews(); setInlineMessage("Session queue refreshed."); }}
        onRight={submitSession}
        rightDisabled={!currentSession.length}
      />
    </PageShell>
  );
}
