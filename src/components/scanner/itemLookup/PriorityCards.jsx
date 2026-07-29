import React from "react";
import { CalendarClock, CheckCircle2, Package } from "lucide-react";
import { hasValue, valueOf } from "./itemLookupHelpers";

function PriorityCard({ icon: Icon, label, value, sublabel, tone = "default" }) {
  const toneClass = {
    red: "text-red-400",
    green: "text-emerald-400",
    blue: "text-blue-400",
    amber: "text-amber-400",
    default: "text-foreground",
  };
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className={`mt-2 text-base font-black leading-tight ${toneClass[tone] || toneClass.default}`}>{value}</p>
      {sublabel && <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">{sublabel}</p>}
    </div>
  );
}

export default function PriorityCards({ item }) {
  if (!item) return null;
  const soh = valueOf(item, ["authoritativeQuantity", "authoritative_quantity"], null);
  const unit = valueOf(item, ["unitOfMeasure", "unit_of_measure", "uom"], "");
  const sohDisplay = hasValue(soh) ? `${soh} ${unit}`.trim() : "—";
  const sohTone = hasValue(soh) && Number(soh) <= 0 ? "red" : "default";

  const status = String(item.lifecycleStatus || "UNKNOWN").toUpperCase();
  const statusActive = status === "ACTIVE" && item.isActive !== false;
  const statusTone = statusActive ? "green" : "amber";

  const nextDelivery = valueOf(item, ["nextDeliveryDate", "next_delivery_date", "pendingDeliveryEta", "pending_delivery_eta"], null);
  const deliveryDisplay = hasValue(nextDelivery) ? nextDelivery : "No delivery";
  const deliverySub = hasValue(nextDelivery) ? "Scheduled" : "scheduled";
  const deliveryTone = hasValue(nextDelivery) ? "blue" : "default";

  return (
    <div className="grid grid-cols-3 gap-2">
      <PriorityCard icon={Package} label="SOH Available" value={sohDisplay} tone={sohTone} />
      <PriorityCard icon={CheckCircle2} label="Status" value={statusActive ? "Active" : status} tone={statusTone} />
      <PriorityCard icon={CalendarClock} label="Next Delivery" value={deliveryDisplay} sublabel={deliverySub} tone={deliveryTone} />
    </div>
  );
}