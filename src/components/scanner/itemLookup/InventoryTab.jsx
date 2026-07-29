import React from "react";
import { AlertTriangle, CheckCircle2, Package, PackageCheck, PackageX, ShieldCheck, Truck } from "lucide-react";
import { hasValue, valueOf } from "./itemLookupHelpers";

function StockRow({ icon: Icon, label, value, unit, tone = "default" }) {
  const toneClass = {
    green: "text-emerald-400",
    red: "text-red-400",
    default: "text-foreground",
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-xs font-black text-foreground">{label}</span>
      </div>
      <span className={`text-sm font-black ${toneClass[tone] || toneClass.default}`}>
        {hasValue(value) ? `${value}${unit ? ` ${unit}` : ""}` : "—"}
      </span>
    </div>
  );
}

function deriveStockHealth(item) {
  const soh = valueOf(item, ["authoritativeQuantity", "authoritative_quantity"], null);
  if (!hasValue(soh)) return { label: "Stock health unavailable", tone: "amber", icon: AlertTriangle };
  const qty = Number(soh);
  if (qty <= 0) return { label: "No available stock", tone: "red", icon: PackageX };
  if (qty <= 5) return { label: "Low available stock", tone: "amber", icon: AlertTriangle };
  return { label: "Healthy stock", tone: "green", icon: CheckCircle2 };
}

export default function InventoryTab({ item }) {
  if (!item) return null;
  const unit = valueOf(item, ["unitOfMeasure", "unit_of_measure", "uom"], "");
  const sohAvailable = valueOf(item, ["authoritativeQuantity", "authoritative_quantity", "availableStock", "available_stock"], null);
  const sohOnHand = valueOf(item, ["stockOnHand", "stock_on_hand", "onHand", "on_hand"], null);
  const unavailableSoh = valueOf(item, ["unavailableSoh", "unavailable_soh"], null);
  const wasted = valueOf(item, ["wastedUnits", "wasted_units"], null);
  const committed = valueOf(item, ["committed", "committedToOrders"], null);
  const reserved = valueOf(item, ["reserved", "reservedForTransfers"], null);
  const health = deriveStockHealth(item);
  const healthTone = {
    green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    red: "border-red-500/30 bg-red-500/10 text-red-300",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  };

  return (
    <div className="space-y-2">
      <StockRow icon={PackageCheck} label="SOH Available" value={sohAvailable} unit={unit} tone={hasValue(sohAvailable) && Number(sohAvailable) <= 0 ? "red" : "green"} />
      <StockRow icon={Package} label="SOH On Hand" value={sohOnHand} unit={unit} />
      <StockRow icon={PackageX} label="Unavailable SOH" value={unavailableSoh} unit={unit} tone="red" />
      <StockRow icon={ShieldCheck} label="Wasted Units" value={wasted} unit={unit} tone="red" />
      <StockRow icon={Package} label="Committed to Orders" value={committed} unit={unit} />
      <StockRow icon={Truck} label="Reserved for Transfers" value={reserved} unit={unit} />
      <div className={`flex items-center gap-2.5 rounded-2xl border px-3 py-3 ${healthTone[health.tone]}`}>
        <health.icon className="h-5 w-5" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider opacity-80">Stock Health</p>
          <p className="text-sm font-black">{health.label}</p>
        </div>
      </div>
    </div>
  );
}