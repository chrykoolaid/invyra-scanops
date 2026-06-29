import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/scanner/PageHeader";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Database,
  FileJson2,
  GitBranch,
  HeartPulse,
  Laptop,
  LockKeyhole,
  MapPin,
  Network,
  PlugZap,
  RefreshCw,
  Router,
  Save,
  Settings2,
  ShieldAlert,
  Wifi,
  WifiOff,
} from "lucide-react";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { useScanOpsSession } from "../lib/scanOpsSession";
import { hasRoleAtLeast } from "../lib/scanOpsPermissions";
import { DESKTOP_SYNC_CONTRACT_VERSION, WORKFLOW_SYNC_CONTRACTS } from "../lib/scanOpsDesktopSyncContract";
import { getNetworkMode, getSyncQueue, getSyncSummary, retryAllSyncEvents } from "../lib/scanOpsSync";

const SETUP_STORAGE_KEY = "scanops_sync_endpoint_config";
const KNOWN_DESKTOPS_KEY = "scanops_known_inventory_desktops_v1";
const TEST_RESULTS_KEY = "scanops_connectivity_test_results_v1";

const BTN_PRIMARY = "min-h-12 rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground active:scale-[0.98] disabled:opacity-40";
const BTN_SECONDARY = "min-h-12 rounded-2xl bg-secondary px-4 text-sm font-black text-secondary-foreground active:bg-border disabled:opacity-40";
const TAB_BUTTON = "shrink-0 rounded-2xl px-3 py-2.5 text-xs font-black border transition-all active:scale-[0.98]";

function safeRead(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key, value) {
  if (typeof window === "undefined") return value;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
  return value;
}

function nowLabel() {
  try {
    return new Date().toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" });
  } catch {
    return "Just now";
  }
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`${TAB_BUTTON} ${active === tab.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function Section({ icon: Icon, title, helper, badge, children, className = "" }) {
  return (
    <section className={`rounded-3xl border border-border bg-card p-4 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="break-words text-sm font-black text-foreground">{title}</h2>
            {helper && <p className="mt-1 break-words text-xs font-semibold leading-snug text-muted-foreground">{helper}</p>}
          </div>
        </div>
        {badge && <span className="shrink-0 rounded-full border border-border px-2 py-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">{badge}</span>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}

function Metric({ label, value, helper }) {
  return (
    <div className="min-w-0 rounded-2xl bg-secondary/70 px-3 py-2">
      <p className="truncate text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-black text-foreground">{value}</p>
      {helper && <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-snug text-muted-foreground">{helper}</p>}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="break-words text-right text-sm font-black text-foreground">{value}</span>
    </div>
  );
}

function GuardrailBanner() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-xs font-black leading-snug text-amber-800">
        ScanOps shows connectivity and queue health only. Android/device OS manages Wi‑Fi joining and passwords. Inventory Desktop remains the system of record.
      </p>
    </div>
  );
}

function getBridgeState(networkMode, summary, config) {
  const hasEndpoint = Boolean(config?.ipAddress);
  if (networkMode === "offline") return { state: "offline", label: "Offline Mode", helper: "Work is saved locally and will sync later.", Icon: WifiOff };
  if (!hasEndpoint) return { state: "disconnected", label: "Desktop Not Paired", helper: "Pair or enter the Inventory Desktop address.", Icon: PlugZap };
  if (summary.failed || summary.conflict || summary.needsReview || summary.duplicate || summary.escalated) return { state: "warning", label: "Attention Needed", helper: "Some records need retry or review.", Icon: AlertTriangle };
  if (summary.pending || summary.syncing) return { state: "syncing", label: "Pending Handoff", helper: "Records are waiting for desktop handoff.", Icon: RefreshCw };
  return { state: "connected", label: "Connected", helper: "Inventory Desktop profile is ready.", Icon: CheckCircle2 };
}

function statusTone(state) {
  if (state === "connected") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (state === "syncing") return "border-blue-200 bg-blue-50 text-blue-800";
  if (state === "warning") return "border-amber-200 bg-amber-50 text-amber-800";
  if (state === "offline") return "border-slate-200 bg-slate-50 text-slate-800";
  return "border-red-200 bg-red-50 text-red-800";
}

function OverviewTab({ config, setActiveTab, refreshKey, onTestConnection }) {
  const networkMode = getNetworkMode();
  const summary = getSyncSummary();
  const queue = getSyncQueue();
  const bridge = getBridgeState(networkMode, summary, config);
  const lastTest = safeRead(TEST_RESULTS_KEY, null);
  const BridgeIcon = bridge.Icon;
  const knownDesktops = safeRead(KNOWN_DESKTOPS_KEY, []);
  const activeProfile = knownDesktops.find((desktop) => desktop.id === config?.knownDesktopId) || knownDesktops[0] || null;

  return (
    <div className="space-y-4" key={refreshKey}>
      <GuardrailBanner />

      <section className={`rounded-3xl border p-4 shadow-sm ${statusTone(bridge.state)}`}>
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70">
            <BridgeIcon className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] opacity-80">Bridge Status</p>
            <h2 className="mt-1 text-2xl font-black leading-tight">{bridge.label}</h2>
            <p className="mt-1 text-sm font-bold leading-snug opacity-90">{bridge.helper}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Metric label="Queue" value={summary.pending || 0} helper="Pending" />
          <Metric label="Failed" value={summary.failed || 0} helper="Retry" />
          <Metric label="Review" value={(summary.conflict || 0) + (summary.needsReview || 0) + (summary.duplicate || 0)} helper="Needs action" />
        </div>
      </section>

      <Section icon={Router} title="Network" helper="Network status is read-only. Join Wi‑Fi in Android settings.">
        <div className="rounded-2xl bg-secondary/60 px-4 py-1">
          <InfoRow label="Mode" value={networkMode === "offline" ? "Offline" : "Online"} />
          <InfoRow label="Wi‑Fi" value="Managed by device OS" />
          <InfoRow label="IP Address" value="Shown by Android network settings" />
          <InfoRow label="Signal" value={networkMode === "offline" ? "Unavailable" : "Available"} />
        </div>
      </Section>

      <Section icon={Laptop} title="Inventory Desktop" helper="Known desktop profile used for ScanOps handoff setup.">
        <div className="rounded-2xl bg-secondary/60 px-4 py-1">
          <InfoRow label="Desktop" value={activeProfile?.name || config?.desktopName || "Not paired"} />
          <InfoRow label="Host" value={config?.ipAddress || activeProfile?.host || "Not set"} />
          <InfoRow label="Store" value={config?.storeId || activeProfile?.storeId || "Current store"} />
          <InfoRow label="Last heartbeat" value={lastTest?.createdAtLabel || "Not tested"} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className={BTN_PRIMARY} onClick={onTestConnection}>Test Connection</button>
          <button type="button" className={BTN_SECONDARY} onClick={() => setActiveTab("setup")}>Pair / Edit</button>
        </div>
      </Section>

      <Section icon={Database} title="Sync Queue" helper="Operational evidence waits here before desktop handoff.">
        <div className="grid grid-cols-2 gap-2">
          <Metric label="Total" value={summary.total || queue.length || 0} />
          <Metric label="Uploading" value={summary.syncing || 0} />
          <Metric label="Completed" value={summary.synced || 0} />
          <Metric label="Discarded" value={summary.discarded || 0} />
        </div>
        <button type="button" className={`mt-3 w-full ${BTN_SECONDARY}`} onClick={() => setActiveTab("queue")}>View Queue</button>
      </Section>

      <Section icon={ShieldAlert} title="Recovery Guidance" helper="Use this when the desktop is unavailable or sync is stuck.">
        <div className="space-y-2">
          {[
            ["Check Wi‑Fi", "Confirm Android is connected to the store network."],
            ["Check Desktop", "Make sure Inventory Desktop is open and the bridge listener is running."],
            ["Check Profile", "Confirm this handheld is paired to the correct desktop."],
            ["Retry Queue", "Retry failed technical handoff records after connection returns."],
          ].map(([title, helper]) => (
            <div key={title} className="flex items-start gap-3 rounded-2xl bg-secondary/60 px-3 py-3">
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-black text-foreground">{title}</p>
                <p className="mt-0.5 text-xs font-semibold leading-snug text-muted-foreground">{helper}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function QueueTab({ onRetryAll, refreshKey }) {
  const summary = getSyncSummary();
  const queue = getSyncQueue();
  const recent = queue.slice(0, 8);
  return (
    <div className="space-y-4" key={refreshKey}>
      <GuardrailBanner />
      <Section icon={Database} title="Queue Health" helper="Visible operational status for saved handheld evidence.">
        <div className="grid grid-cols-2 gap-2">
          <Metric label="Pending" value={summary.pending || 0} />
          <Metric label="Uploading" value={summary.syncing || 0} />
          <Metric label="Failed" value={summary.failed || 0} />
          <Metric label="Review" value={(summary.conflict || 0) + (summary.needsReview || 0) + (summary.duplicate || 0)} />
        </div>
        <button type="button" className={`mt-3 w-full ${BTN_PRIMARY}`} onClick={onRetryAll} disabled={!queue.length}>Retry Failed / Pending</button>
      </Section>

      <Section icon={Activity} title="Recent Queue Items" helper="Most recent items saved for future desktop handoff.">
        <div className="space-y-2">
          {recent.length ? recent.map((item) => (
            <div key={item.id || item.queueId} className="rounded-2xl bg-secondary/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-black text-foreground">{item.title || item.sourceWorkflow || "Sync item"}</p>
                  <p className="mt-1 break-words text-xs font-bold text-muted-foreground">{item.summary || item.sourceModule || "Saved on device"}</p>
                </div>
                <span className="shrink-0 rounded-full bg-card px-2 py-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">{item.statusLabel || item.status || "Pending"}</span>
              </div>
            </div>
          )) : (
            <div className="rounded-2xl bg-secondary/60 px-4 py-5 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm font-black text-foreground">Queue is empty</p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">New workflow evidence will appear here when created.</p>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

function Field({ label, placeholder, value, onChange, helper }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">{label}</label>
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm font-bold text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20" />
    </div>
  );
}

function SetupTab({ config, setConfig, onSave }) {
  const update = (key, value) => setConfig((prev) => ({ ...prev, [key]: value }));
  const endpointPreview = useMemo(() => {
    if (!config.ipAddress) return null;
    return `http://${config.ipAddress}${config.port ? `:${config.port}` : ""}${config.path || "/"}`;
  }, [config]);

  const saveKnownDesktop = () => {
    const desktop = {
      id: config.knownDesktopId || `desktop_${Date.now()}`,
      name: config.desktopName || "Inventory Desktop",
      host: config.ipAddress || "",
      port: config.port || "",
      storeId: config.storeId || "",
      savedAt: new Date().toISOString(),
    };
    const current = safeRead(KNOWN_DESKTOPS_KEY, []);
    const next = [desktop, ...current.filter((entry) => entry.id !== desktop.id)].slice(0, 6);
    safeWrite(KNOWN_DESKTOPS_KEY, next);
    update("knownDesktopId", desktop.id);
    onSave({ ...config, knownDesktopId: desktop.id });
  };

  return (
    <div className="space-y-4">
      <GuardrailBanner />
      <Section icon={Settings2} title="Desktop Pairing" helper="Save a known Inventory Desktop profile. This does not manage Wi‑Fi or bypass the bridge.">
        <div className="space-y-3">
          <Field label="Desktop name" placeholder="e.g. Back Office Inventory PC" value={config.desktopName || ""} onChange={(value) => update("desktopName", value)} helper="Friendly name staff can recognise." />
          <Field label="Desktop IP / hostname" placeholder="e.g. 192.168.1.50 or inventory-office.local" value={config.ipAddress || ""} onChange={(value) => update("ipAddress", value)} helper="Manual fallback when QR pairing or discovery is unavailable." />
          <Field label="Port" placeholder="e.g. 8080" value={config.port || ""} onChange={(value) => update("port", value)} helper="Bridge listener port, when available." />
          <Field label="Store / Location ID" placeholder="e.g. STORE-014" value={config.storeId || ""} onChange={(value) => update("storeId", value)} helper="Used for future handoff scoping." />
          <Field label="Endpoint path optional" placeholder="e.g. /scanops/handoff" value={config.path || ""} onChange={(value) => update("path", value)} helper="Leave blank for root path." />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onSave(config)} className={BTN_SECONDARY}><Save className="mr-2 inline h-4 w-4" />Save</button>
            <button type="button" onClick={saveKnownDesktop} className={BTN_PRIMARY}>Save Profile</button>
          </div>
        </div>
      </Section>

      {endpointPreview && (
        <Section icon={FileJson2} title="Endpoint Preview" helper="Stored locally for bridge setup visibility.">
          <p className="break-all font-mono text-sm font-bold text-foreground">{endpointPreview}</p>
        </Section>
      )}

      <Section icon={Network} title="Pairing Layers" helper="Locked ScanOps connectivity architecture.">
        <div className="space-y-2">
          {[
            ["QR Pairing", "Future quickest path for store setup."],
            ["Local Discovery", "Future same-network desktop detection."],
            ["Known Desktop Reconnect", "Reconnect to a saved desktop profile."],
            ["Manual IP / Hostname", "Fallback when discovery is unavailable."],
          ].map(([title, helper]) => (
            <div key={title} className="rounded-2xl bg-secondary/60 px-3 py-3">
              <p className="text-sm font-black text-foreground">{title}</p>
              <p className="mt-0.5 text-xs font-semibold leading-snug text-muted-foreground">{helper}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function DiagnosticsTab({ onTestConnection, refreshKey }) {
  const lastTest = safeRead(TEST_RESULTS_KEY, null);
  const config = safeRead(SETUP_STORAGE_KEY, {});
  return (
    <div className="space-y-4" key={refreshKey}>
      <Section icon={HeartPulse} title="Connection Test" helper="Checks local configuration readiness only. It does not send inventory data.">
        <div className="rounded-2xl bg-secondary/60 px-4 py-1">
          <InfoRow label="Desktop" value={config.desktopName || "Not set"} />
          <InfoRow label="Host" value={config.ipAddress || "Not set"} />
          <InfoRow label="Last test" value={lastTest?.createdAtLabel || "Not tested"} />
          <InfoRow label="Result" value={lastTest?.label || "Waiting"} />
        </div>
        <button type="button" className={`mt-3 w-full ${BTN_PRIMARY}`} onClick={onTestConnection}>Run Test</button>
      </Section>

      <Section icon={ShieldAlert} title="If Test Fails" helper="Show staff what to check next.">
        <div className="space-y-2">
          <Metric label="1" value="Open Android Wi‑Fi" helper="Confirm the handheld is on the store network." />
          <Metric label="2" value="Open Inventory Desktop" helper="Confirm the desktop app and bridge listener are running." />
          <Metric label="3" value="Check Desktop Profile" helper="Confirm IP/hostname, port, and store are correct." />
          <Metric label="4" value="Retry Queue" helper="Retry only after connectivity is restored." />
        </div>
      </Section>
    </div>
  );
}

function ContractsTab() {
  return (
    <div className="space-y-4">
      <GuardrailBanner />
      <Section icon={GitBranch} title="Contract Status" helper="Payload envelope inspection shell. No fake payload is selected by default.">
        <div className="grid grid-cols-2 gap-2"><Metric label="Mode" value="Contract Preview" /><Metric label="Transport" value="Bridge governed" /><Metric label="Mutation" value="Blocked" /><Metric label="Review" value="Required" /></div>
      </Section>
      <Section icon={LockKeyhole} title="Workflow Contracts" helper={DESKTOP_SYNC_CONTRACT_VERSION} badge="Preview">
        <div className="space-y-2">
          {WORKFLOW_SYNC_CONTRACTS.map((contract) => (
            <div key={contract.stage} className="rounded-2xl border border-border bg-background/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-foreground">Stage {contract.stage} · {contract.workflow}</p>
                  <p className="mt-1 text-xs font-bold leading-snug text-muted-foreground">{contract.desktopBehavior}</p>
                </div>
                <span className="shrink-0 rounded-full border border-border px-2 py-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">{contract.eventTypes.length} events</span>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

export default function SyncHandoff() {
  const session = useScanOpsSession();
  const isManager = hasRoleAtLeast(session?.actorRole, "Manager");
  const [activeMain, setActiveMain] = useState("overview");
  const [refreshKey, setRefreshKey] = useState(0);
  const [config, setConfig] = useState(() => safeRead(SETUP_STORAGE_KEY, {}));
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "queue", label: "Queue" },
    ...(isManager ? [{ id: "setup", label: "Pairing" }] : []),
    { id: "diagnostics", label: "Diagnostics" },
    ...(isManager ? [{ id: "contracts", label: "Contracts" }] : []),
  ];

  useEffect(() => {
    createScanOpsEvent(SCANOPS_EVENT_TYPES.SYNC_STATUS_VIEWED, { source_module: "Sync & Connectivity", status: "viewed", sync_exempt: true });
  }, []);

  const saveConfig = (nextConfig) => {
    safeWrite(SETUP_STORAGE_KEY, nextConfig);
    setConfig(nextConfig);
    setRefreshKey((value) => value + 1);
  };

  const testConnection = () => {
    const latestConfig = safeRead(SETUP_STORAGE_KEY, config);
    const ok = Boolean(latestConfig.ipAddress || latestConfig.desktopName);
    const result = {
      ok,
      label: ok ? "Profile ready" : "Desktop not paired",
      helper: ok ? "Saved desktop profile is available for future bridge handoff." : "Add a desktop IP, hostname, or profile first.",
      createdAt: new Date().toISOString(),
      createdAtLabel: nowLabel(),
    };
    safeWrite(TEST_RESULTS_KEY, result);
    createScanOpsEvent(SCANOPS_EVENT_TYPES.SYNC_STATUS_VIEWED, {
      source_module: "Sync & Connectivity",
      status: ok ? "profile_ready" : "desktop_not_paired",
      sync_exempt: true,
    });
    setRefreshKey((value) => value + 1);
  };

  const retryAll = () => {
    retryAllSyncEvents();
    setRefreshKey((value) => value + 1);
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background">
      <PageHeader title="Sync & Connectivity" subtitle="Bridge status · Queue · Pairing · Recovery" />
      <main className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4 pb-8" data-scanops-scroll>
        <TabBar tabs={tabs} active={activeMain} onChange={setActiveMain} />
        {activeMain === "overview" && <OverviewTab config={config} setActiveTab={setActiveMain} refreshKey={refreshKey} onTestConnection={testConnection} />}
        {activeMain === "queue" && <QueueTab onRetryAll={retryAll} refreshKey={refreshKey} />}
        {activeMain === "setup" && <SetupTab config={config} setConfig={setConfig} onSave={saveConfig} />}
        {activeMain === "diagnostics" && <DiagnosticsTab onTestConnection={testConnection} refreshKey={refreshKey} />}
        {activeMain === "contracts" && <ContractsTab />}
        <Section icon={MapPin} title="Session Context" helper="Visible context reduces shared-device mistakes.">
          <div className="grid grid-cols-2 gap-2">
            <Metric label="User" value={session.actorName || "Operator"} />
            <Metric label="Role" value={session.actorRole || "Staff"} />
            <Metric label="Store" value={session.storeName || session.storeId || "Current"} />
            <Metric label="Device" value={session.deviceId || session.scannerId || "Scanner"} />
          </div>
        </Section>
      </main>
    </div>
  );
}
