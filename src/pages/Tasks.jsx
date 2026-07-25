import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Flag,
  Info,
  Link2,
  ListChecks,
  Lock,
  Play,
  RotateCcw,
  ShieldAlert,
  UserPlus,
} from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import { SectionCard, TextInputField } from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { hasRoleAtLeast } from "../lib/scanOpsPermissions";
import { useScanOpsSession } from "../lib/scanOpsSession";
import {
  buildTaskEventPayload,
  canCancelTask,
  canCompleteTask,
  canEscalateTask,
  canReassignTask,
  canStartTask,
  filterTasks,
  getInitialTaskQueue,
  getTaskDueStateLabel,
  getTaskLinkedWorkflow,
  getTaskPriority,
  getTaskStats,
  getTaskStatusLabel,
  normalizeTask,
  reassignTask,
  resetTaskQueue,
  sortTasksByOperationalPriority,
  TASK_DEPARTMENTS,
  TASK_DUE_STATES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  updateTaskStatus,
} from "../lib/scanOpsTasks";

const BUTTON_PRIMARY = "w-full min-h-12 rounded-2xl bg-primary px-3 text-sm font-black text-primary-foreground active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2";
const BUTTON_SECONDARY = "w-full min-h-12 rounded-2xl bg-secondary px-3 text-sm font-black text-secondary-foreground active:bg-border disabled:opacity-40 flex items-center justify-center gap-2";
const BUTTON_MUTED = "w-full min-h-12 rounded-2xl border border-border bg-card px-3 text-sm font-black text-foreground active:bg-secondary disabled:opacity-40 flex items-center justify-center gap-2";
const CHIP_BUTTON = "min-h-11 rounded-2xl px-3 text-xs font-black border transition-all active:scale-[0.98] whitespace-nowrap";

const TASK_FILTER_TABS = [
  { id: "mine", label: "Mine" },
  { id: "team", label: "Team" },
  { id: "escalated", label: "Escalated" },
  { id: "done", label: "Done" },
];

function priorityClass(priority) {
  switch (priority) {
    case TASK_PRIORITIES.CRITICAL:
      return "border-destructive/25 bg-destructive/10 text-destructive";
    case TASK_PRIORITIES.HIGH:
      return "border-destructive/25 bg-destructive/10 text-destructive";
    case TASK_PRIORITIES.LOW:
      return "border-border bg-muted text-muted-foreground";
    default:
      return "border-amber-500/25 bg-amber-500/10 text-amber-700";
  }
}

function dueClass(dueState) {
  switch (dueState) {
    case TASK_DUE_STATES.OVERDUE:
      return "text-destructive";
    case TASK_DUE_STATES.NOW:
    case TASK_DUE_STATES.TODAY:
      return "text-amber-700";
    default:
      return "text-primary";
  }
}

function statusClass(status) {
  switch (status) {
    case TASK_STATUSES.DONE:
      return "text-emerald-700";
    case TASK_STATUSES.IN_PROGRESS:
      return "text-primary";
    case TASK_STATUSES.BLOCKED:
      return "text-amber-700";
    case TASK_STATUSES.ESCALATED:
      return "text-violet-700";
    default:
      return "text-muted-foreground";
  }
}

function detailBadgeClass(status) {
  if (status === TASK_STATUSES.ESCALATED) return "border-violet-500/25 bg-violet-500/10 text-violet-700";
  return "border-primary/20 bg-primary/10 text-primary";
}

function dueDateLabel(value) {
  if (!value) return "â€”";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} Â· ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function sourceSnapshotText(task) {
  const snap = task.source_item_snapshot || {};
  return [
    snap.item_name || snap.itemName || snap.name,
    snap.sku && `SKU ${snap.sku}`,
    snap.unknown_barcode && `Barcode ${snap.unknown_barcode}`,
    snap.expected_quantity != null && `Expected ${snap.expected_quantity}`,
    snap.received_quantity != null && `Received ${snap.received_quantity}`,
    snap.counted_quantity != null && `Counted ${snap.counted_quantity}`,
    snap.difference_quantity != null && `Diff ${snap.difference_quantity > 0 ? "+" : ""}${snap.difference_quantity}`,
    snap.variance_quantity != null && `Variance ${snap.variance_quantity > 0 ? "+" : ""}${snap.variance_quantity}`,
    snap.item_count != null && `${snap.item_count} items`,
  ].filter(Boolean).join(" Â· ");
}

function taskListStatus(task) {
  if (task.status === TASK_STATUSES.ESCALATED) return "Needs review";
  if ([TASK_DUE_STATES.OVERDUE, TASK_DUE_STATES.NOW, TASK_DUE_STATES.TODAY].includes(task.due_state)) {
    return getTaskDueStateLabel(task.due_state);
  }
  return getTaskStatusLabel(task.status);
}

function taskListStatusClass(task) {
  if ([TASK_DUE_STATES.OVERDUE, TASK_DUE_STATES.NOW, TASK_DUE_STATES.TODAY].includes(task.due_state)) {
    return dueClass(task.due_state);
  }
  return statusClass(task.status);
}

export default function Tasks() {
  const navigate = useNavigate();
  const session = useScanOpsSession();
  const [tasks, setTasks] = useState(() => getInitialTaskQueue());
  const [activeTab, setActiveTab] = useState(() => session.actorRole === "Staff" ? "mine" : "team");
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [completionNote, setCompletionNote] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [escalationReason, setEscalationReason] = useState("");
  const [assignmentDepartment, setAssignmentDepartment] = useState("Grocery");
  const [lastEvent, setLastEvent] = useState(null);

  const selectedTask = useMemo(() => tasks.map(normalizeTask).find((task) => task.taskId === selectedTaskId || task.id === selectedTaskId) || null, [selectedTaskId, tasks]);
  const taskFilters = { tab: activeTab };
  const visibleTasks = useMemo(() => sortTasksByOperationalPriority(filterTasks(tasks, taskFilters, session)), [tasks, activeTab, session]);
  const stats = useMemo(() => getTaskStats(tasks, session), [tasks, session]);
  const doneCount = useMemo(() => tasks.map(normalizeTask).filter((task) => task.status === TASK_STATUSES.DONE).length, [tasks]);

  const recordAndSet = (task, nextStatus, eventType, extra = {}) => {
    const updated = updateTaskStatus(tasks, task.taskId, nextStatus, extra, session);
    setTasks(updated);
    const nextTask = updated.find((row) => row.taskId === task.taskId) || task;
    setSelectedTaskId(nextTask.taskId);
    const event = createScanOpsEvent(eventType, buildTaskEventPayload(nextTask, nextStatus, { ...extra, status: nextStatus }));
    setLastEvent(event);
  };

  const startTask = (task) => recordAndSet(task, TASK_STATUSES.IN_PROGRESS, SCANOPS_EVENT_TYPES.TASK_STARTED, { status: "in_progress" });

  const markBlocked = (task) => {
    const reason = blockReason.trim();
    if (!reason) return;
    recordAndSet(task, TASK_STATUSES.BLOCKED, SCANOPS_EVENT_TYPES.TASK_BLOCKED, { blocked_reason: reason, status: "blocked" });
  };

  const escalateTask = (task) => {
    const reason = escalationReason.trim();
    if (!reason) return;
    recordAndSet(task, TASK_STATUSES.ESCALATED, SCANOPS_EVENT_TYPES.TASK_ESCALATED, { escalation_reason: reason, status: "escalated" });
  };

  const completeTask = (task) => {
    const note = completionNote.trim();
    if (!note) return;
    recordAndSet(task, TASK_STATUSES.DONE, SCANOPS_EVENT_TYPES.TASK_COMPLETED, {
      completion_note: note,
      status: "done",
      creates_sync_queue_item: true,
      applies_stock_directly: false,
      closes_source_exception: false,
      creates_product_directly: false,
      prints_directly: false,
    });
  };

  const cancelTask = (task) => {
    const reason = blockReason.trim() || "Cancelled from manager/admin task review";
    recordAndSet(task, TASK_STATUSES.CANCELLED, SCANOPS_EVENT_TYPES.TASK_CANCELLED, { cancelled_reason: reason, status: "cancelled" });
    setSelectedTaskId(null);
  };

  const reassignSelectedTask = (task) => {
    if (!assignmentDepartment) return;
    const nextTasks = reassignTask(tasks, task.taskId, {
      assigned_user_id: "team",
      assigned_user_name: `${assignmentDepartment} Team`,
      assigned_department: assignmentDepartment,
      assigned_role: assignmentDepartment === "Manager Review" ? "Manager" : "Staff",
    }, `Reassigned to ${assignmentDepartment}`, session);
    setTasks(nextTasks);
    setSelectedTaskId(task.taskId);
    const nextTask = nextTasks.find((row) => row.taskId === task.taskId) || task;
    const event = createScanOpsEvent(SCANOPS_EVENT_TYPES.TASK_REASSIGNED, buildTaskEventPayload(nextTask, nextTask.status, { status: "reassigned" }));
    setLastEvent(event);
  };

  const openLinkedWorkflow = (task) => {
    const workflow = getTaskLinkedWorkflow(task);
    const event = createScanOpsEvent(SCANOPS_EVENT_TYPES.TASK_LINKED_ACTION_OPENED, buildTaskEventPayload(task, task.status, {
      status: "workflow_opened",
      linked_workflow: workflow.path,
      linked_context: task.linkedContext,
      sync_exempt: true,
    }));
    setLastEvent(event);
    navigate(`${workflow.path}${workflow.search}`);
  };

  const resetForTesting = () => {
    const reset = resetTaskQueue();
    setTasks(reset);
    setSelectedTaskId(null);
    setActiveTab(session.actorRole === "Staff" ? "mine" : "team");
    setLastEvent(null);
  };

  if (selectedTask) {
    const workflow = getTaskLinkedWorkflow(selectedTask);
    const canReassign = canReassignTask(selectedTask, session);
    const canCancel = canCancelTask(selectedTask, session);
    const canStart = canStartTask(selectedTask, session);
    const canComplete = canCompleteTask(selectedTask, session);
    const canEscalate = canEscalateTask(selectedTask, session);
    return (
      <div className="bold-blocks min-h-screen bg-background flex flex-col overflow-x-hidden">
        <PageHeader title="Task" subtitle="Source-linked work evidence" />
        <main data-scanops-scroll className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 pb-8 space-y-3">
          <SectionCard className="space-y-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-wider text-primary">{selectedTask.task_ref}</p>
                <h2 className="mt-1 break-words text-lg font-black leading-tight text-foreground">{selectedTask.title}</h2>
                <p className="mt-1 break-words text-sm font-semibold text-muted-foreground">{selectedTask.description}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Badge label={getTaskPriority(selectedTask)} className={priorityClass(selectedTask.priority)} />
              <Badge label={getTaskDueStateLabel(selectedTask.due_state)} className="border-border bg-secondary text-secondary-foreground" />
              <Badge label={getTaskStatusLabel(selectedTask.status)} className={detailBadgeClass(selectedTask.status)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InfoBlock label="Assigned" value={selectedTask.assigned_user_name || selectedTask.assigned_department || "Unassigned"} />
              <InfoBlock label="Due" value={dueDateLabel(selectedTask.dueAt)} />
              <InfoBlock label="Department" value={selectedTask.assigned_department} />
              <InfoBlock label="Role" value={selectedTask.assigned_role} />
            </div>
          </SectionCard>

          <SectionCard className="space-y-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                <Link2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Source</p>
                <h3 className="mt-1 break-words text-base font-black text-foreground">{selectedTask.source_module} Â· {selectedTask.source_ref}</h3>
                <p className="mt-1 break-words text-xs font-bold text-muted-foreground">{sourceSnapshotText(selectedTask) || selectedTask.source_status_snapshot || "Source evidence linked."}</p>
              </div>
            </div>
            <InfoBlock label="Action needed" value={selectedTask.action_needed} />
            <InfoBlock label="Evidence required" value={selectedTask.evidence_required} />
            <p className="rounded-2xl bg-secondary/60 px-3 py-2 text-xs font-bold text-muted-foreground">
              Completion records task evidence only. It does not post stock, close receiving/transfer exceptions, create products, print tickets, or calculate prices.
            </p>
            <button type="button" onClick={() => openLinkedWorkflow(selectedTask)} className={BUTTON_PRIMARY}>
              Open Source <ArrowRight className="h-4 w-4" />
            </button>
            <p className="break-words text-xs font-semibold text-muted-foreground">Target: {workflow.label}</p>
          </SectionCard>

          {selectedTask.status === TASK_STATUSES.BLOCKED && (
            <Notice icon={ShieldAlert} title="Blocked" helper={selectedTask.blocked_reason || "Reason required before this task can continue."} />
          )}
          {selectedTask.status === TASK_STATUSES.ESCALATED && (
            <Notice icon={AlertTriangle} title="Escalated" helper={selectedTask.escalation_reason || "Supervisor, Manager, or Admin review required."} danger />
          )}
          {selectedTask.started_at && <InfoBlock label="Started" value={`${selectedTask.started_by || "Operator"} Â· ${dueDateLabel(selectedTask.started_at)}`} />}
          {selectedTask.completed_at && <InfoBlock label="Completed" value={`${selectedTask.completed_by || "Operator"} Â· ${dueDateLabel(selectedTask.completed_at)}`} />}

          {lastEvent && <EventProof event={lastEvent} />}

          {selectedTask.status !== TASK_STATUSES.DONE && selectedTask.status !== TASK_STATUSES.CANCELLED && (
            <SectionCard className="space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Task actions</p>
              <button type="button" onClick={() => startTask(selectedTask)} disabled={!canStart} className={BUTTON_PRIMARY}>
                <Play className="h-4 w-4" />Start Task
              </button>

              <TextInputField label="Blocked / cancel reason" value={blockReason} onChange={setBlockReason} placeholder="Required for Blocked. Used as cancel reason for Manager/Admin." />
              <button type="button" onClick={() => markBlocked(selectedTask)} disabled={!blockReason.trim() || selectedTask.status === TASK_STATUSES.ESCALATED} className={BUTTON_SECONDARY}>
                <Flag className="h-4 w-4" />Mark Blocked
              </button>

              <TextInputField label="Escalation reason" value={escalationReason} onChange={setEscalationReason} placeholder="Required to escalate" />
              <button type="button" onClick={() => escalateTask(selectedTask)} disabled={!canEscalate || !escalationReason.trim()} className={BUTTON_SECONDARY}>
                <ShieldAlert className="h-4 w-4" />Escalate
              </button>

              <TextInputField label="Completion note" value={completionNote} onChange={setCompletionNote} placeholder="Required completion evidence" />
              <button type="button" onClick={() => completeTask(selectedTask)} disabled={!canComplete || !completionNote.trim()} className={BUTTON_SECONDARY}>
                <CheckCircle2 className="h-4 w-4" />Complete Task
              </button>

              {canReassign && (
                <div className="space-y-3 rounded-2xl border border-border bg-card p-3">
                  <TouchSelect label="Reassign to" value={assignmentDepartment} onChange={setAssignmentDepartment} options={TASK_DEPARTMENTS} />
                  <button type="button" onClick={() => reassignSelectedTask(selectedTask)} className={BUTTON_MUTED}>
                    <UserPlus className="h-4 w-4" />Reassign Task
                  </button>
                </div>
              )}

              {canCancel ? (
                <button type="button" onClick={() => cancelTask(selectedTask)} className={BUTTON_MUTED}>
                  Cancel Task
                </button>
              ) : (
                <div className="flex items-start gap-2 rounded-2xl bg-secondary/50 px-3 py-2 text-xs font-bold text-muted-foreground">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" /> Staff cannot reassign, cancel, or close escalated manager-review tasks.
                </div>
              )}
            </SectionCard>
          )}

          <button type="button" onClick={() => setSelectedTaskId(null)} className={BUTTON_MUTED}>Back to Tasks</button>
        </main>
      </div>
    );
  }

  return (
    <div className="bold-blocks min-h-screen bg-background flex flex-col overflow-x-hidden">
      <PageHeader title="Tasks" subtitle="Assigned frontline work" />
      <main data-scanops-scroll className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 pb-8 space-y-3">
        <SectionCard className="space-y-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ListChecks className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-black leading-tight text-foreground">Tasks</h2>
              <p className="mt-1 break-words text-sm font-semibold text-muted-foreground">Assigned frontline work</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <StatCard label="Mine" value={stats.mine} />
            <StatCard label="Due" value={stats.dueNow} />
            <StatCard label="Esc." value={stats.escalated} />
            <StatCard label="Done" value={doneCount} />
          </div>
        </SectionCard>

        <section className="grid grid-cols-4 gap-2 min-w-0" aria-label="Task filters">
          {TASK_FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`${CHIP_BUTTON} ${activeTab === tab.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}
            >
              {tab.label}
            </button>
          ))}
        </section>

        <SectionCard>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Info className="h-5 w-5" />
            </div>
            <p className="break-words text-sm font-semibold text-muted-foreground">Focus on the next action.</p>
          </div>
        </SectionCard>

        <section className="space-y-3 min-w-0">
          {visibleTasks.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-5 text-center">
              <Clock3 className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-black text-foreground">No tasks here</p>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">Assigned work will appear here when workflows create local evidence.</p>
            </div>
          ) : (
            visibleTasks.map((task) => <TaskCard key={task.taskId} task={task} onOpen={() => setSelectedTaskId(task.taskId)} />)
          )}
        </section>

        {hasRoleAtLeast(session.actorRole, "Manager") && (
          <SectionCard className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-foreground">UAT helper</p>
                <p className="mt-1 break-words text-sm font-semibold text-muted-foreground">Manager/Admin only. Clears the local task queue; workflow-created evidence remains untouched.</p>
              </div>
            </div>
            <button type="button" onClick={resetForTesting} className={BUTTON_SECONDARY}>
              <RotateCcw className="h-4 w-4" />Clear Task Queue
            </button>
          </SectionCard>
        )}
      </main>
    </div>
  );
}

function TaskCard({ task, onOpen }) {
  const normalized = normalizeTask(task);
  const statusText = taskListStatus(normalized);
  const statusTextClass = taskListStatusClass(normalized);
  const priorityLabel = normalized.status === TASK_STATUSES.ESCALATED ? "Escalated" : getTaskPriority(normalized);

  return (
    <button type="button" onClick={onOpen} className="w-full rounded-2xl border border-border bg-card p-4 text-left transition active:scale-[0.99] active:bg-secondary/60">
      <div className="grid grid-cols-[auto,1fr,auto] items-center gap-3 min-w-0">
        <Badge label={priorityLabel} className={normalized.status === TASK_STATUSES.ESCALATED ? "border-violet-500/25 bg-violet-500/10 text-violet-700" : priorityClass(normalized.priority)} />
        <div className="min-w-0">
          <h3 className="break-words text-base font-black leading-tight text-foreground">{normalized.title}</h3>
          <p className="mt-1 break-words text-sm font-semibold text-muted-foreground">Source: {normalized.source_module}</p>
          <p className={`mt-2 flex items-center gap-2 break-words text-sm font-black ${statusTextClass}`}>
            <span className="h-2 w-2 shrink-0 rounded-full bg-current" />
            {statusText}
          </p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-background text-primary">
          <ArrowRight className="h-5 w-5" />
        </div>
      </div>
    </button>
  );
}

function Badge({ label, className }) {
  return <span className={`inline-flex min-h-8 shrink-0 items-center rounded-full border px-3 text-[10px] font-black uppercase tracking-wide ${className}`}>{label}</span>;
}

function StatCard({ label, value }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-secondary/50 px-2 py-3 text-center">
      <p className="text-xl font-black leading-none text-foreground">{value}</p>
      <p className="mt-1 truncate text-[10px] font-black uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="min-w-0 rounded-2xl bg-secondary/60 px-3 py-2">
      <p className="truncate text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-foreground">{value || "â€”"}</p>
    </div>
  );
}

function Notice({ icon: Icon, title, helper, danger = false }) {
  return (
    <section className={`rounded-2xl border p-4 ${danger ? "border-destructive/20 bg-destructive/10" : "border-amber-500/20 bg-amber-500/10"}`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${danger ? "text-destructive" : "text-amber-700"}`} />
        <div className="min-w-0">
          <p className={`font-black ${danger ? "text-destructive" : "text-amber-800"}`}>{title}</p>
          <p className={`mt-1 break-words text-sm font-semibold ${danger ? "text-destructive/80" : "text-amber-800/80"}`}>{helper}</p>
        </div>
      </div>
    </section>
  );
}

function EventProof({ event }) {
  return (
    <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4 min-w-0">
      <div className="flex items-start gap-3">
        <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="font-black text-foreground">Last task event</p>
          <p className="mt-1 break-words text-sm font-semibold text-muted-foreground">{String(event.event_type || "event").replaceAll("_", " ")}</p>
          <p className="mt-2 break-all text-xs font-semibold text-muted-foreground">Trace: {event.trace_id}</p>
        </div>
      </div>
    </section>
  );
}