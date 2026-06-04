import React from "react";
import { useScanOpsSession } from "../../lib/scanOpsSession";
import { useScanOpsGovernanceContext } from "../../lib/scanOpsGovernance";
import { useCurrentUser } from "../../lib/useCurrentUser";
import HeaderOperationalMenu from "./HeaderOperationalMenu";
import SyncStatusChip from "./SyncStatusChip";

export default function AppHeader() {
  // Sync real auth identity into session on mount
  useCurrentUser();
  const session = useScanOpsSession();
  const governance = useScanOpsGovernanceContext();
  const meta = [session.actorName, session.actorRole, governance.shiftLabel, governance.deviceLabel || session.deviceId].filter(Boolean).join(" · ");
  return (
    <header className="bg-card border-b border-border px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <HeaderOperationalMenu />
          <div className="min-w-0">
            <h1 className="text-base font-bold text-foreground tracking-tight truncate">Invyra ScanOps</h1>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{meta}</p>
          </div>
        </div>
        <SyncStatusChip />
      </div>
    </header>
  );
}