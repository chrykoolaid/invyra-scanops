import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  HelpCircle,
  Laptop,
  Printer,
  RefreshCw,
  ScanBarcode,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import { getNetworkMode, getSyncSummary, retryAllSyncEvents } from "../lib/scanOpsSync";

const ISSUE_GROUPS = [
  {
    id: "desktop",
    label: "Desktop unavailable",
    icon: Laptop,
    symptoms: ["Bridge disconnected", "Cannot hand off queue", "Wrong desktop selected"],
    checks: ["Confirm Inventory Desktop is open", "Confirm bridge listener is running", "Confirm handheld and desktop are on the same store network", "Confirm saved desktop profile is correct"],
    actions: ["Open Sync & Connectivity", "Test connection", "Choose known desktop", "Use manual IP/hostname fallback"],
  },
  {
    id: "network",
    label: "Network issue",
    icon: Wifi,
    symptoms: ["Offline banner visible", "Queue keeps growing", "No bridge heartbeat"],
    checks: ["Open Android Wi-Fi settings", "Confirm store Wi-Fi is connected", "Move closer to access point", "Check if other devices are online"],
    actions: ["Keep scanning", "Let ScanOps queue locally", "Reconnect Wi-Fi in Android", "Sync resumes automatically"],
  },
  {
    id: "queue",
    label: "Sync queue stuck",
    icon: Database,
    symptoms: ["Pending records remain", "Failed records visible", "Retry needed"],
    checks: ["Confirm device is online", "Confirm desktop profile is set", "Check if failed records need review", "Do not rescan unless instructed"],
    actions: ["Retry queue", "View Sync Queue", "Escalate repeated failures", "Keep evidence unchanged"],
  },
  {
    id: "scanner",
    label: "Scanner not reading",
    icon: ScanBarcode,
    symptoms: ["No scan response", "Wrong barcode read", "Unknown item"],
    checks: ["Check barcode is visible", "Try another item", "Use manual entry fallback", "Run scanner test"],
    actions: ["Clean scanner window", "Use manual SKU/barcode entry", "Capture unknown item evidence", "Ask supervisor if repeated"],
  },
  {
    id: "printer",
    label: "Printer problem",
    icon: Printer,
    symptoms: ["Label not printing", "Printer offline", "Paper issue"],
    checks: ["Check printer power", "Check paper/labels", "Check Bluetooth/network pairing", "Do not change stock because printing failed"],
    actions: ["Queue label", "Retry print", "Use desktop print queue", "Escalate if paper or connection issue remains"],
  },
];

function statusText(networkMode, summary) {
  const issues = Number(summary.failed || 0) + Number(summary.conflict || 0) + Number(summary.needsReview || 0) + Number(summary.duplicate || 0);
  if (networkMode === "offline") return { title: "Offline", helper: "Keep scanning. Work is saved locally and sync resumes when connected.", tone: "warning" };
  if (issues > 0) return { title: "Action Needed", helper: "Some records need retry or review before desktop handoff.", tone: "warning" };
  return { title: "Ready", helper: "No major recovery issue detected.", tone: "healthy" };
}

function toneClasses(tone) {
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function RecoveryCard({ group }) {
  const [open, setOpen] = useState(false);
  const Icon = group.icon;
  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <button type="button" onClick={() => setOpen((value) => !value)} className="w-full text-left">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-black text-foreground">{group.label}</p>
            <p className="mt-1 text-xs font-bold leading-snug text-muted-foreground">Tap for symptoms, checks, and recovery steps.</p>
          </div>
          <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">{open ? "Open" : "Guide"}</span>
        </div>
      </button>
      {open && (
        <div className="mt-4 space-y-3">
          <GuideList title="Symptoms" items={group.symptoms} icon={AlertTriangle} />
          <GuideList title="Check First" items={group.checks} icon={HelpCircle} />
          <GuideList title="Recommended Action" items={group.actions} icon={CheckCircle2} />
        </div>
      )}
    </section>
  );
}

function GuideList({ title, items, icon: Icon }) {
  return (
    <div className="rounded-2xl bg-secondary/60 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">{title}</p>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item} className="rounded-xl bg-background px-3 py-2 text-xs font-bold leading-snug text-foreground">
            {item}
          </div>
        ))}
      </div>
    </div>
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

export default function RecoveryGuidance() {
  const networkMode = getNetworkMode();
  const summary = getSyncSummary();
  const status = useMemo(() => statusText(networkMode, summary), [networkMode, summary]);

  const retryQueue = () => {
    retryAllSyncEvents();
  };

  return (
    <div className="bold-blocks flex min-h-screen flex-col overflow-x-hidden bg-background">
      <PageHeader title="Recovery Guidance" subtitle="What went wrong and what to do next" />
      <main className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4 pb-8" data-scanops-scroll>
        <section className={`rounded-3xl border p-4 shadow-sm ${toneClasses(status.tone)}`}>
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70">
              {status.tone === "warning" ? <AlertTriangle className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] opacity-80">Current State</p>
              <h1 className="mt-1 text-2xl font-black leading-tight">{status.title}</h1>
              <p className="mt-1 text-sm font-bold leading-snug opacity-90">{status.helper}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Metric label="Network" value={networkMode === "offline" ? "Offline" : "Online"} />
            <Metric label="Pending" value={summary.pending || 0} />
            <Metric label="Failed" value={summary.failed || 0} />
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm font-black text-foreground">Quick Recovery</p>
          <p className="mt-1 text-xs font-bold leading-snug text-muted-foreground">Use this when queue records are waiting and the device is online.</p>
          <button type="button" onClick={retryQueue} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground active:scale-[0.98]">
            <RefreshCw className="h-4 w-4" /> Retry Queue
          </button>
        </section>

        <section className="space-y-3">
          {ISSUE_GROUPS.map((group) => <RecoveryCard key={group.id} group={group} />)}
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-800 shadow-sm">
          <p className="text-sm font-black">Recovery Guidance is informational.</p>
          <p className="mt-1 text-xs font-bold leading-snug">It does not bypass the bridge, change sync contracts, mutate inventory, adjust stock, alter pricing, or change audit behavior.</p>
        </section>
      </main>
    </div>
  );
}