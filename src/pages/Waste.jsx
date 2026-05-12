import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import AttributeEvidenceFields from "../components/scanner/AttributeEvidenceFields";
import TouchSelect from "../components/scanner/TouchSelect";
import {
  DoneCard,
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
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import {
  buildWorkflowItemAttributeSnapshot,
  getDefaultExpiryDate,
  getDefaultLotBatch,
  getDefaultQuantityType,
  saveWorkflowItemAttributeSnapshot,
  summarizeAttributeSnapshot,
} from "../lib/scanOpsItemAttributes";
import {
  buildWasteRequest,
  clearWorkflowDraft,
  getOptionLabel,
  loadWorkflowDraft,
  normalizeWasteRequestLine,
  saveWasteRequest,
  saveWorkflowDraft,
  upsertWasteRequestLine,
  WASTE_CONDITION_OPTIONS,
  WASTE_DISPOSAL_ACTION_OPTIONS,
  WASTE_REASON_OPTIONS,
} from "../lib/scanOpsRequestLifecycle";
import { TASK_DUE_STATES, TASK_PRIORITIES, TASK_TYPES, upsertDerivedTaskFromSource } from "../lib/scanOpsTasks";

function getUnit(item) {
  return item?.unitType || item?.unit_type || "each";
}

function totalQuantity(lines) {
  return lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
}

function needsManagerReview(line) {
  return line.condition === "manager_review_required" || ["held_for_manager_review", "quarantine_food_safety_hold"].includes(line.disposalAction);
}

export default function Waste() {
  const location = useLocation();
  const taskParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const taskReason = taskParams.get("reason");
  const savedDraft = useMemo(() => loadWorkflowDraft("waste"), []);
  const [scanValue, setScanValue] = useState("");
  const [item, setItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState(() => WASTE_REASON_OPTIONS.some((option) => option.id === taskReason) ? taskReason : "expired_short_dated");
  const [condition, setCondition] = useState("unsellable");
  const [disposalAction, setDisposalAction] = useState("discarded");
  const [expiryDate, setExpiryDate] = useState("");
  const [lotBatch, setLotBatch] = useState("");
  const [quantityType, setQuantityType] = useState("each");
  const [enteredWeight, setEnteredWeight] = useState("");
  const [weightSource, setWeightSource] = useState("label_weight");
  const [notes, setNotes] = useState("");
  const [batch, setBatch] = useState(savedDraft?.items || []);
  const [view, setView] = useState(savedDraft?.items?.length ? "entry" : "entry");
  const [submittedRequest, setSubmittedRequest] = useState(null);

  const unit = getUnit(item);
  const reviewCount = useMemo(() => batch.filter(needsManagerReview).length, [batch]);
  const itemCountLabel = `${batch.length} item${batch.length === 1 ? "" : "s"}`;

  useEffect(() => {
    if (view === "done") return;
    saveWorkflowDraft("waste", { items: batch });
  }, [batch, view]);

  const scan = (value) => {
    const found = typeof value === "object" ? value : resolveInventoryIdentity(String(value || "").trim());
    if (!found) return;
    const rawScanValue = typeof value === "object" ? value?._searchMatch?.matchedValue || value?.barcode || value?.gtin || "" : String(value || "").trim();
    setItem(found);
    setQuantity((found?.unitType || found?.unit_type) === "kg" ? 1 : 1);
    setReason(found?.wasteReviewRequired ? "spoiled_temperature_concern" : "expired_short_dated");
    setCondition(found?.wasteReviewRequired ? "temperature_concern" : "unsellable");
    setDisposalAction(found?.wasteReviewRequired ? "quarantine_food_safety_hold" : "discarded");
    setExpiryDate(getDefaultExpiryDate(found));
    setLotBatch(getDefaultLotBatch(found));
    setQuantityType(getDefaultQuantityType(found));
    setEnteredWeight("");
    setWeightSource(rawScanValue?.startsWith("2") ? "label_weight" : "manual_entry");
    setNotes("");
    setView("entry");
    setSubmittedRequest(null);
  };

  const addWaste = () => {
    if (!item || quantity <= 0 || !reason || !condition || !disposalAction) return;
    const attributeSnapshot = buildWorkflowItemAttributeSnapshot({
      workflowType: "waste",
      item,
      scanValue,
      expiryDate,
      lotBatch,
      quantityType,
      enteredQuantity: enteredWeight || quantity,
      weightSource,
      source: "waste_evidence_card",
    });
    saveWorkflowItemAttributeSnapshot(attributeSnapshot);
    const line = normalizeWasteRequestLine({ item, quantity, reason, condition, disposalAction, notes, attributeSnapshot });
    setBatch((current) => upsertWasteRequestLine(current, line));
    createScanOpsEvent(attributeSnapshot.weighted_snapshot ? SCANOPS_EVENT_TYPES.WEIGHTED_ITEM_EVIDENCE_CAPTURED : SCANOPS_EVENT_TYPES.ATTRIBUTE_EVIDENCE_CAPTURED, {
      source_module: "Waste",
      item_name: line.itemName,
      sku: line.sku,
      barcode: line.barcode,
      workflow_type: "waste",
      expiry_date: attributeSnapshot.expiry_snapshot?.expiry_date || null,
      lot_batch: attributeSnapshot.lot_batch_snapshot?.lot_batch_value || null,
      weighted_candidate: Boolean(attributeSnapshot.weighted_snapshot?.weighted_candidate),
      raw_barcode: attributeSnapshot.weighted_snapshot?.raw_barcode || scanValue || null,
      quantity_type: attributeSnapshot.weighted_snapshot?.quantity_type || null,
      entered_quantity: attributeSnapshot.weighted_snapshot?.entered_quantity || null,
      applies_stock_directly: false,
      applies_price_directly: false,
      status: "attribute_evidence_saved",
    });
    createScanOpsEvent(SCANOPS_EVENT_TYPES.WASTE_RECORDED, {
      source_module: "Waste",
      item_name: line.itemName,
      sku: line.sku,
      barcode: line.barcode,
      plu: item.plu || item.scaleCode,
      match_reason: item._searchMatch?.displayReason || null,
      quantity: line.quantity,
      unit_type: line.unit,
      reason_code: reason,
      reason_label: getOptionLabel(WASTE_REASON_OPTIONS, reason),
      condition,
      condition_label: getOptionLabel(WASTE_CONDITION_OPTIONS, condition),
      disposal_action: disposalAction,
      disposal_action_label: getOptionLabel(WASTE_DISPOSAL_ACTION_OPTIONS, disposalAction),
      expiry_date: attributeSnapshot.expiry_snapshot?.expiry_date || null,
      lot_batch: attributeSnapshot.lot_batch_snapshot?.lot_batch_value || null,
      weighted_candidate: Boolean(attributeSnapshot.weighted_snapshot?.weighted_candidate),
      supervisor_review_required: needsManagerReview(line),
      applies_stock_directly: false,
      status: "draft_waste_evidence_added",
    });
    setItem(null);
    setScanValue("");
    setQuantity(1);
    setExpiryDate("");
    setLotBatch("");
    setEnteredWeight("");
    setNotes("");
  };

  const removeLine = (requestItemId) => {
    setBatch((current) => current.filter((line) => line.requestItemId !== requestItemId));
  };

  const submitWaste = () => {
    if (!batch.length) return;
    const request = saveWasteRequest(buildWasteRequest({ items: batch }));
    createScanOpsEvent(reviewCount ? SCANOPS_EVENT_TYPES.WASTE_APPROVAL_REQUIRED : SCANOPS_EVENT_TYPES.WASTE_RECORDED, {
      source_module: "Waste",
      waste_request_id: request.requestId,
      item_count: batch.length,
      total_units: totalQuantity(batch),
      review_required_count: reviewCount,
      status: request.status,
      applies_stock_directly: false,
      official_inventory_applies_after_sync: true,
    });
    upsertDerivedTaskFromSource({
      taskType: TASK_TYPES.WASTE,
      task_kind: "waste_review",
      title: reviewCount ? "Review waste evidence" : "Confirm waste evidence follow-up",
      description: `${batch.length} waste item${batch.length === 1 ? "" : "s"} submitted for evidence follow-up.`,
      action_needed: "Open Waste and record task evidence only. Task completion does not post wastage.",
      evidence_required: "Completion or review note",
      priority: reviewCount ? TASK_PRIORITIES.HIGH : TASK_PRIORITIES.MEDIUM,
      due_state: reviewCount ? TASK_DUE_STATES.NOW : TASK_DUE_STATES.TODAY,
      source_type: "waste_review",
      source_id: request.requestId,
      source_ref: request.requestId,
      source_module: "Waste",
      source_status_snapshot: request.status,
      source_item_snapshot: { item_count: batch.length, total_units: totalQuantity(batch), review_required_count: reviewCount, first_item: batch[0]?.itemName },
      assigned_department: batch[0]?.department || "Meat",
      assigned_role: reviewCount ? "Supervisor" : "Staff",
      assigned_user_id: "team",
      assigned_user_name: `${batch[0]?.department || "Waste"} Team`,
      linkedWorkflow: "/waste",
      linkedWorkflowLabel: "Waste · Evidence request",
      linkedContext: { requestId: request.requestId },
    });
    setSubmittedRequest(request);
    setView("done");
    setItem(null);
    setScanValue("");
    setBatch([]);
    setExpiryDate("");
    setLotBatch("");
    setEnteredWeight("");
    clearWorkflowDraft("waste");
  };

  const resetDraft = () => {
    setItem(null);
    setScanValue("");
    setBatch([]);
    setView("entry");
    setSubmittedRequest(null);
    clearWorkflowDraft("waste");
  };

  return (
    <PageShell>
      <WorkflowHeader
        title="Waste"
        subtitle={view === "review" ? "Review waste evidence" : "Evidence only · Inventory posts later"}
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={scan}
        showSearch={view !== "done"}
      />
      <WorkflowMain>
        {view === "done" && submittedRequest ? (
          <DoneCard
            title="Waste evidence submitted"
            helper="No stock has been adjusted. Inventory must review/post the waste record."
            rows={[
              { label: "Request", value: submittedRequest.requestId },
              { label: "Status", value: submittedRequest.status === "sync_pending" ? "Sync pending" : submittedRequest.status === "review_required" ? "Review required" : "Submitted" },
              { label: "Items", value: String(submittedRequest.items.length) },
              { label: "Total units", value: String(totalQuantity(submittedRequest.items)) },
              { label: "Stock mutation", value: "No direct stock mutation" },
            ]}
          />
        ) : view === "review" ? (
          <>
            <SectionCard className="space-y-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Review Waste Log</p>
                <h2 className="mt-1 text-lg font-black text-foreground">{itemCountLabel} ready</h2>
              </div>
              <div className="space-y-2 rounded-2xl bg-secondary/50 p-3">
                <InfoLine label="Total units" value={String(totalQuantity(batch))} />
                <InfoLine label="Manager review required" value={String(reviewCount)} />
                <InfoLine label="Stock mutation" value="No stock adjustment from handheld" />
              </div>
              <div className="space-y-2">
                {batch.map((line) => (
                  <div key={line.requestItemId} className="rounded-2xl border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-black text-foreground">{line.itemName}</p>
                        <p className="mt-1 break-words text-xs font-bold text-muted-foreground">
                          Qty: {line.quantity} {line.unit} · {getOptionLabel(WASTE_REASON_OPTIONS, line.reason)}
                        </p>
                        <p className="mt-1 break-words text-xs font-bold text-muted-foreground">
                          {getOptionLabel(WASTE_CONDITION_OPTIONS, line.condition)} · {getOptionLabel(WASTE_DISPOSAL_ACTION_OPTIONS, line.disposalAction)}
                        </p>
                        {line.notes && <p className="mt-1 break-words text-xs font-semibold text-muted-foreground">Note: {line.notes}</p>}
                        {line.attributeSnapshot && <p className="mt-1 break-words text-xs font-semibold text-muted-foreground">{summarizeAttributeSnapshot(line.attributeSnapshot)}</p>}
                      </div>
                      <button type="button" onClick={() => removeLine(line.requestItemId)} className="shrink-0 rounded-xl bg-secondary px-3 py-2 text-xs font-black text-secondary-foreground">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
            <StickyActions leftLabel="Back" rightLabel="Submit Waste Evidence" onLeft={() => setView("entry")} onRight={submitWaste} rightDisabled={!batch.length} />
          </>
        ) : (
          <>
            {item ? (
              <>
                <ItemSummaryCard item={item}>
                  <p className="text-xs font-bold text-muted-foreground">
                    Freshness: {item.freshnessStatus || item.expiry_status || "—"} · Use-by: {item.expiryDate || item.expiry_date || "—"}
                  </p>
                </ItemSummaryCard>
                <SectionCard className="space-y-3">
                  <QuantityStepper label="Waste qty" value={quantity} onChange={setQuantity} unit={unit} min={1} />
                  <AttributeEvidenceFields
                    item={item}
                    scanValue={scanValue}
                    expiryDate={expiryDate}
                    onExpiryDateChange={setExpiryDate}
                    lotBatch={lotBatch}
                    onLotBatchChange={setLotBatch}
                    quantityType={quantityType}
                    onQuantityTypeChange={setQuantityType}
                    enteredQuantity={enteredWeight}
                    onEnteredQuantityChange={setEnteredWeight}
                    weightSource={weightSource}
                    onWeightSourceChange={setWeightSource}
                  />
                  <TouchSelect label="Waste reason" value={reason} onChange={setReason} options={WASTE_REASON_OPTIONS} />
                  <TouchSelect label="Condition" value={condition} onChange={setCondition} options={WASTE_CONDITION_OPTIONS} />
                  <TouchSelect label="Disposal action" value={disposalAction} onChange={setDisposalAction} options={WASTE_DISPOSAL_ACTION_OPTIONS} />
                  <TextInputField label="Notes" value={notes} onChange={setNotes} placeholder="Optional note..." />
                  <p className="rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-bold text-muted-foreground">
                    Evidence only. Inventory decides whether stock is adjusted, held, returned, donated, or quarantined.
                  </p>
                </SectionCard>
              </>
            ) : (
              <EmptyState title="No item selected." />
            )}

            <SectionCard>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Current waste log</p>
                  <p className="mt-1 text-2xl font-black text-foreground">{itemCountLabel}</p>
                </div>
                {batch.length > 0 && (
                  <button type="button" onClick={resetDraft} className="rounded-xl bg-secondary px-3 py-2 text-xs font-black text-secondary-foreground">
                    Clear
                  </button>
                )}
              </div>
              {batch.length ? (
                <div className="mt-3 space-y-2">
                  {batch.map((line) => (
                    <div key={line.requestItemId} className="rounded-2xl bg-secondary/60 p-3">
                      <p className="break-words text-sm font-black text-foreground">{line.itemName}</p>
                      <p className="mt-1 break-words text-xs font-bold text-muted-foreground">
                        Qty {line.quantity} {line.unit} · {getOptionLabel(WASTE_REASON_OPTIONS, line.reason)} · {getOptionLabel(WASTE_DISPOSAL_ACTION_OPTIONS, line.disposalAction)}
                      </p>
                      {line.attributeSnapshot && <p className="mt-1 break-words text-xs font-semibold text-muted-foreground">{summarizeAttributeSnapshot(line.attributeSnapshot)}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-2xl bg-secondary/50 px-3 py-2 text-sm font-bold text-muted-foreground">Waste log is empty.</p>
              )}
            </SectionCard>
            <StickyActions
              leftLabel="Review Waste"
              rightLabel="Add Waste"
              onLeft={() => setView("review")}
              onRight={addWaste}
              leftDisabled={!batch.length}
              rightDisabled={!item || quantity <= 0 || !reason || !condition || !disposalAction}
            />
          </>
        )}
      </WorkflowMain>
    </PageShell>
  );
}
