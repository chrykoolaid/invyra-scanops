import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, AlertTriangle, BarChart3, ClipboardList, Database, GitPullRequest, MonitorSmartphone, PackageSearch, ShieldAlert, UserRoundCheck } from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import { EmptyState, PageShell, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { createScanOpsAuditEvent } from "../lib/scanOpsAudit";
import { canViewScanOpsReporting, fetchScanOpsRecordsFromDB, getScanOpsReportingSnapshot, scanOpsReportingScopeLabel, summariseDBRecords } from "../lib/scanOpsReporting";
import { useScanOpsSession } from "../lib/scanOpsSession";

const DATE_OPTIONS = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
];

const KPI_ICONS = {
  open_tasks: ClipboardList,
  sync_issues: Database,
  unknown_items: PackageSearch,
  count_variances: BarChart3,
  receiving_exceptions: AlertTriangle,
  waste_markdown: GitPullRequest,
};

function formatTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" });
  } catch {
    return value;
  }
}

function StatCard({ item }) {
  const navigate = useNavigate();
  const Icon = KPI_ICONS[item.id] || BarChart3;
  return (
    <button type="button" onClick={() => item.path && navigate(item.path)} className="min-w-0 rounded-2xl border border-border bg-card p-3 text-left shadow-sm active:scale-[0.99] active:bg-secondary transition-all">
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
    </button>
  );
}

function SectionCard({ title, helper, icon: Icon = Activity, children }) {
  return (
    <section className="scanops-work-card min-w-0">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-black text-foreground">{title}</h2>
          {helper && <p className="mt-0.5 text-xs font-semibold leading-snug text-muted-foreground">{helper}</p>}
        </div>
      </div>
      <div className="mt-3 min-w-0">{children}</div>
    </section>
  );
}

function QueueRow({ item }) {
  const navigate = useNavigate();
  return (
    <article className="rounded-2xl border border-border bg-background/70 p-3 min-w-0">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-black text-foreground">{item.label}</p>
          <p className="mt-1 text-xs font-bold text-muted-foreground break-words">{item.value} issue{item.value === 1 ? "" : "s"} · {item.detail}</p>
        </div>
        {item.path && (
          <button type="button" onClick={() => navigate(item.path)} className="min-h-10 shrink-0 rounded-xl bg-secondary px-3 text-[11px] font-black text-secondary-foreground active:bg-border">
            {item.action || "View"}
          </button>
        )}
      </div>
    </article>
  );
}

function ExceptionGrid({ items }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <div key={item.id} className="min-w-0 rounded-2xl bg-background/70 p-3 border border-border">
          <p className="truncate text-[11px] font-black uppercase tracking-wider text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-xl font-black text-foreground">{item.value}</p>
          <p className="mt-0.5 break-words text-[11px] font-bold text-muted-foreground">{item.detail}</p>
        </div>
      ))}
    </div>
  );
}

function EvidenceRows({ items }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-background/70 border border-border px-3 py-2.5 min-w-0">
          <p className="min-w-0 break-words text-xs font-black text-foreground">{item.label}</p>
          <span className="flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-xl bg-secondary px-2 text-xs font-black text-secondary-foreground">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function DeviceActivity({ devices, users }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Devices</p>
        <div className="mt-2 space-y-2">
          {devices.length === 0 ? <EmptyState title="No scanner activity recorded for this filter." /> : devices.map((device) => (
            <article key={device.id} className="rounded-2xl border border-border bg-background/70 p-3 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-black text-foreground">{device.label}</p>
                  <p className="mt-1 break-words text-xs font-bold text-muted-foreground">{device.warningState} · {formatTime(device.lastActive)}</p>
                </div>
                <span className="shrink-0 rounded-xl bg-secondary px-2.5 py-1 text-[11px] font-black text-secondary-foreground">{device.scanCount} scans</span>
              </div>
              <p className="mt-2 text-xs font-bold text-muted-foreground">{device.queuedSync} queued · {device.failedSync} failed · {device.conflicts} conflicts</p>
            </article>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Users</p>
        <div className="mt-2 space-y-2">
          {users.length === 0 ? <EmptyState title="No user activity recorded for this filter." /> : users.map((user) => (
            <article key={user.id} className="rounded-2xl border border-border bg-background/70 p-3 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-black text-foreground">{user.name}</p>
                  <p className="mt-1 break-words text-xs font-bold text-muted-foreground">{user.role} · {user.department}</p>
                </div>
                <span className="shrink-0 rounded-xl bg-secondary px-2.5 py-1 text-[11px] font-black text-secondary-foreground">{user.openTasks} open</span>
              </div>
              <p className="mt-2 text-xs font-bold text-muted-foreground">{user.scanCount} scans · {user.tasksCompleted} tasks completed · {user.exceptionsSubmitted} exceptions · {user.conflicts} conflicts</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function EventFeed({ events }) {
  return (
    <div className="space-y-2">
      {events.length === 0 ? <EmptyState title="No ScanOps activity for this period." /> : events.map((event) => (
        <article key={`${event.id || event.title}-${event.createdAt}`} className="rounded-2xl border border-border bg-background/70 p-3 min-w-0">
          <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">{formatTime(event.createdAt)}</p>
          <p className="mt-1 break-words text-sm font-black text-foreground">{event.title}</p>
          <p className="mt-1 break-words text-xs font-bold text-muted-foreground">{event.summary}</p>
        </article>
      ))}
    </div>
  );
}

function AccessRestricted({ session }) {
  return (
    <PageShell className="bold-blocks">
      <PageHeader title="ScanOps Reporting" subtitle="Access Restricted" />
      <WorkflowMain>
        <section className="scanops-work-card border-amber-500/20 bg-amber-500/10">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div className="min-w-0">
              <h2 className="text-base font-black text-foreground">Reporting is restricted</h2>
              <p className="mt-1 text-sm font-semibold leading-snug text-muted-foreground">
                {session.actorName} is signed in as Staff. ScanOps Reporting is visible to Supervisor, Manager, and Admin roles only.
              </p>
            </div>
          </div>
        </section>
      </WorkflowMain>
    </PageShell>
  );
}

export default function ScanOpsReporting() {
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

  // Fetch real DB records whenever dateRange changes
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

  return (
    <PageShell className="bold-blocks">
      <PageHeader title="ScanOps Reporting" subtitle="Scanner activity, queue health, exceptions, and evidence quality" />
      <WorkflowMain className="space-y-3">
        <section className="scanops-work-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wider text-primary">{snapshot.scopeLabel}</p>
              <h2 className="mt-1 text-base font-black text-foreground">Management visibility</h2>
              <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">Read-only scanner operations view. Links open existing workflows only.</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserRoundCheck className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {DATE_OPTIONS.map((option) => (
              <button key={option.id} type="button" onClick={() => updateFilter("dateRange", option.id)} className={`min-h-11 rounded-2xl border px-2 text-xs font-black active:scale-[0.98] ${filters.dateRange === option.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary text-secondary-foreground"}`}>
                {option.label}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <TouchSelect label="Workflow" value={filters.workflow} onChange={(value) => updateFilter("workflow", value)} options={snapshot.filterOptions.workflows} />
            <TouchSelect label="Department" value={filters.department} onChange={(value) => updateFilter("department", value)} options={snapshot.filterOptions.departments} />
            <TouchSelect label="Device" value={filters.device} onChange={(value) => updateFilter("device", value)} options={snapshot.filterOptions.devices} />
            <TouchSelect label="User" value={filters.user} onChange={(value) => updateFilter("user", value)} options={snapshot.filterOptions.users} />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2">
          {snapshot.kpis.map((item) => <StatCard key={item.id} item={item} />)}
        </div>

        {/* Live DB records panel */}
        <section className="scanops-work-card space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-primary">Live Database</p>
              <h2 className="mt-1 text-base font-black text-foreground">
                {dbLoading ? "Loading records…" : `${dbSummary.total} records synced`}
              </h2>
              <p className="mt-0.5 text-xs font-semibold text-muted-foreground">Real ScanOpsRecord entries from the database.</p>
            </div>
            <Database className="h-5 w-5 shrink-0 text-primary" />
          </div>
          {!dbLoading && dbSummary.total > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(dbSummary.byType).map(([type, count]) => (
                <div key={type} className="rounded-2xl bg-secondary/70 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{String(type).replaceAll("_", " ")}</p>
                  <p className="mt-0.5 text-xl font-black text-foreground">{count}</p>
                </div>
              ))}
            </div>
          )}
          {!dbLoading && dbSummary.total === 0 && (
            <p className="rounded-2xl bg-secondary/50 px-3 py-2 text-sm font-bold text-muted-foreground">No synced records yet for this period. Records appear here as workflows are completed.</p>
          )}
        </section>

        <SectionCard title="Queue Health" helper="Backlogs that may need existing workflow attention" icon={Database}>
          <div className="space-y-2">
            {snapshot.queueHealth.map((item) => <QueueRow key={item.id} item={item} />)}
          </div>
        </SectionCard>

        <SectionCard title="Workflow Exceptions" helper="Grouped operational pressure by workflow" icon={AlertTriangle}>
          <ExceptionGrid items={snapshot.workflowExceptions} />
        </SectionCard>

        <SectionCard title="Evidence Quality" helper="Neutral evidence completeness counts only" icon={GitPullRequest}>
          <EvidenceRows items={snapshot.evidenceQuality} />
        </SectionCard>

        <SectionCard title="Device & User Activity" helper="Operational visibility, not payroll or discipline" icon={MonitorSmartphone}>
          <DeviceActivity devices={snapshot.deviceActivity} users={snapshot.userActivity} />
        </SectionCard>

        <SectionCard title="Recent ScanOps Events" helper="Read-only event feed — local + database records" icon={Activity}>
          <EventFeed events={[
            ...dbSummary.recentEvents,
            ...snapshot.recentEvents.filter((e) => e.source !== "db"),
          ].sort((a, b) => (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0)).slice(0, 15)} />
        </SectionCard>
      </WorkflowMain>
    </PageShell>
  );
}