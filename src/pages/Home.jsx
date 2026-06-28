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
  Activity,
  Clock,
  AlertTriangle,
} from "lucide-react";

const HERO_TILE = {
  icon: Search,
  label: "Lookup Item",
  description: "Find item • stock • location",
  to: "/scan",
  minRole: "Staff",
};

// Home is the operational workflow launcher. Management/admin surfaces live under More.
// Keep this grid fixed to protect scanner muscle memory.
const ALL_TILES = [
  { icon: PackageOpen,    label: "Receive",  description: "PO Delivery",    to: "/receiving",    minRole: "Staff", tone: "blue" },
  { icon: ClipboardList,  label: "Count",    description: "Stocktake",      to: "/stock-count",  minRole: "Staff", tone: "blue" },
  { icon: ArrowLeftRight, label: "Move",     description: "Locations",      to: "/transfers",    minRole: "Staff", tone: "green" },
  { icon: Trash2,         label: "Waste",    description: "Record loss",    to: "/waste",        minRole: "Staff", tone: "green" },
  { icon: Tags,           label: "Markdown", description: "Price labels",   to: "/markdowns",    minRole: "Staff", tone: "purple" },
  { icon: Clock,          label: "Expiry",   description: "Freshness",      to: "/expiry-check", minRole: "Staff", tone: "purple" },
  { icon: Activity,       label: "Sync",     description: "Queue status",   to: "/sync-queue",   minRole: "Staff", tone: "grey" },
  { icon: AlertTriangle,  label: "Alerts",   description: "Review issues",  to: "/alerts",       minRole: "Staff", tone: "amber" },
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
      <main data-scanops-scroll className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 pb-24 bg-slate-950">
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

        <section className="mt-2 grid grid-cols-2 gap-1" aria-label="ScanOps control pad">
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
      </main>
    </div>
  );
}
