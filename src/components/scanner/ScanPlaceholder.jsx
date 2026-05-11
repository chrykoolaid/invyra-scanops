import React from "react";
import { Keyboard, ScanLine } from "lucide-react";

export default function ScanPlaceholder({
  onSimulate,
  label = "Barcode, PLU, SKU, shelf label, or item name",
  value,
  onChange,
  placeholder = "Barcode / PLU / SKU / Shelf Label",
}) {
  const [internalValue, setInternalValue] = React.useState("");
  const inputValue = value ?? internalValue;
  const handleChange = (event) => {
    const next = event.target.value;
    setInternalValue(next);
    onChange?.(next);
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-3 shadow-sm min-w-0">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ScanLine className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-black leading-tight text-foreground">Scan / Enter Item</h2>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground break-words">{label}</p>
        </div>
      </div>

      <label className="mt-3 flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5 min-w-0 focus-within:ring-2 focus-within:ring-primary/25">
        <Keyboard className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={inputValue}
          onChange={handleChange}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground placeholder:text-muted-foreground outline-none"
        />
      </label>

      <button
        type="button"
        onClick={onSimulate}
        className="mt-2.5 w-full min-h-11 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-all active:scale-[0.98]"
      >
        Simulate Scan
      </button>
    </section>
  );
}
