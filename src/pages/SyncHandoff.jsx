import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HeartPulse,
  Link2,
  Loader2,
  Network,
  RefreshCw,
  ShieldCheck,
  Unplug,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from '../lib/scanOpsEvents';
import { useScanOpsSession } from '../lib/scanOpsSession';
import { getNetworkMode, getSyncSummary, retryAllSyncEvents } from '../lib/scanOpsSync';
import {
  clearLiveConnection,
  getLastLiveConnectionResult,
  getLiveConnectionProfile,
  pairInventoryDesktop,
  runLiveBridgeHealthTest,
} from '../lib/scanOpsLiveConnectivity';

const HOST_KEY = 'invyra_scanops_phase39_0b_inventory_host_v1';
const PORT_KEY = 'invyra_scanops_phase39_0b_inventory_port_v1';
const BTN_PRIMARY = 'min-h-12 w-full rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40';
const BTN_SECONDARY = 'min-h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm font-black text-foreground active:bg-secondary disabled:cursor-not-allowed disabled:opacity-40';

function safeRead(key, fallback = '') {
  if (typeof window === 'undefined') return fallback;
  try { return window.localStorage.getItem(key) || fallback; } catch { return fallback; }
}

function safeWrite(key, value) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, value); } catch {}
}

function Field({ label, helper, value, onChange, placeholder, inputMode = 'text' }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-black uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-base font-bold text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
      />
      {helper && <span className="block text-xs font-semibold leading-snug text-muted-foreground">{helper}</span>}
    </label>
  );
}

function StatusBadge({ icon: Icon, label, tone }) {
  const styles = tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-slate-200 bg-slate-50 text-slate-700';
  return (
    <span className={`inline-flex min-h-10 items-center gap-2 rounded-2xl border px-3 text-xs font-black ${styles}`}>
      <Icon className="h-4 w-4" />
      {label}
    </span>
  );
}

function Detail({ label, value }) {
  return (
    <div className="min-w-0 rounded-2xl bg-secondary/70 px-3 py-2.5">
      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-foreground">{value || '—'}</p>
    </div>
  );
}

function connectionState(profile, result, networkMode) {
  if (networkMode === 'offline') {
    return {
      key: 'offline',
      title: 'Network unavailable',
      helper: 'Connect this scanner to the store network, then try again.',
      icon: WifiOff,
      tone: 'neutral',
    };
  }
  if (profile && result?.ok === true && result?.status === 'CONNECTED') {
    return {
      key: 'connected',
      title: 'Connected to Inventory',
      helper: 'Inventory accepted and correlated the trusted connection check.',
      icon: CheckCircle2,
      tone: 'success',
    };
  }
  if (result && result.ok === false) {
    return {
      key: 'failed',
      title: 'Connection needs attention',
      helper: result.message || 'Review the Inventory bridge and pairing details.',
      icon: AlertTriangle,
      tone: 'warning',
    };
  }
  if (profile) {
    return {
      key: 'paired',
      title: 'Paired but not verified',
      helper: 'Test the connection to confirm Inventory can reach this scanner.',
      icon: ShieldCheck,
      tone: 'warning',
    };
  }
  return {
    key: 'disconnected',
    title: 'Inventory not connected',
    helper: 'Use the six-digit pairing code shown by Inventory Desktop.',
    icon: Unplug,
    tone: 'neutral',
  };
}

function toneClasses(tone) {
  if (tone === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  if (tone === 'warning') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-slate-200 bg-slate-50 text-slate-900';
}

export default function SyncHandoff() {
  const session = useScanOpsSession();
  const networkMode = getNetworkMode();
  const [profile, setProfile] = useState(() => getLiveConnectionProfile());
  const [result, setResult] = useState(() => getLastLiveConnectionResult());
  const [host, setHost] = useState(() => safeRead(HOST_KEY, '127.0.0.1'));
  const [port, setPort] = useState(() => safeRead(PORT_KEY, '8788'));
  const [setupCode, setSetupCode] = useState('');
  const [busy, setBusy] = useState('');
  const [showSetup, setShowSetup] = useState(() => !getLiveConnectionProfile());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localError, setLocalError] = useState('');
  const summary = getSyncSummary();
  const state = useMemo(() => connectionState(profile, result, networkMode), [profile, result, networkMode]);
  const StateIcon = state.icon;

  useEffect(() => {
    createScanOpsEvent(SCANOPS_EVENT_TYPES.SYNC_STATUS_VIEWED, {
      source_module: 'Sync & Connectivity',
      status: 'viewed',
      sync_exempt: true,
    });
  }, []);

  const refreshProfile = () => setProfile(getLiveConnectionProfile());

  const connect = async () => {
    setLocalError('');
    safeWrite(HOST_KEY, host.trim());
    safeWrite(PORT_KEY, port.trim());
    setBusy('pair');
    try {
      const pairingResult = await pairInventoryDesktop({
        host: host.trim(),
        port: Number(port),
        setupCode,
        session,
      });
      setResult(pairingResult);
      refreshProfile();

      if (!pairingResult.ok) {
        createScanOpsEvent(SCANOPS_EVENT_TYPES.SYNC_STATUS_VIEWED, {
          source_module: 'Sync & Connectivity',
          status: 'pairing_failed',
          sync_exempt: true,
        });
        return;
      }

      setSetupCode('');
      setBusy('test');
      const healthResult = await runLiveBridgeHealthTest(session);
      setResult(healthResult);
      refreshProfile();
      setShowSetup(!healthResult.ok);
      createScanOpsEvent(SCANOPS_EVENT_TYPES.SYNC_STATUS_VIEWED, {
        source_module: 'Sync & Connectivity',
        status: healthResult.ok ? 'connected' : 'connection_failed',
        sync_exempt: true,
      });
    } catch (error) {
      setLocalError(error?.message || 'Connection setup could not be completed.');
    } finally {
      setBusy('');
    }
  };

  const testConnection = async () => {
    setLocalError('');
    setBusy('test');
    try {
      const next = await runLiveBridgeHealthTest(session);
      setResult(next);
      refreshProfile();
      createScanOpsEvent(SCANOPS_EVENT_TYPES.SYNC_STATUS_VIEWED, {
        source_module: 'Sync & Connectivity',
        status: next.ok ? 'connected' : 'connection_failed',
        sync_exempt: true,
      });
    } catch (error) {
      setLocalError(error?.message || 'Connection test could not be completed.');
    } finally {
      setBusy('');
    }
  };

  const disconnect = () => {
    clearLiveConnection();
    setProfile(null);
    setResult(null);
    setSetupCode('');
    setShowSetup(true);
    setLocalError('');
  };

  const retryQueue = () => {
    setBusy('retry');
    try { retryAllSyncEvents(); } finally { setBusy(''); }
  };

  const codeReady = Boolean(/^\d{6}$/.test(setupCode) && host.trim() && /^\d+$/.test(port));

  return (
    <div className="min-h-screen bg-background px-4 py-4 pb-28" data-scanops-scroll>
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatusBadge icon={CheckCircle2} label="Scanner ready" tone="success" />
          <StatusBadge
            icon={state.key === 'connected' ? CheckCircle2 : Unplug}
            label={state.key === 'connected' ? 'Inventory connected' : 'Inventory not connected'}
            tone={state.key === 'connected' ? 'success' : 'neutral'}
          />
        </div>

        <section className={`rounded-3xl border p-5 shadow-sm ${toneClasses(state.tone)}`}>
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70">
              <StateIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] opacity-75">Inventory connection</p>
              <h1 className="mt-1 text-2xl font-black leading-tight">{state.title}</h1>
              <p className="mt-1 text-sm font-bold leading-snug opacity-90">{state.helper}</p>
            </div>
          </div>

          {state.key === 'connected' && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Detail label="Inventory" value={profile?.inventoryInstanceId} />
              <Detail label="Store" value={profile?.storeId} />
              <Detail label="Environment" value={profile?.environment} />
              <Detail label="Device" value={profile?.deviceId || session?.deviceId || session?.scannerId} />
            </div>
          )}
        </section>

        {state.key === 'connected' ? (
          <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-base font-black text-foreground">Connection controls</h2>
            <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">The scanner is connected. Test it again only when troubleshooting.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" aria-label="Run Connection Test" className={BTN_PRIMARY} disabled={Boolean(busy)} onClick={testConnection}>
                {busy === 'test' ? 'Testing…' : 'Test connection'}
              </button>
              <button type="button" className={BTN_SECONDARY} disabled={Boolean(busy)} onClick={disconnect}>Disconnect</button>
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
            {!showSetup ? (
              <>
                <h2 className="text-lg font-black text-foreground">Connect this scanner</h2>
                <p className="mt-1 text-sm font-semibold leading-snug text-muted-foreground">Create a two-minute setup code in Inventory Desktop, then continue here.</p>
                <button type="button" className={`mt-4 ${BTN_PRIMARY}`} onClick={() => setShowSetup(true)}>Connect to Inventory</button>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Link2 className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-lg font-black text-foreground">Enter Inventory setup code</h2>
                    <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">Inventory Desktop → Settings → Sync & Devices → Create pairing code</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <Field label="Inventory address" helper="Use 127.0.0.1 when both apps run on this computer." value={host} onChange={setHost} placeholder="127.0.0.1" />
                  <Field label="Bridge port" helper="The default pilot port is 8788." value={port} onChange={(value) => setPort(value.replace(/\D/g, '').slice(0, 5))} placeholder="8788" inputMode="numeric" />
                  <Field label="Six-digit pairing code" helper="The code is single-use and expires after two minutes." value={setupCode} onChange={(value) => setSetupCode(value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" inputMode="numeric" />
                </div>

                <button type="button" className={`mt-4 ${BTN_PRIMARY}`} disabled={Boolean(busy) || !codeReady || networkMode === 'offline'} onClick={connect}>
                  {busy === 'pair' ? 'Pairing scanner…' : busy === 'test' ? 'Testing connection…' : 'Connect scanner'}
                </button>

                {busy && (
                  <div className="mt-3 rounded-2xl bg-secondary/70 px-4 py-3 text-sm font-bold text-foreground">
                    <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{busy === 'pair' ? 'Verifying code and pairing trusted device…' : 'Confirming Inventory connection…'}</div>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {(localError || (result && result.ok === false)) && (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-4 text-red-900 shadow-sm">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-sm font-black">Connection failed</h2>
                <p className="mt-1 text-xs font-semibold leading-snug">{localError || result?.message}</p>
                <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs font-semibold">
                  <li>Confirm the Inventory bridge shows Online.</li>
                  <li>Create a fresh two-minute setup code.</li>
                  <li>Confirm the address and port match Inventory.</li>
                  <li>Keep both apps on the same local network.</li>
                </ol>
                <button type="button" className={`mt-3 ${BTN_SECONDARY}`} onClick={() => setShowSetup(true)}>Enter a new code</button>
              </div>
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <button type="button" className="flex min-h-14 w-full items-center gap-3 px-4 text-left" onClick={() => setShowAdvanced((current) => !current)}>
            <Network className="h-5 w-5 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-foreground">Advanced diagnostics</span>
              <span className="block text-xs font-semibold text-muted-foreground">Queue, endpoint and temporary trust details</span>
            </span>
            {showAdvanced ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>

          {showAdvanced && (
            <div className="space-y-3 border-t border-border p-4">
              <div className="grid grid-cols-2 gap-2">
                <Detail label="Network" value={networkMode === 'offline' ? 'Offline' : 'Online'} />
                <Detail label="Pending queue" value={String(summary.pending || 0)} />
                <Detail label="Endpoint" value={profile ? `http://${profile.inventoryHost}:${profile.inventoryPort}` : `${host}:${port}`} />
                <Detail label="Trust expires" value={profile?.trustExpiresAt ? new Date(profile.trustExpiresAt).toLocaleString() : 'Not paired'} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" aria-label="Run Connection Test" className={BTN_SECONDARY} disabled={Boolean(busy) || !profile} onClick={testConnection}>
                  <HeartPulse className="mr-2 inline h-4 w-4" /> Test
                </button>
                <button type="button" className={BTN_SECONDARY} disabled={Boolean(busy) || !(summary.pending || summary.failed)} onClick={retryQueue}>
                  <RefreshCw className="mr-2 inline h-4 w-4" /> Retry queue
                </button>
              </div>
              {result?.receiptId && (
                <div className="rounded-2xl bg-secondary/70 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Last verified receipt</p>
                  <p className="mt-1 break-all text-xs font-bold text-foreground">{result.receiptId}</p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">Admission {result.admissionStatus || '—'} · Application {result.applicationStatus || '—'}</p>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-snug text-amber-900">
          Connection setup and health testing only. Inventory remains the authority for stock, ledger, receiving, Item Master, pricing and approvals.
        </section>
      </div>
    </div>
  );
}
