import { SCANOPS_USER_CONTEXT } from "./scanOpsInventoryFixtures";

const STORAGE_KEY = "invyra_scanops_tasks_v2";
const LEGACY_STORAGE_KEY = "invyra_scanops_tasks_v1";

export const TASK_TYPES = {
  STOCK_COUNT: "stock_count",
  RECEIVING: "receiving",
  TRANSFER: "transfer",
  WASTE: "waste",
  MARKDOWN: "markdown",
  SHELF_TICKET: "shelf_ticket",
  PRODUCT_LOOKUP: "product_lookup",
  GENERAL_CHECK: "general_check",
  // Legacy Stage F task values kept for decision-engine compatibility.
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
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  BLOCKED: "blocked",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  SYNC_PENDING: "sync_pending",
  SYNC_FAILED: "sync_failed",
  // Legacy aliases.
  OPEN: "Open",
  NEEDS_SUPERVISOR: "Needs Supervisor",
};

export const TASK_PRIORITIES = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  URGENT: "urgent",
};

export const TASK_FILTERS = [
  { id: "mine", label: "My Tasks" },
  { id: "due_today", label: "Due Today" },
  { id: "in_progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
];

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

const LEGACY_STATUS_MAP = {
  Open: TASK_STATUSES.NOT_STARTED,
  "In Progress": TASK_STATUSES.IN_PROGRESS,
  Blocked: TASK_STATUSES.BLOCKED,
  "Needs Supervisor": TASK_STATUSES.BLOCKED,
  Completed: TASK_STATUSES.COMPLETED,
  Cancelled: TASK_STATUSES.CANCELLED,
};

const LEGACY_PRIORITY_MAP = {
  Low: TASK_PRIORITIES.LOW,
  Normal: TASK_PRIORITIES.NORMAL,
  High: TASK_PRIORITIES.HIGH,
  Urgent: TASK_PRIORITIES.URGENT,
};

export const INITIAL_SCANOPS_TASKS = [
  {
    taskId: "task-stock-count-dairy-a4",
    title: "Count Dairy Aisle",
    description: "Count shelf A4-B2 and submit count evidence.",
    taskType: TASK_TYPES.STOCK_COUNT,
    status: TASK_STATUSES.NOT_STARTED,
    priority: TASK_PRIORITIES.NORMAL,
    assignedToUserId: "staff_001",
    assignedToName: "Sarah M.",
    assignedRole: "Staff",
    areaId: "dairy_chilled",
    areaName: "Dairy",
    locationId: "bay_a4_b2",
    locationName: "Aisle A4-B2",
    linkedWorkflow: "/stock-count",
    linkedWorkflowLabel: "Stock Count · Dairy · Unguided scan count",
    linkedContext: { countType: "QUICK_COUNT", area: "dairy_chilled", countMode: "unguided_scan_count" },
    dueAt: "2026-05-11T14:00:00+08:00",
    createdBy: "Manager Preview",
    createdRole: "Manager",
    createdAt: "2026-05-11T08:30:00+08:00",
    source: "inventory_desktop",
  },
  {
    taskId: "task-markdown-yoghurt-short-date",
    title: "Check short-dated yoghurt",
    description: "Review chilled yoghurt and request markdown evidence only if needed.",
    taskType: TASK_TYPES.MARKDOWN,
    status: TASK_STATUSES.IN_PROGRESS,
    priority: TASK_PRIORITIES.HIGH,
    assignedToUserId: "staff_001",
    assignedToName: "Sarah M.",
    assignedRole: "Staff",
    areaId: "dairy_chilled",
    areaName: "Chilled",
    locationId: "dairy_bay_2",
    locationName: "Dairy Bay 2",
    linkedWorkflow: "/markdowns",
    linkedWorkflowLabel: "Markdown · Chilled · Short-dated review",
    linkedContext: { reason: "short_dated" },
    dueAt: "2026-05-11T17:00:00+08:00",
    startedAt: "2026-05-11T09:45:00+08:00",
    createdBy: "Manager Preview",
    createdRole: "Manager",
    createdAt: "2026-05-11T08:45:00+08:00",
    source: "inventory_desktop",
  },
  {
    taskId: "task-shelf-ticket-promo-end",
    title: "Request missing promo shelf tickets",
    description: "Scan items on promo end cap and submit ticket requests. Do not print directly from scanner.",
    taskType: TASK_TYPES.SHELF_TICKET,
    status: TASK_STATUSES.NOT_STARTED,
    priority: TASK_PRIORITIES.NORMAL,
    assignedToUserId: "team",
    assignedToName: "Grocery Team",
    assignedRole: "Staff",
    areaId: "promo_ends",
    areaName: "Promo Ends",
    locationId: "promo_end_03",
    locationName: "Promo End 03",
    linkedWorkflow: "/shelf-tickets",
    linkedWorkflowLabel: "Shelf Tickets · Medium shelf edge",
    linkedContext: { ticketType: "price_check_ticket", paperSize: "medium_shelf_edge" },
    dueAt: "2026-05-11T16:00:00+08:00",
    createdBy: "Supervisor Preview",
    createdRole: "Supervisor",
    createdAt: "2026-05-11T09:10:00+08:00",
    source: "manual",
  },
  {
    taskId: "task-receiving-dairy-followup",
    title: "Receive supplier delivery",
    description: "Check dairy delivery paperwork and submit receiving evidence only.",
    taskType: TASK_TYPES.RECEIVING,
    status: TASK_STATUSES.BLOCKED,
    priority: TASK_PRIORITIES.LOW,
    assignedToUserId: "staff_001",
    assignedToName: "Sarah M.",
    assignedRole: "Staff",
    areaId: "receiving_bay",
    areaName: "Receiving",
    locationId: "receiving_bay",
    locationName: "Receiving Bay",
    linkedWorkflow: "/receiving",
    linkedWorkflowLabel: "Receiving · Supplier evidence",
    linkedContext: { receivingMode: "against_po" },
    dueAt: "2026-05-11T15:30:00+08:00",
    createdBy: "Manager Preview",
    createdRole: "Manager",
    createdAt: "2026-05-11T09:00:00+08:00",
    blockedReason: "Awaiting paperwork",
    source: "inventory_desktop",
  },
];

function nowIso() {
  return new Date().toISOString();
}

function makeTaskId(prefix = "task") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function safeReadRaw(key) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn("Unable to read ScanOps tasks", error);
    return [];
  }
}

function safeWriteTasks(tasks) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.warn("Unable to persist ScanOps tasks", error);
  }
}

function safeReadTasks() {
  const current = safeReadRaw(STORAGE_KEY);
  if (current.length) return current.map(normalizeTask);
  const legacy = safeReadRaw(LEGACY_STORAGE_KEY);
  if (legacy.length) {
    const migrated = legacy.map(normalizeTask);
    safeWriteTasks(migrated);
    return migrated;
  }
  return INITIAL_SCANOPS_TASKS.map(normalizeTask);
}

function normalizeStatus(status) {
  if (Object.values(TASK_STATUSES).includes(status) && ![TASK_STATUSES.OPEN, TASK_STATUSES.NEEDS_SUPERVISOR].includes(status)) return status;
  return LEGACY_STATUS_MAP[status] || TASK_STATUSES.NOT_STARTED;
}

function normalizePriority(priority) {
  const value = String(priority || "").toLowerCase();
  if (Object.values(TASK_PRIORITIES).includes(value)) return value;
  return LEGACY_PRIORITY_MAP[priority] || TASK_PRIORITIES.NORMAL;
}

function normalizeType(type) {
  return LEGACY_TYPE_MAP[type] || type || TASK_TYPES.GENERAL_CHECK;
}

export function normalizeTask(task = {}) {
  const taskType = normalizeType(task.taskType || task.type);
  const status = normalizeStatus(task.status);
  const taskId = task.taskId || task.id || makeTaskId();
  const title = task.title || task.itemName || "Scanner task";
  return {
    ...task,
    id: taskId,
    taskId,
    title,
    itemName: title,
    description: task.description || task.recommendation || task.reason || "Complete the assigned scanner work.",
    taskType,
    type: taskType,
    status,
    priority: normalizePriority(task.priority),
    assignedToUserId: task.assignedToUserId || task.assignedTo || SCANOPS_USER_CONTEXT.user_id,
    assignedToName: task.assignedToName || (task.assignedTo === "team" ? "Team" : SCANOPS_USER_CONTEXT.user_name),
    assignedRole: task.assignedRole || SCANOPS_USER_CONTEXT.role,
    areaName: task.areaName || task.department || "Store Operations",
    locationName: task.locationName || task.location || "Store floor",
    linkedWorkflow: task.linkedWorkflow || workflowPathForTaskType(taskType),
    linkedWorkflowLabel: task.linkedWorkflowLabel || getTaskTypeLabel(taskType),
    linkedContext: task.linkedContext || {},
    source: task.source || task.sourceModule || "scanops_local",
    createdBy: task.createdBy || "ScanOps",
    createdRole: task.createdRole || "Staff",
    createdAt: task.createdAt || nowIso(),
  };
}

export function getInitialTaskQueue() {
  return safeReadTasks();
}

export function saveTaskQueue(tasks) {
  const normalized = (tasks || []).map(normalizeTask);
  safeWriteTasks(normalized);
  return normalized;
}

export function resetTaskQueue() {
  const initial = INITIAL_SCANOPS_TASKS.map(normalizeTask);
  safeWriteTasks(initial);
  return initial;
}

export function updateTaskStatus(tasks, taskId, status, extra = {}) {
  const normalizedStatus = normalizeStatus(status);
  const updated = (tasks || []).map((task) => {
    const current = normalizeTask(task);
    if (current.taskId !== taskId && current.id !== taskId) return current;
    const patch = { updatedAt: nowIso() };
    if (normalizedStatus === TASK_STATUSES.IN_PROGRESS && !current.startedAt) patch.startedAt = nowIso();
    if (normalizedStatus === TASK_STATUSES.COMPLETED) patch.completedAt = nowIso();
    return normalizeTask({ ...current, status: normalizedStatus, ...patch, ...extra });
  });
  saveTaskQueue(updated);
  return updated;
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
    [TASK_TYPES.GENERAL_CHECK]: "/scan",
  };
  return paths[type] || "/scan";
}

export function getTaskTypeLabel(type) {
  const labels = {
    [TASK_TYPES.STOCK_COUNT]: "Stock Count",
    [TASK_TYPES.RECEIVING]: "Receiving",
    [TASK_TYPES.TRANSFER]: "Transfer",
    [TASK_TYPES.WASTE]: "Waste",
    [TASK_TYPES.MARKDOWN]: "Markdown",
    [TASK_TYPES.SHELF_TICKET]: "Shelf Ticket",
    [TASK_TYPES.PRODUCT_LOOKUP]: "Product Lookup",
    [TASK_TYPES.GENERAL_CHECK]: "General Check",
    [TASK_TYPES.REPLENISHMENT_TASK]: "Replenishment Task",
    [TASK_TYPES.GAP_SCAN_TASK]: "Gap Scan Task",
    [TASK_TYPES.MARKDOWN_TASK]: "Markdown Task",
    [TASK_TYPES.WASTE_REVIEW_TASK]: "Waste Review Task",
    [TASK_TYPES.EXPIRY_CHECK_TASK]: "Expiry Check Task",
    [TASK_TYPES.FRESHNESS_REVIEW_TASK]: "Freshness Review Task",
    [TASK_TYPES.STOCK_COUNT_RECHECK_TASK]: "Stock Count Recheck",
    [TASK_TYPES.RECEIVING_FOLLOWUP_TASK]: "Receiving Follow-up",
  };
  return labels[type] || labels[normalizeType(type)] || "Task";
}

export function getTaskStatusLabel(status) {
  const labels = {
    [TASK_STATUSES.NOT_STARTED]: "Not started",
    [TASK_STATUSES.IN_PROGRESS]: "In progress",
    [TASK_STATUSES.BLOCKED]: "Blocked",
    [TASK_STATUSES.COMPLETED]: "Completed",
    [TASK_STATUSES.CANCELLED]: "Cancelled",
    [TASK_STATUSES.SYNC_PENDING]: "Sync pending",
    [TASK_STATUSES.SYNC_FAILED]: "Sync failed",
  };
  return labels[normalizeStatus(status)] || "Not started";
}

export function getTaskPriority(task) {
  const labels = { low: "Low", normal: "Normal", high: "High", urgent: "Urgent" };
  return labels[normalizePriority(task?.priority)] || "Normal";
}

export function getTaskLinkedWorkflow(task) {
  const normalized = normalizeTask(task);
  const params = new URLSearchParams({ taskId: normalized.taskId });
  Object.entries(normalized.linkedContext || {}).forEach(([key, value]) => {
    if (value != null && value !== "") params.set(key, value);
  });
  return {
    path: normalized.linkedWorkflow || workflowPathForTaskType(normalized.taskType),
    search: `?${params.toString()}`,
    label: normalized.linkedWorkflowLabel || getTaskTypeLabel(normalized.taskType),
  };
}

export function isTaskAssignedToUser(task, userContext = SCANOPS_USER_CONTEXT) {
  const normalized = normalizeTask(task);
  return normalized.assignedToUserId === userContext.user_id || normalized.assignedToUserId === "team";
}

export function canStartTask(task, userContext = SCANOPS_USER_CONTEXT) {
  if (!task) return false;
  const normalized = normalizeTask(task);
  return [TASK_STATUSES.NOT_STARTED, TASK_STATUSES.BLOCKED, TASK_STATUSES.SYNC_FAILED].includes(normalized.status)
    && isTaskAssignedToUser(normalized, userContext);
}

export function canCompleteTask(task, userContext = SCANOPS_USER_CONTEXT) {
  if (!task) return false;
  const normalized = normalizeTask(task);
  return [TASK_STATUSES.NOT_STARTED, TASK_STATUSES.IN_PROGRESS, TASK_STATUSES.BLOCKED].includes(normalized.status)
    && isTaskAssignedToUser(normalized, userContext);
}

export function canCancelTask(_task, userContext = SCANOPS_USER_CONTEXT) {
  return ["Manager", "Admin"].includes(userContext.role || "Staff");
}

function isDueToday(task) {
  if (!task?.dueAt) return false;
  try {
    return new Date(task.dueAt).toDateString() === new Date().toDateString();
  } catch {
    return false;
  }
}

export function filterTasks(tasks, filterId, userContext = SCANOPS_USER_CONTEXT, scope = "mine") {
  let taskList = (tasks || []).map(normalizeTask).filter((task) => task.status !== TASK_STATUSES.CANCELLED);
  if (scope === "mine") taskList = taskList.filter((task) => isTaskAssignedToUser(task, userContext));
  switch (filterId) {
    case "mine":
      return taskList.filter((task) => isTaskAssignedToUser(task, userContext));
    case "due_today":
      return taskList.filter(isDueToday);
    case "in_progress":
      return taskList.filter((task) => task.status === TASK_STATUSES.IN_PROGRESS);
    case "completed":
      return taskList.filter((task) => task.status === TASK_STATUSES.COMPLETED);
    case "urgent":
      return taskList.filter((task) => task.priority === TASK_PRIORITIES.URGENT);
    case "all":
    default:
      return taskList;
  }
}

export function buildTaskEventPayload(task, status, extra = {}) {
  const normalized = normalizeTask(task);
  return {
    source_module: "Tasks",
    task_id: normalized.taskId,
    task_type: normalized.taskType,
    task_type_label: getTaskTypeLabel(normalized.taskType),
    task_priority: normalized.priority,
    task_status: status,
    task_status_label: getTaskStatusLabel(status),
    title: normalized.title,
    area_id: normalized.areaId,
    area_name: normalized.areaName,
    location_id: normalized.locationId,
    location_name: normalized.locationName,
    due_at: normalized.dueAt,
    assigned_to_user_id: normalized.assignedToUserId,
    assigned_to_name: normalized.assignedToName,
    linked_workflow: normalized.linkedWorkflow,
    linked_context: normalized.linkedContext,
    applies_stock_directly: false,
    applies_price_directly: false,
    prints_directly: false,
    ...extra,
  };
}

export function createTaskFromDecision(decision, item, extra = {}) {
  if (!decision?.taskToCreate) return null;
  const currentTasks = safeReadTasks();
  const sourceType = normalizeType(decision.taskToCreate);
  const task = normalizeTask({
    taskId: extra.id || makeTaskId("task_decision"),
    taskType: sourceType,
    priority: decision.taskPriority || TASK_PRIORITIES.NORMAL,
    status: decision.supervisorReviewRequired ? TASK_STATUSES.BLOCKED : TASK_STATUSES.NOT_STARTED,
    title: item?.name || item?.itemName || decision.itemIdentity?.item_name || "Scanner item",
    description: decision.reasonText || decision.recommendedAction,
    areaName: item?.department || decision.itemIdentity?.department || "Store Operations",
    locationName: item?.shelfLocation || item?.location || item?.aisle || decision.itemIdentity?.location || "Store floor",
    linkedWorkflow: decision.linkedWorkflow || workflowPathForTaskType(sourceType),
    linkedWorkflowLabel: extra.linkedWorkflowLabel || getTaskTypeLabel(sourceType),
    linkedContext: extra.linkedContext || {},
    assignedToUserId: decision.supervisorReviewRequired ? "team" : SCANOPS_USER_CONTEXT.user_id,
    assignedToName: decision.supervisorReviewRequired ? "Team" : SCANOPS_USER_CONTEXT.user_name,
    source: extra.sourceModule || "Decision Engine",
    linkedDecisionId: decision.decisionId,
    linkedDecisionEventId: extra.linkedDecisionEventId || null,
    createdAt: nowIso(),
    ...extra,
  });
  safeWriteTasks([task, ...currentTasks].slice(0, 100));
  return task;
}
