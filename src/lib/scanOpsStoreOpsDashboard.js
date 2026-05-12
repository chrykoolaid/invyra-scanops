import { useEffect, useMemo, useState } from "react";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "./scanOpsEvents";
import { getScanOpsSession } from "./scanOpsSession";
import {
  buildDesktopResponsePreview,
  DESKTOP_SYNC_STATUSES,
  getDesktopSyncContext,
  getDesktopSyncOutboundQueue,
  summarizeDesktopSyncQueue,
  validateDesktopSyncPayload,
} from "./scanOpsDesktopSyncContract";

const TRIAGE_STORAGE_KEY = "invyra_scanops_store_ops_triage_v1";
export const STORE_OPS_DASHBOARD_EVENT = "scanops-store-ops-dashboard-updated";

const ROLE_LEVELS = { Staff: 1, Supervisor: 2, Manager: 3, Admin: 4 };

export const STORE_OPS_FILTERS = [
  { id: "all", label: "All" },
  { id: "high", label: "High Risk" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Review" },
  { id: "deferred", label: "Deferred" },
  { id: "waste", label: "Waste" },
];

export const STORE_OPS_WORKFLOW_ROUTES = {
  Replenishment: "/replenish",
  "Price Check / Promo Check": "/price-check",
  "Shelf Ticket Queue": "/shelf-tickets",
  "Markdown Approval": "/markdowns",
  "Waste Review": "/waste",
  "Device / User / Shift Governance": "/device-governance",
  "Session Collaboration": "/session-collaboration",
  "Desktop Sync": "/desktop-sync-contract",
};

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function safeReadTriage() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(TRIAGE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn("Unable to read Store Ops triage state", error);
    return {};
  }
}

function safeWriteTriage(next) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(TRIAGE_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(STORE_OPS_DASHBOARD_EVENT, { detail: next }));
    } catch (error) {
      console.warn("Unable to persist Store Ops triage state", error);
    }
  }
  return next;
}

function roleLevel(role) {
  return ROLE_LEVELS[role] || ROLE_LEVELS.Staff;
}

function readable(value) {
  return String(value || "—").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function riskRank(riskLevel) {
  if (riskLevel === "High") return 1;
  if (riskLevel === "Medium") return 2;
  return 3;
}

function workflowShortName(workflow) {
  if (workflow === "Price Check / Promo Check") return "Price / Promo";
  if (workflow === "Waste Review") return "Waste / Shrink";
  if (workflow === "Device / User / Shift Governance") return "Device / Shift";
  if (workflow === "Session Collaboration") return "Collaboration";
  return workflow || "Workflow";
}

function queueStatusFor(event, validation) {
  const syncStatus = validation.syncStatus || event.syncStatus;
  if ([
    DESKTOP_SYNC_STATUSES.SYNC_BLOCKED_CONFLICT,
    DESKTOP_SYNC_STATUSES.SYNC_BLOCKED_PERMISSION,
    DESKTOP_SYNC_STATUSES.SYNC_BLOCKED_SCHEMA,
    DESKTOP_SYNC_STATUSES.SYNC_BLOCKED_STALE_TASK,
    DESKTOP_SYNC_STATUSES.SYNC_INVALID,
    DESKTOP_SYNC_STATUSES.SYNC_REJECTED,
  ].includes(syncStatus)) return "Blocked Conflict";
  if (syncStatus === DESKTOP_SYNC_STATUSES.SYNC_DEFERRED) return "Deferred";
  if (syncStatus === DESKTOP_SYNC_STATUSES.SYNC_LOCAL_ONLY) return "Local Only";
  if (validation.reviewRequired) return "Review Required";
  return "Open";
}

function riskFor(event, validation) {
  if (event.highRiskReview || validation.requiredRole === "Manager") return "High";
  if (queueStatusFor(event, validation) === "Blocked Conflict") return "High";
  if (["Price Check / Promo Check", "Shelf Ticket Queue", "Session Collaboration"].includes(event.sourceWorkflow)) return "Medium";
  if (validation.reviewRequired) return "Medium";
  return "Low";
}

function exceptionTypeFor(event, validation) {
  if (event.eventType?.includes("WASTE_QUANTITY_CONFLICT")) return "WASTE_QUANTITY_CONFLICT";
  if (event.eventType?.includes("MARKDOWN_CONFLICT")) return "MARKDOWN_APPROVAL_CONFLICT";
  if (event.eventType?.includes("PROMO_LABEL_MISMATCH")) return "PROMO_LABEL_MISMATCH";
  if (event.eventType?.includes("PRICE_MISMATCH")) return "PRICE_MISMATCH";
  if (event.sourceWorkflow === "Shelf Ticket Queue") return "SHELF_TICKET_PRINT_REVIEW";
  if (event.sourceWorkflow === "Session Collaboration") return "COLLABORATION_DEFERRED_ACKNOWLEDGEMENT";
  if (validation.syncStatus === DESKTOP_SYNC_STATUSES.SYNC_BLOCKED_PERMISSION) return "PERMISSION_BLOCKED_ACTION";
  return event.eventType || "STORE_OPS_EVENT";
}

function mutationBlockedReasonFor(event, validation) {
  return validation.mutationBlockedReason || event.blockedReason || "Stage AI is visibility and triage only. No handheld mutation is executed.";
}

function actionLabelFor(event, validation) {
  if (event.sourceWorkflow === "Waste Review") return "Manager review required";
  if (event.sourceWorkflow === "Markdown Approval") return "Desktop review required";
  if (event.sourceWorkflow === "Price Check / Promo Check") return "Price / promo review required";
  if (event.sourceWorkflow === "Shelf Ticket Queue") return "Desktop print queue review";
  if (event.sourceWorkflow === "Session Collaboration") return "Desktop acknowledgement later";
  if (event.sourceWorkflow === "Replenishment") return "Task evidence review";
  return validation.reviewQueue || "Review queue";
}

function deriveDashboardEvent(event, triage = {}) {
  const validation = validateDesktopSyncPayload(event);
  const response = buildDesktopResponsePreview(event, validation);
  const persisted = triage[event.eventId] || {};
  const queueStatus = persisted.queueStatusOverride || queueStatusFor(event, validation);
  const riskLevel = riskFor(event, validation);
  const blocked = queueStatus === "Blocked Conflict" || String(validation.syncStatus || "").includes("BLOCKED");
  const deferred = queueStatus === "Deferred" || validation.syncStatus === DESKTOP_SYNC_STATUSES.SYNC_DEFERRED || event.syncStatus === DESKTOP_SYNC_STATUSES.SYNC_DEFERRED;

  return {
    dashboardEventId: `dash_${event.eventId}`,
    sourceEventId: event.eventId,
    sourceEvent: event,
    sourceWorkflow: event.sourceWorkflow,
    sourceWorkflowLabel: workflowShortName(event.sourceWorkflow),
    sourceRecordId: event.sourceRecordId,
    exceptionType: exceptionTypeFor(event, validation),
    exceptionLabel: event.eventLabel || readable(event.eventType),
    riskLevel,
    queueStatus,
    syncStatus: validation.syncStatus || event.syncStatus,
    desktopResponseStatus: response.responseStatus,
    desktopResponsePreview: response,
    reviewRequired: Boolean(validation.reviewRequired),
    blocked,
    deferred,
    mutationAllowed: false,
    mutationBlockedReason: mutationBlockedReasonFor(event, validation),
    actorId: event.actorId,
    actorName: event.actorName,
    actorRole: event.actorRole,
    deviceId: event.deviceLabel || event.deviceId,
    rawDeviceId: event.deviceId,
    shiftId: event.shiftId,
    shiftLabel: event.shiftLabel,
    collaborationStatus: event.collaboration?.conflictStatus && event.collaboration.conflictStatus !== "NONE"
      ? readable(event.collaboration.conflictStatus)
      : event.collaboration?.ownershipStatus
        ? readable(event.collaboration.ownershipStatus)
        : "Not task-based",
    reviewReason: validation.reviewReason || response.reviewReason || actionLabelFor(event, validation),
    reviewQueue: validation.reviewQueue || response.reviewQueue,
    requiredRole: validation.requiredRole || response.requiredRole || "Supervisor",
    safeActionLabel: actionLabelFor(event, validation),
    createdAt: event.createdAt,
    updatedAt: persisted.updatedAt || event.updatedAt,
    localTriageStatus: persisted.localTriageStatus || "Not reviewed locally",
    reviewNotes: persisted.reviewNotes || [],
    validation,
  };
}

function canStaffSee(event, session) {
  return event.actorId === session.actorUserId
    || event.sourceEvent?.collaboration?.ownerUserId === session.actorUserId
    || event.sourceEvent?.collaboration?.ownerDeviceId === session.deviceLabel
    || event.rawDeviceId === session.deviceId;
}

export function canViewFullStoreOpsCommandCenter(session = getScanOpsSession()) {
  return roleLevel(session.actorRole) >= roleLevel("Manager");
}

export function canUseStoreOpsTriageControls(session = getScanOpsSession()) {
  return roleLevel(session.actorRole) >= roleLevel("Supervisor");
}

export function getStoreOpsDashboardScope(session = getScanOpsSession()) {
  if (canViewFullStoreOpsCommandCenter(session)) return "Full store command center";
  if (roleLevel(session.actorRole) >= roleLevel("Supervisor")) return "Team review visibility";
  return "Own/local work only";
}

export function getStoreOpsDashboardEvents(session = getScanOpsSession()) {
  const triage = safeReadTriage();
  const derived = getDesktopSyncOutboundQueue()
    .map((event) => deriveDashboardEvent(event, triage))
    .filter((event) => {
      if (roleLevel(session.actorRole) >= roleLevel("Supervisor")) return true;
      return canStaffSee(event, session);
    });

  return derived.sort((a, b) => {
    const risk = riskRank(a.riskLevel) - riskRank(b.riskLevel);
    if (risk !== 0) return risk;
    if (a.blocked !== b.blocked) return a.blocked ? -1 : 1;
    if (a.reviewRequired !== b.reviewRequired) return a.reviewRequired ? -1 : 1;
    return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  });
}

export function getStoreOpsDashboardModel(session = getScanOpsSession()) {
  const context = getDesktopSyncContext();
  const events = getStoreOpsDashboardEvents(session);
  const syncSummary = summarizeDesktopSyncQueue(getDesktopSyncOutboundQueue());
  const count = (predicate) => events.filter(predicate).length;
  const workflows = [
    "Replenishment",
    "Price Check / Promo Check",
    "Shelf Ticket Queue",
    "Markdown Approval",
    "Waste Review",
    "Session Collaboration",
    "Desktop Sync",
  ];

  const workflowHealth = workflows.map((workflow) => {
    const matching = workflow === "Desktop Sync" ? events : events.filter((event) => event.sourceWorkflow === workflow);
    const last = matching[0];
    return {
      workflow,
      label: workflowShortName(workflow),
      open: matching.length,
      review: matching.filter((event) => event.reviewRequired).length,
      blocked: matching.filter((event) => event.blocked).length,
      deferred: matching.filter((event) => event.deferred).length,
      lastEventLabel: last?.exceptionLabel || "No open items",
    };
  });

  return {
    context: {
      ...context,
      mode: "Local Command Center",
      desktop: "Not connected",
      sync: "Contract preview only",
      scope: getStoreOpsDashboardScope(session),
    },
    events,
    priorityEvents: events.filter((event) => event.riskLevel !== "Low" || event.blocked || event.reviewRequired).slice(0, 5),
    workflowHealth,
    syncSummary: {
      ...syncSummary,
      visibleQueued: events.length,
      visibleReviewRequired: count((event) => event.reviewRequired),
      visibleBlocked: count((event) => event.blocked),
      visibleDeferred: count((event) => event.deferred),
      visibleHighRisk: count((event) => event.riskLevel === "High"),
    },
  };
}

export function filterStoreOpsDashboardEvents(events = [], filterId = "all") {
  if (filterId === "high") return events.filter((event) => event.riskLevel === "High");
  if (filterId === "blocked") return events.filter((event) => event.blocked);
  if (filterId === "review") return events.filter((event) => event.reviewRequired);
  if (filterId === "deferred") return events.filter((event) => event.deferred);
  if (filterId === "waste") return events.filter((event) => event.sourceWorkflow === "Waste Review");
  return events;
}

export function addStoreOpsReviewNote(dashboardEventId, noteText, session = getScanOpsSession()) {
  const text = String(noteText || "").trim();
  if (!text) return null;
  const triage = safeReadTriage();
  const sourceEventId = String(dashboardEventId || "").replace(/^dash_/, "");
  const current = triage[sourceEventId] || {};
  const note = {
    noteId: makeId("triage_note"),
    dashboardEventId,
    sourceEventId,
    noteText: text,
    actorId: session.actorUserId,
    actorName: session.actorName,
    actorRole: session.actorRole,
    deviceId: session.deviceId,
    shiftId: session.shiftId,
    createdAt: nowIso(),
    noteType: "LOCAL_TRIAGE_NOTE",
  };
  const updated = {
    ...triage,
    [sourceEventId]: {
      ...current,
      reviewNotes: [note, ...(current.reviewNotes || [])],
      localTriageStatus: current.localTriageStatus || "Note added locally",
      updatedAt: note.createdAt,
    },
  };
  safeWriteTriage(updated);
  createScanOpsEvent(SCANOPS_EVENT_TYPES.STORE_OPS_REVIEW_NOTE_ADDED || "STORE_OPS_REVIEW_NOTE_ADDED", {
    status: "local_triage_note_added",
    dashboardEventId,
    sourceEventId,
    noteType: note.noteType,
  });
  return note;
}

export function markStoreOpsLocallyReviewed(dashboardEventId, session = getScanOpsSession()) {
  const triage = safeReadTriage();
  const sourceEventId = String(dashboardEventId || "").replace(/^dash_/, "");
  const current = triage[sourceEventId] || {};
  const updatedAt = nowIso();
  const updated = {
    ...triage,
    [sourceEventId]: {
      ...current,
      localTriageStatus: "Locally reviewed",
      reviewedBy: session.actorName,
      reviewedByRole: session.actorRole,
      reviewedAt: updatedAt,
      updatedAt,
    },
  };
  safeWriteTriage(updated);
  createScanOpsEvent(SCANOPS_EVENT_TYPES.STORE_OPS_TRIAGE_MARKED_REVIEWED || "STORE_OPS_TRIAGE_MARKED_REVIEWED", {
    status: "local_triage_reviewed",
    dashboardEventId,
    sourceEventId,
    mutationAllowed: false,
  });
  return updated[sourceEventId];
}

export function keepStoreOpsExceptionDeferred(dashboardEventId, session = getScanOpsSession()) {
  const triage = safeReadTriage();
  const sourceEventId = String(dashboardEventId || "").replace(/^dash_/, "");
  const current = triage[sourceEventId] || {};
  const updatedAt = nowIso();
  const updated = {
    ...triage,
    [sourceEventId]: {
      ...current,
      queueStatusOverride: "Deferred",
      localTriageStatus: "Kept deferred locally",
      deferredBy: session.actorName,
      deferredByRole: session.actorRole,
      deferredAt: updatedAt,
      updatedAt,
    },
  };
  safeWriteTriage(updated);
  createScanOpsEvent(SCANOPS_EVENT_TYPES.STORE_OPS_EXCEPTION_KEPT_DEFERRED || "STORE_OPS_EXCEPTION_KEPT_DEFERRED", {
    status: "kept_deferred_locally",
    dashboardEventId,
    sourceEventId,
    desktopConnected: false,
    mutationAllowed: false,
  });
  return updated[sourceEventId];
}

export function useStoreOpsDashboard() {
  const [tick, setTick] = useState(0);
  const session = getScanOpsSession();

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const refresh = () => setTick((value) => value + 1);
    window.addEventListener(STORE_OPS_DASHBOARD_EVENT, refresh);
    window.addEventListener("scanops-desktop-sync-contract-updated", refresh);
    window.addEventListener("scanops-governance-updated", refresh);
    window.addEventListener("scanops-collaboration-updated", refresh);
    window.addEventListener("scanops-session-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(STORE_OPS_DASHBOARD_EVENT, refresh);
      window.removeEventListener("scanops-desktop-sync-contract-updated", refresh);
      window.removeEventListener("scanops-governance-updated", refresh);
      window.removeEventListener("scanops-collaboration-updated", refresh);
      window.removeEventListener("scanops-session-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return useMemo(() => getStoreOpsDashboardModel(getScanOpsSession()), [tick, session.actorRole, session.actorUserId]);
}
