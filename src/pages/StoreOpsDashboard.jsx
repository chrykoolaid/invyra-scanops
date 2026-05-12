import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ClipboardCheck,
  Database,
  Eye,
  FileJson2,
  Gauge,
  GitBranch,
  LayoutDashboard,
  LockKeyhole,
  MessageSquarePlus,
  Route,
  ShieldCheck,
} from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import { InfoLine, MetricPill, PageShell, SectionCard, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { getScanOpsSession, useScanOpsSession } from "../lib/scanOpsSession";
import {
  STORE_OPS_FILTERS,
  STORE_OPS_WORKFLOW_ROUTES,
  addStoreOpsReviewNote,
  canUseStoreOpsTriageControls,
  filterStoreOpsDashboardEvents,
  keepStoreOpsExceptionDeferred,
  markStoreOpsLocallyReviewed,
  useStoreOpsDashboard,
} from "../lib/scanOpsStoreOpsDashboard";

function titleCase(value) {
  return String(value || "—").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return value;
  }
}

function riskTone(riskLevel) {
  if (riskLevel === "High") return "border-red-100 bg-red-50 text-red-700";
  if (riskLevel === "Medium") return "border-amber-100 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function statusTone(status) {
  if (String(status || "").includes("Blocked")) return "border-red-100 bg-red-50 text-red-700";
  if (String(status || "").includes("Review") || String(status || "").includes("Deferred")) return "border-amber-100 bg-amber-50 text-amber-700";
  if (String(status || "").includes("Local")) return "border-slate-200 bg-slate-100 text-slate-700";
  return "border-primary/10 bg-primary/10 text-primary";
}

function Badge({ children, tone = "default" }) {
  const cls = tone === "risk" ? riskTone(children) : statusTone(children);
  return <span className={`inline-flex shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${cls}`}>{children}</span>;
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

function StoreStatusPanel({ model, session }) {
  return (
    <SectionCard className="space-y-3">
      <PanelHeader icon={LayoutDashboard} title="Store Status" helper="Local visibility only. Desktop sync and printer routing are not connected in this stage." />
      <div className="grid grid-cols-2 gap-2">
        <MetricPill label="Mode" value={model.context.mode} />
        <MetricPill label="Desktop" value={model.context.desktop} />
        <MetricPill label="Sync" value={model.context.sync} />
        <MetricPill label="Open" value={`${model.events.length} exceptions`} />
      </div>
      <div className="rounded-2xl border border-border bg-background/70 p-3 space-y-2">
        <InfoLine label="User" value={`${session.actorName} · ${session.actorRole}`} />
        <InfoLine label="Device" value={model.context.deviceLabel || session.deviceId} />
        <InfoLine label="Shift" value={model.context.shiftLabel || session.shiftLabel} />
        <InfoLine label="Scope" value={model.context.scope} />
      </div>
    </SectionCard>
  );
}

function PriorityExceptionCard({ event, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-3 text-left active:scale-[0.995] ${selected ? "border-primary bg-primary/5" : "border-border bg-background/70"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-foreground">{event.exceptionLabel}</p>
          <p className="mt-1 break-words text-xs font-bold text-muted-foreground">{event.sourceWorkflowLabel} · {event.safeActionLabel}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge tone="risk">{event.riskLevel}</Badge>
          <Badge>{event.queueStatus}</Badge>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-[11px] font-semibold leading-snug text-muted-foreground">{event.reviewReason}</p>
    </button>
  );
}

function PriorityPanel({ events, selectedId, onSelect, onOpenCommand }) {
  return (
    <SectionCard className="space-y-3">
      <PanelHeader icon={AlertTriangle} title="Priority Exceptions" helper="Risk-ranked work that needs review, blocking attention, or deferred acknowledgement." />
      <div className="space-y-2">
        {events.length ? events.map((event) => (
          <PriorityExceptionCard key={event.dashboardEventId} event={event} selected={event.dashboardEventId === selectedId} onClick={() => onSelect(event.dashboardEventId)} />
        )) : <p className="rounded-2xl bg-secondary/50 px-3 py-3 text-sm font-bold text-muted-foreground">No priority exceptions visible for this role.</p>}
      </div>
      <MiniButton variant="primary" onClick={onOpenCommand}>Open Exceptions</MiniButton>
    </SectionCard>
  );
}

function WorkflowHealthPanel({ workflows }) {
  return (
    <SectionCard className="space-y-3">
      <PanelHeader icon={Gauge} title="Workflow Health" helper="Compact health summary across Phase 2 store-operation workflows." />
      <div className="space-y-2">
        {workflows.map((workflow) => (
          <div key={workflow.workflow} className="rounded-2xl border border-border bg-background/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-foreground">{workflow.label}</p>
                <p className="mt-1 truncate text-[11px] font-semibold text-muted-foreground">{workflow.lastEventLabel}</p>
              </div>
              <p className="shrink-0 text-xs font-black text-muted-foreground">{workflow.open} open</p>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <MetricPill label="Review" value={workflow.review} />
              <MetricPill label="Blocked" value={workflow.blocked} />
              <MetricPill label="Deferred" value={workflow.deferred} />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function SyncReviewSummary({ summary, onViewQueue }) {
  return (
    <SectionCard className="space-y-3">
      <PanelHeader icon={Database} title="Sync & Review Summary" helper="Derived from Stage AH outbound queue and desktop response preview states." />
      <div className="grid grid-cols-2 gap-2">
        <MetricPill label="Queued" value={summary.total} />
        <MetricPill label="Review" value={summary.visibleReviewRequired} />
        <MetricPill label="Blocked" value={summary.visibleBlocked} />
        <MetricPill label="Deferred" value={summary.visibleDeferred} />
      </div>
      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2">
        <p className="text-xs font-black leading-snug text-amber-800">Contract preview only. No live desktop connection, no force sync, no price / stock / waste mutation.</p>
      </div>
      <MiniButton onClick={onViewQueue}>View Sync Queue</MiniButton>
    </SectionCard>
  );
}

function FilterButton({ filter, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-2xl px-3 text-xs font-black ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground active:bg-border"}`}
    >
      {filter.label}
    </button>
  );
}

function ExceptionList({ events, selectedId, onSelect }) {
  return (
    <SectionCard className="space-y-3">
      <PanelHeader icon={ClipboardCheck} title="Exceptions" helper="Review-required, blocked, and deferred items. Selecting does not mutate records." />
      <div className="space-y-2">
        {events.length ? events.map((event) => (
          <PriorityExceptionCard key={event.dashboardEventId} event={event} selected={event.dashboardEventId === selectedId} onClick={() => onSelect(event.dashboardEventId)} />
        )) : <p className="rounded-2xl bg-secondary/50 px-3 py-3 text-sm font-bold text-muted-foreground">No exceptions match this filter.</p>}
      </div>
    </SectionCard>
  );
}

function PayloadPreview({ event }) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-3">
      <div className="flex items-center gap-2">
        <FileJson2 className="h-4 w-4 text-primary" />
        <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Payload Preview</p>
      </div>
      <pre className="mt-3 max-h-56 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words rounded-2xl bg-secondary/60 p-3 text-[10px] font-semibold leading-relaxed text-muted-foreground">
        {JSON.stringify({
          envelope: {
            contractVersion: event.sourceEvent.contractVersion,
            eventId: event.sourceEvent.eventId,
            eventType: event.sourceEvent.eventType,
            syncStatus: event.syncStatus,
          },
          dashboard: {
            dashboardEventId: event.dashboardEventId,
            exceptionType: event.exceptionType,
            riskLevel: event.riskLevel,
            queueStatus: event.queueStatus,
            mutationAllowed: event.mutationAllowed,
          },
          governance: {
            actorName: event.actorName,
            actorRole: event.actorRole,
            deviceId: event.deviceId,
            shiftId: event.shiftId,
          },
          collaboration: event.sourceEvent.collaboration,
          payload: event.sourceEvent.payload,
        }, null, 2)}
      </pre>
    </div>
  );
}

function DesktopResponsePreview({ event }) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-3">
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-primary" />
        <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Desktop Response Preview</p>
      </div>
      <div className="mt-3 space-y-2">
        <InfoLine label="Response" value={titleCase(event.desktopResponseStatus)} />
        <InfoLine label="Desktop action" value={event.desktopResponsePreview.desktopAction} />
        <InfoLine label="Review queue" value={event.desktopResponsePreview.reviewQueue} />
        <InfoLine label="Required role" value={event.requiredRole} />
        <InfoLine label="Mutation" value={event.mutationAllowed ? "Allowed" : "Blocked"} />
      </div>
    </div>
  );
}

function NoteList({ notes }) {
  if (!notes.length) return <p className="rounded-2xl bg-secondary/50 px-3 py-3 text-sm font-bold text-muted-foreground">No local triage notes yet.</p>;
  return (
    <div className="space-y-2">
      {notes.map((note) => (
        <div key={note.noteId} className="rounded-2xl border border-border bg-background/70 p-3">
          <p className="break-words text-sm font-bold text-foreground">{note.noteText}</p>
          <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{note.actorName} · {note.actorRole} · {formatDateTime(note.createdAt)}</p>
        </div>
      ))}
    </div>
  );
}

function SelectedExceptionPanel({ event, onRefresh }) {
  const navigate = useNavigate();
  const session = useScanOpsSession();
  const [showPayload, setShowPayload] = useState(false);
  const [showResponse, setShowResponse] = useState(true);
  const [note, setNote] = useState("Needs desktop review before any operational mutation.");
  const triageAllowed = canUseStoreOpsTriageControls(session);

  if (!event) {
    return (
      <SectionCard className="space-y-3">
        <PanelHeader icon={Eye} title="Selected Exception" helper="Select an exception to inspect risk, source, and safe local actions." />
        <p className="rounded-2xl bg-secondary/50 px-3 py-3 text-sm font-bold text-muted-foreground">No exception selected.</p>
      </SectionCard>
    );
  }

  const sourceRoute = STORE_OPS_WORKFLOW_ROUTES[event.sourceWorkflow] || "/desktop-sync-contract";
  const addNote = () => {
    const added = addStoreOpsReviewNote(event.dashboardEventId, note, getScanOpsSession());
    if (added) {
      setNote("");
      onRefresh?.();
    }
  };
  const keepDeferred = () => {
    keepStoreOpsExceptionDeferred(event.dashboardEventId, getScanOpsSession());
    onRefresh?.();
  };
  const markReviewed = () => {
    if (!triageAllowed) return;
    markStoreOpsLocallyReviewed(event.dashboardEventId, getScanOpsSession());
    onRefresh?.();
  };

  return (
    <SectionCard className="space-y-3">
      <PanelHeader icon={LockKeyhole} title="Selected Exception" helper="Safe local inspection only. No approvals, stock edits, price edits, write-offs, or printer routing." />
      <div className="rounded-2xl bg-secondary/60 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="break-words text-base font-black text-foreground">{event.exceptionLabel}</p>
            <p className="mt-1 break-words text-xs font-bold text-muted-foreground">{event.exceptionType}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge tone="risk">{event.riskLevel}</Badge>
            <Badge>{event.queueStatus}</Badge>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <InfoLine label="Source" value={`${event.sourceWorkflowLabel} · ${event.sourceRecordId || "local/demo record"}`} />
          <InfoLine label="Risk" value={event.riskLevel} />
          <InfoLine label="Sync" value={titleCase(event.syncStatus)} />
          <InfoLine label="Desktop" value={titleCase(event.desktopResponseStatus)} />
          <InfoLine label="Mutation" value={event.mutationAllowed ? "Allowed" : "Blocked"} />
          <InfoLine label="Actor" value={`${event.actorName} · ${event.actorRole}`} />
          <InfoLine label="Device" value={event.deviceId} />
          <InfoLine label="Shift" value={event.shiftLabel} />
          <InfoLine label="Collaboration" value={event.collaborationStatus} />
          <InfoLine label="Local triage" value={event.localTriageStatus} />
        </div>
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
        <p className="text-sm font-black text-amber-800">Why this needs review</p>
        <p className="mt-1 text-xs font-semibold leading-snug text-amber-700">{event.reviewReason}. {event.mutationBlockedReason}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MiniButton onClick={() => navigate(sourceRoute)}>View Source</MiniButton>
        <MiniButton onClick={() => navigate("/desktop-sync-contract")}>Open Sync Contract</MiniButton>
        <MiniButton onClick={() => setShowPayload((value) => !value)}>{showPayload ? "Hide Payload" : "View Payload"}</MiniButton>
        <MiniButton onClick={() => setShowResponse((value) => !value)}>{showResponse ? "Hide Response" : "View Response"}</MiniButton>
      </div>

      {showResponse && <DesktopResponsePreview event={event} />}
      {showPayload && <PayloadPreview event={event} />}

      <div className="space-y-2">
        <label className="block">
          <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Add Local Review Note</span>
          <textarea
            value={note}
            onChange={(entry) => setNote(entry.target.value)}
            rows={3}
            className="mt-2 w-full resize-none rounded-2xl border border-input bg-card px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <MiniButton onClick={addNote} disabled={!note.trim()}><MessageSquarePlus className="mr-1 inline h-3.5 w-3.5" />Add Note</MiniButton>
          <MiniButton onClick={keepDeferred}>Keep Deferred</MiniButton>
          <MiniButton onClick={markReviewed} disabled={!triageAllowed} variant="primary">Mark Locally Reviewed</MiniButton>
          <MiniButton onClick={() => navigate("/desktop-sync-contract")}>View AH Payloads</MiniButton>
        </div>
        {!triageAllowed && (
          <p className="rounded-2xl border border-border bg-background/70 px-3 py-2 text-xs font-bold text-muted-foreground">Staff can inspect and add local notes, but manager-style local triage review is Supervisor/Manager/Admin only.</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Review Notes</p>
        <NoteList notes={event.reviewNotes} />
      </div>
    </SectionCard>
  );
}

export default function StoreOpsDashboard() {
  const navigate = useNavigate();
  const session = useScanOpsSession();
  const model = useStoreOpsDashboard();
  const [mode, setMode] = useState("dashboard");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const filteredEvents = useMemo(() => filterStoreOpsDashboardEvents(model.events, filter), [model.events, filter]);
  const selectedEvent = useMemo(() => model.events.find((event) => event.dashboardEventId === selectedId) || filteredEvents[0] || model.events[0] || null, [model.events, filteredEvents, selectedId]);

  useEffect(() => {
    createScanOpsEvent(SCANOPS_EVENT_TYPES.STORE_OPS_DASHBOARD_VIEWED, {
      status: "viewed",
      dashboardMode: "local_command_center",
      desktopConnected: false,
      visibleExceptions: model.events.length,
    });
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      createScanOpsEvent(SCANOPS_EVENT_TYPES.STORE_OPS_EXCEPTION_VIEWED, {
        status: "viewed",
        dashboardEventId: selectedEvent.dashboardEventId,
        sourceEventId: selectedEvent.sourceEventId,
        exceptionType: selectedEvent.exceptionType,
      });
    }
  }, [selectedEvent?.dashboardEventId]);

  const select = (id) => {
    setSelectedId(id);
    setMode("command");
  };

  const refresh = () => setRefreshKey((value) => value + 1);

  return (
    <PageShell>
      <PageHeader title="Store Ops Dashboard" subtitle="Exception visibility, review queues, and sync-safe store operations" />
      <WorkflowMain key={refreshKey}>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setMode("dashboard")} className={`min-h-11 rounded-2xl px-3 text-xs font-black ${mode === "dashboard" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>Dashboard</button>
          <button type="button" onClick={() => setMode("command")} className={`min-h-11 rounded-2xl px-3 text-xs font-black ${mode === "command" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>Command Center</button>
        </div>

        {mode === "dashboard" ? (
          <>
            <StoreStatusPanel model={model} session={session} />
            <PriorityPanel events={model.priorityEvents} selectedId={selectedEvent?.dashboardEventId} onSelect={select} onOpenCommand={() => setMode("command")} />
            <WorkflowHealthPanel workflows={model.workflowHealth} />
            <SyncReviewSummary summary={model.syncSummary} onViewQueue={() => navigate("/desktop-sync-contract")} />
          </>
        ) : (
          <>
            <SectionCard className="space-y-3">
              <PanelHeader icon={ShieldCheck} title="Exception Command Center" helper="Review-required and blocked work. Triage is local only; approvals stay out of scope." />
              <div className="grid grid-cols-3 gap-2">
                {STORE_OPS_FILTERS.map((item) => <FilterButton key={item.id} filter={item} active={filter === item.id} onClick={() => setFilter(item.id)} />)}
              </div>
            </SectionCard>
            <ExceptionList events={filteredEvents} selectedId={selectedEvent?.dashboardEventId} onSelect={select} />
            <SelectedExceptionPanel event={selectedEvent} onRefresh={refresh} />
          </>
        )}

        <SectionCard className="border-border bg-background/70">
          <div className="flex items-start gap-3">
            <Route className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs font-bold leading-snug text-muted-foreground">Stage AI is a local command-center layer on top of Stage AH. It can inspect, note, defer, and route attention, but it cannot approve, print, sync, or mutate operational records.</p>
          </div>
        </SectionCard>
      </WorkflowMain>
    </PageShell>
  );
}
