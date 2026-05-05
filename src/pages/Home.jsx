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
  ListChecks,
  Printer,
  ArrowLeftRight,
  Database,
} from "lucide-react";

const tiles = [
  { icon: Search, label: "Product Lookup", to: "/scan", active: true },
  { icon: ClipboardList, label: "Stock Count", to: "/stock-count", active: true },
  { icon: PackageOpen, label: "Receiving", to: "/receiving", active: true },
  { icon: RefreshCw, label: "Replenish", to: "/replenish", active: true },
  { icon: ScanBarcode, label: "Gap Scan", to: "/gap-scan", active: true },
  { icon: ListChecks, label: "Tasks", to: "/tasks", active: true },
  { icon: Tags, label: "Markdowns", to: "/markdowns", active: true },
  { icon: Trash2, label: "Waste", to: "/waste", active: true },
  { icon: Clock, label: "Expiry Check", to: "/expiry-check", active: true },
  { icon: Printer, label: "Shelf Tickets", to: "/shelf-tickets", active: true },
  { icon: ArrowLeftRight, label: "Transfers", to: "/transfers", active: true },
  { icon: Database, label: "Inventory Sync", to: "/inventory-sync", active: true },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <AppHeader />
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 pb-8">
        <div className="grid grid-cols-3 items-stretch gap-3">
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
      </main>
    </div>
  );
}
