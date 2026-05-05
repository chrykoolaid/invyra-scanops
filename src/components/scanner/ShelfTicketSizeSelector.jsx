import React from "react";
import { SHELF_TICKET_TYPE_OPTIONS } from "../../lib/scanOpsShelfTicketRules";

const BUTTON = "rounded-2xl px-3 py-4 text-sm font-bold active:scale-[0.98] transition-all min-h-[64px] text-center leading-snug";

export default function ShelfTicketSizeSelector({ value, onChange }) {
  return (
    <section className="bg-card rounded-2xl border border-border p-4 space-y-3 min-w-0">
      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ticket size / type</p>
        <p className="text-xs text-muted-foreground mt-1">Select once, then scan multiple items. Change it before the next scan if needed.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {SHELF_TICKET_TYPE_OPTIONS.map((option) => (
          <button key={option.id} type="button" onClick={() => onChange(option.id)} className={`${BUTTON} ${value === option.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground active:bg-border"}`}>
            <span className="block">{option.label}</span>
            <span className="block text-[11px] font-semibold opacity-80 mt-1">{option.helper}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
