import React from "react";
import { Battery, BatteryCharging, BatteryLow, BatteryWarning } from "lucide-react";

function iconFor({ level, charging }) {
  if (charging) return BatteryCharging;
  if (level <= 15) return BatteryLow;
  if (level <= 30) return BatteryWarning;
  return Battery;
}

function toneFor({ level, charging }) {
  if (charging) return "text-emerald-300";
  if (level <= 15) return "text-red-400";
  if (level <= 30) return "text-amber-300";
  return "text-muted-foreground";
}

export default function BatteryPill({ battery }) {
  if (!battery || !battery.supported) return null;
  const Icon = iconFor(battery);
  const label = `${battery.level}%${battery.charging ? " · Charging" : ""}`;
  return (
    <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground" aria-label={`Battery ${label}`} title={`Battery ${label}`}>
      <Icon className={`h-3 w-3 ${toneFor(battery)}`} aria-hidden="true" />
      {label}
    </span>
  );
}