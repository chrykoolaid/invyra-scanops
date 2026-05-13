import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock3, WifiOff } from "lucide-react";
import { getSyncHeaderState } from "../../lib/scanOpsSync";
import { useScanOpsSession } from "../../lib/scanOpsSession";

const tone = {
  synced: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  pending: "bg-primary/10 text-primary border-primary/20",
  issue: "bg-destructive/10 text-destructive border-destructive/20",
  offline: "bg-amber-500/10 text-amber-700 border-amber-500/20",
};

const iconMap = {
  synced: CheckCircle2,
  pending: Clock3,
  issue: AlertTriangle,
  offline: WifiOff,
};

export default function SyncStatusChip({ compact = false }) {
  const navigate = useNavigate();
  const session = useScanOpsSession();
  const state = useMemo(() => getSyncHeaderState(), [session]);
  const Icon = iconMap[state.state] || CheckCircle2;
  const count = state.state === "issue" ? state.summary.issue : ["pending", "offline"].includes(state.state) ? state.summary.pending : 0;
  const label = count > 0 && !compact ? `${state.label} · ${count}` : state.label;

  return (
    <button
      type="button"
      onClick={() => navigate("/sync-queue")}
      className={`inline-flex max-w-[132px] shrink-0 items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-[11px] font-black active:scale-[0.98] transition-all ${tone[state.state] || tone.synced}`}
      aria-label="Open Sync Queue"
      title="Open Sync Queue"
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}
