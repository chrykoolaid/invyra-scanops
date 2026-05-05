import React from "react";
import { AlertTriangle, ArrowLeftRight } from "lucide-react";
import { getAvailableStockForTransfer, getLocationLabel, getReasonLabel, getTransferTypeLabel } from "../../lib/scanOpsTransferRules";

export default function TransferReviewCard({ draft, validation }) {
  const available = draft.item && draft.sourceLocation ? getAvailableStockForTransfer(draft.item, draft.sourceLocation) : "—";
  const rows = [
    ["Transfer", getTransferTypeLabel(draft.transferType)],
    ["Item", draft.item?.name || "Not scanned"],
    ["Source", getLocationLabel(draft.sourceLocation)],
    ["Destination", getLocationLabel(draft.destinationLocation)],
    ["Quantity", `${draft.quantity || 0} ${draft.unitType || draft.item?.unitType || "each"}`],
    ["Available snapshot", available === "—" ? "—" : `${available} ${draft.unitType || draft.item?.unitType || "each"}`],
    ["Reason", draft.reason ? getReasonLabel(draft.reason) : "—"],
    ["Stock mutation", "No direct stock mutation"],
  ];
  const title = validation?.review ? "Supervisor review required" : validation?.ok ? "Ready to queue" : "Incomplete transfer";
  return (
    <section className={`rounded-2xl border p-4 min-w-0 ${validation?.review ? "bg-destructive/5 border-destructive/20" : "bg-card border-border"}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${validation?.review ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>{validation?.review ? <AlertTriangle className="w-5 h-5" /> : <ArrowLeftRight className="w-5 h-5" />}</div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Review transfer</p>
          <h2 className="text-base font-bold text-foreground mt-1 break-words">{title}</h2>
          <p className="text-xs text-muted-foreground mt-1 break-words">{validation?.message}</p>
        </div>
      </div>
      <div className="divide-y divide-border mt-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-3 py-3">
            <span className="text-sm text-muted-foreground shrink-0">{label}</span>
            <span className="text-sm font-semibold text-foreground text-right min-w-0 break-words">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
