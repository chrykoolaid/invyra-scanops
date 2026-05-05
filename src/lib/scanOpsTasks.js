import { SCANOPS_USER_CONTEXT } from "./scanOpsInventoryFixtures";

const STORAGE_KEY = "invyra_scanops_tasks_v1";

export const TASK_TYPES = {
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
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  BLOCKED: "Blocked",
  NEEDS_SUPERVISOR: "Needs Supervisor",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const TASK_PRIORITIES = {
  URGENT: "Urgent",
  HIGH: "High",
  NORMAL: "Normal",
  LOW: "Low",
};

export const TASK_FILTERS = [
  { id: "all", label: "All" },
  { id: "urgent", label: "Urgent" },
  { id: "mine", label: "My Tasks" },
  { id: "supervisor", label: "Supervisor" },
  { id: "fresh", label: "Fresh" },
  { id: "stock", label: "Stock" },
];

export const INITIAL_SCANOPS_TASKS = [
  {
    id: "task-expiry-chicken-001",
    type: TASK_TYPES.EXPIRY_CHECK_TASK,
    priority: TASK_PRIORITIES.URGENT,
    status: TASK_STATUSES.NEEDS_SUPERVISOR,
    itemName: "Chicken Breast 1kg",
    sku: "930000000008",
    barcode: "930000000008",
    location: "Meat Chiller A",
    department: "Fresh Meat",
    reason: "Expired / freshness review",
    recommendation: "Remove from sale and request supervisor review",
    linkedWorkflow: "/expiry-check",
    linkedWorkflowLabel: "Go to Expiry Check",
    currentPrice: 265,
    currency: "₱",
    suggestedMarkdown: null,
    requiresSupervisor: true,
    assignedTo: "staff_001",
    sourceModule: "Expiry Check",
  },
  {
    id: "task-markdown-yoghurt-001",
    type: TASK_TYPES.MARKDOWN_TASK,
    priority: TASK_PRIORITIES.HIGH,
    status: TASK_STATUSES.OPEN,
    itemName: "Greek Yoghurt 1kg",
    sku: "930000000004",
    barcode: "930000000004",
    location: "Dairy Bay 2",
    department: "Dairy",
    reason: "Expires tomorrow — markdown needed",
    recommendation: "Apply markdown if freshness condition is acceptable",
    linkedWorkflow: "/markdowns",
    linkedWorkflowLabel: "Go to Markdowns",
    currentPrice: 220,
    currency: "₱",
    suggestedMarkdown: "30%",
    requiresSupervisor: false,
    assignedTo: "staff_001",
    sourceModule: "Markdowns",
  },
  {
    id: "task-replenish-rice-001",
    type: TASK_TYPES.REPLENISHMENT_TASK,
    priority: TASK_PRIORITIES.NORMAL,
    status: TASK_STATUSES.OPEN,
    itemName: "Rice 5kg",
    sku: "930000000010",
    barcode: "930000000010",
    location: "Aisle 6 / Bay 3",
    department: "Grocery",
    reason: "Shelf gap — replenish from backroom",
    recommendation: "Move 6 units from backroom to shelf",
    linkedWorkflow: "/replenish",
    linkedWorkflowLabel: "Go to Replenish",
    currentPrice: 410,
    currency: "₱",
    suggestedMarkdown: null,
    requiresSupervisor: false,
    assignedTo: "staff_001",
    sourceModule: "Replenish",
  },
  {
    id: "task-waste-review-001",
    type: TASK_TYPES.WASTE_REVIEW_TASK,
    priority: TASK_PRIORITIES.HIGH,
    status: TASK_STATUSES.NEEDS_SUPERVISOR,
    itemName: "Seafood Tray 500g",
    sku: "930000000011",
    barcode: "930000000011",
    location: "Seafood Chiller B",
    department: "Seafood",
    reason: "Temperature concern — waste approval required",
    recommendation: "Hold from sale and request supervisor review",
    linkedWorkflow: "/waste",
    linkedWorkflowLabel: "Go to Waste",
    currentPrice: 340,
    currency: "₱",
    suggestedMarkdown: null,
    requiresSupervisor: true,
    assignedTo: "team",
    sourceModule: "Waste",
  },
  {
    id: "task-receiving-followup-001",
    type: TASK_TYPES.RECEIVING_FOLLOWUP_TASK,
    priority: TASK_PRIORITIES.LOW,
    status: TASK_STATUSES.OPEN,
    itemName: "Supplier delivery variance",
    sku: "RCV-DAIRY-042",
    barcode: "RCV-DAIRY-042",
    location: "Receiving Bay",
    department: "Receiving",
    reason: "Short delivery needs recheck",
    recommendation: "Review received quantity against supplier paperwork",
    linkedWorkflow: "/receiving",
    linkedWorkflowLabel: "Go to Receiving",
    currentPrice: null,
    currency: "₱",
    suggestedMarkdown: null,
    requiresSupervisor: false,
    assignedTo: "staff_001",
    sourceModule: "Receiving",
  },
];

function safeReadTasks() {
  if (typeof window === "undefined") return INITIAL_SCANOPS_TASKS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : INITIAL_SCANOPS_TASKS;
  } catch (error) {
    console.warn("Unable to read ScanOps tasks", error);
    return INITIAL_SCANOPS_TASKS;
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

export function getInitialTaskQueue() {
  return safeReadTasks();
}

export function saveTaskQueue(tasks) {
  safeWriteTasks(tasks);
  return tasks;
}

export function resetTaskQueue() {
  safeWriteTasks(INITIAL_SCANOPS_TASKS);
  return INITIAL_SCANOPS_TASKS;
}

export function updateTaskStatus(tasks, taskId, status, extra = {}) {
  const updated = tasks.map((task) => (
    task.id === taskId
      ? {
          ...task,
          status,
          updatedAt: new Date().toISOString(),
          ...extra,
        }
      : task
  ));
  saveTaskQueue(updated);
  return updated;
}

export function getTaskTypeLabel(type) {
  const labels = {
    [TASK_TYPES.REPLENISHMENT_TASK]: "Replenishment Task",
    [TASK_TYPES.GAP_SCAN_TASK]: "Gap Scan Task",
    [TASK_TYPES.MARKDOWN_TASK]: "Markdown Task",
    [TASK_TYPES.WASTE_REVIEW_TASK]: "Waste Review Task",
    [TASK_TYPES.EXPIRY_CHECK_TASK]: "Expiry Check Task",
    [TASK_TYPES.FRESHNESS_REVIEW_TASK]: "Freshness Review Task",
    [TASK_TYPES.STOCK_COUNT_RECHECK_TASK]: "Stock Count Recheck",
    [TASK_TYPES.RECEIVING_FOLLOWUP_TASK]: "Receiving Follow-up",
  };
  return labels[type] || "Task";
}

export function getTaskStatusLabel(status) {
  return status || TASK_STATUSES.OPEN;
}

export function getTaskPriority(task) {
  return task?.priority || TASK_PRIORITIES.NORMAL;
}

export function getTaskLinkedWorkflow(task) {
  return task?.linkedWorkflow || "/";
}

export function isTaskAssignedToUser(task, userContext = SCANOPS_USER_CONTEXT) {
  return task?.assignedTo === userContext.user_id || task?.assignedTo === "team";
}

export function canStartTask(task, userContext = SCANOPS_USER_CONTEXT) {
  if (!task) return false;
  return [TASK_STATUSES.OPEN, TASK_STATUSES.BLOCKED, TASK_STATUSES.NEEDS_SUPERVISOR].includes(task.status) && isTaskAssignedToUser(task, userContext);
}

export function canCompleteTask(task, userContext = SCANOPS_USER_CONTEXT) {
  if (!task) return false;
  const role = userContext.role || "Staff";
  const elevated = ["Supervisor", "Manager", "Admin"].includes(role);
  if (task.requiresSupervisor && !elevated) return false;
  return [TASK_STATUSES.OPEN, TASK_STATUSES.IN_PROGRESS, TASK_STATUSES.NEEDS_SUPERVISOR].includes(task.status);
}

export function canCancelTask(_task, userContext = SCANOPS_USER_CONTEXT) {
  return ["Manager", "Admin"].includes(userContext.role || "Staff");
}

export function filterTasks(tasks, filterId, userContext = SCANOPS_USER_CONTEXT) {
  const taskList = tasks.filter((task) => task.status !== TASK_STATUSES.CANCELLED);
  switch (filterId) {
    case "urgent":
      return taskList.filter((task) => task.priority === TASK_PRIORITIES.URGENT);
    case "mine":
      return taskList.filter((task) => isTaskAssignedToUser(task, userContext));
    case "supervisor":
      return taskList.filter((task) => task.requiresSupervisor || task.status === TASK_STATUSES.NEEDS_SUPERVISOR);
    case "fresh":
      return taskList.filter((task) => [
        TASK_TYPES.EXPIRY_CHECK_TASK,
        TASK_TYPES.FRESHNESS_REVIEW_TASK,
        TASK_TYPES.MARKDOWN_TASK,
        TASK_TYPES.WASTE_REVIEW_TASK,
      ].includes(task.type));
    case "stock":
      return taskList.filter((task) => [
        TASK_TYPES.REPLENISHMENT_TASK,
        TASK_TYPES.GAP_SCAN_TASK,
        TASK_TYPES.STOCK_COUNT_RECHECK_TASK,
        TASK_TYPES.RECEIVING_FOLLOWUP_TASK,
      ].includes(task.type));
    default:
      return taskList;
  }
}

export function buildTaskEventPayload(task, status, extra = {}) {
  return {
    source_module: "Tasks",
    task_id: task.id,
    task_type: task.type,
    task_type_label: getTaskTypeLabel(task.type),
    task_priority: task.priority,
    task_status: status,
    sku: task.sku,
    barcode: task.barcode,
    item_name: task.itemName,
    location: task.location,
    department: task.department,
    reason: task.reason,
    recommendation: task.recommendation,
    requires_supervisor: task.requiresSupervisor,
    linked_workflow: task.linkedWorkflow,
    assigned_to: task.assignedTo,
    ...extra,
  };
}


function makeTaskId(prefix = "decision-task") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createTaskFromDecision(decision, item, extra = {}) {
  if (!decision?.taskToCreate) return null;
  const currentTasks = safeReadTasks();
  const task = {
    id: extra.id || makeTaskId("task_decision"),
    type: decision.taskToCreate,
    priority: decision.taskPriority || TASK_PRIORITIES.NORMAL,
    status: decision.supervisorReviewRequired ? TASK_STATUSES.NEEDS_SUPERVISOR : TASK_STATUSES.OPEN,
    itemName: item?.name || item?.itemName || decision.itemIdentity?.item_name || "Scanner item",
    sku: item?.sku || decision.itemIdentity?.sku || "—",
    barcode: item?.barcode || item?.gtin || item?.plu || decision.itemIdentity?.barcode || decision.itemIdentity?.plu || "—",
    location: item?.shelfLocation || item?.location || item?.aisle || decision.itemIdentity?.location || "Store floor",
    department: item?.department || decision.itemIdentity?.department || "Store Operations",
    reason: decision.reasonText,
    recommendation: decision.recommendedAction,
    linkedWorkflow: decision.linkedWorkflow || "/tasks",
    linkedWorkflowLabel: extra.linkedWorkflowLabel || "Open Linked Workflow",
    currentPrice: item?.currentPrice ?? item?.current_price ?? null,
    currency: item?.currency || "₱",
    suggestedMarkdown: extra.suggestedMarkdown || null,
    requiresSupervisor: Boolean(decision.supervisorReviewRequired),
    assignedTo: decision.supervisorReviewRequired ? "team" : SCANOPS_USER_CONTEXT.user_id,
    sourceModule: extra.sourceModule || "Decision Engine",
    linkedDecisionId: decision.decisionId,
    linkedDecisionEventId: extra.linkedDecisionEventId || null,
    createdAt: new Date().toISOString(),
    ...extra,
  };
  safeWriteTasks([task, ...currentTasks].slice(0, 80));
  return task;
}
