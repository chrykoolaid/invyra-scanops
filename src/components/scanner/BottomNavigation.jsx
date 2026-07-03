import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Bell, Home, ScanLine } from "lucide-react";

const NAV_ITEMS = [
  { label: "Home", to: "/", icon: Home, matches: ["/"] },
  { label: "Scan", to: "/scan", icon: ScanLine, primary: true, matches: ["/scan", "/product"] },
  { label: "Alerts", to: "/alerts", icon: Bell, matches: ["/alerts"] },
];

export default function BottomNavigation() {
  const { pathname } = useLocation();

  return (
    <nav className="scanops-bottom-nav scanops-bottom-nav-three" aria-label="ScanOps primary navigation">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = item.matches.some((match) => match === "/" ? pathname === "/" : pathname.startsWith(match));
        const itemLabel = `${item.label}${active ? " current page" : ""}`;
        return (
          <NavLink key={item.label} to={item.to} className={`scanops-bottom-nav-item ${active ? "is-active" : ""} ${item.primary ? "is-primary" : ""}`} aria-label={itemLabel} title={itemLabel} aria-current={active ? "page" : undefined}>
            <span className="scanops-bottom-nav-icon"><Icon className="h-5 w-5" aria-hidden="true" /></span>
            <span className="text-[10px] font-black uppercase tracking-wide">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
