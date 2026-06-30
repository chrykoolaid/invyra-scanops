import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  Info,
  PackageSearch,
  Smartphone,
} from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import { SectionCard } from "../components/scanner/WorkflowPrimitives";

const FILTERS = ["All", "Stock", "Sync", "Device"];

const ALERTS = [
  {
    id: "low-stock-yoghurt",
    severity: "CRITICAL",
    category: "Stock",
    title: "Greek Yoghurt 1kg",
    message: "Low stock risk detected",
    source: "Reorder Review",
    to: "/gap-scan",
  },
  {
    id: "scanner-02-sync",
    severity: "SYNC",
    category: "Sync",
    title: "Scanner 02",
    message: "12 items waiting to sync",
    source: "Bridge Queue",
    to: "/sync-queue",
  },
  {
    id: "printer-unavailable",
    severity: "DEVICE",
    category: "Device",
    title: "Printer unavailable",
    message: "Markdown labels cannot print",
    source: "Device Status",
    to: "/device-health",
  },
];

function severityClass(severity) {
  switch (severity) {
    case "CRITICAL":
      return "border-destructive/25 bg-destructive/10 text-destructive";
    case "WARNING":
      return "border-amber-500/25 bg-amber-500/10 text-amber-700";
    case "SYNC":
    case "DEVICE":
      return "border-primary/20 bg-primary/10 text-primary";
    default:
      return "border-border bg-secondary text-secondary-foreground";
  }
}

function categoryIcon(category) {
  if (category === "Device") return Smartphone;
  if (category === "Stock") return PackageSearch;
  if (category === "Sync") return Bell;
  return AlertTriangle;
}

export default function Alerts() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("All");

  const visibleAlerts = useMemo(() => {
    if (activeFilter === "All") return ALERTS;
    return ALERTS.filter((alert) => alert.category === activeFilter);
  }, [activeFilter]);

  const criticalCount = ALERTS.filter((alert) => alert.severity === "CRITICAL").length;
  const warningCount = ALERTS.filter((alert) => alert.severity === "WARNING").length;
  const deviceCount = ALERTS.filter((alert) => alert.category === "Device").length;

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <PageHeader title="Alerts" subtitle="Urgent operational issues" />
      <main data-scanops-scroll className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 pb-8 space-y-3">
        <SectionCard className="space-y-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bell className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-black leading-tight text-foreground">Alerts</h2>
              <p className="mt-1 break-words text-sm font-semibold text-muted-foreground">Urgent operational issues</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <AlertStat icon={AlertCircle} label="Critical" value={criticalCount} tone="danger" />
            <AlertStat icon={AlertTriangle} label="Warning" value={warningCount} tone="warning" />
            <AlertStat icon={Smartphone} label="Device" value={deviceCount} tone="primary" />
          </div>
        </SectionCard>

        <section className="grid grid-cols-4 gap-2 min-w-0" aria-label="Alert filters">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`min-h-11 rounded-2xl border px-3 text-xs font-black transition-all active:scale-[0.98] ${
                activeFilter === filter ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
              }`}
            >
              {filter}
            </button>
          ))}
        </section>

        <SectionCard>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Info className="h-5 w-5" />
            </div>
            <p className="break-words text-sm font-semibold text-muted-foreground">Review what needs attention now.</p>
          </div>
        </SectionCard>

        <section className="space-y-3 min-w-0" aria-label="Operational alerts">
          {visibleAlerts.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-5 text-center">
              <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-black text-foreground">No alerts here</p>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">This section is clear right now.</p>
            </div>
          ) : (
            visibleAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} onOpen={() => navigate(alert.to)} />
            ))
          )}
        </section>
      </main>
    </div>
  );
}

function AlertStat({ icon: Icon, label, value, tone }) {
  const toneClass = tone === "danger"
    ? "border-destructive/20 bg-destructive/5 text-destructive"
    : tone === "warning"
      ? "border-amber-500/20 bg-amber-500/10 text-amber-700"
      : "border-primary/20 bg-primary/5 text-primary";

  return (
    <div className={`min-w-0 rounded-2xl border px-2 py-3 ${toneClass}`}>
      <div className="flex items-center justify-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <p className="text-xl font-black leading-none text-foreground">{value}</p>
      </div>
      <p className="mt-1 truncate text-center text-[10px] font-black uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function AlertCard({ alert, onOpen }) {
  const Icon = categoryIcon(alert.category);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border border-border bg-card p-4 text-left transition active:scale-[0.99] active:bg-secondary/60"
    >
      <div className="grid grid-cols-[auto,1fr,auto] items-center gap-3 min-w-0">
        <span className={`inline-flex min-h-8 shrink-0 items-center rounded-full border px-3 text-[10px] font-black uppercase tracking-wide ${severityClass(alert.severity)}`}>
          {alert.severity}
        </span>
        <div className="min-w-0">
          <h3 className="break-words text-base font-black leading-tight text-foreground">{alert.title}</h3>
          <p className="mt-1 break-words text-sm font-semibold text-muted-foreground">{alert.message}</p>
          <p className="mt-1 break-words text-xs font-bold text-muted-foreground">Source: {alert.source}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-background text-primary">
          <Icon className="h-4 w-4" />
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </button>
  );
}