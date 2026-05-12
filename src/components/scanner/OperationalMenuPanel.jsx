import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, BadgeHelp, BadgePercent, BarChart3, Bell, ClipboardCheck, Database, Gauge, GitPullRequest, Info, ListChecks, LogOut, MonitorSmartphone, RefreshCw, ScanLine, Settings, ShieldCheck, Ticket, UsersRound, Wifi, X } from "lucide-react";
import { createScanOpsAuditEvent, getVisibleAuditEvents } from "../../lib/scanOpsAudit";
import { SCANOPS_EVENT_TYPES } from "../../lib/scanOpsEvents";
import { canApproveOverride, canChangeContext, canManageOffline, auditScopeLabel } from "../../lib/scanOpsPermissions";
import { canViewScanOpsReporting } from "../../lib/scanOpsReporting";
import { SCANOPS_ROLES, setScanOpsRolePreview, updateScanOpsSession, useScanOpsSession } from "../../lib/scanOpsSession";
import { resolveInventoryIdentity } from "../../lib/inventorySystemAdapter";
import { getNetworkMode, getSyncQueue, getSyncSummary, retryAllSyncEvents, setNetworkMode, SYNC_STATUSES } from "../../lib/scanOpsSync";

const MENU_SECTIONS = [
  { title: "Operations", items: [
    { id: "tasks_route", label: "Tasks", icon: ListChecks, description: "Open assigned handheld work" },
    { id: "sync_queue_route", label: "Sync Queue", icon: Database, description: "Review pending and failed records" },
    { id: "product_identity_review_route", label: "Product Identity Review", icon: GitPullRequest, description: "Review unknown items and alias evidence" },
    { id: "scanops_reporting_route", label: "ScanOps Reporting", icon: BarChart3, description: "Management queue health and exceptions", managementOnly: true },
    { id: "device_governance_route", label: "Device & Shift Governance", icon: MonitorSmartphone, description: "Device, user, role, and shift status" },
    { id: "session_collaboration_route", label: "Session Collaboration", icon: UsersRound, description: "Shared task ownership and handoff" },
    { id: "settings", label: "Settings", icon: Settings, description: "Beep, vibration, touch preferences" },
    { id: "device", label: "Device Info", icon: MonitorSmartphone, description: "Session, scanner, and store context" },
  ]},
  { title: "Daily Controls", items: [
    { id: "price_check_route", label: "Price Check", icon: BadgePercent, description: "Verify shelf price and promo labels" },
    { id: "sync", label: "Sync Now", icon: RefreshCw, description: "Push queued scanner events" },
    { id: "scanner", label: "Scanner Test", icon: ScanLine, description: "Check barcode / PLU input" },
    { id: "tickets", label: "Shelf Ticket Queue Status", icon: Ticket, description: "View desktop ticket queue handoff" },
  ]},
  { title: "Session", items: [
    { id: "audit", label: "Recent Audit Events", icon: Activity, description: "Trace IDs and role evidence" },
    { id: "override", label: "Request Supervisor Override", icon: ShieldCheck, description: "Create or review safe overrides" },
    { id: "end", label: "End Session", icon: LogOut, description: "Record session end event" },
  ]},
  { title: "Settings", items: [
    { id: "settings", label: "Scanner Settings", icon: Settings, description: "Beep, vibration, touch preferences" },
    { id: "sound", label: "Display & Sound", icon: Gauge, description: "Comfort settings" },
    { id: "offline", label: "Offline Mode", icon: Wifi, description: "Manager-controlled network posture" },
    { id: "context", label: "Store / Department Context", icon: ClipboardCheck, description: "Role-gated context changes" },
  ]},
  { title: "Support", items: [
    { id: "help", label: "Help / Workflow Guide", icon: BadgeHelp, description: "Quick operator guidance" },
    { id: "about", label: "About ScanOps", icon: Info, description: "Product and stage details" },
  ]},
];

function Section({ title, children }) {
  return <section className="rounded-2xl border border-border bg-background p-3 shadow-sm"><h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">{title}</h3>{children}</section>;
}

function SmallStat({ label, value }) {
  return <div className="rounded-xl bg-card border border-border p-2 text-center"><p className="text-[10px] text-muted-foreground">{label}</p><p className="text-sm font-bold text-foreground">{value}</p></div>;
}

function DevicePanel({ session, onMessage }) {
  const roleChange = (role) => {
    setScanOpsRolePreview(role);
    const event = createScanOpsAuditEvent(SCANOPS_EVENT_TYPES.SESSION_ROLE_PREVIEW_CHANGED, { status: "role_preview_changed", preview_role: role });
    onMessage(`Role preview changed · ${event.traceId || event.trace_id}`);
  };
  const details = [
    ["Actor", `${session.actorName} · ${session.actorRole}`], ["Environment", session.environment], ["Device", session.deviceId], ["Scanner", session.scannerId],
    ["Store", `${session.storeName} (${session.storeId})`], ["Department", `${session.departmentName} (${session.departmentId})`], ["Session", session.sessionId], ["Network", getNetworkMode()],
  ];
  return <Section title="Device Status"><div className="grid grid-cols-2 gap-2">{details.map(([label, value]) => <div key={label} className="rounded-xl bg-card border border-border p-3 min-w-0"><p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">{label}</p><p className="text-sm font-semibold text-foreground truncate">{value}</p></div>)}</div><div className="mt-3 rounded-xl border border-border bg-card p-3"><p className="text-xs font-bold text-foreground mb-1">Testing role preview</p><p className="text-xs text-muted-foreground mb-2">Prototype-only role preview for testing Staff, Supervisor, Manager, and Admin rules.</p><div className="grid grid-cols-2 gap-2">{SCANOPS_ROLES.map((role) => <button key={role} type="button" onClick={() => roleChange(role)} className={`rounded-xl border px-3 py-2 text-xs font-bold active:scale-[0.98] ${session.actorRole === role ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-secondary-foreground border-border"}`}>{role}</button>)}</div></div></Section>;
}

function ScannerPanel({ onMessage }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const runTest = (event) => {
    event.preventDefault();
    const value = input.trim();
    if (!value) return;
    const resolved = resolveInventoryIdentity(value);
    const audit = createScanOpsAuditEvent(SCANOPS_EVENT_TYPES.SCANNER_TEST_SCANNED, { status: resolved ? "test_resolved" : "test_unresolved", scanned_value: value, resolved_item_id: resolved?.id || null, resolved_sku: resolved?.sku || null, stock_mutation: false });
    setResult({ value, resolved, traceId: audit.traceId || audit.trace_id });
    onMessage(`Scanner test recorded · ${audit.traceId || audit.trace_id}`);
  };
  return <Section title="Scanner Test"><p className="text-xs text-muted-foreground mb-3">Accepts barcode, PLU, SKU, or internal ID. This never mutates stock.</p><form onSubmit={runTest} className="flex gap-2"><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Try 930000000001" className="min-w-0 flex-1 rounded-xl border border-input bg-card px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" /><button className="w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center"><ScanLine className="w-5 h-5" /></button></form>{result && <div className="mt-3 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground"><p className="font-bold text-foreground">Scanner input accepted</p><p className="truncate">Trace: {result.traceId}</p>{result.resolved ? <><p>Item: <span className="font-semibold text-foreground">{result.resolved.name}</span></p><p>SKU: {result.resolved.sku || "—"} · Stock mutation: <span className="font-semibold text-foreground">No</span></p></> : <p>No item resolved; no stock mutation occurred.</p>}</div>}</Section>;
}

function AuditPanel({ session, lastAction }) {
  const events = getVisibleAuditEvents(session).slice(0, 18);
  return <Section title="Recent Audit Events"><p className="text-xs text-muted-foreground mb-3">{auditScopeLabel(session)} · trace IDs included</p>{lastAction && <div className="mb-3 rounded-xl border border-accent/30 bg-accent/10 p-3 text-xs font-semibold text-foreground">{lastAction}</div>}<div className="space-y-2">{events.length === 0 ? <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No audit events yet.</div> : events.map((event) => <article key={event.event_id} className="rounded-xl border border-border bg-card p-3 overflow-hidden"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-sm font-bold text-foreground truncate">{String(event.event_type || "Event").replaceAll("_", " ")}</p><p className="text-xs text-muted-foreground truncate">{event.actorName || event.user_name} · {event.actorRole || event.role}</p></div><span className="text-[10px] rounded-full bg-secondary px-2 py-1 font-semibold text-muted-foreground shrink-0">{event.status}</span></div><p className="text-[11px] text-muted-foreground truncate mt-2">Trace: <span className="font-semibold text-foreground">{event.traceId || event.trace_id}</span></p><p className="text-[11px] text-muted-foreground truncate">Device: {event.deviceId || event.scanner_id} · Store: {event.storeId || event.location_id}</p><p className="text-[11px] text-muted-foreground truncate">Session: {event.sessionId || "—"}</p>{event.blocked_reason && <p className="mt-2 rounded-lg bg-destructive/10 text-destructive text-xs p-2">{event.blocked_reason}</p>}</article>)}</div></Section>;
}

function OverridePanel({ session, onMessage }) {
  const [reason, setReason] = useState("Manual review for safe action override");
  const events = getVisibleAuditEvents(session);
  const approved = new Set(events.filter((e) => e.event_type === SCANOPS_EVENT_TYPES.SUPERVISOR_OVERRIDE_APPROVED).map((e) => e.parent_event_id));
  const pending = events.filter((e) => e.event_type === SCANOPS_EVENT_TYPES.SUPERVISOR_OVERRIDE_REQUESTED && e.status === "pending_review" && !approved.has(e.event_id));
  const canApprove = canApproveOverride(session);
  const request = () => {
    const event = createScanOpsAuditEvent(SCANOPS_EVENT_TYPES.SUPERVISOR_OVERRIDE_REQUESTED, { status: "pending_review", override_reason: reason });
    onMessage(`Override request recorded · ${event.traceId || event.trace_id}`);
  };
  const approve = (requestEvent) => {
    if (!canApprove) {
      const event = createScanOpsAuditEvent(SCANOPS_EVENT_TYPES.PERMISSION_ATTEMPT_BLOCKED, { status: "blocked", attempted_action: "approve_supervisor_override", parent_event_id: requestEvent.event_id, blocked_reason: "Staff cannot approve supervisor overrides." });
      createScanOpsAuditEvent(SCANOPS_EVENT_TYPES.SUPERVISOR_OVERRIDE_BLOCKED, { status: "blocked", parent_event_id: requestEvent.event_id, blocked_reason: "Staff role attempted to approve a supervisor override." });
      onMessage(`Blocked attempt recorded · ${event.traceId || event.trace_id}`);
      return;
    }
    const event = createScanOpsAuditEvent(SCANOPS_EVENT_TYPES.SUPERVISOR_OVERRIDE_APPROVED, { status: "approved", parent_event_id: requestEvent.event_id, parent_trace_id: requestEvent.traceId || requestEvent.trace_id });
    onMessage(`Approved by ${session.actorRole} · ${event.traceId || event.trace_id}`);
  };
  return <Section title="Supervisor Override"><p className="text-xs text-muted-foreground mb-3">Staff can request. Supervisor, Manager, and Admin can approve safe overrides.</p><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full rounded-xl border border-input bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" /><button type="button" onClick={request} className="mt-2 w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-bold">Request Supervisor Override</button><div className="mt-3 space-y-2"><p className="text-xs font-bold text-foreground">Review controls · {session.actorRole}</p>{pending.length === 0 ? <p className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground text-center">No pending override requests.</p> : pending.map((event) => <article key={event.event_id} className="rounded-xl border border-border bg-card p-3"><p className="text-sm font-semibold text-foreground">{event.override_reason}</p><p className="text-xs text-muted-foreground truncate">Trace {event.traceId || event.trace_id}</p><button type="button" onClick={() => approve(event)} className={`mt-2 w-full rounded-xl py-2.5 text-xs font-bold ${canApprove ? "bg-accent text-accent-foreground" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>{canApprove ? `Approve as ${session.actorRole}` : "Try approve as Staff (logs blocked attempt)"}</button></article>)}</div></Section>;
}

function SettingsPanel({ session, onMessage }) {
  const [network, setNetwork] = useState(getNetworkMode());
  const block = (action, reason) => {
    const event = createScanOpsAuditEvent(SCANOPS_EVENT_TYPES.PERMISSION_ATTEMPT_BLOCKED, { status: "blocked", attempted_action: action, blocked_reason: reason });
    onMessage(`Blocked attempt recorded · ${event.traceId || event.trace_id}`);
  };
  const changeNetwork = (mode) => {
    if (!canManageOffline(session)) return block("change_offline_mode", "Only Manager/Admin can manage offline/sync controls.");
    setNetworkMode(mode);
    setNetwork(mode);
    const event = createScanOpsAuditEvent(mode === "offline" ? SCANOPS_EVENT_TYPES.OFFLINE_MODE_ENTERED : SCANOPS_EVENT_TYPES.ONLINE_MODE_RESTORED, { status: "saved", network_mode: mode });
    onMessage(`Network mode changed · ${event.traceId || event.trace_id}`);
  };
  const changeContext = () => {
    if (!canChangeContext(session)) return block("change_store_department_context", "Staff cannot change store/device context.");
    const next = session.departmentId === "grocery" ? { departmentId: "fresh", departmentName: "Fresh Foods" } : { departmentId: "grocery", departmentName: "Grocery" };
    updateScanOpsSession(next);
    const event = createScanOpsAuditEvent(SCANOPS_EVENT_TYPES.SCANOPS_SETTING_CHANGED, { status: "saved", setting_patch: next });
    onMessage(`Department context changed · ${event.traceId || event.trace_id}`);
  };
  return <Section title="Scanner Settings"><p className="text-xs text-muted-foreground mb-3">Comfort settings plus role-gated offline and store/department controls.</p><div className="grid grid-cols-2 gap-2"><button className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-bold">Beep On</button><button className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-bold">Vibration On</button><button className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-bold">Large Targets</button><button className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-bold">Comfortable</button></div><div className="mt-3 rounded-xl border border-border bg-card p-3"><p className="text-xs font-bold text-foreground">Offline Mode · {network}</p><div className="grid grid-cols-2 gap-2 mt-2"><button onClick={() => changeNetwork("online")} className="rounded-xl bg-secondary py-2 text-xs font-bold">Online</button><button onClick={() => changeNetwork("offline")} className="rounded-xl bg-secondary py-2 text-xs font-bold">Offline</button></div></div><div className="mt-3 rounded-xl border border-border bg-card p-3"><p className="text-xs font-bold text-foreground">Store / Department Context</p><p className="text-xs text-muted-foreground">{session.storeName} · {session.departmentName}</p><button type="button" onClick={changeContext} className="mt-2 w-full rounded-xl bg-secondary py-3 text-sm font-bold">Change Department Context</button></div></Section>;
}

function TicketsPanel() {
  const tickets = getSyncQueue().filter((e) => String(e.eventType || "").startsWith("SHELF_TICKET_"));
  const count = (status) => tickets.filter((e) => e.status === status).length;
  return <Section title="Shelf Ticket Queue Status"><p className="text-xs text-muted-foreground mb-3">Scanner-created ticket batches waiting for desktop preview/print handoff.</p><div className="grid grid-cols-4 gap-2"><SmallStat label="Total" value={tickets.length} /><SmallStat label="Waiting" value={count(SYNC_STATUSES.QUEUED) + count(SYNC_STATUSES.SYNC_PENDING)} /><SmallStat label="Synced" value={count(SYNC_STATUSES.SYNCED)} /><SmallStat label="Issue" value={count(SYNC_STATUSES.SYNC_FAILED) + count(SYNC_STATUSES.CONFLICT) + count(SYNC_STATUSES.NEEDS_REVIEW)} /></div>{tickets.length === 0 ? <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground text-center">No shelf ticket batches queued.</p> : <div className="mt-3 space-y-2">{tickets.slice(0, 8).map((entry) => <article key={entry.id} className="rounded-xl border border-border bg-card p-3"><p className="text-sm font-bold truncate">{entry.payloadSummary}</p><p className="text-xs text-muted-foreground truncate">{entry.statusLabel} · {entry.id}</p></article>)}</div>}</Section>;
}

export default function OperationalMenuPanel({ onClose }) {
  const navigate = useNavigate();
  const session = useScanOpsSession();
  const [panel, setPanel] = useState("menu");
  const [lastAction, setLastAction] = useState(null);
  const summary = useMemo(() => getSyncSummary(), [panel, lastAction]);
  const openPanel = (id) => { createScanOpsAuditEvent(SCANOPS_EVENT_TYPES.OPERATIONAL_PANEL_OPENED, { status: "viewed", panel_id: id }); if (id === "scanner") createScanOpsAuditEvent(SCANOPS_EVENT_TYPES.SCANNER_TEST_STARTED, { status: "started" }); if (id === "device") createScanOpsAuditEvent(SCANOPS_EVENT_TYPES.DEVICE_STATUS_VIEWED, { status: "viewed" }); if (id === "audit") createScanOpsAuditEvent(SCANOPS_EVENT_TYPES.AUDIT_EVENTS_VIEWED, { status: "viewed", audit_scope: auditScopeLabel(session) }); if (id === "tickets") createScanOpsAuditEvent(SCANOPS_EVENT_TYPES.SHELF_TICKET_QUEUE_STATUS_VIEWED, { status: "viewed" }); if (id === "settings") createScanOpsAuditEvent(SCANOPS_EVENT_TYPES.SCANOPS_SETTINGS_VIEWED, { status: "viewed" }); setPanel(id); };
  const action = (item) => {
    if (item.id === "tasks_route") { navigate("/tasks"); onClose(); return; }
    if (item.id === "sync_queue_route") { navigate("/sync-queue"); onClose(); return; }
    if (item.id === "price_check_route") { navigate("/price-check"); onClose(); return; }
    if (item.id === "product_identity_review_route") { navigate("/product-identity-review"); onClose(); return; }
    if (item.id === "scanops_reporting_route") { navigate("/scanops-reporting"); onClose(); return; }
    if (item.id === "device_governance_route") { navigate("/device-governance"); onClose(); return; }
    if (item.id === "session_collaboration_route") { navigate("/session-collaboration"); onClose(); return; }
    if (item.id === "sync") { const before = getSyncSummary(); const attempts = retryAllSyncEvents().filter(Boolean).length; const event = createScanOpsAuditEvent(SCANOPS_EVENT_TYPES.SYNC_NOW_REQUESTED, { status: "sync_requested", queued_before: before.queued, pending_before: before.pending, failed_before: before.failed, conflict_before: before.conflict, needs_review_before: before.needsReview, retry_attempts: attempts }); setLastAction(`Sync Now recorded · ${event.traceId || event.trace_id}`); setPanel("audit"); return; }
    if (["settings", "sound", "offline", "context"].includes(item.id)) return openPanel("settings");
    if (item.id === "end") { const event = createScanOpsAuditEvent(SCANOPS_EVENT_TYPES.SESSION_ENDED, { status: "session_end_requested" }); setLastAction(`Session end recorded · ${event.traceId || event.trace_id}`); setPanel("audit"); return; }
    return openPanel(item.id);
  };
  const active = () => {
    if (panel === "scanner") return <ScannerPanel onMessage={setLastAction} />;
    if (panel === "device") return <DevicePanel session={session} onMessage={setLastAction} />;
    if (panel === "tickets") return <TicketsPanel />;
    if (panel === "audit") return <AuditPanel session={session} lastAction={lastAction} />;
    if (panel === "override") return <OverridePanel session={session} onMessage={setLastAction} />;
    if (panel === "settings") return <SettingsPanel session={session} onMessage={setLastAction} />;
    if (panel === "help") return <Section title="Help / Workflow Guide"><p className="text-sm text-muted-foreground">Scan item → review identity → confirm action → sync/audit event is recorded. ScanOps executes handheld work; Invyra Inventory remains source of truth.</p></Section>;
    if (panel === "about") return <Section title="About ScanOps"><p className="text-sm font-semibold text-foreground">Invyra ScanOps</p><p className="text-xs text-muted-foreground">Stage AG — Multi-Device Session Collaboration layer.</p></Section>;
    return null;
  };
  return <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true"><button className="absolute inset-0 bg-foreground/30" aria-label="Close operational menu" onClick={onClose} /><aside className="absolute left-0 top-0 h-full w-full max-w-[430px] bg-card border-r border-border shadow-2xl flex flex-col overflow-hidden"><header className="px-4 py-3 border-b border-border flex items-start justify-between gap-3 shrink-0"><div className="min-w-0"><p className="text-xs font-semibold text-primary uppercase tracking-wide">Operational Menu</p><h2 className="text-base font-bold text-foreground">Invyra ScanOps</h2><p className="text-xs text-muted-foreground truncate">{session.actorName} · {session.actorRole} · {session.departmentName}</p></div><button type="button" onClick={onClose} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center active:bg-border" aria-label="Close menu"><X className="w-5 h-5" /></button></header><div className="px-4 py-3 border-b border-border bg-background/70 shrink-0"><div className="grid grid-cols-4 gap-2"><SmallStat label="Pending" value={summary.pending} /><SmallStat label="Review" value={summary.needsReview} /><SmallStat label="Failed" value={summary.failed} /><SmallStat label="Synced" value={summary.synced} /></div></div><main className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">{panel !== "menu" && <button type="button" onClick={() => setPanel("menu")} className="text-sm font-semibold text-primary active:opacity-70">← Back to menu</button>}{panel === "menu" ? <div className="space-y-4">{lastAction && <div className="rounded-xl border border-accent/30 bg-accent/10 p-3 flex items-start gap-2"><Bell className="w-4 h-4 text-accent mt-0.5 shrink-0" /><p className="text-xs font-semibold text-foreground">{lastAction}</p></div>}{MENU_SECTIONS.map((section) => <Section key={section.title} title={section.title}><div className="grid grid-cols-1 gap-2">{section.items.filter((item) => !item.managementOnly || canViewScanOpsReporting(session)).map((item) => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => action(item)} className="w-full rounded-xl border border-border bg-card p-3 text-left flex items-center gap-3 active:scale-[0.99] active:bg-secondary transition-all"><span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></span><span className="min-w-0"><span className="block text-sm font-bold text-foreground">{item.label}</span><span className="block text-xs text-muted-foreground truncate">{item.description}</span></span></button>; })}</div></Section>)}</div> : active()}</main></aside></div>;
}
