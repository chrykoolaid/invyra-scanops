import React from "react";
import AppHeader from "../components/scanner/AppHeader";
import ActionTile from "../components/scanner/ActionTile";
import { ArrowLeft, HelpCircle, ListChecks, Settings } from "lucide-react";

const TOOL_TILES = [
  { icon: ListChecks, label: "Tasks",    description: "Assigned work", to: "/tasks",            tone: "blue" },
  { icon: Settings,   label: "Settings", description: "Device setup",  to: "/scanner-settings", tone: "grey" },
  { icon: HelpCircle, label: "Help",     description: "Guidance",      to: "/help",             tone: "cyan" },
  { icon: ArrowLeft,  label: "Back",     description: "Home",          to: "/",                tone: "grey" },
];

export default function More() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col overflow-x-hidden">
      <AppHeader title="Tools" subtitle="Support & device tools" />
      <main data-scanops-scroll className="scanops-console-screen flex-1 overflow-hidden bg-slate-950 px-4 py-3 pb-24">
        <section className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2" aria-label="Tools summary">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Tools</div>
          <div className="mt-1 text-sm font-black text-slate-50">Tasks, settings, help, and return to Home</div>
        </section>

        <section className="mt-2 grid grid-cols-2 gap-2" aria-label="ScanOps tools support pad">
          {TOOL_TILES.map((tile) => (
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