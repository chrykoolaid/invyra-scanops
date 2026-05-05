import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CalendarClock, CheckCircle2, Home, RotateCw, Sparkles, Tags, Trash2 } from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import ScanPlaceholder from "../components/scanner/ScanPlaceholder";
import { useToast } from "@/components/ui/use-toast";
import { EXPIRY_CHECK_SCAN_ITEM, EXPIRY_CHECK_SCENARIOS } from "../lib/scanOpsInventoryFixtures";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { FRESHNESS_CONDITIONS, getExpiryStatus, getFreshnessRecommendation } from "../lib/scanOpsRules";

const BUTTON_PRIMARY = "w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40";
const BUTTON_SECONDARY = "w-full py-4 rounded-2xl bg-secondary text-secondary-foreground font-bold text-sm active:scale-[0.98] active:bg-border transition-all flex items-center justify-center gap-2";
const SOFT_BUTTON = "w-full rounded-2xl bg-secondary text-secondary-foreground px-4 py-4 text-sm font-bold active:scale-[0.98] active:bg-border transition-all text-center break-words";
const CONDITION_BUTTON = "w-full rounded-2xl px-3 py-4 text-sm font-bold active:scale-[0.98] transition-all text-center leading-snug min-h-[64px]";
const STEPS = { SCAN: "scan", RESULT: "result", DONE: "done" };
const TODAY = "2026-05-05";

export default function ExpiryCheck() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(STEPS.SCAN);
  const [item, setItem] = useState(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [freshnessId, setFreshnessId] = useState("good");
  const [doneState, setDoneState] = useState(null);

  const expiryStatus = useMemo(() => getExpiryStatus(expiryDate, TODAY), [expiryDate]);
  const recommendation = useMemo(() => getFreshnessRecommendation(item, expiryStatus, freshnessId), [item, expiryStatus, freshnessId]);

  const startScan = (scenario = EXPIRY_CHECK_SCAN_ITEM) => {
    setItem(scenario);
    setExpiryDate(scenario.expiry_date || "");
    setFreshnessId(scenario.freshness_default || "good");
    setDoneState(null);
    setStep(STEPS.RESULT);
  };

  const resetScan = () => {
    setItem(null);
    setExpiryDate("");
    setFreshnessId("good");
    setDoneState(null);
    setStep(STEPS.SCAN);
  };

  const basePayload = () => ({
    source_module: "Expiry Check",
    sku: item?.sku,
    barcode: item?.barcode,
    item_name: item?.name,
    department: item?.department,
    category: item?.category,
    stock_location: item?.location,
    aisle: item?.aisle,
    bay: item?.bay,
    shelf: item?.shelf,
    stock_on_hand: item?.stock_on_hand,
    shelf_stock: item?.shelf_stock,
    backroom_stock: item?.backroom_stock,
    original_expiry_date: item?.expiry_date || null,
    expiry_date: expiryDate || null,
    expiry_status: expiryStatus.label,
    expiry_status_id: expiryStatus.status,
    days_until_expiry: expiryStatus.daysUntilExpiry,
    freshness_condition: recommendation.condition.label,
    freshness_condition_id: recommendation.condition.id,
    freshness_result: recommendation.result,
    recommended_action: recommendation.recommendedAction,
    action_id: recommendation.actionId,
    approval_required: recommendation.approvalRequired,
    demand_logic_treatment: recommendation.demandLogicTreatment,
  });

  const recordCheck = () => {
    if (!item) return;
    const events = [];
    if ((item.expiry_date || "") !== (expiryDate || "")) {
      events.push(createScanOpsEvent(SCANOPS_EVENT_TYPES.EXPIRY_DATE_UPDATED, {
        ...basePayload(),
        previous_expiry_date: item.expiry_date || null,
        new_expiry_date: expiryDate || null,
        status: "updated",
      }));
    }
    events.push(createScanOpsEvent(SCANOPS_EVENT_TYPES.EXPIRY_CHECK_RECORDED, {
      ...basePayload(),
      status: recommendation.approvalRequired ? "recorded_review_required" : "recorded",
    }));
    events.push(createScanOpsEvent(SCANOPS_EVENT_TYPES.FRESHNESS_CHECK_RECORDED, {
      ...basePayload(),
      status: recommendation.approvalRequired ? "recorded_review_required" : "recorded",
    }));
    setDoneState({
      title: recommendation.approvalRequired ? "Check Recorded · Review Required" : "Expiry Check Recorded",
      helper: recommendation.helper,
      primaryEvent: events[events.length - 2],
      events,
    });
    setStep(STEPS.DONE);
    toast({ description: recommendation.approvalRequired ? "Check recorded, review required" : "Expiry check recorded", duration: 1500 });
  };

  const recommendAction = () => {
    if (!item) return;
    const type = SCANOPS_EVENT_TYPES[recommendation.eventType] || SCANOPS_EVENT_TYPES.FRESHNESS_CHECK_RECORDED;
    const event = createScanOpsEvent(type, {
      ...basePayload(),
      status: recommendation.approvalRequired ? "review_required" : "recommended",
    });
    setDoneState({
      title: recommendation.recommendedAction,
      helper: recommendation.helper,
      primaryEvent: event,
      events: [event],
    });
    setStep(STEPS.DONE);
    toast({ description: `${recommendation.recommendedAction} recorded`, duration: 1500 });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <PageHeader title="Expiry Check" subtitle="Stage E · Expiry and freshness capture" />
      <main className="flex-1 px-4 py-5 pb-8 space-y-4 overflow-y-auto overflow-x-hidden">
        {step === STEPS.SCAN && (
          <div className="space-y-4">
            <section className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><CalendarClock className="w-5 h-5" /></div>
                <div className="min-w-0">
                  <h2 className="font-bold text-foreground">Scan item to check date/freshness</h2>
                  <p className="text-sm text-muted-foreground mt-1 break-words">Capture expiry truth, record freshness condition, and recommend markdown, waste, or supervisor review.</p>
                </div>
              </div>
            </section>
            <ScanPlaceholder onSimulate={() => startScan(EXPIRY_CHECK_SCAN_ITEM)} label="Scan product barcode or shelf label" />
            <section className="bg-card rounded-2xl border border-border p-4 space-y-3 min-w-0">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Test scenarios</p>
              <div className="grid grid-cols-1 gap-2">
                {EXPIRY_CHECK_SCENARIOS.map((scenario) => (
                  <button key={scenario.id} onClick={() => startScan(scenario)} className={SOFT_BUTTON}>{scenario.buttonLabel}</button>
                ))}
              </div>
            </section>
          </div>
        )}

        {step === STEPS.RESULT && item && (
          <div className="space-y-4">
            <ItemSummary item={item} expiryStatus={expiryStatus} recommendation={recommendation} />
            <ExpiryDatePanel expiryDate={expiryDate} onChange={setExpiryDate} expiryStatus={expiryStatus} recommendation={recommendation} />
            <FreshnessButtons selected={freshnessId} onSelect={setFreshnessId} />
            <RecommendationPanel recommendation={recommendation} />
            <div className="space-y-3">
              <button onClick={recordCheck} className={BUTTON_PRIMARY}><CheckCircle2 className="w-4 h-4" />Record Check</button>
              <button onClick={recommendAction} className={BUTTON_SECONDARY}><RecommendationIcon actionId={recommendation.actionId} />{recommendation.recommendedAction}</button>
              <button onClick={resetScan} className={BUTTON_SECONDARY}><RotateCw className="w-4 h-4" />Scan Next</button>
            </div>
          </div>
        )}

        {step === STEPS.DONE && item && doneState && (
          <DonePanel state={doneState} item={item} expiryStatus={expiryStatus} recommendation={recommendation} onNext={resetScan} onHome={() => navigate("/")} />
        )}
      </main>
    </div>
  );
}

function ItemSummary({ item, expiryStatus, recommendation }) {
  return (
    <section className="bg-card rounded-2xl border border-border p-5 min-w-0">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><CalendarClock className="w-5 h-5" /></div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-mono break-all">{item.sku} · {item.barcode}</p>
          <h2 className="text-lg font-bold text-foreground leading-snug mt-1 break-words">{item.name}</h2>
          <p className="text-sm text-muted-foreground mt-2 break-words">{item.location} · {item.category} · {item.department}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Metric label="Status" value={expiryStatus.label} small />
            <Metric label="Result" value={recommendation.result} small />
            <Metric label="Stock" value={item.stock_on_hand} />
            <Metric label="Action" value={recommendation.recommendedAction} small />
          </div>
        </div>
      </div>
    </section>
  );
}

function ExpiryDatePanel({ expiryDate, onChange, expiryStatus, recommendation }) {
  return (
    <section className="bg-card rounded-2xl border border-border p-4 space-y-3 min-w-0">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Expiry date</p>
      <input
        type="date"
        value={expiryDate}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-border bg-background px-4 py-4 text-base font-bold text-foreground"
      />
      <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 min-w-0">
        <p className="text-xs font-bold text-primary uppercase tracking-wider">Recommended</p>
        <p className="text-lg font-black text-foreground mt-1 break-words">{recommendation.recommendedAction}</p>
        <p className="text-sm text-muted-foreground mt-1 break-words">{expiryStatus.label} · {recommendation.result}</p>
      </div>
    </section>
  );
}

function FreshnessButtons({ selected, onSelect }) {
  return (
    <section className="bg-card rounded-2xl border border-border p-4 space-y-3 min-w-0">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Freshness condition</p>
      <div className="grid grid-cols-2 gap-2">
        {FRESHNESS_CONDITIONS.map((condition) => (
          <button key={condition.id} onClick={() => onSelect(condition.id)} className={`${CONDITION_BUTTON} ${selected === condition.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground active:bg-border"}`}>{condition.label}</button>
        ))}
      </div>
    </section>
  );
}

function RecommendationPanel({ recommendation }) {
  const review = recommendation.approvalRequired;
  return (
    <section className={`${review ? "bg-destructive/5 border-destructive/20" : "bg-primary/5 border-primary/20"} rounded-2xl border p-5 min-w-0`}>
      <div className="flex items-start gap-3">
        <div className={`${review ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}><RecommendationIcon actionId={recommendation.actionId} /></div>
        <div className="min-w-0">
          <p className={`text-xs font-bold uppercase tracking-wider ${review ? "text-destructive" : "text-primary"}`}>Freshness result</p>
          <h3 className="text-lg font-black text-foreground mt-1 break-words">{recommendation.result}</h3>
          <p className="text-sm text-muted-foreground mt-1 break-words">{recommendation.helper}</p>
        </div>
      </div>
    </section>
  );
}

function RecommendationIcon({ actionId }) {
  if (actionId === "apply_markdown") return <Tags className="w-4 h-4" />;
  if (actionId === "send_to_waste") return <Trash2 className="w-4 h-4" />;
  if (actionId === "flag_for_supervisor") return <AlertTriangle className="w-4 h-4" />;
  return <Sparkles className="w-4 h-4" />;
}

function Metric({ label, value, small = false }) {
  return <div className="rounded-2xl bg-secondary/60 px-3 py-3 min-w-0"><p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p><p className={`${small ? "text-sm" : "text-base"} font-bold text-foreground mt-1 break-words`}>{value ?? "—"}</p></div>;
}

function DonePanel({ state, item, expiryStatus, recommendation, onNext, onHome }) {
  const rows = [
    ["Item", item.name],
    ["Expiry", expiryStatus.label],
    ["Freshness", recommendation.condition.label],
    ["Result", recommendation.result],
    ["Primary event", state.primaryEvent?.event_type || "—"],
    ["Events written", state.events?.length || 0],
    ["Status", state.primaryEvent?.status || "recorded"],
  ];
  return (
    <div className="space-y-5">
      <section className="bg-card rounded-2xl border border-border p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto"><CheckCircle2 className="w-10 h-10 text-accent" /></div>
        <h2 className="text-lg font-bold text-foreground mt-4">{state.title}</h2>
        <p className="text-sm text-muted-foreground mt-1 break-words">{state.helper}</p>
      </section>
      <section className="bg-card rounded-2xl border border-border divide-y divide-border min-w-0">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 px-5 py-3.5 min-w-0">
            <span className="text-sm text-muted-foreground shrink-0">{label}</span>
            <span className="text-sm font-semibold text-foreground text-right break-words min-w-0">{value}</span>
          </div>
        ))}
      </section>
      <div className="space-y-3">
        <button onClick={onNext} className={BUTTON_PRIMARY}><RotateCw className="w-4 h-4" />Scan Next</button>
        <button onClick={onHome} className={BUTTON_SECONDARY}><Home className="w-4 h-4" />Back to Home</button>
      </div>
    </div>
  );
}
