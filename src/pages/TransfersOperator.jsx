import React, { useMemo, useState } from "react";
import { ArrowLeftRight, MapPin, MoveRight, RotateCcw, ScanLine } from "lucide-react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import PageHeader from "../components/scanner/PageHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import {
  EmptyState,
  ItemSummaryCard,
  MetricPill,
  OperatorAlert,
  PageShell,
  SectionCard,
  StickyActions,
  WorkflowMain,
} from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { useScanOpsSession } from "../lib/scanOpsSession";
import {
  getOptionLabel,
  TRANSFER_LOCATION_OPTIONS,
  TRANSFER_REASON_OPTIONS,
  TRANSFER_REQUEST_TYPES,
  TRANSFER_REQUEST_TYPE_OPTIONS,
} from "../lib/scanOpsRequestLifecycle";
import {
  getTransferBatches,
  saveTransferBatches,
  createTransferBatch,
  makeTransferDispatchLine,
  addTransferDispatchEvidence,
  unitForItem,
} from "../lib/scanOpsReceivingTransfers";

const DEFAULT_TRANSFER_TYPE = TRANSFER_REQUEST_TYPES.BACKROOM_TO_SHELF;
const DEFAULT_SOURCE = "backroom_a";
const DEFAULT_DESTINATION = "dairy_shelf";
const DEFAULT_REASON = "replenishment";

function itemName(item) {
  return item?.name || item?.item_name || "Scanned item";
}

function primaryScanValue(item) {
  return item?.barcode || item?.gtin || item?.sku || item?.plu || item?.scaleCode || item?.name || "";
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

function TransferSessionCard({ actorSession, sourceLocationId, destinationLocationId, lines }) {
  const totalUnits = lines.reduce((sum, line) => sum + Number(line.dispatch_quantity || 0), 0);
  return (
    <SectionCard>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ArrowLeftRight className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Transfer Session</p>
          <h2 className="mt-1 text-base font-black text-foreground">{getOptionLabel(TRANSFER_LOCATION_OPTIONS, sourceLocationId)} → {getOptionLabel(TRANSFER_LOCATION_OPTIONS, destinationLocationId)}</h2>
          <p className="mt-1 text-xs font-bold text-muted-foreground">
            {actorSession.actorName || "Operator"} · {actorSession.storeName || actorSession.storeId || "Current store"} · Online
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MetricPill label="Lines" value={lines.length} />
        <MetricPill label="Units" value={totalUnits} />
        <MetricPill label="Status" value="Open" />
      </div>
    </SectionCard>
  );
}

function RouteLockCard({ transferType, setTransferType, sourceLocationId, setSourceLocationId, destinationLocationId, setDestinationLocationId, reason, setReason, sameLocation }) {
  return (
    <SectionCard className="space-y-3 border-primary/20 bg-primary/5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <MapPin className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Locked Route</p>
          <h2 className="mt-1 text-base font-black text-foreground">From → To</h2>
          <p className="mt-1 text-xs font-bold text-muted-foreground">Set the route before scanning stock.</p>
        </div>
      </div>
      <TouchSelect label="Transfer type" value={transferType} onChange={setTransferType} options={TRANSFER_REQUEST_TYPE_OPTIONS} />
      <TouchSelect label="From" value={sourceLocationId} onChange={setSourceLocationId} options={TRANSFER_LOCATION_OPTIONS} />
      <TouchSelect label="To" value={destinationLocationId} onChange={setDestinationLocationId} options={TRANSFER_LOCATION_OPTIONS} />
      <TouchSelect label="Reason" value={reason} onChange={setReason} options={TRANSFER_REASON_OPTIONS} />
      {sameLocation && <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">From and To cannot be the same location.</p>}
    </SectionCard>
  );
}

function TransferKeypad({ value, onChange }) {
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

function TransferLinesCard({ lines }) {
  return (
    <SectionCard>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Transfer Lines</p>
          <h2 className="mt-1 text-lg font-black text-foreground">{lines.length} saved</h2>
        </div>
      </div>
      {lines.length ? (
        <div className="mt-3 space-y-2">
          {lines.slice(0, 6).map((line) => (
            <div key={line.id} className="rounded-2xl bg-secondary/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-black text-foreground">{line.item_snapshot?.itemName || "Scanned item"}</p>
                  <p className="mt-1 text-xs font-bold text-muted-foreground">Move {line.dispatch_quantity} {line.unit_label}</p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">{line.evidence_note || "Ready for desktop handoff."}</p>
                </div>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black text-primary">Saved</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Ready to transfer." helper="Set From and To, then scan an item to move." />
      )}
    </SectionCard>
  );
}

export default function TransfersOperator() {
  const actorSession = useScanOpsSession();
  const [scanValue, setScanValue] = useState("");
  const [transferType, setTransferType] = useState(DEFAULT_TRANSFER_TYPE);
  const [sourceLocationId, setSourceLocationId] = useState(DEFAULT_SOURCE);
  const [destinationLocationId, setDestinationLocationId] = useState(DEFAULT_DESTINATION);
  const [reason, setReason] = useState(DEFAULT_REASON);
  const [item, setItem] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [lines, setLines] = useState([]);
  const [operatorError, setOperatorError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [activeBatch, setActiveBatch] = useState(null);

  const sameLocation = sourceLocationId && destinationLocationId && sourceLocationId === destinationLocationId;
  const unit = unitForItem(item || {});
  const availableAtSource = getAvailableAtSource(item, sourceLocationId);
  const batches = useMemo(() => getTransferBatches(), []);

  const ensureBatch = () => {
    if (activeBatch) return activeBatch;
    const batch = createTransferBatch({
      transferType,
      sourceLocationId,
      sourceLocationLabel: getOptionLabel(TRANSFER_LOCATION_OPTIONS, sourceLocationId),
      destinationLocationId,
      destinationLocationLabel: getOptionLabel(TRANSFER_LOCATION_OPTIONS, destinationLocationId),
      reason,
    });
    const nextBatches = [batch, ...batches];
    saveTransferBatches(nextBatches);
    setActiveBatch(batch);
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
    return batch;
  };

  const scan = (value) => {
    if (sameLocation) {
      setOperatorError({ title: "Route needs fixing", helper: "Choose different From and To locations before scanning." });
      return;
    }
    const input = typeof value === "object" ? primaryScanValue(value) : String(value || "").trim();
    const found = typeof value === "object" ? value : resolveInventoryIdentity(input);
    if (!found) {
      setOperatorError({ title: "Item not found", helper: "Scan again or use barcode, SKU, PLU, or item name." });
      setLastSaved(null);
      return;
    }
    const available = getAvailableAtSource(found, sourceLocationId);
    setOperatorError(null);
    setLastSaved(null);
    setItem(found);
    setScanValue(primaryScanValue(found));
    setQuantity(String(Math.min(6, Math.max(1, Number(available || 1)))));
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_ITEM_SCANNED, {
      source_module: "Move Stock",
      transfer_id: activeBatch?.id || null,
      transfer_ref: activeBatch?.transfer_ref || null,
      item_name: found?.name,
      sku: found?.sku,
      barcode: found?.barcode,
      plu: found?.plu || found?.scaleCode,
      available_at_source: available,
      applies_stock_directly: false,
    });
  };

  const clearItem = () => {
    setItem(null);
    setScanValue("");
    setQuantity("");
    setOperatorError(null);
  };

  const saveLine = () => {
    if (sameLocation) {
      setOperatorError({ title: "Route needs fixing", helper: "From and To must be different before saving." });
      return;
    }
    if (!item) {
      setOperatorError({ title: "Item required", helper: "Scan an item before saving transfer evidence." });
      return;
    }
    if (quantity === "" || Number.isNaN(Number(quantity)) || Number(quantity) <= 0) {
      setOperatorError({ title: "Quantity missing", helper: "Enter a valid move quantity before saving." });
      return;
    }

    const batch = ensureBatch();
    const line = makeTransferDispatchLine({ transfer: batch, item, dispatchQuantity: Number(quantity), condition: "normal", evidenceNote: `${getOptionLabel(TRANSFER_LOCATION_OPTIONS, sourceLocationId)} → ${getOptionLabel(TRANSFER_LOCATION_OPTIONS, destinationLocationId)}` });
    const nextBatch = addTransferDispatchEvidence(batch, line);
    const nextBatches = [nextBatch, ...getTransferBatches().filter((entry) => entry.id !== nextBatch.id)];
    saveTransferBatches(nextBatches);
    setActiveBatch(nextBatch);
    setLines((current) => [line, ...current]);
    setLastSaved(line);
    setOperatorError(null);
    setItem(null);
    setScanValue("");
    setQuantity("");
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TRANSFER_DISPATCH_EVIDENCE_SAVED, {
      source_module: "Move Stock",
      transfer_id: nextBatch.id,
      transfer_ref: nextBatch.transfer_ref,
      dispatch_line_id: line.id,
      item_name: line.item_snapshot?.itemName,
      dispatch_quantity: line.dispatch_quantity,
      condition: line.condition_note,
      status: nextBatch.status,
      applies_stock_directly: false,
    });
  };

  return (
    <PageShell>
      <PageHeader title="Transfers" subtitle="Set route, scan item, move quantity, save" />
      <WorkflowHeader
        title="Transfers"
        subtitle="From → Item → Qty → To"
        placeholder="Scan item barcode, SKU, PLU, or name..."
        showHeaderChrome={false}
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={scan}
        disabled={sameLocation}
      />
      <WorkflowMain>
        {operatorError && (
          <OperatorAlert
            title={operatorError.title}
            helper={operatorError.helper}
            tone="warning"
            actions={[{ label: "Keep Moving", onClick: () => setOperatorError(null), variant: "primary" }]}
          />
        )}

        {lastSaved && (
          <OperatorAlert
            tone="success"
            title="Transfer line saved"
            helper={`${lastSaved.item_snapshot?.itemName || "Item"} recorded. Ready for next scan.`}
          />
        )}

        <TransferSessionCard actorSession={actorSession} sourceLocationId={sourceLocationId} destinationLocationId={destinationLocationId} lines={lines} />
        <RouteLockCard
          transferType={transferType}
          setTransferType={setTransferType}
          sourceLocationId={sourceLocationId}
          setSourceLocationId={setSourceLocationId}
          destinationLocationId={destinationLocationId}
          setDestinationLocationId={setDestinationLocationId}
          reason={reason}
          setReason={setReason}
          sameLocation={sameLocation}
        />

        {item ? (
          <>
            <ItemSummaryCard item={item}>
              <div className="grid grid-cols-3 gap-2">
                <MetricPill label="Available" value={availableAtSource} suffix={unit} />
                <MetricPill label="Move" value={quantity === "" ? "—" : quantity} suffix={quantity === "" ? "" : unit} />
                <MetricPill label="Route" value="Set" />
              </div>
            </ItemSummaryCard>

            <SectionCard className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <MoveRight className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Move Quantity</p>
                  <h2 className="mt-1 text-3xl font-black text-foreground">{quantity === "" ? "—" : quantity}</h2>
                  <p className="mt-1 text-xs font-bold text-muted-foreground">Confirm how many are moving to the destination.</p>
                </div>
              </div>
              <TransferKeypad value={quantity} onChange={setQuantity} />
              {Number(quantity || 0) > availableAtSource && (
                <p className="rounded-2xl bg-primary/10 px-3 py-2 text-xs font-bold text-primary">Quantity is above visible source stock. Save as evidence for review if correct.</p>
              )}
            </SectionCard>

            <StickyActions leftLabel="Clear Item" rightLabel="Save Transfer" onLeft={clearItem} onRight={saveLine} rightDisabled={sameLocation || quantity === "" || Number(quantity) <= 0} />
          </>
        ) : (
          <SectionCard className="border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <ScanLine className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-black leading-tight text-foreground">Ready to transfer</p>
                <p className="mt-1 text-sm font-bold leading-snug text-muted-foreground">Set From and To, then scan the item being moved.</p>
              </div>
            </div>
          </SectionCard>
        )}

        <TransferLinesCard lines={lines} />

        <SectionCard className="space-y-2">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <RotateCcw className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-foreground">Transfers stay evidence-only</p>
              <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">This handheld workflow records transfer evidence only. Inventory Desktop remains the stock posting and audit layer.</p>
            </div>
          </div>
        </SectionCard>
      </WorkflowMain>
    </PageShell>
  );
}
