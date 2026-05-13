import React from "react";
import { Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SyncStatusChip from "./SyncStatusChip";

export default function PageHeader({ title, subtitle, showHome = true }) {
  const navigate = useNavigate();
  return (
    <header className="bg-card border-b border-border px-4 py-3">
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
    </header>
  );
}
