import React from "react";
import AppHeader from "../components/scanner/AppHeader";
import ActionTile from "../components/scanner/ActionTile";
import { useScanOpsSession } from "../lib/scanOpsSession";
import {
  Search,
  ClipboardList,
  PackageOpen,
  RefreshCw,
  Tags,
  Trash2,
  Clock,
  ScanBarcode,
  ListChecks,
  Printer,
  ArrowLeftRight,
  Activity,
} from "lucide-react";

// Home is the operational workflow launcher. Management/admin surfaces live under More.
const ALL_TILES = [
  { icon: Search,         label: "Product Lookup",    to: "/scan",                minRole: "Staff" },
  { icon: PackageOpen,    label: "Receiving",          to: "/receiving",           minRole: "Staff" },
  { icon: ClipboardList,  label: "Stock Count",        to: "/stock-count",         minRole: "Staff" },
  { icon: ScanBarcode,    label: "Gap Scan",           to: "/gap-scan",            minRole: "Staff" },
  { icon: RefreshCw,      label: "Replenish",          to: "/replenish",           minRole: "Staff" },
  { icon: ListChecks,     label: "Tasks",              to: "/tasks",               minRole: "Staff" },
  { icon: Activity,       label: "Movements",          to: "/movements",           minRole: "Staff" },
  { icon: Tags,           label: "Markdowns",          to: "/markdowns",           minRole: "Staff" },
  { icon: Trash2,         label: "Waste",              to: "/waste",               minRole: "Staff" },
  { icon: Clock,          label: "Expiry Check",       to: "/expiry-check",        minRole: "Staff" },
  { icon: Printer,        label: "Shelf Tickets",      to: "/shelf-tickets",       minRole: "Staff" },
  { icon: ArrowLeftRight, label: "Transfers",          to: "/transfers",           minRole: "Staff" },
];

const ROLE_LEVELS = { Staff: 1, Supervisor: 2, Manager: 3, Admin: 4 };
const roleLevel = (r) => ROLE_LEVELS[r] || 1;

export default function Home() {
  const session = useScanOpsSession();
  const currentRole = session.actorRole || "Staff";
  const tiles = ALL_TILES.filter((t) => roleLevel(currentRole) >= roleLevel(t.minRole));

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <AppHeader />
      <main data-scanops-scroll className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 py-3 pb-24">
        <div className="grid grid-cols-3 items-stretch gap-2.5">
          {tiles.map((tile) => (
            <ActionTile
              key={tile.label}
              icon={tile.icon}
              label={tile.label}
              to={tile.to}
              active={true}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
