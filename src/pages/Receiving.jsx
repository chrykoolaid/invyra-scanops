import React, { useMemo, useState } from "react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import PageHeader from "../components/scanner/PageHeader";
import AttributeEvidenceFields from "../components/scanner/AttributeEvidenceFields";
import TouchSelect from "../components/scanner/TouchSelect";
import {
  DoneCard,
  EmptyState,
  OperatorAlert,
  InfoLine,
  ItemSummaryCard,
  MetricPill,
  PageShell,
  QuantityStepper,
  SectionCard,
  StickyActions,
  TextInputField,
  WorkflowMain,
} from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { useScanOpsSession } from "../lib/scanOpsSession";
import { hasRoleAtLeast } from "../lib/scanOpsPermissions";
import {
  buildWorkflowItemAttributeSnapshot,
  getDefaultExpiryDate,
  getDefaultLotBatch,
  getDefaultQuantityType,
  saveWorkflowItemAttributeSnapshot,
  summarizeAttributeSnapshot,
} from "../lib/scanOpsItemAttributes";
import {
  addReceivingEvidence,
  batchReadOnly,
  createReceivingBatch,
  differenceLabel,
  expectedQuantityForItem,
  getReceivingBatches,
  makeReceivingLine,
  optionLabel,
  RECEIVING_CONDITION_OPTIONS_STAGEW,
  RECEIVING_EXCEPTION_OPTIONS_STAGEW,
  reviewReceivingException,
  saveReceivingBatches,
  submitReceivingBatch,
  unitForItem,
} from "../lib/scanOpsReceivingTransfers";
import { TASK_DUE_STATES, TASK_PRIORITIES, TASK_TYPES, upsertDerivedTaskFromSource } from "../lib/scanOpsTasks";

const SUPPLIERS = [
  { id: "fresh_fields", label: "Fresh Fields Co.", helper: "Fresh produce and dairy" },
  { id: "dairy_direct", label: "Dairy Direct Ltd.", helper: "Chilled dairy delivery" },
  { id: "green_harvest", label: "Green Harvest", helper: "Produce supplier" },
  { id: "metro_dry_goods", label: "Metro Dry Goods", helper: "Grocery and pantry" },
  { id: "manual_supplier", label: "Manual supplier", helper: "Delivery without supplier master" },
];

const REVIEW_ACTIONS = [
  { id: "Accepted", label: "Accept Evidence" },
  { id: "Follow-up Requested", label: "Request Follow-up" },
  { id: "Supplier Issue", label: "Mark Supplier Issue" },
];

function supplierLabel(id) {
  return SUPPLIERS.find((supplier) => supplier.id === id)?.label || id || "Manual supplier";
}

function countOpenExceptions(batch) {
  return (batch?.exceptions || []).filter((exception) => !["Accepted", "Closed", "Rejected"].includes(exception.status)).length;
}

function canSeeBatch(batch, session) {
  if (!batch) return false;
  if (hasRoleAtLeast(session.actorRole, "Supervisor")) return true;
  return (batch.assigned_user_id || batch.actor_id) === session.actorUserId;
}

function receivingScopeLabel(session) {
  if (session.actorRole === "Admin") return "All receiving batches";
  if (session.actorRole === "Manager") return "Store receiving batches";
  if (session.actorRole === "Supervisor") return "Team receiving batches";
  return "Assigned receiving batches";
}

function statusClass(status) {
  if (["Exception Review", "Review Required"].includes(status)) return "bg-destructive/10 text-destructive";
  if (["Accepted", "Closed"].includes(status)) return "bg-primary/10 text-primary";
  return "bg-secondary text-muted-foreground";
}

export default function Receiving() {
  const session = useScanOpsSession();
  const [scanValue, setScanValue] = useState("");
  const [batches, setBatches] = useState(() => getReceivingBatches());
  const [activeBatchId, setActiveBatchId] = useState(null);
  const [view, setView] = useState("landing");
  const [supplierId, setSupplierId] = useState("fresh_fields");
  const [poReference, setPoReference] = useState("PO-1042");
  const [deliveryRef, setDeliveryRef] = useState("DEL-7781");
  const [item, setItem] = useState(null);
  const [quantity, setQuantity] = useState(0);
  const [exceptionType, setExceptionType] = useState("none");
  const [condition, setCondition] = useState("normal");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [lotBatch, setLotBatch] = useState("");
  const [quantityType, setQuantityType] = useState("each");
  const [enteredWeight, setEnteredWeight] = useState("");
  const [weightSource, setWeightSource] = useState("manual_entry");
  const [submittedBatch, setSubmittedBatch] = useState(null);
  const [operatorError, setOperatorError] = useState(null);

  const visibleBatches = useMemo(() => batches.filter((batch) => canSeeBatch(batch, session)), [batches, session]);
  const activeBatch = useMemo(() => batches.find((batch) => batch.id === activeBatchId) || null, [batches, activeBatchId]);
  const readOnly = batchReadOnly(activeBatch?.status) || !activeBatch;
  const canReview = hasRoleAtLeast(session.actorRole, "Supervisor");
  const expectedQty = expectedQuantityForItem(item);
  const unit = unitForItem(item || {});
  const diff = expectedQty == null ? null : Number((Number(quantity || 0) - expectedQty).toFixed(3));

  const persist = (nextBatches) => {
    setBatches(nextBatches);
    saveReceivingBatches(nextBatches);
  };

  const replaceBatch = (nextBatch) => {
    const nextBatches = batches.some((batch) => batch.id === nextBatch.id)
      ? batches.map((batch) => (batch.id === nextBatch.id ? nextBatch : batch))
      : [nextBatch, ...batches];
    persist(nextBatches);
    setActiveBatchId(nextBatch.id);
    return nextBatch;
  };

  const openBatch = (batch) => {
    setOperatorError(null);
    setActiveBatchId(batch.id);
    setView("batch");
    setItem(null);
    setScanValue("");
    createScanOpsEvent(SCANOPS_EVENT_TYPES.RECEIVING_BATCH_OPENED, {
      source_module: "Receiving",
      batch_id: batch.id,
      batch_ref: batch.batch_ref,
      status: batch.status,
      applies_stock_directly: false,
    });
  };

  const startBatch = () => {
    if (!supplierId) {
      setOperatorError({ title: "Supplier required", helper: "Choose a supplier before starting the receiving batch." });
      return;
    }
    if (!String(deliveryRef || "").trim()) {
      setOperatorError({ title: "Delivery reference required", helper: "Enter the delivery reference before starting the batch." });
      return;
    }
    setOperatorError(null);
    const batch = createReceivingBatch({
      supplierId,
      supplierName: supplierLabel(supplierId),
      poRef: poReference,
      deliveryRef,
    });
    replaceBatch(batch);
    setView("batch");
    createScanOpsEvent(SCANOPS_EVENT_TYPES.RECEIVING_BATCH_STARTED, {
      source_module: "Receiving",
      batch_id: batch.id,
      batch_ref: batch.batch_ref,
      supplier_name: batch.supplier_name,
      purchase_order_ref: batch.po_ref,
      delivery_ref: batch.delivery_ref,
      status: batch.status,
      applies_stock_directly: false,
    });
  };

  const scan = (value) => {
    const found = typeof value === "object" ? value : resolveInventoryIdentity(String(value || "").trim());
    if (!found) return;
    setOperatorError(null);
    const rawValue = typeof value === "object" ? value?._searchMatch?.matchedValue || value?.barcode || value?.gtin || "" : String(value || "").trim();
    const expected = expectedQuantityForItem(found);
    setItem(found);
    setQuantity(expected == null ? 1 : Math.max(0, expected));
    setExceptionType("none");
    setCondition("normal");
    setEvidenceNote("");
    setExpiryDate(getDefaultExpiryDate(found));
    setLotBatch(getDefaultLotBatch(found));
    setQuantityType(getDefaultQuantityType(found));
    setEnteredWeight("");
    setWeightSource(rawValue?.startsWith("2") ? "label_weight" : "manual_entry");
  };

  const saveEvidence = () => {
    if (!activeBatch) {
      setOperatorError({ title: "Batch required", helper: "Open or start a receiving batch before saving evidence." });
      return;
    }
    if (readOnly) {
      setOperatorError({ title: "Batch is read-only", helper: "This receiving batch is locked. Your current screen was not cleared." });
      return;
    }
    if (!item) {
      setOperatorError({ title: "Item required", helper: "Scan or search an item before saving receiving evidence." });
      return;
    }
    if (quantity === "" || Number.isNaN(Number(quantity)) || Number(quantity) < 0) {
      setOperatorError({ title: "Quantity missing", helper: "Enter a valid received quantity before saving. Your item stays on screen." });
      return;
    }
    setOperatorError(null);
    const attributeSnapshot = buildWorkflowItemAttributeSnapshot({
      workflowType: "receiving",
      item,
      scanValue,
      expiryDate,
      lotBatch,
      quantityType,
      enteredQuantity: enteredWeight || quantity,
      weightSource,
      source: "stage_w_receiving_exception_card",
    });
    saveWorkflowItemAttributeSnapshot(attributeSnapshot);
    const line = makeReceivingLine({
      batch: activeBatch,
      item,
      receivedQuantity: quantity,
      exceptionType,
      condition,
      evidenceNote,
      attributeSnapshot,
    });
    const nextBatch = addReceivingEvidence(activeBatch, line);
    replaceBatch(nextBatch);
    createScanOpsEvent(SCANOPS_EVENT_TYPES.RECEIVING_ITEM_ADDED, {
      source_module: "Receiving",
      batch_id: activeBatch.id,
      batch_ref: activeBatch.batch_ref,
      item_name: line.item_snapshot?.itemName,
      sku: line.sku,
      barcode: line.barcode,
      plu: line.plu,
      expected_quantity: line.expected_quantity,
      received_quantity: line.received_quantity,
      difference_quantity: line.difference_quantity,
      exception_type: line.exception_type,
      condition: line.condition_snapshot,
      status: line.line_status,
      applies_stock_directly: false,
      applies_price_directly: false,
    });
    if (line.line_status === "Review Required") {
      const createdException = (nextBatch.exceptions || []).find((exception) => exception.batch_line_id === line.id);
      createScanOpsEvent(SCANOPS_EVENT_TYPES.RECEIVING_EXCEPTION_RECORDED, {
        source_module: "Receiving",
        batch_id: activeBatch.id,
        batch_ref: activeBatch.batch_ref,
        exception_id: createdException?.id || null,
        item_name: line.item_snapshot?.itemName,
        exception_type: line.exception_type,
        expected_quantity: line.expected_quantity,
        received_quantity: line.received_quantity,
        difference_quantity: line.difference_quantity,
        applies_stock_directly: false,
      });
      upsertDerivedTaskFromSource({
        taskType: TASK_TYPES.RECEIVING,
        task_kind: "receiving_exception_review",
        title: "Review receiving exception",
        description: `${line.item_snapshot?.itemName || "Receiving item"} needs receiving exception review.`,
        action_needed: "Open the Receiving source and record investigation evidence only. Task completion does not accept supplier issue or post stock.",
        evidence_required: "Investigation note",
        priority: createdException?.severity === "High" ? TASK_PRIORITIES.HIGH : TASK_PRIORITIES.MEDIUM,
        due_state: TASK_DUE_STATES.TODAY,
        source_type: "receiving_exception",
        source_id: createdException?.id || line.id,
        source_ref: activeBatch.batch_ref,
        source_module: "Receiving",
        source_status_snapshot: createdException?.status || "Review Required",
        source_item_snapshot: {
          item_name: line.item_snapshot?.itemName,
          sku: line.sku,
          barcode: line.barcode,
          expected_quantity: line.expected_quantity,
          received_quantity: line.received_quantity,
          difference_quantity: line.difference_quantity,
          exception_type: line.exception_type,
        },
        assigned_department: line.item_snapshot?.department || "Dairy",
        assigned_role: "Staff",
        assigned_user_id: "team",
        assigned_user_name: `${line.item_snapshot?.department || "Receiving"} Team`,
        linkedWorkflow: "/receiving",
        linkedWorkflowLabel: `Receiving · ${activeBatch.batch_ref}`,
        linkedContext: { batchId: activeBatch.id, exceptionId: createdException?.id || line.id },
      });
    }
    createScanOpsEvent(attributeSnapshot.weighted_snapshot ? SCANOPS_EVENT_TYPES.WEIGHTED_ITEM_EVIDENCE_CAPTURED : SCANOPS_EVENT_TYPES.ATTRIBUTE_EVIDENCE_CAPTURED, {
      source_module: "Receiving",
      workflow_type: "receiving",
      item_name: line.item_snapshot?.itemName,
      sku: line.sku,
      barcode: line.barcode,
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
    setItem(null);
    setScanValue("");
    setQuantity(0);
    setExceptionType("none");
    setCondition("normal");
    setEvidenceNote("");
    setEnteredWeight("");
  };

  const submitBatch = () => {
    if (!activeBatch) {
      setOperatorError({ title: "Batch required", helper: "Open a receiving batch before submitting." });
      return;
    }
    if (!(activeBatch.lines || []).length) {
      setOperatorError({ title: "Nothing to submit", helper: "Scan and save at least one receiving line first." });
      return;
    }
    setOperatorError(null);
    const nextBatch = submitReceivingBatch(activeBatch);
    replaceBatch(nextBatch);
    const event = createScanOpsEvent(SCANOPS_EVENT_TYPES.RECEIVING_EVIDENCE_SUBMITTED, {
      source_module: "Receiving",
      batch_id: nextBatch.id,
      batch_ref: nextBatch.batch_ref,
      supplier_name: nextBatch.supplier_name,
      item_count: nextBatch.lines.length,
      discrepancy_count: nextBatch.exceptions.length,
      status: nextBatch.status,
      applies_stock_directly: false,
      official_inventory_applies_after_sync: true,
    });
    setSubmittedBatch({ ...nextBatch, syncStatusLabel: event?.syncRecord?.statusLabel || "Pending sync" });
    setView("done");
  };

  const reviewException = (exceptionId, decision) => {
    if (!activeBatch) return;
    if (!canReview) {
      setOperatorError({ title: "Supervisor required", helper: "Staff can record receiving evidence, but cannot review exceptions." });
      return;
    }
    const nextBatch = reviewReceivingException(activeBatch, exceptionId, decision, decision);
    replaceBatch(nextBatch);
    createScanOpsEvent(SCANOPS_EVENT_TYPES.RECEIVING_EXCEPTION_REVIEWED, {
      source_module: "Receiving",
      batch_id: activeBatch.id,
      batch_ref: activeBatch.batch_ref,
      exception_id: exceptionId,
      review_decision: decision,
      applies_stock_directly: false,
    });
  };

  const subtitle = view === "landing" ? receivingScopeLabel(session) : activeBatch ? `${activeBatch.batch_ref} · ${activeBatch.status}` : "Receiving batch";

  return (
    <PageShell>
      <PageHeader title="Receiving" subtitle={subtitle} />
      <WorkflowHeader
        title="Receiving"
        subtitle={subtitle}
        showHeaderChrome={false}
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={scan}
        showSearch={view === "batch" && !readOnly}
        disabled={readOnly}
      />
      <WorkflowMain>
        {operatorError && (
          <OperatorAlert
            title={operatorError.title}
            helper={operatorError.helper}
            tone={operatorError.tone || "warning"}
            actions={[{ label: "Keep Editing", onClick: () => setOperatorError(null), variant: "primary" }]}
          />
        )}
        {view === "done" && submittedBatch ? (
          <DoneCard
            title="Receiving batch submitted"
            helper="Saved locally. Pending sync. No stock posted here."
            rows={[
              { label: "Batch", value: submittedBatch.batch_ref },
              { label: "Status", value: submittedBatch.status },
              { label: "Lines", value: String(submittedBatch.lines.length) },
              { label: "Exceptions", value: String(submittedBatch.exceptions.length) },
              { label: "Sync", value: submittedBatch.syncStatusLabel || "Pending sync" },
              { label: "Stock mutation", value: "No direct stock mutation" },
            ]}
          />
        ) : view === "landing" ? (
          <ReceivingLanding
            visibleBatches={visibleBatches}
            supplierId={supplierId}
            setSupplierId={setSupplierId}
            poReference={poReference}
            setPoReference={setPoReference}
            deliveryRef={deliveryRef}
            setDeliveryRef={setDeliveryRef}
            onStart={startBatch}
            onOpen={openBatch}
          />
        ) : activeBatch ? (
          <>
            <ReceivingBatchHeader batch={activeBatch} />

            {!readOnly && item ? (
              <>
                <ItemSummaryCard item={item}>
                  <div className="grid grid-cols-3 gap-2">
                    <MetricPill label="Expected" value={expectedQty == null ? "Unavailable" : expectedQty} suffix={expectedQty == null ? "" : unit} />
                    <MetricPill label="Received" value={quantity} suffix={unit} />
                    <MetricPill label="Diff" value={differenceLabel(diff)} suffix={diff == null ? "" : unit} />
                  </div>
                </ItemSummaryCard>
                <SectionCard className="space-y-3">
                  <QuantityStepper label="Received" value={quantity} onChange={setQuantity} unit={unit} min={0} />
                  {expectedQty == null ? (
                    <p className="rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-bold text-muted-foreground">Expected unavailable. This line will save as evidence only.</p>
                  ) : diff !== 0 ? (
                    <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">Difference {differenceLabel(diff)} {unit}. Review evidence will be created.</p>
                  ) : null}
                  <TouchSelect label="Exception" value={exceptionType} onChange={setExceptionType} options={RECEIVING_EXCEPTION_OPTIONS_STAGEW} />
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
                  <TouchSelect label="Condition" value={condition} onChange={setCondition} options={RECEIVING_CONDITION_OPTIONS_STAGEW} />
                  <TextInputField label="Evidence note" value={evidenceNote} onChange={setEvidenceNote} placeholder="Short note for desktop review" />
                </SectionCard>
                <StickyActions leftLabel="Clear Item" rightLabel="Save Evidence" onLeft={() => { setItem(null); setScanValue(""); }} onRight={saveEvidence} rightDisabled={quantity < 0} />
              </>
            ) : !readOnly ? (
              <EmptyState title="No receiving item selected." helper="Scan an item to add receiving evidence. Saved lines will stay in this batch." />
            ) : (
              <EmptyState title="Batch is read-only." helper="This batch is locked for handheld edits." />
            )}

            <ReceivingLineList batch={activeBatch} />
            <ReceivingExceptionList batch={activeBatch} canReview={canReview} onReview={reviewException} />

            {!readOnly && (
              <StickyActions
                leftLabel="Back to Batches"
                rightLabel="Submit Batch"
                onLeft={() => { setView("landing"); setActiveBatchId(null); setItem(null); setScanValue(""); }}
                onRight={submitBatch}
                rightDisabled={!(activeBatch.lines || []).length}
              />
            )}
          </>
        ) : (
          <EmptyState title="No receiving batch selected." helper="Open or start a receiving batch first." />
        )}
      </WorkflowMain>
    </PageShell>
  );
}

function ReceivingLanding({ visibleBatches, supplierId, setSupplierId, poReference, setPoReference, deliveryRef, setDeliveryRef, onStart, onOpen }) {
  return (
    <>
      <SectionCard className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Active Batches</p>
            <h2 className="mt-1 text-lg font-black text-foreground">Receiving queue</h2>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-black text-muted-foreground">{visibleBatches.length} active</span>
        </div>
        {visibleBatches.length ? (
          <div className="space-y-2">
            {visibleBatches.map((batch) => (
              <button key={batch.id} type="button" onClick={() => onOpen(batch)} className="w-full rounded-2xl border border-border bg-card p-3 text-left active:bg-secondary/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-black text-foreground">{batch.batch_ref} · {batch.supplier_name}</p>
                    <p className="mt-1 break-words text-xs font-bold text-muted-foreground">Lines: {(batch.lines || []).length} · Exceptions: {countOpenExceptions(batch)}</p>
                    <p className="mt-1 break-words text-xs font-semibold text-muted-foreground">Delivery ref: {batch.delivery_ref || "—"}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${statusClass(batch.status)}`}>{batch.status}</span>
                </div>
                <p className="mt-3 rounded-xl bg-primary px-3 py-2 text-center text-xs font-black text-primary-foreground">Continue Receiving</p>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState title="No active receiving batches." helper="Start a batch when a delivery arrives." />
        )}
      </SectionCard>

      <SectionCard className="space-y-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Start Receiving Batch</p>
          <h2 className="mt-1 text-lg font-black text-foreground">Delivery setup</h2>
        </div>
        <TouchSelect label="Supplier" value={supplierId} onChange={setSupplierId} options={SUPPLIERS} />
        <TextInputField label="PO / Delivery Ref" value={poReference} onChange={setPoReference} placeholder="PO-1042" />
        <TextInputField label="Delivery ref" value={deliveryRef} onChange={setDeliveryRef} placeholder="DEL-7781" />
        <button type="button" onClick={onStart} className="min-h-12 w-full rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground active:scale-[0.98]">
          Start Receiving Batch
        </button>
      </SectionCard>
    </>
  );
}

function ReceivingBatchHeader({ batch }) {
  const lines = batch.lines || [];
  const receivedLines = lines.length;
  const expectedLines = batch.po_ref ? Math.max(receivedLines, 1) : "—";
  return (
    <SectionCard className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Receiving Batch</p>
          <h2 className="mt-1 break-words text-lg font-black text-foreground">{batch.batch_ref}</h2>
          <p className="mt-1 break-words text-xs font-bold text-muted-foreground">{batch.supplier_name} · {batch.delivery_ref || "No delivery ref"}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${statusClass(batch.status)}`}>{batch.status}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MetricPill label="Expected" value={expectedLines} suffix={expectedLines === "—" ? "" : "lines"} />
        <MetricPill label="Received" value={receivedLines} suffix="lines" />
        <MetricPill label="Exceptions" value={countOpenExceptions(batch)} />
      </div>
      <p className="rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-bold text-muted-foreground">Handheld evidence only. Inventory desktop remains the stock posting authority.</p>
    </SectionCard>
  );
}

function ReceivingLineList({ batch }) {
  const lines = batch.lines || [];
  return (
    <SectionCard className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Received Lines</p>
          <h2 className="mt-1 text-lg font-black text-foreground">{lines.length} saved</h2>
        </div>
      </div>
      {lines.length ? (
        <div className="space-y-2">
          {lines.map((line) => (
            <div key={line.id} className="rounded-2xl bg-secondary/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-black text-foreground">{line.item_snapshot?.itemName || "Scanned item"}</p>
                  <p className="mt-1 break-words text-xs font-bold text-muted-foreground">Expected {line.expected_quantity ?? "Unavailable"} · Received {line.received_quantity} · Diff {differenceLabel(line.difference_quantity)}</p>
                  <p className="mt-1 break-words text-xs font-bold text-muted-foreground">Exception: {optionLabel(RECEIVING_EXCEPTION_OPTIONS_STAGEW, line.exception_type)} · Condition: {optionLabel(RECEIVING_CONDITION_OPTIONS_STAGEW, line.condition_snapshot)}</p>
                  {line.attribute_snapshot && <p className="mt-1 break-words text-xs font-semibold text-muted-foreground">{summarizeAttributeSnapshot(line.attribute_snapshot)}</p>}
                  {line.evidence_note && <p className="mt-1 break-words text-xs font-semibold text-muted-foreground">Note: {line.evidence_note}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${line.line_status === "Review Required" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>{line.line_status}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No receiving evidence yet." helper="Scan an item, enter quantity, then save evidence." />
      )}
    </SectionCard>
  );
}

function ReceivingExceptionList({ batch, canReview, onReview }) {
  const exceptions = batch.exceptions || [];
  if (!exceptions.length) return null;
  return (
    <SectionCard className="space-y-3">
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Receiving Exceptions</p>
        <h2 className="mt-1 text-lg font-black text-foreground">{exceptions.length} review item{exceptions.length === 1 ? "" : "s"}</h2>
      </div>
      <div className="space-y-2">
        {exceptions.map((exception) => (
          <div key={exception.id} className="rounded-2xl border border-border bg-card p-3">
            <p className="break-words text-sm font-black text-foreground">{exception.item_name}</p>
            <div className="mt-2 space-y-2 rounded-2xl bg-secondary/50 p-3">
              <InfoLine label="Expected" value={exception.expected_quantity ?? "Unavailable"} />
              <InfoLine label="Received" value={exception.received_quantity} />
              <InfoLine label="Difference" value={differenceLabel(exception.difference_quantity)} />
              <InfoLine label="Exception" value={optionLabel(RECEIVING_EXCEPTION_OPTIONS_STAGEW, exception.exception_type)} />
              <InfoLine label="Status" value={exception.status} />
            </div>
            {exception.evidence_note && <p className="mt-2 rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-bold text-muted-foreground">{exception.evidence_note}</p>}
            {canReview ? (
              <div className="mt-3 grid grid-cols-1 gap-2">
                {REVIEW_ACTIONS.map((action) => (
                  <button key={action.id} type="button" onClick={() => onReview(exception.id, action.id)} className="min-h-10 rounded-xl bg-secondary px-3 text-xs font-black text-secondary-foreground active:bg-border">
                    {action.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-bold text-muted-foreground">Supervisor, Manager, or Admin review required.</p>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
