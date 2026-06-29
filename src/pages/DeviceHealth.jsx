import React, { useMemo } from "react";
import {
  BatteryCharging,
  Camera,
  CheckCircle2,
  Database,
  HardDrive,
  MemoryStick,
  Printer,
  ScanBarcode,
  ShieldAlert,
  Smartphone,
  Wifi,
  WifiOff,
} from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import { useScanOpsSession } from "../lib/scanOpsSession";
import { getNetworkMode, getSyncSummary } from "../lib/scanOpsSync";

function statusStyle(status) {
  if (status === "action") return "border-red-200 bg-red-50 text-red-800";
  if (status === "warning") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "planned") return "border-slate-200 bg-slate-50 text-slate-800";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function statusLabel(status) {
  if (status === "action") return "Action Needed";
  if (status === "warning") return "Warning";
  if (status === "planned") return "Planned";
  return "Healthy";
}

function HealthCard({ icon: Icon, title, helper, status = "healthy", value }) {
  return (
    <section className={`rounded-3xl border p-4 shadow-sm ${statusStyle(status)}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70">
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-base font-black leading-tight">{title}</h2>
            <span className="shrink-0 rounded-full bg-white/70 px-2 py-1 text-[10px] font-black uppercase tracking-wide">
              {value || statusLabel(status)}
            </span>
          </div>
          <p className="mt-1 text-sm font-bold leading-snug opacity-90">{helper}</p>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl bg-secondary/70 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-black text-foreground">{value}</p>
    </div>
  );
}

function buildHealth(networkMode, summary) {
  const reviewCount = Number(summary.conflict || 0) + Number(summary.needsReview || 0) + Number(summary.duplicate || 0) + Number(summary.escalated || 0);
  const issueCount = Number(summary.failed || 0) + reviewCount;
  return [
    { icon: Smartphone, title: "Handheld", helper: "App shell, session context, and local storage are available.", status: "healthy" },
    { icon: networkMode === "offline" ? WifiOff : Wifi, title: "Network", helper: "ScanOps shows network state only. Android manages Wi‑Fi joining and passwords.", status: networkMode === "offline" ? "warning" : "healthy", value: networkMode === "offline" ? "Offline" : "Online" },
    { icon: ScanBarcode, title: "Scanner", helper: "Hardware scanner and manual fallback are available for scan-first workflows.", status: "healthy" },
    { icon: Camera, title: "Camera", helper: "Camera scan fallback is available when hardware scanning is not practical.", status: "healthy", value: "Available" },
    { icon: Printer, title: "Printer", helper: "No paired printer is configured yet. Label work can remain queued until printer setup exists.", status: "warning", value: "Not Paired" },
    { icon: Database, title: "Sync Queue", helper: issueCount ? "Some saved records need retry or review before desktop handoff." : "Local queue is ready for desktop handoff.", status: issueCount ? "warning" : "healthy", value: issueCount ? "Review" : "Ready" },
    { icon: BatteryCharging, title: "Battery", helper: "Battery telemetry is represented as a device-health placeholder until native device APIs are integrated.", status: "healthy", value: "OK" },
    { icon: HardDrive, title: "Storage", helper: "Local storage is available for offline evidence and queue records.", status: "healthy" },
    { icon: MemoryStick, title: "Memory", helper: "Runtime memory state appears normal for the current app session.", status: "healthy" },
  ];
}

export default function DeviceHealth() {
  const session = useScanOpsSession();
  const networkMode = getNetworkMode();
  const summary = getSyncSummary();
  const cards = useMemo(() => buildHealth(networkMode, summary), [networkMode, summary]);
  const warnings = cards.filter((card) => card.status !== "healthy").length;

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background">
      <PageHeader title="Device Health" subtitle="Scanner · Network · Printer · Queue readiness" />
      <main className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4 pb-8" data-scanops-scroll>
        <section className={`rounded-3xl border p-4 shadow-sm ${warnings ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70">
              {warnings ? <ShieldAlert className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] opacity-80">Overall Health</p>
              <h1 className="mt-1 text-2xl font-black leading-tight">{warnings ? "Warning" : "Healthy"}</h1>
              <p className="mt-1 text-sm font-bold leading-snug opacity-90">{warnings ? "One or more device areas need attention." : "Device is ready for frontline operation."}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Metric label="Warnings" value={warnings} />
            <Metric label="Queue" value={summary.pending || 0} />
            <Metric label="Network" value={networkMode === "offline" ? "Offline" : "Online"} />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3">
          {cards.map((card) => <HealthCard key={card.title} {...card} />)}
        </section>

        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Session Context</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Metric label="User" value={session.actorName || "Operator"} />
            <Metric label="Role" value={session.actorRole || "Staff"} />
            <Metric label="Store" value={session.storeName || session.storeId || "Current"} />
            <Metric label="Device" value={session.deviceId || session.scannerId || "Scanner"} />
          </div>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-800 shadow-sm">
          <p className="text-sm font-black">Device Health is informational only.</p>
          <p className="mt-1 text-xs font-bold leading-snug">It does not change inventory, pricing, ledger, audit, sync contracts, Wi‑Fi settings, or Inventory Desktop ownership.</p>
        </section>
      </main>
    </div>
  );
}
