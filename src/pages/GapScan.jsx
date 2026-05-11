import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/scanner/PageHeader";
import ScanPlaceholder from "../components/scanner/ScanPlaceholder";
import DecisionRecommendationCard from "../components/scanner/DecisionRecommendationCard";
import TouchSelect from "../components/scanner/TouchSelect";
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Home, PackageCheck, PackageSearch, Printer, RotateCw, Truck } from "lucide-react";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { classifyGap, formatActionLabel, GAP_TYPES } from "../lib/scanOpsRules";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { createTaskFromDecision } from "../lib/scanOpsTasks";
import { buildDecisionLinkedPayload, createDecisionRecommendation, recordDecisionEvent } from "../lib/scanOpsDecisionEngine";

const BUTTON_PRIMARY = "w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2";
const BUTTON_SECONDARY = "w-full py-4 rounded-2xl bg-secondary text-secondary-foreground font-bold text-sm active:scale-[0.98] active:bg-border transition-all flex items-center justify-center gap-2";
const SOFT_BUTTON = "w-full min-h-16 rounded-2xl bg-secondary text-secondary-foreground px-3 py-3 text-sm font-bold active:scale-[0.98] active:bg-border transition-all text-center break-words";

const STEPS = { SCAN: "scan", RESULT: "result", DONE: "done" };
const GAP_TYPE_LABELS = {
  [GAP_TYPES.TRUE_OUT_OF_STOCK]: "True out of stock",
  [GAP_TYPES.BACKROOM_AVAILABLE]: "Backroom available",
  [GAP_TYPES.SHELF_LABEL_PLANOGRAM_ISSUE]: "Shelf label / planogram issue",
  [GAP_TYPES.SUPPLIER_PENDING]: "Supplier pending",
};

const GAP_OUTCOME_OPTIONS = Object.entries(GAP_TYPE_LABELS).map(([id, label]) => ({ id, label }));

function scenarioFromIdentity(input, buttonLabel, overrides = {}) {
  const item = resolveInventoryIdentity(input);
  return {
    ...item,
    id: overrides.id || item?.internalItemId || item?.id || input,
    buttonLabel,
    name: item?.name || input,
    sku: item?.sku || input,
    barcode: item?.barcode || item?.plu || input,
    shelf_stock: item?.shelfStock ?? item?.shelf_stock ?? 0,
    backroom_stock: item?.backroomStock ?? item?.backroom_stock ?? 0,
    pending_delivery_qty: item?.pendingDeliveryQty ?? item?.pending_delivery_qty ?? 0,
    pending_delivery_eta: item?.pendingDeliveryEta ?? item?.pending_delivery_eta ?? null,
    minimum_shelf_qty: item?.minimumStock ?? item?.minimum_shelf_qty ?? 0,
    aisle: item?.aisle || "—",
    bay: item?.bay || "—",
    shelf: item?.shelf || item?.shelfLocation || "—",
    planogram_status: item?.planogramStatus || item?.planogram_status || "OK",
    ...overrides,
  };
}

const GAP_SCAN_SCENARIOS = [
  scenarioFromIdentity("930000000001", "Backroom available"),
  scenarioFromIdentity("930000000002", "True out of stock"),
  scenarioFromIdentity("930000000004", "Supplier pending"),
  scenarioFromIdentity("4011", "Produce PLU gap", { shelf_stock: 0, backroom_stock: 24, minimum_shelf_qty: 20 }),
  { id: "label-planogram-issue", buttonLabel: "Label / planogram issue", name: "Unknown / Mismatched Shelf Label", sku: "UNLINKED-LABEL", barcode: "A4-B2-03", shelf_stock: null, backroom_stock: null, pending_delivery_qty: null, minimum_shelf_qty: null, aisle: "Aisle 4", bay: "Bay 2", shelf: "Label A4-B2-03", planogram_status: "MISMATCH", label_issue: true },
];

export default function GapScan() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(STEPS.SCAN);
  const [item, setItem] = useState(null);
  const [doneState, setDoneState] = useState(null);
  const [showTests, setShowTests] = useState(false);
  const [outcomeId, setOutcomeId] = useState("");
  const classification = useMemo(() => classifyGap(item), [item]);
  const selectedGapType = outcomeId || classification.gap_type;
  const decision = useMemo(() => createDecisionRecommendation({ workflow: "gap_scan", item }), [item]);

  const handleScan = (scenario = GAP_SCAN_SCENARIOS[0]) => {
    const scanDecision = createDecisionRecommendation({ workflow: "gap_scan", item: scenario });
    recordDecisionEvent(scanDecision, "generated", { source_module: "Gap Scan", status: "generated" });
    setItem(scenario);
    setOutcomeId("");
    setDoneState(null);
    setStep(STEPS.RESULT);
  };

  const resetScan = () => {
    setItem(null);
    setOutcomeId("");
    setDoneState(null);
    setStep(STEPS.SCAN);
  };

  const recordEvent = (eventType, status, extra = {}) => {
    if (!item) return null;
    return createScanOpsEvent(eventType, {
      source_module: "Gap Scan",
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
      pending_delivery_eta: item.pending_delivery_eta,
      planogram_status: item.planogram_status,
      gap_type: selectedGapType,
      recommended_action: classification.recommended_action,
      status,
      ...extra,
    });
  };

  const finish = ({ eventType, title, helper, status, extra }) => {
    const decisionEvent = recordDecisionEvent(decision, "accepted", { source_module: "Gap Scan", status: "accepted" });
    const event = recordEvent(eventType, status, buildDecisionLinkedPayload(decision, decisionEvent, extra));
    setDoneState({ title, helper, event, decisionEvent });
    setStep(STEPS.DONE);
    toast({ description: title, duration: 1500 });
  };

  const rejectRecommendation = () => {
    const event = recordDecisionEvent(decision, "rejected", { source_module: "Gap Scan", status: "rejected", rejection_reason: "Operator rejected from Gap Scan" });
    setDoneState({ title: "Recommendation Rejected", helper: "The deterministic recommendation was rejected by the operator. No stock action was applied.", event });
    setStep(STEPS.DONE);
    toast({ description: "Recommendation rejected", duration: 1500 });
  };

  const viewReason = () => {
    recordDecisionEvent(decision, "reason_viewed", { source_module: "Gap Scan", status: "reason_viewed" });
    toast({ description: decision.reasonText, duration: 2500 });
  };

  const createReplenishment = () => {
    const qty = Math.min(item.minimum_shelf_qty || 1, item.backroom_stock || 1);
    const decisionEvent = recordDecisionEvent(decision, "accepted", { source_module: "Gap Scan", status: "accepted" });
    const task = createTaskFromDecision(decision, item, { sourceModule: "Gap Scan", linkedDecisionEventId: decisionEvent?.event_id, linkedWorkflowLabel: "Go to Replenish", quantityRequested: qty });
    if (task) recordDecisionEvent(decision, "task_created", { source_module: "Gap Scan", status: "task_created", task_id: task.id });
    const event = recordEvent(SCANOPS_EVENT_TYPES.REPLENISHMENT_CREATED, "created", buildDecisionLinkedPayload(decision, decisionEvent, { movement: "Backroom to Shelf", quantity_requested: qty, quantity_completed: null, linked_task_id: task?.id || null }));
    setDoneState({ title: "Replenishment Created", helper: "Gap was classified as backroom available and converted into a replenishment task. Inventory truth will apply after sync.", event, decisionEvent });
    setStep(STEPS.DONE);
    toast({ description: "Replenishment created", duration: 1500 });
  };

  const requestReorder = () => {
    const decisionEvent = recordDecisionEvent(decision, "accepted", { source_module: "Gap Scan", status: "accepted" });
    const gapEvent = recordEvent(SCANOPS_EVENT_TYPES.GAP_CONFIRMED, "confirmed", buildDecisionLinkedPayload(decision, decisionEvent));
    const reorderEvent = recordEvent(SCANOPS_EVENT_TYPES.REORDER_REQUESTED, "requested", buildDecisionLinkedPayload(decision, decisionEvent, { linked_gap_event_id: gapEvent?.event_id, reorder_requested: true }));
    setDoneState({ title: "Reorder Requested", helper: "True out-of-stock was confirmed and a reorder request was recorded for Inventory Sync.", event: reorderEvent, decisionEvent });
    setStep(STEPS.DONE);
    toast({ description: "Reorder requested", duration: 1500 });
  };

  const renderActions = () => {
    if (selectedGapType === GAP_TYPES.BACKROOM_AVAILABLE) {
      return (
        <>
          <button onClick={createReplenishment} className={BUTTON_PRIMARY}>Create Replenishment</button>
          <button onClick={() => finish({ eventType: SCANOPS_EVENT_TYPES.GAP_CONFIRMED, title: "Gap Confirmed", helper: "Backroom available gap was recorded without reordering.", status: "confirmed" })} className={BUTTON_SECONDARY}>Confirm Gap</button>
        </>
      );
    }
    if (selectedGapType === GAP_TYPES.TRUE_OUT_OF_STOCK) {
      return (
        <>
          <button onClick={() => finish({ eventType: SCANOPS_EVENT_TYPES.GAP_CONFIRMED, title: "Out of Stock Confirmed", helper: "True out-of-stock was recorded for review and reporting.", status: "confirmed" })} className={BUTTON_PRIMARY}>Confirm Out of Stock</button>
          <button onClick={requestReorder} className={BUTTON_SECONDARY}>Request Reorder</button>
        </>
      );
    }
    if (selectedGapType === GAP_TYPES.SUPPLIER_PENDING) {
      return (
        <>
          <button onClick={() => finish({ eventType: SCANOPS_EVENT_TYPES.SUPPLIER_PENDING_CONFIRMED, title: "Supplier Pending Confirmed", helper: "Incoming stock exists, so duplicate reorder was avoided.", status: "supplier_pending" })} className={BUTTON_PRIMARY}>Confirm Supplier Pending</button>
          <button onClick={() => finish({ eventType: SCANOPS_EVENT_TYPES.GAP_CONFIRMED, title: "Follow-up Task Flagged", helper: "A follow-up check was recorded for the incoming delivery window.", status: "follow_up_required" })} className={BUTTON_SECONDARY}>Create Follow-up Task</button>
        </>
      );
    }
    if (selectedGapType === GAP_TYPES.SHELF_LABEL_PLANOGRAM_ISSUE) {
      return (
        <>
          <button onClick={() => finish({ eventType: SCANOPS_EVENT_TYPES.SHELF_LABEL_ISSUE_FLAGGED, title: "Label Issue Flagged", helper: "Gap was classified as a shelf label or planogram issue, not a stock shortage.", status: "flagged" })} className={BUTTON_PRIMARY}>Flag Label Issue</button>
          <button onClick={() => finish({ eventType: SCANOPS_EVENT_TYPES.SHELF_TICKET_BATCH_SENT_TO_DESKTOP, title: "Shelf Ticket Requested", helper: "A shelf-ticket request was queued for the desktop ticket queue. No fake printed state was recorded.", status: "queued_for_desktop" })} className={BUTTON_SECONDARY}>Request Shelf Ticket</button>
        </>
      );
    }
    return <button onClick={resetScan} className={BUTTON_PRIMARY}>Scan Next Gap</button>;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <PageHeader title="Gap Scan" subtitle="Stage C · Shelf gap classification" />
      <main className="flex-1 px-4 py-5 pb-8 space-y-4 overflow-y-auto overflow-x-hidden">
        {step === STEPS.SCAN && (
          <div className="space-y-4">
            <section className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><PackageSearch className="w-5 h-5" /></div>
                <div>
                  <h2 className="font-bold text-foreground">Scan empty shelf location</h2>
                  <p className="text-sm text-muted-foreground mt-1">Separate real out-of-stock from backroom, supplier, and label issues.</p>
                </div>
              </div>
            </section>
            <ScanPlaceholder onSimulate={() => handleScan()} label="Scan shelf label, item barcode, or SKU" />
            <section className="rounded-2xl border border-border bg-card p-3 min-w-0">
              <button
                type="button"
                onClick={() => setShowTests((value) => !value)}
                className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm font-bold text-secondary-foreground active:scale-[0.98]"
              >
                {showTests ? "Hide test scenarios" : "Show test scenarios"}
              </button>
              {showTests && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {GAP_SCAN_SCENARIOS.map((scenario) => <button key={scenario.id} onClick={() => handleScan(scenario)} className={SOFT_BUTTON}>{scenario.buttonLabel}</button>)}
                </div>
              )}
            </section>
          </div>
        )}

        {step === STEPS.RESULT && item && (
          <div className="space-y-4">
            <ProductCard item={item} />
            <StatusGrid item={item} />
            <section className="scanops-compact-card">
              <TouchSelect
                label="Gap outcome"
                helper="Confirm or correct the shelf outcome before creating the next action."
                value={selectedGapType || ""}
                onChange={setOutcomeId}
                options={GAP_OUTCOME_OPTIONS}
                placeholder="Select gap outcome"
              />
            </section>
            <GapCard classification={classification} gapType={selectedGapType} />
            <DecisionRecommendationCard decision={decision} onReject={rejectRecommendation} onMoreInfo={viewReason} />
            <div className="space-y-3">
              {renderActions()}
              <button onClick={resetScan} className={BUTTON_SECONDARY}>Scan Next Gap</button>
            </div>
          </div>
        )}

        {step === STEPS.DONE && item && doneState && <DonePanel state={doneState} item={item} classification={classification} gapType={selectedGapType} onNext={resetScan} onHome={() => navigate("/")} />}
      </main>
    </div>
  );
}

function ProductCard({ item }) {
  const issue = item.label_issue || item.planogram_status === "MISMATCH";
  return (
    <section className="bg-card rounded-2xl border border-border p-5 min-w-0">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${issue ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>{issue ? <AlertTriangle className="w-5 h-5" /> : <ClipboardCheck className="w-5 h-5" />}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-mono break-all">{item.sku} · {item.barcode}</p>
          <h2 className="text-lg font-bold text-foreground leading-snug mt-1 break-words">{item.name}</h2>
          <p className="text-sm text-muted-foreground mt-2 break-words">{item.aisle} · {item.bay} · {item.shelf}</p>
        </div>
      </div>
    </section>
  );
}

function StatusGrid({ item }) {
  return (
    <section className="grid grid-cols-2 gap-3">
      <Metric label="Shelf" value={item.shelf_stock} />
      <Metric label="Backroom" value={item.backroom_stock} />
      <Metric label="Pending" value={item.pending_delivery_qty} helper={item.pending_delivery_eta} />
      <Metric label="Planogram" value={item.planogram_status === "MISMATCH" ? "Issue" : item.planogram_status} />
    </section>
  );
}

function Metric({ label, value, helper }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 min-w-0">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1 break-words">{value ?? "—"}</p>
      {helper && <p className="text-xs text-muted-foreground mt-1 break-words">ETA {helper}</p>}
    </div>
  );
}

function GapCard({ classification, gapType }) {
  const iconByType = {
    [GAP_TYPES.BACKROOM_AVAILABLE]: PackageCheck,
    [GAP_TYPES.TRUE_OUT_OF_STOCK]: AlertTriangle,
    [GAP_TYPES.SUPPLIER_PENDING]: Truck,
    [GAP_TYPES.SHELF_LABEL_PLANOGRAM_ISSUE]: Printer,
  };
  const Icon = iconByType[gapType] || PackageSearch;
  return (
    <section className="bg-primary/5 rounded-2xl border border-primary/20 p-5 min-w-0">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-primary uppercase tracking-wider">Gap type</p>
          <h3 className="text-base font-bold text-foreground mt-1 break-words">{GAP_TYPE_LABELS[gapType] || classification.title}</h3>
          <p className="text-sm text-muted-foreground mt-1 break-words">{classification.helper}</p>
          <p className="text-xs font-mono text-primary mt-3 break-all">{formatActionLabel(classification.recommended_action)}</p>
        </div>
      </div>
    </section>
  );
}

function DonePanel({ state, item, classification, gapType, onNext, onHome }) {
  const rows = [["Item", item.name], ["Gap type", GAP_TYPE_LABELS[gapType || classification.gap_type] || "—"], ["Status", state.event?.status || "recorded"], ["Event", state.event?.event_type || "—"]];
  return (
    <div className="space-y-5">
      <section className="bg-card rounded-2xl border border-border p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto"><CheckCircle2 className="w-10 h-10 text-accent" /></div>
        <h2 className="text-lg font-bold text-foreground mt-4">{state.title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{state.helper}</p>
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
        <button onClick={onNext} className={BUTTON_PRIMARY}><RotateCw className="w-4 h-4" />Scan Next Gap</button>
        <button onClick={onHome} className={BUTTON_SECONDARY}><Home className="w-4 h-4" />Back to Home</button>
      </div>
    </div>
  );
}
