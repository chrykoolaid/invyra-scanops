import React from "react";
import { Flag, MapPin, ScanLine, ArrowLeftRight } from "lucide-react";

const ACTIONS = [
  { key: "scan", icon: ScanLine, label: "Scan Again" },
  { key: "movements", icon: ArrowLeftRight, label: "View Movements" },
  { key: "locations", icon: MapPin, label: "Check Locations" },
  { key: "report", icon: Flag, label: "Report Issue" },
];

export default function QuickActions({ onAction }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {ACTIONS.map((action) => (
        <button
          key={action.key}
          type="button"
          onClick={() => onAction?.(action.key)}
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card px-1 py-3 active:scale-[0.98]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
            <action.icon className="h-5 w-5" />
          </span>
          <span className="text-[10px] font-black leading-tight text-foreground text-center">{action.label}</span>
        </button>
      ))}
    </div>
  );
}