import React from "react";
import { ChevronDown } from "lucide-react";

export default function TouchSelect({ label, value, onChange, options, helper, placeholder = "Select" }) {
  return (
    <label className="block min-w-0">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      {helper && <span className="mt-1 block text-xs leading-snug text-muted-foreground">{helper}</span>}
      <span className="relative mt-2 block">
        <select
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full appearance-none rounded-2xl border border-border bg-card px-4 pr-10 text-sm font-bold text-foreground outline-none transition-all focus:ring-2 focus:ring-primary/25"
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((option) => (
            <option key={option.id || option.value} value={option.id || option.value}>
              {option.label || option.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </span>
    </label>
  );
}
