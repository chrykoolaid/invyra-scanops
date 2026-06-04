import React from "react";
import { Zap } from "lucide-react";

export default function ContinuousScanToggle({ enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition-colors active:scale-[0.98] ${
        enabled
          ? "bg-accent text-accent-foreground"
          : "bg-secondary text-muted-foreground"
      }`}
      aria-pressed={enabled}
      title={enabled ? "Continuous scan ON — each new scan auto-saves the current item" : "Continuous scan OFF — confirm each item manually"}
    >
      <Zap className="h-3.5 w-3.5" />
      {enabled ? "Continuous" : "Single"}
    </button>
  );
}