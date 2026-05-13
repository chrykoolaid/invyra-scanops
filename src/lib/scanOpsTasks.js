import { SCANOPS_USER_CONTEXT } from "./scanOpsInventoryFixtures";
import { getScanOpsSession } from "./scanOpsSession";

const STORAGE_KEY = "invyra_scanops_tasks_v3_stagex";
const LEGACY_STORAGE_KEYS = ["invyra_scanops_tasks_v2", "invyra_scanops_tasks_v1"];
const STATUS_EVENT_STORAGE_KEY = "invyra_scanops_task_status_events_v1";
const ASSIGNMENT_STORAGE_KEY = "invyra_scanops_task_assignments_v1";
const SOURCE_LINK_STORAGE_KEY = "invyra_scanops_task_source_links_v1";
const ESCALATION_STORAGE_KEY = "invyra_scanops_task_escalations_v1";
const COMPLETION_STORAGE_KEY = "invyra_scanops_task_completion_evidence_v1";

export const TASK_TYPES = {
  STOCK_COUNT: "stock_count",
  RECEIVING: "receiving",
  TRANSFER: "transfer",
  WASTE: "waste",
  MARKDOWN: "markdown",
  SHELF_TICKET: "shelf_ticket",
  PRODUCT_LOOKUP: "product_lookup",
  PRODUCT_IDENTITY_REVIEW: "product_identity_review",
  UNKNOWN_ITEM: "unknown_item",
  SYNC_QUEUE: "sync_queue",
  MANUAL: "manual",
  GENERAL_CHECK: "general_check",
  // Legacy Stage F/R task values kept for decision-engine compatibility.
  REPLENISHMENT_TASK: "REPLENISHMENT_TASK",
  GAP_SCAN_TASK: "GAP_SCAN_TASK",
  MARKDOWN_TASK: "MARKDOWN_TASK",
  WASTE_REVIEW_TASK: "WASTE_REVIEW_TASK",
  EXPIRY_CHECK_TASK: "EXPIRY_CHECK_TASK",
  FRESHNESS_REVIEW_TASK: "FRESHNESS_REVIEW_TASK",
  STOCK_COUNT_RECHECK_TASK: "STOCK_COUNT_RECHECK_TASK",
  RECEIVING_FOLLOWUP_TASK: "RECEIVING_FOLLOWUP_TASK",
};

export const TASK_STATUSES = {
  OPEN: "open",
  NOT_STARTED: "open",
  IN_PROGRESS: "in_progress",
  BLOCKED: "blocked",
  DONE: "done",
  COMPLETED: "done",
  ESCALATED: "escalated",
  CANCELLED: "cancelled",
  SYNC_PENDING: "sync_pending",
  SYNC_FAILED: "sync_failed",
  NEEDS_SUPERVISOR: "escalated",
};

export const TASK_PRIORITIES = {
  LOW: "low",
  MEDIUM: "medium",
  NORMAL: "medium",
  HIGH: "high",
  CRITICAL: "critical",
  URGENT: "critical",
};

export const TASK_DUE_STATES = {
  NONE: "none",
  LATER: "later",
  TODAY: "today",
  NOW: "now",
  OVERDUE: "overdue",
};

export const TASK_TABS = [
  { id: "mine", label: "My Tasks" },
  { id: "team", label: "Team Tasks" },
  { id: "escalated", label: "Escalated" },
  { id: "done", label: "Done" },
];

export const TASK_FILTERS = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In Progress" },
  { id: "blocked", label: "Blocked" },
  { id: "done", label: "Done" },
];

export const TASK_DEPARTMENTS = [
  "Grocery",
  "Dairy",
  "Produce",
  "Meat",
  "Bakery",
  "Front End",
  "Stockroom",
  "Manager Review",
];

const PRIORITY_LABELS = {
  [TASK_PRIORITIES.LOW]: "Low",
  [TASK_PRIORITIES.MEDIUM]: "Medium",
  [TASK_PRIORITIES.HIGH]: "High",
  [TASK_PRIORITIES.CRITICAL]: "Critical",
};

const STATUS_LABELS = {
  [TASK_STATUSES.OPEN]: "Open",
  [TASK_STATUSES.IN_PROGRESS]: "In Progress",
  [TASK_STATUSES.BLOCKED]: "Blocked",
  [TASK_STATUSES.DONE]: "Done",
  [TASK_STATUSES.ESCALATED]: "Escalated",
  [TASK_STATUSES.CANCELLED]: "Cancelled",
  [TASK_STATUSES.SYNC_PENDING]: "Pending sync",
  [TASK_STATUSES.SYNC_FAILED]: "Sync failed",
};

const TYPE_LABELS = {
  [TASK_TYPES.STOCK_COUNT]: "Stock Count",
  [TASK_TYPES.RECEIVING]: "Receiving",
  [TASK_TYPES.TRANSFER]: "Transfer",
  [TASK_TYPES.WASTE]: "Waste",
  [TASK_TYPES.MARKDOWN]: "Markdown",
  [TASK_TYPES.SHELF_TICKET]: "Shelf Tickets",
  [TASK_TYPES.PRODUCT_LOOKUP]: "Product Lookup",
  [TASK_TYPES.PRODUCT_IDENTITY_REVIEW]: "Product Identity Review",
  [TASK_TYPES.UNKNOWN_ITEM]: "Unknown Item Evidence",
  [TASK_TYPES.SYNC_QUEUE]: "Sync Queue",
  [TASK_TYPES.MANUAL]: "Manual Task",
  [TASK_TYPES.GENERAL_CHECK]: "General Check",
  [TASK_TYPES.REPLENISHMENT_TASK]: "Replenishment Task",
  [TASK_TYPES.GAP_SCAN_TASK]: "Gap Scan Task",
  [TASK_TYPES.MARKDOWN_TASK]: "Markdown Task",
  [TASK_TYPES.WASTE_REVIEW_TASK]: "Waste Review Task",
  [TASK_TYPES.EXPIRY_CHECK_TASK]: "Expiry Check Task",
  [TASK_TYPES.FRESHNESS_REVIEW_TASK]: "Freshness Review Task",
  [TASK_TYPES.STOCK_COUNT_RECHECK_TASK]: "Stock Count Recount",
  [TASK_TYPES.RECEIVING_FOLLOWUP_TASK]: "Receiving Follow-up",
};

const LEGACY_TYPE_MAP = {
  [TASK_TYPES.REPLENISHMENT_TASK]: TASK_TYPES.GENERAL_CHECK,
  [TASK_TYPES.GAP_SCAN_TASK]: TASK_TYPES.GENERAL_CHECK,
  [TASK_TYPES.MARKDOWN_TASK]: TASK_TYPES.MARKDOWN,
  [TASK_TYPES.WASTE_REVIEW_TASK]: TASK_TYPES.WASTE,
  [TASK_TYPES.EXPIRY_CHECK_TASK]: TASK_TYPES.GENERAL_CHECK,
  [TASK_TYPES.FRESHNESS_REVIEW_TASK]: TASK_TYPES.GENERAL_CHECK,
  [TASK_TYPES.STOCK_COUNT_RECHECK_TASK]: TASK_TYPES.STOCK_COUNT,
  [TASK_TYPES.RECEIVING_FOLLOWUP_TASK]: TASK_TYPES.RECEIVING,
};

const STATUS_MAP = {
  open: TASK_STATUSES.OPEN,
  not_started: TASK_STATUSES.OPEN,
  "not started": TASK_STATUSES.OPEN,
  Open: TASK_STATUSES.OPEN,
  "In Progress": TASK_STATUSES.IN_PROGRESS,
  in_progress: TASK_STATUSES.IN_PROGRESS,
  blocked: TASK_STATUSES.BLOCKED,
  Blocked: TASK_STATUSES.BLOCKED,
  completed: TASK_STATUSES.DONE,
  Completed: TASK_STATUSES.DONE,
  done: TASK_STATUSES.DONE,
  Done: TASK_STATUSES.DONE,
  escalated: TASK_STATUSES.ESCALATED,
  Escalated: TASK_STATUSES.ESCALATED,
  "Needs Supervisor": TASK_STATUSES.ESCALATED,
  cancelled: TASK_STATUSES.CANCELLED,
  Cancelled: TASK_STATUSES.CANCELLED,
  sync_pending: TASK_STATUSES.SYNC_PENDING,
  sync_failed: TASK_STATUSES.SYNC_FAILED,
};

const PRIORITY_MAP = {
  low: TASK_PRIORITIES.LOW,
  Low: TASK_PRIORITIES.LOW,
  normal: TASK_PRIORITIES.MEDIUM,
  Normal: TASK_PRIORITIES.MEDIUM,
  medium: TASK_PRIORITIES.MEDIUM,
  Medium: TASK_PRIORITIES.MEDIUM,
  high: TASK_PRIORITIES.HIGH,
  High: TASK_PRIORITIES.HIGH,
  urgent: TASK_PRIORITIES.CRITICAL,
  Urgent: TASK_PRIORITIES.CRITICAL,
  critical: TASK_PRIORITIES.CRITICAL,
  Critical: TASK_PRIORITIES.CRITICAL,
};

export const INITIAL_SCANOPS_TASKS = [];

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix = "task") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeTaskRef() {
  const date = new Date();
  const ymd = date.toISOString().slice(2, 10).replaceAll("-", "");
  return `TSK-X-${ymd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function safeReadRaw(key) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn(`Unable to read ${key}`, error);
    return [];
  }
}

function safeWriteRaw(key, rows) {
  if (typeof window === "undefined") return rows || [];
  try {
    window.localStorage.setItem(key, JSON.stringify(rows || []));
  } catch (error) {
    console.warn(`Unable to persist ${key}`, error);
  }
  return rows || [];
}

function safeReadTasks() {
  const current = safeReadRaw(STORAGE_KEY);
  if (current.length) return current.map(normalizeTask);
  for (const key of LEGACY_STORAGE_KEYS) {
    const legacy = safeReadRaw(key);
    if (legacy.length) {
      const migrated = legacy.map(normalizeTask);
      safeWriteTasks(migrated);
      return migrated;
    }
  }
  return [];
}

function safeWriteTasks(tasks) {
  const normalized = (tasks || []).map(normalizeTask).slice(0, 160);
  safeWriteRaw(STORAGE_KEY, normalized);
  return normalized;
}

function normalizeType(type) {
  const value = LEGACY_TYPE_MAP[type] || type || TASK_TYPES.MANUAL;
  return Object.values(TASK_TYPES).includes(value) ? value : TASK_TYPES.MANUAL;
}

function normalizeStatus(status) {
  if (status && STATUS_MAP[status]) return STATUS_MAP[status];
  const value = String(status || "").toLowerCase();
  return STATUS_MAP[value] || TASK_STATUSES.OPEN;
}

function normalizePriority(priority) {
  if (priority && PRIORITY_MAP[priority]) return PRIORITY_MAP[priority];
  const value = String(priority || "").toLowerCase();
  return PRIORITY_MAP[value] || TASK_PRIORITIES.MEDIUM;
}

export function getTaskActorContext(userContext = null) {
  const session = userContext || getScanOpsSession?.() || {};
  return {
    actor_id: session.actorUserId || session.user_id || SCANOPS_USER_CONTEXT.user_id,
    actor_name: session.actorName || session.user_name || SCANOPS_USER_CONTEXT.user_name,
    actor_role: session.actorRole || session.role || SCANOPS_USER_CONTEXT.role,
    department: session.departmentName || session.department || SCANOPS_USER_CONTEXT.department,
    store_id: session.storeId || session.location_id || SCANOPS_USER_CONTEXT.location_id,
  };
}

export function deriveDueState(dueAt, explicitState = null, status = TASK_STATUSES.OPEN) {
  if ([TASK_STATUSES.DONE, TASK_STATUSES.CANCELLED].includes(normalizeStatus(status))) return explicitState || TASK_DUE_STATES.NONE;
  if (explicitState && Object.values(TASK_DUE_STATES).includes(explicitState)) {
    if ([TASK_DUE_STATES.OVERDUE, TASK_DUE_STATES.NOW, TASK_DUE_STATES.TODAY, TASK_DUE_STATES.LATER, TASK_DUE_STATES.NONE].includes(explicitState)) return explicitState;
  }
  if (!dueAt) return TASK_DUE_STATES.NONE;
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return TASK_DUE_STATES.NONE;
  const now = new Date();
  const diff = due.getTime() - now.getTime();
  if (diff < 0) return TASK_DUE_STATES.OVERDUE;
  if (diff <= 60 * 60 * 1000) return TASK_DUE_STATES.NOW;
  if (due.toDateString() === now.toDateString()) return TASK_DUE_STATES.TODAY;
  return TASK_DUE_STATES.LATER;
}

export function getTaskDueStateLabel(state) {
  const labels = {
    [TASK_DUE_STATES.NONE]: "No due date",
    [TASK_DUE_STATES.LATER]: "Due later",
    [TASK_DUE_STATES.TODAY]: "Due today",
    [TASK_DUE_STATES.NOW]: "Due now",
    [TASK_DUE_STATES.OVERDUE]: "Overdue",
  };
  return labels[state] || "No due date";
}

function sourceTypeForTaskType(taskType) {
  const type = normalizeType(taskType);
  const map = {
    [TASK_TYPES.STOCK_COUNT]: "stock_count_recount",
    [TASK_TYPES.RECEIVING]: "receiving_exception",
    [TASK_TYPES.TRANSFER]: "transfer_exception",
    [TASK_TYPES.WASTE]: "waste_review",
    [TASK_TYPES.MARKDOWN]: "markdown_review",
    [TASK_TYPES.SHELF_TICKET]: "shelf_ticket_request",
    [TASK_TYPES.PRODUCT_IDENTITY_REVIEW]: "product_identity_review",
    [TASK_TYPES.UNKNOWN_ITEM]: "unknown_item_evidence",
    [TASK_TYPES.SYNC_QUEUE]: "sync_queue_issue",
  };
  return map[type] || "manual_task";
}

function moduleForTaskType(taskType) {
  const type = normalizeType(taskType);
  const map = {
    [TASK_TYPES.STOCK_COUNT]: "Stock Count",
    [TASK_TYPES.RECEIVING]: "Receiving",
    [TASK_TYPES.TRANSFER]: "Transfers",
    [TASK_TYPES.WASTE]: "Waste",
    [TASK_TYPES.MARKDOWN]: "Markdowns",
    [TASK_TYPES.SHELF_TICKET]: "Shelf Tickets",
    [TASK_TYPES.PRODUCT_IDENTITY_REVIEW]: "Product Identity Review",
    [TASK_TYPES.UNKNOWN_ITEM]: "Product Identity Review",
    [TASK_TYPES.SYNC_QUEUE]: "Sync Queue",
    [TASK_TYPES.MANUAL]: "Manual",
  };
  return map[type] || "Tasks";
}

export function workflowPathForTaskType(taskType) {
  const type = normalizeType(taskType);
  const paths = {
    [TASK_TYPES.STOCK_COUNT]: "/stock-count",
    [TASK_TYPES.RECEIVING]: "/receiving",
    [TASK_TYPES.TRANSFER]: "/transfers",
    [TASK_TYPES.WASTE]: "/waste",
    [TASK_TYPES.MARKDOWN]: "/markdowns",
    [TASK_TYPES.SHELF_TICKET]: "/shelf-tickets",
    [TASK_TYPES.PRODUCT_LOOKUP]: "/scan",
    [TASK_TYPES.PRODUCT_IDENTITY_REVIEW]: "/product-identity-review",
    [TASK_TYPES.UNKNOWN_ITEM]: "/product-identity-review",
    [TASK_TYPES.SYNC_QUEUE]: "/sync-queue",
    [TASK_TYPES.MANUAL]: "/tasks",
    [TASK_TYPES.GENERAL_CHECK]: "/scan",
  };
  return paths[type] || "/scan";
}

export function normalizeTask(task = {}) {
  const taskType = normalizeType(task.taskType || task.type || task.source_module);
  const status = normalizeStatus(task.status);
  const priority = normalizePriority(task.priority);
  const taskId = task.taskId || task.id || makeId("task");
  const actor = getTaskActorContext();
  const sourceModule = task.source_module || task.sourceModule || task.source || moduleForTaskType(taskType);
  const sourceType = task.source_type || task.sourceType || sourceTypeForTaskType(taskType);
  const dueAt = task.due_at || task.dueAt || null;
  const assignedDepartment = task.assigned_department || task.assignedDepartment || task.areaName || task.department || actor.department || "Grocery";
  const assignedRole = task.assigned_role || task.assignedRole || (assignedDepartment === "Manager Review" ? "Manager" : "Staff");
  const sourceItemSnapshot = task.source_item_snapshot || task.sourceItemSnapshot || task.item_snapshot || task.itemSnapshot || null;
  const title = task.title || task.itemName || "Scanner task";
  return {
    ...task,
    id: taskId,
    taskId,
    task_ref: task.task_ref || task.taskRef || taskId,
    taskRef: task.task_ref || task.taskRef || taskId,
    title,
    itemName: title,
    description: task.description || task.recommendation || task.reason || "Complete assigned scanner work.",
    action_needed: task.action_needed || task.actionNeeded || task.description || "Complete the task and record evidence.",
    evidence_required: task.evidence_required || task.evidenceRequired || "Completion note",
    taskType,
    type: taskType,
    task_kind: task.task_kind || task.taskKind || sourceType,
    status,
    priority,
    due_at: dueAt,
    dueAt,
    due_state: deriveDueState(dueAt, task.due_state || task.dueState, status),
    dueState: deriveDueState(dueAt, task.due_state || task.dueState, status),
    source_type: sourceType,
    sourceType,
    source_id: task.source_id || task.sourceId || task.linkedDecisionId || taskId,
    sourceId: task.source_id || task.sourceId || task.linkedDecisionId || taskId,
    source_ref: task.source_ref || task.sourceRef || task.po_ref || task.transfer_ref || task.requestId || taskId,
    sourceRef: task.source_ref || task.sourceRef || task.po_ref || task.transfer_ref || task.requestId || taskId,
    source_module: sourceModule,
    sourceModule,
    source_status_snapshot: task.source_status_snapshot || task.sourceStatusSnapshot || task.status_snapshot || null,
    source_item_snapshot: sourceItemSnapshot,
    sourceItemSnapshot,
    assigned_user_id: task.assigned_user_id || task.assignedToUserId || task.assignedTo || null,
    assignedToUserId: task.assigned_user_id || task.assignedToUserId || task.assignedTo || null,
    assigned_user_name: task.assigned_user_name || task.assignedToName || (task.assignedTo === "team" ? "Team" : null),
    assignedToName: task.assigned_user_name || task.assignedToName || (task.assignedTo === "team" ? "Team" : null),
    assigned_department: assignedDepartment,
    assignedDepartment,
    assigned_role: assignedRole,
    assignedRole,
    areaName: task.areaName || assignedDepartment,
    locationName: task.locationName || task.location || "Store floor",
    linkedWorkflow: task.linkedWorkflow || task.linked_workflow || workflowPathForTaskType(taskType),
    linkedWorkflowLabel: task.linkedWorkflowLabel || task.linked_workflow_label || getTaskTypeLabel(taskType),
    linkedContext: task.linkedContext || task.linked_context || {},
    created_by: task.created_by || task.createdBy || actor.actor_name,
    createdBy: task.created_by || task.createdBy || actor.actor_name,
    created_by_role: task.created_by_role || task.createdRole || actor.actor_role,
    createdRole: task.created_by_role || task.createdRole || actor.actor_role,
    created_at: task.created_at || task.createdAt || nowIso(),
    createdAt: task.created_at || task.createdAt || nowIso(),
    started_by: task.started_by || task.startedBy || null,
    startedAt: task.started_at || task.startedAt || null,
    started_at: task.started_at || task.startedAt || null,
    completed_by: task.completed_by || task.completedBy || null,
    completedAt: task.completed_at || task.completedAt || null,
    completed_at: task.completed_at || task.completedAt || null,
    blocked_reason: task.blocked_reason || task.blockedReason || null,
    blockedReason: task.blocked_reason || task.blockedReason || null,
    cancelled_reason: task.cancelled_reason || task.cancelledReason || null,
    escalation_reason: task.escalation_reason || task.escalationReason || null,
    completion_note: task.completion_note || task.completionNote || null,
    last_updated_at: task.last_updated_at || task.updatedAt || task.updated_at || nowIso(),
    updatedAt: task.last_updated_at || task.updatedAt || task.updated_at || nowIso(),
    applies_stock_directly: false,
    applies_price_directly: false,
    prints_directly: false,
    creates_product_directly: false,
  };
}

export function getInitialTaskQueue() {
  return safeReadTasks();
}

export function saveTaskQueue(tasks) {
  return safeWriteTasks(tasks);
}

export function resetTaskQueue() {
  return safeWriteTasks([]);
}

function appendStored(key, row, limit = 220) {
  const rows = safeReadRaw(key);
  safeWriteRaw(key, [row, ...rows].slice(0, limit));
  return row;
}

function recordStatusEvent(task, fromStatus, toStatus, actor, { reason = null, note = null } = {}) {
  return appendStored(STATUS_EVENT_STORAGE_KEY, {
    id: makeId("task_status_event"),
    task_id: task.taskId,
    task_ref: task.task_ref,
    from_status: fromStatus || null,
    to_status: toStatus,
    actor_id: actor.actor_id,
    actor_name: actor.actor_name,
    actor_role: actor.actor_role,
    reason,
    note,
    created_at: nowIso(),
  });
}

function recordAssignment(task, actor, reason = "Assignment updated") {
  return appendStored(ASSIGNMENT_STORAGE_KEY, {
    id: makeId("task_assignment"),
    task_id: task.taskId,
    assigned_user_id: task.assigned_user_id || null,
    assigned_user_name: task.assigned_user_name || null,
    assigned_department: task.assigned_department || null,
    assigned_role: task.assigned_role || null,
    assigned_by: actor.actor_name,
    assigned_by_role: actor.actor_role,
    assigned_at: nowIso(),
    assignment_reason: reason,
  });
}

function recordSourceLink(task) {
  return appendStored(SOURCE_LINK_STORAGE_KEY, {
    id: makeId("task_source_link"),
    task_id: task.taskId,
    source_type: task.source_type,
    source_id: task.source_id,
    source_ref: task.source_ref,
    source_module: task.source_module,
    source_status_snapshot: task.source_status_snapshot || null,
    source_item_snapshot: task.source_item_snapshot || null,
    created_at: nowIso(),
  });
}

function recordEscalation(task, actor, reason) {
  return appendStored(ESCALATION_STORAGE_KEY, {
    id: makeId("task_escalation"),
    task_id: task.taskId,
    escalation_level: task.assigned_role === "Admin" ? "Admin" : "Manager/Supervisor",
    escalation_reason: reason || task.escalation_reason || "Escalated from handheld",
    escalated_by: actor.actor_name,
    escalated_by_role: actor.actor_role,
    escalated_at: nowIso(),
    reviewed_by: null,
    reviewed_at: null,
    review_decision: null,
    review_note: null,
  });
}

function recordCompletion(task, actor, note) {
  return appendStored(COMPLETION_STORAGE_KEY, {
    id: makeId("task_completion"),
    task_id: task.taskId,
    completion_note: note || task.completion_note || "Task completed from handheld.",
    evidence_snapshot: {
      source_type: task.source_type,
      source_id: task.source_id,
      source_ref: task.source_ref,
      source_module: task.source_module,
      source_item_snapshot: task.source_item_snapshot,
      applies_stock_directly: false,
      applies_price_directly: false,
      prints_directly: false,
      creates_product_directly: false,
    },
    completed_by: actor.actor_name,
    completed_by_role: actor.actor_role,
    completed_at: nowIso(),
  });
}

export function updateTaskStatus(tasks, taskId, status, extra = {}, userContext = null) {
  const actor = getTaskActorContext(userContext);
  const normalizedStatus = normalizeStatus(status);
  let changedTask = null;
  const updated = (tasks || []).map((task) => {
    const current = normalizeTask(task);
    if (current.taskId !== taskId && current.id !== taskId) return current;
    const timestamp = nowIso();
    const patch = { last_updated_at: timestamp, updatedAt: timestamp, ...extra };
    if (normalizedStatus === TASK_STATUSES.IN_PROGRESS && !current.started_at) {
      patch.started_by = actor.actor_name;
      patch.started_at = timestamp;
    }
    if (normalizedStatus === TASK_STATUSES.BLOCKED) {
      patch.blocked_reason = extra.blocked_reason || extra.blockedReason || "Blocked from handheld";
    }
    if (normalizedStatus === TASK_STATUSES.ESCALATED) {
      patch.escalation_reason = extra.escalation_reason || extra.escalationReason || "Escalated from handheld";
    }
    if (normalizedStatus === TASK_STATUSES.DONE) {
      patch.completed_by = actor.actor_name;
      patch.completed_at = timestamp;
      patch.completion_note = extra.completion_note || extra.completionNote || "Task completed from handheld.";
    }
    if (normalizedStatus === TASK_STATUSES.CANCELLED) {
      patch.cancelled_reason = extra.cancelled_reason || extra.cancelledReason || "Cancelled by manager/admin";
    }
    changedTask = normalizeTask({ ...current, ...patch, status: normalizedStatus });
    recordStatusEvent(changedTask, current.status, normalizedStatus, actor, {
      reason: patch.blocked_reason || patch.escalation_reason || patch.cancelled_reason || null,
      note: patch.completion_note || extra.note || null,
    });
    if (normalizedStatus === TASK_STATUSES.ESCALATED) recordEscalation(changedTask, actor, patch.escalation_reason);
    if (normalizedStatus === TASK_STATUSES.DONE) recordCompletion(changedTask, actor, patch.completion_note);
    return changedTask;
  });
  safeWriteTasks(updated);
  return updated;
}

export function reassignTask(tasks, taskId, assignment = {}, reason = "Manual reassignment", userContext = null) {
  const actor = getTaskActorContext(userContext);
  let changed = null;
  const updated = (tasks || []).map((task) => {
    const current = normalizeTask(task);
    if (current.taskId !== taskId && current.id !== taskId) return current;
    changed = normalizeTask({
      ...current,
      assigned_user_id: assignment.assigned_user_id ?? current.assigned_user_id,
      assigned_user_name: assignment.assigned_user_name ?? current.assigned_user_name,
      assigned_department: assignment.assigned_department ?? current.assigned_department,
      assigned_role: assignment.assigned_role ?? current.assigned_role,
      last_updated_at: nowIso(),
    });
    return changed;
  });
  if (changed) recordAssignment(changed, actor, reason);
  return safeWriteTasks(updated);
}

export function upsertDerivedTaskFromSource(source = {}) {
  const actor = getTaskActorContext();
  const taskType = normalizeType(source.taskType || source.type || TASK_TYPES.MANUAL);
  const sourceType = source.source_type || source.sourceType || sourceTypeForTaskType(taskType);
  const sourceId = source.source_id || source.sourceId || source.id || makeId("source");
  const taskKind = source.task_kind || source.taskKind || sourceType;
  const currentTasks = safeReadTasks();
  const activeMatch = currentTasks.find((task) => {
    const row = normalizeTask(task);
    return row.source_type === sourceType
      && row.source_id === sourceId
      && row.task_kind === taskKind
      && ![TASK_STATUSES.DONE, TASK_STATUSES.CANCELLED].includes(row.status);
  });
  const patch = {
    title: source.title,
    description: source.description,
    action_needed: source.action_needed,
    evidence_required: source.evidence_required,
    taskType,
    task_kind: taskKind,
    priority: source.priority || TASK_PRIORITIES.MEDIUM,
    dueAt: source.due_at || source.dueAt || null,
    due_state: source.due_state || source.dueState || null,
    source_type: sourceType,
    source_id: sourceId,
    source_ref: source.source_ref || source.sourceRef || source.sourceRefLabel || sourceId,
    source_module: source.source_module || source.sourceModule || moduleForTaskType(taskType),
    source_status_snapshot: source.source_status_snapshot || source.sourceStatusSnapshot || null,
    source_item_snapshot: source.source_item_snapshot || source.sourceItemSnapshot || null,
    assigned_department: source.assigned_department || source.assignedDepartment || actor.department || "Grocery",
    assigned_role: source.assigned_role || source.assignedRole || "Staff",
    assigned_user_id: source.assigned_user_id || source.assignedToUserId || "team",
    assigned_user_name: source.assigned_user_name || source.assignedToName || `${source.assigned_department || actor.department || "Store"} Team`,
    linkedWorkflow: source.linkedWorkflow || workflowPathForTaskType(taskType),
    linkedWorkflowLabel: source.linkedWorkflowLabel || getTaskTypeLabel(taskType),
    linkedContext: source.linkedContext || {},
    created_by: source.created_by || actor.actor_name,
    created_by_role: source.created_by_role || actor.actor_role,
    last_updated_at: nowIso(),
  };
  if (activeMatch) {
    const tasks = currentTasks.map((task) => {
      const row = normalizeTask(task);
      if (row.taskId !== activeMatch.taskId) return row;
      return normalizeTask({ ...row, ...patch, status: row.status || TASK_STATUSES.OPEN });
    });
    const saved = safeWriteTasks(tasks);
    const task = saved.find((row) => row.taskId === activeMatch.taskId);
    if (task) recordSourceLink(task);
    return { task, created: false, tasks: saved };
  }
  const task = normalizeTask({
    ...patch,
    taskId: source.taskId || makeId("task_source"),
    task_ref: source.task_ref || makeTaskRef(),
    status: source.status || TASK_STATUSES.OPEN,
    created_at: source.created_at || nowIso(),
  });
  recordSourceLink(task);
  recordStatusEvent(task, null, task.status, actor, { reason: "Derived from source evidence" });
  const saved = safeWriteTasks([task, ...currentTasks]);
  return { task, created: true, tasks: saved };
}

export function createTaskFromDecision(decision, item, extra = {}) {
  if (!decision?.taskToCreate) return null;
  const sourceType = normalizeType(decision.taskToCreate);
  const result = upsertDerivedTaskFromSource({
    taskType: sourceType,
    task_kind: extra.task_kind || "decision_task",
    priority: decision.taskPriority || TASK_PRIORITIES.MEDIUM,
    status: decision.supervisorReviewRequired ? TASK_STATUSES.BLOCKED : TASK_STATUSES.OPEN,
    title: item?.name || item?.itemName || decision.itemIdentity?.item_name || "Scanner item",
    description: decision.reasonText || decision.recommendedAction,
    source_type: extra.source_type || "decision_engine",
    source_id: extra.linkedDecisionEventId || decision.decisionId || makeId("decision"),
    source_ref: decision.decisionId || "Decision",
    source_module: extra.sourceModule || "Decision Engine",
    source_item_snapshot: item || decision.itemIdentity || null,
    assigned_user_id: decision.supervisorReviewRequired ? "team" : getTaskActorContext().actor_id,
    assigned_user_name: decision.supervisorReviewRequired ? "Team" : getTaskActorContext().actor_name,
    assigned_department: item?.department || decision.itemIdentity?.department || "Grocery",
    linkedWorkflow: decision.linkedWorkflow || workflowPathForTaskType(sourceType),
    linkedWorkflowLabel: extra.linkedWorkflowLabel || getTaskTypeLabel(sourceType),
    linkedContext: extra.linkedContext || {},
    ...extra,
  });
  return result.task;
}

export function getTaskTypeLabel(type) {
  return TYPE_LABELS[type] || TYPE_LABELS[normalizeType(type)] || "Task";
}

export function getTaskStatusLabel(status) {
  return STATUS_LABELS[normalizeStatus(status)] || "Open";
}

export function getTaskPriority(taskOrPriority) {
  const priority = typeof taskOrPriority === "string" ? taskOrPriority : taskOrPriority?.priority;
  return PRIORITY_LABELS[normalizePriority(priority)] || "Medium";
}

export function getTaskLinkedWorkflow(task) {
  const normalized = normalizeTask(task);
  const params = new URLSearchParams({ taskId: normalized.taskId, sourceId: normalized.source_id, sourceType: normalized.source_type });
  Object.entries(normalized.linkedContext || {}).forEach(([key, value]) => {
    if (value != null && value !== "") params.set(key, value);
  });
  return {
    path: normalized.linkedWorkflow || workflowPathForTaskType(normalized.taskType),
    search: `?${params.toString()}`,
    label: normalized.linkedWorkflowLabel || getTaskTypeLabel(normalized.taskType),
  };
}

export function isTaskAssignedToUser(task, userContext = null) {
  const normalized = normalizeTask(task);
  const actor = getTaskActorContext(userContext);
  if (normalized.assigned_user_id && normalized.assigned_user_id === actor.actor_id) return true;
  if (normalized.assigned_user_id === "team" || !normalized.assigned_user_id) {
    return normalized.assigned_department === actor.department || normalized.assigned_role === actor.actor_role || normalized.assigned_role === "Staff";
  }
  return false;
}

export function canViewTeamTasks(userContext = null) {
  const actor = getTaskActorContext(userContext);
  return ["Supervisor", "Manager", "Admin"].includes(actor.actor_role);
}

export function canStartTask(task, userContext = null) {
  if (!task) return false;
  const normalized = normalizeTask(task);
  if ([TASK_STATUSES.DONE, TASK_STATUSES.CANCELLED, TASK_STATUSES.ESCALATED].includes(normalized.status)) return false;
  const actor = getTaskActorContext(userContext);
  if (["Supervisor", "Manager", "Admin"].includes(actor.actor_role)) return true;
  return isTaskAssignedToUser(normalized, userContext);
}

export function canCompleteTask(task, userContext = null) {
  if (!task) return false;
  const normalized = normalizeTask(task);
  if (![TASK_STATUSES.OPEN, TASK_STATUSES.IN_PROGRESS, TASK_STATUSES.BLOCKED].includes(normalized.status)) return false;
  const actor = getTaskActorContext(userContext);
  if (["Manager", "Admin"].includes(actor.actor_role)) return true;
  if (normalized.status === TASK_STATUSES.ESCALATED) return false;
  return isTaskAssignedToUser(normalized, userContext);
}

export function canEscalateTask(task, userContext = null) {
  const normalized = normalizeTask(task);
  return ![TASK_STATUSES.DONE, TASK_STATUSES.CANCELLED, TASK_STATUSES.ESCALATED].includes(normalized.status) && Boolean(getTaskActorContext(userContext).actor_role);
}

export function canReassignTask(_task, userContext = null) {
  const actor = getTaskActorContext(userContext);
  return ["Supervisor", "Manager", "Admin"].includes(actor.actor_role);
}

export function canCancelTask(_task, userContext = null) {
  const actor = getTaskActorContext(userContext);
  return ["Manager", "Admin"].includes(actor.actor_role);
}

function isDoneOrCancelled(task) {
  return [TASK_STATUSES.DONE, TASK_STATUSES.CANCELLED].includes(normalizeTask(task).status);
}

function sourceMatches(task, sourceFilter) {
  if (!sourceFilter || sourceFilter === "all") return true;
  return normalizeTask(task).source_module === sourceFilter || normalizeTask(task).source_type === sourceFilter;
}

function assignedMatches(task, assignedFilter, userContext) {
  const normalized = normalizeTask(task);
  const actor = getTaskActorContext(userContext);
  if (!assignedFilter || assignedFilter === "all") return true;
  if (assignedFilter === "mine") return isTaskAssignedToUser(normalized, userContext) || normalized.assigned_user_id === actor.actor_id;
  if (assignedFilter === "unassigned") return !normalized.assigned_user_id || normalized.assigned_user_id === "unassigned";
  if (assignedFilter === "department") return normalized.assigned_department === actor.department;
  return normalized.assigned_department === assignedFilter || normalized.assigned_role === assignedFilter;
}

export function filterTasks(tasks, filters = {}, userContext = null, legacyScope = null) {
  // Backwards compatible support for old Stage R signature: filterTasks(tasks, filterId, userContext, scope).
  if (typeof filters === "string") {
    const filterId = filters;
    const scope = legacyScope || "mine";
    const mapped = {
      tab: scope === "team" ? "team" : filterId === "completed" ? "done" : "mine",
      status: filterId === "in_progress" ? TASK_STATUSES.IN_PROGRESS : filterId === "completed" ? TASK_STATUSES.DONE : "all",
      due: filterId === "due_today" ? TASK_DUE_STATES.TODAY : "all",
      priority: filterId === "urgent" ? TASK_PRIORITIES.CRITICAL : "all",
      assigned: scope === "mine" ? "mine" : "all",
      source: "all",
    };
    return filterTasks(tasks, mapped, userContext);
  }

  const actor = getTaskActorContext(userContext);
  const { tab = "mine", assigned = tab === "mine" ? "mine" : "all", priority = "all", due = "all", source = "all", status = "all" } = filters || {};
  let taskList = (tasks || []).map(normalizeTask);

  if (tab === "mine") taskList = taskList.filter((task) => isTaskAssignedToUser(task, userContext) && !isDoneOrCancelled(task) && task.status !== TASK_STATUSES.ESCALATED);
  if (tab === "team") {
    taskList = taskList.filter((task) => !isDoneOrCancelled(task) && task.status !== TASK_STATUSES.ESCALATED);
    if (actor.actor_role === "Staff") taskList = taskList.filter((task) => isTaskAssignedToUser(task, userContext));
  }
  if (tab === "escalated") taskList = taskList.filter((task) => task.status === TASK_STATUSES.ESCALATED);
  if (tab === "done") taskList = taskList.filter((task) => task.status === TASK_STATUSES.DONE);

  taskList = taskList.filter((task) => assignedMatches(task, assigned, userContext));
  if (priority !== "all") taskList = taskList.filter((task) => task.priority === priority);
  if (due !== "all") taskList = taskList.filter((task) => task.due_state === due);
  if (status !== "all") taskList = taskList.filter((task) => task.status === normalizeStatus(status));
  if (source !== "all") taskList = taskList.filter((task) => sourceMatches(task, source));
  return taskList;
}

export function sortTasksByOperationalPriority(tasks) {
  const dueOrder = { [TASK_DUE_STATES.OVERDUE]: 0, [TASK_DUE_STATES.NOW]: 1, [TASK_DUE_STATES.TODAY]: 2, [TASK_DUE_STATES.LATER]: 3, [TASK_DUE_STATES.NONE]: 4 };
  const priorityOrder = { [TASK_PRIORITIES.CRITICAL]: 0, [TASK_PRIORITIES.HIGH]: 1, [TASK_PRIORITIES.MEDIUM]: 2, [TASK_PRIORITIES.LOW]: 3 };
  const statusOrder = { [TASK_STATUSES.ESCALATED]: 0, [TASK_STATUSES.BLOCKED]: 1, [TASK_STATUSES.IN_PROGRESS]: 2, [TASK_STATUSES.OPEN]: 3, [TASK_STATUSES.SYNC_FAILED]: 4, [TASK_STATUSES.SYNC_PENDING]: 5, [TASK_STATUSES.DONE]: 6, [TASK_STATUSES.CANCELLED]: 7 };
  return [...(tasks || [])].map(normalizeTask).sort((a, b) => {
    return (dueOrder[a.due_state] ?? 9) - (dueOrder[b.due_state] ?? 9)
      || (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9)
      || (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
      || String(a.dueAt || "").localeCompare(String(b.dueAt || ""));
  });
}

export function getTaskStats(tasks, userContext = null) {
  const rows = (tasks || []).map(normalizeTask);
  return {
    active: rows.filter((task) => !isDoneOrCancelled(task)).length,
    dueNow: rows.filter((task) => [TASK_DUE_STATES.OVERDUE, TASK_DUE_STATES.NOW].includes(task.due_state) && !isDoneOrCancelled(task)).length,
    escalated: rows.filter((task) => task.status === TASK_STATUSES.ESCALATED).length,
    mine: rows.filter((task) => isTaskAssignedToUser(task, userContext) && !isDoneOrCancelled(task)).length,
  };
}

export function getTaskSourceOptions(tasks) {
  const values = Array.from(new Set((tasks || []).map((task) => normalizeTask(task).source_module).filter(Boolean)));
  return [{ id: "all", label: "All Sources" }, ...values.map((value) => ({ id: value, label: value }))];
}

export function buildTaskEventPayload(task, status, extra = {}) {
  const normalized = normalizeTask(task);
  return {
    source_module: "Tasks",
    task_id: normalized.taskId,
    task_ref: normalized.task_ref,
    task_type: normalized.taskType,
    task_kind: normalized.task_kind,
    task_type_label: getTaskTypeLabel(normalized.taskType),
    task_priority: normalized.priority,
    task_due_state: normalized.due_state,
    task_status: normalizeStatus(status || normalized.status),
    task_status_label: getTaskStatusLabel(status || normalized.status),
    title: normalized.title,
    assigned_to_user_id: normalized.assigned_user_id,
    assigned_to_name: normalized.assigned_user_name,
    assigned_department: normalized.assigned_department,
    assigned_role: normalized.assigned_role,
    source_type: normalized.source_type,
    source_id: normalized.source_id,
    source_ref: normalized.source_ref,
    source_workflow_module: normalized.source_module,
    source_item_snapshot: normalized.source_item_snapshot,
    linked_workflow: normalized.linkedWorkflow,
    linked_context: normalized.linkedContext,
    applies_stock_directly: false,
    applies_price_directly: false,
    prints_directly: false,
    creates_product_directly: false,
    ...extra,
  };
}

export function getTaskStatusEvents() {
  return safeReadRaw(STATUS_EVENT_STORAGE_KEY);
}

export function getTaskAssignments() {
  return safeReadRaw(ASSIGNMENT_STORAGE_KEY);
}

export function getTaskSourceLinks() {
  return safeReadRaw(SOURCE_LINK_STORAGE_KEY);
}

export function getTaskEscalations() {
  return safeReadRaw(ESCALATION_STORAGE_KEY);
}

export function getTaskCompletionEvidence() {
  return safeReadRaw(COMPLETION_STORAGE_KEY);
}
