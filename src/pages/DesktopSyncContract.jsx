import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileJson2,
  GitBranch,
  LockKeyhole,
  MonitorSmartphone,
  ShieldCheck,
} from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import { InfoLine, MetricPill, PageShell, SectionCard, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import {
  buildDesktopResponsePreview,
  DESKTOP_SYNC_CONTRACT_VERSION,
  DESKTOP_SYNC_STATUSES,
  validateDesktopSyncPayload,
  WORKFLOW_SYNC_CONTRACTS,
  useDesktopSyncContract,
} from "../lib/scanOpsDesktopSyncContract";

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

function statusTone(status) {
  if ([DESKTOP_SYNC_STATUSES.SYNC_BLOCKED_CONFLICT, DESKTOP_SYNC_STATUSES.SYNC_BLOCKED_PERMISSION, DESKTOP_SYNC_STATUSES.SYNC_BLOCKED_SCHEMA, DESKTOP_SYNC_STATUSES.SYNC_BLOCKED_STALE_TASK, DESKTOP_SYNC_STATUSES.SYNC_INVALID, DESKTOP_SYNC_STATUSES.SYNC_REJECTED].includes(status)) return "border-red-100 bg-red-50 text-red-700";
  if ([DESKTOP_SYNC_STATUSES.SYNC_ACCEPTED_FOR_REVIEW, DESKTOP_SYNC_STATUSES.SYNC_DEFERRED, DESKTOP_SYNC_STATUSES.SYNC_RETRY_PENDING].includes(status)) return "border-amber-100 bg-amber-50 text-amber-700";
  if ([DESKTOP_SYNC_STATUSES.SYNC_VALID, DESKTOP_SYNC_STATUSES.SYNC_ACKNOWLEDGED].includes(status)) return "border-emerald-100 bg-emerald-50 text-emerald-700";
  return "border-primary/10 bg-primary/10 text-primary";
}

function StatusBadge({ status, label }) {
  return (
    <span className={`inline-flex shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${statusTone(status)}`}>
      {label || titleCase(status)}
    </span>
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

function QueueCard({ event, selected, onClick }) {
  const validation = validateDesktopSyncPayload(event);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-3 text-left active:scale-[0.995] ${selected ? "border-primary bg-primary/5" : "border-border bg-background/70"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-foreground">{event.eventLabel}</p>
          <p className="mt-1 break-words text-xs font-bold text-muted-foreground">{event.sourceWorkflow} · {event.sourceRecordId}</p>
        </div>
        <StatusBadge status={validation.syncStatus} label={validation.syncStatus === DESKTOP_SYNC_STATUSES.SYNC_ACCEPTED_FOR_REVIEW ? "Review" : titleCase(event.syncStatus)} />
      </div>
      <p className="mt-2 line-clamp-2 text-[11px] font-semibold leading-snug text-muted-foreground">{validation.responseLabel} · mutation blocked</p>
    </button>
  );
}

function SyncStatusPanel({ context, summary }) {
  return (
    <SectionCard className="space-y-3">
      <PanelHeader icon={MonitorSmartphone} title="Sync Status" helper="Contract preview only. Desktop transport is not connected yet." />
      <div className="grid grid-cols-2 gap-2">
        <MetricPill label="Mode" value={context.mode} />
        <MetricPill label="Transport" value={context.transport} />
        <MetricPill label="Desktop" value={context.desktop} />
        <MetricPill label="Queue" value={`${summary.total} outbound`} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MetricPill label="Review" value={summary.reviewRequired} />
        <MetricPill label="Blocked" value={summary.blocked} />
        <MetricPill label="Conflicts" value={summary.conflicts} />
      </div>
      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2">
        <p className="text-xs font-black text-amber-800">No live sync, no printer routing, no inventory / price / accounting mutation.</p>
      </div>
    </SectionCard>
  );
}

function ContextPanel({ context }) {
  return (
    <SectionCard className="space-y-3">
      <PanelHeader icon={ShieldCheck} title="Current Contract Context" helper="Stage AF governance context is attached to every outbound payload." />
      <InfoLine label="User" value={`${context.actorName} · ${context.actorRole}`} />
      <InfoLine label="Device" value={`${context.deviceLabel || context.deviceId}`} />
      <InfoLine label="Shift" value={context.shiftLabel} />
      <InfoLine label="Store" value={`${context.storeName} · ${context.locationLabel}`} />
    </SectionCard>
  );
}

function QueuePanel({ queue, selectedId, onSelect }) {
  return (
    <SectionCard className="space-y-3">
      <PanelHeader icon={Database} title="Outbound Queue" helper="Local/demo payloads that would be packaged for Inventory Desktop review." />
      <div className="space-y-2">
        {queue.map((event) => (
          <QueueCard key={event.eventId} event={event} selected={event.eventId === selectedId} onClick={() => onSelect(event.eventId)} />
        ))}
      </div>
    </SectionCard>
  );
}

function PayloadSummary({ event, onValidate, onViewPayload, showPayload, validation }) {
  if (!event) return null;
  return (
    <SectionCard className="space-y-3">
      <PanelHeader icon={FileJson2} title="Selected Payload" helper="Payload envelope, governance proof, collaboration metadata, and workflow payload." />
      <div className="rounded-2xl bg-secondary/60 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="break-words text-base font-black text-foreground">{event.eventType}</p>
            <p className="mt-1 break-words text-xs font-bold text-muted-foreground">{event.sourceWorkflow} · {event.eventId}</p>
          </div>
          <StatusBadge status={validation.syncStatus} label={titleCase(validation.syncStatus)} />
        </div>
        <div className="mt-3 space-y-2">
          <InfoLine label="Contract" value={event.contractVersion} />
          <InfoLine label="Source" value={event.sourceSystem} />
          <InfoLine label="Target" value={event.targetSystem} />
          <InfoLine label="Actor" value={`${event.actorName} · ${event.actorRole}`} />
          <InfoLine label="Device" value={event.deviceLabel || event.deviceId} />
          <InfoLine label="Shift" value={event.shiftLabel} />
          <InfoLine label="Permission" value={`${titleCase(event.permissionResult)} · ${event.actionAllowed ? "Allowed" : "Blocked"}`} />
          <InfoLine label="Collaboration" value={event.collaboration ? `${titleCase(event.collaboration.ownershipStatus)} · ${event.collaboration.conflictStatus === "NONE" ? "No conflict" : titleCase(event.collaboration.conflictStatus)}` : "Not task-based"} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onViewPayload} className="min-h-11 rounded-2xl bg-secondary px-3 text-xs font-black text-secondary-foreground active:bg-border">
          {showPayload ? "Hide Payload" : "View Payload"}
        </button>
        <button type="button" onClick={onValidate} className="min-h-11 rounded-2xl bg-primary px-3 text-xs font-black text-primary-foreground active:scale-[0.98]">
          Validate Contract
        </button>
      </div>
      {showPayload && <PayloadDetail event={event} />}
    </SectionCard>
  );
}

function PayloadDetail({ event }) {
  const detailRows = [
    ["Envelope", `${event.contractVersion} · ${event.eventId}`],
    ["Governance", `${event.actorName} · ${event.actorRole} · ${event.shiftLabel}`],
    ["Collaboration", event.collaboration ? `${event.collaboration.ownerUserName || "—"} · ${titleCase(event.collaboration.conflictStatus)}` : "Not task-based"],
    ["Payload", Object.entries(event.payload || {}).slice(0, 4).map(([key, value]) => `${titleCase(key)}: ${Array.isArray(value) ? value.length : value}`).join(" · ")],
  ];
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-3">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-primary" />
        <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Payload Detail</p>
      </div>
      <div className="mt-3 space-y-2">
        {detailRows.map(([label, value]) => <InfoLine key={label} label={label} value={value || "—"} />)}
      </div>
      <pre className="mt-3 max-h-56 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words rounded-2xl bg-secondary/60 p-3 text-[10px] font-semibold leading-relaxed text-muted-foreground">
        {JSON.stringify({ envelope: { contractVersion: event.contractVersion, eventId: event.eventId, eventType: event.eventType, syncStatus: event.syncStatus }, governance: { actorName: event.actorName, actorRole: event.actorRole, deviceId: event.deviceId, sessionId: event.sessionId, shiftId: event.shiftId }, collaboration: event.collaboration, payload: event.payload }, null, 2)}
      </pre>
    </div>
  );
}

function DesktopResponsePanel({ response }) {
  if (!response) return null;
  return (
    <SectionCard className="space-y-3">
      <PanelHeader icon={GitBranch} title="Desktop Response Preview" helper="Mock desktop response object. No real desktop connection exists in Stage AH." />
      <div className="rounded-2xl bg-secondary/60 p-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 break-words text-sm font-black text-foreground">{response.responseStatus}</p>
          <StatusBadge status={response.syncStatus} label={response.reviewRequired ? "Review" : "Preview"} />
        </div>
        <InfoLine label="Action" value={response.desktopAction} />
        <InfoLine label="Record" value={`${response.desktopRecordType} · ${response.desktopRecordId || "—"}`} />
        <InfoLine label="Mutation" value={response.mutationAllowed ? "Allowed" : "Blocked"} />
        <InfoLine label="Blocked reason" value={response.mutationBlockedReason} />
        <InfoLine label="Required role" value={response.requiredRole} />
        <InfoLine label="Review queue" value={response.reviewQueue} />
      </div>
    </SectionCard>
  );
}

function ContractEventsPanel({ validation, validatedAt }) {
  const events = validation?.events || ["Select Validate Contract to preview contract events."];
  return (
    <SectionCard className="space-y-3">
      <PanelHeader icon={CheckCircle2} title="Contract Events" helper="Validation and review outcomes are recorded locally for contract preview." />
      <div className="space-y-2">
        {events.map((event, index) => (
          <div key={`${event}-${index}`} className="flex items-start gap-2 rounded-2xl bg-secondary/60 p-3">
            {validation?.issues?.length ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
            <div className="min-w-0">
              <p className="break-words text-xs font-black text-foreground">{event}</p>
              {validatedAt && <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{formatDateTime(validatedAt)}</p>}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function WorkflowContractsPanel() {
  return (
    <SectionCard className="space-y-3">
      <PanelHeader icon={LockKeyhole} title="Workflow Contracts" helper={`${DESKTOP_SYNC_CONTRACT_VERSION} binds AA–AG events to safe desktop review behavior.`} />
      <div className="space-y-2">
        {WORKFLOW_SYNC_CONTRACTS.map((contract) => (
          <div key={contract.stage} className="rounded-2xl border border-border bg-background/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-foreground">Stage {contract.stage} · {contract.workflow}</p>
                <p className="mt-1 text-xs font-bold leading-snug text-muted-foreground">{contract.desktopBehavior}</p>
              </div>
              <StatusBadge status={DESKTOP_SYNC_STATUSES.SYNC_CONTRACT_PREVIEW} label={`${contract.eventTypes.length} events`} />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export default function DesktopSyncContract() {
  const { context, queue, summary } = useDesktopSyncContract();
  const [selectedId, setSelectedId] = useState(queue[0]?.eventId || "");
  const [showPayload, setShowPayload] = useState(false);
  const [manualValidation, setManualValidation] = useState(null);
  const [validatedAt, setValidatedAt] = useState(null);

  const selected = useMemo(() => queue.find((event) => event.eventId === selectedId) || queue[0], [queue, selectedId]);
  const autoValidation = useMemo(() => validateDesktopSyncPayload(selected), [selected]);
  const validation = manualValidation?.eventId === selected?.eventId ? manualValidation.result : autoValidation;
  const response = useMemo(() => buildDesktopResponsePreview(selected, validation), [selected, validation]);

  useEffect(() => {
    createScanOpsEvent(SCANOPS_EVENT_TYPES.DESKTOP_SYNC_CONTRACT_VIEWED, {
      status: "contract_preview_viewed",
      source_module: "Desktop Sync Contract",
      contractVersion: DESKTOP_SYNC_CONTRACT_VERSION,
      transport: "Not connected",
    });
  }, []);

  const validateSelected = () => {
    const result = validateDesktopSyncPayload(selected);
    setManualValidation({ eventId: selected.eventId, result });
    setValidatedAt(new Date().toISOString());
    createScanOpsEvent(SCANOPS_EVENT_TYPES.DESKTOP_SYNC_CONTRACT_VALIDATED, {
      status: result.syncStatus,
      source_module: "Desktop Sync Contract",
      contractVersion: DESKTOP_SYNC_CONTRACT_VERSION,
      outboundEventId: selected.eventId,
      outboundEventType: selected.eventType,
      validationStatus: result.validationStatus,
      reviewRequired: result.reviewRequired,
      mutationAllowed: false,
    });
  };

  const selectPayload = (eventId) => {
    setSelectedId(eventId);
    setShowPayload(false);
    setManualValidation(null);
    setValidatedAt(null);
  };

  return (
    <PageShell>
      <PageHeader title="Desktop Sync Contract" subtitle="Handheld event queue, payload validation, and desktop response preview" />
      <WorkflowMain>
        <SyncStatusPanel context={context} summary={summary} />
        <ContextPanel context={context} />
        <QueuePanel queue={queue} selectedId={selected?.eventId} onSelect={selectPayload} />
        <PayloadSummary event={selected} validation={validation} showPayload={showPayload} onViewPayload={() => setShowPayload((value) => !value)} onValidate={validateSelected} />
        <DesktopResponsePanel response={response} />
        <ContractEventsPanel validation={validation} validatedAt={validatedAt} />
        <WorkflowContractsPanel />
      </WorkflowMain>
    </PageShell>
  );
}
