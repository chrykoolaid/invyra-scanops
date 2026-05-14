import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock3, WifiOff } from "lucide-react";
import { getSyncHeaderState } from "../../lib/scanOpsSync";
import { useScanOpsSession } from "../../lib/scanOpsSession";

const tone = {
  ready: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  pending: "bg-primary/10 text-primary border-primary/20",
  issue: "bg-destructive/10 text-destructive border-destructive/20",
  offline: "bg-amber-500/10 text-amber-700 border-amber-500/20",
};

const iconMap = {
  ready: CheckCircle2,
  pending: Clock3,
  issue: AlertTriangle,
  offline: WifiOff,
};

export default function SyncStatusChip({ compact = false }) {
  const navigate = useNavigate();
  const session = useScanOpsSession();
  const state = useMemo(() => getSyncHeaderState(), [session]);
  const chipState = state.state === "synced" ? "ready" : state.state;
  const Icon = iconMap[chipState] || CheckCircle2;
  const count = state.state === "issue" ? state.summary.issue : ["pending", "offline"].includes(state.state) ? state.summary.pending : 0;
  const displayLabel = state.state === "synced" ? "Ready" : state.label;
  const label = count > 0 && !compact ? `${displayLabel} · ${count}` : displayLabel;

  return (
    <button
      type="button"
      onClick={() => navigate("/sync-queue")}
      className={`inline-flex max-w-[132px] shrink-0 items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-[11px] font-black active:scale-[0.98] transition-all ${tone[chipState] || tone.ready}`}
      aria-label="Open Inventory Handoff"
      title="Open Inventory Handoff"
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}
