import React from "react";
import { MapPin, ShieldCheck } from "lucide-react";

export default function LocationsTab({ item }) {
  if (!item) return null;
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 px-3 py-4 text-blue-200">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-black">Location stock not included</p>
            <p className="mt-1 text-xs font-bold leading-snug opacity-85">
              The certified Item Lookup response does not include site availability, primary shelf location, or multi-location quantities.
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-2xl border border-border bg-card px-3 py-3 text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-xs font-bold leading-snug">
          ScanOps will not infer a location from stale or local data. Location visibility requires a later Inventory-owned read contract.
        </p>
      </div>
    </div>
  );
}
