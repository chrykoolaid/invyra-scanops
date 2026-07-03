import React from "react";
import { useScanOpsSession } from "../../lib/scanOpsSession";
import { useScanOpsGovernanceContext } from "../../lib/scanOpsGovernance";
import { useCurrentUser } from "../../lib/useCurrentUser";
import SyncStatusChip from "./SyncStatusChip";

function HeaderMetaPill({ value }) {
  if (!value) return null;
  return (
    <span className="max-w-[7.5rem] truncate rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground" title={value}>
      {value}
    </span>
  );
}

export default function AppHeader() {
  useCurrentUser();
  const session = useScanOpsSession();
  const governance = useScanOpsGovernanceContext();
  const metaItems = [
    session.actorName || "Operator",
    session.actorRole || "Role",
    governance.shiftLabel || "Shift",
    governance.deviceLabel || session.deviceId || "Device ready",
  ].filter(Boolean);

  return (
    <header className="bg-card border-b border-border px-4 py-3" aria-label="ScanOps session header">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold text-foreground tracking-tight truncate">Invyra ScanOps</h1>
          <div className="mt-1 flex flex-wrap items-center gap-1.5" aria-label="Current ScanOps session context">
            {metaItems.map((item, index) => <HeaderMetaPill key={`${item}:${index}`} value={item} />)}
          </div>
        </div>
        <SyncStatusChip />
      </div>
    </header>
  );
}
