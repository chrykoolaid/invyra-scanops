import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  GitBranch,
  HeartPulse,
  Link2,
  LockKeyhole,
  MapPin,
  Network,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Unplug,
  Wifi,
  WifiOff,
} from 'lucide-react';
import PageHeader from '../components/scanner/PageHeader';
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from '../lib/scanOpsEvents';
import { useScanOpsSession } from '../lib/scanOpsSession';
import { hasRoleAtLeast } from '../lib/scanOpsPermissions';
import { DESKTOP_SYNC_CONTRACT_VERSION, WORKFLOW_SYNC_CONTRACTS } from '../lib/scanOpsDesktopSyncContract';
import { getNetworkMode, getSyncQueue, getSyncSummary, retryAllSyncEvents } from '../lib/scanOpsSync';
import {
  clearLiveConnection,
  getLastLiveConnectionResult,
  getLiveConnectionProfile,
  pairInventoryDesktop,
  runLiveBridgeHealthTest,
} from '../lib/scanOpsLiveConnectivity';

const HOST_KEY = 'invyra_scanops_phase39_0b_inventory_host_v1';
const PORT_KEY = 'invyra_scanops_phase39_0b_inventory_port_v1';
const BTN_PRIMARY = 'min-h-12 rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground active:scale-[0.98] disabled:opacity-40';
const BTN_SECONDARY = 'min-h-12 rounded-2xl bg-secondary px-4 text-sm font-black text-secondary-foreground active:bg-border disabled:opacity-40';
const TAB_BUTTON = 'shrink-0 rounded-2xl px-3 py-2.5 text-xs font-black border transition-all active:scale-[0.98]';

function safeRead(key, fallback = '') {
  if (typeof window === 'undefined') return fallback;
  try { return window.localStorage.getItem(key) || fallback; } catch { return fallback; }
}

function safeWrite(key, value) {
  try { window.localStorage.setItem(key, value); } catch {}
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`${TAB_BUTTON} ${active === tab.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function Section({ icon: Icon, title, helper, badge, children }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
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
      <p className="mt-0.5 break-words text-sm font-black text-foreground">{value}</p>
      {helper && <p className="mt-1 text-[11px] font-semibold leading-snug text-muted-foreground">{helper}</p>}
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

function Field({ label, helper, value, onChange, placeholder, inputMode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-black uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm font-bold text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
      />
      {helper && <span className="block text-xs font-semibold leading-snug text-muted-foreground">{helper}</span>}
    </label>
  );
}

function GuardrailBanner() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-xs font-black leading-snug text-amber-800">
        Connection setup permits temporary pairing and DEVICE_HEALTH_PING only. Inventory remains the system of record. Receiving, stock, ledger, Item Master, pricing, POS and approval mutations remain blocked.
      </p>
    </div>
  );
}

function bridgePresentation(profile, result, networkMode) {
  if (networkMode === 'offline') return { state: 'offline', label: 'Offline', helper: 'Connect this handheld to the store network.', Icon: WifiOff };
  if (result?.status === 'CONNECTED' && result?.ok && profile) return { state: 'connected', label: 'Connected', helper: 'Inventory accepted and correlated the trusted health request.', Icon: CheckCircle2 };
  if (result?.status === 'BLOCKED' || result?.status === 'FAILED' || result?.reason) return { state: 'warning', label: 'Action Needed', helper: result.message || 'Review pairing and connection details.', Icon: AlertTriangle };
  if (profile) return { state: 'paired', label: 'Paired · Not Tested', helper: 'Run the connection test to prove Inventory communication.', Icon: ShieldCheck };
  return { state: 'disconnected', label: 'Not Paired', helper: 'Enter the Inventory address, port and six-digit pairing code.', Icon: Unplug };
}

function statusTone(state) {
  if (state === 'connected') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (state === 'paired') return 'border-blue-200 bg-blue-50 text-blue-800';
  if (state === 'warning') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (state === 'offline') return 'border-slate-200 bg-slate-50 text-slate-800';
  return 'border-red-200 bg-red-50 text-red-800';
}

function OverviewTab({ profile, result, busy, onTest, onOpenPairing, onClear }) {
  const networkMode = getNetworkMode();
  const summary = getSyncSummary();
  const bridge = bridgePresentation(profile, result, networkMode);
  const BridgeIcon = bridge.Icon;
  return (
    <div className="space-y-4">
      <GuardrailBanner />
      <section className={`rounded-3xl border p-4 shadow-sm ${statusTone(bridge.state)}`}>
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70"><BridgeIcon className="h-6 w-6" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] opacity-80">Inventory Bridge</p>
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

      <Section icon={Network} title="Local network" helper="Both devices must be on the same private Wi-Fi/LAN for this pilot.">
        <div className="rounded-2xl bg-secondary/60 px-4 py-1">
          <InfoRow label="Network" value={networkMode === 'offline' ? 'Offline' : 'Online'} />
          <InfoRow label="Inventory host" value={profile?.inventoryHost || 'Not paired'} />
          <InfoRow label="Bridge port" value={profile?.inventoryPort || '—'} />
          <InfoRow label="Environment" value={profile?.environment || '—'} />
        </div>
      </Section>

      <Section icon={HeartPulse} title="Real connection test" helper="Sends DEVICE_HEALTH_PING and validates the canonical correlated receipt.">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={BTN_PRIMARY} disabled={busy || !profile} onClick={onTest}>{busy === 'test' ? 'Testing…' : 'Run Test'}</button>
          <button type="button" className={BTN_SECONDARY} disabled={busy} onClick={onOpenPairing}>{profile ? 'Pair Again' : 'Pair Device'}</button>
        </div>
        {profile && <button type="button" className={`mt-2 w-full ${BTN_SECONDARY}`} disabled={busy} onClick={onClear}>Clear Temporary Pairing</button>}
      </Section>

      {result && (
        <Section icon={result.ok ? CheckCircle2 : ShieldAlert} title="Last connection result" helper={result.message} badge={result.status}>
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Admission" value={result.admissionStatus || '—'} />
            <Metric label="Application" value={result.applicationStatus || '—'} />
            <Metric label="Receipt" value={result.receiptId || '—'} />
            <Metric label="Checked" value={result.checkedAt ? new Date(result.checkedAt).toLocaleTimeString() : '—'} />
          </div>
        </Section>
      )}
    </div>
  );
}

function PairingTab({ session, profile, result, busy, host, setHost, port, setPort, setupCode, setSetupCode, onPair, onTest }) {
  return (
    <div className="space-y-4">
      <GuardrailBanner />
      <Section icon={Link2} title="Pair Inventory Desktop" helper="Copy the desktop address, bridge port and six-digit code from Inventory Settings → Sync & Devices." badge="2-minute code">
        <div className="space-y-3">
          <Field label="Inventory desktop address" helper="Example: 192.168.1.50 or inventory-office.local" value={host} onChange={setHost} placeholder="192.168.1.50" />
          <Field label="Bridge port" helper="Default pilot port is 8788." value={port} onChange={setPort} placeholder="8788" inputMode="numeric" />
          <Field label="Six-digit pairing code" helper="Single-use and short-lived. Create a new code if it expires." value={setupCode} onChange={(value) => setSetupCode(value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" inputMode="numeric" />
          <button type="button" className={`w-full ${BTN_PRIMARY}`} disabled={busy || !host || !port || setupCode.length !== 6} onClick={onPair}>{busy === 'pair' ? 'Pairing…' : 'Pair This Device'}</button>
        </div>
      </Section>

      <Section icon={ShieldCheck} title="Device identity" helper="Inventory trust is limited to this current ScanOps device and session.">
        <div className="rounded-2xl bg-secondary/60 px-4 py-1">
          <InfoRow label="Device" value={session.deviceId || session.scannerId || 'Unavailable'} />
          <InfoRow label="Session" value={session.sessionId || session.shiftId || `session-${session.deviceId || 'scanops'}`} />
          <InfoRow label="Trust" value={profile ? 'Temporarily paired' : 'Not paired'} />
          <InfoRow label="Expires" value={profile?.trustExpiresAt ? new Date(profile.trustExpiresAt).toLocaleString() : '—'} />
        </div>
        {profile && <button type="button" className={`mt-3 w-full ${BTN_PRIMARY}`} disabled={busy} onClick={onTest}>Run Connection Test</button>}
      </Section>

      {result && result.kind === 'PAIRING' && (
        <Section icon={result.ok ? CheckCircle2 : AlertTriangle} title={result.ok ? 'Pairing complete' : 'Pairing failed'} helper={result.message} badge={result.status} />
      )}

      <Section icon={Wifi} title="Pilot requirement" helper="Hosted HTTPS pages cannot call this private HTTP pilot because browsers block mixed content.">
        <p className="rounded-2xl bg-secondary/60 px-4 py-3 text-xs font-semibold leading-relaxed text-muted-foreground">
          Open ScanOps from the controlled local HTTP address during Phase 39-0B. QR camera pairing and hosted secure transport remain later hardening work; this phase uses the same short-lived pairing offer through a six-digit setup code.
        </p>
      </Section>
    </div>
  );
}

function QueueTab({ onRetry, busy }) {
  const summary = getSyncSummary();
  const queue = getSyncQueue();
  return (
    <div className="space-y-4">
      <GuardrailBanner />
      <Section icon={Database} title="Queue health" helper="Existing ScanOps operational evidence remains separate from the connection pilot.">
        <div className="grid grid-cols-2 gap-2">
          <Metric label="Pending" value={summary.pending || 0} />
          <Metric label="Uploading" value={summary.syncing || 0} />
          <Metric label="Failed" value={summary.failed || 0} />
          <Metric label="Review" value={(summary.conflict || 0) + (summary.needsReview || 0) + (summary.duplicate || 0)} />
        </div>
        <button type="button" className={`mt-3 w-full ${BTN_PRIMARY}`} disabled={busy || !queue.length} onClick={onRetry}>Retry Failed / Pending</button>
      </Section>
      <Section icon={Activity} title="Recent queue items" helper="Most recent records saved on this handheld.">
        <div className="space-y-2">
          {queue.slice(0, 8).length ? queue.slice(0, 8).map((item) => (
            <div key={item.id || item.queueId} className="rounded-2xl bg-secondary/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-black text-foreground">{item.title || item.sourceWorkflow || 'Sync item'}</p>
                  <p className="mt-1 break-words text-xs font-bold text-muted-foreground">{item.summary || item.sourceModule || 'Saved on device'}</p>
                </div>
                <span className="shrink-0 rounded-full bg-card px-2 py-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">{item.statusLabel || item.status || 'Pending'}</span>
              </div>
            </div>
          )) : <p className="rounded-2xl bg-secondary/60 px-4 py-5 text-center text-sm font-black text-foreground">Queue is empty</p>}
        </div>
      </Section>
    </div>
  );
}

function ContractsTab() {
  return (
    <div className="space-y-4">
      <GuardrailBanner />
      <Section icon={GitBranch} title="Workflow contracts" helper={DESKTOP_SYNC_CONTRACT_VERSION} badge="Read-only">
        <div className="space-y-2">
          {WORKFLOW_SYNC_CONTRACTS.map((contract) => (
            <div key={contract.stage} className="rounded-2xl border border-border bg-background/70 p-3">
              <p className="text-sm font-black text-foreground">Stage {contract.stage} · {contract.workflow}</p>
              <p className="mt-1 text-xs font-bold leading-snug text-muted-foreground">{contract.desktopBehavior}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section icon={LockKeyhole} title="Application boundary" helper="Transport acceptance is not a business-operation approval.">
        <div className="grid grid-cols-2 gap-2">
          <Metric label="Pairing" value="Temporary" />
          <Metric label="Health" value="Real HTTP" />
          <Metric label="Receiving" value="Blocked" />
          <Metric label="Mutation" value="Inventory only" />
        </div>
      </Section>
    </div>
  );
}

export default function SyncHandoff() {
  const session = useScanOpsSession();
  const isManager = hasRoleAtLeast(session?.actorRole, 'Manager');
  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState(() => getLiveConnectionProfile());
  const [result, setResult] = useState(() => getLastLiveConnectionResult());
  const [host, setHost] = useState(() => safeRead(HOST_KEY));
  const [port, setPort] = useState(() => safeRead(PORT_KEY, '8788'));
  const [setupCode, setSetupCode] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    createScanOpsEvent(SCANOPS_EVENT_TYPES.SYNC_STATUS_VIEWED, {
      source_module: 'Sync & Connectivity',
      status: 'viewed',
      sync_exempt: true,
    });
  }, []);

  const pair = async () => {
    setBusy('pair');
    safeWrite(HOST_KEY, host);
    safeWrite(PORT_KEY, port);
    try {
      const next = await pairInventoryDesktop({ host, port: Number(port), setupCode, session });
      setResult(next);
      setProfile(getLiveConnectionProfile());
      if (next.ok) setSetupCode('');
      createScanOpsEvent(SCANOPS_EVENT_TYPES.SYNC_STATUS_VIEWED, {
        source_module: 'Sync & Connectivity', status: next.ok ? 'paired' : 'pairing_failed', sync_exempt: true,
      });
    } finally {
      setBusy('');
    }
  };

  const test = async () => {
    setBusy('test');
    try {
      const next = await runLiveBridgeHealthTest(session);
      setResult(next);
      setProfile(getLiveConnectionProfile());
      createScanOpsEvent(SCANOPS_EVENT_TYPES.SYNC_STATUS_VIEWED, {
        source_module: 'Sync & Connectivity', status: next.ok ? 'connected' : 'connection_failed', sync_exempt: true,
      });
    } finally {
      setBusy('');
    }
  };

  const clear = () => {
    clearLiveConnection();
    setProfile(null);
    setResult(null);
  };

  const retry = () => {
    setBusy('retry');
    try { retryAllSyncEvents(); } finally { setBusy(''); }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    ...(isManager ? [{ id: 'pairing', label: 'Pairing' }] : []),
    { id: 'queue', label: 'Queue' },
    ...(isManager ? [{ id: 'contracts', label: 'Contracts' }] : []),
  ];

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background">
      <PageHeader title="Sync & Connectivity" subtitle="Pair · Test · Queue · Recover" />
      <main className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4 pb-8" data-scanops-scroll>
        <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
        {activeTab === 'overview' && <OverviewTab profile={profile} result={result} busy={busy} onTest={test} onOpenPairing={() => setActiveTab(isManager ? 'pairing' : 'overview')} onClear={clear} />}
        {activeTab === 'pairing' && <PairingTab session={session} profile={profile} result={result} busy={busy} host={host} setHost={setHost} port={port} setPort={setPort} setupCode={setupCode} setSetupCode={setSetupCode} onPair={pair} onTest={test} />}
        {activeTab === 'queue' && <QueueTab onRetry={retry} busy={busy} />}
        {activeTab === 'contracts' && <ContractsTab />}
        <Section icon={MapPin} title="Session context" helper="Visible context reduces shared-device mistakes.">
          <div className="grid grid-cols-2 gap-2">
            <Metric label="User" value={session.actorName || 'Operator'} />
            <Metric label="Role" value={session.actorRole || 'Staff'} />
            <Metric label="Store" value={session.storeName || session.storeId || 'Current'} />
            <Metric label="Device" value={session.deviceId || session.scannerId || 'Scanner'} />
          </div>
        </Section>
      </main>
    </div>
  );
}
