import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/scanner/PageHeader";
import ScanPlaceholder from "../components/scanner/ScanPlaceholder";
import DecisionRecommendationCard from "../components/scanner/DecisionRecommendationCard";
import TouchSelect from "../components/scanner/TouchSelect";
import NumericKeypad from "../components/scanner/NumericKeypad";
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, CheckCircle2, Home, Minus, PackageCheck, Plus, RotateCcw } from "lucide-react";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { buildDecisionLinkedPayload, createDecisionRecommendation, recordDecisionEvent } from "../lib/scanOpsDecisionEngine";
import { getReplenishmentRecommendation } from "../lib/scanOpsRules";

const BUTTON_PRIMARY = "w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40";
const BUTTON_SECONDARY = "w-full py-4 rounded-2xl bg-secondary text-secondary-foreground font-bold text-sm active:scale-[0.98] active:bg-border transition-all flex items-center justify-center gap-2";
const SOFT_BUTTON = "w-full rounded-2xl bg-secondary text-secondary-foreground px-4 py-4 text-sm font-bold active:scale-[0.98] active:bg-border transition-all text-center break-words";

const STEPS = { SCAN: "scan", RESULT: "result", ISSUE: "issue", CREATED: "created", COMPLETED: "completed" };
const ISSUE_REASONS = [
  { id: "No stock found", label: "No stock found" },
  { id: "Wrong location", label: "Wrong location" },
  { id: "Damaged stock", label: "Damaged stock" },
  { id: "Label issue", label: "Label issue" },
];

export default function Replenish() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(STEPS.SCAN);
  const [item, setItem] = useState(null);
  const [quantity, setQuantity] = useState("6");
  const [createdEvent, setCreatedEvent] = useState(null);
  const [completedEvent, setCompletedEvent] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);

  const recommendation = useMemo(() => getReplenishmentRecommendation(item), [item]);
  const decision = useMemo(() => createDecisionRecommendation({ workflow: "replenishment", item }), [item]);
  const quantityNumber = Math.max(0, parseInt(quantity || "0", 10) || 0);

  const startScan = () => {
    const scanned = resolveInventoryIdentity("930000000001");
    const scanDecision = createDecisionRecommendation({ workflow: "replenishment", item: scanned });
    recordDecisionEvent(scanDecision, "generated", { source_module: "Replenish", status: "generated" });
    setItem(scanned);
    setQuantity(String(Math.min(scanned.minimum_shelf_qty, scanned.backroom_stock)));
    setCreatedEvent(null);
    setCompletedEvent(null);
    setSelectedIssue(null);
    setStep(STEPS.RESULT);
  };

  const resetScan = () => {
    setItem(null);
    setQuantity("6");
    setCreatedEvent(null);
    setCompletedEvent(null);
    setSelectedIssue(null);
    setStep(STEPS.SCAN);
  };

  const adjustQty = (delta) => {
    const maxQty = item?.backroom_stock || 0;
    setQuantity(String(Math.max(0, Math.min(maxQty, quantityNumber + delta))));
  };

  const createReplenishment = () => {
    if (!item || quantityNumber <= 0 || createdEvent) return;
    const decisionEvent = recordDecisionEvent(decision, "accepted", { source_module: "Replenish", status: "accepted", quantity_requested: quantityNumber });
    const event = createScanOpsEvent(SCANOPS_EVENT_TYPES.REPLENISHMENT_CREATED, {
      source_module: "Replenish",
      sku: item.sku,
      item_name: item.name,
      barcode: item.barcode,
      gtin: item.gtin,
      plu: item.plu,
      scale_code: item.scaleCode,
      internal_item_id: item.internalItemId || item.id,
      sell_type: item.sellType,
      aisle: item.aisle,
      bay: item.bay,
      shelf: item.shelf,
      shelf_stock: item.shelf_stock,
      backroom_stock: item.backroom_stock,
      pending_delivery_qty: item.pending_delivery_qty,
      minimum_shelf_qty: item.minimum_shelf_qty,
      recommended_action: recommendation.recommended_action,
      quantity_requested: quantityNumber,
      quantity_completed: null,
      movement: "Backroom to Shelf",
      status: "created",
      ...buildDecisionLinkedPayload(decision, decisionEvent),
    });
    setCreatedEvent(event);
    setStep(STEPS.CREATED);
    toast({ description: "Replenishment created", duration: 1500 });
  };

  const completeReplenishment = () => {
    if (!item || !createdEvent || completedEvent) return;
    const event = createScanOpsEvent(SCANOPS_EVENT_TYPES.REPLENISHMENT_COMPLETED, {
      source_module: "Replenish",
      sku: item.sku,
      item_name: item.name,
      barcode: item.barcode,
      internal_item_id: item.internalItemId || item.id,
      linked_event_id: createdEvent.event_id,
      quantity_requested: quantityNumber,
      quantity_completed: quantityNumber,
      movement: "Backroom to Shelf",
      status: "completed",
    });
    setCompletedEvent(event);
    setStep(STEPS.COMPLETED);
    toast({ description: "Replenishment completed", duration: 1500 });
  };

  const confirmAlreadyFilled = () => {
    if (!item) return;
    const decisionEvent = recordDecisionEvent(decision, "rejected", { source_module: "Replenish", status: "rejected", rejection_reason: "Shelf already filled" });
    createScanOpsEvent(SCANOPS_EVENT_TYPES.REPLENISHMENT_CANCELLED, {
      source_module: "Replenish",
      sku: item.sku,
      item_name: item.name,
      reason: "Shelf already filled",
      status: "no_action_required",
      ...buildDecisionLinkedPayload(decision, decisionEvent),
    });
    toast({ description: "Shelf already filled recorded", duration: 1500 });
    resetScan();
  };

  const recordIssue = () => {
    if (!item || !selectedIssue) return;
    const decisionEvent = recordDecisionEvent(decision, "overridden", { source_module: "Replenish", status: "overridden", override_reason: selectedIssue });
    createScanOpsEvent(SCANOPS_EVENT_TYPES.SHELF_LABEL_ISSUE_FLAGGED, {
      source_module: "Replenish",
      sku: item.sku,
      item_name: item.name,
      issue_reason: selectedIssue,
      status: "flagged",
      ...buildDecisionLinkedPayload(decision, decisionEvent),
    });
    toast({ description: "Issue flagged", duration: 1500 });
    resetScan();
  };

  const rejectRecommendation = () => {
    if (!item) return;
    recordDecisionEvent(decision, "rejected", { source_module: "Replenish", status: "rejected", rejection_reason: "Operator rejected from Replenish" });
    toast({ description: "Recommendation rejected", duration: 1500 });
    resetScan();
  };

  const viewReason = () => {
    recordDecisionEvent(decision, "reason_viewed", { source_module: "Replenish", status: "reason_viewed" });
    toast({ description: decision.reasonText, duration: 2500 });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <PageHeader title="Replenish" subtitle="Stage C · Backroom to shelf" />
      <main className="flex-1 px-4 py-5 pb-8 space-y-4 overflow-y-auto overflow-x-hidden">
        {step === STEPS.SCAN && (
          <div className="space-y-4">
            <section className="bg-card rounded-2xl border border-border p-5">
              <h2 className="font-bold text-foreground">Scan shelf item or label</h2>
              <p className="text-sm text-muted-foreground mt-1">Check shelf, backroom, and pending delivery stock before creating work.</p>
            </section>
            <ScanPlaceholder onSimulate={startScan} label="Scan item, barcode, or shelf label" />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={startScan} className={SOFT_BUTTON}>Manual SKU</button>
              <button onClick={startScan} className={SOFT_BUTTON}>Recent Scan</button>
            </div>
          </div>
        )}

        {step === STEPS.RESULT && item && (
          <div className="space-y-4">
            <ProductCard item={item} />
            <StockGrid item={item} />
            <DecisionRecommendationCard decision={decision} onReject={rejectRecommendation} onMoreInfo={viewReason} />
            <section className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Qty to move</p>
                <p className="text-sm text-muted-foreground mt-1">Cannot exceed backroom stock.</p>
              </div>
              <div className="flex items-center justify-between gap-4">
                <button onClick={() => adjustQty(-1)} className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center active:bg-border active:scale-95 transition-all shrink-0" aria-label="Decrease quantity"><Minus className="w-5 h-5" /></button>
                <span className="text-4xl font-bold text-foreground flex-1 text-center">{quantityNumber}</span>
                <button onClick={() => adjustQty(1)} className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center active:bg-border active:scale-95 transition-all shrink-0" aria-label="Increase quantity"><Plus className="w-5 h-5" /></button>
              </div>
              <NumericKeypad value={quantity} onChange={setQuantity} />
            </section>
            <button onClick={createReplenishment} disabled={quantityNumber <= 0} className={BUTTON_PRIMARY}>Create Replenishment</button>
            <button onClick={confirmAlreadyFilled} className={BUTTON_SECONDARY}>Confirm Already Filled</button>
            <button onClick={() => setStep(STEPS.ISSUE)} className={BUTTON_SECONDARY}>Flag Issue</button>
          </div>
        )}

        {step === STEPS.ISSUE && item && (
          <div className="space-y-4">
            <ProductCard item={item} />
            <section className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-foreground">Flag replenishment issue</p>
                  <p className="text-sm text-muted-foreground mt-1">Use one clear reason so the next operator knows what to check.</p>
                </div>
              </div>
            </section>
            <section className="scanops-compact-card">
              <TouchSelect
                label="Issue reason"
                value={selectedIssue || ""}
                onChange={setSelectedIssue}
                options={ISSUE_REASONS}
                placeholder="Select issue reason"
              />
            </section>
            <button onClick={recordIssue} disabled={!selectedIssue} className={BUTTON_PRIMARY}>Record Issue</button>
          </div>
        )}

        {step === STEPS.CREATED && item && createdEvent && (
          <DonePanel icon={PackageCheck} title="Replenishment Created" helper="Move stock from backroom to shelf, then mark completed." rows={[["Item", item.name], ["Move", "Backroom to Shelf"], ["Qty", quantityNumber], ["Location", `${item.aisle} · ${item.bay}`], ["Event", createdEvent.event_type]]} actions={[{ label: "Mark Completed", onClick: completeReplenishment, primary: true }, { label: "Scan Next Item", onClick: resetScan }, { label: "Back to Home", onClick: () => navigate("/"), icon: Home }]} />
        )}

        {step === STEPS.COMPLETED && item && completedEvent && (
          <DonePanel icon={CheckCircle2} title="Replenishment Completed" helper="The shelf movement has been recorded once with scanner/user traceability." rows={[["Item", item.name], ["Completed Qty", quantityNumber], ["Status", "Completed"], ["Event", completedEvent.event_type]]} actions={[{ label: "Scan Next Item", onClick: resetScan, primary: true, icon: RotateCcw }, { label: "Back to Home", onClick: () => navigate("/"), icon: Home }]} />
        )}
      </main>
    </div>
  );
}

function ProductCard({ item }) {
  return (
    <section className="bg-card rounded-2xl border border-border p-5 min-w-0">
      <p className="text-xs text-muted-foreground font-mono break-all">{item.sku} · {item.barcode}</p>
      <h2 className="text-lg font-bold text-foreground leading-snug mt-1 break-words">{item.name}</h2>
      <p className="text-sm text-muted-foreground mt-2 break-words">{item.aisle} · {item.bay} · {item.shelf}</p>
    </section>
  );
}

function StockGrid({ item }) {
  return (
    <section className="grid grid-cols-2 gap-3">
      <Metric label="Shelf" value={item.shelf_stock} />
      <Metric label="Backroom" value={item.backroom_stock} />
      <Metric label="Pending" value={item.pending_delivery_qty} />
      <Metric label="Minimum" value={item.minimum_shelf_qty} />
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 min-w-0">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value ?? "—"}</p>
    </div>
  );
}

function DonePanel({ icon: Icon, title, helper, rows, actions }) {
  return (
    <div className="space-y-5">
      <section className="bg-card rounded-2xl border border-border p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto"><Icon className="w-10 h-10 text-accent" /></div>
        <h2 className="text-lg font-bold text-foreground mt-4">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{helper}</p>
      </section>
      <section className="bg-card rounded-2xl border border-border divide-y divide-border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 px-5 py-3.5">
            <span className="text-sm text-muted-foreground shrink-0">{label}</span>
            <span className="text-sm font-semibold text-foreground text-right break-words min-w-0">{value}</span>
          </div>
        ))}
      </section>
      <div className="space-y-3">
        {actions.map((action) => {
          const ActionIcon = action.icon;
          return <button key={action.label} onClick={action.onClick} className={action.primary ? BUTTON_PRIMARY : BUTTON_SECONDARY}>{ActionIcon && <ActionIcon className="w-4 h-4" />}{action.label}</button>;
        })}
      </div>
    </div>
  );
}
