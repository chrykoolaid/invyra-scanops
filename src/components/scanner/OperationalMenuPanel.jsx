import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BadgeHelp,
  Bell,
  GitPullRequest,
  Info,
  LogOut,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { createScanOpsAuditEvent } from "../../lib/scanOpsAudit";
import { SCANOPS_EVENT_TYPES } from "../../lib/scanOpsEvents";
import { hasRoleAtLeast, restrictedActionReason } from "../../lib/scanOpsPermissions";
import { useScanOpsSession } from "../../lib/scanOpsSession";
import { getSyncSummary } from "../../lib/scanOpsSync";

const MENU_SECTIONS = [
  {
    title: "Support",
    helper: "Help and device support only.",
    items: [
      { label: "Report Issue", icon: AlertTriangle, description: "Report a problem or workflow issue", route: "/pilot-readiness" },
      { label: "Scanner Settings", icon: Settings, description: "Device controls, diagnostics, and users", route: "/scanner-settings" },
      { label: "Help", icon: BadgeHelp, description: "Quick operator guidance", panel: "help" },
      { label: "About ScanOps", icon: Info, description: "App info and version", panel: "about" },
      { label: "End Session", icon: LogOut, description: "Record session end event", action: "end" },
    ],
  },
  {
    title: "Manager Tools",
    helper: "Review tools that are not Home workflow tiles.",
    minRole: "Supervisor",
    items: [
      { label: "Store Exceptions", icon: ShieldCheck, description: "View and resolve exceptions", route: "/store-ops-dashboard", minRole: "Manager" },
      { label: "Product Review", icon: GitPullRequest, description: "Review unknown items and evidence", route: "/product-identity-review", minRole: "Supervisor" },
    ],
  },
];

function canSeeMenuNode(node, session) {
  return !node.minRole || hasRoleAtLeast(session.actorRole, node.minRole);
}

function Section({ title, helper, children }) {
  return (
    <section className="rounded-2xl border border-border bg-background p-3 shadow-sm">
      <div className="mb-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h3>
        {helper && <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{helper}</p>}
      </div>
      {children}
    </section>
  );
}

function SmallStat({ label, value }) {
  return <div className="rounded-xl bg-card border border-border p-2 text-center"><p className="text-[10px] text-muted-foreground">{label}</p><p className="text-sm font-bold text-foreground">{value}</p></div>;
}

export default function OperationalMenuPanel({ onClose }) {
  const navigate = useNavigate();
  const session = useScanOpsSession();
  const [panel, setPanel] = useState("menu");
  const [lastAction, setLastAction] = useState(null);
  const summary = useMemo(() => getSyncSummary(), [lastAction]);
  const visibleSections = useMemo(() => MENU_SECTIONS
    .filter((section) => canSeeMenuNode(section, session))
    .map((section) => ({ ...section, items: section.items.filter((item) => canSeeMenuNode(item, session)) }))
    .filter((section) => section.items.length > 0), [session]);

  const action = (item) => {
    if (!canSeeMenuNode(item, session)) {
      const reason = restrictedActionReason(item.minRole || "Supervisor");
      createScanOpsAuditEvent(SCANOPS_EVENT_TYPES.PERMISSION_ATTEMPT_BLOCKED, { status: "blocked", attempted_action: item.route || item.panel || item.action || item.label, blocked_reason: reason });
      setLastAction(reason);
      return;
    }
    if (item.route) {
      navigate(item.route);
      onClose();
      return;
    }
    if (item.action === "end") {
      const event = createScanOpsAuditEvent(SCANOPS_EVENT_TYPES.SESSION_ENDED, { status: "session_end_requested" });
      setLastAction(`Session end recorded · ${event.traceId || event.trace_id}`);
      setPanel("about");
      return;
    }
    createScanOpsAuditEvent(SCANOPS_EVENT_TYPES.OPERATIONAL_PANEL_OPENED, { status: "viewed", panel_id: item.panel });
    setPanel(item.panel || "menu");
  };

  const active = () => {
    if (panel === "help") return <Section title="Help / Workflow Guide" helper="Home launches work. This drawer is for support."><p className="text-sm text-muted-foreground">Use the Home tiles for daily workflows. Use Scanner Settings for device behaviour, diagnostics, users, and shift context. Use Sync & Handoff from Home for queue, setup, contracts, and sync status.</p></Section>;
    if (panel === "about") return <Section title="About ScanOps"><p className="text-sm font-semibold text-foreground">Invyra ScanOps</p><p className="text-xs text-muted-foreground">Support drawer only. No workflow shortcuts are duplicated here.</p></Section>;
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-foreground/30" aria-label="Close operational menu" onClick={onClose} />
      <aside className="absolute left-0 top-0 h-full w-full max-w-[430px] bg-card border-r border-border shadow-2xl flex flex-col overflow-hidden">
        <header className="px-4 py-3 border-b border-border flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">Support Menu</p>
            <h2 className="text-base font-bold text-foreground">Invyra ScanOps</h2>
            <p className="text-xs text-muted-foreground truncate">{session.actorName} · {session.actorRole} · {session.departmentName}</p>
          </div>
          <button type="button" onClick={onClose} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center active:bg-border" aria-label="Close menu"><X className="w-5 h-5" /></button>
        </header>
        <div className="px-4 py-3 border-b border-border bg-background/70 shrink-0"><div className="grid grid-cols-4 gap-2"><SmallStat label="Pending" value={summary.pending} /><SmallStat label="Review" value={summary.needsReview} /><SmallStat label="Blocked" value={summary.failed + summary.conflict} /><SmallStat label="Ready" value={summary.synced} /></div></div>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
          {panel !== "menu" && <button type="button" onClick={() => setPanel("menu")} className="text-sm font-semibold text-primary active:opacity-70">← Back to menu</button>}
          {panel === "menu" ? (
            <div className="space-y-4">
              {lastAction && <div className="rounded-xl border border-accent/30 bg-accent/10 p-3 flex items-start gap-2"><Bell className="w-4 h-4 text-accent mt-0.5 shrink-0" /><p className="text-xs font-semibold text-foreground">{lastAction}</p></div>}
              {visibleSections.map((section) => (
                <Section key={section.title} title={section.title} helper={section.helper}>
                  <div className="grid grid-cols-1 gap-2">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return <button key={`${section.title}-${item.label}`} type="button" onClick={() => action(item)} className="w-full rounded-xl border border-border bg-card p-3 text-left flex items-center gap-3 active:scale-[0.99] active:bg-secondary transition-all"><span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></span><span className="min-w-0"><span className="block text-sm font-bold text-foreground">{item.label}</span><span className="block text-xs text-muted-foreground truncate">{item.description}</span></span></button>;
                    })}
                  </div>
                </Section>
              ))}
            </div>
          ) : active()}
        </main>
      </aside>
    </div>
  );
}
