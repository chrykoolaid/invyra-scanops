import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Home, Printer, RotateCw, Tags } from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import ScanPlaceholder from "../components/scanner/ScanPlaceholder";
import DecisionRecommendationCard from "../components/scanner/DecisionRecommendationCard";
import { useToast } from "@/components/ui/use-toast";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { buildDecisionLinkedPayload, createDecisionRecommendation, recordDecisionEvent } from "../lib/scanOpsDecisionEngine";
import { getMarkdownRecommendation, MARKDOWN_REASONS } from "../lib/scanOpsRules";

const BUTTON_PRIMARY = "w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40";
const BUTTON_SECONDARY = "w-full py-4 rounded-2xl bg-secondary text-secondary-foreground font-bold text-sm active:scale-[0.98] active:bg-border transition-all flex items-center justify-center gap-2";
const REASON_BUTTON = "w-full rounded-2xl px-3 py-4 text-sm font-bold active:scale-[0.98] transition-all text-center leading-snug min-h-[64px]";
const STEPS = { SCAN: "scan", RESULT: "result", DONE: "done" };

export default function Markdowns() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(STEPS.SCAN);
  const [item, setItem] = useState(null);
  const [reasonId, setReasonId] = useState("near_expiry");
  const [doneState, setDoneState] = useState(null);
  const [lastMarkdownEvent, setLastMarkdownEvent] = useState(null);
  const recommendation = useMemo(() => getMarkdownRecommendation(item, reasonId), [item, reasonId]);
  const decision = useMemo(() => createDecisionRecommendation({ workflow: "markdown", item, context: { reasonId } }), [item, reasonId]);

  const startScan = () => {
    const scanned = resolveInventoryIdentity("930000000004");
    const scanDecision = createDecisionRecommendation({ workflow: "markdown", item: scanned, context: { reasonId: "near_expiry" } });
    recordDecisionEvent(scanDecision, "generated", { source_module: "Markdowns", status: "generated" });
    setItem(scanned);
    setReasonId("near_expiry");
    setDoneState(null);
    setLastMarkdownEvent(null);
    setStep(STEPS.RESULT);
  };
  const resetScan = () => {
    setItem(null);
    setReasonId("near_expiry");
    setDoneState(null);
    setLastMarkdownEvent(null);
    setStep(STEPS.SCAN);
  };
  const applyMarkdown = () => {
    if (!item) return;
    const decisionEvent = recordDecisionEvent(decision, "accepted", { source_module: "Markdowns", status: "accepted" });
    const event = createScanOpsEvent(SCANOPS_EVENT_TYPES.MARKDOWN_APPLIED, {
      source_module: "Markdowns",
      sku: item.sku,
      barcode: item.barcode,
      item_name: item.name,
      department: item.department,
      stock_location: item.shelfLocation || item.location,
      expiry_status: item.freshnessStatus || item.expiry_status,
      current_price: item.currentPrice ?? item.currentPrice ?? item.current_price,
      markdown_reason: recommendation.reason.label,
      markdown_reason_id: recommendation.reason.id,
      suggested_discount_percent: recommendation.discountPercent,
      new_markdown_price: recommendation.newPrice,
      label_required: recommendation.labelRequired,
      approval_required: recommendation.approvalRequired,
      status: recommendation.approvalRequired ? "approval_required" : "applied",
      ...buildDecisionLinkedPayload(decision, decisionEvent),
    });
    setLastMarkdownEvent(event);
    setDoneState({
      title: recommendation.approvalRequired ? "Markdown Sent for Review" : "Markdown Applied",
      helper: recommendation.approvalRequired ? "This markdown reason is outside normal staff range and needs supervisor approval." : "The markdown was recorded and is ready for shelf-ticket handling.",
      event,
    });
    setStep(STEPS.DONE);
    toast({ description: recommendation.approvalRequired ? "Markdown review required" : "Markdown applied", duration: 1500 });
  };
  const requestShelfTicket = () => {
    if (!item) return;
    const decisionEvent = recordDecisionEvent(decision, "accepted", { source_module: "Markdowns", status: "shelf_ticket_request_accepted" });
    const event = createScanOpsEvent(SCANOPS_EVENT_TYPES.SHELF_TICKET_BATCH_SENT_TO_DESKTOP, {
      source_module: "Markdowns",
      sku: item.sku,
      barcode: item.barcode,
      item_name: item.name,
      linked_markdown_event_id: lastMarkdownEvent?.event_id || null,
      ticket_type: "CLEARANCE_TICKET",
      ticket_reason: "CLEARANCE",
      current_price: item.currentPrice ?? item.currentPrice ?? item.current_price,
      markdown_price: recommendation.newPrice,
      discount_percent: recommendation.discountPercent,
      status: "requested",
      ...buildDecisionLinkedPayload(decision, decisionEvent),
    });
    setDoneState({ title: "Shelf Ticket Requested", helper: "A markdown shelf-ticket request was queued for desktop preview/printing. No fake printed state was recorded.", event });
    setStep(STEPS.DONE);
    toast({ description: "Shelf ticket request queued", duration: 1500 });
  };

  const rejectRecommendation = () => {
    if (!item) return;
    const event = recordDecisionEvent(decision, "rejected", { source_module: "Markdowns", status: "rejected", rejection_reason: "Operator rejected markdown recommendation" });
    setDoneState({ title: "Markdown Recommendation Rejected", helper: "No markdown or stock change was applied. The rejection was queued as a decision event.", event });
    setStep(STEPS.DONE);
    toast({ description: "Recommendation rejected", duration: 1500 });
  };

  const viewReason = () => {
    recordDecisionEvent(decision, "reason_viewed", { source_module: "Markdowns", status: "reason_viewed" });
    toast({ description: decision.reasonText, duration: 2500 });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <PageHeader title="Markdowns" subtitle="Stage D · Price reduction workflow" />
      <main className="flex-1 px-4 py-5 pb-8 space-y-4 overflow-y-auto overflow-x-hidden">
        {step === STEPS.SCAN && (
          <div className="space-y-4">
            <section className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Tags className="w-5 h-5" /></div>
                <div className="min-w-0">
                  <h2 className="font-bold text-foreground">Scan item to apply markdown</h2>
                  <p className="text-sm text-muted-foreground mt-1 break-words">Use large reason buttons, confirm suggested discount, then request a markdown shelf ticket.</p>
                </div>
              </div>
            </section>
            <ScanPlaceholder onSimulate={startScan} label="Scan item barcode or shelf label" />
          </div>
        )}
        {step === STEPS.RESULT && item && (
          <div className="space-y-4">
            <ItemSummary item={item} recommendation={recommendation} />
            <ReasonButtons selected={reasonId} onSelect={setReasonId} />
            <DecisionRecommendationCard decision={decision} onReject={rejectRecommendation} onMoreInfo={viewReason} />
            <PricePanel item={item} recommendation={recommendation} />
            <div className="space-y-3">
              <button onClick={applyMarkdown} className={BUTTON_PRIMARY}><Tags className="w-4 h-4" />Apply Markdown</button>
              <button onClick={requestShelfTicket} className={BUTTON_SECONDARY}><Printer className="w-4 h-4" />Request Shelf Ticket</button>
              <button onClick={resetScan} className={BUTTON_SECONDARY}><RotateCw className="w-4 h-4" />Scan Next</button>
            </div>
          </div>
        )}
        {step === STEPS.DONE && item && doneState && <DonePanel state={doneState} item={item} recommendation={recommendation} onNext={resetScan} onHome={() => navigate("/")} />}
      </main>
    </div>
  );
}

function ItemSummary({ item, recommendation }) {
  return (
    <section className="bg-card rounded-2xl border border-border p-5 min-w-0">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Tags className="w-5 h-5" /></div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-mono break-all">{item.sku} · {item.barcode}</p>
          <h2 className="text-lg font-bold text-foreground leading-snug mt-1 break-words">{item.name}</h2>
          <p className="text-sm text-muted-foreground mt-2 break-words">{item.shelfLocation || item.location} · {item.aisle} · {item.bay}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Metric label="Current" value={`${item.currency}${item.currentPrice ?? item.currentPrice ?? item.current_price}`} />
            <Metric label="Suggested" value={`${recommendation.discountPercent}% off`} />
            <Metric label="Expiry" value={item.freshnessStatus || item.expiry_status} small />
            <Metric label="Shelf stock" value={item.shelfStock ?? item.shelf_stock} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ReasonButtons({ selected, onSelect }) {
  return (
    <section className="bg-card rounded-2xl border border-border p-4 space-y-3 min-w-0">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Markdown reason</p>
      <div className="grid grid-cols-2 gap-2">
        {MARKDOWN_REASONS.map((reason) => <button key={reason.id} onClick={() => onSelect(reason.id)} className={`${REASON_BUTTON} ${selected === reason.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground active:bg-border"}`}>{reason.label}</button>)}
      </div>
    </section>
  );
}

function PricePanel({ item, recommendation }) {
  return (
    <section className="bg-primary/5 rounded-2xl border border-primary/20 p-5 min-w-0">
      <p className="text-xs font-bold text-primary uppercase tracking-wider">New markdown price</p>
      <div className="flex items-end justify-between gap-4 mt-2">
        <div><p className="text-3xl font-black text-foreground">{item.currency}{recommendation.newPrice}</p><p className="text-sm text-muted-foreground mt-1">Was {item.currency}{item.currentPrice ?? item.current_price}</p></div>
        <div className="text-right min-w-0"><p className="text-sm font-bold text-foreground">{recommendation.discountPercent}%</p><p className="text-xs text-muted-foreground">suggested discount</p></div>
      </div>
      {recommendation.approvalRequired && <p className="text-xs font-semibold text-destructive mt-4">Supervisor approval required for this reason.</p>}
    </section>
  );
}

function Metric({ label, value, small = false }) {
  return <div className="rounded-2xl bg-secondary/60 px-3 py-3 min-w-0"><p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p><p className={`${small ? "text-sm" : "text-base"} font-bold text-foreground mt-1 break-words`}>{value ?? "—"}</p></div>;
}

function DonePanel({ state, item, recommendation, onNext, onHome }) {
  const rows = [["Item", item.name], ["Reason", recommendation.reason.label], ["New price", `${item.currency}${recommendation.newPrice}`], ["Event", state.event?.event_type || "—"], ["Status", state.event?.status || "recorded"]];
  return (
    <div className="space-y-5">
      <section className="bg-card rounded-2xl border border-border p-6 text-center"><div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto"><CheckCircle2 className="w-10 h-10 text-accent" /></div><h2 className="text-lg font-bold text-foreground mt-4">{state.title}</h2><p className="text-sm text-muted-foreground mt-1">{state.helper}</p></section>
      <section className="bg-card rounded-2xl border border-border divide-y divide-border">{rows.map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4 px-5 py-3.5"><span className="text-sm text-muted-foreground shrink-0">{label}</span><span className="text-sm font-semibold text-foreground text-right break-words min-w-0">{value}</span></div>)}</section>
      <div className="space-y-3"><button onClick={onNext} className={BUTTON_PRIMARY}><RotateCw className="w-4 h-4" />Scan Next</button><button onClick={onHome} className={BUTTON_SECONDARY}><Home className="w-4 h-4" />Back to Home</button></div>
    </div>
  );
}
