import React from "react";
import { Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AppEscapeHeader({ title = "ScanOps", subtitle = "Return to Home available" }) {
  const navigate = useNavigate();
  const homeLabel = `Return to ScanOps Home from ${title}`;

  return (
    <header className="app-escape-header scanops-app-escape-header" data-scanops-app-escape-header aria-label={`${title} route header`}>
      <button
        type="button"
        onClick={() => navigate("/")}
        className="scanops-app-escape-button"
        aria-label={homeLabel}
        title={homeLabel}
      >
        <Home className="h-5 w-5" aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-black leading-tight text-foreground" title={title}>{title}</h1>
        {subtitle && <p className="mt-0.5 line-clamp-2 text-xs font-semibold leading-snug text-muted-foreground" title={subtitle}>{subtitle}</p>}
      </div>
    </header>
  );
}
