import React from "react";
import { Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AppEscapeHeader({ title = "ScanOps", subtitle = "Return to Home available" }) {
  const navigate = useNavigate();

  return (
    <header className="scanops-app-escape-header" data-scanops-app-escape-header>
      <button
        type="button"
        onClick={() => navigate("/")}
        className="scanops-app-escape-button"
        aria-label="Return to Home"
      >
        <Home className="h-5 w-5" aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-black leading-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-xs font-semibold leading-snug text-muted-foreground">{subtitle}</p>}
      </div>
    </header>
  );
}
