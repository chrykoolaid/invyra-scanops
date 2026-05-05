import React from "react";
import AppHeader from "../components/scanner/AppHeader";
import ActionTile from "../components/scanner/ActionTile";
import {
  Search,
  ClipboardList,
  PackageOpen,
  RefreshCw,
  Tags,
  Trash2,
  Clock,
  ScanBarcode,
  Printer,
  ArrowLeftRight,
} from "lucide-react";

const tiles = [
  { icon: Search, label: "Product Lookup", to: "/scan", active: true },
  { icon: ClipboardList, label: "Stock Count", to: "/stock-count", active: true },
  { icon: PackageOpen, label: "Receiving", to: "/receiving", active: true },
  { icon: RefreshCw, label: "Replenish", to: "/replenish", active: true },
  { icon: Tags, label: "Markdowns", to: null, active: false },
  { icon: Trash2, label: "Waste", to: null, active: false },
  { icon: Clock, label: "Expiry Check", to: null, active: false },
  { icon: ScanBarcode, label: "Gap Scan", to: "/gap-scan", active: true },
  { icon: Printer, label: "Labels", to: null, active: false },
  { icon: ArrowLeftRight, label: "Transfers", to: null, active: false },
];

const tasks = [];

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="flex-1 px-4 py-5 space-y-6 overflow-y-auto pb-8">
        {/* Action Grid */}
        <div className="grid grid-cols-3 gap-3">
          {tiles.map((tile) => (
            <ActionTile
              key={tile.label}
              icon={tile.icon}
              label={tile.label}
              to={tile.to}
              active={tile.active}
            />
          ))}
        </div>

        {/* Today's Tasks */}
        <section>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Today's Tasks
          </h2>
          <div className="bg-card rounded-2xl border border-border px-4 py-4">
            {tasks.length === 0 ? (
              <div>
                <p className="text-sm font-semibold text-foreground">No assigned scanner tasks yet</p>
                <p className="text-xs text-muted-foreground mt-1">Stage F will add manager-assigned and auto-generated task routing.</p>
              </div>
            ) : null}
          </div>
        </section>

      </main>
    </div>
  );
}