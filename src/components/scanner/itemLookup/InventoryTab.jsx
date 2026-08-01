import React from "react";
import { PackageSearch, ShieldCheck } from "lucide-react";

export default function InventoryTab({ item }) {
  if (!item) return null;
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 px-3 py-4 text-blue-200">
        <div className="flex items-start gap-3">
          <PackageSearch className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-black">Inventory quantities not included</p>
            <p className="mt-1 text-xs font-bold leading-snug opacity-85">
              Stock on hand, available stock, committed stock, wastage, and transfer reservations are not part of the certified Item Lookup read contract.
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-2xl border border-border bg-card px-3 py-3 text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-xs font-bold leading-snug">
          No quantity is estimated, cached, or inferred. A later Inventory-owned stock visibility contract must authorise this tab before values can appear.
        </p>
      </div>
    </div>
  );
}
