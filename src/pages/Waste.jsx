import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Home, Minus, Plus, RotateCw, Trash2 } from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import ScanPlaceholder from "../components/scanner/ScanPlaceholder";
import { useToast } from "@/components/ui/use-toast";
import { WASTE_SCAN_ITEM } from "../lib/scanOpsInventoryFixtures";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { getWasteDecision, WASTE_REASONS } from "../lib/scanOpsRules";

const BUTTON_PRIMARY = "w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40";
const BUTTON_SECONDARY = "w-full py-4 rounded-2xl bg-secondary text-secondary-foreground font-bold text-sm active:scale-[0.98] active:bg-border transition-all flex items-center justify-center gap-2";
const REASON_BUTTON = "w-full rounded-2xl px-3 py-4 text-sm font-bold active:scale-[0.98] transition-all text-center leading-snug min-h-[64px]";
const STEPS = { SCAN: "scan", RESULT: "result", DONE: "done" };

export default function Waste() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(STEPS.SCAN);
  const [item, setItem] = useState(null);
  const [reasonId, setReasonId] = useState("expired");
  const [quantity, setQuantity] = useState(1);
  const [doneState, setDoneState] = useState(null);
  const decision = useMemo(() => getWasteDecision(item, reasonId, quantity), [item, reasonId, quantity]);

  const startScan = () => {
    setItem(WASTE_SCAN_ITEM);
    setReasonId("expired");
    setQuantity(1);
    setDoneState(null);
    setStep(STEPS.RESULT);
  };
  const resetScan = () => {
    setItem(null);
    setReasonId("expired");
    setQuantity(1);
    setDoneState(null);
    setStep(STEPS.SCAN);
  };
  const adjustQuantity = (delta) => setQuantity((current) => Math.max(1, Math.min(item?.stock_on_hand || 99, current + delta)));
  const recordWaste = () => {
    if (!item || !decision.reason) return;
    const eventType = decision.approvalRequired ? SCANOPS_EVENT_TYPES.WASTE_APPROVAL_REQUIRED : SCANOPS_EVENT_TYPES.WASTE_RECORDED;
    const event = createScanOpsEvent(eventType, {
      source_module: "Waste",
      sku: item.sku,
      barcode: item.barcode,
      item_name: item.name,
      department: item.department,
      stock_location: item.location,
      waste_reason: decision.reason.label,
      waste_reason_id: decision.reason.id,
      demand_logic_treatment: decision.demandLogic,
      quantity: decision.quantity,
      unit_cost: item.unit_cost,
      estimated_value: decision.estimatedValue,
      approval_required: decision.approvalRequired,
      status: decision.approvalRequired ? "approval_required" : "recorded",
    });
    setDoneState({
      title: decision.approvalRequired ? "Supervisor Review Required" : "Waste Recorded",
      helper: decision.approvalRequired ? "This waste reason, quantity, or value needs supervisor review before final posting." : "Waste was recorded as a scanner event and is ready for inventory posting.",
      event,
    });
    setStep(STEPS.DONE);
    toast({ description: decision.approvalRequired ? "Supervisor review required" : "Waste recorded", duration: 1500 });
  };
  const supervisorReview = () => {
    if (!item || !decision.reason) return;
    const event = createScanOpsEvent(SCANOPS_EVENT_TYPES.WASTE_APPROVAL_REQUIRED, {
      source_module: "Waste",
      sku: item.sku,
      barcode: item.barcode,
      item_name: item.name,
      waste_reason: decision.reason.label,
      waste_reason_id: decision.reason.id,
      demand_logic_treatment: decision.demandLogic,
      quantity: decision.quantity,
      estimated_value: decision.estimatedValue,
      status: "manual_review_requested",
    });
    setDoneState({ title: "Supervisor Review Requested", helper: "A waste approval request was recorded for supervisor/manager review.", event });
    setStep(STEPS.DONE);
    toast({ description: "Review request recorded", duration: 1500 });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <PageHeader title="Waste" subtitle="Stage D · Waste and shrink recording" />
      <main className="flex-1 px-4 py-5 pb-8 space-y-4 overflow-y-auto overflow-x-hidden">
        {step === STEPS.SCAN && (
          <div className="space-y-4">
            <section className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0"><Trash2 className="w-5 h-5" /></div>
                <div className="min-w-0"><h2 className="font-bold text-foreground">Scan item to record waste</h2><p className="text-sm text-muted-foreground mt-1 break-words">Record quantity and reason using large buttons only. High-risk waste routes to supervisor review.</p></div>
              </div>
            </section>
            <ScanPlaceholder onSimulate={startScan} label="Scan product barcode or shelf label" />
          </div>
        )}
        {step === STEPS.RESULT && item && (
          <div className="space-y-4">
            <ItemSummary item={item} decision={decision} />
            <QuantityControl quantity={quantity} onMinus={() => adjustQuantity(-1)} onPlus={() => adjustQuantity(1)} />
            <ReasonButtons selected={reasonId} onSelect={setReasonId} />
            <DecisionPanel item={item} decision={decision} />
            <div className="space-y-3">
              <button onClick={recordWaste} className={BUTTON_PRIMARY}><Trash2 className="w-4 h-4" />Record Waste</button>
              <button onClick={supervisorReview} className={BUTTON_SECONDARY}><AlertTriangle className="w-4 h-4" />Supervisor Review</button>
              <button onClick={resetScan} className={BUTTON_SECONDARY}><RotateCw className="w-4 h-4" />Scan Next</button>
            </div>
          </div>
        )}
        {step === STEPS.DONE && item && doneState && <DonePanel state={doneState} item={item} decision={decision} onNext={resetScan} onHome={() => navigate("/")} />}
      </main>
    </div>
  );
}

function ItemSummary({ item, decision }) {
  return (
    <section className="bg-card rounded-2xl border border-border p-5 min-w-0">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0"><Trash2 className="w-5 h-5" /></div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-mono break-all">{item.sku} · {item.barcode}</p>
          <h2 className="text-lg font-bold text-foreground leading-snug mt-1 break-words">{item.name}</h2>
          <p className="text-sm text-muted-foreground mt-2 break-words">{item.location} · {item.aisle} · {item.bay}</p>
          <div className="mt-4 grid grid-cols-2 gap-3"><Metric label="Stock" value={item.stock_on_hand} /><Metric label="Expiry" value={item.expiry_status} small /><Metric label="Unit cost" value={`${item.currency}${item.unit_cost}`} /><Metric label="Risk" value={decision.approvalRequired ? "Review" : "Normal"} /></div>
        </div>
      </div>
    </section>
  );
}

function QuantityControl({ quantity, onMinus, onPlus }) {
  return <section className="bg-card rounded-2xl border border-border p-4 min-w-0"><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Qty to waste</p><div className="flex items-center justify-between gap-4 mt-3"><button onClick={onMinus} className="w-16 h-16 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center active:scale-[0.98] active:bg-border"><Minus className="w-6 h-6" /></button><div className="flex-1 min-w-0 text-center rounded-2xl bg-primary/5 border border-primary/20 py-4"><p className="text-3xl font-black text-foreground">{quantity}</p></div><button onClick={onPlus} className="w-16 h-16 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center active:scale-[0.98] active:bg-border"><Plus className="w-6 h-6" /></button></div></section>;
}

function ReasonButtons({ selected, onSelect }) {
  return <section className="bg-card rounded-2xl border border-border p-4 space-y-3 min-w-0"><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Waste reason</p><div className="grid grid-cols-2 gap-2">{WASTE_REASONS.map((reason) => <button key={reason.id} onClick={() => onSelect(reason.id)} className={`${REASON_BUTTON} ${selected === reason.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground active:bg-border"}`}>{reason.label}</button>)}</div></section>;
}

function DecisionPanel({ item, decision }) {
  return <section className={`${decision.approvalRequired ? "bg-destructive/5 border-destructive/20" : "bg-primary/5 border-primary/20"} rounded-2xl border p-5 min-w-0`}><p className={`text-xs font-bold uppercase tracking-wider ${decision.approvalRequired ? "text-destructive" : "text-primary"}`}>Waste decision</p><div className="flex items-start justify-between gap-4 mt-2"><div className="min-w-0"><p className="text-lg font-bold text-foreground break-words">{decision.reason?.label || "Select reason"}</p><p className="text-sm text-muted-foreground mt-1 break-words">Demand logic: {decision.demandLogic.replaceAll("_", " ")}</p></div><div className="text-right shrink-0"><p className="text-base font-black text-foreground">{item.currency}{decision.estimatedValue}</p><p className="text-xs text-muted-foreground">estimated</p></div></div>{decision.approvalRequired && <p className="text-xs font-semibold text-destructive mt-4">Approval required due to risk, quantity, or value.</p>}</section>;
}

function Metric({ label, value, small = false }) {
  return <div className="rounded-2xl bg-secondary/60 px-3 py-3 min-w-0"><p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p><p className={`${small ? "text-sm" : "text-base"} font-bold text-foreground mt-1 break-words`}>{value ?? "—"}</p></div>;
}

function DonePanel({ state, item, decision, onNext, onHome }) {
  const rows = [["Item", item.name], ["Reason", decision.reason?.label || "—"], ["Quantity", decision.quantity], ["Event", state.event?.event_type || "—"], ["Status", state.event?.status || "recorded"]];
  return <div className="space-y-5"><section className="bg-card rounded-2xl border border-border p-6 text-center"><div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto"><CheckCircle2 className="w-10 h-10 text-accent" /></div><h2 className="text-lg font-bold text-foreground mt-4">{state.title}</h2><p className="text-sm text-muted-foreground mt-1">{state.helper}</p></section><section className="bg-card rounded-2xl border border-border divide-y divide-border">{rows.map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4 px-5 py-3.5"><span className="text-sm text-muted-foreground shrink-0">{label}</span><span className="text-sm font-semibold text-foreground text-right break-words min-w-0">{value}</span></div>)}</section><div className="space-y-3"><button onClick={onNext} className={BUTTON_PRIMARY}><RotateCw className="w-4 h-4" />Scan Next</button><button onClick={onHome} className={BUTTON_SECONDARY}><Home className="w-4 h-4" />Back to Home</button></div></div>;
}
