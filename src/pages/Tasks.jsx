import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/scanner/PageHeader";
import DecisionRecommendationCard from "../components/scanner/DecisionRecommendationCard";
import {
  ArrowRight,
  Ban,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  Flag,
  ListChecks,
  Play,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { SCANOPS_USER_CONTEXT } from "../lib/scanOpsInventoryFixtures";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { buildDecisionLinkedPayload, createDecisionRecommendation, recordDecisionEvent } from "../lib/scanOpsDecisionEngine";
import {
  buildTaskEventPayload,
  canCancelTask,
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
const BUTTON_DANGER = "w-full py-4 rounded-2xl bg-destructive/10 text-destructive font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:active:scale-100";
const CHIP_BUTTON = "rounded-2xl px-4 py-3 text-sm font-bold border transition-all active:scale-[0.98] whitespace-nowrap";

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
    case TASK_STATUSES.NEEDS_SUPERVISOR:
      return "bg-amber-500/10 text-amber-700 border-amber-500/20";
    case TASK_STATUSES.CANCELLED:
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-secondary text-secondary-foreground border-border";
  }
}

function sortTasks(a, b) {
  const priorityOrder = {
    [TASK_PRIORITIES.URGENT]: 0,
    [TASK_PRIORITIES.HIGH]: 1,
    [TASK_PRIORITIES.NORMAL]: 2,
    [TASK_PRIORITIES.LOW]: 3,
  };
  const statusOrder = {
    [TASK_STATUSES.NEEDS_SUPERVISOR]: 0,
    [TASK_STATUSES.OPEN]: 1,
    [TASK_STATUSES.IN_PROGRESS]: 2,
    [TASK_STATUSES.BLOCKED]: 3,
    [TASK_STATUSES.COMPLETED]: 4,
    [TASK_STATUSES.CANCELLED]: 5,
  };
  return (priorityOrder[a.priority] ?? 5) - (priorityOrder[b.priority] ?? 5)
    || (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5)
    || a.itemName.localeCompare(b.itemName);
}

export default function Tasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState(() => getInitialTaskQueue());
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [lastEvent, setLastEvent] = useState(null);

  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId) || null, [selectedTaskId, tasks]);
  const taskDecision = useMemo(() => createDecisionRecommendation({ workflow: "task_priority", item: selectedTask, context: { task: selectedTask } }), [selectedTask]);
  const filteredTasks = useMemo(() => filterTasks(tasks, activeFilter, SCANOPS_USER_CONTEXT).sort(sortTasks), [tasks, activeFilter]);

  const openCount = tasks.filter((task) => ![TASK_STATUSES.COMPLETED, TASK_STATUSES.CANCELLED].includes(task.status)).length;
  const urgentCount = tasks.filter((task) => task.priority === TASK_PRIORITIES.URGENT && task.status !== TASK_STATUSES.CANCELLED).length;
  const supervisorCount = tasks.filter((task) => (task.requiresSupervisor || task.status === TASK_STATUSES.NEEDS_SUPERVISOR) && task.status !== TASK_STATUSES.CANCELLED).length;

  const writeTaskEvent = (eventType, task, status, extra = {}) => {
    const event = createScanOpsEvent(eventType, buildTaskEventPayload(task, status, extra));
    setLastEvent(event);
    return event;
  };

  const updateStatus = (task, status, eventType, extra = {}) => {
    const taskExtra = { ...extra };
    delete taskExtra.status;
    const updated = updateTaskStatus(tasks, task.id, status, taskExtra);
    setTasks(updated);
    writeTaskEvent(eventType, { ...task, ...taskExtra }, status, extra);
  };

  const startTask = (task) => {
    if (!canStartTask(task, SCANOPS_USER_CONTEXT)) return;
    const decisionForTask = createDecisionRecommendation({ workflow: "task_priority", item: task, context: { task } });
    const decisionEvent = recordDecisionEvent(decisionForTask, "accepted", { source_module: "Tasks", status: "accepted", task_id: task.id });
    updateStatus(task, TASK_STATUSES.IN_PROGRESS, SCANOPS_EVENT_TYPES.TASK_STARTED, {
      started_at: new Date().toISOString(),
      status: "in_progress",
      ...buildDecisionLinkedPayload(decisionForTask, decisionEvent),
    });
  };

  const completeTask = (task) => {
    if (!canCompleteTask(task, SCANOPS_USER_CONTEXT)) {
      return;
    }
    updateStatus(task, TASK_STATUSES.COMPLETED, SCANOPS_EVENT_TYPES.TASK_COMPLETED, {
      completed_at: new Date().toISOString(),
      status: "completed",
    });
  };

  const blockTask = (task) => {
    const decisionForTask = createDecisionRecommendation({ workflow: "task_priority", item: task, context: { task } });
    const decisionEvent = recordDecisionEvent(decisionForTask, "rejected", { source_module: "Tasks", status: "blocked", task_id: task.id, rejection_reason: "Operator marked task blocked" });
    updateStatus(task, TASK_STATUSES.BLOCKED, SCANOPS_EVENT_TYPES.TASK_BLOCKED, {
      blocked_at: new Date().toISOString(),
      block_reason: "Operator marked blocked from handheld",
      status: "blocked",
      ...buildDecisionLinkedPayload(decisionForTask, decisionEvent),
    });
  };

  const cancelTask = (task) => {
    if (!canCancelTask(task, SCANOPS_USER_CONTEXT)) return;
    updateStatus(task, TASK_STATUSES.CANCELLED, SCANOPS_EVENT_TYPES.TASK_CANCELLED, {
      cancelled_at: new Date().toISOString(),
      cancel_reason: "Manager/Admin cancelled from handheld",
      status: "cancelled",
    });
  };

  const openLinkedWorkflow = (task) => {
    const decisionForTask = createDecisionRecommendation({ workflow: "task_priority", item: task, context: { task } });
    const decisionEvent = recordDecisionEvent(decisionForTask, "accepted", { source_module: "Tasks", status: "linked_workflow_opened", task_id: task.id });
    writeTaskEvent(SCANOPS_EVENT_TYPES.TASK_LINKED_ACTION_OPENED, task, task.status, {
      status: "linked_workflow_opened",
      linked_workflow: getTaskLinkedWorkflow(task),
      ...buildDecisionLinkedPayload(decisionForTask, decisionEvent),
    });
    navigate(getTaskLinkedWorkflow(task));
  };

  const rejectTaskRecommendation = (task) => {
    const decisionForTask = createDecisionRecommendation({ workflow: "task_priority", item: task, context: { task } });
    const event = recordDecisionEvent(decisionForTask, "rejected", { source_module: "Tasks", status: "rejected", task_id: task.id, rejection_reason: "Operator rejected task priority recommendation" });
    setLastEvent(event);
  };

  const viewTaskReason = (task) => {
    const decisionForTask = createDecisionRecommendation({ workflow: "task_priority", item: task, context: { task } });
    recordDecisionEvent(decisionForTask, "reason_viewed", { source_module: "Tasks", status: "reason_viewed", task_id: task.id });
  };

  const changeFilter = (filterId) => {
    setActiveFilter(filterId);
    createScanOpsEvent(SCANOPS_EVENT_TYPES.TASK_FILTER_CHANGED, {
      source_module: "Tasks",
      filter_id: filterId,
      status: "filter_changed",
    });
  };

  const resetForTesting = () => {
    const reset = resetTaskQueue();
    setTasks(reset);
    setSelectedTaskId(null);
    setLastEvent(null);
  };

  if (selectedTask) {
    return (
      <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
        <PageHeader title="Task Detail" subtitle={selectedTask.itemName} />
        <main className="flex-1 px-4 py-5 pb-8 space-y-4 overflow-y-auto overflow-x-hidden">
          <TaskDetailHeader task={selectedTask} />
          <TaskLinkedItem task={selectedTask} />
          <DecisionRecommendationCard decision={taskDecision} onReject={() => rejectTaskRecommendation(selectedTask)} onMoreInfo={() => viewTaskReason(selectedTask)} />
          <SupervisorNotice task={selectedTask} />
          <section className="bg-card rounded-2xl border border-border p-4 space-y-3 min-w-0">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Actions</p>
            <button onClick={() => startTask(selectedTask)} disabled={!canStartTask(selectedTask, SCANOPS_USER_CONTEXT)} className={BUTTON_PRIMARY}>
              <Play className="w-4 h-4" />Start Task
            </button>
            <button onClick={() => openLinkedWorkflow(selectedTask)} className={BUTTON_SECONDARY}>
              <ExternalLink className="w-4 h-4" />{selectedTask.linkedWorkflowLabel || "Open Linked Workflow"}
            </button>
            <button onClick={() => blockTask(selectedTask)} className={BUTTON_SECONDARY}>
              <Ban className="w-4 h-4" />Mark Blocked
            </button>
            <button onClick={() => completeTask(selectedTask)} disabled={!canCompleteTask(selectedTask, SCANOPS_USER_CONTEXT)} className={BUTTON_PRIMARY}>
              <CheckCircle2 className="w-4 h-4" />Complete Task
            </button>
            {canCancelTask(selectedTask, SCANOPS_USER_CONTEXT) && (
              <button onClick={() => cancelTask(selectedTask)} className={BUTTON_DANGER}>
                <Flag className="w-4 h-4" />Cancel Task
              </button>
            )}
            <button onClick={() => setSelectedTaskId(null)} className={BUTTON_SECONDARY}>
              <ArrowRight className="w-4 h-4 rotate-180" />Back to Tasks
            </button>
          </section>
          {lastEvent && <EventProof event={lastEvent} />}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <PageHeader title="Tasks" subtitle="Stage F · Open scanner work" />
      <main className="flex-1 px-4 py-5 pb-8 space-y-4 overflow-y-auto overflow-x-hidden">
        <section className="bg-card rounded-2xl border border-border p-4 min-w-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ListChecks className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-foreground">Open operational work</h2>
              <p className="text-sm text-muted-foreground mt-1 break-words">Tasks live here only. Home stays as a simple scanner launcher.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <StatCard label="Open" value={openCount} />
            <StatCard label="Urgent" value={urgentCount} />
            <StatCard label="Review" value={supervisorCount} />
          </div>
        </section>

        <section className="bg-card rounded-2xl border border-border p-3 min-w-0">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 mb-3">Filters</p>
          <div className="grid grid-cols-2 gap-2">
            {TASK_FILTERS.map((filter) => (
              <button
                key={filter.id}
                onClick={() => changeFilter(filter.id)}
                className={`${CHIP_BUTTON} ${activeFilter === filter.id ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-secondary-foreground border-border"}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3 min-w-0">
          {filteredTasks.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-5 min-w-0">
              <p className="font-bold text-foreground">No tasks in this filter</p>
              <p className="text-sm text-muted-foreground mt-1">Change filter or scan another workflow to generate new work later.</p>
            </div>
          ) : (
            filteredTasks.map((task) => <TaskCard key={task.id} task={task} onOpen={() => setSelectedTaskId(task.id)} />)
          )}
        </section>

        <section className="bg-card rounded-2xl border border-border p-4 min-w-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-foreground">Testing helper</p>
              <p className="text-sm text-muted-foreground mt-1 break-words">Reset only restores open Stage F work fixtures. It does not create fake completed history.</p>
            </div>
          </div>
          <button onClick={resetForTesting} className={`${BUTTON_SECONDARY} mt-4`}>
            <RotateCcw className="w-4 h-4" />Reset Open Tasks
          </button>
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-secondary px-3 py-3 text-center min-w-0">
      <p className="text-lg font-black text-foreground leading-none">{value}</p>
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
          <h3 className="text-base font-black text-foreground break-words">{task.itemName}</h3>
          <p className="text-sm text-muted-foreground mt-1 break-words">{task.reason}</p>
        </div>
        {task.requiresSupervisor ? <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" /> : <ClipboardCheck className="w-5 h-5 text-primary shrink-0" />}
      </div>
      <div className="rounded-2xl bg-secondary px-4 py-3 min-w-0">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Location</p>
        <p className="text-sm font-bold text-foreground mt-1 break-words">{task.location}</p>
      </div>
      <button onClick={onOpen} className={BUTTON_PRIMARY}>Open Task <ArrowRight className="w-4 h-4" /></button>
    </article>
  );
}

function TaskDetailHeader({ task }) {
  return (
    <section className="bg-card rounded-2xl border border-border p-5 space-y-4 min-w-0">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <ClipboardCheck className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{getTaskTypeLabel(task.type)}</p>
          <h2 className="text-lg font-black text-foreground mt-1 break-words">{task.itemName}</h2>
          <p className="text-sm text-muted-foreground mt-1 break-words">{task.recommendation}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InfoPill label="Priority" value={task.priority} className={priorityClass(task.priority)} />
        <InfoPill label="Status" value={task.status} className={statusClass(task.status)} />
      </div>
      <InfoBlock label="Location" value={task.location} />
      <InfoBlock label="Reason" value={task.reason} />
    </section>
  );
}

function TaskLinkedItem({ task }) {
  return (
    <section className="bg-card rounded-2xl border border-border p-5 space-y-3 min-w-0">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Linked item</p>
      <div className="grid grid-cols-2 gap-2">
        <InfoBlock label="SKU" value={task.sku} />
        <InfoBlock label="Department" value={task.department} />
      </div>
      {task.currentPrice ? (
        <div className="grid grid-cols-2 gap-2">
          <InfoBlock label="Current price" value={`${task.currency || "₱"}${task.currentPrice}`} />
          <InfoBlock label="Suggested" value={task.suggestedMarkdown || "No markdown"} />
        </div>
      ) : null}
      <InfoBlock label="Linked workflow" value={task.linkedWorkflowLabel || task.linkedWorkflow} />
    </section>
  );
}

function SupervisorNotice({ task }) {
  if (!task.requiresSupervisor) return null;
  const elevated = ["Supervisor", "Manager", "Admin"].includes(SCANOPS_USER_CONTEXT.role);
  return (
    <section className="bg-amber-500/10 rounded-2xl border border-amber-500/20 p-4 min-w-0">
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-bold text-amber-800">Supervisor review required</p>
          <p className="text-sm text-amber-800/80 mt-1 break-words">{elevated ? "This role can complete review tasks." : "Staff can start or block this task, but cannot complete it until a supervisor reviews it."}</p>
        </div>
      </div>
    </section>
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
          <p className="text-sm text-muted-foreground mt-1 break-words">{event.event_type}</p>
          <p className="text-xs text-muted-foreground mt-2 break-all">Trace: {event.trace_id}</p>
        </div>
      </div>
    </section>
  );
}
