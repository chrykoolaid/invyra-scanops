import React from "react";
import { Printer, Send } from "lucide-react";
import ShelfTicketLineCard from "./ShelfTicketLineCard";

export default function ShelfTicketBatchCard({ batch, onRemove, onSend, disabled }) {
  const lines = batch?.lines || [];
  return (
    <section className="bg-card rounded-2xl border border-border p-4 space-y-3 min-w-0">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Printer className="w-5 h-5" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-primary uppercase tracking-wider">Current shelf ticket batch</p>
          <h2 className="text-lg font-bold text-foreground mt-1 break-words">{lines.length} item{lines.length === 1 ? "" : "s"}</h2>
          <p className="text-xs text-muted-foreground mt-1 break-words">{batch?.ticketBatchId} · {batch?.syncStatus?.replaceAll("_", " ")}</p>
        </div>
      </div>
      {lines.length === 0 ? (
        <div className="rounded-2xl bg-secondary/60 px-4 py-5 text-center">
          <p className="text-sm font-bold text-foreground">No items scanned yet</p>
          <p className="text-xs text-muted-foreground mt-1">Scan an item to add it to the desktop shelf-ticket batch.</p>
        </div>
      ) : (
        <div className="space-y-2">{lines.map((line, index) => <ShelfTicketLineCard key={line.ticketLineId} line={line} index={index} onRemove={onRemove} />)}</div>
      )}
      <button type="button" onClick={onSend} disabled={disabled || lines.length === 0} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40">
        <Send className="w-4 h-4" />Send to Desktop
      </button>
    </section>
  );
}
