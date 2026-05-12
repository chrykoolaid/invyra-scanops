import { getScanOpsEvents } from "./scanOpsEvents";
import { getScanOpsSession } from "./scanOpsSession";
import { hasRoleAtLeast } from "./scanOpsPermissions";
import { getInitialTaskQueue, getTaskStatusEvents, TASK_DUE_STATES, TASK_STATUSES } from "./scanOpsTasks";
import { getSyncQueue, getSyncResolutionEvents, SYNC_STATUSES } from "./scanOpsSync";
import { getProductIdentityReviewQueues, getProductIdentityReviewSummary } from "./scanOpsProductIdentityReview";
import { getCountApprovalEvents, getCountRecountRequests, getCountSessionItems, getCountSessions } from "./scanOpsStockCount";
import { getWorkflowItemAttributeSnapshots } from "./scanOpsItemAttributes";
import { getMarkdownRequests, getReceivingRequests, getShelfTicketRequests, getTransferRequests, getWasteRequests } from "./scanOpsRequestLifecycle";
import { getReceivingBatches, getTransferBatches } from "./scanOpsReceivingTransfers";

const DONE_TASK_STATUSES = new Set([TASK_STATUSES.DONE, TASK_STATUSES.CANCELLED, "done", "completed", "cancelled"]);
const ACTIVE_SYNC_ISSUES = new Set([
  SYNC_STATUSES.SYNC_FAILED,
  SYNC_STATUSES.FAILED,
  SYNC_STATUSES.CONFLICT,
  SYNC_STATUSES.DUPLICATE,
  SYNC_STATUSES.NEEDS_REVIEW,
  SYNC_STATUSES.ESCALATED,
]);
const RESOLVED_REVIEW_STATES = new Set(["Accepted", "Closed", "Resolved", "linked_to_existing_product", "rejected", "resolved", "synced", "done", "cancelled"]);
const CLOSED_REQUEST_STATUSES = new Set(["Accepted", "Closed", "Cancelled", "Resolved", "Discarded", "Rejected", "done", "cancelled", "discarded"]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeDate(value) {
  const parsed = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function nowMs() {
  return Date.now();
}

function isWithinRange(value, dateRange = "7d") {
  if (dateRange === "all") return true;
  const created = safeDate(value);
  if (!created) return true;
  if (dateRange === "today") return new Date(created).toDateString() === new Date().toDateString();
  const days = dateRange === "30d" ? 30 : 7;
  return nowMs() - created <= days * 24 * 60 * 60 * 1000;
}

function latestDate(...values) {
  return values.filter(Boolean).sort().reverse()[0] || null;
}

function itemNameFrom(value = {}) {
  const first = asArray(value.items)[0] || asArray(value.lines)[0] || {};
  const snapshot = value.item_snapshot || value.source_item_snapshot || first.item_snapshot || first.rawItem || {};
  return value.item_name
    || value.itemName
    || value.name
    || snapshot.itemName
    || snapshot.name
    || first.itemName
    || first.item_name
    || first.name
    || first.sku
    || value.sku
    || value.barcode
    || "ScanOps evidence";
}

function storeFor(record = {}) {
  return record.store_id || record.storeId || record.location_id || record.locationId || record.store_location_id || null;
}

function actorFor(record = {}) {
  return record.actor_name || record.actorName || record.user_name || record.created_by || record.createdBy || record.assigned_user_name || "Scanner user";
}

function actorIdFor(record = {}) {
  return record.actor_id || record.actorUserId || record.user_id || record.created_by_user_id || record.assigned_user_id || null;
}

function roleFor(record = {}) {
  return record.actor_role || record.actorRole || record.role || record.created_role || record.created_by_role || record.assigned_role || "Staff";
}

function deviceFor(record = {}) {
  return record.device_id || record.deviceId || record.scanner_id || record.scannerId || "SCANOPS-DEVICE";
}

function departmentFor(record = {}) {
  return record.department || record.departmentName || record.assigned_department || record.area_label || record.count_area_label || "Store floor";
}

function createdAtFor(record = {}) {
  return record.created_at || record.createdAt || record.submitted_at || record.submittedAt || record.updated_at || record.updatedAt || record.timestamp || record.lastUpdatedAt || null;
}

function workflowFor(record = {}) {
  const source = record.workflow_type || record.sourceWorkflow || record.source_module || record.sourceModule || record.taskType || record.source_type || "scanops";
  return String(source || "scanops").toLowerCase().replaceAll(" ", "_");
}

function workflowLabel(value) {
  const normalized = String(value || "scanops").toLowerCase().replaceAll(" ", "_");
  const labels = {
    stock_count: "Stock Count",
    receiving: "Receiving",
    scanops_receiving: "Receiving",
    transfer: "Transfers",
    transfers: "Transfers",
    scanops_transfers: "Transfers",
    waste: "Waste",
    markdown: "Markdowns",
    markdowns: "Markdowns",
    shelf_tickets: "Shelf Tickets",
    task: "Tasks",
    tasks: "Tasks",
    sync_queue: "Sync Queue",
    product_identity_review: "Product Identity",
    unknown_item: "Product Identity",
    unknown_item_evidence: "Product Identity",
    scanops: "ScanOps",
  };
  return labels[normalized] || String(value || "ScanOps").replaceAll("_", " ");
}

function normalizeForFiltering(record = {}, source = "scanops") {
  return {
    ...record,
    _source: source,
    _createdAt: createdAtFor(record),
    _storeId: storeFor(record),
    _actorId: actorIdFor(record),
    _actorName: actorFor(record),
    _actorRole: roleFor(record),
    _deviceId: deviceFor(record),
    _department: departmentFor(record),
    _workflow: workflowFor(record),
  };
}

function scopeRecord(record, session) {
  if (!session) return true;
  if (session.actorRole === "Admin") return true;
  const storeId = record._storeId || storeFor(record);
  if (session.actorRole === "Manager" || session.actorRole === "Supervisor") return !storeId || storeId === session.storeId;
  return record._actorId === session.actorUserId || record._deviceId === session.deviceId;
}

function passesFilters(record, filters = {}, session = getScanOpsSession()) {
  if (!scopeRecord(record, session)) return false;
  if (!isWithinRange(record._createdAt, filters.dateRange)) return false;
  if (filters.workflow && filters.workflow !== "all" && record._workflow !== filters.workflow) return false;
  if (filters.department && filters.department !== "all" && record._department !== filters.department) return false;
  if (filters.device && filters.device !== "all" && record._deviceId !== filters.device) return false;
  if (filters.user && filters.user !== "all" && record._actorId !== filters.user && record._actorName !== filters.user) return false;
  return true;
}

function uniqueOptions(records, key, allLabel) {
  const values = Array.from(new Set(records.map((record) => record[key]).filter(Boolean)));
  return [{ id: "all", label: allLabel }, ...values.slice(0, 24).map((value) => ({ id: String(value), label: key === "_workflow" ? workflowLabel(value) : String(value) }))];
}

function isTaskOpen(task) {
  return !DONE_TASK_STATUSES.has(task.status);
}

function isOpenRequest(record = {}) {
  return !CLOSED_REQUEST_STATUSES.has(record.status) && !CLOSED_REQUEST_STATUSES.has(record.review_status);
}

function lineHasReceivingException(line = {}) {
  return line.exception_type && line.exception_type !== "none" || line.discrepancy && line.discrepancy !== "none" || Number(line.difference_quantity || 0) !== 0 || ["damaged", "short_dated", "mixed_lots", "temperature_concern"].includes(line.condition_snapshot || line.condition);
}

function lineHasTransferException(line = {}) {
  return line.exception_type && line.exception_type !== "none" || Number(line.difference_quantity || 0) !== 0 || ["damaged", "mixed_case"].includes(line.condition_note || line.condition);
}

function isCountVariance(line = {}) {
  const status = line.variance_status || line.varianceStatus || line.review_status;
  if (["accepted", "Accepted", "closed", "Closed", "no_variance", "No Variance"].includes(status)) return false;
  if (["review_required", "Review Required", "recount_requested", "Recount Requested", "recount_completed", "Recount Completed"].includes(status)) return true;
  return Number(line.variance_quantity ?? line.variance ?? 0) !== 0;
}

function isRecount(line = {}) {
  return ["recount_requested", "Recount Requested"].includes(line.variance_status || line.varianceStatus || line.review_status);
}

function flattenRequestItems(requests, fallbackWorkflow) {
  return asArray(requests).flatMap((request) => asArray(request.items).map((line) => ({ ...line, parentRequest: request, sourceWorkflow: request.sourceWorkflow || fallbackWorkflow, createdAt: line.createdAt || request.createdAt, status: line.status || request.status, actor_name: request.actor_name || request.actorName || request.createdBy, actor_role: request.actor_role || request.actorRole || request.createdRole, device_id: request.device_id || request.deviceId, department: request.department || request.assigned_department || line.department })));
}

function buildSourceRows() {
  const tasks = asArray(getInitialTaskQueue()).map((row) => normalizeForFiltering(row, "tasks"));
  const syncQueue = asArray(getSyncQueue()).map((row) => normalizeForFiltering(row, "sync_queue"));
  const events = asArray(getScanOpsEvents()).map((row) => normalizeForFiltering(row, "events"));
  const taskEvents = asArray(getTaskStatusEvents()).map((row) => normalizeForFiltering({ ...row, sourceWorkflow: "tasks" }, "task_events"));
  const syncResolutionEvents = asArray(getSyncResolutionEvents()).map((row) => normalizeForFiltering({ ...row, sourceWorkflow: "sync_queue" }, "sync_resolution_events"));
  const identityEvents = asArray(getProductIdentityReviewQueues().reviewEvents).map((row) => normalizeForFiltering({ ...row, sourceWorkflow: "product_identity_review" }, "identity_review_events"));
  const countApprovalEvents = asArray(getCountApprovalEvents()).map((row) => normalizeForFiltering({ ...row, sourceWorkflow: "stock_count" }, "count_approval_events"));
  const countSessions = asArray(getCountSessions()).map((row) => normalizeForFiltering({ ...row, sourceWorkflow: "stock_count" }, "count_sessions"));
  const countItems = asArray(getCountSessionItems()).map((row) => normalizeForFiltering({ ...row, sourceWorkflow: "stock_count" }, "count_items"));
  const recountRequests = asArray(getCountRecountRequests()).map((row) => normalizeForFiltering({ ...row, sourceWorkflow: "stock_count" }, "recount_requests"));
  const attributeSnapshots = asArray(getWorkflowItemAttributeSnapshots()).map((row) => normalizeForFiltering(row, "attribute_snapshots"));
  const receivingRequests = asArray(getReceivingRequests()).map((row) => normalizeForFiltering(row, "receiving_requests"));
  const transferRequests = asArray(getTransferRequests()).map((row) => normalizeForFiltering(row, "transfer_requests"));
  const wasteRequests = asArray(getWasteRequests()).map((row) => normalizeForFiltering(row, "waste_requests"));
  const markdownRequests = asArray(getMarkdownRequests()).map((row) => normalizeForFiltering(row, "markdown_requests"));
  const shelfTicketRequests = asArray(getShelfTicketRequests()).map((row) => normalizeForFiltering(row, "shelf_ticket_requests"));
  const receivingBatches = asArray(getReceivingBatches()).map((row) => normalizeForFiltering({ ...row, sourceWorkflow: "receiving" }, "receiving_batches"));
  const transferBatches = asArray(getTransferBatches()).map((row) => normalizeForFiltering({ ...row, sourceWorkflow: "transfer" }, "transfer_batches"));
  const requestItems = [
    ...flattenRequestItems(getWasteRequests(), "waste"),
    ...flattenRequestItems(getMarkdownRequests(), "markdown"),
    ...flattenRequestItems(getShelfTicketRequests(), "shelf_tickets"),
    ...flattenRequestItems(getReceivingRequests(), "receiving"),
    ...flattenRequestItems(getTransferRequests(), "transfer"),
  ].map((row) => normalizeForFiltering(row, "request_items"));

  return {
    tasks,
    syncQueue,
    events,
    taskEvents,
    syncResolutionEvents,
    identityEvents,
    countApprovalEvents,
    countSessions,
    countItems,
    recountRequests,
    attributeSnapshots,
    receivingRequests,
    transferRequests,
    wasteRequests,
    markdownRequests,
    shelfTicketRequests,
    receivingBatches,
    transferBatches,
    requestItems,
    all: [
      ...tasks,
      ...syncQueue,
      ...events,
      ...taskEvents,
      ...syncResolutionEvents,
      ...identityEvents,
      ...countApprovalEvents,
      ...countSessions,
      ...countItems,
      ...recountRequests,
      ...attributeSnapshots,
      ...receivingRequests,
      ...transferRequests,
      ...wasteRequests,
      ...markdownRequests,
      ...shelfTicketRequests,
      ...receivingBatches,
      ...transferBatches,
      ...requestItems,
    ],
  };
}

function filteredSourceRows(filters, session) {
  const rows = buildSourceRows();
  const filterList = (list) => list.filter((record) => passesFilters(record, filters, session));
  return Object.fromEntries(Object.entries(rows).map(([key, list]) => [key, filterList(list)]));
}

function countOpenReceivingExceptions(rows) {
  const batchExceptions = rows.receivingBatches.flatMap((batch) => asArray(batch.exceptions).map((exception) => ({ ...exception, batch }))).filter((exception) => !RESOLVED_REVIEW_STATES.has(exception.status));
  const requestExceptions = rows.receivingRequests.flatMap((request) => asArray(request.items).filter(lineHasReceivingException).map((line) => ({ ...line, request }))).filter((line) => isOpenRequest(line.request));
  return { total: batchExceptions.length + requestExceptions.length, damaged: [...batchExceptions, ...requestExceptions].filter((line) => String(line.exception_type || line.condition || "").includes("damaged")).length };
}

function countOpenTransferExceptions(rows) {
  const batchExceptions = rows.transferBatches.flatMap((batch) => asArray(batch.exceptions).map((exception) => ({ ...exception, batch }))).filter((exception) => !RESOLVED_REVIEW_STATES.has(exception.status));
  const requestExceptions = rows.transferRequests.flatMap((request) => asArray(request.items).filter(lineHasTransferException).map((line) => ({ ...line, request }))).filter((line) => isOpenRequest(line.request));
  return { total: batchExceptions.length + requestExceptions.length, shortReceived: [...batchExceptions, ...requestExceptions].filter((line) => String(line.exception_type || "").includes("short")).length };
}

function countWasteMarkdownEvidence(rows) {
  const wasteItems = rows.wasteRequests.filter(isOpenRequest).flatMap((request) => asArray(request.items));
  const markdownItems = rows.markdownRequests.filter(isOpenRequest).flatMap((request) => asArray(request.items));
  const expirySensitive = rows.attributeSnapshots.filter((snapshot) => snapshot.expiry_snapshot || snapshot.lot_batch_snapshot || snapshot.weighted_snapshot);
  return {
    total: wasteItems.length + markdownItems.length + expirySensitive.length,
    waste: wasteItems.length,
    markdown: markdownItems.length,
    shortDated: [...wasteItems, ...markdownItems, ...expirySensitive].filter((row) => String(row.freshnessStatus || row.condition || row.condition_note || row.expiry_snapshot?.freshness_status || "").toLowerCase().includes("short")).length,
  };
}

function buildDeviceActivity(rows, session) {
  const byDevice = new Map();
  const touch = (record, patch = {}) => {
    const deviceId = record._deviceId || deviceFor(record) || session.deviceId;
    if (!deviceId) return;
    const current = byDevice.get(deviceId) || {
      id: deviceId,
      label: deviceId,
      lastActive: null,
      scanCount: 0,
      queuedSync: 0,
      failedSync: 0,
      conflicts: 0,
      warningState: "Clear",
    };
    const created = record._createdAt || createdAtFor(record);
    current.lastActive = latestDate(current.lastActive, created);
    Object.assign(current, patch);
    byDevice.set(deviceId, current);
  };

  rows.events.forEach((event) => {
    const type = String(event.event_type || event.eventType || "");
    touch(event, { scanCount: (byDevice.get(event._deviceId || deviceFor(event))?.scanCount || 0) + (type.includes("SCAN") || type.includes("LOOKUP") || type.includes("ITEM") ? 1 : 0) });
  });

  rows.syncQueue.forEach((entry) => {
    const deviceId = entry._deviceId || deviceFor(entry);
    const current = byDevice.get(deviceId) || { id: deviceId, label: deviceId, lastActive: null, scanCount: 0, queuedSync: 0, failedSync: 0, conflicts: 0, warningState: "Clear" };
    const status = entry.status;
    current.lastActive = latestDate(current.lastActive, entry._createdAt);
    if ([SYNC_STATUSES.QUEUED, SYNC_STATUSES.SYNC_PENDING, SYNC_STATUSES.SYNCING, SYNC_STATUSES.LOCAL_SAVED].includes(status)) current.queuedSync += 1;
    if ([SYNC_STATUSES.SYNC_FAILED, SYNC_STATUSES.FAILED].includes(status)) current.failedSync += 1;
    if ([SYNC_STATUSES.CONFLICT, SYNC_STATUSES.DUPLICATE, SYNC_STATUSES.NEEDS_REVIEW, SYNC_STATUSES.ESCALATED].includes(status)) current.conflicts += 1;
    if (current.failedSync || current.conflicts) current.warningState = "Sync warning";
    else if (current.queuedSync) current.warningState = "Queued";
    byDevice.set(deviceId, current);
  });

  if (!byDevice.size && session?.deviceId) {
    byDevice.set(session.deviceId, { id: session.deviceId, label: session.deviceId, lastActive: new Date().toISOString(), scanCount: 0, queuedSync: 0, failedSync: 0, conflicts: 0, warningState: "No activity" });
  }

  return Array.from(byDevice.values()).sort((a, b) => (safeDate(b.lastActive) || 0) - (safeDate(a.lastActive) || 0)).slice(0, 6);
}

function buildUserActivity(rows, session) {
  const byUser = new Map();
  const ensure = (record) => {
    const id = record._actorId || actorIdFor(record) || record._actorName || actorFor(record);
    const current = byUser.get(id) || {
      id,
      name: record._actorName || actorFor(record),
      role: record._actorRole || roleFor(record),
      department: record._department || departmentFor(record),
      scanCount: 0,
      tasksCompleted: 0,
      openTasks: 0,
      exceptionsSubmitted: 0,
      conflicts: 0,
    };
    byUser.set(id, current);
    return current;
  };

  rows.events.forEach((event) => {
    const current = ensure(event);
    const type = String(event.event_type || "");
    if (type.includes("SCAN") || type.includes("LOOKUP") || type.includes("ITEM")) current.scanCount += 1;
    if (type.includes("EXCEPTION") || type.includes("VARIANCE")) current.exceptionsSubmitted += 1;
  });

  rows.taskEvents.forEach((event) => {
    const current = ensure(event);
    if ([TASK_STATUSES.DONE, "done", "completed"].includes(event.to_status || event.status)) current.tasksCompleted += 1;
  });

  rows.tasks.forEach((task) => {
    const current = ensure(task);
    if (isTaskOpen(task)) current.openTasks += 1;
  });

  rows.syncQueue.forEach((entry) => {
    const current = ensure(entry);
    if ([SYNC_STATUSES.CONFLICT, SYNC_STATUSES.DUPLICATE, SYNC_STATUSES.NEEDS_REVIEW, SYNC_STATUSES.ESCALATED].includes(entry.status)) current.conflicts += 1;
  });

  if (!byUser.size && session?.actorUserId) {
    byUser.set(session.actorUserId, { id: session.actorUserId, name: session.actorName, role: session.actorRole, department: session.departmentName, scanCount: 0, tasksCompleted: 0, openTasks: 0, exceptionsSubmitted: 0, conflicts: 0 });
  }

  return Array.from(byUser.values()).sort((a, b) => b.openTasks + b.conflicts - (a.openTasks + a.conflicts)).slice(0, 6);
}

function buildRecentEvents(rows) {
  const normalized = [
    ...rows.syncQueue.filter((entry) => ACTIVE_SYNC_ISSUES.has(entry.status)).map((entry) => ({
      id: entry.id || entry.queueId,
      createdAt: entry._createdAt,
      title: entry.status === SYNC_STATUSES.CONFLICT ? "Sync conflict detected" : entry.status === SYNC_STATUSES.DUPLICATE ? "Duplicate sync evidence" : "Sync issue recorded",
      summary: `${itemNameFrom(entry.localSnapshot || entry.payloadSnapshot || entry)} · ${workflowLabel(entry.sourceWorkflow || entry._workflow)} · ${entry._deviceId}`,
      path: "/sync-queue",
    })),
    ...rows.events.map((event) => ({
      id: event.event_id || event.id,
      createdAt: event._createdAt,
      title: String(event.event_type || "ScanOps event").replaceAll("_", " ").toLowerCase().replace(/^./, (char) => char.toUpperCase()),
      summary: `${itemNameFrom(event)} · ${workflowLabel(event._workflow)} · ${event._actorName}`,
      path: event.source_module === "Tasks" ? "/tasks" : null,
    })),
    ...rows.taskEvents.map((event) => ({
      id: event.id || event.task_id,
      createdAt: event._createdAt,
      title: "Task status updated",
      summary: `${event.task_ref || event.task_id || "Task"} · ${event.from_status || "new"} → ${event.to_status || event.status || "updated"}`,
      path: "/tasks",
    })),
    ...rows.identityEvents.map((event) => ({
      id: event.id || event.event_id,
      createdAt: event._createdAt,
      title: "Identity review event",
      summary: `${itemNameFrom(event)} · Product Identity Review`,
      path: "/product-identity-review",
    })),
    ...rows.countApprovalEvents.map((event) => ({
      id: event.id || event.event_id,
      createdAt: event._createdAt,
      title: "Stock count review event",
      summary: `${event.session_ref || event.count_session_id || "Stock Count"} · ${event.status || "reviewed"}`,
      path: "/stock-count",
    })),
  ];

  return normalized
    .filter((event) => event.id || event.createdAt)
    .sort((a, b) => (safeDate(b.createdAt) || 0) - (safeDate(a.createdAt) || 0))
    .slice(0, 10);
}

export function canViewScanOpsReporting(session = getScanOpsSession()) {
  return hasRoleAtLeast(session?.actorRole, "Supervisor");
}

export function scanOpsReportingScopeLabel(session = getScanOpsSession()) {
  if (session?.actorRole === "Admin") return "Admin · Diagnostic view";
  if (session?.actorRole === "Manager") return "Manager · Store view";
  if (session?.actorRole === "Supervisor") return "Supervisor · Team view";
  return "Staff · Access restricted";
}

export function getScanOpsReportingRoleRule(session = getScanOpsSession()) {
  return {
    role: session?.actorRole || "Staff",
    reporting_scope: session?.actorRole === "Admin" ? "all" : session?.actorRole === "Manager" ? "store" : session?.actorRole === "Supervisor" ? "team" : "none",
    can_view_reporting: canViewScanOpsReporting(session),
    can_view_team_scope: hasRoleAtLeast(session?.actorRole, "Supervisor"),
    can_view_store_scope: hasRoleAtLeast(session?.actorRole, "Manager"),
    can_view_diagnostics: session?.actorRole === "Admin",
  };
}

export function getScanOpsReportingSnapshot(filters = {}, session = getScanOpsSession()) {
  const effectiveFilters = { dateRange: "7d", workflow: "all", department: "all", device: "all", user: "all", ...filters };
  const rows = filteredSourceRows(effectiveFilters, session);
  const unfilteredRows = buildSourceRows().all.filter((record) => scopeRecord(record, session));
  const identitySummary = getProductIdentityReviewSummary();
  const identityQueues = getProductIdentityReviewQueues();
  const countVarianceLines = rows.countItems.filter(isCountVariance);
  const recountLines = rows.countItems.filter(isRecount);
  const receiving = countOpenReceivingExceptions(rows);
  const transfer = countOpenTransferExceptions(rows);
  const wasteMarkdown = countWasteMarkdownEvidence(rows);
  const openTasks = rows.tasks.filter(isTaskOpen);
  const syncIssues = rows.syncQueue.filter((entry) => ACTIVE_SYNC_ISSUES.has(entry.status));
  const dueTasks = openTasks.filter((task) => [TASK_DUE_STATES.OVERDUE, TASK_DUE_STATES.NOW, "overdue", "now"].includes(task.due_state || task.dueState));
  const blockedTasks = openTasks.filter((task) => task.status === TASK_STATUSES.BLOCKED || task.status === TASK_STATUSES.ESCALATED);
  const unknownTotal = identitySummary.needsReview + identitySummary.aliasConflicts + identitySummary.pluIssues;

  const queueHealth = [
    { id: "sync", label: "Sync Queue", value: syncIssues.length, detail: `${syncIssues.filter((entry) => entry.status === SYNC_STATUSES.CONFLICT).length} conflict · ${syncIssues.filter((entry) => [SYNC_STATUSES.SYNC_FAILED, SYNC_STATUSES.FAILED].includes(entry.status)).length} failed`, path: "/sync-queue", action: "View Sync Queue" },
    { id: "tasks", label: "Tasks", value: openTasks.length, detail: `${dueTasks.length} due now · ${blockedTasks.length} blocked/escalated`, path: "/tasks", action: "View Tasks" },
    { id: "identity", label: "Product Identity Review", value: unknownTotal, detail: `${identitySummary.aliasConflicts} alias conflicts · ${identitySummary.pluIssues} PLU issues`, path: "/product-identity-review", action: "View Unknown Items" },
    { id: "receiving", label: "Receiving Exceptions", value: receiving.total, detail: `${receiving.damaged} damaged or condition issues`, path: "/receiving", action: "View Receiving" },
    { id: "transfers", label: "Transfer Exceptions", value: transfer.total, detail: `${transfer.shortReceived} short received`, path: "/transfers", action: "View Transfers" },
    { id: "stock_count", label: "Count Variances", value: countVarianceLines.length, detail: `${recountLines.length + rows.recountRequests.length} recounts needed`, path: "/stock-count", action: "View Stock Count" },
  ];

  const workflowExceptions = [
    { id: "stock_count", label: "Stock Count", value: countVarianceLines.length, detail: `${recountLines.length + rows.recountRequests.length} recounts needed`, path: "/stock-count" },
    { id: "receiving", label: "Receiving", value: receiving.total, detail: `${receiving.damaged} damaged on arrival`, path: "/receiving" },
    { id: "transfers", label: "Transfers", value: transfer.total, detail: `${transfer.shortReceived} short received`, path: "/transfers" },
    { id: "waste", label: "Waste", value: wasteMarkdown.waste, detail: "Evidence awaiting review", path: "/waste" },
    { id: "markdown", label: "Markdowns", value: wasteMarkdown.markdown, detail: `${wasteMarkdown.shortDated} short dated`, path: "/markdowns" },
    { id: "shelf_tickets", label: "Shelf Tickets", value: rows.shelfTicketRequests.filter(isOpenRequest).length, detail: "Requests awaiting desktop handoff", path: "/shelf-tickets" },
    { id: "identity", label: "Product Identity", value: unknownTotal, detail: `${identityQueues.needsReview.length} waiting`, path: "/product-identity-review" },
    { id: "sync", label: "Sync Queue", value: syncIssues.length, detail: `${syncIssues.length ? "Needs review" : "Clear"}`, path: "/sync-queue" },
  ];

  const evidenceQuality = [
    { id: "missing_expiry", label: "Missing expiry evidence", value: rows.attributeSnapshots.filter((snapshot) => snapshot.requires_expiry && !snapshot.expiry_snapshot?.expiry_date).length },
    { id: "missing_lot", label: "Missing lot/batch evidence", value: rows.attributeSnapshots.filter((snapshot) => snapshot.requires_lot_batch && !snapshot.lot_batch_snapshot?.lot_batch_value).length },
    { id: "unknown_barcode", label: "Unknown barcode evidence", value: identitySummary.needsReview },
    { id: "duplicate", label: "Duplicate evidence", value: rows.syncQueue.filter((entry) => entry.status === SYNC_STATUSES.DUPLICATE).length },
    { id: "failed_sync", label: "Failed sync evidence", value: rows.syncQueue.filter((entry) => [SYNC_STATUSES.SYNC_FAILED, SYNC_STATUSES.FAILED].includes(entry.status)).length },
    { id: "discarded", label: "Discarded local drafts", value: rows.syncQueue.filter((entry) => entry.status === SYNC_STATUSES.DISCARDED).length },
    { id: "escalated", label: "Escalated evidence", value: rows.syncQueue.filter((entry) => entry.status === SYNC_STATUSES.ESCALATED).length + openTasks.filter((task) => task.status === TASK_STATUSES.ESCALATED).length },
  ];

  return {
    roleRule: getScanOpsReportingRoleRule(session),
    scopeLabel: scanOpsReportingScopeLabel(session),
    filters: effectiveFilters,
    filterOptions: {
      workflows: uniqueOptions(unfilteredRows, "_workflow", "All Workflows"),
      departments: uniqueOptions(unfilteredRows, "_department", "All Departments"),
      devices: uniqueOptions(unfilteredRows, "_deviceId", "All Devices"),
      users: uniqueOptions(unfilteredRows, "_actorName", "All Users"),
    },
    kpis: [
      { id: "open_tasks", label: "Open tasks", value: openTasks.length, detail: `${dueTasks.length} due now`, path: "/tasks" },
      { id: "sync_issues", label: "Sync issues", value: syncIssues.length, detail: `${syncIssues.filter((entry) => entry.status === SYNC_STATUSES.CONFLICT).length} conflict`, path: "/sync-queue" },
      { id: "unknown_items", label: "Unknown items", value: unknownTotal, detail: `${identitySummary.needsReview} need review`, path: "/product-identity-review" },
      { id: "count_variances", label: "Count variances", value: countVarianceLines.length, detail: `${recountLines.length + rows.recountRequests.length} recount needed`, path: "/stock-count" },
      { id: "receiving_exceptions", label: "Receiving issues", value: receiving.total, detail: `${receiving.damaged} damaged`, path: "/receiving" },
      { id: "waste_markdown", label: "Waste/Markdown", value: wasteMarkdown.total, detail: `${wasteMarkdown.shortDated} short dated`, path: "/waste" },
    ],
    queueHealth,
    workflowExceptions,
    evidenceQuality,
    deviceActivity: buildDeviceActivity(rows, session),
    userActivity: buildUserActivity(rows, session),
    recentEvents: buildRecentEvents(rows),
    empty: rows.all.length === 0,
  };
}
