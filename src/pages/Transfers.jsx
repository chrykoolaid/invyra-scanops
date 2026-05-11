import React, { useState } from "react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
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
  WorkflowMain,
} from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import {
  buildTransferRequest,
  getOptionLabel,
  saveTransferRequest,
  TRANSFER_LOCATION_OPTIONS,
  TRANSFER_REASON_OPTIONS,
  TRANSFER_REQUEST_TYPES,
  TRANSFER_REQUEST_TYPE_OPTIONS,
} from "../lib/scanOpsRequestLifecycle";

const STEP_LABELS = ["Type", "Locations", "Item", "Qty", "Review", "Submitted"];

function getUnit(item) {
  return item?.unitType || item?.unit_type || "each";
}

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

export default function Transfers() {
  const [scanValue, setScanValue] = useState("");
  const [step, setStep] = useState(1);
  const [transferType, setTransferType] = useState(TRANSFER_REQUEST_TYPES.BACKROOM_TO_SHELF);
  const [sourceLocationId, setSourceLocationId] = useState("backroom_a");
  const [destinationLocationId, setDestinationLocationId] = useState("dairy_shelf");
  const [reason, setReason] = useState("replenishment");
  const [item, setItem] = useState(null);
  const [quantity, setQuantity] = useState(6);
  const [submittedRequest, setSubmittedRequest] = useState(null);

  const unit = getUnit(item);
  const availableAtSource = getAvailableAtSource(item, sourceLocationId);
  const sameLocation = sourceLocationId && destinationLocationId && sourceLocationId === destinationLocationId;

  const setTypeAndRoute = (nextType) => {
    setTransferType(nextType);
    const route = defaultRouteForType(nextType);
    setSourceLocationId(route.source);
    setDestinationLocationId(route.destination);
    if (!reason) setReason("replenishment");
  };

  const scan = (value) => {
    const found = resolveInventoryIdentity(String(value || "").trim() || "930000000004") || resolveInventoryIdentity("930000000004");
    setItem(found);
    const available = getAvailableAtSource(found, sourceLocationId);
    setQuantity(Math.min(6, Math.max(1, Number(available || 1))));
    setSubmittedRequest(null);
    setStep(4);
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_ITEM_SCANNED, {
      source_module: "Transfers",
      transfer_type: transferType,
      source_location_id: sourceLocationId,
      destination_location_id: destinationLocationId,
      item_name: found?.name,
      sku: found?.sku,
      barcode: found?.barcode,
      available_at_source: available,
      applies_stock_directly: false,
    });
  };

  const next = () => {
    if (step === 2 && sameLocation) return;
    if (step === 3 && !item) return;
    if (step === 4 && (!item || quantity <= 0)) return;
    setStep((current) => Math.min(5, current + 1));
  };

  const back = () => {
    if (step <= 1) return;
    setStep((current) => Math.max(1, current - 1));
  };

  const submitTransfer = () => {
    if (!item || !sourceLocationId || !destinationLocationId || sameLocation || quantity <= 0) return;
    const request = saveTransferRequest(buildTransferRequest({
      transferType,
      sourceLocationId,
      destinationLocationId,
      reason,
      item,
      quantity,
      availableAtSource,
    }));
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_REQUEST_SUBMITTED, {
      source_module: "Transfers",
      transfer_request_id: request.requestId,
      transfer_type: transferType,
      source_location_id: sourceLocationId,
      source_location_label: getOptionLabel(TRANSFER_LOCATION_OPTIONS, sourceLocationId),
      destination_location_id: destinationLocationId,
      destination_location_label: getOptionLabel(TRANSFER_LOCATION_OPTIONS, destinationLocationId),
      reason,
      reason_label: getOptionLabel(TRANSFER_REASON_OPTIONS, reason),
      item_name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      requested_qty: quantity,
      available_at_source: availableAtSource,
      unit_type: unit,
      status: request.status,
      applies_stock_directly: false,
      official_inventory_applies_after_sync: true,
    });
    setSubmittedRequest(request);
    setStep(6);
    setScanValue("");
  };

  const rightDisabled =
    (step === 2 && (!sourceLocationId || !destinationLocationId || sameLocation || !reason)) ||
    (step === 3 && !item) ||
    (step === 4 && (!item || quantity <= 0)) ||
    (step === 5 && (!item || quantity <= 0 || sameLocation));

  return (
    <PageShell>
      <WorkflowHeader
        title="Transfers"
        subtitle={`Step ${step} of 6 · ${STEP_LABELS[step - 1]}`}
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={scan}
        showSearch={step === 3 && !submittedRequest}
      />
      <WorkflowMain>
        <Progress step={step} />

        {step === 1 && (
          <SectionCard className="space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Transfer Type</p>
            <div className="grid grid-cols-1 gap-2">
              {TRANSFER_REQUEST_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTypeAndRoute(option.id)}
                  className={`min-h-14 rounded-2xl px-4 py-3 text-left active:scale-[0.99] ${transferType === option.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                >
                  <span className="block text-sm font-black">{option.label}</span>
                  <span className={`mt-0.5 block text-xs font-bold ${transferType === option.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{option.helper}</span>
                </button>
              ))}
            </div>
          </SectionCard>
        )}

        {step === 2 && (
          <SectionCard className="space-y-3">
            <TouchSelect label="From" value={sourceLocationId} onChange={setSourceLocationId} options={TRANSFER_LOCATION_OPTIONS} />
            <TouchSelect label="To" value={destinationLocationId} onChange={setDestinationLocationId} options={TRANSFER_LOCATION_OPTIONS} />
            <TouchSelect label="Reason" value={reason} onChange={setReason} options={TRANSFER_REASON_OPTIONS} />
            {sameLocation && (
              <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">
                Source and destination cannot be the same.
              </p>
            )}
          </SectionCard>
        )}

        {step === 3 && (
          <>
            {item ? (
              <ItemSummaryCard item={item}>
                <p className="text-xs font-bold text-muted-foreground">
                  Available in source: {availableAtSource} {unit} · Current shelf SOH: {item.shelfStock ?? item.shelf_stock ?? "—"}
                </p>
              </ItemSummaryCard>
            ) : (
              <EmptyState title="No item selected." helper="Use the header search or hardware scan trigger to choose the item for this transfer request." />
            )}
          </>
        )}

        {step === 4 && (
          <>
            <ItemSummaryCard item={item}>
              <p className="text-xs font-bold text-muted-foreground">
                Available in source: {availableAtSource} {unit} · Current shelf SOH: {item?.shelfStock ?? item?.shelf_stock ?? "—"}
              </p>
            </ItemSummaryCard>
            <SectionCard>
              <QuantityStepper label="Quantity" value={quantity} onChange={setQuantity} unit={unit} min={1} />
              {quantity > availableAtSource && (
                <p className="mt-3 rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-bold text-muted-foreground">
                  Quantity exceeds the local source snapshot. Inventory review/posting is still required before stock moves.
                </p>
              )}
            </SectionCard>
          </>
        )}

        {step === 5 && (
          <SectionCard className="space-y-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Review Transfer</p>
              <h2 className="mt-1 text-lg font-black text-foreground">Submit transfer request</h2>
            </div>
            <div className="space-y-2 rounded-2xl bg-secondary/50 p-3">
              <InfoLine label="From" value={getOptionLabel(TRANSFER_LOCATION_OPTIONS, sourceLocationId)} />
              <InfoLine label="To" value={getOptionLabel(TRANSFER_LOCATION_OPTIONS, destinationLocationId)} />
              <InfoLine label="Reason" value={getOptionLabel(TRANSFER_REASON_OPTIONS, reason)} />
            </div>
            <div className="rounded-2xl border border-border bg-card p-3">
              <p className="break-words text-sm font-black text-foreground">{item?.name || "Scan required"}</p>
              <p className="mt-1 break-words text-xs font-bold text-muted-foreground">
                Qty: {quantity} {unit} · Available in source: {availableAtSource} {unit}
              </p>
              <p className="mt-1 text-xs font-bold text-muted-foreground">No stock is moved until Inventory approves/posts this request.</p>
            </div>
          </SectionCard>
        )}

        {step === 6 && submittedRequest && (
          <DoneCard
            title="Transfer request submitted"
            helper="No stock has been moved yet. The desktop inventory system must approve/post the movement."
            rows={[
              { label: "Request", value: submittedRequest.requestId },
              { label: "Status", value: submittedRequest.status === "sync_pending" ? "Sync pending" : "Submitted" },
              { label: "From", value: getOptionLabel(TRANSFER_LOCATION_OPTIONS, submittedRequest.sourceLocationId) },
              { label: "To", value: getOptionLabel(TRANSFER_LOCATION_OPTIONS, submittedRequest.destinationLocationId) },
              { label: "Stock mutation", value: "No direct stock mutation" },
            ]}
          />
        )}

        {step < 6 && (
          <StickyActions
            leftLabel={step === 1 ? "Cancel" : "Back"}
            rightLabel={step === 5 ? "Submit Transfer Request" : "Continue"}
            onLeft={step === 1 ? () => { setSubmittedRequest(null); setItem(null); setScanValue(""); } : back}
            onRight={step === 5 ? submitTransfer : next}
            rightDisabled={rightDisabled}
          />
        )}
      </WorkflowMain>
    </PageShell>
  );
}

function Progress({ step }) {
  return (
    <SectionCard>
      <div className="grid grid-cols-6 gap-1.5">
        {STEP_LABELS.map((label, index) => {
          const active = index + 1 <= step;
          return <div key={label} className={`h-2 rounded-full ${active ? "bg-primary" : "bg-secondary"}`} />;
        })}
      </div>
      <div className="mt-2 grid grid-cols-6 gap-1.5 text-center text-[10px] font-black text-muted-foreground">
        {STEP_LABELS.map((label) => <span key={label} className="truncate">{label}</span>)}
      </div>
    </SectionCard>
  );
}
