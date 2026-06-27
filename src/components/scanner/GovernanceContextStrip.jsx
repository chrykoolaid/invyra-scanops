import React from "react";
import { ShieldCheck } from "lucide-react";
import { GOVERNANCE_STATES, useScanOpsGovernanceContext } from "../../lib/scanOpsGovernance";

export default function GovernanceContextStrip({ compact = true }) {
  const context = useScanOpsGovernanceContext();
  const shiftActive = context.shiftStatus === GOVERNANCE_STATES.SHIFT_ACTIVE;
  const pieces = [
    context.currentUserName,
    context.currentUserRole,
    context.shiftLabel || "No shift",
    context.deviceLabel || context.deviceId,
  ].filter(Boolean);

  return (
    <div className={`rounded-xl border ${shiftActive ? "border-primary/15 bg-primary/5" : "border-amber-200 bg-amber-50"} px-2.5 py-1.5`}>
      <div className="flex items-center gap-2 min-w-0">
        <ShieldCheck className={`h-3.5 w-3.5 shrink-0 ${shiftActive ? "text-primary" : "text-amber-700"}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-black text-foreground">{pieces.join(" · ")}</p>
          {!compact && (
            <p className="mt-0.5 truncate text-[11px] font-semibold text-muted-foreground">
              {shiftActive ? "Governance context active · sync deferred" : "Shift ended · governed submissions are blocked until a shift is started"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
