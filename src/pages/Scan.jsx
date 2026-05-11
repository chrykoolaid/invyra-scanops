import React from "react";
import { useNavigate } from "react-router-dom";
import { Flashlight, Keyboard } from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import ScanPlaceholder from "../components/scanner/ScanPlaceholder";

export default function Scan() {
  const navigate = useNavigate();

  const handleSimulateScan = () => {
    navigate("/product/demo");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <PageHeader title="Scan Product" subtitle="Product Lookup" />

      <main className="flex-1 px-4 py-5 pb-8 space-y-4 overflow-y-auto overflow-x-hidden">
        <ScanPlaceholder onSimulate={handleSimulateScan} label="Scan or enter a barcode, PLU, SKU, or shelf label." />

        <section className="rounded-2xl border border-border bg-card p-4 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Scanner controls</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-xl bg-secondary py-3.5 text-sm font-bold text-secondary-foreground transition-all active:scale-[0.98] active:bg-border"
            >
              <Flashlight className="h-4 w-4" />
              Torch
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-xl bg-secondary py-3.5 text-sm font-bold text-secondary-foreground transition-all active:scale-[0.98] active:bg-border"
            >
              <Keyboard className="h-4 w-4" />
              Manual
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Handheld scanner ready</p>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">
            Hardware trigger, keyboard wedge input, manual entry, and test scan flows use the same product lookup path. No stock is changed from this scan screen.
          </p>
        </section>
      </main>
    </div>
  );
}
