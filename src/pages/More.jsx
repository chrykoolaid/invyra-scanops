import React from "react";
import AppHeader from "../components/scanner/AppHeader";
import ActionTile from "../components/scanner/ActionTile";
import { useScanOpsSession } from "../lib/scanOpsSession";
import {
  ArrowLeft,
  Database,
  HelpCircle,
  Info,
  MonitorSmartphone,
  Printer,
  Settings,
  Activity,
  UserCog,
} from "lucide-react";

const MORE_TILES = [
  { icon: Database,           label: "Sync",        description: "Handoff",  to: "/sync-handoff",     minRole: "Staff",   tone: "purple" },
  { icon: MonitorSmartphone,  label: "Devices",     description: "Status",   to: "/device-governance", minRole: "Manager", tone: "blue" },
  { icon: Printer,            label: "Printer",     description: "Labels",   to: "/printer-settings",  minRole: "Manager", tone: "blue" },
  { icon: Settings,           label: "Settings",    description: "Scanner",  to: "/scanner-settings",  minRole: "Staff",   tone: "grey" },
  { icon: HelpCircle,         label: "Help",        description: "Support",  to: "/pilot-readiness",   minRole: "Staff",   tone: "cyan" },
  { icon: Info,               label: "About",       description: "ScanOps",  to: "/pilot-readiness",   minRole: "Staff",   tone: "grey" },
  { icon: Activity,           label: "Diagnostics", description: "Device",   to: "/scanner-settings",  minRole: "Staff",   tone: "amber" },
  { icon: UserCog,            label: "Admin",       description: "Tools",    to: "/user-management",   minRole: "Manager", tone: "green" },
  { icon: ArrowLeft,          label: "Back",        description: "Home",     to: "/",                 minRole: "Staff",   tone: "grey" },
];

const ROLE_LEVELS = { Staff: 1, Supervisor: 2, Manager: 3, Admin: 4 };
const roleLevel = (r) => ROLE_LEVELS[r] || 1;

export default function More() {
  const session = useScanOpsSession();
  const currentRole = session.actorRole || "Staff";
  const tiles = MORE_TILES.filter((t) => roleLevel(currentRole) >= roleLevel(t.minRole));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col overflow-x-hidden">
      <AppHeader title="Tools & Support" subtitle="Secondary ScanOps tools" />
      <main data-scanops-scroll className="scanops-console-screen flex-1 overflow-hidden bg-slate-950 px-4 py-3 pb-24">
        <section className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2" aria-label="More screen summary">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Tools & Support</div>
          <div className="mt-1 text-sm font-black text-slate-50">Device, sync, help, and admin tools</div>
        </section>

        <section className="mt-2 grid grid-cols-3 gap-1" aria-label="ScanOps tools control pad">
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
