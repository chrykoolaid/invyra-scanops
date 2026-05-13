import React, { useMemo } from "react";
import { AlertTriangle, CheckCircle2, WifiOff } from "lucide-react";
import { getNetworkMode, getSyncSummary } from "../../lib/scanOpsSync";

export default function SyncStatusBanner() {
  const { mode, summary } = useMemo(() => ({ mode: getNetworkMode(), summary: getSyncSummary() }), []);
  if (mode !== "offline" && summary.pending === 0 && summary.failed === 0 && summary.conflict === 0) return null;
  const issueCount = summary.failed + summary.conflict;
  const hasIssue = issueCount > 0;
  const Icon = hasIssue ? AlertTriangle : mode === "offline" ? WifiOff : CheckCircle2;
  const text = hasIssue ? `Sync failed · ${issueCount} item${issueCount === 1 ? "" : "s"} needs retry` : mode === "offline" ? `Offline · ${summary.pending} pending` : `Pending sync · ${summary.pending}`;
  return <div className={`${hasIssue ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-primary/10 text-primary border-primary/20"} border-b px-4 py-2 flex items-center gap-2 text-xs font-semibold`}><Icon className="w-4 h-4 shrink-0" /><span className="break-words">{text}</span></div>;
}
