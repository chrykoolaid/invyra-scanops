import React, { useMemo, useState } from "react";
import { BatteryMedium, Database, MonitorSmartphone, RotateCcw, ShieldCheck, UserRoundCheck, Wifi } from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import { InfoLine, PageShell, SectionCard, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import {
  GOVERNANCE_STATES,
  GOVERNED_ACTIONS,
  canPerformScanOpsAction,
  createGovernanceEvent,
  endScanOpsShift,
  getGovernanceEvents,
  resetScanOpsGovernanceDemoState,
  startScanOpsShift,
  useScanOpsGovernanceContext,
} from "../lib/scanOpsGovernance";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return value;
  }
}

function StatusBadge({ children, active = false }) {
  return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${active ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>{children}</span>;
}

function MiniButton({ children, onClick, disabled = false, variant = "secondary" }) {
  const cls = variant === "primary"
    ? "bg-primary text-primary-foreground active:scale-[0.98]"
    : variant === "danger"
      ? "bg-red-50 text-red-700 active:bg-red-100"
      : "bg-secondary text-secondary-foreground active:bg-border";
  return <button type="button" onClick={onClick} disabled={disabled} className={`min-h-11 rounded-2xl px-3 text-xs font-black disabled:opacity-40 ${cls}`}>{children}</button>;
}

function PanelHeader({ icon: Icon, title, helper }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0">
        <h2 className="text-sm font-black text-foreground">{title}</h2>
        {helper && <p className="mt-0.5 text-xs font-semibold leading-snug text-muted-foreground">{helper}</p>}
      </div>
    </div>
  );
}

function PermissionRow({ actionKey, label, context }) {
  const result = canPerformScanOpsAction(actionKey, context);
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-foreground">{label}</p>
          <p className="mt-1 break-words text-xs font-semibold text-muted-foreground">{result.allowed ? "Allowed for current context" : result.reason}</p>
        </div>
        <StatusBadge active={result.allowed}>{result.allowed ? "Allowed" : "Blocked"}</StatusBadge>
      </div>
    </div>
  );
}

export default function DeviceGovernance() {
  const context = useScanOpsGovernanceContext();
  const [events, setEvents] = useState(() => getGovernanceEvents());
  const shiftActive = context.shiftStatus === GOVERNANCE_STATES.SHIFT_ACTIVE;
  const isAdmin = context.currentUserRole === "Admin";

  const refresh = () => setEvents(getGovernanceEvents());

  const startShift = () => {
    startScanOpsShift(context.shiftLabel || "Morning Shift");
    createScanOpsEvent(SCANOPS_EVENT_TYPES.GOVERNANCE_SHIFT_STARTED, { source_module: "Device Governance", status: "shift_active" });
    refresh();
  };

  const endShift = () => {
    endScanOpsShift();
    createScanOpsEvent(SCANOPS_EVENT_TYPES.GOVERNANCE_SHIFT_ENDED, { source_module: "Device Governance", status: "shift_ended" });
    refresh();
  };

  const resetDemo = () => {
    if (!isAdmin) {
      createGovernanceEvent("ACTION_BLOCKED", {
        eventLabel: "Reset pilot governance blocked",
        sourceWorkflow: "Device Governance",
        actionAllowed: false,
        blockedReason: "Admin only",
        requiredRole: "Admin",
      });
      createScanOpsEvent(SCANOPS_EVENT_TYPES.GOVERNANCE_ACTION_BLOCKED, { source_module: "Device Governance", status: "blocked", blocked_reason: "Admin only" });
      refresh();
      return;
    }
    resetScanOpsGovernanceDemoState();
    createScanOpsEvent(SCANOPS_EVENT_TYPES.GOVERNANCE_DEMO_RESET, { source_module: "Device Governance", status: "pilot_reset" });
    refresh();
  };

  const permissionRows = useMemo(() => [
    [GOVERNED_ACTIONS.WASTE_SUBMIT, "Waste submission"],
    [GOVERNED_ACTIONS.WASTE_APPROVE_NORMAL, "Waste approval"],
    [GOVERNED_ACTIONS.SHRINK_APPROVE_HIGH_VALUE, "Shrink / high-risk approval"],
    [GOVERNED_ACTIONS.ADJUSTMENT_CONTRACT_CREATE, "Adjustment contract"],
    [GOVERNED_ACTIONS.MARKDOWN_APPROVE, "Markdown approval"],
    [GOVERNED_ACTIONS.SHELF_TICKET_PRINT_HANDOFF, "Shelf-ticket handoff"],
  ], []);

  return (
    <PageShell className="bold-blocks">
      <PageHeader title="Device & Shift Governance" subtitle="Local device, user, role, and shift context" />
      <WorkflowMain>
        <SectionCard className="space-y-3">
          <PanelHeader icon={UserRoundCheck} title="Current Session" helper="Pilot-safe identity used by governed ScanOps workflows." />
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-secondary/60 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">User</p>
              <p className="mt-1 break-words text-sm font-black text-foreground">{context.currentUserName}</p>
            </div>
            <div className="rounded-2xl bg-secondary/60 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Role</p>
              <p className="mt-1 text-sm font-black text-foreground">{context.currentUserRole}</p>
            </div>
            <div className="rounded-2xl bg-secondary/60 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Session</p>
              <p className="mt-1 text-sm font-black text-foreground">ACTIVE</p>
            </div>
            <div className="rounded-2xl bg-secondary/60 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Shift</p>
              <p className="mt-1 text-sm font-black text-foreground">{shiftActive ? "Active" : "Ended"}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-background/70 p-3 border border-border space-y-2">
            <InfoLine label="Store" value={`${context.storeName} (${context.storeId})`} />
            <InfoLine label="Location" value={`${context.locationName} (${context.locationId})`} />
            <InfoLine label="Device" value={`${context.deviceLabel || context.deviceId}`} />
            <InfoLine label="Session ID" value={context.sessionId} />
          </div>
        </SectionCard>

        <SectionCard className="space-y-3">
          <PanelHeader icon={ShieldCheck} title="Shift Controls" helper="Shift status gates governed submissions, approvals, and contracts." />
          <div className="rounded-2xl border border-border bg-background/70 p-3 space-y-2">
            <InfoLine label="Status" value={shiftActive ? "Active" : "Ended / Not active"} />
            <InfoLine label="Started" value={formatDateTime(context.shiftStartedAt)} />
            <InfoLine label="Started by" value={context.shiftStartedBy || "—"} />
            <InfoLine label="Ended" value={formatDateTime(context.shiftEndedAt)} />
            <InfoLine label="Ended by" value={context.shiftEndedBy || "—"} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MiniButton onClick={startShift} disabled={shiftActive} variant="primary">Start Shift</MiniButton>
            <MiniButton onClick={endShift} disabled={!shiftActive}>End Shift</MiniButton>
          </div>
        </SectionCard>

        <SectionCard className="space-y-3">
          <PanelHeader icon={MonitorSmartphone} title="Device Status" helper="No real MDM, SSO, biometric, remote lock, or printer pairing is claimed here." />
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-secondary/60 p-3"><MonitorSmartphone className="h-4 w-4 text-primary" /><p className="mt-2 text-xs font-bold text-muted-foreground">Device ID</p><p className="break-words text-sm font-black text-foreground">{context.deviceId}</p></div>
            <div className="rounded-2xl bg-secondary/60 p-3"><Wifi className="h-4 w-4 text-primary" /><p className="mt-2 text-xs font-bold text-muted-foreground">Network</p><p className="text-sm font-black text-foreground">{context.networkStatus}</p></div>
            <div className="rounded-2xl bg-secondary/60 p-3"><Database className="h-4 w-4 text-primary" /><p className="mt-2 text-xs font-bold text-muted-foreground">Sync</p><p className="text-sm font-black text-foreground">Sync deferred</p></div>
            <div className="rounded-2xl bg-secondary/60 p-3"><BatteryMedium className="h-4 w-4 text-primary" /><p className="mt-2 text-xs font-bold text-muted-foreground">Battery</p><p className="text-sm font-black text-foreground">Pilot placeholder</p></div>
          </div>
          <p className="rounded-2xl bg-secondary/50 px-3 py-2 text-xs font-bold leading-snug text-muted-foreground">Printer pairing remains deferred to the shelf-ticket / markdown handoff contract flow. Stage AF only records governance context.</p>
        </SectionCard>

        <SectionCard className="space-y-3">
          <PanelHeader icon={ShieldCheck} title="Permission Preview" helper="Reusable action checks for role, device/session, and shift state." />
          <div className="space-y-2">
            {permissionRows.map(([key, label]) => <PermissionRow key={key} actionKey={key} label={label} context={context} />)}
          </div>
        </SectionCard>

        <SectionCard className="space-y-3">
          <PanelHeader icon={Database} title="Recent Governance Events" helper="Allowed and blocked actions are kept as local audit evidence." />
          {events.length ? (
            <div className="space-y-2">
              {events.slice(0, 6).map((event) => (
                <div key={event.eventId} className="rounded-2xl border border-border bg-background/70 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-black text-foreground">{event.eventLabel || event.eventType}</p>
                      <p className="mt-1 break-words text-xs font-semibold text-muted-foreground">{event.actorName} · {event.actorRole} · {formatDateTime(event.createdAt)}</p>
                      {event.blockedReason && <p className="mt-1 break-words text-xs font-black text-red-700">{event.blockedReason}</p>}
                    </div>
                    <StatusBadge active={event.actionAllowed !== false}>{event.actionAllowed === false ? "Blocked" : "Recorded"}</StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-secondary/50 px-3 py-3 text-sm font-bold text-muted-foreground">No governance events recorded yet.</p>
          )}
          {isAdmin ? <MiniButton onClick={resetDemo} variant="danger"><RotateCcw className="mr-1 inline h-3.5 w-3.5" /> Reset Pilot Governance</MiniButton> : <p className="rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-black text-muted-foreground">Admin only</p>}
        </SectionCard>
      </WorkflowMain>
    </PageShell>
  );
}