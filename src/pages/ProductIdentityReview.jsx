import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, GitPullRequest, Link2, PauseCircle, SearchCheck, ShieldCheck, XCircle } from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { canReviewProductIdentity, productIdentityReviewScopeLabel } from "../lib/scanOpsPermissions";
import {
  getIdentityReviewEvents,
  getProductIdentityReviewQueues,
  getProductIdentityReviewSummary,
  reviewProductIdentityEvidence,
} from "../lib/scanOpsProductIdentityReview";
import { useScanOpsSession } from "../lib/scanOpsSession";

const TAB_BUTTON = "rounded-2xl px-3 py-3 text-xs font-black border transition-all active:scale-[0.98]";
const MINI_BUTTON = "min-h-11 rounded-xl px-3 py-2.5 text-xs font-black active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:active:scale-100";

function formatTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return value;
  }
}

function statusTone(status) {
  if (status === "linked_to_existing_product") return "bg-emerald-500/10 border-emerald-500/20 text-emerald-700";
  if (status === "rejected") return "bg-slate-500/10 border-slate-500/20 text-slate-700";
  if (status === "escalated" || status === "conflict") return "bg-destructive/10 border-destructive/20 text-destructive";
  if (status === "deferred") return "bg-amber-500/10 border-amber-500/20 text-amber-700";
  return "bg-primary/10 border-primary/20 text-primary";
}

function label(value) {
  return String(value || "needs_review").replaceAll("_", " ");
}

function StatCard({ label: statLabel, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 min-w-0">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground truncate">{statLabel}</p>
          <p className="mt-1 text-xl font-black text-foreground">{value}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function EvidenceMeta({ item }) {
  const rows = [
    ["Submitted from", item.sourceWorkflow || item.sourceModule || "ScanOps"],
    ["Submitted by", `${item.createdBy || "Scanner operator"} · ${item.createdRole || "Staff"}`],
    ["Time", formatTime(item.createdAt)],
    ["Safeguards", "No product, stock, or price mutation"],
  ];
  return (
    <div className="rounded-2xl border border-border bg-background/70 divide-y divide-border min-w-0">
      {rows.map(([rowLabel, value]) => (
        <div key={rowLabel} className="flex items-start justify-between gap-3 px-3 py-2.5 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground shrink-0">{rowLabel}</p>
          <p className="text-xs font-semibold text-foreground text-right break-words min-w-0">{value}</p>
        </div>
      ))}
    </div>
  );
}

function CandidateCard({ candidate, onLink, disabled, canReview }) {
  return (
    <article className="rounded-2xl border border-border bg-background p-3 min-w-0">
      <div className="min-w-0">
        <p className="text-sm font-black text-foreground break-words">{candidate.name}</p>
        <p className="mt-1 text-xs text-muted-foreground break-words">{candidate.identity || candidate.sku || "Identity pending"}</p>
        <p className="mt-1 text-[11px] font-semibold text-muted-foreground break-words">{candidate.reason}</p>
      </div>
      <button type="button" disabled={disabled} onClick={() => onLink(candidate)} className={`${MINI_BUTTON} mt-3 w-full bg-primary text-primary-foreground`}>
        <Link2 className="h-3.5 w-3.5" />{canReview ? "Link as Alias" : "Approval Required"}
      </button>
    </article>
  );
}

function EvidenceCard({ item, canReview, onAction }) {
  const blocked = !item.evidenceId;
  const candidates = item.candidates || [];
  return (
    <article className="rounded-3xl border border-border bg-card p-4 min-w-0 space-y-4">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${statusTone(item.status)}`}>{label(item.status)}</span>
          <h3 className="mt-3 text-base font-black text-foreground break-words">Unknown code: {item.enteredCode || "—"}</h3>
          <p className="mt-1 text-sm text-muted-foreground break-words">{item.conflictReason || item.note || "Review the evidence and decide whether it should be linked, rejected, escalated, or deferred."}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {item.queueType === "plu_issue" ? <SearchCheck className="h-5 w-5" /> : item.queueType === "alias_review" ? <GitPullRequest className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
        </div>
      </div>

      <EvidenceMeta item={item} />

      <section className="min-w-0">
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Possible matches</p>
        <div className="mt-2 grid grid-cols-1 gap-2">
          {candidates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No safe candidate found yet. Escalate for catalogue review.</div>
          ) : (
            candidates.map((candidate) => (
              <CandidateCard key={`${item.reviewId || item.conflictId}-${candidate.productId || candidate.name}`} candidate={candidate} disabled={blocked} canReview={canReview} onLink={(picked) => onAction(item, "link_alias", picked)} />
            ))
          )}
        </div>
      </section>

      {!canReview && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-semibold text-amber-800">
          Staff can submit evidence only. Supervisor, Manager, or Admin review is required before linking, rejecting, or escalating identity evidence.
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <button type="button" disabled={blocked} onClick={() => onAction(item, "reject", null)} className={`${MINI_BUTTON} bg-secondary text-secondary-foreground`}>
          <XCircle className="h-3.5 w-3.5" />Reject
        </button>
        <button type="button" disabled={blocked} onClick={() => onAction(item, "escalate", null)} className={`${MINI_BUTTON} bg-destructive/10 text-destructive`}>
          <AlertTriangle className="h-3.5 w-3.5" />Escalate
        </button>
        <button type="button" disabled={blocked} onClick={() => onAction(item, "defer", null)} className={`${MINI_BUTTON} bg-amber-500/10 text-amber-800`}>
          <PauseCircle className="h-3.5 w-3.5" />Defer
        </button>
      </div>
    </article>
  );
}

function ReviewEventCard({ event }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-3 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-foreground break-words">{event.actionLabel || label(event.action)}</p>
          <p className="mt-1 text-xs text-muted-foreground break-words">{event.enteredCode} {event.targetName ? `→ ${event.targetName}` : ""}</p>
          <p className="mt-1 text-[11px] text-muted-foreground truncate">{event.actorName} · {event.actorRole} · {formatTime(event.createdAt)}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase ${statusTone(event.status)}`}>{label(event.status)}</span>
      </div>
    </article>
  );
}

export default function ProductIdentityReview() {
  const session = useScanOpsSession();
  const [activeTab, setActiveTab] = useState("needsReview");
  const [queues, setQueues] = useState(() => getProductIdentityReviewQueues());
  const [lastAction, setLastAction] = useState(null);
  const canReview = canReviewProductIdentity(session);
  const summary = useMemo(() => getProductIdentityReviewSummary(), [queues, lastAction]);

  const refresh = () => setQueues(getProductIdentityReviewQueues());

  useEffect(() => {
    createScanOpsEvent(SCANOPS_EVENT_TYPES.PRODUCT_IDENTITY_REVIEW_VIEWED, {
      source_module: "Product Identity Review",
      status: "viewed",
      review_scope: productIdentityReviewScopeLabel(session),
      can_review: canReview,
      stock_mutation: false,
      price_mutation: false,
      creates_product: false,
    });
  }, [canReview, session.actorRole]);

  const handleAction = (item, action, candidate) => {
    if (!canReview) {
      const event = createScanOpsEvent(SCANOPS_EVENT_TYPES.PRODUCT_IDENTITY_PERMISSION_BLOCKED, {
        source_module: "Product Identity Review",
        status: "blocked",
        attempted_action: action,
        unknown_item_evidence_id: item.evidenceId,
        blocked_reason: "Staff can submit evidence only. Supervisor, Manager, or Admin approval is required.",
        stock_mutation: false,
        price_mutation: false,
        creates_product: false,
      });
      setLastAction(`Review blocked · ${event.traceId || event.trace_id}`);
      return;
    }

    const result = reviewProductIdentityEvidence({
      evidenceId: item.evidenceId,
      action,
      candidate,
      note: action === "link_alias" ? "Linked as alias review proof only. Inventory catalogue remains unchanged until desktop approval sync." : "Reviewed from Product Identity Review workspace.",
    });

    if (result?.scanEvent) {
      setLastAction(`${String(action).replaceAll("_", " ")} recorded · ${result.scanEvent.traceId || result.scanEvent.trace_id}`);
    }
    refresh();
  };

  const activeItems = queues[activeTab] || [];
  const reviewEvents = getIdentityReviewEvents();

  const tabs = [
    ["needsReview", "Needs Review", summary.needsReview],
    ["aliasConflicts", "Alias Conflicts", summary.aliasConflicts],
    ["pluIssues", "PLU Issues", summary.pluIssues],
    ["resolved", "Resolved", summary.resolved],
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <PageHeader title="Product Identity Review" subtitle="Unknown items, barcode aliases, PLUs, and supplier-code evidence" />
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 pb-8 space-y-4">
        <section className="rounded-3xl border border-border bg-card p-5 min-w-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Governance workspace</p>
              <h2 className="mt-1 text-lg font-black text-foreground break-words">Evidence can be reviewed, but handhelds never create products or mutate stock.</h2>
              <p className="mt-1 text-sm text-muted-foreground break-words">Scope: {productIdentityReviewScopeLabel(session)}. Alias/product links are proof records only until Inventory desktop governance accepts them.</p>
            </div>
          </div>
          {lastAction && <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 p-3 text-xs font-bold text-foreground break-words">{lastAction}</div>}
        </section>

        <section className="grid grid-cols-2 gap-2">
          <StatCard label="Needs review" value={summary.needsReview} icon={AlertTriangle} />
          <StatCard label="Alias issues" value={summary.aliasConflicts} icon={GitPullRequest} />
          <StatCard label="PLU issues" value={summary.pluIssues} icon={SearchCheck} />
          <StatCard label="Resolved" value={summary.resolved} icon={CheckCircle2} />
        </section>

        <section className="grid grid-cols-4 gap-2 min-w-0">
          {tabs.map(([tab, tabLabel, count]) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`${TAB_BUTTON} ${activeTab === tab ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>
              <span className="block truncate">{tabLabel}</span>
              <span className="mt-1 block text-[11px] opacity-80">{count}</span>
            </button>
          ))}
        </section>

        <section className="space-y-3 min-w-0">
          {activeItems.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card p-6 text-center min-w-0">
              <CheckCircle2 className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm font-black text-foreground">No records in this queue</p>
              <p className="mt-1 text-xs text-muted-foreground">Submit unknown item evidence from a workflow to populate this review surface.</p>
            </div>
          ) : (
            activeItems.map((item) => <EvidenceCard key={item.evidenceId || item.conflictId} item={item} canReview={canReview} onAction={handleAction} />)
          )}
        </section>

        <section className="rounded-3xl border border-border bg-background/50 p-4 min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Recent review proof</p>
              <p className="mt-1 text-sm text-muted-foreground">Identity review events, alias links, rejects, deferrals, and escalations.</p>
            </div>
            <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-black text-secondary-foreground">{reviewEvents.length}</span>
          </div>
          {reviewEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No review actions recorded yet.</div>
          ) : (
            <div className="space-y-2">{reviewEvents.slice(0, 8).map((event) => <ReviewEventCard key={event.reviewEventId} event={event} />)}</div>
          )}
        </section>
      </main>
    </div>
  );
}
