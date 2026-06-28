import React, { useState } from "react";
import {
  Accessibility,
  Activity,
  BellRing,
  Camera,
  CheckCircle2,
  Database,
  Info,
  LockKeyhole,
  MonitorSmartphone,
  Printer,
  ScanBarcode,
  Smartphone,
  UserRound,
  Vibrate,
  Volume2,
  Wifi,
} from "lucide-react";
import AppHeader from "../components/scanner/AppHeader";
import { createScanOpsAuditEvent } from "../lib/scanOpsAudit";
import { SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { useScanOpsSession } from "../lib/scanOpsSession";
import { getNetworkMode, getSyncSummary } from "../lib/scanOpsSync";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";

const SETTINGS_TILES = [
  { key: "device", icon: Smartphone, label: "Device", description: "Wi-Fi & battery", tone: "blue" },
  { key: "scanner", icon: ScanBarcode, label: "Scanner", description: "Input & test", tone: "blue" },
  { key: "printer", icon: Printer, label: "Printer", description: "Labels", tone: "blue" },
  { key: "sync", icon: Database, label: "Sync", description: "Bridge", tone: "purple" },
  { key: "feedback", icon: BellRing, label: "Feedback", description: "Beep & haptics", tone: "cyan" },
  { key: "accessibility", icon: Accessibility, label: "Accessibility", description: "Usability", tone: "green" },
  { key: "session", icon: LockKeyhole, label: "Session", description: "User & timeout", tone: "amber" },
  { key: "diagnostics", icon: Activity, label: "Diagnostics", description: "Tests", tone: "amber" },
  { key: "about", icon: Info, label: "About", description: "Version", tone: "grey" },
];

const toneClasses = {
  blue: "bg-blue-950/95 text-blue-50 active:bg-blue-900",
  green: "bg-emerald-950/95 text-emerald-50 active:bg-emerald-900",
  purple: "bg-purple-950/95 text-purple-50 active:bg-purple-900",
  cyan: "bg-cyan-950/95 text-cyan-50 active:bg-cyan-900",
  grey: "bg-slate-800 text-slate-50 active:bg-slate-700",
  amber: "bg-amber-900/95 text-amber-50 active:bg-amber-800",
};

function SettingsTile({ icon: Icon, label, description, tone = "grey", selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[92px] min-h-[92px] w-full flex-col items-center justify-center rounded-2xl border border-white/5 px-2 py-2.5 text-center transition-all duration-150 active:scale-[0.98] ${selected ? toneClasses[tone] || toneClasses.grey : toneClasses.grey}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-current">
        <Icon className="h-4 w-4" />
      </span>
      <span className="mt-1.5 min-w-0">
        <span className="block text-[12px] font-black leading-tight text-current">{label}</span>
        <span className="mt-0.5 block text-[9.5px] font-bold leading-snug text-current/70">{description}</span>
      </span>
    </button>
  );
}

function DetailPanel({ activeKey, session, network, syncSummary }) {
  const sections = {
    device: {
      icon: Smartphone,
      title: "Device",
      helper: "Physical handheld, operating system, Wi-Fi, and hardware status.",
      current: [
        ["Device ID", session.deviceId],
        ["Store / Department", session.departmentName],
        ["Network", network],
        ["Wi-Fi", "Connected"],
        ["Battery", "70%"],
        ["App Version", "ScanOps Preview"],
      ],
      planned: ["Bluetooth", "NFC", "RFID reader", "Camera health", "USB", "GPS", "Docking station", "Charging cradle"],
    },
    scanner: {
      icon: ScanBarcode,
      title: "Scanner",
      helper: "Barcode input behaviour. Scanning is the primary interaction.",
      current: [["Hardware scanner", "Enabled"], ["Camera fallback", "Available"], ["Manual entry", "Available"], ["Test scan", "Available below"]],
      planned: ["RFID trigger", "Batch scan", "Continuous scan", "GS1 profiles", "Custom barcode profiles", "Decode performance"],
    },
    printer: {
      icon: Printer,
      title: "Printer",
      helper: "Portable and label printer configuration.",
      current: [["Printer pairing", "Planned"], ["Test print", "Planned"], ["Paper status", "Planned"], ["Label mode", "Markdown labels"]],
      planned: ["Multiple printers", "Bluetooth printer", "Network printer", "Print queue", "Label templates", "Print history"],
    },
    sync: {
      icon: Database,
      title: "Sync & Connectivity",
      helper: "Inventory Desktop pairing, bridge status, and read-only queue visibility.",
      current: [["Bridge status", syncSummary.issue ? "Attention" : "Ready"], ["Pending queue", syncSummary.pending], ["Network mode", network], ["Environment", "Training / Live aware"]],
      planned: ["Multi-site sync", "Cloud backup status", "Conflict resolution", "Incremental sync", "Connection history", "Sync analytics"],
    },
    feedback: {
      icon: BellRing,
      title: "Feedback",
      helper: "Local sound, vibration, and confirmation preferences.",
      current: [["Success beep", "On"], ["Error beep", "On"], ["Vibration", "On"], ["Haptics", "On"]],
      planned: ["Sound packs", "Silent shift mode", "Voice feedback", "Volume profiles", "Night mode"],
    },
    accessibility: {
      icon: Accessibility,
      title: "Accessibility",
      helper: "Inclusive handheld usability settings.",
      current: [["Large text", "Available"], ["High contrast", "Default"], ["Reduce motion", "Available"]],
      planned: ["Left-hand mode", "Colour-blind themes", "Large touch mode", "Voice guidance", "ADHD Focus Mode", "ASD Low-Stimulation Mode"],
    },
    session: {
      icon: UserRound,
      title: "Session",
      helper: "Current user, shift, timeout, and sign out controls.",
      current: [["Current user", session.actorName], ["Role", session.actorRole], ["Store / Department", session.departmentName], ["Auto sign out", "30 min idle"], ["Session lock", "Planned"], ["Sign out", "Available from session controls"]],
      planned: ["PIN unlock", "Biometric unlock", "Shift handover", "Device reservation", "SSO", "MFA"],
    },
    diagnostics: {
      icon: Activity,
      title: "Diagnostics",
      helper: "Device, scanner, printer, network, and sync checks.",
      current: [["Scanner test", "Available below"], ["Network test", "Read-only"], ["Sync test", "Read-only"], ["Device health", "Preview"]],
      planned: ["Hardware diagnostics", "RFID diagnostics", "Camera diagnostics", "Battery report", "Export support bundle", "Remote support session"],
    },
    about: {
      icon: Info,
      title: "About",
      helper: "Product version, build, environment, and support information.",
      current: [["Product", "Invyra ScanOps"], ["Build", "Preview"], ["Environment", "Training / Live aware"], ["Support", "Invyra support"]],
      planned: ["Release notes", "Component versions", "Bridge version", "Firmware compatibility", "Database compatibility", "Licensing"],
    },
  };

  const section = sections[activeKey] || sections.device;
  const Icon = section.icon;
  return (
    <section className="mt-2 rounded-2xl border border-white/10 bg-slate-900/80 p-3" aria-label={`${section.title} settings details`}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-slate-100">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Settings Category</p>
          <h2 className="mt-1 text-base font-black text-slate-50">{section.title}</h2>
          <p className="mt-1 text-xs font-bold leading-snug text-slate-400">{section.helper}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {section.current.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-2xl bg-slate-800/80 px-3 py-2">
            <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-0.5 truncate text-xs font-black text-slate-50">{value || "—"}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-2xl bg-slate-800/70 px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Planned</p>
        <p className="mt-1 text-xs font-bold leading-snug text-slate-300">{section.planned.join(" · ")}</p>
      </div>
    </section>
  );
}

function ScannerTest() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);

  const runTest = (event) => {
    event.preventDefault();
    const value = input.trim();
    if (!value) return;
    const resolved = resolveInventoryIdentity(value);
    const audit = createScanOpsAuditEvent(SCANOPS_EVENT_TYPES.SCANNER_TEST_SCANNED, {
      status: resolved ? "test_resolved" : "test_unresolved",
      scanned_value: value,
      resolved_item_id: resolved?.id || null,
      resolved_sku: resolved?.sku || null,
      stock_mutation: false,
    });
    setResult({ value, resolved, traceId: audit.traceId || audit.trace_id });
  };

  return (
    <section className="mt-2 rounded-2xl border border-white/10 bg-slate-900/80 p-3" aria-label="Scanner test">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-slate-100">
          <ScanBarcode className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-black text-slate-50">Scanner Test</h2>
          <p className="mt-1 text-xs font-bold text-slate-400">Test input only. No stock or price mutation.</p>
        </div>
      </div>
      <form onSubmit={runTest} className="mt-3 space-y-2">
        <div className="flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Scan or enter barcode / PLU" className="min-w-0 flex-1 h-11 rounded-xl border border-white/10 bg-slate-800 px-3 text-sm font-bold text-slate-50 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-300/20" />
          <button type="submit" className="flex w-12 items-center justify-center rounded-xl bg-blue-600 text-white"><ScanBarcode className="h-5 w-5" /></button>
        </div>
        {result && (
          <div className="rounded-xl bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-400">
            <p className="font-black text-slate-50">Input accepted · no stock mutation</p>
            <p className="truncate">Trace: {result.traceId}</p>
            <p className="truncate">{result.resolved ? `${result.resolved.name} · ${result.resolved.sku || "SKU not set"}` : "No item resolved"}</p>
          </div>
        )}
      </form>
    </section>
  );
}

export default function ScannerSettings() {
  const session = useScanOpsSession();
  const network = getNetworkMode();
  const syncSummary = getSyncSummary();
  const [activeKey, setActiveKey] = useState("device");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col overflow-x-hidden">
      <AppHeader title="Settings" subtitle="Configure the handheld, not the business" />
      <main data-scanops-scroll className="flex-1 overflow-y-auto bg-slate-950 px-4 py-3 pb-24">
        <section className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2" aria-label="Settings summary">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Settings</div>
          <div className="mt-1 text-sm font-black text-slate-50">Device configuration and session controls</div>
        </section>

        <section className="mt-2 grid grid-cols-3 gap-1" aria-label="Settings categories">
          {SETTINGS_TILES.map((tile) => (
            <SettingsTile
              key={tile.key}
              icon={tile.icon}
              label={tile.label}
              description={tile.description}
              tone={tile.tone}
              selected={activeKey === tile.key}
              onClick={() => setActiveKey(tile.key)}
            />
          ))}
        </section>

        <DetailPanel activeKey={activeKey} session={session} network={network} syncSummary={syncSummary} />
        {(activeKey === "scanner" || activeKey === "diagnostics") && <ScannerTest />}

        <section className="mt-2 rounded-2xl border border-amber-300/20 bg-amber-900/20 px-3 py-2">
          <p className="text-xs font-black leading-snug text-amber-100">Settings configures the scanner and session only. Inventory rules, roles, pricing, ledger, audit, and business configuration remain owned by Inventory Desktop.</p>
        </section>
      </main>
    </div>
  );
}
