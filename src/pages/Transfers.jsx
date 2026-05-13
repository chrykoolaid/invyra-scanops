import React, { useMemo, useState } from "react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import {
  DoneCard,
  EmptyState,
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
  getOptionLabel,
  TRANSFER_LOCATION_OPTIONS,
  TRANSFER_REASON_OPTIONS,
  TRANSFER_REQUEST_TYPES,
  TRANSFER_REQUEST_TYPE_OPTIONS,
} from "../lib/scanOpsRequestLifecycle";
import {
  addTransferDispatchEvidence,
  addTransferReceiveEvidence,
  batchReadOnly,
  createTransferBatch,
  differenceLabel,
  getTransferBatches,
  makeTransferDispatchLine,
  makeTransferReceiveLine,
  optionLabel,
  reviewTransferException,
  saveTransferBatches,
  submitTransferBatch,
  TRANSFER_CONDITION_OPTIONS_STAGEW,
  TRANSFER_EXCEPTION_OPTIONS_STAGEW,
  unitForItem,
} from "../lib/scanOpsReceivingTransfers";
import { TASK_DUE_STATES, TASK_PRIORITIES, TASK_TYPES, upsertDerivedTaskFromSource } from "../lib/scanOpsTasks";

const REVIEW_ACTIONS = [
  { id: "Accepted", label: "Accept Evidence" },
  { id: "Follow-up Requested", label: "Request Follow-up" },
  { id: "Supplier Issue", label: "Mark Issue" },
];

function getAvailableAtSource(item, sourceLocationId) {
  if (!item) return 0;
  const source = String(sourceLocationId || "");
  if (source.includes("backroom") || source.includes("coolroom")) {
    return Number(item.backroomStock ?? item.backroom_stock ?? item.stockOnHand ?? item.stock_on_hand ?? 0);
  }
  if (source.includes("shelf") || source.includes("display")) {
    return Number(item.shelfStock ?? item.shelf_stock ?? item.stockOnHand ?? item.stock_on_hand ?? 0);
  }
  return Number(item.stockOnHand ?? item.stock_on_hand ?? item.shelfStock ?? item.shelf_stock ?? 0);
}

function defaultRouteForType(transferType) {
  if (transferType === TRANSFER_REQUEST_TYPES.SHELF_TO_BACKROOM) return { source: "dairy_shelf", destination: "backroom_a" };
  if (transferType === TRANSFER_REQUEST_TYPES.STORE_TO_STORE) return { source: "backroom_a", destination: "store_002" };
  if (transferType === TRANSFER_REQUEST_TYPES.DEPARTMENT_TO_DEPARTMENT) return { source: "grocery_department", destination: "fresh_department" };
  return { source: "backroom_a", destination: "dairy_shelf" };
}

function countOpenExceptions(batch) {
  return (batch?.exceptions || []).filter((exception) => !["Accepted", "Closed", "Rejected"].includes(exception.status)).length;
}

function canSeeTransfer(batch, session) {
  if (!batch) return false;
  if (hasRoleAtLeast(session.actorRole, "Supervisor")) return true;
  return (batch.assigned_user_id || batch.actor_id) === session.actorUserId;
}

function transferScopeLabel(session) {
  if (session.actorRole === "Admin") return "All transfer batches";
  if (session.actorRole === "Manager") return "Store transfer batches";
  if (session.actorRole === "Supervisor") return "Team transfer batches";
  return "Assigned transfer batches";
}

function statusClass(status) {
  if (["Exception Review", "Partially Received"].includes(status)) return "bg-destructive/10 text-destructive";
  if (["Accepted", "Closed", "Received"].includes(status)) return "bg-primary/10 text-primary";
  return "bg-secondary text-muted-foreground";
}

export default function Transfers() {
  const session = useScanOpsSession();
  const [scanValue, setScanValue] = useState("");
  const [batches, setBatches] = useState(() => getTransferBatches());
  const [activeBatchId, setActiveBatchId] = useState(null);
  const [view, setView] = useState("landing");
  const [phase, setPhase] = useState("dispatch");
  const [transferType, setTransferType] = useState(TRANSFER_REQUEST_TYPES.BACKROOM_TO_SHELF);
  const [sourceLocationId, setSourceLocationId] = useState("backroom_a");
  const [destinationLocationId, setDestinationLocationId] = useState("dairy_shelf");
  const [reason, setReason] = useState("replenishment");
  const [item, setItem] = useState(null);
  const [dispatchQuantity, setDispatchQuantity] = useState(6);
  const [dispatchCondition, setDispatchCondition] = useState("normal");
  const [dispatchNote, setDispatchNote] = useState("");
  const [selectedDispatchId, setSelectedDispatchId] = useState(null);
  const [receivedQuantity, setReceivedQuantity] = useState(0);
  const [receiveException, setReceiveException] = useState("none");
  const [receiveCondition, setReceiveCondition] = useState("normal");
  const [receiveNote, setReceiveNote] = useState("");
  const [submittedBatch, setSubmittedBatch] = useState(null);

  const visibleBatches = useMemo(() => batches.filter((batch) => canSeeTransfer(batch, session)), [batches, session]);
  const activeBatch = useMemo(() => batches.find((batch) => batch.id === activeBatchId) || null, [batches, activeBatchId]);
  const selectedDispatch = useMemo(() => (activeBatch?.dispatch_lines || []).find((line) => line.id === selectedDispatchId) || null, [activeBatch, selectedDispatchId]);
  const readOnly = batchReadOnly(activeBatch?.status) || !activeBatch;
  const canReview = hasRoleAtLeast(session.actorRole, "Supervisor");
  const sameLocation = sourceLocationId && destinationLocationId && sourceLocationId === destinationLocationId;
  const availableAtSource = getAvailableAtSource(item, sourceLocationId);
  const unit = unitForItem(item || {});
  const receiveDiff = selectedDispatch ? Number((Number(receivedQuantity || 0) - Number(selectedDispatch.dispatch_quantity || 0)).toFixed(3)) : null;

  const persist = (nextBatches) => {
    setBatches(nextBatches);
    saveTransferBatches(nextBatches);
  };

  const replaceBatch = (nextBatch) => {
    const nextBatches = batches.some((batch) => batch.id === nextBatch.id)
      ? batches.map((batch) => (batch.id === nextBatch.id ? nextBatch : batch))
      : [nextBatch, ...batches];
    persist(nextBatches);
    setActiveBatchId(nextBatch.id);
    return nextBatch;
  };

  const setTypeAndRoute = (nextType) => {
    setTransferType(nextType);
    const route = defaultRouteForType(nextType);
    setSourceLocationId(route.source);
    setDestinationLocationId(route.destination);
  };

  const openTransfer = (batch) => {
    setActiveBatchId(batch.id);
    setView("batch");
    setPhase((batch.dispatch_lines || []).length ? "receive" : "dispatch");
    setItem(null);
    setScanValue("");
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_BATCH_OPENED, {
      source_module: "Transfers",
      transfer_id: batch.id,
      transfer_ref: batch.transfer_ref,
      status: batch.status,
      applies_stock_directly: false,
    });
  };

  const startTransfer = () => {
    if (sameLocation) return;
    const batch = createTransferBatch({
      transferType,
      sourceLocationId,
      sourceLocationLabel: getOptionLabel(TRANSFER_LOCATION_OPTIONS, sourceLocationId),
      destinationLocationId,
      destinationLocationLabel: getOptionLabel(TRANSFER_LOCATION_OPTIONS, destinationLocationId),
      reason,
    });
    replaceBatch(batch);
    setView("batch");
    setPhase("dispatch");
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_STARTED, {
      source_module: "Transfers",
      transfer_id: batch.id,
      transfer_ref: batch.transfer_ref,
      transfer_type: transferType,
      source_location_id: sourceLocationId,
      destination_location_id: destinationLocationId,
      reason,
      status: batch.status,
      applies_stock_directly: false,
    });
  };

  const scan = (value) => {
    const found = typeof value === "object" ? value : resolveInventoryIdentity(String(value || "").trim());
    if (!found) return;
    setItem(found);
    const available = getAvailableAtSource(found, activeBatch?.source_location_id || sourceLocationId);
    setDispatchQuantity(Math.min(6, Math.max(1, Number(available || 1))));
    setDispatchCondition("normal");
    setDispatchNote("");
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_ITEM_SCANNED, {
      source_module: "Transfers",
      transfer_id: activeBatch?.id || null,
      transfer_ref: activeBatch?.transfer_ref || null,
      item_name: found?.name,
      sku: found?.sku,
      barcode: found?.barcode,
      plu: found?.plu || found?.scaleCode,
      match_reason: found?._searchMatch?.displayReason || null,
      available_at_source: available,
      applies_stock_directly: false,
    });
  };

  const saveDispatch = () => {
    if (!activeBatch || !item || readOnly || dispatchQuantity <= 0) return;
    const line = makeTransferDispatchLine({
      transfer: activeBatch,
      item,
      dispatchQuantity,
      condition: dispatchCondition,
      evidenceNote: dispatchNote,
    });
    const nextBatch = addTransferDispatchEvidence(activeBatch, line);
    replaceBatch(nextBatch);
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_DISPATCH_EVIDENCE_SAVED, {
      source_module: "Transfers",
      transfer_id: activeBatch.id,
      transfer_ref: activeBatch.transfer_ref,
      dispatch_line_id: line.id,
      item_name: line.item_snapshot?.itemName,
      dispatch_quantity: line.dispatch_quantity,
      condition: line.condition_note,
      status: nextBatch.status,
      applies_stock_directly: false,
    });
    setItem(null);
    setScanValue("");
    setDispatchQuantity(6);
    setDispatchCondition("normal");
    setDispatchNote("");
    setPhase("receive");
  };

  const chooseDispatchForReceive = (line) => {
    setSelectedDispatchId(line.id);
    setReceivedQuantity(line.dispatch_quantity);
    setReceiveException("none");
    setReceiveCondition("normal");
    setReceiveNote("");
    setPhase("receive");
  };

  const saveReceive = () => {
    if (!activeBatch || !selectedDispatch || readOnly) return;
    const receiveLine = makeTransferReceiveLine({
      transfer: activeBatch,
      dispatchLine: selectedDispatch,
      receivedQuantity,
      exceptionType: receiveException,
      condition: receiveCondition,
      evidenceNote: receiveNote,
    });
    const nextBatch = addTransferReceiveEvidence(activeBatch, selectedDispatch, receiveLine);
    replaceBatch(nextBatch);
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_RECEIVE_EVIDENCE_SAVED, {
      source_module: "Transfers",
      transfer_id: activeBatch.id,
      transfer_ref: activeBatch.transfer_ref,
      dispatch_line_id: selectedDispatch.id,
      receive_line_id: receiveLine.id,
      item_name: selectedDispatch.item_snapshot?.itemName,
      dispatched_quantity: receiveLine.dispatched_quantity,
      received_quantity: receiveLine.received_quantity,
      difference_quantity: receiveLine.difference_quantity,
      exception_type: receiveLine.exception_type,
      status: receiveLine.line_status,
      applies_stock_directly: false,
    });
    if (receiveLine.line_status === "Review Required") {
      const createdException = (nextBatch.exceptions || []).find((exception) => exception.receive_line_id === receiveLine.id);
      createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_EXCEPTION_RECORDED, {
        source_module: "Transfers",
        transfer_id: activeBatch.id,
        transfer_ref: activeBatch.transfer_ref,
        exception_id: createdException?.id || null,
        item_name: selectedDispatch.item_snapshot?.itemName,
        exception_type: receiveLine.exception_type,
        difference_quantity: receiveLine.difference_quantity,
        applies_stock_directly: false,
      });
      upsertDerivedTaskFromSource({
        taskType: TASK_TYPES.TRANSFER,
        task_kind: "transfer_exception_review",
        title: receiveLine.exception_type === "wrong_destination" ? "Investigate transfer wrong destination" : "Investigate transfer exception",
        description: `${selectedDispatch.item_snapshot?.itemName || "Transfer item"} needs transfer exception review.`,
        action_needed: "Open the Transfers source and record investigation evidence only. Task completion does not close reconciliation.",
        evidence_required: "Investigation note",
        priority: createdException?.severity === "High" ? TASK_PRIORITIES.CRITICAL : TASK_PRIORITIES.MEDIUM,
        due_state: createdException?.severity === "High" ? TASK_DUE_STATES.NOW : TASK_DUE_STATES.TODAY,
        source_type: "transfer_exception",
        source_id: createdException?.id || receiveLine.id,
        source_ref: activeBatch.transfer_ref,
        source_module: "Transfers",
        source_status_snapshot: createdException?.status || "Review Required",
        source_item_snapshot: {
          item_name: selectedDispatch.item_snapshot?.itemName,
          dispatched_quantity: receiveLine.dispatched_quantity,
          received_quantity: receiveLine.received_quantity,
          difference_quantity: receiveLine.difference_quantity,
          exception_type: receiveLine.exception_type,
        },
        assigned_department: createdException?.severity === "High" ? "Manager Review" : "Stockroom",
        assigned_role: createdException?.severity === "High" ? "Manager" : "Staff",
        assigned_user_id: "team",
        assigned_user_name: createdException?.severity === "High" ? "Manager Review" : "Stockroom Team",
        linkedWorkflow: "/transfers",
        linkedWorkflowLabel: `Transfers · ${activeBatch.transfer_ref}`,
        linkedContext: { transferId: activeBatch.id, exceptionId: createdException?.id || receiveLine.id },
      });
    }
    setSelectedDispatchId(null);
    setReceivedQuantity(0);
    setReceiveException("none");
    setReceiveCondition("normal");
    setReceiveNote("");
  };

  const submitTransfer = () => {
    if (!activeBatch || !(activeBatch.dispatch_lines || []).length) return;
    const nextBatch = submitTransferBatch(activeBatch);
    replaceBatch(nextBatch);
    const event = createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_BATCH_SUBMITTED, {
      source_module: "Transfers",
      transfer_id: nextBatch.id,
      transfer_ref: nextBatch.transfer_ref,
      dispatch_line_count: nextBatch.dispatch_lines.length,
      receive_line_count: nextBatch.receive_lines.length,
      exception_count: nextBatch.exceptions.length,
      status: nextBatch.status,
      applies_stock_directly: false,
      official_inventory_applies_after_sync: true,
    });
    setSubmittedBatch({ ...nextBatch, syncStatusLabel: event?.syncRecord?.statusLabel || "Pending sync" });
    setView("done");
  };

  const reviewException = (exceptionId, decision) => {
    if (!activeBatch || !canReview) return;
    const nextBatch = reviewTransferException(activeBatch, exceptionId, decision, decision);
    replaceBatch(nextBatch);
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_EXCEPTION_RECORDED, {
      source_module: "Transfers",
      transfer_id: activeBatch.id,
      transfer_ref: activeBatch.transfer_ref,
      exception_id: exceptionId,
      review_decision: decision,
      applies_stock_directly: false,
    });
  };

  const subtitle = view === "landing" ? transferScopeLabel(session) : activeBatch ? `${activeBatch.transfer_ref} · ${activeBatch.status}` : "Transfer batch";

  return (
    <PageShell>
      <WorkflowHeader
        title="Transfers"
        subtitle={subtitle}
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={scan}
        showSearch={view === "batch" && phase === "dispatch" && !readOnly}
        disabled={readOnly}
      />
      <WorkflowMain>
        {view === "done" && submittedBatch ? (
          <DoneCard
            title="Transfer evidence submitted"
            helper="Saved locally. Pending sync. No stock posted here."
            rows={[
              { label: "Transfer", value: submittedBatch.transfer_ref },
              { label: "Status", value: submittedBatch.status },
              { label: "Dispatch lines", value: String(submittedBatch.dispatch_lines.length) },
              { label: "Receive lines", value: String(submittedBatch.receive_lines.length) },
              { label: "Sync", value: submittedBatch.syncStatusLabel || "Pending sync" },
              { label: "Stock mutation", value: "No direct stock mutation" },
            ]}
          />
        ) : view === "landing" ? (
          <TransferLanding
            visibleBatches={visibleBatches}
            transferType={transferType}
            setTypeAndRoute={setTypeAndRoute}
            sourceLocationId={sourceLocationId}
            setSourceLocationId={setSourceLocationId}
            destinationLocationId={destinationLocationId}
            setDestinationLocationId={setDestinationLocationId}
            reason={reason}
            setReason={setReason}
            sameLocation={sameLocation}
            onStart={startTransfer}
            onOpen={openTransfer}
          />
        ) : activeBatch ? (
          <>
            <TransferBatchHeader batch={activeBatch} />

            {!readOnly && (
              <SectionCard className="space-y-3">
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Workflow Step</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setPhase("dispatch")} className={`min-h-11 rounded-2xl px-3 text-xs font-black ${phase === "dispatch" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>Dispatch</button>
                  <button type="button" onClick={() => setPhase("receive")} className={`min-h-11 rounded-2xl px-3 text-xs font-black ${phase === "receive" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>Receive</button>
                </div>
              </SectionCard>
            )}

            {!readOnly && phase === "dispatch" && (
              <TransferDispatchWorkspace
                item={item}
                unit={unit}
                availableAtSource={availableAtSource}
                dispatchQuantity={dispatchQuantity}
                setDispatchQuantity={setDispatchQuantity}
                dispatchCondition={dispatchCondition}
                setDispatchCondition={setDispatchCondition}
                dispatchNote={dispatchNote}
                setDispatchNote={setDispatchNote}
                onSave={saveDispatch}
                onClear={() => { setItem(null); setScanValue(""); }}
              />
            )}

            {!readOnly && phase === "receive" && (
              <TransferReceiveWorkspace
                batch={activeBatch}
                selectedDispatch={selectedDispatch}
                chooseDispatchForReceive={chooseDispatchForReceive}
                receivedQuantity={receivedQuantity}
                setReceivedQuantity={setReceivedQuantity}
                receiveException={receiveException}
                setReceiveException={setReceiveException}
                receiveCondition={receiveCondition}
                setReceiveCondition={setReceiveCondition}
                receiveNote={receiveNote}
                setReceiveNote={setReceiveNote}
                receiveDiff={receiveDiff}
                onSave={saveReceive}
                onClear={() => setSelectedDispatchId(null)}
              />
            )}

            {readOnly && <EmptyState title="Transfer is read-only." helper="This transfer is locked for handheld edits." />}

            <TransferEvidenceList batch={activeBatch} chooseDispatchForReceive={readOnly ? null : chooseDispatchForReceive} />
            <TransferExceptionList batch={activeBatch} canReview={canReview} onReview={reviewException} />

            {!readOnly && (
              <StickyActions
                leftLabel="Back to Transfers"
                rightLabel="Submit Transfer"
                onLeft={() => { setView("landing"); setActiveBatchId(null); setItem(null); setScanValue(""); }}
                onRight={submitTransfer}
                rightDisabled={!(activeBatch.dispatch_lines || []).length}
              />
            )}
          </>
        ) : (
          <EmptyState title="No transfer selected." helper="Open or start a transfer batch first." />
        )}
      </WorkflowMain>
    </PageShell>
  );
}

function TransferLanding({ visibleBatches, transferType, setTypeAndRoute, sourceLocationId, setSourceLocationId, destinationLocationId, setDestinationLocationId, reason, setReason, sameLocation, onStart, onOpen }) {
  return (
    <>
      <SectionCard className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Active Transfers</p>
            <h2 className="mt-1 text-lg font-black text-foreground">Transfer queue</h2>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-black text-muted-foreground">{visibleBatches.length} active</span>
        </div>
        {visibleBatches.length ? (
          <div className="space-y-2">
            {visibleBatches.map((batch) => (
              <button key={batch.id} type="button" onClick={() => onOpen(batch)} className="w-full rounded-2xl border border-border bg-card p-3 text-left active:bg-secondary/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-black text-foreground">{batch.transfer_ref} · {batch.source_location} to {batch.destination_location}</p>
                    <p className="mt-1 break-words text-xs font-bold text-muted-foreground">Lines: {(batch.dispatch_lines || []).length} · Exceptions: {countOpenExceptions(batch)}</p>
                    <p className="mt-1 break-words text-xs font-semibold text-muted-foreground">Reason: {getOptionLabel(TRANSFER_REASON_OPTIONS, batch.reason)}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${statusClass(batch.status)}`}>{batch.status}</span>
                </div>
                <p className="mt-3 rounded-xl bg-primary px-3 py-2 text-center text-xs font-black text-primary-foreground">Open Transfer</p>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState title="No active transfers." helper="Start when stock needs dispatch/receive evidence." />
        )}
      </SectionCard>

      <SectionCard className="space-y-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Start Transfer</p>
          <h2 className="mt-1 text-lg font-black text-foreground">Route setup</h2>
        </div>
        <TouchSelect label="Transfer type" value={transferType} onChange={setTypeAndRoute} options={TRANSFER_REQUEST_TYPE_OPTIONS} />
        <TouchSelect label="From" value={sourceLocationId} onChange={setSourceLocationId} options={TRANSFER_LOCATION_OPTIONS} />
        <TouchSelect label="To" value={destinationLocationId} onChange={setDestinationLocationId} options={TRANSFER_LOCATION_OPTIONS} />
        <TouchSelect label="Reason" value={reason} onChange={setReason} options={TRANSFER_REASON_OPTIONS} />
        {sameLocation && <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">Source and destination cannot be the same.</p>}
        <button type="button" onClick={onStart} disabled={sameLocation} className="min-h-12 w-full rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground active:scale-[0.98] disabled:opacity-40">
          Start Transfer
        </button>
      </SectionCard>
    </>
  );
}

function TransferBatchHeader({ batch }) {
  return (
    <SectionCard className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Transfer Batch</p>
          <h2 className="mt-1 break-words text-lg font-black text-foreground">{batch.transfer_ref}</h2>
          <p className="mt-1 break-words text-xs font-bold text-muted-foreground">{batch.source_location} → {batch.destination_location}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${statusClass(batch.status)}`}>{batch.status}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MetricPill label="Dispatch" value={(batch.dispatch_lines || []).length} suffix="lines" />
        <MetricPill label="Receive" value={(batch.receive_lines || []).length} suffix="lines" />
        <MetricPill label="Exceptions" value={countOpenExceptions(batch)} />
      </div>
      <p className="rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-bold text-muted-foreground">Dispatch and receive evidence stay separate. Inventory desktop posts final movement.</p>
    </SectionCard>
  );
}

function TransferDispatchWorkspace({ item, unit, availableAtSource, dispatchQuantity, setDispatchQuantity, dispatchCondition, setDispatchCondition, dispatchNote, setDispatchNote, onSave, onClear }) {
  return (
    <>
      {item ? (
        <>
          <ItemSummaryCard item={item}>
            <div className="grid grid-cols-2 gap-2">
              <MetricPill label="Available" value={availableAtSource} suffix={unit} />
              <MetricPill label="Dispatch" value={dispatchQuantity} suffix={unit} />
            </div>
          </ItemSummaryCard>
          <SectionCard className="space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Transfer Dispatch</p>
            <QuantityStepper label="Dispatch quantity" value={dispatchQuantity} onChange={setDispatchQuantity} unit={unit} min={0} />
            <TouchSelect label="Condition" value={dispatchCondition} onChange={setDispatchCondition} options={TRANSFER_CONDITION_OPTIONS_STAGEW} />
            <TextInputField label="Evidence note" value={dispatchNote} onChange={setDispatchNote} placeholder="Optional dispatch note" />
          </SectionCard>
          <StickyActions leftLabel="Clear Item" rightLabel="Save Dispatch" onLeft={onClear} onRight={onSave} rightDisabled={dispatchQuantity <= 0} />
        </>
      ) : (
        <EmptyState title="Scan or search item to dispatch." helper="Records source dispatch only. No stock posted here." />
      )}
    </>
  );
}

function TransferReceiveWorkspace({ batch, selectedDispatch, chooseDispatchForReceive, receivedQuantity, setReceivedQuantity, receiveException, setReceiveException, receiveCondition, setReceiveCondition, receiveNote, setReceiveNote, receiveDiff, onSave, onClear }) {
  const dispatchLines = batch.dispatch_lines || [];
  const receivedIds = new Set((batch.receive_lines || []).map((line) => line.dispatch_line_id));
  if (!selectedDispatch) {
    return (
      <SectionCard className="space-y-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Transfer Receive</p>
          <h2 className="mt-1 text-lg font-black text-foreground">Choose dispatched line</h2>
        </div>
        {dispatchLines.length ? (
          <div className="space-y-2">
            {dispatchLines.map((line) => {
              const received = receivedIds.has(line.id);
              return (
                <button key={line.id} type="button" onClick={() => chooseDispatchForReceive(line)} className="w-full rounded-2xl bg-secondary/60 p-3 text-left active:bg-border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-black text-foreground">{line.item_snapshot?.itemName || "Scanned item"}</p>
                      <p className="mt-1 break-words text-xs font-bold text-muted-foreground">Dispatched: {line.dispatch_quantity} {line.unit_label} · {optionLabel(TRANSFER_CONDITION_OPTIONS_STAGEW, line.condition_note)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${received ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>{received ? "Received" : "Open"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No dispatch evidence yet." helper="Save dispatch before receiving." />
        )}
      </SectionCard>
    );
  }

  return (
    <>
      <SectionCard className="space-y-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Transfer Receive</p>
          <h2 className="mt-1 break-words text-lg font-black text-foreground">{selectedDispatch.item_snapshot?.itemName || "Scanned item"}</h2>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <MetricPill label="Dispatched" value={selectedDispatch.dispatch_quantity} suffix={selectedDispatch.unit_label} />
          <MetricPill label="Received" value={receivedQuantity} suffix={selectedDispatch.unit_label} />
          <MetricPill label="Diff" value={differenceLabel(receiveDiff)} suffix={selectedDispatch.unit_label} />
        </div>
        <QuantityStepper label="Received" value={receivedQuantity} onChange={setReceivedQuantity} unit={selectedDispatch.unit_label} min={0} />
        {receiveDiff !== 0 && <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">Difference {differenceLabel(receiveDiff)} {selectedDispatch.unit_label}. Transfer exception evidence will be saved.</p>}
        <TouchSelect label="Exception" value={receiveException} onChange={setReceiveException} options={TRANSFER_EXCEPTION_OPTIONS_STAGEW} />
        <TouchSelect label="Condition" value={receiveCondition} onChange={setReceiveCondition} options={TRANSFER_CONDITION_OPTIONS_STAGEW} />
        <TextInputField label="Evidence note" value={receiveNote} onChange={setReceiveNote} placeholder="Example: 2 units missing from tote" />
      </SectionCard>
      <StickyActions leftLabel="Choose Another" rightLabel="Save Receive" onLeft={onClear} onRight={onSave} rightDisabled={receivedQuantity < 0} />
    </>
  );
}

function TransferEvidenceList({ batch, chooseDispatchForReceive }) {
  const dispatchLines = batch.dispatch_lines || [];
  const receiveLines = batch.receive_lines || [];
  return (
    <SectionCard className="space-y-3">
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Transfer Evidence</p>
        <h2 className="mt-1 text-lg font-black text-foreground">Dispatch / receive proof</h2>
      </div>
      {dispatchLines.length ? (
        <div className="space-y-2">
          {dispatchLines.map((line) => {
            const receive = receiveLines.find((row) => row.dispatch_line_id === line.id);
            return (
              <div key={line.id} className="rounded-2xl bg-secondary/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-black text-foreground">{line.item_snapshot?.itemName || "Scanned item"}</p>
                    <p className="mt-1 break-words text-xs font-bold text-muted-foreground">Dispatch: {line.dispatch_quantity} {line.unit_label} · {optionLabel(TRANSFER_CONDITION_OPTIONS_STAGEW, line.condition_note)}</p>
                    {line.evidence_note && <p className="mt-1 break-words text-xs font-semibold text-muted-foreground">Dispatch note: {line.evidence_note}</p>}
                    {receive ? (
                      <p className="mt-1 break-words text-xs font-bold text-muted-foreground">Receive: {receive.received_quantity} {receive.unit_label} · Diff {differenceLabel(receive.difference_quantity)} · {optionLabel(TRANSFER_EXCEPTION_OPTIONS_STAGEW, receive.exception_type)}</p>
                    ) : (
                      <p className="mt-1 break-words text-xs font-bold text-muted-foreground">Receive evidence pending.</p>
                    )}
                  </div>
                  {chooseDispatchForReceive && !receive && (
                    <button type="button" onClick={() => chooseDispatchForReceive(line)} className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground">Receive</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No transfer evidence yet." helper="Scan item, then save dispatch evidence." />
      )}
    </SectionCard>
  );
}

function TransferExceptionList({ batch, canReview, onReview }) {
  const exceptions = batch.exceptions || [];
  if (!exceptions.length) return null;
  return (
    <SectionCard className="space-y-3">
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Transfer Exceptions</p>
        <h2 className="mt-1 text-lg font-black text-foreground">{exceptions.length} review item{exceptions.length === 1 ? "" : "s"}</h2>
      </div>
      <div className="space-y-2">
        {exceptions.map((exception) => (
          <div key={exception.id} className="rounded-2xl border border-border bg-card p-3">
            <p className="break-words text-sm font-black text-foreground">{exception.item_name}</p>
            <div className="mt-2 space-y-2 rounded-2xl bg-secondary/50 p-3">
              <InfoLine label="Dispatched" value={exception.dispatched_quantity} />
              <InfoLine label="Received" value={exception.received_quantity} />
              <InfoLine label="Difference" value={differenceLabel(exception.difference_quantity)} />
              <InfoLine label="Exception" value={optionLabel(TRANSFER_EXCEPTION_OPTIONS_STAGEW, exception.exception_type)} />
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
