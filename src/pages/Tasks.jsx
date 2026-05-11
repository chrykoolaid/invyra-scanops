import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/scanner/PageHeader";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Flag,
  ListChecks,
  Play,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { SCANOPS_USER_CONTEXT } from "../lib/scanOpsInventoryFixtures";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import {
  buildTaskEventPayload,
  canCompleteTask,
  canStartTask,
  filterTasks,
  getInitialTaskQueue,
  getTaskLinkedWorkflow,
  getTaskPriority,
  getTaskStatusLabel,
  getTaskTypeLabel,
  resetTaskQueue,
  TASK_FILTERS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  updateTaskStatus,
} from "../lib/scanOpsTasks";

const BUTTON_PRIMARY = "w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:active:scale-100";
const BUTTON_SECONDARY = "w-full py-4 rounded-2xl bg-secondary text-secondary-foreground font-bold text-sm active:scale-[0.98] active:bg-border transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:active:scale-100";
const BUTTON_MUTED = "w-full py-4 rounded-2xl bg-background border border-border text-foreground font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:active:scale-100";
const CHIP_BUTTON = "rounded-2xl px-3 py-3 text-xs font-black border transition-all active:scale-[0.98] whitespace-nowrap";

function priorityClass(priority) {
  switch (priority) {
    case TASK_PRIORITIES.URGENT:
      return "bg-destructive/10 text-destructive border-destructive/20";
    case TASK_PRIORITIES.HIGH:
      return "bg-amber-500/10 text-amber-700 border-amber-500/20";
    case TASK_PRIORITIES.LOW:
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-primary/10 text-primary border-primary/20";
  }
}

function statusClass(status) {
  switch (status) {
    case TASK_STATUSES.COMPLETED:
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
    case TASK_STATUSES.IN_PROGRESS:
      return "bg-primary/10 text-primary border-primary/20";
    case TASK_STATUSES.BLOCKED:
      return "bg-destructive/10 text-destructive border-destructive/20";
    case TASK_STATUSES.SYNC_PENDING:
      return "bg-amber-500/10 text-amber-700 border-amber-500/20";
    case TASK_STATUSES.SYNC_FAILED:
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-secondary text-secondary-foreground border-border";
  }
}

function dueLabel(value) {
  if (!value) return "No due time";
  try {
    const date = new Date(value);
    return date.toLocaleDateString([], { month: "short", day: "numeric" }) + " · " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return value;
  }
}

function sortTasks(a, b) {
  const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
  const statusOrder = { in_progress: 0, not_started: 1, blocked: 2, sync_failed: 3, sync_pending: 4, completed: 5, cancelled: 6 };
  return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
    || (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9)
    || String(a.dueAt || "").localeCompare(String(b.dueAt || ""));
}

export default function Tasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState(() => getInitialTaskQueue());
  const [activeFilter, setActiveFilter] = useState("mine");
  const [scope, setScope] = useState("mine");
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [lastEvent, setLastEvent] = useState(null);

  const selectedTask = useMemo(() => tasks.find((task) => task.taskId === selectedTaskId || task.id === selectedTaskId) || null, [selectedTaskId, tasks]);
  const filteredTasks = useMemo(() => filterTasks(tasks, activeFilter, SCANOPS_USER_CONTEXT, scope).sort(sortTasks), [tasks, activeFilter, scope]);
  const stats = useMemo(() => ({
    active: tasks.filter((task) => ![TASK_STATUSES.COMPLETED, TASK_STATUSES.CANCELLED].includes(task.status)).length,
    today: filterTasks(tasks, "due_today", SCANOPS_USER_CONTEXT, "team").length,
    inProgress: tasks.filter((task) => task.status === TASK_STATUSES.IN_PROGRESS).length,
    issues: tasks.filter((task) => [TASK_STATUSES.BLOCKED, TASK_STATUSES.SYNC_FAILED].includes(task.status)).length,
  }), [tasks]);

  const changeFilter = (filterId) => {
    setActiveFilter(filterId);
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TASK_FILTER_CHANGED, buildTaskEventPayload({ taskId: "task_filter", title: "Task filter", taskType: "general_check" }, "viewed", { filter_id: filterId, sync_exempt: true }));
  };

  const recordAndSet = (task, nextStatus, eventType, extra = {}) => {
    const updated = updateTaskStatus(tasks, task.taskId, nextStatus, extra);
    setTasks(updated);
    const nextTask = updated.find((row) => row.taskId === task.taskId) || task;
    setSelectedTaskId(nextTask.taskId);
    const event = createScanOpsEvent(eventType, buildTaskEventPayload(nextTask, nextStatus, extra));
    setLastEvent(event);
  };

  const startTask = (task) => recordAndSet(task, TASK_STATUSES.IN_PROGRESS, SCANOPS_EVENT_TYPES.TASK_STARTED, { status: "in_progress" });
  const blockTask = (task) => recordAndSet(task, TASK_STATUSES.BLOCKED, SCANOPS_EVENT_TYPES.TASK_BLOCKED, { status: "blocked", blocked_reason: "Operator marked blocked" });
  const completeTask = (task) => recordAndSet(task, TASK_STATUSES.COMPLETED, SCANOPS_EVENT_TYPES.TASK_COMPLETED, { status: "completed", creates_sync_queue_item: true });

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
    setActiveFilter("mine");
    setScope("mine");
    setLastEvent(null);
  };

  if (selectedTask) {
    const workflow = getTaskLinkedWorkflow(selectedTask);
    return (
      <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
        <PageHeader title="Task Detail" subtitle="Open linked workflow without auto-submitting" />
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 pb-8 space-y-4">
          <section className="bg-card rounded-2xl border border-border p-5 space-y-4 min-w-0">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{getTaskTypeLabel(selectedTask.taskType)}</p>
                <h2 className="text-lg font-black text-foreground mt-1 break-words">{selectedTask.title}</h2>
                <p className="text-sm text-muted-foreground mt-1 break-words">{selectedTask.description}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InfoPill label="Priority" value={getTaskPriority(selectedTask)} className={priorityClass(selectedTask.priority)} />
              <InfoPill label="Status" value={getTaskStatusLabel(selectedTask.status)} className={statusClass(selectedTask.status)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InfoBlock label="Area" value={selectedTask.areaName} />
              <InfoBlock label="Due" value={dueLabel(selectedTask.dueAt)} />
            </div>
            <InfoBlock label="Assigned to" value={selectedTask.assignedToName || "—"} />
            <InfoBlock label="Instruction" value={selectedTask.description} />
          </section>

          <section className="bg-card rounded-2xl border border-border p-5 space-y-3 min-w-0">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Linked workflow</p>
            <h3 className="text-base font-black text-foreground break-words">{workflow.label}</h3>
            <p className="text-sm text-muted-foreground break-words">Context can prefill setup. It will not auto-add items, submit evidence, mutate stock, change price, or print tickets.</p>
            <button onClick={() => openLinkedWorkflow(selectedTask)} className={BUTTON_PRIMARY}>
              Open {getTaskTypeLabel(selectedTask.taskType)} <ArrowRight className="w-4 h-4" />
            </button>
          </section>

          {selectedTask.status === TASK_STATUSES.BLOCKED && (
            <section className="bg-amber-500/10 rounded-2xl border border-amber-500/20 p-4 min-w-0">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-bold text-amber-800">Task is blocked</p>
                  <p className="text-sm text-amber-800/80 mt-1 break-words">{selectedTask.blockedReason || "Operator marked this task blocked."}</p>
                </div>
              </div>
            </section>
          )}

          {lastEvent && <EventProof event={lastEvent} />}

          <div className="space-y-3">
            <button onClick={() => startTask(selectedTask)} disabled={!canStartTask(selectedTask, SCANOPS_USER_CONTEXT)} className={BUTTON_PRIMARY}>
              <Play className="w-4 h-4" />Start Task
            </button>
            <button onClick={() => blockTask(selectedTask)} disabled={selectedTask.status === TASK_STATUSES.COMPLETED} className={BUTTON_SECONDARY}>
              <Flag className="w-4 h-4" />Mark Blocked
            </button>
            <button onClick={() => completeTask(selectedTask)} disabled={!canCompleteTask(selectedTask, SCANOPS_USER_CONTEXT)} className={BUTTON_SECONDARY}>
              <CheckCircle2 className="w-4 h-4" />Complete Task
            </button>
            <button onClick={() => setSelectedTaskId(null)} className={BUTTON_MUTED}>Back to Tasks</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <PageHeader title="Tasks" subtitle="Assigned handheld work" />
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 pb-8 space-y-4">
        <section className="bg-card rounded-2xl border border-border p-5 min-w-0">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ListChecks className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-primary uppercase tracking-wider">Stage R Tasks</p>
              <h2 className="text-lg font-black text-foreground mt-1">Operator task list</h2>
              <p className="text-sm text-muted-foreground mt-1 break-words">Start work, open the linked workflow, then complete the task. Workflow opening never auto-submits anything.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button onClick={() => setScope("mine")} className={`${CHIP_BUTTON} ${scope === "mine" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-secondary-foreground border-border"}`}>My Tasks</button>
            <button onClick={() => setScope("team")} className={`${CHIP_BUTTON} ${scope === "team" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-secondary-foreground border-border"}`}>All Team Tasks</button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <StatCard label="Active" value={stats.active} />
          <StatCard label="Due Today" value={stats.today} />
          <StatCard label="In Progress" value={stats.inProgress} />
          <StatCard label="Issues" value={stats.issues} />
        </section>

        <section className="bg-card rounded-2xl border border-border p-3 min-w-0">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 mb-3">Filters</p>
          <div className="grid grid-cols-2 gap-2">
            {TASK_FILTERS.map((filter) => (
              <button key={filter.id} onClick={() => changeFilter(filter.id)} className={`${CHIP_BUTTON} ${activeFilter === filter.id ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-secondary-foreground border-border"}`}>
                {filter.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3 min-w-0">
          {filteredTasks.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-5 min-w-0 text-center">
              <Clock3 className="w-9 h-9 mx-auto text-muted-foreground" />
              <p className="font-bold text-foreground mt-3">No tasks in this filter</p>
              <p className="text-sm text-muted-foreground mt-1">Change filter or scope to see other assigned work.</p>
            </div>
          ) : (
            filteredTasks.map((task) => <TaskCard key={task.taskId} task={task} onOpen={() => setSelectedTaskId(task.taskId)} />)
          )}
        </section>

        <section className="bg-card rounded-2xl border border-border p-4 min-w-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-foreground">Testing helper</p>
              <p className="text-sm text-muted-foreground mt-1 break-words">Reset restores only local task fixtures. It does not create completed workflow history.</p>
            </div>
          </div>
          <button onClick={resetForTesting} className={`${BUTTON_SECONDARY} mt-4`}>
            <RotateCcw className="w-4 h-4" />Reset Tasks
          </button>
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-card border border-border px-3 py-4 text-center min-w-0">
      <p className="text-2xl font-black text-foreground leading-none">{value}</p>
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mt-1 truncate">{label}</p>
    </div>
  );
}

function TaskCard({ task, onOpen }) {
  return (
    <article className="bg-card rounded-2xl border border-border p-4 space-y-3 min-w-0">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2 mb-2">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${priorityClass(task.priority)}`}>{getTaskPriority(task)}</span>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black ${statusClass(task.status)}`}>{getTaskStatusLabel(task.status)}</span>
          </div>
          <h3 className="text-base font-black text-foreground break-words">{task.title}</h3>
          <p className="text-sm text-muted-foreground mt-1 break-words">{getTaskTypeLabel(task.taskType)} · {task.areaName} · Due {dueLabel(task.dueAt)}</p>
        </div>
        <ClipboardCheck className="w-5 h-5 text-primary shrink-0" />
      </div>
      <div className="rounded-2xl bg-secondary px-4 py-3 min-w-0">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Instruction</p>
        <p className="text-sm font-bold text-foreground mt-1 break-words">{task.description}</p>
      </div>
      <button onClick={onOpen} className={BUTTON_PRIMARY}>{task.status === TASK_STATUSES.IN_PROGRESS ? "Continue" : "Open Task"} <ArrowRight className="w-4 h-4" /></button>
    </article>
  );
}

function InfoPill({ label, value, className }) {
  return (
    <div className={`rounded-2xl border px-3 py-3 min-w-0 ${className}`}>
      <p className="text-[11px] font-black uppercase tracking-wide opacity-80 truncate">{label}</p>
      <p className="text-sm font-black mt-1 break-words">{value}</p>
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="rounded-2xl bg-secondary px-4 py-3 min-w-0">
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">{label}</p>
      <p className="text-sm font-bold text-foreground mt-1 break-words">{value || "—"}</p>
    </div>
  );
}

function EventProof({ event }) {
  return (
    <section className="bg-primary/5 rounded-2xl border border-primary/20 p-4 min-w-0">
      <div className="flex items-start gap-3">
        <Clock3 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-bold text-foreground">Last task event</p>
          <p className="text-sm text-muted-foreground mt-1 break-words">{String(event.event_type || "event").replaceAll("_", " ")}</p>
          <p className="text-xs text-muted-foreground mt-2 break-all">Trace: {event.trace_id}</p>
        </div>
      </div>
    </section>
  );
}
