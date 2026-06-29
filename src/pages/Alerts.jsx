import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BatteryWarning,
  CheckCircle2,
  Database,
  MonitorSmartphone,
  Printer,
  ScanBarcode,
  ShieldAlert,
  WifiOff,
} from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import { getNetworkMode, getSyncSummary } from "../lib/scanOpsSync";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "critical", label: "Critical" },
  { id: "sync", label: "Sync" },
  { id: "device", label: "Device" },
  { id: "workflow", label: "Workflow" },
  { id: "resolved", label: "Resolved" },
];

const severityRank = { critical: 1, warning: 2, info: 3, resolved: 4 };

function severityClass(severity) {
  switch (severity) {
    case "critical":
      return "border-destructive/25 bg-destructive/10 text-destructive";
    case "warning":
      return "border-amber-500/25 bg-amber-500/10 text-amber-700";
    case "resolved":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700";
    default:
      return "border-primary/20 bg-primary/10 text-primary";
  }
}

function sourceClass(source) {
  switch (source) {
    case "sync":
      return "border-purple-500/20 bg-purple-500/10 text-purple-700";
    case "device":
      return "border-blue-500/20 bg-blue-500/10 text-blue-700";
    case "scanner":
      return "border-cyan-500/20 bg-cyan-500/10 text-cyan-700";
    case "printer":
      return "border-slate-400/30 bg-slate-100 text-slate-700";
    default:
      return "border-border bg-secondary text-secondary-foreground";
  }
}

function buildAlerts({ networkMode, syncSummary }) {
  const pending = Number(syncSummary.pending || 0);
  const failed = Number(syncSummary.failed || 0) + Number(syncSummary.conflict || 0);
  const needsReview = Number(syncSummary.needsReview || 0);
  const synced = Number(syncSummary.synced || 0);

  return [
    networkMode === "offline" && {
      id: "desktop-bridge-disconnected",
      severity: "critical",
      source: "sync",
      icon: WifiOff,
      title: "Desktop bridge disconnected",
      detail: "The handheld is offline or cannot reach Inventory Desktop. Keep scanning only if the workflow supports local queueing.",
      action: "Open Sync & Connectivity",
      to: "/scanner-settings/sync",
    },
    failed > 0 && {
      id: "sync-failed-records",
      severity: "critical",
      source: "sync",
      icon: Database,
      title: `${failed} sync record${failed === 1 ? "" : "s"} need review`,
      detail: "Failed or conflicting records must be checked before they can be handed off to Inventory Desktop.",
      action: "Open Sync Queue",
      to: "/sync-queue",
    },
    pending > 0 && {
      id: "sync-pending-records",
      severity: "warning",
      source: "sync",
      icon: Database,
      title: `${pending} record${pending === 1 ? "" : "s"} waiting to sync`,
      detail: "There is queued handheld work waiting for the Inventory Desktop bridge.",
      action: "Open Sync Queue",
      to: "/sync-queue",
    },
    needsReview > 0 && {
      id: "workflow-review-needed",
      severity: "warning",
      source: "workflow",
      icon: ShieldAlert,
      title: `${needsReview} workflow issue${needsReview === 1 ? "" : "s"} need review`,
      detail: "Some scanner evidence needs supervisor review before it should progress.",
      action: "Open Product Review",
      to: "/product-identity-review",
    },
    {
      id: "unknown-barcode-guidance",
      severity: "warning",
      source: "scanner",
      icon: ScanBarcode,
      title: "Unknown barcode scanned",
      detail: "If an item cannot be resolved, capture evidence and send it to Product Review instead of creating item data on the handheld.",
      action: "Open Product Review",
      to: "/product-identity-review",
    },
    {
      id: "printer-not-paired",
      severity: "info",
      source: "printer",
      icon: Printer,
      title: "Label printer not paired",
      detail: "Printing remains a device setting. Pair or test the printer before markdown or shelf-ticket label work.",
      action: "Open Printer Settings",
      to: "/scanner-settings/printer",
    },
    {
      id: "battery-watch",
      severity: "info",
      source: "device",
      icon: BatteryWarning,
      title: "Battery status should be checked before floor work",
      detail: "Shared handhelds should be charged before receiving, count, markdown, or waste workflows.",
      action: "Open Device Settings",
      to: "/scanner-settings/device",
    },
    synced > 0 && {
      id: "sync-ready",
      severity: "resolved",
      source: "sync",
      icon: CheckCircle2,
      title: "Recent records synced",
      detail: "The queue has recent completed handoffs. No action is required for synced records.",
      action: "View Sync Queue",
      to: "/sync-queue",
    },
  ].filter(Boolean).sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-3 text-center shadow-sm">
      <p className="text-2xl font-black text-foreground">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function AlertCard({ alert }) {
  const navigate = useNavigate();
  const Icon = alert.icon || AlertTriangle;
  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${severityClass(alert.severity)}`}>{alert.severity}</span>
            <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${sourceClass(alert.source)}`}>{alert.source}</span>
          </div>
          <h2 className="mt-3 text-lg font-black leading-tight text-foreground">{alert.title}</h2>
          <p className="mt-1 text-sm font-bold leading-snug text-muted-foreground">{alert.detail}</p>
        </div>
      </div>
      <button type="button" onClick={() => navigate(alert.to)} className="mt-4 min-h-12 w-full rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground active:scale-[0.98]">
        {alert.action}
      </button>
    </section>
  );
}

export default function Alerts() {
  const [filter, setFilter] = useState("all");
  const networkMode = getNetworkMode();
  const syncSummary = getSyncSummary();
  const alerts = useMemo(() => buildAlerts({ networkMode, syncSummary }), [networkMode, syncSummary]);
  const visibleAlerts = alerts.filter((alert) => filter === "all" || alert.severity === filter || alert.source === filter);
  const counts = {
    critical: alerts.filter((alert) => alert.severity === "critical").length,
    needsAction: alerts.filter((alert) => ["critical", "warning"].includes(alert.severity)).length,
    sync: alerts.filter((alert) => alert.source === "sync" && alert.severity !== "resolved").length,
    resolved: alerts.filter((alert) => alert.severity === "resolved").length,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <PageHeader title="Operational Alerts" subtitle="Exceptions that need attention" />
      <main data-scanops-scroll className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 pb-24 space-y-4">
        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">Alert Inbox</p>
              <h1 className="mt-1 text-2xl font-black leading-tight text-foreground">What needs attention?</h1>
              <p className="mt-1 text-sm font-bold leading-snug text-muted-foreground">Alerts are read-only guidance and navigation for urgent exceptions. Tasks remain separate assigned work.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            <StatCard label="Critical" value={counts.critical} />
            <StatCard label="Action" value={counts.needsAction} />
            <StatCard label="Sync" value={counts.sync} />
            <StatCard label="Resolved" value={counts.resolved} />
          </div>
        </section>

        <section className="grid grid-cols-3 gap-2" aria-label="Alert filters">
          {FILTERS.map((item) => (
            <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`min-h-11 rounded-2xl border px-3 text-xs font-black active:scale-[0.98] ${filter === item.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}>
              {item.label}
            </button>
          ))}
        </section>

        <section className="space-y-3" aria-label="Operational alerts list">
          {visibleAlerts.length > 0 ? visibleAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />) : (
            <section className="rounded-3xl border border-border bg-card p-4 text-center shadow-sm">
              <MonitorSmartphone className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-base font-black text-foreground">No alerts in this filter</p>
              <p className="mt-1 text-sm font-bold text-muted-foreground">Change filter or return to Home.</p>
            </section>
          )}
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-800 shadow-sm">
          <p className="text-sm font-black">Alerts do not change Inventory.</p>
          <p className="mt-1 text-xs font-bold leading-snug">This page does not mutate stock, pricing, promotions, waste, ledger, audit, sync contracts, or bridge behavior.</p>
        </section>
      </main>
    </div>
  );
}
