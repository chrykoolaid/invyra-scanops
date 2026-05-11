import React from "react";
import { Keyboard, ScanLine } from "lucide-react";

export default function ScanPlaceholder({ onSimulate, label = "Scan barcode, PLU, SKU, or shelf label" }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm min-w-0">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ScanLine className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black leading-tight text-foreground">Scan Product</h2>
          <p className="mt-1 text-sm leading-snug text-muted-foreground break-words">{label}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-input bg-background px-4 py-3 min-w-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Keyboard className="h-4 w-4 shrink-0" />
          <span className="truncate">Barcode / PLU / SKU / Shelf Label</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onSimulate}
        className="mt-3 w-full rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground transition-all active:scale-[0.98]"
      >
        Simulate Scan
      </button>
    </section>
  );
}
