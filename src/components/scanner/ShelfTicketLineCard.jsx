import React from "react";
import { Trash2 } from "lucide-react";

export default function ShelfTicketLineCard({ line, index, onRemove }) {
  return (
    <div className="rounded-2xl bg-secondary/60 px-4 py-3 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">#{index + 1} · {line.ticketSizeLabel}</p>
          <h3 className="text-sm font-bold text-foreground mt-1 break-words">{line.description}</h3>
          <p className="text-xs text-muted-foreground mt-1 break-all">{line.sku || line.plu || line.barcode || "No identity"}</p>
          <p className="text-xs text-muted-foreground mt-1 break-words">{line.shelfLocation} · {line.displayPrice}</p>
        </div>
        <button type="button" onClick={() => onRemove(line.ticketLineId)} className="w-10 h-10 rounded-xl bg-background text-muted-foreground flex items-center justify-center active:scale-[0.98] shrink-0" aria-label="Remove item">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
