import React from "react";
import { BarChart3, ShieldCheck } from "lucide-react";

export default function SalesTab({ item }) {
  if (!item) return null;
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 px-3 py-4 text-blue-200">
        <div className="flex items-start gap-3">
          <BarChart3 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-black">Sales data not included</p>
            <p className="mt-1 text-xs font-bold leading-snug opacity-85">
              Sales totals, averages, last-sold dates, and trend series are not part of the certified Item Lookup read contract.
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-2xl border border-border bg-card px-3 py-3 text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-xs font-bold leading-snug">
          No chart or sales value is simulated. A later Inventory-owned sales visibility contract must supply authorised data before this tab is enabled.
        </p>
      </div>
    </div>
  );
}
