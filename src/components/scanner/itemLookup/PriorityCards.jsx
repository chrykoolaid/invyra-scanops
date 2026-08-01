import React from "react";
import { AlertCircle, CheckCircle2, Clock3, PackageCheck, ShieldCheck } from "lucide-react";
import { yesNo } from "./itemLookupHelpers";

function PriorityCard({ icon: Icon, label, value, tone = "default" }) {
  const toneClass = {
    green: "text-emerald-400",
    amber: "text-amber-400",
    blue: "text-blue-400",
    default: "text-foreground",
  };
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className={`mt-2 text-sm font-black leading-tight ${toneClass[tone] || toneClass.default}`}>{value}</p>
    </div>
  );
}

export default function PriorityCards({ item }) {
  if (!item) return null;
  const status = String(item.lifecycleStatus || "UNKNOWN").toUpperCase();
  const statusActive = status === "ACTIVE" && item.isActive !== false;

  return (
    <div className="grid grid-cols-3 gap-2">
      <PriorityCard
        icon={statusActive ? CheckCircle2 : AlertCircle}
        label="Lifecycle"
        value={statusActive ? "Active" : status}
        tone={statusActive ? "green" : "amber"}
      />
      <PriorityCard
        icon={PackageCheck}
        label="Batch tracked"
        value={yesNo(item.batchTracked)}
        tone={item.batchTracked ? "blue" : "default"}
      />
      <PriorityCard
        icon={item.expiryTracked ? Clock3 : ShieldCheck}
        label="Expiry tracked"
        value={yesNo(item.expiryTracked)}
        tone={item.expiryTracked ? "amber" : "default"}
      />
    </div>
  );
}
