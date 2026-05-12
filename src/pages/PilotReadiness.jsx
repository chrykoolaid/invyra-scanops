import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ClipboardCheck,
  ClipboardList,
  Copy,
  FileText,
  Flag,
  LockKeyhole,
  MessageSquarePlus,
  Route,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import { InfoLine, MetricPill, PageShell, SectionCard, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { useScanOpsSession } from "../lib/scanOpsSession";
import {
  CHECK_STATUSES,
  ISSUE_STATUSES,
  UAT_PACKS,
  addPilotIssueNote,
  buildPilotReport,
  canClosePilotIssues,
  canMarkPilotReady,
  createPilotIssue,
  updatePilotCheck,
  updatePilotIssue,
  updateReleaseGate,
  usePilotReadiness,
} from "../lib/scanOpsPilotReadiness";

const WORKFLOW_ROUTES = {
  aa_replenishment: "/replenish",
  ab_price_promo: "/price-check",
  ac_shelf_tickets: "/shelf-tickets",
  ad_markdown: "/markdowns",
  ae_waste: "/waste",
  af_governance: "/device-governance",
  ag_collaboration: "/session-collaboration",
  ah_sync_contract: "/desktop-sync-contract",
  ai_dashboard: "/store-ops-dashboard",
};

function formatDateTime(value) {
  if (!value) return "Local only";
  try {
    return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return value;
  }
}

function statusTone(status) {
  if (status === CHECK_STATUSES.PASS || status === "Pilot Ready" || status === "Local Pilot Ready" || status === "Closed") return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (status === CHECK_STATUSES.FAIL || status === CHECK_STATUSES.BLOCKED || status === "Not Ready" || status === "Blocker" || status === "High") return "border-red-100 bg-red-50 text-red-700";
  if (status === "Needs Review" || status === "Ready for Retest" || status === "Locally Reviewed" || status === "Deferred") return "border-amber-100 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function Badge({ children }) {
  return <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${statusTone(children)}`}>{children}</span>;
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

function ModeTabs({ mode, setMode }) {
  const tabs = [
    ["overview", "Summary"],
    ["scripts", "UAT"],
    ["issues", "Issues"],
    ["report", "Report"],
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {tabs.map(([id, label]) => (
        <button key={id} type="button" onClick={() => setMode(id)} className={`min-h-11 rounded-2xl px-2 text-xs font-black ${mode === id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

function ReadinessSummary({ model }) {
  return (
    <SectionCard className="space-y-3">
      <PanelHeader icon={Flag} title="Readiness Summary" helper="Local UAT Evidence only. This does not certify live deployment, sync to desktop, print tickets, or mutate records." />
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{model.readinessStatus}</Badge>
        <Badge>{model.context.evidence}</Badge>
        <Badge>{model.context.desktop}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MetricPill label="Completed" value={`${model.counts.passed} / ${model.counts.total}`} />
        <MetricPill label="Blockers" value={model.openBlockers.length + model.counts.blocked} />
        <MetricPill label="Warnings" value={model.openWarnings.length + model.counts.failed} />
        <MetricPill label="Not Tested" value={model.counts.notTested} />
      </div>
      <div className="rounded-2xl border border-border bg-background/70 p-3 space-y-2">
        <InfoLine label="Current user" value={`${model.session.actorName} · ${model.session.actorRole}`} />
        <InfoLine label="Device" value={model.session.deviceId} />
        <InfoLine label="Shift" value={model.session.shiftLabel || model.session.shiftId} />
        <InfoLine label="Sync mode" value={model.context.syncMode} />
        <InfoLine label="Mutation lock" value="Inventory / price / promo / waste / printer / desktop blocked" />
      </div>
    </SectionCard>
  );
}

function UatPackCards({ model, selectedPack, setSelectedPack }) {
  return (
    <SectionCard className="space-y-3">
      <PanelHeader icon={ClipboardList} title="UAT Packs" helper="Guided pilot scripts across smoke, roles, workflows, sync safety, exceptions, and release gate." />
      <div className="space-y-2">
        {model.packs.map((pack) => (
          <button
            key={pack.id}
            type="button"
            onClick={() => setSelectedPack(pack.id)}
            className={`w-full rounded-2xl border p-3 text-left active:scale-[0.995] ${selectedPack === pack.id ? "border-primary bg-primary/5" : "border-border bg-background/70"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-foreground">{pack.label}</p>
                <p className="mt-1 line-clamp-2 text-xs font-bold text-muted-foreground">{pack.helper}</p>
              </div>
              <p className="shrink-0 text-xs font-black text-foreground">{pack.passed} / {pack.total}</p>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              <MetricPill label="Pass" value={pack.passed} />
              <MetricPill label="Fail" value={pack.failed} />
              <MetricPill label="Blocked" value={pack.blocked} />
              <MetricPill label="Todo" value={pack.notTested} />
            </div>
          </button>
        ))}
      </div>
    </SectionCard>
  );
}

function PackTabs({ selectedPack, setSelectedPack }) {
  return (
    <SectionCard className="space-y-3">
      <PanelHeader icon={SlidersHorizontal} title="Test Pack" helper="Choose a pack, select a check, record result and local evidence." />
      <div className="grid grid-cols-3 gap-2">
        {UAT_PACKS.map((pack) => (
          <button key={pack.id} type="button" onClick={() => setSelectedPack(pack.id)} className={`min-h-10 rounded-2xl px-2 text-xs font-black ${selectedPack === pack.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            {pack.shortLabel}
          </button>
        ))}
      </div>
    </SectionCard>
  );
}

function CheckList({ pack, checks, selectedCheckId, setSelectedCheckId }) {
  return (
    <SectionCard className="space-y-3">
      <PanelHeader icon={ClipboardCheck} title={pack.label} helper={pack.helper} />
      <div className="space-y-2">
        {pack.checks.map((check) => {
          const state = checks[check.id];
          return (
            <button key={check.id} type="button" onClick={() => setSelectedCheckId(check.id)} className={`w-full rounded-2xl border p-3 text-left ${selectedCheckId === check.id ? "border-primary bg-primary/5" : "border-border bg-background/70"}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 break-words text-sm font-black text-foreground">{check.label}</p>
                <Badge>{state?.status || CHECK_STATUSES.NOT_TESTED}</Badge>
              </div>
              {state?.updatedAt && <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{state.updatedBy} · {state.updatedByRole} · {formatDateTime(state.updatedAt)}</p>}
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}

function SelectedCheckPanel({ pack, check, state, session, onChanged }) {
  const navigate = useNavigate();
  const [note, setNote] = useState(state?.note || "");

  useEffect(() => {
    setNote(state?.note || "");
  }, [state?.checkId, state?.note]);

  if (!check) {
    return (
      <SectionCard>
        <PanelHeader icon={LockKeyhole} title="Selected Check" helper="Select a UAT check to record local evidence." />
      </SectionCard>
    );
  }

  const setStatus = (status) => {
    updatePilotCheck(check.id, { status, note }, session);
    onChanged?.();
  };
  const saveNote = () => {
    updatePilotCheck(check.id, { note, status: state?.status || CHECK_STATUSES.NOT_TESTED }, session);
    onChanged?.();
  };

  return (
    <SectionCard className="space-y-3">
      <PanelHeader icon={LockKeyhole} title="Selected Check" helper="Evidence is local only and records actor, role, device, and shift." />
      <div className="rounded-2xl bg-secondary/60 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="break-words text-base font-black text-foreground">{check.label}</p>
            <p className="mt-1 text-xs font-bold text-muted-foreground">{pack.label}</p>
          </div>
          <Badge>{state?.status || CHECK_STATUSES.NOT_TESTED}</Badge>
        </div>
        <p className="mt-3 text-xs font-bold leading-snug text-muted-foreground">Expected: {check.expected}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MiniButton onClick={() => setStatus(CHECK_STATUSES.PASS)} variant="primary">Pass</MiniButton>
        <MiniButton onClick={() => setStatus(CHECK_STATUSES.FAIL)} variant="danger">Fail</MiniButton>
        <MiniButton onClick={() => setStatus(CHECK_STATUSES.BLOCKED)}>Blocked</MiniButton>
        <MiniButton onClick={() => setStatus(CHECK_STATUSES.NOT_TESTED)}>Not Tested</MiniButton>
      </div>
      <label className="block">
        <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Tester Note / Evidence</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          className="mt-2 w-full resize-none rounded-2xl border border-input bg-card px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="Record what was tested, role used, and any evidence needed for pilot review."
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <MiniButton onClick={saveNote}>Save Evidence</MiniButton>
        <MiniButton onClick={() => navigate(WORKFLOW_ROUTES[check.id] || "/store-ops-dashboard")}>Open Source</MiniButton>
      </div>
      <div className="rounded-2xl border border-border bg-background/70 p-3 space-y-2">
        <InfoLine label="Last updated" value={formatDateTime(state?.updatedAt)} />
        <InfoLine label="Actor" value={state?.updatedBy ? `${state.updatedBy} · ${state.updatedByRole}` : `${session.actorName} · ${session.actorRole}`} />
        <InfoLine label="Device" value={state?.deviceId || session.deviceId} />
        <InfoLine label="Shift" value={state?.shiftLabel || session.shiftLabel || session.shiftId} />
      </div>
    </SectionCard>
  );
}

function UatScripts({ model, selectedPack, setSelectedPack, selectedCheckId, setSelectedCheckId, session, onChanged }) {
  const pack = UAT_PACKS.find((item) => item.id === selectedPack) || UAT_PACKS[0];
  const selectedCheck = pack.checks.find((check) => check.id === selectedCheckId) || pack.checks[0];
  useEffect(() => {
    if (!pack.checks.some((check) => check.id === selectedCheckId)) setSelectedCheckId(pack.checks[0]?.id);
  }, [pack.id, selectedCheckId, setSelectedCheckId, pack.checks]);

  return (
    <>
      <PackTabs selectedPack={selectedPack} setSelectedPack={setSelectedPack} />
      <CheckList pack={pack} checks={model.checks} selectedCheckId={selectedCheck?.id} setSelectedCheckId={setSelectedCheckId} />
      <SelectedCheckPanel pack={pack} check={selectedCheck} state={model.checks[selectedCheck?.id]} session={session} onChanged={onChanged} />
    </>
  );
}

function IssueCreatePanel({ selectedPack, session, onCreated }) {
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState("Medium");
  const [expected, setExpected] = useState("");
  const [observed, setObserved] = useState("");
  const pack = UAT_PACKS.find((item) => item.id === selectedPack) || UAT_PACKS[0];
  const canCreate = title.trim().length > 1;

  const create = () => {
    if (!canCreate) return;
    const issue = createPilotIssue({
      title,
      severity,
      area: pack.label,
      discoveredInPack: pack.id,
      expectedBehavior: expected || "Expected behavior to be confirmed during UAT.",
      observedBehavior: observed || "Observed behavior to be confirmed during UAT.",
    }, session);
    setTitle("");
    setExpected("");
    setObserved("");
    onCreated?.(issue.issueId);
  };

  return (
    <SectionCard className="space-y-3">
      <PanelHeader icon={MessageSquarePlus} title="Create Local Issue" helper="Record blockers and observations. This is a pilot issue log only; it does not mutate live records." />
      <label className="block">
        <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Issue Title</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-input bg-card px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" placeholder="Example: Staff can see manager-only action" />
      </label>
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Severity</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {["Blocked", "Warning", "Observation"].map((label) => {
            const mapped = label === "Blocked" ? "Blocker" : label === "Warning" ? "Medium" : "Observation";
            return <button key={label} type="button" onClick={() => setSeverity(mapped)} className={`min-h-10 rounded-2xl px-2 text-xs font-black ${severity === mapped ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{label}</button>;
          })}
        </div>
      </div>
      <label className="block">
        <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Which screen / expected result</span>
        <textarea value={expected} onChange={(event) => setExpected(event.target.value)} rows={2} className="mt-2 w-full resize-none rounded-2xl border border-input bg-card px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" />
      </label>
      <label className="block">
        <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">What happened / note</span>
        <textarea value={observed} onChange={(event) => setObserved(event.target.value)} rows={2} className="mt-2 w-full resize-none rounded-2xl border border-input bg-card px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" />
      </label>
      <MiniButton onClick={create} disabled={!canCreate} variant="primary">Create Issue</MiniButton>
    </SectionCard>
  );
}

function IssueList({ issues, selectedIssueId, setSelectedIssueId, filter, setFilter }) {
  const filtered = issues.filter((issue) => {
    if (filter === "blocked") return issue.status !== "Closed" && ["Blocker", "High"].includes(issue.severity);
    if (filter === "reviewed") return issue.status === "Closed" || issue.status === "Locally Reviewed";
    return issue.status !== "Closed";
  });

  return (
    <SectionCard className="space-y-3">
      <PanelHeader icon={AlertTriangle} title="Pilot Issue Log" helper="Simple status sections for local UAT blockers and observations." />
      <div className="grid grid-cols-3 gap-2">
        {[["needs_action", "Needs Action"], ["blocked", "Blocked"], ["reviewed", "Reviewed"]].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setFilter(id)} className={`min-h-10 rounded-2xl px-2 text-xs font-black ${filter === id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{label}</button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.length ? filtered.map((issue) => (
          <button key={issue.issueId} type="button" onClick={() => setSelectedIssueId(issue.issueId)} className={`w-full rounded-2xl border p-3 text-left ${selectedIssueId === issue.issueId ? "border-primary bg-primary/5" : "border-border bg-background/70"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-black text-foreground">{issue.title}</p>
                <p className="mt-1 break-words text-xs font-bold text-muted-foreground">{issue.area} · {issue.createdByRole}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge>{issue.severity}</Badge>
                <Badge>{issue.status}</Badge>
              </div>
            </div>
          </button>
        )) : <p className="rounded-2xl bg-secondary/50 px-3 py-3 text-sm font-bold text-muted-foreground">No pilot issues in this section.</p>}
      </div>
    </SectionCard>
  );
}

function IssueDetail({ issue, session, onChanged }) {
  const [note, setNote] = useState("");
  const canClose = canClosePilotIssues(session);

  useEffect(() => {
    setNote("");
  }, [issue?.issueId]);

  if (!issue) {
    return (
      <SectionCard>
        <PanelHeader icon={LockKeyhole} title="Selected Issue" helper="Create or select an issue to review local evidence." />
      </SectionCard>
    );
  }

  const setStatus = (status) => {
    if (status === "Closed" && !canClose) return;
    updatePilotIssue(issue.issueId, { status }, session);
    onChanged?.();
  };
  const addNote = () => {
    addPilotIssueNote(issue.issueId, note, session);
    setNote("");
    onChanged?.();
  };

  return (
    <SectionCard className="space-y-3">
      <PanelHeader icon={LockKeyhole} title="Selected Issue" helper="Safe action: record and review only. Closing blocker issues is Supervisor/Manager/Admin only." />
      <div className="rounded-2xl bg-secondary/60 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="break-words text-base font-black text-foreground">{issue.title}</p>
            <p className="mt-1 break-words text-xs font-bold text-muted-foreground">{issue.area}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge>{issue.severity}</Badge>
            <Badge>{issue.status}</Badge>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <InfoLine label="Expected" value={issue.expectedBehavior} />
          <InfoLine label="Observed" value={issue.observedBehavior} />
          <InfoLine label="Created" value={`${issue.createdBy} · ${issue.createdByRole} · ${formatDateTime(issue.createdAt)}`} />
          <InfoLine label="Device" value={issue.deviceId} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {ISSUE_STATUSES.map((status) => (
          <MiniButton key={status} onClick={() => setStatus(status)} disabled={status === "Closed" && !canClose} variant={status === "Closed" ? "primary" : "secondary"}>{status}</MiniButton>
        ))}
      </div>
      {!canClose && <p className="rounded-2xl border border-border bg-background/70 px-3 py-2 text-xs font-bold text-muted-foreground">Staff can flag and note issues, but cannot close blockers or mark the release gate ready.</p>}
      <label className="block">
        <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Add Note</span>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="mt-2 w-full resize-none rounded-2xl border border-input bg-card px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" />
      </label>
      <MiniButton onClick={addNote} disabled={!note.trim()}>Add Note</MiniButton>
      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Notes</p>
        {(issue.notes || []).length ? issue.notes.map((entry) => (
          <div key={entry.noteId} className="rounded-2xl border border-border bg-background/70 p-3">
            <p className="break-words text-sm font-bold text-foreground">{entry.noteText}</p>
            <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{entry.actorName} · {entry.actorRole} · {formatDateTime(entry.createdAt)}</p>
          </div>
        )) : <p className="rounded-2xl bg-secondary/50 px-3 py-2 text-sm font-bold text-muted-foreground">No issue notes yet.</p>}
      </div>
    </SectionCard>
  );
}

function IssuesWorkspace({ model, selectedPack, session, selectedIssueId, setSelectedIssueId, onChanged }) {
  const [filter, setFilter] = useState("needs_action");
  const selectedIssue = model.issues.find((issue) => issue.issueId === selectedIssueId) || model.openIssues[0] || model.issues[0] || null;

  return (
    <>
      <IssueCreatePanel selectedPack={selectedPack} session={session} onCreated={(issueId) => { setSelectedIssueId(issueId); onChanged?.(); }} />
      <IssueList issues={model.issues} selectedIssueId={selectedIssue?.issueId} setSelectedIssueId={setSelectedIssueId} filter={filter} setFilter={setFilter} />
      <IssueDetail issue={selectedIssue} session={session} onChanged={onChanged} />
    </>
  );
}

function ReleaseGate({ model, session, onChanged }) {
  const [note, setNote] = useState(model.releaseGate.note || "");
  const managerReady = canMarkPilotReady(session);
  const hasOpenBlockers = model.openBlockers.length > 0 || model.counts.blocked > 0;
  const hasOpenHighOrFailed = model.openHigh.length > 0 || model.counts.failed > 0;
  const allPassed = model.counts.total > 0 && model.counts.passed === model.counts.total;
  const pilotReadyAllowed = managerReady && allPassed && !hasOpenBlockers && !hasOpenHighOrFailed;

  useEffect(() => {
    setNote(model.releaseGate.note || "");
  }, [model.releaseGate.note]);

  const setGate = (status) => {
    if (status === "Local Pilot Ready" && !pilotReadyAllowed) return;
    updateReleaseGate({ status, note }, session);
    onChanged?.();
  };

  return (
    <SectionCard className="space-y-3">
      <PanelHeader icon={ShieldCheck} title="Local Release Gate" helper="Manager/Admin local gate only. This does not approve live deployment or perform operational mutation." />
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{model.releaseGate.status}</Badge>
        <Badge>{model.readinessStatus}</Badge>
      </div>
      <div className="rounded-2xl border border-border bg-background/70 p-3 space-y-2">
        <InfoLine label="Last reviewed" value={formatDateTime(model.releaseGate.updatedAt)} />
        <InfoLine label="Reviewed by" value={model.releaseGate.updatedBy ? `${model.releaseGate.updatedBy} · ${model.releaseGate.updatedByRole}` : "Not reviewed"} />
        <InfoLine label="Gate rule" value="All checks passed + no open blocker/high issue" />
      </div>
      <label className="block">
        <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Release Gate Note</span>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="mt-2 w-full resize-none rounded-2xl border border-input bg-card px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <MiniButton onClick={() => setGate("Needs Review")}>Needs Review</MiniButton>
        <MiniButton onClick={() => setGate("Not Ready")} variant="danger" disabled={!managerReady}>Not Ready</MiniButton>
        <MiniButton onClick={() => setGate("Local Pilot Ready")} variant="primary" disabled={!pilotReadyAllowed}>Local Pilot Ready</MiniButton>
        <MiniButton onClick={() => setGate(model.releaseGate.status)} disabled={!managerReady}>Save Note</MiniButton>
      </div>
      {!managerReady && <p className="rounded-2xl border border-border bg-background/70 px-3 py-2 text-xs font-bold text-muted-foreground">{session.actorRole} can run UAT evidence but cannot mark final pilot readiness. Manager/Admin required.</p>}
      {managerReady && !pilotReadyAllowed && <p className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800">Local Pilot Ready stays locked until every check passes and open blocker/high issues are cleared.</p>}
    </SectionCard>
  );
}

function ReportWorkspace({ model, session, onChanged }) {
  const [copied, setCopied] = useState(false);
  const report = useMemo(() => buildPilotReport(model), [model]);

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
    } catch {
      const area = document.createElement("textarea");
      area.value = report;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
      setCopied(true);
    }
    createScanOpsEvent(SCANOPS_EVENT_TYPES.PILOT_REPORT_COPIED || "PILOT_REPORT_COPIED", {
      source_module: "ScanOps Pilot Readiness",
      status: "local_pilot_report_copied",
      readinessStatus: model.readinessStatus,
      releaseGateStatus: model.releaseGate.status,
      mutationAllowed: false,
      liveDeploymentCertified: false,
    });
    onChanged?.();
  };

  return (
    <>
      <ReleaseGate model={model} session={session} onChanged={onChanged} />
      <SectionCard className="space-y-3">
        <PanelHeader icon={FileText} title="Pilot Report" helper="Plain text local report for UAT handoff. No PDF/export engine is added in Stage AJ." />
        <div className="grid grid-cols-2 gap-2">
          <MetricPill label="Status" value={model.readinessStatus} />
          <MetricPill label="Gate" value={model.releaseGate.status} />
          <MetricPill label="Open Blockers" value={model.openBlockers.length} />
          <MetricPill label="Open High" value={model.openHigh.length} />
        </div>
        <pre className="max-h-96 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words rounded-2xl bg-secondary/60 p-3 text-[11px] font-semibold leading-relaxed text-muted-foreground">{report}</pre>
        <MiniButton onClick={copyReport} variant="primary"><Copy className="mr-1 inline h-3.5 w-3.5" />Copy Report</MiniButton>
        {copied && <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">Pilot report copied locally.</p>}
      </SectionCard>
    </>
  );
}

export default function PilotReadiness() {
  const navigate = useNavigate();
  const session = useScanOpsSession();
  const model = usePilotReadiness();
  const [mode, setMode] = useState("overview");
  const [selectedPack, setSelectedPack] = useState("core");
  const [selectedCheckId, setSelectedCheckId] = useState("home_unchanged");
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    createScanOpsEvent(SCANOPS_EVENT_TYPES.PILOT_READINESS_VIEWED || "PILOT_READINESS_VIEWED", {
      source_module: "ScanOps Pilot Readiness",
      status: "viewed",
      evidenceScope: "Local UAT Evidence",
      desktopConnected: false,
      mutationAllowed: false,
      liveDeploymentCertified: false,
    });
  }, []);

  const refresh = () => setRefreshKey((value) => value + 1);

  if (session.actorRole === "Staff") {
    return (
      <PageShell>
        <PageHeader title="Report Pilot Issue" subtitle="Tell a supervisor what happened" />
        <WorkflowMain key={refreshKey}>
          <IssueCreatePanel selectedPack="core" session={session} onCreated={() => refresh()} />
          <SectionCard className="space-y-3">
            <PanelHeader icon={LockKeyhole} title="Staff view" helper="UAT packs, release gate, role matrix, reports, contract preview, and payload inspection are hidden from Staff." />
            <div className="grid grid-cols-3 gap-2">
              <MetricPill label="Your role" value={session.actorRole} />
              <MetricPill label="Issue log" value="Local" />
              <MetricPill label="Sync" value="No live sync" />
            </div>
            <p className="rounded-2xl border border-border bg-background/70 px-3 py-2 text-xs font-bold text-muted-foreground">Report what happened, which screen it happened on, and whether it blocked your work. A supervisor or manager reviews the issue later.</p>
          </SectionCard>
        </WorkflowMain>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader title="Pilot Readiness" subtitle="Manager/Admin UAT scripts, safety checks, and release-gate proof" />
      <WorkflowMain key={refreshKey}>
        <ModeTabs mode={mode} setMode={setMode} />

        {mode === "overview" && (
          <>
            <ReadinessSummary model={model} />
            <UatPackCards model={model} selectedPack={selectedPack} setSelectedPack={(packId) => { setSelectedPack(packId); setMode("scripts"); }} />
            <ReleaseGate model={model} session={session} onChanged={refresh} />
          </>
        )}

        {mode === "scripts" && (
          <UatScripts
            model={model}
            selectedPack={selectedPack}
            setSelectedPack={setSelectedPack}
            selectedCheckId={selectedCheckId}
            setSelectedCheckId={setSelectedCheckId}
            session={session}
            onChanged={refresh}
          />
        )}

        {mode === "issues" && (
          <IssuesWorkspace
            model={model}
            selectedPack={selectedPack}
            session={session}
            selectedIssueId={selectedIssueId}
            setSelectedIssueId={setSelectedIssueId}
            onChanged={refresh}
          />
        )}

        {mode === "report" && <ReportWorkspace model={model} session={session} onChanged={refresh} />}

        <SectionCard className="border-border bg-background/70">
          <div className="flex items-start gap-3">
            <Route className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs font-bold leading-snug text-muted-foreground">Stage AK keeps Pilot Readiness behind Manager/Admin or UAT mode. It records local UAT evidence, issues, and release-gate proof only; it does not sync to desktop, route to printers, approve changes, or mutate inventory, prices, promotions, waste, or accounting.</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MiniButton onClick={() => navigate("/store-ops-dashboard")}>Open Store Ops</MiniButton>
            <MiniButton onClick={() => navigate("/desktop-sync-contract")}>Open Sync Contract</MiniButton>
          </div>
        </SectionCard>
      </WorkflowMain>
    </PageShell>
  );
}
