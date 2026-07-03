import React from "react";
import AppHeader from "../components/scanner/AppHeader";
import ActionTile from "../components/scanner/ActionTile";
import { useScanOpsSession } from "../lib/scanOpsSession";
import { useScanOpsGovernanceContext } from "../lib/scanOpsGovernance";
import { getSyncHeaderState } from "../lib/scanOpsSync";
import {
  Search,
  ClipboardList,
  PackageOpen,
  Tags,
  Trash2,
  ArrowLeftRight,
  BarChart2,
  Clock,
  History,
  BriefcaseBusiness,
} from "lucide-react";

const HERO_TILE = {
  icon: Search,
  label: "Scan or Lookup Item",
  description: "Find item • stock • location",
  to: "/scan",
  minRole: "Staff",
};

// Home is the operational workflow launcher. Support and device settings live under Tools.
// Keep this 3x3 grid fixed to protect scanner muscle memory.
const ALL_TILES = [
  { icon: PackageOpen,       label: "Receive",   description: "PO Delivery",   to: "/receiving",         minRole: "Staff", tone: "blue" },
  { icon: ClipboardList,     label: "Count",     description: "Stocktake",     to: "/stock-count",       minRole: "Staff", tone: "blue" },
  { icon: ArrowLeftRight,    label: "Transfers", description: "Locations",     to: "/transfers",         minRole: "Staff", tone: "green" },
  { icon: Trash2,            label: "Waste",     description: "Record loss",   to: "/waste",             minRole: "Staff", tone: "green" },
  { icon: Tags,              label: "Markdown",  description: "Price labels",  to: "/markdowns",         minRole: "Staff", tone: "purple" },
  { icon: Clock,             label: "Expiry",    description: "Freshness",     to: "/expiry-check",      minRole: "Staff", tone: "purple" },
  { icon: BarChart2,         label: "Reporting", description: "Shift view",    to: "/scanops-reporting", minRole: "Staff", tone: "amber" },
  { icon: History,           label: "Movements", description: "Stock history", to: "/movements",         minRole: "Staff", tone: "cyan" },
  { icon: BriefcaseBusiness, label: "Tools",     description: "Support",       to: "/more",              minRole: "Staff", tone: "grey" },
];

const ROLE_LEVELS = { Staff: 1, Supervisor: 2, Manager: 3, Admin: 4 };
const roleLevel = (r) => ROLE_LEVELS[r] || 1;

function queueLabel(summary = {}) {
  const reviewCount = Number(summary.issue || 0);
  const pendingCount = Number(summary.pending || 0);
  if (reviewCount > 0) return `${reviewCount} Review`;
  if (pendingCount > 0) return `${pendingCount} Pending`;
  return "Clear";
}

function syncLabel(syncState = {}) {
  if (syncState.state === "synced") return "Ready";
  return syncState.label || "Ready";
}

function QuickInfoCard({ label, value, helper, tone = "text-slate-200" }) {
  const accessibleLabel = helper ? `${label}: ${value}. ${helper}.` : `${label}: ${value}.`;
  return (
    <div className="min-w-0 rounded-2xl bg-slate-950/45 px-2.5 py-2 text-center" aria-label={accessibleLabel} title={accessibleLabel}>
      <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-0.5 truncate text-[11px] font-black ${tone}`}>{value}</div>
      {helper && <div className="mt-0.5 truncate text-[9px] font-bold text-slate-500">{helper}</div>}
    </div>
  );
}

export default function Home() {
  const session = useScanOpsSession();
  const governance = useScanOpsGovernanceContext();
  const syncState = getSyncHeaderState();
  const currentRole = session.actorRole || "Staff";
  const tiles = ALL_TILES.filter((t) => roleLevel(currentRole) >= roleLevel(t.minRole));
  const heroEnabled = roleLevel(currentRole) >= roleLevel(HERO_TILE.minRole);
  const summary = syncState.summary || {};
  const deviceLabel = governance.deviceLabel || session.deviceId || session.scannerId || "Device ready";
  const networkLabel = syncState.state === "offline" ? "Offline" : "Online";
  const syncTone = syncState.state === "offline"
    ? "text-amber-300"
    : syncState.state === "issue"
      ? "text-rose-300"
      : syncState.state === "pending"
        ? "text-blue-300"
        : "text-emerald-300";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col overflow-x-hidden">
      <AppHeader />
      <main data-scanops-scroll className="scanops-console-screen flex-1 overflow-hidden bg-slate-950 px-4 py-3 pb-24">
        <section aria-label="Primary scan task">
          <ActionTile
            icon={HERO_TILE.icon}
            label={HERO_TILE.label}
            description={HERO_TILE.description}
            to={HERO_TILE.to}
            active={heroEnabled}
            emphasis="hero"
          />
        </section>

        <section className="mt-2 rounded-2xl border border-blue-400/15 bg-blue-950/35 px-3 py-2" aria-label="System boundary reminder">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-200/80">Operational layer</p>
          <p className="mt-1 text-[11px] font-bold leading-snug text-blue-50/80">
            ScanOps records operator evidence. Inventory Desktop applies stock, ledger, price, and approval decisions after governed sync.
          </p>
        </section>

        <section className="mt-2 grid grid-cols-3 gap-1.5" aria-label="ScanOps operations control pad">
          {tiles.map((tile) => (
            <ActionTile
              key={tile.label}
              icon={tile.icon}
              label={tile.label}
              description={tile.description}
              to={tile.to}
              active={true}
              tone={tile.tone}
            />
          ))}
        </section>

        <section className="mt-2 rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2" aria-label="Quick info">
          <div className="grid grid-cols-3 gap-2">
            <QuickInfoCard label="Sync" value={syncLabel(syncState)} helper={networkLabel} tone={syncTone} />
            <QuickInfoCard label="Device" value={deviceLabel} helper={governance.shiftLabel || currentRole} tone="text-blue-300" />
            <QuickInfoCard label="Queue" value={queueLabel(summary)} helper={`${summary.total || 0} total`} tone={summary.issue ? "text-rose-300" : summary.pending ? "text-blue-300" : "text-slate-200"} />
          </div>
        </section>
      </main>
    </div>
  );
}
