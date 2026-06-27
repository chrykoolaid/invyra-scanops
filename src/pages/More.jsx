import React from "react";
import { Link } from "react-router-dom";
import { BarChart2, Database, LayoutDashboard, Settings } from "lucide-react";
import AppHeader from "../components/scanner/AppHeader";

const MORE_ITEMS = [
  { label: "Sync & Handoff", helper: "Queue, sync status, setup, and review.", to: "/sync-handoff", icon: Database },
  { label: "Store Exceptions", helper: "Manager view for store-level operational exceptions.", to: "/store-ops-dashboard", icon: LayoutDashboard },
  { label: "Reporting", helper: "Supervisor reporting and ScanOps performance review.", to: "/scanops-reporting", icon: BarChart2 },
  { label: "Scanner Settings", helper: "Device controls, diagnostics, and access.", to: "/scanner-settings", icon: Settings },
];

export default function More() {
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <AppHeader title="More" subtitle="Admin, reporting, and device tools" />
      <main data-scanops-scroll className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 pb-24 space-y-2">
        {MORE_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} to={item.to} className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-card p-3 active:bg-secondary">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-foreground"><Icon className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-foreground">{item.label}</p>
                <p className="mt-1 text-xs font-bold text-muted-foreground">{item.helper}</p>
              </div>
            </Link>
          );
        })}
      </main>
    </div>
  );
}
