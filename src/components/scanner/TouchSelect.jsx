import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function optionValue(option) {
  if (typeof option === "string" || typeof option === "number") return String(option);
  return String(option.id ?? option.value ?? option.label ?? option.name ?? "");
}

function optionLabel(option) {
  if (typeof option === "string" || typeof option === "number") return String(option);
  return String(option.label ?? option.name ?? option.id ?? option.value ?? "Option");
}

export default function TouchSelect({ label, value, onChange, options = [], helper = "", placeholder = "Select" }) {
  return (
    <div className="block min-w-0">
      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      {helper && <p className="mt-1 text-xs leading-snug text-muted-foreground">{helper}</p>}
      <Select value={value ? String(value) : ""} onValueChange={onChange}>
        <SelectTrigger className="mt-2 h-12 w-full rounded-2xl border border-border bg-card px-4 text-left text-sm font-bold text-foreground shadow-sm focus:ring-2 focus:ring-primary/25">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-[min(18rem,70dvh)] rounded-2xl border-border bg-card p-1 shadow-xl z-[80]">
          {options.map((option) => {
            const val = optionValue(option);
            return (
              <SelectItem
                key={val}
                value={val}
                className="min-h-11 rounded-xl px-3 py-3 text-sm font-bold focus:bg-secondary"
              >
                <span className="flex flex-col gap-0.5">
                  <span>{optionLabel(option)}</span>
                  {option.helper && <span className="text-[11px] font-medium text-muted-foreground">{option.helper}</span>}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
