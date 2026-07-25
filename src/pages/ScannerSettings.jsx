import React, { useState } from "react";
import {
  Accessibility,
  Activity,
  ArrowLeft,
  BellRing,
  Camera,
  CheckCircle2,
  ChevronRight,
  Database,
  Info,
  Keyboard,
  LockKeyhole,
  MonitorSmartphone,
  PlugZap,
  Printer,
  Radio,
  RefreshCw,
  ScanBarcode,
  ShieldCheck,
  Smartphone,
  UserRound,
  Volume2,
  Wifi,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "next-themes";
import AppHeader from "../components/scanner/AppHeader";
import { createScanOpsAuditEvent } from "../lib/scanOpsAudit";
import { SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { useScanOpsSession } from "../lib/scanOpsSession";
import { getNetworkMode, getSyncSummary } from "../lib/scanOpsSync";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import {
  getBridgeHealth,
  getConnectivitySetupMethods,
  getDeviceConnectionProfile,
  runConnectionTest,
} from "../lib/scanOpsConnectivity";

const SETTINGS_TILES = [
  { key: "device", icon: Smartphone, label: "Device", description: "Wi-Fi & battery", tone: "blue" },
  { key: "scanner", icon: ScanBarcode, label: "Scanner", description: "Input & test", tone: "blue" },
  { key: "printer", icon: Printer, label: "Printer", description: "Labels", tone: "blue" },
  { key: "sync", icon: Database, label: "Sync", description: "Connectivity", tone: "purple" },
  { key: "feedback", icon: BellRing, label: "Feedback", description: "Beep & haptics", tone: "cyan" },
  { key: "accessibility", icon: Accessibility, label: "Accessibility", description: "Usability", tone: "green" },
  { key: "session", icon: LockKeyhole, label: "Session", description: "User & timeout", tone: "amber" },
  { key: "diagnostics", icon: Activity, label: "Diagnostics", description: "Tests", tone: "amber" },
  { key: "about", icon: Info, label: "About", description: "Version", tone: "grey" },
];

const VALID_WORKSPACES = new Set(SETTINGS_TILES.map((tile) => tile.key));

const toneClasses = {
  blue: "bg-blue-950/95 text-blue-50 active:bg-blue-900",
  green: "bg-emerald-950/95 text-emerald-50 active:bg-emerald-900",
  purple: "bg-purple-950/95 text-purple-50 active:bg-purple-900",
  cyan: "bg-cyan-950/95 text-cyan-50 active:bg-cyan-900",
  grey: "bg-slate-800 text-slate-50 active:bg-slate-700",
  amber: "bg-amber-900/95 text-amber-50 active:bg-amber-800",
};

function SettingsTile({ icon: Icon, label, description, tone = "grey", onClick }) {
  return (
    <button type="button" onClick={onClick} className={`flex h-[92px] min-h-[92px] w-full flex-col items-center justify-center rounded-2xl border border-white/5 px-2 py-2.5 text-center transition-all duration-150 active:scale-[0.98] ${toneClasses[tone] || toneClasses.grey}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-current"><Icon className="h-4 w-4" /></span>
      <span className="mt-1.5 min-w-0"><span className="block text-[12px] font-black leading-tight text-current">{label}</span><span className="mt-0.5 block text-[9.5px] font-bold leading-snug text-current/70">{description}</span></span>
    </button>
  );
}

function WorkspaceShell({ icon: Icon, label, title, helper, children, onBack }) {
  return (
    <section className="mt-2 rounded-2xl border border-white/10 bg-slate-900/80 p-3" aria-label={`${title} settings workspace`}>
      <button type="button" onClick={onBack} className="mb-3 flex min-h-10 items-center gap-2 rounded-2xl bg-slate-800 px-3 text-xs font-black text-slate-100 active:bg-slate-700"><ArrowLeft className="h-4 w-4" /> Settings</button>
      <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-slate-100"><Icon className="h-5 w-5" /></span><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p><h2 className="mt-1 text-base font-black text-slate-50">{title}</h2><p className="mt-1 text-xs font-bold leading-snug text-slate-400">{helper}</p></div></div>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function WorkspaceSection({ title, helper, children }) {
  return <div className="rounded-2xl bg-slate-800/70 p-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{title}</p>{helper && <p className="mt-1 text-xs font-bold leading-snug text-slate-300">{helper}</p>}<div className="mt-3 space-y-2">{children}</div></div>;
}

function InfoGrid({ rows }) {
  return <div className="grid grid-cols-2 gap-2">{rows.map(([label, value]) => <div key={label} className="min-w-0 rounded-2xl bg-slate-900/80 px-3 py-2"><p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-0.5 truncate text-xs font-black text-slate-50">{value || "—"}</p></div>)}</div>;
}

function SettingRow({ icon: Icon = ChevronRight, title, helper, value, action, onClick, disabled = false }) {
  return <button type="button" onClick={onClick} disabled={disabled || !onClick} className={`flex min-h-12 w-full items-center gap-3 rounded-2xl bg-slate-900/80 px-3 py-2 text-left ${onClick ? "active:bg-slate-700" : "cursor-default"} disabled:opacity-60`}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-100"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-black text-slate-50">{title}</span>{helper && <span className="mt-0.5 block text-[10.5px] font-bold leading-snug text-slate-400">{helper}</span>}</span>{value && <span className="shrink-0 rounded-full bg-slate-800 px-2 py-1 text-[10px] font-black text-slate-200">{value}</span>}{action && <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />}</button>;
}

function ToggleRow({ icon: Icon, title, helper, checked, onToggle }) { return <SettingRow icon={Icon} title={title} helper={helper} value={checked ? "On" : "Off"} onClick={onToggle} />; }

function ChoiceRow({ title, choices, value, onChange }) {
  return <div className="rounded-2xl bg-slate-900/80 p-3"><p className="text-xs font-black text-slate-50">{title}</p><div className="mt-2 grid grid-cols-3 gap-2">{choices.map((choice) => <button key={choice} type="button" onClick={() => onChange(choice)} className={`min-h-10 rounded-xl px-2 text-[11px] font-black active:scale-[0.98] ${value === choice ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"}`}>{choice}</button>)}</div></div>;
}

function PlannedList({ items }) { return <div className="rounded-2xl bg-slate-800/70 px-3 py-2"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Planned</p><p className="mt-1 text-xs font-bold leading-snug text-slate-300">{items.join(" · ")}</p></div>; }

function ScannerTest() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const runTest = (event) => { event.preventDefault(); const value = input.trim(); if (!value) return; const resolved = resolveInventoryIdentity(value); const audit = createScanOpsAuditEvent(SCANOPS_EVENT_TYPES.SCANNER_TEST_SCANNED, { status: resolved ? "test_resolved" : "test_unresolved", scanned_value: value, resolved_item_id: resolved?.id || null, resolved_sku: resolved?.sku || null, stock_mutation: false }); setResult({ value, resolved, traceId: audit.traceId || audit.trace_id }); };
  return <form onSubmit={runTest} className="space-y-2"><div className="flex gap-2"><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Scan or enter barcode / PLU" className="min-w-0 flex-1 h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm font-bold text-slate-50 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-300/20" /><button type="submit" className="flex w-12 items-center justify-center rounded-xl bg-blue-600 text-white"><ScanBarcode className="h-5 w-5" /></button></div>{result && <div className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-400"><p className="font-black text-slate-50">Input accepted · no stock mutation</p><p className="truncate">Trace: {result.traceId}</p><p className="truncate">{result.resolved ? `${result.resolved.name} · ${result.resolved.sku || "SKU not set"}` : "No item resolved"}</p></div>}</form>;
}

function SettingsHome({ navigate }) {
  return <><section className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2" aria-label="Settings summary"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Settings</div><div className="mt-1 text-sm font-black text-slate-50">Tap a tile to open its workspace</div></section><section className="mt-2 grid grid-cols-3 gap-1" aria-label="Settings categories">{SETTINGS_TILES.map((tile) => <SettingsTile key={tile.key} icon={tile.icon} label={tile.label} description={tile.description} tone={tile.tone} onClick={() => navigate(`/scanner-settings/${tile.key}`)} />)}</section><section className="mt-2 rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2"><p className="text-xs font-black leading-snug text-slate-300">Settings owns the handheld. Inventory Desktop owns business rules, stock truth, ledger, audit, pricing, and user governance.</p></section></>;
}

function DeviceWorkspace({ session, network, onBack }) { return <WorkspaceShell icon={Smartphone} label="Device Workspace" title="Device" helper="Physical handheld, Wi-Fi, battery, storage, and hardware status." onBack={onBack}><WorkspaceSection title="Current Device" helper="Read-only hardware and operating context."><InfoGrid rows={[["Device ID", session.deviceId], ["Store / Dept", session.departmentName], ["App Version", "ScanOps Preview"], ["Uptime", "Active shift"]]} /></WorkspaceSection><WorkspaceSection title="Wi-Fi" helper="Android owns Wi-Fi joining, passwords, and network selection. ScanOps only shows status."><InfoGrid rows={[["Status", "Connected"], ["Network", network], ["Signal", "Strong"], ["IP Address", "Auto assigned"]]} /><SettingRow icon={Wifi} title="Wi-Fi Details" helper="SSID, IP, MAC, and signal strength." value="Device owned" /></WorkspaceSection><WorkspaceSection title="Power & Storage"><InfoGrid rows={[["Battery", "70%"], ["Charging", "No"], ["Storage", "Healthy"], ["Memory", "Healthy"]]} /></WorkspaceSection><PlannedList items={["Bluetooth", "NFC", "RFID reader", "Camera health", "USB", "GPS", "Docking station", "Charging cradle"]} /></WorkspaceShell>; }
function ScannerWorkspace({ onBack }) { return <WorkspaceShell icon={ScanBarcode} label="Scanner Workspace" title="Scanner" helper="Barcode input behaviour, fallback entry, and scanner testing." onBack={onBack}><WorkspaceSection title="Input Methods" helper="Scan first. Typing remains a fallback."><SettingRow icon={ScanBarcode} title="Hardware Scanner" helper="Primary barcode input." value="Enabled" /><SettingRow icon={Camera} title="Camera Scanner" helper="Fallback scanning when hardware input is unavailable." value="Available" /><SettingRow icon={Keyboard} title="Manual Entry" helper="Barcode, SKU, PLU, or item name fallback." value="Available" /></WorkspaceSection><WorkspaceSection title="Scanner Test" helper="Test input only. No stock or price mutation."><ScannerTest /></WorkspaceSection><PlannedList items={["RFID trigger", "Batch scan", "Continuous scan", "GS1 profiles", "Custom barcode profiles", "Decode performance"]} /></WorkspaceShell>; }
function PrinterWorkspace({ onBack }) { return <WorkspaceShell icon={Printer} label="Printer Workspace" title="Printer" helper="Label printer pairing, status, test print, and templates." onBack={onBack}><WorkspaceSection title="Printer Status" helper="Printing stays local to labels and does not change stock."><InfoGrid rows={[["Paired Printer", "Not paired"], ["Connection", "Pending setup"], ["Paper", "Unknown"], ["Density", "Default"]]} /></WorkspaceSection><WorkspaceSection title="Actions"><SettingRow icon={Printer} title="Pair Printer" helper="Connect a handheld or label printer." value="Planned" disabled /><SettingRow icon={CheckCircle2} title="Test Print" helper="Print a test label when paired." value="Planned" disabled /><SettingRow icon={Info} title="Label Templates" helper="Markdown and shelf-ticket templates." value="Planned" disabled /></WorkspaceSection><PlannedList items={["Multiple printers", "Bluetooth printer", "Network printer", "Print queue", "Label templates", "Print history"]} /></WorkspaceShell>; }

function SetupMethodRow({ icon: Icon, title, helper, value }) {
  return <div className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-slate-900/80 px-3 py-2 text-left"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-100"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-black text-slate-50">{title}</span><span className="mt-0.5 block text-[10.5px] font-bold leading-snug text-slate-400">{helper}</span></span><span className="shrink-0 rounded-full bg-slate-800 px-2 py-1 text-[10px] font-black text-slate-200">{value}</span></div>;
}

function SyncWorkspace({ network, syncSummary, session, navigate, onBack }) {
  const [connectionTest, setConnectionTest] = useState(null);
  const profile = getDeviceConnectionProfile(session);
  const health = getBridgeHealth({ network, syncSummary, profile });
  const setupMethods = getConnectivitySetupMethods();
  const bridgeLabel = health.bridgeStatus === "connected" ? "Connected" : health.bridgeStatus === "action_needed" ? "Action Needed" : health.bridgeStatus === "searching" ? "Searching" : "Offline";
  const queueLabel = health.pendingQueue > 0 ? `${health.pendingQueue} Pending` : "0 Pending";

  const handleConnectionTest = () => {
    setConnectionTest(runConnectionTest({ network, syncSummary, profile }));
  };

  return <WorkspaceShell icon={Database} label="Sync Workspace" title="Sync & Connectivity" helper="Inventory Desktop pairing, bridge status, and queue visibility." onBack={onBack}>
    <WorkspaceSection title="Bridge Status" helper="Wi-Fi status belongs under Device. Inventory bridge status belongs here.">
      <InfoGrid rows={[["Inventory Desktop", bridgeLabel], ["Network", health.networkStatus], ["Sync Queue", queueLabel], ["Environment", profile.environmentLabel]]} />
    </WorkspaceSection>
    <WorkspaceSection title="Actions" helper="Connection setup only. No stock, ledger, pricing, or Inventory rules are changed here.">
      <SettingRow icon={MonitorSmartphone} title="Pair Inventory Desktop" helper="Scan QR, search local network, or enter host manually." value="Open" action onClick={() => navigate("/sync-handoff")} />
      <SettingRow icon={RefreshCw} title="Sync Queue" helper="Review pending scanner records and retry eligible handoffs." value={queueLabel} action onClick={() => navigate("/sync-queue")} />
      <SettingRow icon={Activity} title="Run Connection Test" helper="Check bridge health, network reachability, and queue readiness." value={connectionTest ? connectionTest.resultLabel : "Run"} onClick={handleConnectionTest} />
    </WorkspaceSection>
    <WorkspaceSection title="Pairing Setup Flow" helper="Staff should use QR first. IT can use discovery or manual entry if needed.">
      {setupMethods.map((method) => {
        const Icon = method.key === "qr" ? Camera : method.key === "discovery" ? Radio : Keyboard;
        return <SetupMethodRow key={method.key} icon={Icon} title={method.title} helper={method.helper} value={method.statusLabel} />;
      })}
    </WorkspaceSection>
    <WorkspaceSection title="Known Desktop" helper="Saved connection profile for one-tap reconnect.">
      <InfoGrid rows={[["Name", profile.bridgeName], ["Host", profile.bridgeHost], ["Site", profile.siteId], ["Trust", profile.trustStatus]]} />
    </WorkspaceSection>
    {connectionTest && <WorkspaceSection title="Last Connection Test" helper={connectionTest.message}><InfoGrid rows={[["Bridge", connectionTest.bridge], ["Network", connectionTest.network], ["Queue", connectionTest.queue], ["Trace", connectionTest.traceId]]} /></WorkspaceSection>}
    <PlannedList items={["Multi-site sync", "Cloud backup status", "Conflict resolution", "Incremental sync", "Connection history", "Sync analytics"]} />
  </WorkspaceShell>;
}

function FeedbackWorkspace({ feedback, setFeedback, onBack }) { const toggle = (key) => setFeedback((current) => ({ ...current, [key]: !current[key] })); return <WorkspaceShell icon={BellRing} label="Feedback Workspace" title="Feedback" helper="Local scan feedback preferences for sound, vibration, and haptics." onBack={onBack}><WorkspaceSection title="Scan Feedback" helper="These settings affect the operator experience only."><ToggleRow icon={Volume2} title="Success Beep" helper="Play a sound when a scan succeeds." checked={feedback.successBeep} onToggle={() => toggle("successBeep")} /><ToggleRow icon={Volume2} title="Error Beep" helper="Play a sound when a scan fails." checked={feedback.errorBeep} onToggle={() => toggle("errorBeep")} /><ToggleRow icon={Radio} title="Vibration" helper="Vibrate on scan confirmation." checked={feedback.vibration} onToggle={() => toggle("vibration")} /><ToggleRow icon={BellRing} title="Haptic Feedback" helper="Use touch feedback on buttons." checked={feedback.haptics} onToggle={() => toggle("haptics")} /></WorkspaceSection><PlannedList items={["Sound packs", "Silent shift mode", "Voice feedback", "Volume profiles", "Night mode"]} /></WorkspaceShell>; }
function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  React.useEffect(() => setMounted(true), []);
  const value = mounted ? (theme === "system" ? "System" : theme === "light" ? "Light" : "Dark") : "System";
  return <WorkspaceSection title="Appearance" helper="Match the handheld to the store floor or backroom lighting."><ChoiceRow title="Theme" choices={["System", "Light", "Dark"]} value={value} onChange={(choice) => setTheme(choice.toLowerCase())} /></WorkspaceSection>;
}

function AccessibilityWorkspace({ access, setAccess, onBack }) { const toggle = (key) => setAccess((current) => ({ ...current, [key]: !current[key] })); return <WorkspaceShell icon={Accessibility} label="Accessibility Workspace" title="Accessibility" helper="Inclusive handheld usability settings." onBack={onBack}><AppearanceSection /><WorkspaceSection title="Available Today" helper="Neurodiverse-friendly defaults without changing business rules."><ToggleRow icon={Accessibility} title="Large Text" helper="Increase text size for operational screens." checked={access.largeText} onToggle={() => toggle("largeText")} /><ToggleRow icon={Accessibility} title="High Contrast" helper="Use stronger contrast for low-light warehouse use." checked={access.highContrast} onToggle={() => toggle("highContrast")} /><ToggleRow icon={Accessibility} title="Reduce Motion" helper="Reduce unnecessary animation." checked={access.reduceMotion} onToggle={() => toggle("reduceMotion")} /></WorkspaceSection><PlannedList items={["Left-hand mode", "Colour-blind themes", "Large touch mode", "Voice guidance", "ADHD Focus Mode", "ASD Low-Stimulation Mode"]} /></WorkspaceShell>; }
function SessionWorkspace({ session, timeout, setTimeoutValue, onBack }) { return <WorkspaceShell icon={LockKeyhole} label="Session Workspace" title="Session" helper="Current user, shift, timeout, lock, and sign out controls." onBack={onBack}><WorkspaceSection title="Current Session"><InfoGrid rows={[["User", session.actorName], ["Role", session.actorRole], ["Store / Dept", session.departmentName], ["Device", session.deviceId]]} /></WorkspaceSection><WorkspaceSection title="Idle Timeout" helper="Auto sign-out protects shared handheld devices."><ChoiceRow title="Auto Sign Out" choices={["Off", "15 min", "30 min"]} value={timeout} onChange={setTimeoutValue} /><SettingRow icon={LockKeyhole} title="Session Lock" helper="Lock scanner after idle timeout." value={timeout === "Off" ? "Off" : "On"} /><SettingRow icon={UserRound} title="Sign Out" helper="End this scanner user session." value="Planned" disabled /></WorkspaceSection><PlannedList items={["PIN unlock", "Biometric unlock", "Shift handover", "Device reservation", "SSO", "MFA"]} /></WorkspaceShell>; }
function DiagnosticsWorkspace({ network, syncSummary, onBack }) { return <WorkspaceShell icon={Activity} label="Diagnostics Workspace" title="Diagnostics" helper="Device, scanner, printer, network, and sync tests." onBack={onBack}><WorkspaceSection title="Health Checks"><InfoGrid rows={[["Device", "Healthy"], ["Network", network], ["Sync", syncSummary.issue ? "Attention" : "Ready"], ["Printer", "Not paired"]]} /></WorkspaceSection><WorkspaceSection title="Scanner Test" helper="Use this to confirm scan input without changing inventory."><ScannerTest /></WorkspaceSection><WorkspaceSection title="Support Actions"><SettingRow icon={Activity} title="Export Support Bundle" helper="Package logs for support review." value="Planned" disabled /><SettingRow icon={PlugZap} title="Remote Support Session" helper="Start support session with permission." value="Planned" disabled /></WorkspaceSection><PlannedList items={["Hardware diagnostics", "RFID diagnostics", "Camera diagnostics", "Battery report", "Export support bundle", "Remote support session"]} /></WorkspaceShell>; }
function AboutWorkspace({ onBack }) { return <WorkspaceShell icon={Info} label="About Workspace" title="About ScanOps" helper="Version, build, environment, support, and compatibility information." onBack={onBack}><WorkspaceSection title="Product"><InfoGrid rows={[["Product", "Invyra ScanOps"], ["Build", "Preview"], ["Environment", "Training / Live aware"], ["Support", "Invyra support"]]} /></WorkspaceSection><WorkspaceSection title="Compatibility"><InfoGrid rows={[["Bridge", "Compatible"], ["Database", "Desktop owned"], ["Firmware", "Device managed"], ["License", "Pilot"]]} /></WorkspaceSection><PlannedList items={["Release notes", "Component versions", "Bridge version", "Firmware compatibility", "Database compatibility", "Licensing"]} /></WorkspaceShell>; }

export default function ScannerSettings() {
  const session = useScanOpsSession(); const navigate = useNavigate(); const { workspace } = useParams(); const network = getNetworkMode(); const syncSummary = getSyncSummary();
  const [feedback, setFeedback] = useState({ successBeep: true, errorBeep: true, vibration: true, haptics: true }); const [access, setAccess] = useState({ largeText: true, highContrast: true, reduceMotion: false }); const [timeout, setTimeoutValue] = useState("30 min");
  const activeWorkspace = VALID_WORKSPACES.has(workspace) ? workspace : null; const backToSettings = () => navigate("/scanner-settings");
  const renderWorkspace = () => { switch (activeWorkspace) { case "device": return <DeviceWorkspace session={session} network={network} onBack={backToSettings} />; case "scanner": return <ScannerWorkspace onBack={backToSettings} />; case "printer": return <PrinterWorkspace onBack={backToSettings} />; case "sync": return <SyncWorkspace network={network} syncSummary={syncSummary} session={session} navigate={navigate} onBack={backToSettings} />; case "feedback": return <FeedbackWorkspace feedback={feedback} setFeedback={setFeedback} onBack={backToSettings} />; case "accessibility": return <AccessibilityWorkspace access={access} setAccess={setAccess} onBack={backToSettings} />; case "session": return <SessionWorkspace session={session} timeout={timeout} setTimeoutValue={setTimeoutValue} onBack={backToSettings} />; case "diagnostics": return <DiagnosticsWorkspace network={network} syncSummary={syncSummary} onBack={backToSettings} />; case "about": return <AboutWorkspace onBack={backToSettings} />; default: return <SettingsHome navigate={navigate} />; } };
  return <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col overflow-x-hidden"><AppHeader title="Settings" subtitle={activeWorkspace ? "Configuration workspace" : "Configure the handheld, not the business"} /><main data-scanops-scroll className="flex-1 overflow-y-auto bg-slate-950 px-4 py-3 pb-24">{renderWorkspace()}<section className="mt-2 rounded-2xl border border-amber-300/20 bg-amber-900/20 px-3 py-2"><p className="text-xs font-black leading-snug text-amber-100">Settings configures the scanner and session only. Inventory rules, roles, pricing, ledger, audit, and business configuration remain owned by Inventory Desktop.</p></section></main></div>;
}