import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, Printer, RefreshCw, Tags } from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import { EmptyState, MetricPill, PageShell, SectionCard, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { getMarkdownMonitorEntries, getMarkdownPolicy } from "../lib/scanOpsMarkdownLifecycle";
import { getUpcomingClosureWarnings } from "../lib/scanOpsMarkdownPolicy";

function money(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `₱${Number(value).toFixed(2)}`;
}

function MonitorCard({ entry }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4 print:break-inside-avoid">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-black leading-tight text-foreground">{entry.itemName}</p>
          <p className="mt-1 break-all font-mono text-[11px] font-bold text-muted-foreground">{entry.sku || entry.barcode || entry.itemId || "No item code"}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${entry.saleBlocked ? "bg-destructive/10 text-destructive" : entry.holidayAdjusted ? "bg-amber-500/10 text-amber-300" : "bg-primary/10 text-primary"}`}>
          {entry.saleBlocked ? "Sale blocked" : entry.holidayAdjusted ? "Holiday adjusted" : entry.nextActionState}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <MetricPill label="Batch / lot" value={entry.batchLot || "—"} />
        <MetricPill label="Expiry" value={entry.expiryDate || "—"} />
        <MetricPill label="Remaining" value={`${entry.remainingQuantity ?? "—"} ${entry.quantityType || ""}`.trim()} />
        <MetricPill label="Current" value={`${entry.currentMarkdownPercent || 0}% · ${money(entry.currentMarkdownPrice)}`} />
        <MetricPill label="Next markdown" value={entry.saleBlocked ? "Waste review" : `${entry.recommendedNextPercent || 0}%`} />
        <MetricPill label="Next action" value={entry.nextActionDate || "—"} />
      </div>

      {entry.holidayAdjusted && (
        <p className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-300">
          Final sellable trading day: {entry.finalSellableDate}
        </p>
      )}
      {entry.saleBlocked && (
        <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-black text-destructive">
          This batch is past expiry and cannot be sold. Remove it from the floor and follow the waste process.
        </p>
      )}
    </article>
  );
}

export default function MarkdownMonitor() {
  const [entries, setEntries] = useState(() => getMarkdownMonitorEntries());
  const [closureWarnings, setClosureWarnings] = useState(() => getUpcomingClosureWarnings(new Date(), getMarkdownPolicy()));
  const [filter, setFilter] = useState("all");

  const refresh = () => {
    setEntries(getMarkdownMonitorEntries());
    setClosureWarnings(getUpcomingClosureWarnings(new Date(), getMarkdownPolicy()));
  };

  useEffect(() => {
    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    const interval = window.setInterval(refresh, 30_000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(interval);
    };
  }, []);

  const filtered = useMemo(() => entries.filter((entry) => {
    if (filter === "holiday") return entry.holidayAdjusted;
    if (filter === "blocked") return entry.saleBlocked;
    if (filter === "due") return ["DUE", "UPCOMING_TODAY", "UPCOMING_LATER_TODAY"].includes(entry.nextActionState);
    return true;
  }), [entries, filter]);

  const dueCount = entries.filter((entry) => ["DUE", "UPCOMING_TODAY", "UPCOMING_LATER_TODAY"].includes(entry.nextActionState) && !entry.saleBlocked).length;
  const holidayCount = entries.filter((entry) => entry.holidayAdjusted).length;
  const blockedCount = entries.filter((entry) => entry.saleBlocked).length;

  return (
    <PageShell className="bold-blocks">
      <PageHeader title="Markdown Monitor" subtitle="Batches requiring further markdown or removal" />
      <WorkflowMain>
        {closureWarnings.map((warning) => (
          <OperatorClosureWarning key={warning.date} warning={warning} />
        ))}

        <SectionCard className="print:hidden">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-black text-foreground">Operational follow-up report</p>
              <p className="mt-1 text-xs font-bold leading-snug text-muted-foreground">This is not a draft queue. It shows printed batch markdowns that need another round, holiday adjustment, or expiry removal.</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <MetricPill label="Due" value={dueCount} />
            <MetricPill label="Holiday" value={holidayCount} />
            <MetricPill label="Blocked" value={blockedCount} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={refresh} className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-secondary px-3 text-xs font-black text-secondary-foreground">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button type="button" onClick={() => window.print()} className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-3 text-xs font-black text-primary-foreground">
              <Printer className="h-4 w-4" /> Print Monitor
            </button>
          </div>
        </SectionCard>

        <div className="grid grid-cols-4 gap-1 rounded-2xl bg-secondary/60 p-1 print:hidden" aria-label="Markdown monitor filters">
          {[
            ["all", "All"],
            ["due", "Due"],
            ["holiday", "Holiday"],
            ["blocked", "Blocked"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`min-h-10 rounded-xl px-2 text-xs font-black ${filter === id ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <section className="hidden print:block">
          <h1 className="text-2xl font-black">Markdown Monitor</h1>
          <p className="mt-1 text-sm">Printed {new Date().toLocaleString()}</p>
        </section>

        <div className="space-y-3">
          {filtered.length ? filtered.map((entry) => <MonitorCard key={entry.monitorId} entry={entry} />) : (
            <EmptyState title="No markdown follow-up due" helper="Submitted and printed batches will appear here when another markdown round or expiry action is required." />
          )}
        </div>

        <SectionCard className="print:hidden">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              {blockedCount ? <AlertTriangle className="h-5 w-5" /> : <Tags className="h-5 w-5" />}
            </span>
            <div>
              <p className="text-sm font-black text-foreground">Batch lifecycle only</p>
              <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">The monitor never changes stock or Product Master pricing. POS must validate the active markdown record, batch, label version, and expiry before sale.</p>
            </div>
          </div>
        </SectionCard>
      </WorkflowMain>
    </PageShell>
  );
}

function OperatorClosureWarning({ warning }) {
  return (
    <SectionCard className="border-amber-500/30 bg-amber-500/10 text-amber-200 print:hidden">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-black">Upcoming non-trading day</p>
          <p className="mt-1 text-xs font-bold leading-snug">{warning.reason} is closed on {warning.date}. Review holiday-adjusted batches before the final open trading day.</p>
        </div>
      </div>
    </SectionCard>
  );
}
