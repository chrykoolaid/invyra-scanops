import React, { useMemo } from "react";
import AppHeader from "../components/scanner/AppHeader";
import ActionTile from "../components/scanner/ActionTile";
import { useScanOpsSession } from "../lib/scanOpsSession";
import { getSyncHeaderState } from "../lib/scanOpsSync";
import {
  Search,
  ClipboardList,
  PackageOpen,
  Tags,
  Trash2,
  ArrowLeftRight,
  Activity,
  MapPin,
  Clock3,
  AlertTriangle,
  CheckCircle2,
  WifiOff,
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

function SummaryPill({ icon: Icon, label, value, urgent = false }) {
  return (
    <div className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-border bg-background/80 px-3 py-2">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${urgent ? "bg-destructive/10 text-destructive" : "bg-secondary text-foreground"}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
        <span className="mt-0.5 block truncate text-sm font-black text-foreground">{value}</span>
      </span>
    </div>
  );
}

export default function Home() {
  const session = useScanOpsSession();
  const currentRole = session.actorRole || "Staff";
  const tiles = ALL_TILES.filter((t) => roleLevel(currentRole) >= roleLevel(t.minRole));
  const heroEnabled = roleLevel(currentRole) >= roleLevel(HERO_TILE.minRole);
  const syncState = useMemo(() => getSyncHeaderState(), [session]);
  const syncSummary = syncState.summary || {};
  const issueCount = Number(syncSummary.issue || 0);
  const pendingCount = Number(syncSummary.pending || 0);
  const SyncIcon = syncState.state === "offline" ? WifiOff : syncState.state === "issue" ? AlertTriangle : CheckCircle2;
  const todayValue = issueCount > 0
    ? `${issueCount} needs review`
    : pendingCount > 0
      ? `${pendingCount} pending handoff`
      : "Ready for work";

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <AppHeader />
      <main data-scanops-scroll className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 pb-24">
        <section className="rounded-[1.75rem] border border-border bg-card p-4 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Today</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-foreground">Choose the job</h2>
          <p className="mt-1 text-sm font-bold leading-snug text-muted-foreground">
            ScanOps stays simple: choose one task, scan, confirm, then hand off to Inventory Desktop.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-2.5">
            <SummaryPill
              icon={MapPin}
              label="Where"
              value={`${session.storeName || "Pilot Test Store"} · ${session.locationName || session.departmentName || "Store floor"}`}
            />
            <SummaryPill
              icon={SyncIcon}
              label="Device"
              value={syncState.label || "Ready"}
              urgent={syncState.state === "issue" || syncState.state === "offline"}
            />
            <SummaryPill
              icon={issueCount > 0 ? AlertTriangle : Clock3}
              label="Next"
              value={todayValue}
              urgent={issueCount > 0}
            />
          </div>
        </section>

        <section className="mt-4 space-y-3" aria-label="Primary scan task">
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
