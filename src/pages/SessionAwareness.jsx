import React from "react";
import { Clock, LockKeyhole, MonitorSmartphone, Store, UserRound } from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import { useScanOpsSession } from "../lib/scanOpsSession";

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

function currentTimeLabel() {
  try {
    return new Date().toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" });
  } catch {
    return "Now";
  }
}

export default function SessionAwareness() {
  const session = useScanOpsSession();
  const user = session?.actorName || "Operator";
  const role = session?.actorRole || "Staff";
  const store = session?.storeName || session?.storeId || session?.departmentName || "Current store";
  const device = session?.deviceId || session?.scannerId || "Scanner";

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background">
      <PageHeader title="Session Awareness" subtitle="User, store, shift, and device context" />
      <main className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4 pb-8" data-scanops-scroll>
        <section className="rounded-3xl border border-primary/20 bg-primary/5 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <UserRound className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary/80">Signed In</p>
              <h1 className="mt-1 text-2xl font-black leading-tight text-foreground">{user}</h1>
              <p className="mt-1 text-sm font-bold leading-snug text-muted-foreground">{role} · {store}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Metric label="Role" value={role} />
            <Metric label="Store" value={store} />
            <Metric label="Device" value={device} />
          </div>
        </section>

        <Section icon={Store} title="Store Context" helper="Visible context reduces shared-device mistakes.">
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Store" value={store} />
            <Metric label="Department" value={session?.departmentName || "Current"} />
            <Metric label="Environment" value={session?.environmentLabel || session?.environment || "Current"} />
            <Metric label="Location" value={session?.locationName || "Operational area"} />
          </div>
        </Section>

        <Section icon={Clock} title="Shift Timing" helper="Shows whether this scanner is in an active session.">
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Started" value={session?.startedAtLabel || session?.sessionStartedAt || "Current"} />
            <Metric label="Now" value={currentTimeLabel()} />
            <Metric label="Timeout" value={session?.idleTimeoutLabel || "30 min"} />
            <Metric label="Status" value="Active" />
          </div>
        </Section>

        <Section icon={MonitorSmartphone} title="Shared Device Safety" helper="Simple reminders for shift handover and shared handhelds.">
          <div className="space-y-2">
            <Metric label="Check 1" value="Confirm user" />
            <Metric label="Check 2" value="Confirm store" />
            <Metric label="Check 3" value="Confirm device" />
            <Metric label="Future" value="Shift handover" />
          </div>
        </Section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-800 shadow-sm">
          <p className="text-sm font-black">Session Awareness is informational only.</p>
          <p className="mt-1 text-xs font-bold leading-snug">It does not change inventory, stock, pricing, ledger, sync, or desktop ownership.</p>
        </section>
      </main>
    </div>
  );
}
