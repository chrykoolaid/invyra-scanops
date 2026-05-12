import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  GitCompareArrows,
  Hand,
  LockKeyhole,
  MonitorSmartphone,
  RotateCcw,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import { InfoLine, PageShell, SectionCard, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import {
  COLLABORATION_STATES,
  approveCollaborationTakeover,
  claimCollaborationTask,
  forceReleaseCollaborationTask,
  releaseCollaborationTask,
  requestCollaborationTakeover,
  resetScanOpsCollaborationDemoState,
  resolveCollaborationConflict,
  useScanOpsCollaboration,
} from "../lib/scanOpsCollaboration";
import { GOVERNED_ACTIONS, canPerformScanOpsAction, useScanOpsGovernanceContext } from "../lib/scanOpsGovernance";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return value;
  }
}

function statusTone(status) {
  if (status === COLLABORATION_STATES.TASK_AVAILABLE) return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (status === COLLABORATION_STATES.TASK_CONFLICT_REVIEW_REQUIRED) return "bg-amber-50 text-amber-700 border-amber-100";
  if (status === COLLABORATION_STATES.TASK_RELEASED) return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-primary/10 text-primary border-primary/10";
}

function StatusBadge({ status, label }) {
  return (
    <span className={`inline-flex shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${statusTone(status)}`}>
      {label || String(status || "Status").replaceAll("_", " ")}
    </span>
  );
}

function MiniButton({ children, onClick, disabled = false, variant = "secondary" }) {
  const cls = variant === "primary"
    ? "bg-primary text-primary-foreground active:scale-[0.98]"
    : variant === "danger"
      ? "bg-red-50 text-red-700 active:bg-red-100"
      : "bg-secondary text-secondary-foreground active:bg-border";
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`min-h-11 rounded-2xl px-3 text-xs font-black disabled:opacity-40 ${cls}`}>
      {children}
    </button>
  );
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

function DeviceCard({ device }) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-black text-foreground">{device.deviceLabel} · {device.userName}</p>
          <p className="mt-1 text-xs font-bold text-muted-foreground">{device.role} · {device.shiftLabel}</p>
        </div>
        <StatusBadge status={COLLABORATION_STATES.DEVICE_JOINED_SESSION} label={device.isCurrentDevice ? "You" : device.status} />
      </div>
      <p className="mt-2 truncate text-[11px] font-semibold text-muted-foreground">{device.helper}</p>
    </div>
  );
}

function TaskCard({ task, selected, onClick }) {
  const ownerLine = task.ownerUserName ? `Owner: ${task.ownerUserName} · ${task.ownerDeviceId}` : "Available to claim";
  const isConflict = task.conflictStatus === COLLABORATION_STATES.TASK_CONFLICT_REVIEW_REQUIRED || task.ownershipStatus === COLLABORATION_STATES.TASK_CONFLICT_REVIEW_REQUIRED;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-3 text-left active:scale-[0.995] ${selected ? "border-primary bg-primary/5" : "border-border bg-background/70"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-foreground">{task.taskLabel}</p>
          <p className="mt-1 break-words text-xs font-bold text-muted-foreground">{isConflict ? "Manager review required" : ownerLine}</p>
        </div>
        <StatusBadge status={isConflict ? COLLABORATION_STATES.TASK_CONFLICT_REVIEW_REQUIRED : task.ownershipStatus} label={isConflict ? "Review" : task.ownershipStatus === COLLABORATION_STATES.TASK_AVAILABLE ? "Available" : "Claimed"} />
      </div>
      <p className="mt-2 line-clamp-2 text-[11px] font-semibold leading-snug text-muted-foreground">{task.taskSummary}</p>
    </button>
  );
}

function MessageCard({ message }) {
  if (!message) return null;
  return <div className="rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-bold text-foreground">{message}</div>;
}

function SelectedTaskPanel({ task, context, onAction }) {
  const [reason, setReason] = useState("Owner away from device");
  const [notes, setNotes] = useState("Need to continue shared shelf work.");

  if (!task) {
    return (
      <SectionCard className="space-y-3">
        <PanelHeader icon={Hand} title="Selected Task" helper="Choose a shared task to view ownership, lock, and takeover controls." />
        <p className="rounded-2xl bg-secondary/50 px-3 py-3 text-sm font-bold text-muted-foreground">No task selected.</p>
      </SectionCard>
    );
  }

  const isOwnedByCurrent = task.ownerUserId === context.currentUserId || task.ownerDeviceId === "HH-001";
  const isOwnedByOther = Boolean(task.ownerUserId && !isOwnedByCurrent);
  const isAvailable = task.ownershipStatus === COLLABORATION_STATES.TASK_AVAILABLE || (!task.ownerUserId && task.conflictStatus !== COLLABORATION_STATES.TASK_CONFLICT_REVIEW_REQUIRED);
  const isConflict = task.conflictStatus === COLLABORATION_STATES.TASK_CONFLICT_REVIEW_REQUIRED || task.ownershipStatus === COLLABORATION_STATES.TASK_CONFLICT_REVIEW_REQUIRED;
  const canApproveTakeover = canPerformScanOpsAction(GOVERNED_ACTIONS.COLLAB_TASK_TAKEOVER_APPROVE, context).allowed;
  const canForceRelease = canPerformScanOpsAction(GOVERNED_ACTIONS.COLLAB_TASK_FORCE_RELEASE, context).allowed;
  const conflictActionKey = task.conflictRisk === "HIGH" ? GOVERNED_ACTIONS.COLLAB_CONFLICT_RESOLVE_HIGH : GOVERNED_ACTIONS.COLLAB_CONFLICT_RESOLVE;
  const conflictPermission = canPerformScanOpsAction(conflictActionKey, context);

  return (
    <SectionCard className="space-y-3">
      <PanelHeader icon={LockKeyhole} title="Selected Task" helper="Soft locks prevent duplicate edits while preserving view access." />

      <div className="rounded-2xl bg-secondary/60 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="break-words text-base font-black text-foreground">{task.taskLabel}</p>
            <p className="mt-1 break-words text-xs font-bold text-muted-foreground">{task.sourceWorkflow} · {task.sourceRecordId || "local/demo record"}</p>
          </div>
          <StatusBadge status={isConflict ? COLLABORATION_STATES.TASK_CONFLICT_REVIEW_REQUIRED : task.ownershipStatus} label={isConflict ? "Review" : task.ownershipStatus === COLLABORATION_STATES.TASK_AVAILABLE ? "Available" : "Claimed"} />
        </div>
        <div className="mt-3 space-y-2">
          <InfoLine label="Owner" value={task.ownerUserName ? `${task.ownerUserName} · ${task.ownerRole}` : "Available"} />
          <InfoLine label="Device" value={task.ownerDeviceId || "—"} />
          <InfoLine label="Shift" value={task.ownerShiftLabel || context.shiftLabel || "—"} />
          <InfoLine label="Lock" value={task.lockMode || "NONE"} />
          <InfoLine label="Sync" value="Deferred" />
        </div>
      </div>

      {isOwnedByOther && !isConflict && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
          <p className="text-sm font-black text-amber-800">Task owned by another device</p>
          <p className="mt-1 text-xs font-semibold leading-snug text-amber-700">{task.ownerUserName} on {task.ownerDeviceId} is currently working on this task. You can view it or request takeover.</p>
        </div>
      )}

      {isConflict && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
          <p className="text-sm font-black text-amber-800">Conflict review required</p>
          <p className="mt-1 text-xs font-semibold leading-snug text-amber-700">{task.conflictReason === "QUANTITY_MISMATCH" ? "Two devices submitted different quantities." : task.conflictReason || "Shared task conflict captured."} {task.conflictRisk === "HIGH" ? "Manager review is required before sync." : "Supervisor review is required before sync."}</p>
        </div>
      )}

      {!isConflict && isOwnedByOther && (
        <div className="space-y-2">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Takeover reason</span>
            <select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-input bg-card px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20">
              <option>Owner away from device</option>
              <option>Customer waiting</option>
              <option>Supervisor reassignment</option>
              <option>Device unavailable</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Notes</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} className="mt-2 w-full rounded-2xl border border-input bg-card px-3 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" />
          </label>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {isAvailable && <MiniButton variant="primary" onClick={() => onAction(claimCollaborationTask(task.taskId), SCANOPS_EVENT_TYPES.COLLAB_TASK_CLAIMED)}>Claim Task</MiniButton>}
        {isOwnedByCurrent && <MiniButton onClick={() => onAction(releaseCollaborationTask(task.taskId), SCANOPS_EVENT_TYPES.COLLAB_TASK_RELEASED)}>Release Own</MiniButton>}
        {isOwnedByOther && !isConflict && <MiniButton onClick={() => onAction({ ok: true, task }, SCANOPS_EVENT_TYPES.COLLAB_SESSION_VIEWED)}>View Only</MiniButton>}
        {isOwnedByOther && !isConflict && <MiniButton variant={canApproveTakeover ? "primary" : "secondary"} onClick={() => onAction(canApproveTakeover ? approveCollaborationTakeover(task.taskId, reason) : requestCollaborationTakeover(task.taskId, reason, notes), canApproveTakeover ? SCANOPS_EVENT_TYPES.COLLAB_TAKEOVER_APPROVED : SCANOPS_EVENT_TYPES.COLLAB_TAKEOVER_REQUESTED)}>{canApproveTakeover ? "Take Over" : "Request Takeover"}</MiniButton>}
        {isOwnedByOther && canForceRelease && !isConflict && <MiniButton variant="danger" onClick={() => onAction(forceReleaseCollaborationTask(task.taskId), SCANOPS_EVENT_TYPES.COLLAB_FORCE_RELEASED)}>Force Release</MiniButton>}
        {isConflict && <MiniButton disabled={!conflictPermission.allowed} onClick={() => onAction(resolveCollaborationConflict(task.taskId, "KEEP_FIRST"), SCANOPS_EVENT_TYPES.COLLAB_CONFLICT_RESOLVED)}>Keep First</MiniButton>}
        {isConflict && <MiniButton disabled={!conflictPermission.allowed} onClick={() => onAction(resolveCollaborationConflict(task.taskId, "KEEP_LATEST"), SCANOPS_EVENT_TYPES.COLLAB_CONFLICT_RESOLVED)}>Keep Latest</MiniButton>}
        {isConflict && <MiniButton disabled={!conflictPermission.allowed} onClick={() => onAction(resolveCollaborationConflict(task.taskId, "KEEP_SEPARATE"), SCANOPS_EVENT_TYPES.COLLAB_CONFLICT_RESOLVED)}>Keep Separate</MiniButton>}
        {isConflict && <MiniButton disabled={!conflictPermission.allowed} variant="danger" onClick={() => onAction(resolveCollaborationConflict(task.taskId, "ESCALATE"), SCANOPS_EVENT_TYPES.COLLAB_CONFLICT_RESOLVED)}>Escalate</MiniButton>}
      </div>
      {isConflict && !conflictPermission.allowed && <p className="rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-bold text-muted-foreground">{conflictPermission.reason}</p>}
    </SectionCard>
  );
}

function EventRow({ event }) {
  const label = event.eventLabel || String(event.eventType || "Collaboration event").replaceAll("_", " ");
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-foreground">{label}</p>
          <p className="mt-1 break-words text-xs font-bold text-muted-foreground">{event.actorName} · {event.actorRole} · {event.deviceId}</p>
        </div>
        <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-muted-foreground">{event.actionAllowed === false ? "Blocked" : "Recorded"}</span>
      </div>
      <p className="mt-2 text-[11px] font-semibold text-muted-foreground">{formatDateTime(event.createdAt)} · Sync deferred</p>
    </div>
  );
}

export default function SessionCollaboration() {
  const context = useScanOpsGovernanceContext();
  const collaboration = useScanOpsCollaboration();
  const [selectedTaskId, setSelectedTaskId] = useState("task_markdown_batch_004");
  const [message, setMessage] = useState("");

  useEffect(() => {
    createScanOpsEvent(SCANOPS_EVENT_TYPES.COLLAB_SESSION_VIEWED, { source_module: "Session Collaboration", status: "viewed", sync_status: "SYNC_DEFERRED" });
  }, []);

  const tasks = collaboration.tasks || [];
  const selectedTask = useMemo(() => tasks.find((task) => task.taskId === selectedTaskId) || tasks[0] || null, [tasks, selectedTaskId]);
  const activeDevices = collaboration.devices || [];
  const events = collaboration.events || [];

  const handleAction = (result, eventType) => {
    const ok = result?.ok !== false;
    createScanOpsEvent(ok ? eventType : SCANOPS_EVENT_TYPES.COLLAB_ACTION_BLOCKED, {
      source_module: "Session Collaboration",
      status: ok ? "recorded" : "blocked",
      task_id: result?.task?.taskId || selectedTask?.taskId,
      task_label: result?.task?.taskLabel || selectedTask?.taskLabel,
      blocked_reason: result?.reason || null,
      sync_status: "SYNC_DEFERRED",
    });
    setMessage(ok ? "Collaboration action recorded locally. Sync remains deferred until Stage AH." : (result?.reason || "Action blocked by collaboration rules."));
  };

  const resetDemo = () => {
    resetScanOpsCollaborationDemoState();
    createScanOpsEvent(SCANOPS_EVENT_TYPES.COLLAB_SESSION_VIEWED, { source_module: "Session Collaboration", status: "demo_reset", sync_status: "SYNC_DEFERRED" });
    setSelectedTaskId("task_markdown_batch_004");
    setMessage("Local/demo collaboration state reset.");
  };

  return (
    <PageShell>
      <PageHeader title="Session Collaboration" subtitle="Shared task ownership, handoff, and conflict review" />
      <WorkflowMain>
        <SectionCard className="space-y-3 border-primary/20 bg-primary/5">
          <PanelHeader icon={UsersRound} title="Current Collaboration Session" helper="Local collaboration preview. No real cloud, WebSocket, desktop sync, or push transport is active." />
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-background/80 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Store Ops Session</p>
              <p className="mt-1 text-sm font-black text-foreground">Active</p>
            </div>
            <div className="rounded-2xl bg-background/80 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Sync</p>
              <p className="mt-1 text-sm font-black text-foreground">Deferred</p>
            </div>
            <div className="rounded-2xl bg-background/80 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">User</p>
              <p className="mt-1 break-words text-sm font-black text-foreground">{context.currentUserName}</p>
            </div>
            <div className="rounded-2xl bg-background/80 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Device</p>
              <p className="mt-1 text-sm font-black text-foreground">HH-001</p>
            </div>
          </div>
          <InfoLine label="Role / Shift" value={`${context.currentUserRole} · ${context.shiftLabel || "Morning Shift"}`} />
        </SectionCard>

        <MessageCard message={message} />

        <SectionCard className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <PanelHeader icon={MonitorSmartphone} title="Active Devices" helper="Demo devices are labelled as local preview participants." />
            <StatusBadge status={COLLABORATION_STATES.COLLAB_SESSION_ACTIVE} label="Local" />
          </div>
          <div className="space-y-2">
            {activeDevices.map((device) => <DeviceCard key={device.deviceId} device={device} />)}
          </div>
        </SectionCard>

        <SectionCard className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <PanelHeader icon={GitCompareArrows} title="Shared Tasks" helper="Claim, release, request takeover, or send conflicts to review." />
            <MiniButton onClick={resetDemo}><RotateCcw className="mr-1 inline h-3.5 w-3.5" /> Reset</MiniButton>
          </div>
          <div className="space-y-2">
            {tasks.map((task) => <TaskCard key={task.taskId} task={task} selected={selectedTask?.taskId === task.taskId} onClick={() => setSelectedTaskId(task.taskId)} />)}
          </div>
        </SectionCard>

        <SelectedTaskPanel task={selectedTask} context={context} onAction={handleAction} />

        <SectionCard className="space-y-3">
          <PanelHeader icon={AlertTriangle} title="Conflict Rules" helper="Conflicts remain local/demo-safe and never silently overwrite inventory, price, or accounting records." />
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-secondary/60 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Low Risk</p>
              <p className="mt-1 text-xs font-bold text-foreground">Supervisor+ can resolve</p>
            </div>
            <div className="rounded-2xl bg-secondary/60 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">High Risk</p>
              <p className="mt-1 text-xs font-bold text-foreground">Manager required</p>
            </div>
          </div>
          <InfoLine label="Transport" value="Deferred until Stage AH desktop sync contract" />
          <InfoLine label="Mutation safety" value="No live stock, price, promo, or write-off mutation" />
        </SectionCard>

        <SectionCard className="space-y-3">
          <PanelHeader icon={ShieldCheck} title="Recent Collaboration Events" helper="Every claim, release, takeover, block, and conflict records actor, role, device, session, shift, and deferred sync status." />
          <div className="space-y-2">
            {events.slice(0, 12).map((event) => <EventRow key={event.eventId} event={event} />)}
            {events.length === 0 && <p className="rounded-2xl bg-secondary/50 px-3 py-3 text-sm font-bold text-muted-foreground">No collaboration events yet.</p>}
          </div>
        </SectionCard>

        <SectionCard className="border-emerald-100 bg-emerald-50">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div className="min-w-0">
              <p className="text-sm font-black text-emerald-800">Stage AG safety contract active</p>
              <p className="mt-1 text-xs font-semibold leading-snug text-emerald-700">This workspace prepares ScanOps for Stage AH sync by making task owners, handoffs, conflicts, and deferred collaboration events explicit.</p>
            </div>
          </div>
        </SectionCard>
      </WorkflowMain>
    </PageShell>
  );
}
