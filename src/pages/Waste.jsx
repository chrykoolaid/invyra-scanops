import React, { useEffect, useMemo, useState } from "react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import {
  EmptyState,
  InfoLine,
  ItemSummaryCard,
  PageShell,
  QuantityStepper,
  SectionCard,
  StickyActions,
  TextInputField,
  WorkflowMain,
} from "../components/scanner/WorkflowPrimitives";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { getDefaultExpiryDate, getDefaultLotBatch } from "../lib/scanOpsItemAttributes";
import { useScanOpsSession } from "../lib/scanOpsSession";
import {
  canApproveWasteReview,
  canCreateAdjustmentContract,
  canSubmitWasteReview,
  createAdjustmentContract,
  createWasteReviewDraft,
  decideWasteReview,
  filterWasteReviews,
  formatReorderImpact,
  getAdjustmentContracts,
  getWasteReviews,
  getWasteReviewOptionLabel,
  getWasteReviewReason,
  submitWasteReview,
  WASTE_REVIEW_FILTERS,
  WASTE_REVIEW_REASON_OPTIONS,
  WASTE_REVIEW_STATUSES,
  WASTE_REVIEW_TYPE_OPTIONS,
} from "../lib/scanOpsWasteReview";

function getUnit(item) {
  return item?.unitType || item?.unit_type || "each";
}

function currencyAmount(currency, value) {
  if (value == null || value === "") return "—";
  return `${currency || "₱"}${Number(value).toFixed(2)}`;
}

function statusTone(status) {
  if ([WASTE_REVIEW_STATUSES.APPROVED, WASTE_REVIEW_STATUSES.ADJUSTMENT_CONTRACT_CREATED].includes(status)) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if ([WASTE_REVIEW_STATUSES.REJECTED, WASTE_REVIEW_STATUSES.BLOCKED].includes(status)) return "bg-red-50 text-red-700 border-red-200";
  if ([WASTE_REVIEW_STATUSES.RETURNED, WASTE_REVIEW_STATUSES.SHRINK_REVIEW_REQUIRED].includes(status)) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-secondary text-muted-foreground border-border";
}

function StatusPill({ children, status }) {
  return <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${statusTone(status)}`}>{children}</span>;
}

function MiniButton({ children, onClick, disabled = false, variant = "secondary" }) {
  const classes = variant === "primary"
    ? "bg-primary text-primary-foreground active:scale-[0.98]"
    : variant === "danger"
      ? "bg-red-50 text-red-700 active:bg-red-100"
      : "bg-secondary text-secondary-foreground active:bg-border";
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`min-h-10 rounded-xl px-3 text-xs font-black disabled:opacity-40 ${classes}`}>
      {children}
    </button>
  );
}

function ReviewQueueCard({ review, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(review.reviewId)}
      className={`w-full min-w-0 rounded-2xl border p-3 text-left active:scale-[0.99] ${selected ? "border-primary bg-primary/5" : "border-border bg-card"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-black text-foreground">{review.itemName}</p>
          <p className="mt-1 break-words text-xs font-bold text-muted-foreground">
            {review.reasonLabel} · Qty {review.quantity} {review.unitOfMeasure}
          </p>
          <p className="mt-1 break-words text-xs font-semibold text-muted-foreground">
            Source: {review.sourceWorkflow === "MARKDOWN_BLOCK" ? "Markdown Block" : review.sourceWorkflow || "Waste Review"}
          </p>
        </div>
        <StatusPill status={review.status}>{review.status}</StatusPill>
      </div>
    </button>
  );
}

function ReviewDetails({ review, session, onSubmit, onApprove, onReturn, onReject, onContract }) {
  const submitAllowed = canSubmitWasteReview(review, session);
  const approveAllowed = canApproveWasteReview(review, session);
  const contractAllowed = canCreateAdjustmentContract(review, session);
  const role = session?.actorRole || "Staff";
  const contractLabel = review?.linkedAdjustmentContractId ? "Contract Created" : "Create Adjustment Contract";

  return (
    <SectionCard className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Selected Review</p>
          <h2 className="mt-1 break-words text-lg font-black text-foreground">{review.itemName}</h2>
          <p className="mt-1 break-words text-xs font-bold text-muted-foreground">
            SKU {review.sku || "—"} · Barcode {review.barcode || "—"}
          </p>
        </div>
        <StatusPill status={review.status}>{review.status}</StatusPill>
      </div>

      <div className="rounded-2xl bg-secondary/50 p-3 space-y-2">
        <InfoLine label="Department" value={review.department || "—"} />
        <InfoLine label="Location" value={review.shelfLocation || "—"} />
        <InfoLine label="Type" value={getWasteReviewOptionLabel(WASTE_REVIEW_TYPE_OPTIONS, review.reviewType)} />
        <InfoLine label="Reason" value={review.reasonLabel} />
        <InfoLine label="Quantity" value={`${review.quantity} ${review.unitOfMeasure}`} />
        <InfoLine label="Expiry" value={review.expiryDate || "—"} />
        <InfoLine label="Batch/Lot" value={review.batchLot || "—"} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Evidence</p>
        <InfoLine label="Evidence note" value={review.evidenceNote || "Note required"} />
        <InfoLine label="Photo/file" value="Deferred in this stage" />
        <InfoLine label="Evidence status" value={review.evidenceStatus === "NOTE_CAPTURED_ATTACHMENT_DEFERRED" ? "Note captured" : "Note required"} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Governance</p>
        <InfoLine label="Impact" value={formatReorderImpact(review)} />
        <InfoLine label="Approval required" value={review.approvalRoleRequired || "Supervisor"} />
        <InfoLine label="Risk" value={review.riskLevel || "Normal"} />
        <InfoLine label="Estimated total" value={currencyAmount(review.currency, review.estimatedTotalCost)} />
        <InfoLine label="Adjustment contract" value={review.adjustmentContractStatus || "Pending"} />
        <InfoLine label="Inventory sync" value="Deferred to Stage AH" />
        <InfoLine label="Current role" value={role} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MiniButton onClick={onSubmit} disabled={!submitAllowed}>Submit Review</MiniButton>
        <MiniButton onClick={onApprove} disabled={!approveAllowed} variant="primary">Approve</MiniButton>
        <MiniButton onClick={onReturn} disabled={!approveAllowed}>Return</MiniButton>
        <MiniButton onClick={onReject} disabled={!approveAllowed} variant="danger">Reject</MiniButton>
      </div>
      <MiniButton onClick={onContract} disabled={!contractAllowed} variant="primary">{contractLabel}</MiniButton>
      <p className="rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-bold leading-snug text-muted-foreground">
        Handheld review creates governance evidence and adjustment contracts only. It does not reduce live inventory, change prices, update promotions, or post accounting write-offs.
      </p>
    </SectionCard>
  );
}

function ContractCard({ contract }) {
  if (!contract) return null;
  return (
    <SectionCard className="space-y-2">
      <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Adjustment Contract</p>
      <h2 className="break-words text-base font-black text-foreground">Adjustment contract created</h2>
      <InfoLine label="Contract" value={contract.adjustmentId} />
      <InfoLine label="Direction" value={contract.adjustmentDirection} />
      <InfoLine label="Quantity" value={`${contract.quantity} ${contract.unitOfMeasure || "each"}`} />
      <InfoLine label="Sync" value="Inventory sync deferred" />
      <InfoLine label="Inventory mutation" value="Not implemented in handheld" />
    </SectionCard>
  );
}

export default function Waste() {
  const session = useScanOpsSession();
  const [scanValue, setScanValue] = useState("");
  const [item, setItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [reasonCode, setReasonCode] = useState("expired_out_of_date");
  const [expiryDate, setExpiryDate] = useState("");
  const [batchLot, setBatchLot] = useState("");
  const [shelfLocation, setShelfLocation] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [filter, setFilter] = useState("all");
  const [reviews, setReviews] = useState([]);
  const [selectedReviewId, setSelectedReviewId] = useState(null);
  const [inlineMessage, setInlineMessage] = useState("");
  const [latestContract, setLatestContract] = useState(null);

  const selectedReview = useMemo(() => reviews.find((review) => review.reviewId === selectedReviewId) || reviews[0] || null, [reviews, selectedReviewId]);
  const filteredReviews = useMemo(() => filterWasteReviews(reviews, filter), [reviews, filter]);
  const reason = getWasteReviewReason(reasonCode);
  const unit = getUnit(item);

  const refreshReviews = (selectId = selectedReviewId) => {
    const nextReviews = getWasteReviews();
    setReviews(nextReviews);
    if (selectId && nextReviews.some((review) => review.reviewId === selectId)) {
      setSelectedReviewId(selectId);
    } else {
      setSelectedReviewId(nextReviews[0]?.reviewId || null);
    }
  };

  useEffect(() => {
    refreshReviews(null);
    const contracts = getAdjustmentContracts();
    setLatestContract(contracts[0] || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scan = (value) => {
    const found = typeof value === "object" ? value : resolveInventoryIdentity(String(value || "").trim());
    if (!found) return;
    const rawScanValue = typeof value === "object" ? value?._searchMatch?.matchedValue || value?.barcode || value?.gtin || "" : String(value || "").trim();
    setItem(found);
    setScanValue(rawScanValue);
    setQuantity((found?.unitType || found?.unit_type) === "kg" ? 1 : 1);
    const defaultReason = found?.wasteReviewRequired || found?.expiry_status === "Expired" || found?.freshness_default === "needs_supervisor_review" ? "expired_out_of_date" : "damaged_in_handling";
    setReasonCode(defaultReason);
    setExpiryDate(getDefaultExpiryDate(found));
    setBatchLot(getDefaultLotBatch(found));
    setShelfLocation(found?.shelfLocation || found?.location || found?.aisle || found?.shelf || "");
    setEvidenceNote("");
    setInlineMessage("");
    setLatestContract(null);
  };

  const saveDraft = () => {
    if (!item || quantity <= 0 || !reasonCode) return;
    const review = createWasteReviewDraft({ item, reasonCode, quantity, expiryDate, batchLot, shelfLocation, evidenceNote });
    refreshReviews(review.reviewId);
    setItem(null);
    setScanValue("");
    setQuantity(1);
    setEvidenceNote("");
    setInlineMessage("Waste review draft saved. No stock, price, promotion, accounting, or sync mutation was posted.");
  };

  const submitSelected = () => {
    if (!selectedReview) return;
    const updated = submitWasteReview(selectedReview.reviewId);
    refreshReviews(updated?.reviewId);
    setInlineMessage(updated ? `${updated.status}. Review is role-gated and inventory sync remains deferred.` : "Review was not submitted.");
  };

  const decideSelected = (action) => {
    if (!selectedReview) return;
    const updated = decideWasteReview(selectedReview.reviewId, action, action === "approve" ? "Approved from handheld governance review" : `${action} from handheld governance review`);
    refreshReviews(updated?.reviewId);
    setInlineMessage(updated ? `${updated.approvalDecision}. Product master stock, price, and promotion records were not changed.` : "Review decision was not saved.");
  };

  const createContract = () => {
    if (!selectedReview) return;
    const result = createAdjustmentContract(selectedReview.reviewId);
    refreshReviews(result.review?.reviewId);
    setLatestContract(result.contract || null);
    setInlineMessage(result.duplicateBlocked ? "Duplicate adjustment contract blocked for this approved review." : "Adjustment contract created. Inventory sync deferred.");
  };

  const queueCounts = useMemo(() => ({
    all: reviews.length,
    draft: filterWasteReviews(reviews, "draft").length,
    pending: filterWasteReviews(reviews, "pending").length,
    approved: filterWasteReviews(reviews, "approved").length,
    blocked: filterWasteReviews(reviews, "blocked").length,
    shrink: filterWasteReviews(reviews, "shrink").length,
  }), [reviews]);

  return (
    <PageShell>
      <WorkflowHeader
        title="Waste Review"
        subtitle="Waste, shrink, and adjustment review"
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={scan}
        placeholder="Search / scan item, SKU, barcode..."
      />
      <WorkflowMain>
        {inlineMessage && (
          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold leading-snug text-muted-foreground">
            {inlineMessage}
          </div>
        )}

        <SectionCard className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Queue</p>
              <h2 className="mt-1 text-xl font-black text-foreground">{reviews.length} review{reviews.length === 1 ? "" : "s"}</h2>
            </div>
            <StatusPill status="Synced">Synced</StatusPill>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {WASTE_REVIEW_FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                className={`min-h-10 rounded-xl px-2 text-xs font-black ${filter === option.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
              >
                {option.label} {queueCounts[option.id] != null ? queueCounts[option.id] : ""}
              </button>
            ))}
          </div>
          {filteredReviews.length ? (
            <div className="space-y-2">
              {filteredReviews.map((review) => (
                <ReviewQueueCard key={review.reviewId} review={review} selected={selectedReview?.reviewId === review.reviewId} onSelect={setSelectedReviewId} />
              ))}
            </div>
          ) : (
            <EmptyState title="No reviews in this queue." helper="Scan an item to create a waste/shrink review draft. Blocked markdown records appear here when available." />
          )}
        </SectionCard>

        {item ? (
          <>
            <ItemSummaryCard item={item}>
              <p className="text-xs font-bold text-muted-foreground">
                Freshness: {item.freshnessStatus || item.expiry_status || "—"} · Use-by: {expiryDate || "—"}
              </p>
            </ItemSummaryCard>
            <SectionCard className="space-y-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Create Review Draft</p>
                <h2 className="mt-1 text-lg font-black text-foreground">Evidence and reason</h2>
              </div>
              <QuantityStepper label="Review qty" value={quantity} onChange={setQuantity} unit={unit} min={1} />
              <TouchSelect label="Reason" value={reasonCode} onChange={setReasonCode} options={WASTE_REVIEW_REASON_OPTIONS} helper={reason.helper} />
              <div className="rounded-2xl bg-secondary/50 p-3 space-y-2">
                <InfoLine label="Review type" value={getWasteReviewOptionLabel(WASTE_REVIEW_TYPE_OPTIONS, reason.reviewType)} />
                <InfoLine label="Reorder impact" value={reason.reorderImpact === "INCLUDED_IN_REORDER_INTELLIGENCE" ? "Included in reorder intelligence" : "Excluded from reorder demand"} />
                <InfoLine label="Photo/file" value="Deferred in this stage" />
              </div>
              <TextInputField label="Expiry date" value={expiryDate} onChange={setExpiryDate} type="date" />
              <TextInputField label="Batch/Lot" value={batchLot} onChange={setBatchLot} placeholder="Optional batch or lot..." />
              <TextInputField label="Shelf location" value={shelfLocation} onChange={setShelfLocation} placeholder="Aisle / bay / shelf..." />
              <TextInputField label="Evidence note" value={evidenceNote} onChange={setEvidenceNote} placeholder="Example: expired on shelf, seal broken, missing from bay..." />
              <p className="rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-bold leading-snug text-muted-foreground">
                Photo/file evidence is deferred in Stage AE. Note evidence is captured now and included in audit/sync-ready events.
              </p>
            </SectionCard>
          </>
        ) : null}

        {selectedReview ? (
          <ReviewDetails
            review={selectedReview}
            session={session}
            onSubmit={submitSelected}
            onApprove={() => decideSelected("approve")}
            onReturn={() => decideSelected("return")}
            onReject={() => decideSelected("reject")}
            onContract={createContract}
          />
        ) : null}

        <ContractCard contract={latestContract} />

        {!item && !selectedReview ? (
          <EmptyState title="Waste Review is ready." helper="Use the header search/scan field to add a waste, shrink, supplier fault, operational use, or markdown-block review." />
        ) : null}
      </WorkflowMain>
      <StickyActions
        leftLabel={item ? "Clear Item" : "Refresh Queue"}
        rightLabel="Save Draft"
        onLeft={() => {
          if (item) {
            setItem(null);
            setScanValue("");
            setInlineMessage("");
          } else {
            refreshReviews(selectedReviewId);
            setInlineMessage("Waste Review queue refreshed.");
          }
        }}
        onRight={saveDraft}
        rightDisabled={!item || quantity <= 0 || !reasonCode}
      />
    </PageShell>
  );
}
