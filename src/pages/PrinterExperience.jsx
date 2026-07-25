import React from "react";
import { AlertTriangle, CheckCircle2, FileText, Printer, RefreshCw, Tags } from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl bg-secondary/70 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-black text-foreground">{value || "—"}</p>
    </div>
  );
}

function Section({ icon: Icon, title, helper, children }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black leading-tight text-foreground">{title}</h2>
          <p className="mt-1 text-xs font-bold leading-snug text-muted-foreground">{helper}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ActionRow({ icon: Icon, title, helper, status }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-secondary/60 px-3 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background text-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-black text-foreground">{title}</p>
          <span className="shrink-0 rounded-full bg-background px-2 py-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">{status}</span>
        </div>
        <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">{helper}</p>
      </div>
    </div>
  );
}

export default function PrinterExperience() {
  return (
    <div className="bold-blocks flex min-h-screen flex-col overflow-x-hidden bg-background">
      <PageHeader title="Printer Experience" subtitle="Printer readiness, labels, queue, and recovery" />
      <main className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4 pb-8" data-scanops-scroll>
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-800 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70">
              <AlertTriangle className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] opacity-80">Printer Status</p>
              <h1 className="mt-1 text-2xl font-black leading-tight">Not Paired</h1>
              <p className="mt-1 text-sm font-bold leading-snug opacity-90">Label work can queue until a printer is configured.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Metric label="Printer" value="Not paired" />
            <Metric label="Queue" value="Ready" />
            <Metric label="Paper" value="Unknown" />
          </div>
        </section>

        <Section icon={Printer} title="Printer Readiness" helper="Simple frontline view of print capability.">
          <div className="space-y-2">
            <ActionRow icon={Printer} title="Printer Connection" helper="Bluetooth or network printer integration is planned." status="Planned" />
            <ActionRow icon={FileText} title="Paper / Labels" helper="Paper status will appear when printer telemetry exists." status="Unknown" />
            <ActionRow icon={CheckCircle2} title="Test Print" helper="Print a test label when a printer is paired." status="Planned" />
          </div>
        </Section>

        <Section icon={Tags} title="Label Queue" helper="Printing failure should not block evidence capture.">
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Markdown labels" value="Queue ready" />
            <Metric label="Shelf tickets" value="Queue ready" />
            <Metric label="Reprint last" value="Planned" />
            <Metric label="Desktop fallback" value="Available later" />
          </div>
        </Section>

        <Section icon={RefreshCw} title="Recovery Guidance" helper="What staff should do when labels do not print.">
          <div className="space-y-2">
            <ActionRow icon={Printer} title="Check printer" helper="Confirm power, paper, cover, and connection." status="Step 1" />
            <ActionRow icon={RefreshCw} title="Retry print" helper="Retry only after the printer is ready." status="Step 2" />
            <ActionRow icon={FileText} title="Use queue" helper="Keep the label queued instead of changing stock or price manually." status="Step 3" />
          </div>
        </Section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-800 shadow-sm">
          <p className="text-sm font-black">Printer Experience is informational only.</p>
          <p className="mt-1 text-xs font-bold leading-snug">It does not change stock, pricing, markdown approval, ledger, audit, bridge, or sync contracts.</p>
        </section>
      </main>
    </div>
  );
}