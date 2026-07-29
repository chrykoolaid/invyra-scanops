import React from "react";
import { hasValue, valueOf } from "./itemLookupHelpers";

function MetricCell({ label, value, tone = "default" }) {
  const toneClass = {
    green: "text-emerald-400",
    red: "text-red-400",
    default: "text-foreground",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-2.5">
      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 break-words text-sm font-black ${toneClass[tone] || toneClass.default}`}>{value}</p>
    </div>
  );
}

export default function SummaryTab({ item }) {
  if (!item) return null;
  const unit = valueOf(item, ["unitOfMeasure", "unit_of_measure", "uom"], "");
  const adjustIn = valueOf(item, ["adjustIn7d", "adjust_in_7d", "adjustIn"], null);
  const adjustOut = valueOf(item, ["adjustOut7d", "adjust_out_7d", "adjustOut"], null);
  const lastReceivedDate = valueOf(item, ["lastReceivedDate", "last_received_date", "updatedDate", "updated_date"], null);
  const lastReceivedQty = valueOf(item, ["lastReceivedQty", "last_received_qty"], null);
  const inTransit = valueOf(item, ["inTransit", "in_transit", "pendingDeliveryQty", "pending_delivery_qty"], null);
  const wasted = valueOf(item, ["wastedUnits", "wasted_units"], null);
  const unavailableSoh = valueOf(item, ["unavailableSoh", "unavailable_soh"], null);
  const shelfCapacity = valueOf(item, ["shelfCapacity", "shelf_capacity"], "N/A");
  const cartonCapacity = valueOf(item, ["cartonCapacity", "carton_capacity"], "N/A");
  const mdq = valueOf(item, ["mdq", "MDQ"], "N/A");
  const pdq = valueOf(item, ["pdq", "PDQ"], "0");

  const fmt = (val, suffix = "") => hasValue(val) ? `${val}${suffix ? ` ${suffix}` : ""}` : "—";

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-muted-foreground">Key Snapshot</p>
        <div className="grid grid-cols-2 gap-2">
          <MetricCell label="Adjust In (7 days)" value={fmt(adjustIn, unit)} tone={hasValue(adjustIn) ? "green" : "default"} />
          <MetricCell label="Adjust Out (7 days)" value={fmt(adjustOut, unit)} tone={hasValue(adjustOut) ? "red" : "default"} />
          <MetricCell label="Last Received" value={fmt(lastReceivedDate)} />
          <MetricCell label="Last Received Qty" value={fmt(lastReceivedQty, unit)} />
          <MetricCell label="In Transit" value={fmt(inTransit, unit)} />
          <MetricCell label="Wasted Units" value={fmt(wasted, unit)} />
          <MetricCell label="Unavailable SOH" value={fmt(unavailableSoh, unit)} />
          <MetricCell label="Batch Tracked" value={valueOf(item, ["batchTracked", "batch_tracked"], "—") === true ? "Yes" : "No"} />
        </div>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-muted-foreground">Reference Info</p>
        <div className="grid grid-cols-3 gap-2">
          <MetricCell label="Shelf Capacity" value={shelfCapacity} />
          <MetricCell label="Carton Capacity" value={cartonCapacity} />
          <MetricCell label="MDQ / PDQ" value={`${mdq} / ${pdq}`} />
        </div>
      </div>
    </div>
  );
}