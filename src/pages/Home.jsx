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
} from "lucide-react";

const HERO_TILE = {
  icon: Search,
  label: "Lookup Item",
  description: "Find item, location, stock",
  to: "/scan",
  minRole: "Staff",
};

// Home is the operational workflow launcher. Management/admin surfaces live under More.
const ALL_TILES = [
  { icon: PackageOpen,    label: "Receive Stock",    description: "Scan delivery / PO items",       to: "/receiving",    minRole: "Staff" },
  { icon: ClipboardList,  label: "Count Stock",      description: "Formal stock count",             to: "/stock-count",  minRole: "Staff" },
  { icon: ArrowLeftRight, label: "Move Stock",       description: "Shelf, backroom, locations",      to: "/transfers",    minRole: "Staff" },
  { icon: Trash2,         label: "Report Stock-Out", description: "Waste, theft, damage, loss",      to: "/waste",        minRole: "Staff" },
  { icon: Tags,           label: "Markdown / Waste", description: "Labels, expiry, removals",        to: "/markdowns",    minRole: "Staff" },
  { icon: Activity,       label: "Sync Status",      description: "Device queue and errors",         to: "/sync-queue",   minRole: "Staff" },
];

const ROLE_LEVELS = { Staff: 1, Supervisor: 2, Manager: 3, Admin: 4 };
const roleLevel = (r) => ROLE_LEVELS[r] || 1;

export default function Home() {
  const session = useScanOpsSession();
  const currentRole = session.actorRole || "Staff";
  const tiles = ALL_TILES.filter((t) => roleLevel(currentRole) >= roleLevel(t.minRole));
  const heroEnabled = roleLevel(currentRole) >= roleLevel(HERO_TILE.minRole);

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <AppHeader />
      <main data-scanops-scroll className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 pb-24">
        <section className="space-y-3" aria-label="Primary scan task">
          <ActionTile
            icon={HERO_TILE.icon}
            label={HERO_TILE.label}
            description={HERO_TILE.description}
            to={HERO_TILE.to}
            active={heroEnabled}
            emphasis="hero"
          />
        </section>

        <section className="mt-3 grid grid-cols-2 gap-3" aria-label="ScanOps task launcher">
          {tiles.map((tile) => (
            <ActionTile
              key={tile.label}
              icon={tile.icon}
              label={tile.label}
              description={tile.description}
              to={tile.to}
              active={true}
            />
          ))}
        </section>
      </main>
    </div>
  );
}
