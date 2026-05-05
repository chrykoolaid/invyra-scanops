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
  { icon: ClipboardList, label: "Stock Count", to: null, active: false },
  { icon: PackageOpen, label: "Receiving", to: null, active: false },
  { icon: RefreshCw, label: "Replenish", to: null, active: false },
  { icon: Tags, label: "Markdowns", to: null, active: false },
  { icon: Trash2, label: "Waste", to: null, active: false },
  { icon: Clock, label: "Expiry Check", to: null, active: false },
  { icon: ScanBarcode, label: "Gap Scan", to: null, active: false },
  { icon: Printer, label: "Labels", to: null, active: false },
  { icon: ArrowLeftRight, label: "Transfers", to: null, active: false },
];

const tasks = [
  { id: 1, text: "Dairy count due by 2pm", done: false },
  { id: 2, text: "Check bakery expiries", done: true },
  { id: 3, text: "Receive frozen delivery", done: false },
];

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
          <div className="bg-card rounded-2xl border border-border divide-y divide-border">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                  ${task.done
                    ? "bg-accent border-accent"
                    : "border-border"
                  }
                `}>
                  {task.done && (
                    <svg className="w-3 h-3 text-accent-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm ${task.done ? "line-through text-muted-foreground" : "text-foreground font-medium"}`}>
                  {task.text}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}