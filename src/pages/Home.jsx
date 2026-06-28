import React from "react";
import AppHeader from "../components/scanner/AppHeader";
import ActionTile from "../components/scanner/ActionTile";
import { useScanOpsSession } from "../lib/scanOpsSession";
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
  MoreHorizontal,
} from "lucide-react";

const HERO_TILE = {
  icon: Search,
  label: "Scan or Lookup Item",
  description: "Find item • stock • location",
  to: "/scan",
  minRole: "Staff",
};

// Home is the operational workflow launcher. Management/admin surfaces live under More.
// Keep this 3x3 grid fixed to protect scanner muscle memory.
const ALL_TILES = [
  { icon: PackageOpen,    label: "Receive",   description: "PO Delivery",   to: "/receiving",         minRole: "Staff", tone: "blue" },
  { icon: ClipboardList,  label: "Count",     description: "Stocktake",     to: "/stock-count",       minRole: "Staff", tone: "blue" },
  { icon: ArrowLeftRight, label: "Transfers", description: "Locations",     to: "/transfers",         minRole: "Staff", tone: "green" },
  { icon: Trash2,         label: "Waste",     description: "Record loss",   to: "/waste",             minRole: "Staff", tone: "green" },
  { icon: Tags,           label: "Markdown",  description: "Price labels",  to: "/markdowns",         minRole: "Staff", tone: "purple" },
  { icon: Clock,          label: "Expiry",    description: "Freshness",     to: "/expiry-check",      minRole: "Staff", tone: "purple" },
  { icon: BarChart2,      label: "Reporting", description: "Shift view",    to: "/scanops-reporting", minRole: "Staff", tone: "amber" },
  { icon: History,        label: "Movements", description: "Stock history", to: "/movements",         minRole: "Staff", tone: "cyan" },
  { icon: MoreHorizontal, label: "More",      description: "Tools",         to: "/more",              minRole: "Staff", tone: "grey" },
];

const ROLE_LEVELS = { Staff: 1, Supervisor: 2, Manager: 3, Admin: 4 };
const roleLevel = (r) => ROLE_LEVELS[r] || 1;

export default function Home() {
  const session = useScanOpsSession();
  const currentRole = session.actorRole || "Staff";
  const tiles = ALL_TILES.filter((t) => roleLevel(currentRole) >= roleLevel(t.minRole));
  const heroEnabled = roleLevel(currentRole) >= roleLevel(HERO_TILE.minRole);

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

        <section className="mt-2 grid grid-cols-3 gap-1" aria-label="ScanOps operations control pad">
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
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Last Sync</div>
              <div className="mt-0.5 text-[11px] font-black text-emerald-300">Ready</div>
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Device</div>
              <div className="mt-0.5 text-[11px] font-black text-blue-300">Online</div>
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Queue</div>
              <div className="mt-0.5 text-[11px] font-black text-slate-200">0 Pending</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
