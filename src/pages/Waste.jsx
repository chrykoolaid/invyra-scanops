import React, { useEffect, useMemo, useState } from "react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import GovernanceContextStrip from "../components/scanner/GovernanceContextStrip";
import TouchSelect from "../components/scanner/TouchSelect";
import {
  EmptyState,
  FieldError,
  InfoLine,
  ItemSummaryCard,
  OperatorAlert,
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
import { restrictedActionReason } from "../lib/scanOpsPermissions";
import {
  GOVERNED_ACTIONS,
  canPerformScanOpsAction,
  recordGovernedAction,
  useScanOpsGovernanceContext,
} from "../lib/scanOpsGovernance";
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
  const needsSubmit = [WASTE_REVIEW_STATUSES.DRAFT, WASTE_REVIEW_STATUSES.RETURNED, WASTE_REVIEW_STATUSES.PENDING_REVIEW].includes(review.status);
  const needsApproval = [
    WASTE_REVIEW_STATUSES.PENDING_SUPERVISOR_APPROVAL,
    WASTE_REVIEW_STATUSES.PENDING_MANAGER_APPROVAL,
    WASTE_REVIEW_STATUSES.SHRINK_REVIEW_REQUIRED,
  ].includes(review.status);
  const needsContract = [WASTE_REVIEW_STATUSES.APPROVED, WASTE_REVIEW_STATUSES.ADJUSTMENT_CONTRACT_READY].includes(review.status) && !review.linkedAdjustmentContractId && review.adjustmentContractStatus !== "Created";
  const approvalReason = review.approvalRoleRequired === "Manager" ? "Manager approval required" : restrictedActionReason("Supervisor");
  const contractReason = restrictedActionReason("Manager");
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
        <InfoLine label="Inventory sync" value="Deferred" />
        <InfoLine label="Current role" value={role} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {needsSubmit && <MiniButton onClick={onSubmit} disabled={!submitAllowed}>Submit Review</MiniButton>}
        {needsSubmit && !submitAllowed && <p className="col-span-2 rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-black text-muted-foreground">Review required</p>}
        {needsApproval && approveAllowed && (
          <>
            <MiniButton onClick={onApprove} variant="primary">Approve</MiniButton>
            <MiniButton onClick={onReturn}>Return</MiniButton>
            <MiniButton onClick={onReject} variant="danger">Reject</MiniButton>
          </>
        )}
        {needsApproval && !approveAllowed && <p className="col-span-2 rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-black text-muted-foreground">{approvalReason}</p>}
        {!needsSubmit && !needsApproval && !needsContract && <p className="col-span-2 rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-black text-muted-foreground">No review action available</p>}
      </div>
      {needsContract && contractAllowed && <MiniButton onClick={onContract} variant="primary">{contractLabel}</MiniButton>}
      {needsContract && !contractAllowed && <p className="rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-black text-muted-foreground">{contractReason}</p>}
      <p className="rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-bold leading-snug text-muted-foreground">
        Review evidence only. Live inventory, prices, promos, and accounting stay unchanged.
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
  const governance = useScanOpsGovernanceContext();
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
  const [operatorError, setOperatorError] = useState(null);

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
    setOperatorError(null);
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
    if (!item) {
      setOperatorError({ title: "Item required", helper: "Scan or search an item before saving a waste review." });
      return;
    }
    if (quantity <= 0 || Number.isNaN(Number(quantity))) {
      setOperatorError({ title: "Quantity missing", helper: "Enter a valid waste quantity before saving. Your item stays on screen." });
      return;
    }
    if (!reasonCode) {
      setOperatorError({ title: "Reason required", helper: "Choose a waste reason before saving. Your item stays on screen." });
      return;
    }
    setOperatorError(null);
    const permission = canPerformScanOpsAction(GOVERNED_ACTIONS.WASTE_SUBMIT, governance);
    if (!permission.allowed) {
      recordGovernedAction(GOVERNED_ACTIONS.WASTE_SUBMIT, "Waste Review", null, permission);
      setOperatorError({ title: "Permission required", helper: permission.reason || "This waste action is blocked for the current role." });
      setInlineMessage("");
      return;
    }
    recordGovernedAction(GOVERNED_ACTIONS.WASTE_SUBMIT, "Waste Review", null, permission, { eventLabel: "Waste review draft saved" });
    const review = createWasteReviewDraft({ item, reasonCode, quantity, expiryDate, batchLot, shelfLocation, evidenceNote });
    refreshReviews(review.reviewId);
    setItem(null);
    setScanValue("");
    setQuantity(1);
    setEvidenceNote("");
    setInlineMessage("Waste review draft saved locally. Pending sync. No stock, price, promotion, or accounting mutation was posted.");
  };

  const submitSelected = () => {
    if (!selectedReview) return;
    const permission = canPerformScanOpsAction(GOVERNED_ACTIONS.WASTE_SUBMIT, governance);
    if (!permission.allowed) {
      recordGovernedAction(GOVERNED_ACTIONS.WASTE_SUBMIT, "Waste Review", selectedReview.reviewId, permission);
      setOperatorError({ title: "Permission required", helper: permission.reason || "This waste action is blocked for the current role." });
      setInlineMessage("");
      return;
    }
    const updated = submitWasteReview(selectedReview.reviewId);
    refreshReviews(updated?.reviewId);
    setInlineMessage(updated ? `${updated.status}. Saved locally. Pending sync. Review is role-gated.` : "Review was not submitted.");
  };

  const decideSelected = (action) => {
    if (!selectedReview) return;
    const actionKey = selectedReview.approvalRoleRequired === "Manager" ? GOVERNED_ACTIONS.SHRINK_APPROVE_HIGH_VALUE : GOVERNED_ACTIONS.WASTE_APPROVE_NORMAL;
    const permission = canPerformScanOpsAction(actionKey, governance);
    if (!permission.allowed) {
      recordGovernedAction(actionKey, "Waste Review", selectedReview.reviewId, permission);
      setOperatorError({ title: selectedReview?.approvalRoleRequired === "Manager" ? "Manager approval required" : "Supervisor required", helper: permission.reason || "This review is blocked until approved by an authorised role." });
      setInlineMessage("");
      return;
    }
    const updated = decideWasteReview(selectedReview.reviewId, action, action === "approve" ? "Approved from handheld governance review" : `${action} from handheld governance review`);
    refreshReviews(updated?.reviewId);
    setInlineMessage(updated ? `${updated.approvalDecision}. Product master stock, price, and promotion records were not changed.` : "Review decision was not saved.");
  };

  const createContract = () => {
    if (!selectedReview) return;
    const permission = canPerformScanOpsAction(GOVERNED_ACTIONS.ADJUSTMENT_CONTRACT_CREATE, governance);
    if (!permission.allowed) {
      recordGovernedAction(GOVERNED_ACTIONS.ADJUSTMENT_CONTRACT_CREATE, "Waste Review", selectedReview.reviewId, permission);
      setOperatorError({ title: "Manager required", helper: permission.reason || "Adjustment contracts require Manager/Admin approval." });
      setInlineMessage("");
      return;
    }
    const result = createAdjustmentContract(selectedReview.reviewId);
    refreshReviews(result.review?.reviewId);
    setLatestContract(result.contract || null);
    setInlineMessage(result.duplicateBlocked ? "Duplicate adjustment contract blocked for this approved review." : "Adjustment contract created. Pending sync.");
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
        <GovernanceContextStrip />
        {operatorError && <OperatorAlert title={operatorError.title} helper={operatorError.helper} tone={operatorError.tone || "warning"} actions={[{ label: "Keep Editing", onClick: () => setOperatorError(null), variant: "primary" }]} />}
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
            <EmptyState title="No reviews in this queue." helper="Scan an item to start a waste log. Blocked markdown records appear here when available." />
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
              <QuantityStepper label="Review qty" value={(quantity)} onChange={(value) => { setQuantity(value); if (operatorError?.title === "Quantity missing") setOperatorError(null); }} unit={unit} min={1} />
              {(quantity <= 0 || Number.isNaN(Number(quantity))) && <FieldError title="Quantity missing" helper="Enter a valid quantity before saving." />}
              <TouchSelect label="Reason" value={reasonCode} onChange={(value) => { setReasonCode(value); if (operatorError?.title === "Reason required") setOperatorError(null); }} options={WASTE_REVIEW_REASON_OPTIONS} helper={reason.helper} />
              {!reasonCode && <FieldError title="Reason required" helper="Choose a waste reason before saving." />}
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
                Photo/file evidence deferred. Note evidence is saved now.
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
          <EmptyState title="Waste Review is ready." helper="Scan an item to start a waste log or select an existing review." />
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
            setOperatorError(null);
          } else {
            refreshReviews(selectedReviewId);
            setOperatorError(null);
            setInlineMessage("Waste Review queue refreshed.");
          }
        }}
        onRight={saveDraft}
        rightDisabled={false}
      />
    </PageShell>
  );
}
