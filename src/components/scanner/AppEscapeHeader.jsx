import React from "react";
import { Home } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const ROUTE_TITLES = [
  { pattern: /^\/$/, title: "Home", hidden: true },
  { pattern: /^\/scan\/?$/, title: "Scan" },
  { pattern: /^\/product\/[^/]+\/?$/, title: "Product Lookup" },
  { pattern: /^\/stock-count\/?$/, title: "Stock Count" },
  { pattern: /^\/receiving\/?$/, title: "Receiving" },
  { pattern: /^\/replenish\/?$/, title: "Replenishment" },
  { pattern: /^\/price-check\/?$/, title: "Price Check" },
  { pattern: /^\/gap-scan\/?$/, title: "Gap Scan" },
  { pattern: /^\/markdowns\/?$/, title: "Markdowns" },
  { pattern: /^\/waste\/?$/, title: "Waste" },
  { pattern: /^\/expiry-check\/?$/, title: "Expiry Check" },
  { pattern: /^\/tasks\/?$/, title: "Tasks" },
  { pattern: /^\/inventory-sync\/?$/, title: "Inventory Sync" },
  { pattern: /^\/sync-queue\/?$/, title: "Sync Queue" },
  { pattern: /^\/shelf-tickets\/?$/, title: "Shelf Tickets" },
  { pattern: /^\/transfers\/?$/, title: "Transfers" },
  { pattern: /^\/product-identity-review\/?$/, title: "Product Review" },
  { pattern: /^\/scanops-reporting\/?$/, title: "Reporting" },
  { pattern: /^\/device-governance\/?$/, title: "Device Governance" },
  { pattern: /^\/session-collaboration\/?$/, title: "Session Collaboration" },
  { pattern: /^\/desktop-sync-contract\/?$/, title: "Desktop Sync Contract" },
  { pattern: /^\/store-ops-dashboard\/?$/, title: "Store Ops Dashboard" },
  { pattern: /^\/pilot-readiness\/?$/, title: "Pilot Readiness" },
];

function getRouteTitle(pathname) {
  const match = ROUTE_TITLES.find((route) => route.pattern.test(pathname));
  if (!match) return "Current Screen";
  return match.hidden ? null : match.title;
}

export default function AppEscapeHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const title = getRouteTitle(location.pathname);

  if (!title) return null;

  return (
    <header className="scanops-app-escape-header" data-scanops-fixed-section>
      <button
        type="button"
        className="scanops-home-escape-button"
        onClick={() => navigate("/")}
        aria-label="Return to Home"
      >
        <Home className="h-4 w-4" aria-hidden="true" />
        <span>Home</span>
      </button>
      <div className="scanops-current-route-label" aria-label={`Current screen: ${title}`}>
        {title}
      </div>
    </header>
  );
}
