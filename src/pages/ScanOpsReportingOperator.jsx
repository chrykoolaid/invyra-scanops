import React, { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, BarChart3, ClipboardList, Database, MonitorSmartphone, PackageSearch, ShieldAlert } from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import { EmptyState, MetricPill, PageShell, SectionCard, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { createScanOpsAuditEvent } from "../lib/scanOpsAudit";
import { canViewScanOpsReporting, fetchScanOpsRecordsFromDB, getScanOpsReportingSnapshot, scanOpsReportingScopeLabel, summariseDBRecords } from "../lib/scanOpsReporting";
import { useScanOpsSession } from "../lib/scanOpsSession";

const DATE_OPTIONS = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
];

const WORKFLOW_ICONS = {
  open_tasks: ClipboardList,
  sync_issues: Database,
  unknown_items: PackageSearch,
  count_variances: BarChart3,
  receiving_exceptions: AlertTriangle,
};

function formatTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" });
  } catch {
    return value;
  }
}

function AccessRestricted({ session }) {
  return (
    <PageShell>
      <PageHeader title="Reporting" subtitle="Access Restricted" />
      <WorkflowMain>
        <SectionCard className="border-amber-500/20 bg-amber-500/10">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div className="min-w-0">
              <h2 className="text-base font-black text-foreground">Reporting is restricted</h2>
              <p className="mt-1 text-sm font-semibold leading-snug text-muted-foreground">
                {session.actorName} is signed in as Staff. Reporting is visible to Supervisor, Manager, and Admin roles only.
              </p>
            </div>
          </div>
        </SectionCard>
      </WorkflowMain>
    </PageShell>
  );
}

function ReportingSessionCard({ snapshot, dbSummary, dbLoading }) {
  return (
    <SectionCard>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <BarChart3 className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Reporting View</p>
          <h2 className="mt-1 text-base font-black text-foreground">{snapshot.scopeLabel}</h2>
          <p className="mt-1 text-xs font-bold text-muted-foreground">Read-only ScanOps activity. Desktop remains the management reporting layer.</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MetricPill label="Records" value={dbLoading ? "…" : dbSummary.total} />
        <MetricPill label="Open Tasks" value={snapshot.kpis.find((item) => item.id === "open_tasks")?.value ?? 0} />
        <MetricPill label="Sync" value={snapshot.kpis.find((item) => item.id === "sync_issues")?.value ?? 0} />
      </div>
    </SectionCard>
  );
}

function KpiCard({ item }) {
  const Icon = WORKFLOW_ICONS[item.id] || Activity;
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-black uppercase tracking-wider text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-2xl font-black text-foreground">{item.value}</p>
          <p className="mt-0.5 truncate text-[11px] font-bold text-muted-foreground">{item.detail || "No issues"}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
    </div>
  );
}

function QueueCard({ item }) {
  return (
    <div className="rounded-2xl bg-secondary/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-foreground">{item.label}</p>
          <p className="mt-1 text-xs font-bold text-muted-foreground">{item.value} issue{item.value === 1 ? "" : "s"} · {item.detail}</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black text-primary">Review</span>
      </div>
    </div>
  );
}

function EventFeed({ events }) {
  return (
    <div className="space-y-2">
      {events.length ? events.map((event) => (
        <div key={`${event.id || event.title}-${event.createdAt}`} className="rounded-2xl bg-secondary/60 p-3">
          <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">{formatTime(event.createdAt)}</p>
          <p className="mt-1 break-words text-sm font-black text-foreground">{event.title}</p>
          <p className="mt-1 break-words text-xs font-bold text-muted-foreground">{event.summary}</p>
        </div>
      )) : <EmptyState title="No ScanOps activity for this period." helper="Activity appears here as handheld workflows are completed." />}
    </div>
  );
}

export default function ScanOpsReportingOperator() {
  const session = useScanOpsSession();
  const [filters, setFilters] = useState({ dateRange: "7d", workflow: "all", department: "all", device: "all", user: "all" });
  const [dbRecords, setDbRecords] = useState([]);
  const [dbLoading, setDbLoading] = useState(false);
  const allowed = canViewScanOpsReporting(session);

  useEffect(() => {
    createScanOpsAuditEvent(allowed ? "SCANOPS_REPORTING_VIEWED" : "SCANOPS_REPORTING_ACCESS_BLOCKED", {
      status: allowed ? "viewed" : "blocked",
      reporting_scope: scanOpsReportingScopeLabel(session),
    });
  }, [allowed, session.actorRole]);

  useEffect(() => {
    if (!allowed) return;
    setDbLoading(true);
    fetchScanOpsRecordsFromDB(filters.dateRange).then((rows) => {
      setDbRecords(rows);
      setDbLoading(false);
    });
  }, [allowed, filters.dateRange]);

  const snapshot = useMemo(() => allowed ? getScanOpsReportingSnapshot(filters, session) : null, [allowed, filters, session]);
  const dbSummary = useMemo(() => summariseDBRecords(dbRecords), [dbRecords]);

  if (!allowed) return <AccessRestricted session={session} />;

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const events = [
    ...dbSummary.recentEvents,
    ...snapshot.recentEvents.filter((event) => event.source !== "db"),
  ].sort((a, b) => (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0)).slice(0, 8);

  return (
    <PageShell>
      <PageHeader title="Reporting" subtitle="Read-only ScanOps activity" />
      <WorkflowMain>
        <ReportingSessionCard snapshot={snapshot} dbSummary={dbSummary} dbLoading={dbLoading} />

        <SectionCard>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Filter</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {DATE_OPTIONS.map((option) => (
              <button key={option.id} type="button" onClick={() => updateFilter("dateRange", option.id)} className={`min-h-11 rounded-2xl border px-2 text-xs font-black active:scale-[0.98] ${filters.dateRange === option.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary text-secondary-foreground"}`}>
                {option.label}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <TouchSelect label="Workflow" value={filters.workflow} onChange={(value) => updateFilter("workflow", value)} options={snapshot.filterOptions.workflows} />
            <TouchSelect label="Department" value={filters.department} onChange={(value) => updateFilter("department", value)} options={snapshot.filterOptions.departments} />
          </div>
        </SectionCard>

        <div className="grid grid-cols-2 gap-2">
          {snapshot.kpis.map((item) => <KpiCard key={item.id} item={item} />)}
        </div>

        <SectionCard>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Database className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Queue Health</p>
              <h2 className="mt-1 text-base font-black text-foreground">What needs attention?</h2>
              <p className="mt-1 text-xs font-bold text-muted-foreground">Read-only summary. Actions remain inside their workflow screens.</p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {snapshot.queueHealth.map((item) => <QueueCard key={item.id} item={item} />)}
          </div>
        </SectionCard>

        <SectionCard>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MonitorSmartphone className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Device Activity</p>
              <h2 className="mt-1 text-base font-black text-foreground">Scanner health</h2>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {snapshot.deviceActivity.slice(0, 4).map((device) => (
              <MetricPill key={device.id} label={device.label} value={device.scanCount} suffix="scans" />
            ))}
          </div>
        </SectionCard>

        <SectionCard>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Activity className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Recent Activity</p>
              <h2 className="mt-1 text-base font-black text-foreground">Latest ScanOps events</h2>
            </div>
          </div>
          <div className="mt-3">
            <EventFeed events={events} />
          </div>
        </SectionCard>

        <SectionCard className="space-y-2">
          <p className="text-sm font-black text-foreground">Reporting stays read-only</p>
          <p className="text-xs font-semibold leading-snug text-muted-foreground">This handheld page summarizes operational activity only. Inventory Desktop remains the management reporting and system-of-record layer.</p>
        </SectionCard>
      </WorkflowMain>
    </PageShell>
  );
}
