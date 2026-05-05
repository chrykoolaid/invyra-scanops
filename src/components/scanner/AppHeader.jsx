import React, { useMemo } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { getNetworkMode, getSyncSummary } from "../../lib/scanOpsSync";
import { useScanOpsSession } from "../../lib/scanOpsSession";
import HeaderOperationalMenu from "./HeaderOperationalMenu";

export default function AppHeader() {
  const session = useScanOpsSession();
  const { mode, summary } = useMemo(() => ({ mode: getNetworkMode(), summary: getSyncSummary() }), [session]);
  const isOnline = mode !== "offline";
  const waiting = summary.queued + summary.failed + summary.conflict;
  return (
    <header className="bg-card border-b border-border px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <HeaderOperationalMenu />
          <div className="min-w-0">
            <h1 className="text-base font-bold text-foreground tracking-tight truncate">Invyra ScanOps</h1>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{session.actorName} · {session.actorRole} · {session.departmentName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4 text-accent" />
              <span className="text-xs font-medium text-accent">{waiting ? `${waiting} queued` : "Synced"}</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-destructive" />
              <span className="text-xs font-medium text-destructive">Offline</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
