import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/scanner/PageHeader";
import {
  CheckCircle2,
  Database,
  FileJson2,
  GitBranch,
  HeartPulse,
  LockKeyhole,
  RefreshCw,
  Save,
  Settings2,
  ShieldAlert,
} from "lucide-react";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { useScanOpsSession } from "../lib/scanOpsSession";
import { hasRoleAtLeast } from "../lib/scanOpsPermissions";
import { DESKTOP_SYNC_CONTRACT_VERSION, WORKFLOW_SYNC_CONTRACTS } from "../lib/scanOpsDesktopSyncContract";
import { getSyncSummary } from "../lib/scanOpsSync";

const BTN_PRIMARY = "w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:active:scale-100";
const TAB_BUTTON = "shrink-0 rounded-2xl px-3 py-2.5 text-xs font-black border transition-all active:scale-[0.98]";
const SETUP_STORAGE_KEY = "scanops_sync_endpoint_config";

const EMPTY_QUEUE = Object.freeze({ pending: 0, review: 0, ready: 0, discarded: 0 });

function TabBar({ tabs, active, onChange }) {
  return <div className="flex gap-1.5 overflow-x-auto pb-0.5">{tabs.map((tab) => <button key={tab.id} type="button" onClick={() => onChange(tab.id)} className={`${TAB_BUTTON} ${active === tab.id ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>{tab.label}</button>)}</div>;
}

function Section({ icon: Icon, title, helper, badge, children }) {
  return (
    <section className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {Icon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>}
          <div className="min-w-0"><h2 className="text-sm font-black text-foreground break-words">{title}</h2>{helper && <p className="mt-0.5 text-xs font-semibold leading-snug text-muted-foreground break-words">{helper}</p>}</div>
        </div>
        {badge && <span className="shrink-0 rounded-full border border-border px-2 py-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">{badge}</span>}
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value }) {
  return <div className="rounded-2xl border border-border bg-background/70 p-3"><p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-lg font-black text-foreground">{value}</p></div>;
}

function InfoRow({ label, value }) {
  return <div className="flex items-start justify-between gap-4 border-b border-border last:border-b-0 py-3"><span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span><span className="text-sm font-black text-foreground text-right break-words">{value}</span></div>;
}

function GuardrailBanner() {
  return <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3"><p className="text-xs font-black leading-snug text-amber-800">TEST/TRAINING handoff review only. LIVE transport is not active. No inventory, stock, price, accounting, or workflow mutation occurs here.</p></div>;
}

function QueueTab() {
  return (
    <div className="space-y-4">
      <GuardrailBanner />
      <Section icon={Database} title="Queue Status" helper="No default mock records are loaded. Future TEST/TRAINING queue records will appear here before desktop handoff.">
        <div className="grid grid-cols-2 gap-2"><Metric label="Pending" value={EMPTY_QUEUE.pending} /><Metric label="Review" value={EMPTY_QUEUE.review} /><Metric label="Ready" value={EMPTY_QUEUE.ready} /><Metric label="Discarded" value={EMPTY_QUEUE.discarded} /></div>
      </Section>
      <Section icon={HeartPulse} title="Sync Status" helper="Local queue health now lives inside Sync & Handoff, not the support drawer.">
        <SyncStatusPanel />
      </Section>
      <Section icon={CheckCircle2} title="No sync records yet" helper="Records created in TEST or TRAINING mode will appear here before desktop handoff.">
        <div className="rounded-2xl bg-secondary/60 px-4 py-5 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 text-sm font-black text-foreground">Queue is empty</p><p className="mt-1 text-xs font-semibold text-muted-foreground">There are no pending, review, ready, or discarded records by default.</p></div>
      </Section>
    </div>
  );
}

function SyncStatusPanel() {
  const summary = getSyncSummary();
  const pendingTotal = Number(summary.pending || 0) + Number(summary.queued || 0);
  const blockedTotal = Number(summary.failed || 0) + Number(summary.conflict || 0);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-border bg-background/70 p-3"><RefreshCw className="h-5 w-5 text-primary mb-2" /><p className="text-xs font-black text-foreground">Local Queue</p><p className="text-xs font-semibold text-muted-foreground">Ready for future TEST/TRAINING handoff</p></div>
        <div className="rounded-2xl border border-border bg-background/70 p-3"><FileJson2 className="h-5 w-5 text-primary mb-2" /><p className="text-xs font-black text-foreground">Pending Sync</p><p className="text-xs font-semibold text-muted-foreground">{pendingTotal} candidate records</p></div>
        <div className="rounded-2xl border border-border bg-background/70 p-3"><ShieldAlert className="h-5 w-5 text-primary mb-2" /><p className="text-xs font-black text-foreground">Blocked</p><p className="text-xs font-semibold text-muted-foreground">{blockedTotal} blocked records</p></div>
      </div>
      <div className="rounded-2xl bg-secondary/60 px-4 py-3"><InfoRow label="Transport" value="Not active" /><InfoRow label="Mode" value="TEST/TRAINING only" /><InfoRow label="Mutation" value="Blocked" /></div>
    </div>
  );
}

function Field({ label, placeholder, value, onChange, helper }) {
  return <div className="space-y-1.5"><label className="text-xs font-black uppercase tracking-wider text-muted-foreground">{label}</label>{helper && <p className="text-xs text-muted-foreground">{helper}</p>}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm font-bold text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20" /></div>;
}

function SetupTab() {
  const [config, setConfig] = useState(() => { try { return JSON.parse(localStorage.getItem(SETUP_STORAGE_KEY) || "{}"); } catch { return {}; } });
  const [saved, setSaved] = useState(false);
  const update = (key, value) => setConfig((prev) => ({ ...prev, [key]: value }));
  const save = () => { localStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(config)); setSaved(true); setTimeout(() => setSaved(false), 2500); };
  const endpointPreview = useMemo(() => { if (!config.ipAddress) return null; return `http://${config.ipAddress}${config.port ? `:${config.port}` : ""}${config.path || "/"}`; }, [config]);
  return (
    <div className="space-y-4"><GuardrailBanner /><Section icon={Settings2} title="Handoff Endpoint" helper="Configure the future TEST/TRAINING desktop destination. Saving this form does not start transport or send records."><Field label="Desktop IP Address" placeholder="e.g. 192.168.1.50" value={config.ipAddress || ""} onChange={(value) => update("ipAddress", value)} helper="Static IP of the desktop machine running the inventory system." /><Field label="Port" placeholder="e.g. 8080" value={config.port || ""} onChange={(value) => update("port", value)} helper="Port the future desktop handoff listener will use." /><Field label="Store / Location ID" placeholder="e.g. STORE-01" value={config.storeId || ""} onChange={(value) => update("storeId", value)} helper="Used to scope future records to this store location." /><Field label="Endpoint path optional" placeholder="e.g. /scanops/handoff" value={config.path || ""} onChange={(value) => update("path", value)} helper="Leave blank to use the root path." /><button type="button" onClick={save} className={BTN_PRIMARY}><Save className="h-4 w-4" />{saved ? "Saved locally" : "Save Configuration"}</button></Section>{endpointPreview && <Section icon={FileJson2} title="Current Endpoint Preview" helper="Stored locally for future TEST/TRAINING handoff setup only."><p className="font-mono text-sm font-bold text-foreground break-all">{endpointPreview}</p></Section>}<Section icon={ShieldAlert} title="Setup Guide" helper="Use this as a checklist only. The real listener remains a later controlled step."><div className="space-y-2">{[["1. Connect to store WiFi", "Ensure the handheld and desktop are on the same network."], ["2. Set desktop IP", "Assign a static IP to the desktop running Inventory."], ["3. Enter IP + port", "Save the TEST/TRAINING endpoint configuration."], ["4. Start desktop listener later", "Do this only after the approved bridge listener exists."]].map(([title, desc]) => <div key={title} className="rounded-2xl bg-secondary/60 px-3 py-2.5"><p className="text-xs font-black text-foreground">{title}</p><p className="mt-0.5 text-xs font-semibold text-muted-foreground">{desc}</p></div>)}</div></Section></div>
  );
}

function ContractsTab() {
  return (
    <div className="space-y-4"><GuardrailBanner /><Section icon={GitBranch} title="Contract Status" helper="Payload envelope inspection shell. No fake payload is selected by default."><div className="grid grid-cols-2 gap-2"><Metric label="Mode" value="Contract Preview" /><Metric label="Transport" value="Not connected" /><Metric label="Waiting" value="0" /><Metric label="Review req." value="0" /></div></Section><Section icon={FileJson2} title="No payload selected" helper="Create or select a TEST/TRAINING queue record later to inspect its contract."><div className="rounded-2xl bg-secondary/60 px-4 py-3"><InfoRow label="Action" value="Preview only" /><InfoRow label="Mutation" value="Blocked" /><InfoRow label="Review queue" value="None" /></div></Section><Section icon={LockKeyhole} title="Workflow Contracts" helper={DESKTOP_SYNC_CONTRACT_VERSION} badge="Preview"><div className="space-y-2">{WORKFLOW_SYNC_CONTRACTS.map((contract) => <div key={contract.stage} className="rounded-2xl border border-border bg-background/70 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-black text-foreground">Stage {contract.stage} · {contract.workflow}</p><p className="mt-1 text-xs font-bold leading-snug text-muted-foreground">{contract.desktopBehavior}</p></div><span className="shrink-0 rounded-full border border-border px-2 py-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">{contract.eventTypes.length} events</span></div></div>)}</div></Section></div>
  );
}

export default function SyncHandoff() {
  const session = useScanOpsSession();
  const isManager = hasRoleAtLeast(session?.actorRole, "Manager");
  const mainTabs = [{ id: "queue", label: "Queue" }, ...(isManager ? [{ id: "setup", label: "Setup" }] : []), ...(isManager ? [{ id: "contracts", label: "Contracts" }] : [])];
  const [activeMain, setActiveMain] = useState("queue");
  useEffect(() => { createScanOpsEvent(SCANOPS_EVENT_TYPES.SYNC_STATUS_VIEWED, { source_module: "Sync & Handoff", status: "viewed", sync_exempt: true }); }, []);
  return <div className="min-h-screen bg-background flex flex-col overflow-x-hidden"><PageHeader title="Sync & Handoff" subtitle="Queue · Status · Setup · Contracts" /><main className="flex-1 px-4 py-4 pb-8 space-y-4 overflow-y-auto overflow-x-hidden" data-scanops-scroll><TabBar tabs={mainTabs} active={activeMain} onChange={setActiveMain} />{activeMain === "queue" && <QueueTab />}{activeMain === "setup" && <SetupTab />}{activeMain === "contracts" && <ContractsTab />}</main></div>;
}
