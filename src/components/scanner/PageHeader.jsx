import React from "react";
import { Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SyncStatusChip from "./SyncStatusChip";

const SYNC_STATUS_GUIDE = {
  label: "Sync Status",
  steps: ["Saved locally", "Pending handoff", "Review issues", "Retry safely"],
  helper: "Scanner work stays on the device until it can be handed off or reviewed. Retry does not post stock by itself.",
};

const CONTEXT_GUIDES = {
  Receiving: {
    label: "Receive Stock",
    steps: ["Delivery", "Scan item", "Expected vs received", "Submit"],
    helper: "Receiving saves evidence for Inventory Desktop. It does not post stock directly.",
  },
  "Stock Count": {
    label: "Count Stock",
    steps: ["Session", "Scan item", "Count quantity", "Review"],
    helper: "Stock Count is formal count evidence. Variances go to review before inventory action.",
  },
  "Count Stock": {
    label: "Count Stock",
    steps: ["Session", "Scan item", "Count quantity", "Review"],
    helper: "Stock Count is formal count evidence. Variances go to review before inventory action.",
  },
  "Inventory Handoff": SYNC_STATUS_GUIDE,
  "Sync Status": SYNC_STATUS_GUIDE,
};

function HeaderContextGuide({ guide }) {
  if (!guide) return null;
  return (
    <div className="mt-3 rounded-2xl border border-border bg-background/80 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{guide.label}</p>
          <p className="mt-1 text-xs font-bold leading-snug text-muted-foreground">{guide.helper}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {guide.steps.map((step, index) => (
          <div key={step} className="rounded-xl bg-secondary/70 px-2.5 py-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Step {index + 1}</p>
            <p className="mt-0.5 text-xs font-black text-foreground">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PageHeader({ title, subtitle, showHome = true }) {
  const navigate = useNavigate();
  const contextGuide = CONTEXT_GUIDES[title];

  return (
    <header className="bg-card border-b border-border px-4 py-3" data-scanops-page-header>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {showHome && (
            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-secondary active:bg-border transition-colors shrink-0"
              aria-label="Return to Home"
            >
              <Home className="w-5 h-5 text-foreground" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-base font-bold text-foreground truncate">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>
        <SyncStatusChip compact />
      </div>
      <HeaderContextGuide guide={contextGuide} />
    </header>
  );
}
