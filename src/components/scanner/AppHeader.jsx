import React from "react";
import { useScanOpsSession } from "../../lib/scanOpsSession";
import { useScanOpsGovernanceContext } from "../../lib/scanOpsGovernance";
import { useCurrentUser } from "../../lib/useCurrentUser";
import SyncStatusChip from "./SyncStatusChip";

export default function AppHeader() {
  useCurrentUser();
  const session = useScanOpsSession();
  const governance = useScanOpsGovernanceContext();
  const meta = [session.actorName, session.actorRole, governance.shiftLabel, governance.deviceLabel || session.deviceId].filter(Boolean).join(" Â· ");

  return (
    <header className="bg-card border-b border-border px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base font-bold text-foreground tracking-tight truncate">Invyra ScanOps</h1>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{meta}</p>
        </div>
        <SyncStatusChip />
      </div>
    </header>
  );
}