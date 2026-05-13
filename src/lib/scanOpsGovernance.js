import { useEffect, useMemo, useState } from "react";
import { getNetworkMode } from "./scanOpsSync";
import { getScanOpsSession, updateScanOpsSession } from "./scanOpsSession";

const CONTEXT_KEY = "invyra_scanops_governance_context_v1";
const EVENTS_KEY = "invyra_scanops_governance_events_v1";
const CONTEXT_EVENT = "scanops-governance-context-updated";
const MAX_EVENTS = 120;

export const GOVERNANCE_VERSION = "SCANOPS_GOVERNANCE_CONTEXT_V1";
export const GOVERNANCE_EVENT_VERSION = "SCANOPS_GOVERNANCE_EVENT_V1";

export const GOVERNANCE_STATES = {
  DEVICE_REGISTERED_LOCAL: "DEVICE_REGISTERED_LOCAL",
  DEVICE_CONTEXT_READY: "DEVICE_CONTEXT_READY",
  DEVICE_CONTEXT_MISSING: "DEVICE_CONTEXT_MISSING",
  USER_SESSION_ACTIVE: "USER_SESSION_ACTIVE",
  USER_SESSION_EXPIRED: "USER_SESSION_EXPIRED",
  SHIFT_NOT_STARTED: "SHIFT_NOT_STARTED",
  SHIFT_ACTIVE: "SHIFT_ACTIVE",
  SHIFT_ENDED: "SHIFT_ENDED",
  ACTION_ALLOWED: "ACTION_ALLOWED",
  ACTION_BLOCKED_ROLE: "ACTION_BLOCKED_ROLE",
  ACTION_BLOCKED_SHIFT: "ACTION_BLOCKED_SHIFT",
  ACTION_BLOCKED_DEVICE: "ACTION_BLOCKED_DEVICE",
  ACTION_REQUIRES_MANAGER: "ACTION_REQUIRES_MANAGER",
  ACTION_REQUIRES_SUPERVISOR: "ACTION_REQUIRES_SUPERVISOR",
  SYNC_DEFERRED: "SYNC_DEFERRED",
  GOVERNANCE_EVENT_RECORDED: "GOVERNANCE_EVENT_RECORDED",
};

export const GOVERNED_ACTIONS = {
  MARKDOWN_SUBMIT: "MARKDOWN_SUBMIT",
  MARKDOWN_APPROVE: "MARKDOWN_APPROVE",
  MARKDOWN_REJECT: "MARKDOWN_REJECT",
  WASTE_SUBMIT: "WASTE_SUBMIT",
  WASTE_APPROVE_NORMAL: "WASTE_APPROVE_NORMAL",
  SHRINK_APPROVE_HIGH_VALUE: "SHRINK_APPROVE_HIGH_VALUE",
  ADJUSTMENT_CONTRACT_CREATE: "ADJUSTMENT_CONTRACT_CREATE",
  SHELF_TICKET_PRINT_HANDOFF: "SHELF_TICKET_PRINT_HANDOFF",
  PRICE_CHECK_OVERRIDE: "PRICE_CHECK_OVERRIDE",
  SHIFT_START: "SHIFT_START",
  SHIFT_END: "SHIFT_END",
  DEVICE_CONTEXT_VIEW: "DEVICE_CONTEXT_VIEW",
  DEMO_ROLE_SWITCH: "DEMO_ROLE_SWITCH",
  COLLAB_TASK_CLAIM: "COLLAB_TASK_CLAIM",
  COLLAB_TASK_RELEASE_OWN: "COLLAB_TASK_RELEASE_OWN",
  COLLAB_TASK_RELEASE_OTHER: "COLLAB_TASK_RELEASE_OTHER",
  COLLAB_TASK_TAKEOVER_REQUEST: "COLLAB_TASK_TAKEOVER_REQUEST",
  COLLAB_TASK_TAKEOVER_APPROVE: "COLLAB_TASK_TAKEOVER_APPROVE",
  COLLAB_TASK_FORCE_RELEASE: "COLLAB_TASK_FORCE_RELEASE",
  COLLAB_CONFLICT_VIEW: "COLLAB_CONFLICT_VIEW",
  COLLAB_CONFLICT_RESOLVE: "COLLAB_CONFLICT_RESOLVE",
  COLLAB_CONFLICT_RESOLVE_HIGH: "COLLAB_CONFLICT_RESOLVE_HIGH",
  COLLAB_REMOTE_TASK_VIEW: "COLLAB_REMOTE_TASK_VIEW",
};

const ROLE_LEVELS = { Staff: 1, Supervisor: 2, Manager: 3, Admin: 4 };

const ACTION_POLICIES = {
  [GOVERNED_ACTIONS.MARKDOWN_SUBMIT]: { requiredRole: "Staff", shiftRequired: true, label: "Submit markdown approval" },
  [GOVERNED_ACTIONS.MARKDOWN_APPROVE]: { requiredRole: "Supervisor", shiftRequired: true, label: "Approve markdown" },
  [GOVERNED_ACTIONS.MARKDOWN_REJECT]: { requiredRole: "Supervisor", shiftRequired: true, label: "Return or reject markdown" },
  [GOVERNED_ACTIONS.WASTE_SUBMIT]: { requiredRole: "Staff", shiftRequired: true, label: "Submit waste review" },
  [GOVERNED_ACTIONS.WASTE_APPROVE_NORMAL]: { requiredRole: "Supervisor", shiftRequired: true, label: "Approve waste review" },
  [GOVERNED_ACTIONS.SHRINK_APPROVE_HIGH_VALUE]: { requiredRole: "Manager", shiftRequired: true, label: "Approve shrink / high-risk review" },
  [GOVERNED_ACTIONS.ADJUSTMENT_CONTRACT_CREATE]: { requiredRole: "Manager", shiftRequired: true, label: "Create adjustment contract" },
  [GOVERNED_ACTIONS.SHELF_TICKET_PRINT_HANDOFF]: { requiredRole: "Staff", shiftRequired: true, label: "Create shelf-ticket handoff" },
  [GOVERNED_ACTIONS.PRICE_CHECK_OVERRIDE]: { requiredRole: "Supervisor", shiftRequired: true, label: "Record price-check override" },
  [GOVERNED_ACTIONS.SHIFT_START]: { requiredRole: "Staff", shiftRequired: false, label: "Start shift" },
  [GOVERNED_ACTIONS.SHIFT_END]: { requiredRole: "Staff", shiftRequired: false, label: "End shift" },
  [GOVERNED_ACTIONS.DEVICE_CONTEXT_VIEW]: { requiredRole: "Staff", shiftRequired: false, label: "View device context" },
  [GOVERNED_ACTIONS.DEMO_ROLE_SWITCH]: { requiredRole: "Admin", shiftRequired: false, label: "Switch local pilot preview role" },
  [GOVERNED_ACTIONS.COLLAB_TASK_CLAIM]: { requiredRole: "Staff", shiftRequired: true, label: "Claim shared task" },
  [GOVERNED_ACTIONS.COLLAB_TASK_RELEASE_OWN]: { requiredRole: "Staff", shiftRequired: true, label: "Release own shared task" },
  [GOVERNED_ACTIONS.COLLAB_TASK_RELEASE_OTHER]: { requiredRole: "Manager", shiftRequired: true, label: "Release another device task" },
  [GOVERNED_ACTIONS.COLLAB_TASK_TAKEOVER_REQUEST]: { requiredRole: "Staff", shiftRequired: true, label: "Request shared task takeover" },
  [GOVERNED_ACTIONS.COLLAB_TASK_TAKEOVER_APPROVE]: { requiredRole: "Supervisor", shiftRequired: true, label: "Approve shared task takeover" },
  [GOVERNED_ACTIONS.COLLAB_TASK_FORCE_RELEASE]: { requiredRole: "Manager", shiftRequired: true, label: "Force-release abandoned task" },
  [GOVERNED_ACTIONS.COLLAB_CONFLICT_VIEW]: { requiredRole: "Staff", shiftRequired: true, label: "View collaboration conflict" },
  [GOVERNED_ACTIONS.COLLAB_CONFLICT_RESOLVE]: { requiredRole: "Supervisor", shiftRequired: true, label: "Resolve low-risk collaboration conflict" },
  [GOVERNED_ACTIONS.COLLAB_CONFLICT_RESOLVE_HIGH]: { requiredRole: "Manager", shiftRequired: true, label: "Resolve high-risk collaboration conflict" },
  [GOVERNED_ACTIONS.COLLAB_REMOTE_TASK_VIEW]: { requiredRole: "Staff", shiftRequired: true, label: "View remote-owned shared task" },
};

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function roleLevel(role) {
  return ROLE_LEVELS[role] || ROLE_LEVELS.Staff;
}

function safeRead(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`Unable to read ${key}`, error);
    return fallback;
  }
}

function safeWrite(key, value) {
  if (typeof window === "undefined") return value;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Unable to persist ${key}`, error);
  }
  return value;
}

export function getDefaultGovernanceContext(session = getScanOpsSession()) {
  const now = nowIso();
  return {
    governanceVersion: GOVERNANCE_VERSION,
    deviceId: session.deviceId || "HH-SCANOPS-001",
    deviceLabel: session.deviceLabel || "SCANOPS-HH-001",
    deviceType: "HANDHELD_SCANNER",
    deviceStatus: GOVERNANCE_STATES.DEVICE_REGISTERED_LOCAL,

    storeId: session.storeId || "store_001",
    storeName: session.storeName || "Pilot Test Store",
    locationId: session.locationId || session.departmentId || "grocery",
    locationName: session.locationName || session.departmentName || "Grocery",

    currentUserId: session.actorUserId || "staff_001",
    currentUserName: session.actorName || "Staff 1 Preview",
    currentUserRole: session.actorRole || "Staff",

    sessionId: session.sessionId || "session_scanops_pilot_001",
    sessionStatus: session.sessionStatus || GOVERNANCE_STATES.USER_SESSION_ACTIVE,
    sessionStartedAt: session.sessionStartedAt || now,

    shiftId: session.shiftId || "shift_pilot_morning_001",
    shiftLabel: session.shiftLabel || "Morning Shift",
    shiftStatus: session.shiftStatus || GOVERNANCE_STATES.SHIFT_ACTIVE,
    shiftStartedAt: session.shiftStartedAt || now,
    shiftEndedAt: session.shiftEndedAt || null,
    shiftStartedBy: session.shiftStartedBy || session.actorName || "Staff 1 Preview",
    shiftEndedBy: session.shiftEndedBy || null,

    networkStatus: session.networkStatus || getNetworkMode?.() || "LOCAL",
    syncStatus: session.syncStatus || GOVERNANCE_STATES.SYNC_DEFERRED,
    printerStatus: "Deferred to AC/AD handoff",
    batteryStatus: "Pilot placeholder",

    createdAt: now,
    updatedAt: now,
  };
}

export function getScanOpsGovernanceContext() {
  const session = getScanOpsSession();
  const stored = safeRead(CONTEXT_KEY, null);
  const base = getDefaultGovernanceContext(session);
  const merged = {
    ...base,
    ...(stored || {}),
    currentUserId: session.actorUserId || base.currentUserId,
    currentUserName: session.actorName || base.currentUserName,
    currentUserRole: session.actorRole || base.currentUserRole,
    deviceId: session.deviceId || stored?.deviceId || base.deviceId,
    deviceLabel: session.deviceLabel || stored?.deviceLabel || base.deviceLabel,
    storeId: session.storeId || stored?.storeId || base.storeId,
    storeName: session.storeName || stored?.storeName || base.storeName,
    locationId: session.locationId || session.departmentId || stored?.locationId || base.locationId,
    locationName: session.locationName || session.departmentName || stored?.locationName || base.locationName,
    sessionId: session.sessionId || stored?.sessionId || base.sessionId,
    networkStatus: getNetworkMode?.() || stored?.networkStatus || base.networkStatus,
    updatedAt: stored?.updatedAt || base.updatedAt,
  };
  return merged;
}

export function updateScanOpsGovernanceContext(patch = {}) {
  const current = getScanOpsGovernanceContext();
  const updated = { ...current, ...patch, updatedAt: nowIso() };
  safeWrite(CONTEXT_KEY, updated);
  updateScanOpsSession({
    deviceId: updated.deviceId,
    deviceLabel: updated.deviceLabel,
    storeId: updated.storeId,
    storeName: updated.storeName,
    locationId: updated.locationId,
    locationName: updated.locationName,
    shiftId: updated.shiftId,
    shiftLabel: updated.shiftLabel,
    shiftStatus: updated.shiftStatus,
    shiftStartedAt: updated.shiftStartedAt,
    shiftEndedAt: updated.shiftEndedAt,
    shiftStartedBy: updated.shiftStartedBy,
    shiftEndedBy: updated.shiftEndedBy,
    sessionStatus: updated.sessionStatus,
    sessionStartedAt: updated.sessionStartedAt,
    syncStatus: updated.syncStatus,
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CONTEXT_EVENT, { detail: updated }));
  }
  return updated;
}

export function getGovernanceEvents() {
  return safeRead(EVENTS_KEY, []);
}

export function createGovernanceEvent(eventType, payload = {}) {
  const context = getScanOpsGovernanceContext();
  const event = {
    eventId: makeId("gov_evt"),
    eventVersion: GOVERNANCE_EVENT_VERSION,
    eventType,
    eventLabel: payload.eventLabel || eventType,
    sourceWorkflow: payload.sourceWorkflow || "ScanOps Governance",
    sourceRecordId: payload.sourceRecordId || null,

    actorId: context.currentUserId,
    actorName: context.currentUserName,
    actorRole: context.currentUserRole,

    deviceId: context.deviceId,
    deviceLabel: context.deviceLabel,
    sessionId: context.sessionId,
    shiftId: context.shiftId,
    shiftLabel: context.shiftLabel,
    shiftStatus: context.shiftStatus,

    storeId: context.storeId,
    storeName: context.storeName,
    locationId: context.locationId,
    locationName: context.locationName,

    actionAllowed: payload.actionAllowed ?? true,
    blockedReason: payload.blockedReason || null,
    requiredRole: payload.requiredRole || null,

    syncStatus: payload.syncStatus || context.syncStatus || GOVERNANCE_STATES.SYNC_DEFERRED,
    createdAt: nowIso(),
    ...payload,
  };
  safeWrite(EVENTS_KEY, [event, ...getGovernanceEvents()].slice(0, MAX_EVENTS));
  return event;
}

export function startScanOpsShift(label = "Morning Shift") {
  const context = getScanOpsGovernanceContext();
  const next = updateScanOpsGovernanceContext({
    shiftId: context.shiftStatus === GOVERNANCE_STATES.SHIFT_ACTIVE ? context.shiftId : makeId("shift"),
    shiftLabel: label || context.shiftLabel || "Store Shift",
    shiftStatus: GOVERNANCE_STATES.SHIFT_ACTIVE,
    shiftStartedAt: nowIso(),
    shiftEndedAt: null,
    shiftStartedBy: context.currentUserName,
    shiftEndedBy: null,
  });
  createGovernanceEvent("SHIFT_STARTED", { eventLabel: "Shift started", sourceWorkflow: "Device Governance" });
  return next;
}

export function endScanOpsShift() {
  const context = getScanOpsGovernanceContext();
  const next = updateScanOpsGovernanceContext({
    shiftStatus: GOVERNANCE_STATES.SHIFT_ENDED,
    shiftEndedAt: nowIso(),
    shiftEndedBy: context.currentUserName,
  });
  createGovernanceEvent("SHIFT_ENDED", { eventLabel: "Shift ended", sourceWorkflow: "Device Governance" });
  return next;
}

export function resetScanOpsGovernanceDemoState() {
  const next = getDefaultGovernanceContext(getScanOpsSession());
  safeWrite(CONTEXT_KEY, next);
  updateScanOpsSession({
    shiftId: next.shiftId,
    shiftLabel: next.shiftLabel,
    shiftStatus: next.shiftStatus,
    shiftStartedAt: next.shiftStartedAt,
    shiftEndedAt: null,
    shiftStartedBy: next.shiftStartedBy,
    shiftEndedBy: null,
    syncStatus: next.syncStatus,
  });
  createGovernanceEvent("GOVERNANCE_DEMO_RESET", { eventLabel: "Local pilot governance reset", sourceWorkflow: "Device Governance" });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CONTEXT_EVENT, { detail: next }));
  }
  return next;
}

export function buildGovernanceSnapshot() {
  const context = getScanOpsGovernanceContext();
  return {
    governanceVersion: context.governanceVersion,
    actorId: context.currentUserId,
    actorName: context.currentUserName,
    actorRole: context.currentUserRole,
    deviceId: context.deviceId,
    deviceLabel: context.deviceLabel,
    sessionId: context.sessionId,
    sessionStatus: context.sessionStatus,
    shiftId: context.shiftId,
    shiftLabel: context.shiftLabel,
    shiftStatus: context.shiftStatus,
    storeId: context.storeId,
    storeName: context.storeName,
    locationId: context.locationId,
    locationName: context.locationName,
    networkStatus: context.networkStatus,
    syncStatus: context.syncStatus,
  };
}

export function canPerformScanOpsAction(actionKey, governanceContext = getScanOpsGovernanceContext()) {
  const policy = ACTION_POLICIES[actionKey] || { requiredRole: "Staff", shiftRequired: false, label: actionKey };
  const currentRole = governanceContext.currentUserRole || "Staff";
  const roleAllowed = roleLevel(currentRole) >= roleLevel(policy.requiredRole);
  const shiftAllowed = !policy.shiftRequired || governanceContext.shiftStatus === GOVERNANCE_STATES.SHIFT_ACTIVE;
  const deviceAllowed = Boolean(governanceContext.deviceId && governanceContext.sessionId);

  if (!deviceAllowed) {
    return {
      allowed: false,
      state: GOVERNANCE_STATES.ACTION_BLOCKED_DEVICE,
      reason: "Device/session context is missing.",
      requiredRole: policy.requiredRole,
      currentRole,
      actionLabel: policy.label,
    };
  }

  if (!shiftAllowed) {
    return {
      allowed: false,
      state: GOVERNANCE_STATES.ACTION_BLOCKED_SHIFT,
      reason: "Start a shift before submitting governed records.",
      requiredRole: policy.requiredRole,
      currentRole,
      actionLabel: policy.label,
    };
  }

  if (!roleAllowed) {
    const state = policy.requiredRole === "Manager" ? GOVERNANCE_STATES.ACTION_REQUIRES_MANAGER : GOVERNANCE_STATES.ACTION_REQUIRES_SUPERVISOR;
    return {
      allowed: false,
      state,
      reason: `${policy.requiredRole} role required. Current role: ${currentRole}.`,
      requiredRole: policy.requiredRole,
      currentRole,
      actionLabel: policy.label,
    };
  }

  return {
    allowed: true,
    state: GOVERNANCE_STATES.ACTION_ALLOWED,
    reason: "Action allowed.",
    requiredRole: policy.requiredRole,
    currentRole,
    actionLabel: policy.label,
  };
}

export function recordGovernedAction(actionKey, sourceWorkflow, sourceRecordId, result, extra = {}) {
  const outcome = result || canPerformScanOpsAction(actionKey);
  return createGovernanceEvent(outcome.allowed ? "ACTION_ALLOWED" : "ACTION_BLOCKED", {
    eventLabel: outcome.actionLabel || actionKey,
    sourceWorkflow,
    sourceRecordId,
    actionKey,
    actionAllowed: outcome.allowed,
    blockedReason: outcome.allowed ? null : outcome.reason,
    requiredRole: outcome.requiredRole,
    currentRole: outcome.currentRole,
    governanceState: outcome.state,
    ...extra,
  });
}

export function useScanOpsGovernanceContext() {
  const [context, setContext] = useState(() => getScanOpsGovernanceContext());

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const refresh = () => setContext(getScanOpsGovernanceContext());
    window.addEventListener(CONTEXT_EVENT, refresh);
    window.addEventListener("scanops-session-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CONTEXT_EVENT, refresh);
      window.removeEventListener("scanops-session-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return context;
}

export function useGovernedAction(actionKey) {
  const context = useScanOpsGovernanceContext();
  return useMemo(() => canPerformScanOpsAction(actionKey, context), [actionKey, context]);
}
