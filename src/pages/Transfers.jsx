import React, { useMemo, useState } from "react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import PageHeader from "../components/scanner/PageHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import {
  DoneCard,
  EmptyState,
  FieldError,
  InfoLine,
  ItemSummaryCard,
  MetricPill,
  OperatorAlert,
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
import { ArrowLeftRight, CheckCircle2, ClipboardCheck, MapPin, PackageCheck, ScanLine } from "lucide-react";

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

function moveScopeLabel(session) {
  if (session.actorRole === "Admin") return "All move batches";
  if (session.actorRole === "Manager") return "Store move batches";
  if (session.actorRole === "Supervisor") return "Team move batches";
  return "Assigned move batches";
}

function statusClass(status) {
  if (["Exception Review", "Partially Received"].includes(status)) return "bg-destructive/10 text-destructive";
  if (["Accepted", "Closed", "Received"].includes(status)) return "bg-primary/10 text-primary";
  return "bg-secondary text-muted-foreground";
}

function MoveStep({ number, label, helper, active = false, done = false }) {
  return (
    <div className={`rounded-2xl border px-3 py-3 ${active ? "border-primary bg-primary/5" : done ? "border-primary/20 bg-primary/5" : "border-border bg-secondary/50"}`}>
      <div className="flex items-start gap-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black ${active ? "bg-primary text-primary-foreground" : done ? "bg-primary/10 text-primary" : "bg-card text-muted-foreground"}`}>
          {done ? <CheckCircle2 className="h-4 w-4" /> : number}
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-black text-foreground">{label}</span>
          <span className="mt-0.5 block text-[11px] font-bold leading-snug text-muted-foreground">{helper}</span>
        </span>
      </div>
    </div>
  );
}

function MoveStepGuide({ phase, hasDispatchLines, hasReceiveLines }) {
  return (
    <SectionCard className="space-y-3">
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Move Stock</p>
        <h2 className="mt-1 text-lg font-black text-foreground">From → Item → Qty → To → Review</h2>
      </div>
      <div className="grid grid-cols-1 gap-2">
        <MoveStep number="1" label="From" helper="Source location is set on the move route." done />
        <MoveStep number="2" label="Item + quantity" helper="Scan item and save dispatch evidence." active={phase === "dispatch"} done={hasDispatchLines} />
        <MoveStep number="3" label="To" helper="Destination confirms received quantity." active={phase === "receive"} done={hasReceiveLines} />
        <MoveStep number="4" label="Review" helper="Submit evidence for Inventory Desktop handoff." />
      </div>
    </SectionCard>
  );
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
  const [operatorError, setOperatorError] = useState(null);

  const visibleBatches = useMemo(() => batches.filter((batch) => canSeeTransfer(batch, session)), [batches, session]);
  const activeBatch = useMemo(() => batches.find((batch) => batch.id === activeBatchId) || null, [batches, activeBatchId]);
  const selectedDispatch = useMemo(() => (activeBatch?.dispatch_lines || []).find((line) => line.id === selectedDispatchId) || null, [activeBatch, selectedDispatchId]);
  const readOnly = batchReadOnly(activeBatch?.status) || !activeBatch;
  const canReview = hasRoleAtLeast(session.actorRole, "Supervisor");
  const sameLocation = sourceLocationId && destinationLocationId && sourceLocationId === destinationLocationId;
  const availableAtSource = getAvailableAtSource(item, activeBatch?.source_location_id || sourceLocationId);
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
    setOperatorError(null);
    setTransferType(nextType);
    const route = defaultRouteForType(nextType);
    setSourceLocationId(route.source);
    setDestinationLocationId(route.destination);
  };

  const openMove = (batch) => {
    setOperatorError(null);
    setActiveBatchId(batch.id);
    setView("batch");
    setPhase((batch.dispatch_lines || []).length ? "receive" : "dispatch");
    setItem(null);
    setScanValue("");
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_BATCH_OPENED, {
      source_module: "Move Stock",
      transfer_id: batch.id,
      transfer_ref: batch.transfer_ref,
      status: batch.status,
      applies_stock_directly: false,
    });
  };

  const startMove = () => {
    if (!sourceLocationId) {
      setOperatorError({ title: "From location required", helper: "Choose where the stock is coming from." });
      return;
    }
    if (!destinationLocationId) {
      setOperatorError({ title: "To location required", helper: "Choose where the stock is going." });
      return;
    }
    if (sameLocation) {
      setOperatorError({ title: "Locations must be different", helper: "From and To cannot be the same location." });
      return;
    }
    if (!reason) {
      setOperatorError({ title: "Reason required", helper: "Choose why this stock is being moved." });
      return;
    }
    setOperatorError(null);
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
      source_module: "Move Stock",
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
    setOperatorError(null);
    setItem(found);
    const available = getAvailableAtSource(found, activeBatch?.source_location_id || sourceLocationId);
    setDispatchQuantity(Math.min(6, Math.max(1, Number(available || 1))));
    setDispatchCondition("normal");
    setDispatchNote("");
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_ITEM_SCANNED, {
      source_module: "Move Stock",
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
    if (!activeBatch) {
      setOperatorError({ title: "Move required", helper: "Start or open a move before saving item evidence." });
      return;
    }
    if (readOnly) {
      setOperatorError({ title: "Move is read-only", helper: "This move is locked for handheld edits." });
      return;
    }
    if (!item) {
      setOperatorError({ title: "Item required", helper: "Scan or search an item before saving." });
      return;
    }
    if (dispatchQuantity <= 0 || Number.isNaN(Number(dispatchQuantity))) {
      setOperatorError({ title: "Quantity missing", helper: "Enter a valid quantity before saving." });
      return;
    }
    setOperatorError(null);
    const line = makeTransferDispatchLine({ transfer: activeBatch, item, dispatchQuantity, condition: dispatchCondition, evidenceNote: dispatchNote });
    const nextBatch = addTransferDispatchEvidence(activeBatch, line);
    replaceBatch(nextBatch);
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_DISPATCH_EVIDENCE_SAVED, {
      source_module: "Move Stock",
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
    if (!activeBatch) {
      setOperatorError({ title: "Move required", helper: "Open a move before saving destination evidence." });
      return;
    }
    if (readOnly) {
      setOperatorError({ title: "Move is read-only", helper: "This move is locked for handheld edits." });
      return;
    }
    if (!selectedDispatch) {
      setOperatorError({ title: "Item line required", helper: "Choose an item line before saving destination evidence." });
      return;
    }
    if (receivedQuantity < 0 || Number.isNaN(Number(receivedQuantity))) {
      setOperatorError({ title: "Quantity missing", helper: "Enter a valid received quantity before saving." });
      return;
    }
    setOperatorError(null);
    const receiveLine = makeTransferReceiveLine({ transfer: activeBatch, dispatchLine: selectedDispatch, receivedQuantity, exceptionType: receiveException, condition: receiveCondition, evidenceNote: receiveNote });
    const nextBatch = addTransferReceiveEvidence(activeBatch, selectedDispatch, receiveLine);
    replaceBatch(nextBatch);
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_RECEIVE_EVIDENCE_SAVED, {
      source_module: "Move Stock",
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
    setSelectedDispatchId(null);
    setReceivedQuantity(0);
    setReceiveException("none");
    setReceiveCondition("normal");
    setReceiveNote("");
  };

  const submitMove = () => {
    if (!activeBatch) {
      setOperatorError({ title: "Move required", helper: "Open a move before submitting." });
      return;
    }
    if (!(activeBatch.dispatch_lines || []).length) {
      setOperatorError({ title: "Nothing to submit", helper: "Save at least one item line before submitting the move." });
      return;
    }
    setOperatorError(null);
    const nextBatch = submitTransferBatch(activeBatch);
    replaceBatch(nextBatch);
    const event = createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_BATCH_SUBMITTED, {
      source_module: "Move Stock",
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
    if (!activeBatch) return;
    if (!canReview) {
      setOperatorError({ title: "Supervisor required", helper: "Staff can record move evidence, but cannot review move exceptions." });
      return;
    }
    const nextBatch = reviewTransferException(activeBatch, exceptionId, decision, decision);
    replaceBatch(nextBatch);
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_EXCEPTION_RECORDED, {
      source_module: "Move Stock",
      transfer_id: activeBatch.id,
      transfer_ref: activeBatch.transfer_ref,
      exception_id: exceptionId,
      review_decision: decision,
      applies_stock_directly: false,
    });
  };

  const subtitle = view === "landing" ? moveScopeLabel(session) : activeBatch ? `${activeBatch.transfer_ref} · ${activeBatch.status}` : "Move batch";
  const hasDispatchLines = Boolean((activeBatch?.dispatch_lines || []).length);
  const hasReceiveLines = Boolean((activeBatch?.receive_lines || []).length);

  return (
    <PageShell>
      <PageHeader title="Move Stock" subtitle={subtitle} />
      <WorkflowHeader
        title="Move Stock"
        subtitle={subtitle}
        placeholder="Scan item to move..."
        showHeaderChrome={false}
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={scan}
        showSearch={view === "batch" && phase === "dispatch" && !readOnly}
        disabled={readOnly}
      />
      <WorkflowMain>
        {operatorError && <OperatorAlert title={operatorError.title} helper={operatorError.helper} tone={operatorError.tone || "warning"} actions={[{ label: "Keep Editing", onClick: () => setOperatorError(null), variant: "primary" }]} />}
        {view === "done" && submittedBatch ? (
          <DoneCard
            title="Move evidence submitted"
            helper="Saved locally for Inventory Desktop handoff. Stock is not posted from the handheld screen."
            rows={[
              { label: "Move", value: submittedBatch.transfer_ref },
              { label: "Status", value: submittedBatch.status },
              { label: "Item lines", value: String(submittedBatch.dispatch_lines.length) },
              { label: "Destination confirmations", value: String(submittedBatch.receive_lines.length) },
              { label: "Sync", value: submittedBatch.syncStatusLabel || "Pending sync" },
              { label: "Stock posting owner", value: "Invyra Inventory" },
            ]}
          />
        ) : view === "landing" ? (
          <MoveLanding
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
            onStart={startMove}
            onOpen={openMove}
          />
        ) : activeBatch ? (
          <>
            <MoveBatchHeader batch={activeBatch} />
            <MoveStepGuide phase={phase} hasDispatchLines={hasDispatchLines} hasReceiveLines={hasReceiveLines} />

            {!readOnly && (
              <SectionCard className="space-y-3">
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Current step</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setPhase("dispatch")} className={`min-h-11 rounded-2xl px-3 text-xs font-black ${phase === "dispatch" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>Item + Qty</button>
                  <button type="button" onClick={() => setPhase("receive")} className={`min-h-11 rounded-2xl px-3 text-xs font-black ${phase === "receive" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>Destination</button>
                </div>
              </SectionCard>
            )}

            {!readOnly && phase === "dispatch" && (
              <MoveDispatchWorkspace
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
                onClear={() => { setItem(null); setScanValue(""); setOperatorError(null); }}
              />
            )}

            {!readOnly && phase === "receive" && (
              <MoveReceiveWorkspace
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
                onClear={() => { setSelectedDispatchId(null); setOperatorError(null); }}
              />
            )}

            {readOnly && <EmptyState title="Move is read-only." helper="This move is locked for handheld edits." />}

            <MoveEvidenceList batch={activeBatch} chooseDispatchForReceive={readOnly ? null : chooseDispatchForReceive} />
            <MoveExceptionList batch={activeBatch} canReview={canReview} onReview={reviewException} />

            {!readOnly && (
              <StickyActions
                leftLabel="Back to Moves"
                rightLabel="Submit Move"
                onLeft={() => { setView("landing"); setActiveBatchId(null); setItem(null); setScanValue(""); setOperatorError(null); }}
                onRight={submitMove}
                rightDisabled={false}
              />
            )}
          </>
        ) : (
          <EmptyState title="No move selected." helper="Open or start a move first." />
        )}
      </WorkflowMain>
    </PageShell>
  );
}

function MoveLanding({ visibleBatches, transferType, setTypeAndRoute, sourceLocationId, setSourceLocationId, destinationLocationId, setDestinationLocationId, reason, setReason, sameLocation, onStart, onOpen }) {
  return (
    <>
      <SectionCard className="space-y-3 border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><ArrowLeftRight className="h-5 w-5" /></span>
          <div className="min-w-0">
            <p className="text-lg font-black leading-tight text-foreground">Move stock safely</p>
            <p className="mt-1 text-sm font-bold leading-snug text-muted-foreground">Choose From and To, scan the item, confirm quantity, then submit evidence for Inventory Desktop.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Open Moves</p>
            <h2 className="mt-1 text-lg font-black text-foreground">Move queue</h2>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-black text-muted-foreground">{visibleBatches.length} active</span>
        </div>
        {visibleBatches.length ? (
          <div className="space-y-2">
            {visibleBatches.map((batch) => (
              <button key={batch.id} type="button" onClick={() => onOpen(batch)} className="w-full rounded-2xl border border-border bg-card p-3 text-left active:bg-secondary/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-black text-foreground">{batch.transfer_ref} · {batch.source_location} → {batch.destination_location}</p>
                    <p className="mt-1 break-words text-xs font-bold text-muted-foreground">Items: {(batch.dispatch_lines || []).length} · Issues: {countOpenExceptions(batch)}</p>
                    <p className="mt-1 break-words text-xs font-semibold text-muted-foreground">Reason: {getOptionLabel(TRANSFER_REASON_OPTIONS, batch.reason)}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${statusClass(batch.status)}`}>{batch.status}</span>
                </div>
                <p className="mt-3 rounded-xl bg-primary px-3 py-2 text-center text-xs font-black text-primary-foreground">Open Move</p>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState title="No active moves." helper="Start when stock needs to move between shelf, backroom, department, or store locations." />
        )}
      </SectionCard>

      <SectionCard className="space-y-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Start Move</p>
          <h2 className="mt-1 text-lg font-black text-foreground">From and To</h2>
        </div>
        <TouchSelect label="Move type" value={transferType} onChange={setTypeAndRoute} options={TRANSFER_REQUEST_TYPE_OPTIONS} />
        <TouchSelect label="From" value={sourceLocationId} onChange={setSourceLocationId} options={TRANSFER_LOCATION_OPTIONS} />
        <TouchSelect label="To" value={destinationLocationId} onChange={setDestinationLocationId} options={TRANSFER_LOCATION_OPTIONS} />
        <TouchSelect label="Reason" value={reason} onChange={setReason} options={TRANSFER_REASON_OPTIONS} />
        {sameLocation && <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">From and To cannot be the same.</p>}
        <button type="button" onClick={onStart} disabled={sameLocation} className="min-h-12 w-full rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground active:scale-[0.98] disabled:opacity-40">
          Start Move
        </button>
      </SectionCard>
    </>
  );
}

function MoveBatchHeader({ batch }) {
  return (
    <SectionCard className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Move Batch</p>
          <h2 className="mt-1 break-words text-lg font-black text-foreground">{batch.transfer_ref}</h2>
          <p className="mt-1 break-words text-xs font-bold text-muted-foreground">{batch.source_location} → {batch.destination_location}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${statusClass(batch.status)}`}>{batch.status}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MetricPill label="Items" value={(batch.dispatch_lines || []).length} />
        <MetricPill label="Confirmed" value={(batch.receive_lines || []).length} />
        <MetricPill label="Issues" value={countOpenExceptions(batch)} />
      </div>
      <p className="rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-bold text-muted-foreground">Handheld records move evidence. Inventory Desktop remains the stock posting and audit layer.</p>
    </SectionCard>
  );
}

function MoveDispatchWorkspace({ item, unit, availableAtSource, dispatchQuantity, setDispatchQuantity, dispatchCondition, setDispatchCondition, dispatchNote, setDispatchNote, onSave, onClear }) {
  return (
    <>
      {item ? (
        <>
          <ItemSummaryCard item={item}>
            <div className="grid grid-cols-2 gap-2">
              <MetricPill label="Available from source" value={availableAtSource} suffix={unit} />
              <MetricPill label="Move quantity" value={dispatchQuantity} suffix={unit} />
            </div>
          </ItemSummaryCard>
          <SectionCard className="space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Item + quantity</p>
            <QuantityStepper label="Move quantity" value={dispatchQuantity} onChange={setDispatchQuantity} unit={unit} min={0} />
            {(dispatchQuantity <= 0 || Number.isNaN(Number(dispatchQuantity))) && <FieldError title="Quantity missing" helper="Enter a valid quantity before saving." />}
            <TouchSelect label="Condition" value={dispatchCondition} onChange={setDispatchCondition} options={TRANSFER_CONDITION_OPTIONS_STAGEW} />
            <TextInputField label="Move note" value={dispatchNote} onChange={setDispatchNote} placeholder="Optional note, e.g. moved full case from backroom" />
          </SectionCard>
          <StickyActions leftLabel="Clear Item" rightLabel="Save Item" onLeft={onClear} onRight={onSave} rightDisabled={dispatchQuantity <= 0} />
        </>
      ) : (
        <EmptyState title="Scan item to move." helper="Choose From and To first, then scan the item. No stock is posted here." />
      )}
    </>
  );
}

function MoveReceiveWorkspace({ batch, selectedDispatch, chooseDispatchForReceive, receivedQuantity, setReceivedQuantity, receiveException, setReceiveException, receiveCondition, setReceiveCondition, receiveNote, setReceiveNote, receiveDiff, onSave, onClear }) {
  const dispatchLines = batch.dispatch_lines || [];
  const receivedIds = new Set((batch.receive_lines || []).map((line) => line.dispatch_line_id));
  if (!selectedDispatch) {
    return (
      <SectionCard className="space-y-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Destination confirmation</p>
          <h2 className="mt-1 text-lg font-black text-foreground">Choose item line</h2>
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
                      <p className="mt-1 break-words text-xs font-bold text-muted-foreground">Moving: {line.dispatch_quantity} {line.unit_label} · {optionLabel(TRANSFER_CONDITION_OPTIONS_STAGEW, line.condition_note)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${received ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>{received ? "Confirmed" : "Open"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No item lines yet." helper="Save an item and quantity before confirming destination." />
        )}
      </SectionCard>
    );
  }

  return (
    <>
      <SectionCard className="space-y-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Destination confirmation</p>
          <h2 className="mt-1 break-words text-lg font-black text-foreground">{selectedDispatch.item_snapshot?.itemName || "Scanned item"}</h2>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <MetricPill label="Moving" value={selectedDispatch.dispatch_quantity} suffix={selectedDispatch.unit_label} />
          <MetricPill label="Confirmed" value={receivedQuantity} suffix={selectedDispatch.unit_label} />
          <MetricPill label="Diff" value={differenceLabel(receiveDiff)} suffix={selectedDispatch.unit_label} />
        </div>
        <QuantityStepper label="Confirmed at destination" value={receivedQuantity} onChange={setReceivedQuantity} unit={selectedDispatch.unit_label} min={0} />
        {(receivedQuantity < 0 || Number.isNaN(Number(receivedQuantity))) && <FieldError title="Quantity missing" helper="Enter a valid confirmed quantity before saving." />}
        {receiveDiff !== 0 && <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">Difference {differenceLabel(receiveDiff)} {selectedDispatch.unit_label}. Move issue evidence will be saved.</p>}
        <TouchSelect label="Issue" value={receiveException} onChange={setReceiveException} options={TRANSFER_EXCEPTION_OPTIONS_STAGEW} />
        <TouchSelect label="Condition" value={receiveCondition} onChange={setReceiveCondition} options={TRANSFER_CONDITION_OPTIONS_STAGEW} />
        <TextInputField label="Move note" value={receiveNote} onChange={setReceiveNote} placeholder="Example: 2 units missing from tote" />
      </SectionCard>
      <StickyActions leftLabel="Choose Another" rightLabel="Save Destination" onLeft={onClear} onRight={onSave} rightDisabled={receivedQuantity < 0} />
    </>
  );
}

function MoveEvidenceList({ batch, chooseDispatchForReceive }) {
  const dispatchLines = batch.dispatch_lines || [];
  const receiveLines = batch.receive_lines || [];
  return (
    <SectionCard className="space-y-3">
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Move Evidence</p>
        <h2 className="mt-1 text-lg font-black text-foreground">Item movement proof</h2>
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
                    <p className="mt-1 break-words text-xs font-bold text-muted-foreground">Move: {line.dispatch_quantity} {line.unit_label} · {optionLabel(TRANSFER_CONDITION_OPTIONS_STAGEW, line.condition_note)}</p>
                    {line.evidence_note && <p className="mt-1 break-words text-xs font-semibold text-muted-foreground">Note: {line.evidence_note}</p>}
                    {receive ? (
                      <p className="mt-1 break-words text-xs font-bold text-muted-foreground">Destination: {receive.received_quantity} {receive.unit_label} · Diff {differenceLabel(receive.difference_quantity)} · {optionLabel(TRANSFER_EXCEPTION_OPTIONS_STAGEW, receive.exception_type)}</p>
                    ) : (
                      <p className="mt-1 break-words text-xs font-bold text-muted-foreground">Destination confirmation pending.</p>
                    )}
                  </div>
                  {chooseDispatchForReceive && !receive && (
                    <button type="button" onClick={() => chooseDispatchForReceive(line)} className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground">Confirm</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No move evidence yet." helper="Scan an item, enter quantity, then save item evidence." />
      )}
    </SectionCard>
  );
}

function MoveExceptionList({ batch, canReview, onReview }) {
  const exceptions = batch.exceptions || [];
  if (!exceptions.length) return null;
  return (
    <SectionCard className="space-y-3">
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Move Issues</p>
        <h2 className="mt-1 text-lg font-black text-foreground">{exceptions.length} review item{exceptions.length === 1 ? "" : "s"}</h2>
      </div>
      <div className="space-y-2">
        {exceptions.map((exception) => (
          <div key={exception.id} className="rounded-2xl border border-border bg-card p-3">
            <p className="break-words text-sm font-black text-foreground">{exception.item_name}</p>
            <div className="mt-2 space-y-2 rounded-2xl bg-secondary/50 p-3">
              <InfoLine label="Moving" value={exception.dispatched_quantity} />
              <InfoLine label="Confirmed" value={exception.received_quantity} />
              <InfoLine label="Difference" value={differenceLabel(exception.difference_quantity)} />
              <InfoLine label="Issue" value={optionLabel(TRANSFER_EXCEPTION_OPTIONS_STAGEW, exception.exception_type)} />
              <InfoLine label="Status" value={exception.status} />
            </div>
            {exception.evidence_note && <p className="mt-2 rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-bold text-muted-foreground">{exception.evidence_note}</p>}
            {canReview ? (
              <div className="mt-3 grid grid-cols-1 gap-2">
                {REVIEW_ACTIONS.map((action) => (
                  <button key={action.id} type="button" onClick={() => onReview(exception.id, action.id)} className="min-h-10 rounded-xl bg-secondary px-3 text-xs font-black text-secondary-foreground active:bg-border">{action.label}</button>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs font-bold text-muted-foreground">Supervisor review required.</p>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
