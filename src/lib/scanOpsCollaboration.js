import { useEffect, useMemo, useState } from "react";
import {
  GOVERNANCE_STATES,
  GOVERNED_ACTIONS,
  canPerformScanOpsAction,
  getScanOpsGovernanceContext,
  recordGovernedAction,
} from "./scanOpsGovernance";

const STORAGE_KEY = "invyra_scanops_collaboration_state_v1";
const EVENT_NAME = "scanops-collaboration-updated";
const MAX_EVENTS = 160;
const MAX_TASKS = 120;

export const COLLABORATION_VERSION = "SCANOPS_COLLABORATION_V1";
export const COLLABORATION_EVENT_VERSION = "SCANOPS_COLLABORATION_EVENT_V1";

export const COLLABORATION_STATES = {
  COLLAB_SESSION_ACTIVE: "COLLAB_SESSION_ACTIVE",
  COLLAB_SESSION_DEFERRED: "COLLAB_SESSION_DEFERRED",
  DEVICE_JOINED_SESSION: "DEVICE_JOINED_SESSION",
  DEVICE_LEFT_SESSION: "DEVICE_LEFT_SESSION",
  TASK_AVAILABLE: "TASK_AVAILABLE",
  TASK_CLAIMED: "TASK_CLAIMED",
  TASK_LOCKED_SOFT: "TASK_LOCKED_SOFT",
  TASK_RELEASED: "TASK_RELEASED",
  TASK_TAKEOVER_REQUESTED: "TASK_TAKEOVER_REQUESTED",
  TASK_TAKEN_OVER: "TASK_TAKEN_OVER",
  TASK_HANDOFF_RECORDED: "TASK_HANDOFF_RECORDED",
  TASK_CONFLICT_DETECTED: "TASK_CONFLICT_DETECTED",
  TASK_CONFLICT_REVIEW_REQUIRED: "TASK_CONFLICT_REVIEW_REQUIRED",
  TASK_CONFLICT_RESOLVED: "TASK_CONFLICT_RESOLVED",
  TASK_DUPLICATE_BLOCKED: "TASK_DUPLICATE_BLOCKED",
  TASK_VIEW_ONLY_REMOTE_OWNER: "TASK_VIEW_ONLY_REMOTE_OWNER",
};

export const COLLABORATION_CONFLICT_TYPES = {
  DUPLICATE_TASK_CLAIM: "DUPLICATE_TASK_CLAIM",
  REMOTE_OWNER_EDIT_ATTEMPT: "REMOTE_OWNER_EDIT_ATTEMPT",
  DUPLICATE_APPROVAL_ATTEMPT: "DUPLICATE_APPROVAL_ATTEMPT",
  QUANTITY_MISMATCH: "QUANTITY_MISMATCH",
  STATUS_MISMATCH: "STATUS_MISMATCH",
  TAKEOVER_WITHOUT_PERMISSION: "TAKEOVER_WITHOUT_PERMISSION",
  SHIFT_CONTEXT_MISMATCH: "SHIFT_CONTEXT_MISMATCH",
  DEVICE_CONTEXT_MISMATCH: "DEVICE_CONTEXT_MISMATCH",
};

export const TASK_TYPES = {
  REPLENISHMENT: "REPLENISHMENT",
  SHELF_TICKET: "SHELF_TICKET",
  MARKDOWN_APPROVAL: "MARKDOWN_APPROVAL",
  WASTE_REVIEW: "WASTE_REVIEW",
  RECEIVING_BATCH: "RECEIVING_BATCH",
  STOCK_COUNT_ZONE: "STOCK_COUNT_ZONE",
  EXCEPTION_REVIEW: "EXCEPTION_REVIEW",
};

const DEMO_REMOTE_ACTORS = {
  staff2: {
    userId: "staff_002",
    userName: "Staff 2 Preview",
    role: "Staff",
    deviceId: "HH-002",
    deviceLabel: "HH-002",
    sessionId: "session_collab_staff_002",
    shiftId: "shift_pilot_morning_001",
    shiftLabel: "Morning Shift",
  },
  supervisor: {
    userId: "supervisor_001",
    userName: "Supervisor Preview",
    role: "Supervisor",
    deviceId: "HH-003",
    deviceLabel: "HH-003",
    sessionId: "session_collab_supervisor_001",
    shiftId: "shift_pilot_morning_001",
    shiftLabel: "Morning Shift",
  },
  manager: {
    userId: "manager_001",
    userName: "Manager Preview",
    role: "Manager",
    deviceId: "HH-004",
    deviceLabel: "HH-004",
    sessionId: "session_collab_manager_001",
    shiftId: "shift_pilot_morning_001",
    shiftLabel: "Morning Shift",
  },
};

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function roleLevel(role) {
  return { Staff: 1, Supervisor: 2, Manager: 3, Admin: 4 }[role] || 1;
}

function safeRead(fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn("Unable to read ScanOps collaboration state", error);
    return fallback;
  }
}

function safeWrite(state) {
  const bounded = {
    ...state,
    tasks: (state.tasks || []).slice(0, MAX_TASKS),
    events: (state.events || []).slice(0, MAX_EVENTS),
    updatedAt: nowIso(),
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bounded));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: bounded }));
    } catch (error) {
      console.warn("Unable to persist ScanOps collaboration state", error);
    }
  }
  return bounded;
}

function currentParticipant(context = getScanOpsGovernanceContext()) {
  return {
    userId: context.currentUserId || "staff_001",
    userName: context.currentUserName || "Staff 1 Preview",
    role: context.currentUserRole || "Staff",
    deviceId: "HH-001",
    deviceLabel: "HH-001",
    realDeviceId: context.deviceId || "HH-SCANOPS-001",
    sessionId: context.sessionId || "session_scanops_pilot_001",
    shiftId: context.shiftId || "shift_pilot_morning_001",
    shiftLabel: context.shiftLabel || "Morning Shift",
    storeId: context.storeId || "store_001",
    storeName: context.storeName || "Pilot Test Store",
    locationId: context.locationId || "grocery",
    locationName: context.locationName || "Grocery",
  };
}

export function getDemoCollaborationDevices(context = getScanOpsGovernanceContext()) {
  const current = currentParticipant(context);
  return [
    {
      deviceId: "HH-001",
      deviceLabel: "HH-001",
      userId: current.userId,
      userName: current.userName,
      role: current.role,
      sessionId: current.sessionId,
      shiftId: current.shiftId,
      shiftLabel: current.shiftLabel,
      status: "Active",
      isCurrentDevice: true,
      helper: "You · current pilot device",
    },
  ];
}

function baseTask(input = {}) {
  const now = input.createdAt || nowIso();
  return {
    collaborationVersion: COLLABORATION_VERSION,
    taskId: input.taskId || makeId("collab_task"),
    taskType: input.taskType || TASK_TYPES.EXCEPTION_REVIEW,
    taskLabel: input.taskLabel || "Shared store task",
    taskSummary: input.taskSummary || "Local collaboration preview task",
    sourceWorkflow: input.sourceWorkflow || "Session Collaboration",
    sourceRecordId: input.sourceRecordId || null,

    ownershipStatus: input.ownershipStatus || COLLABORATION_STATES.TASK_AVAILABLE,
    ownerUserId: input.ownerUserId || null,
    ownerUserName: input.ownerUserName || null,
    ownerRole: input.ownerRole || null,
    ownerDeviceId: input.ownerDeviceId || null,
    ownerSessionId: input.ownerSessionId || null,
    ownerShiftId: input.ownerShiftId || null,
    ownerShiftLabel: input.ownerShiftLabel || null,

    claimedAt: input.claimedAt || null,
    releasedAt: input.releasedAt || null,
    releasedBy: input.releasedBy || null,

    lockMode: input.lockMode || (input.ownerUserId ? "SOFT_OWNER_LOCK" : "NONE"),
    lockReason: input.lockReason || null,

    takeoverStatus: input.takeoverStatus || "NONE",
    takeoverRequestedBy: input.takeoverRequestedBy || null,
    takeoverReason: input.takeoverReason || null,
    takeoverNotes: input.takeoverNotes || null,
    takeoverApprovedBy: input.takeoverApprovedBy || null,
    takeoverAt: input.takeoverAt || null,

    conflictStatus: input.conflictStatus || "NONE",
    conflictReason: input.conflictReason || null,
    conflictRecordIds: input.conflictRecordIds || [],
    conflictRisk: input.conflictRisk || "LOW",
    conflictResolution: input.conflictResolution || null,
    conflictResolvedBy: input.conflictResolvedBy || null,
    conflictResolvedAt: input.conflictResolvedAt || null,

    syncStatus: input.syncStatus || GOVERNANCE_STATES.SYNC_DEFERRED,
    createdAt: now,
    updatedAt: input.updatedAt || now,
    ...input,
  };
}

function ownedTask(owner, input = {}) {
  return baseTask({
    ...input,
    ownershipStatus: input.ownershipStatus || COLLABORATION_STATES.TASK_CLAIMED,
    ownerUserId: owner.userId,
    ownerUserName: owner.userName,
    ownerRole: owner.role,
    ownerDeviceId: owner.deviceId,
    ownerSessionId: owner.sessionId,
    ownerShiftId: owner.shiftId,
    ownerShiftLabel: owner.shiftLabel,
    claimedAt: input.claimedAt || nowIso(),
    lockMode: input.lockMode || "SOFT_OWNER_LOCK",
    lockReason: input.lockReason || "Task is claimed by another device.",
  });
}

function defaultState(context = getScanOpsGovernanceContext()) {
  const devices = getDemoCollaborationDevices(context);
  const createdAt = nowIso();

  return {
    collaborationVersion: COLLABORATION_VERSION,
    session: {
      collaborationSessionId: "collab_store_ops_session_pilot_001",
      state: COLLABORATION_STATES.COLLAB_SESSION_DEFERRED,
      label: "Store Ops Session",
      mode: "Pilot local device only",
      syncStatus: GOVERNANCE_STATES.SYNC_DEFERRED,
      syncLabel: "Sync deferred until desktop contract",
      transportImplemented: false,
      storeId: context.storeId,
      storeName: context.storeName,
      locationId: context.locationId,
      locationName: context.locationName,
      createdAt,
      updatedAt: createdAt,
    },
    devices,
    tasks: [],
    events: [],
    createdAt,
    updatedAt: createdAt,
  };
}

function readState() {
  const context = getScanOpsGovernanceContext();
  const fallback = defaultState(context);
  const stored = safeRead(null);
  if (!stored || stored.collaborationVersion !== COLLABORATION_VERSION) return safeWrite(fallback);
  const currentDevices = getDemoCollaborationDevices(context);
  return {
    ...stored,
    devices: currentDevices,
    session: {
      ...fallback.session,
      ...(stored.session || {}),
      storeId: context.storeId,
      storeName: context.storeName,
      locationId: context.locationId,
      locationName: context.locationName,
      syncStatus: GOVERNANCE_STATES.SYNC_DEFERRED,
      syncLabel: "Sync deferred until desktop contract",
      transportImplemented: false,
    },
  };
}

function makeEvent(eventType, payload = {}, context = getScanOpsGovernanceContext()) {
  const actor = currentParticipant(context);
  return {
    eventId: payload.eventId || makeId("collab_evt"),
    eventVersion: COLLABORATION_EVENT_VERSION,
    eventType,
    eventLabel: payload.eventLabel || eventType,

    taskId: payload.taskId || null,
    taskType: payload.taskType || null,
    sourceWorkflow: payload.sourceWorkflow || "Session Collaboration",
    sourceRecordId: payload.sourceRecordId || null,

    actorId: payload.actorId || actor.userId,
    actorName: payload.actorName || actor.userName,
    actorRole: payload.actorRole || actor.role,

    deviceId: payload.deviceId || actor.deviceId,
    realDeviceId: payload.realDeviceId || actor.realDeviceId,
    sessionId: payload.sessionId || actor.sessionId,
    shiftId: payload.shiftId || actor.shiftId,
    shiftLabel: payload.shiftLabel || actor.shiftLabel,
    storeId: payload.storeId || actor.storeId,
    locationId: payload.locationId || actor.locationId,

    previousOwnerUserId: payload.previousOwnerUserId || null,
    newOwnerUserId: payload.newOwnerUserId || null,

    actionAllowed: payload.actionAllowed ?? true,
    blockedReason: payload.blockedReason || null,
    requiredRole: payload.requiredRole || null,

    conflictStatus: payload.conflictStatus || null,
    syncStatus: payload.syncStatus || GOVERNANCE_STATES.SYNC_DEFERRED,
    createdAt: payload.createdAt || nowIso(),
    ...payload,
  };
}

function updateTask(task, patch = {}) {
  return { ...task, ...patch, updatedAt: nowIso(), syncStatus: GOVERNANCE_STATES.SYNC_DEFERRED };
}

function persistTaskAction(taskId, eventType, taskPatch, eventPayload = {}) {
  const state = readState();
  const context = getScanOpsGovernanceContext();
  const currentTask = state.tasks.find((task) => task.taskId === taskId);
  if (!currentTask) return { ok: false, reason: "Task not found.", state };
  const nextTask = updateTask(currentTask, taskPatch);
  const event = makeEvent(eventType, {
    taskId: nextTask.taskId,
    taskType: nextTask.taskType,
    sourceWorkflow: nextTask.sourceWorkflow,
    sourceRecordId: nextTask.sourceRecordId,
    syncStatus: nextTask.syncStatus,
    ...eventPayload,
  }, context);
  const next = safeWrite({
    ...state,
    tasks: [nextTask, ...state.tasks.filter((task) => task.taskId !== taskId)],
    events: [event, ...state.events],
  });
  return { ok: true, task: nextTask, event, state: next };
}

function guarded(actionKey) {
  const context = getScanOpsGovernanceContext();
  return { context, result: canPerformScanOpsAction(actionKey, context) };
}

function recordBlocked(actionKey, task, result, eventLabel, eventType = "ACTION_BLOCKED") {
  recordGovernedAction(actionKey, task.sourceWorkflow || "Session Collaboration", task.taskId, result, {
    eventLabel,
    syncStatus: GOVERNANCE_STATES.SYNC_DEFERRED,
  });
  return persistTaskAction(task.taskId, eventType, {}, {
    eventLabel,
    actionAllowed: false,
    blockedReason: result.reason,
    requiredRole: result.requiredRole,
  });
}

export function getScanOpsCollaborationState() {
  return readState();
}

export function getCollaborationEvents() {
  return readState().events || [];
}

export function getCollaborationTasks() {
  return readState().tasks || [];
}

export function resetScanOpsCollaborationDemoState() {
  const next = defaultState(getScanOpsGovernanceContext());
  return safeWrite(next);
}

export function claimCollaborationTask(taskId) {
  const state = readState();
  const task = state.tasks.find((entry) => entry.taskId === taskId);
  if (!task) return { ok: false, reason: "Task not found.", state };
  const { context, result } = guarded(GOVERNED_ACTIONS.COLLAB_TASK_CLAIM);
  if (!result.allowed) return recordBlocked(GOVERNED_ACTIONS.COLLAB_TASK_CLAIM, task, result, "Claim task blocked");

  if (task.ownerUserId && task.ownerUserId !== context.currentUserId) {
    const conflict = persistTaskAction(task.taskId, COLLABORATION_STATES.TASK_DUPLICATE_BLOCKED, {
      conflictStatus: COLLABORATION_STATES.TASK_CONFLICT_REVIEW_REQUIRED,
      conflictReason: COLLABORATION_CONFLICT_TYPES.DUPLICATE_TASK_CLAIM,
      conflictRisk: task.conflictRisk === "HIGH" ? "HIGH" : "LOW",
    }, {
      eventLabel: "Duplicate task claim blocked",
      actionAllowed: false,
      blockedReason: "Task owned by another device.",
      conflictStatus: COLLABORATION_STATES.TASK_CONFLICT_REVIEW_REQUIRED,
      previousOwnerUserId: task.ownerUserId,
    });
    return { ...conflict, ok: false, reason: "Task owned by another device." };
  }

  const actor = currentParticipant(context);
  recordGovernedAction(GOVERNED_ACTIONS.COLLAB_TASK_CLAIM, task.sourceWorkflow, task.taskId, result, { eventLabel: "Collaboration task claim" });
  return persistTaskAction(task.taskId, COLLABORATION_STATES.TASK_CLAIMED, {
    ownershipStatus: COLLABORATION_STATES.TASK_CLAIMED,
    ownerUserId: actor.userId,
    ownerUserName: actor.userName,
    ownerRole: actor.role,
    ownerDeviceId: actor.deviceId,
    ownerSessionId: actor.sessionId,
    ownerShiftId: actor.shiftId,
    ownerShiftLabel: actor.shiftLabel,
    claimedAt: nowIso(),
    releasedAt: null,
    releasedBy: null,
    lockMode: "SOFT_OWNER_LOCK",
    lockReason: "Claimed by current pilot device.",
  }, {
    eventLabel: `${actor.userName} claimed ${task.taskLabel}`,
    previousOwnerUserId: task.ownerUserId,
    newOwnerUserId: actor.userId,
  });
}

export function releaseCollaborationTask(taskId) {
  const state = readState();
  const task = state.tasks.find((entry) => entry.taskId === taskId);
  if (!task) return { ok: false, reason: "Task not found.", state };
  const context = getScanOpsGovernanceContext();
  const isOwnTask = task.ownerUserId === context.currentUserId || task.ownerDeviceId === "HH-001";
  const actionKey = isOwnTask ? GOVERNED_ACTIONS.COLLAB_TASK_RELEASE_OWN : GOVERNED_ACTIONS.COLLAB_TASK_RELEASE_OTHER;
  const result = canPerformScanOpsAction(actionKey, context);
  if (!result.allowed) return recordBlocked(actionKey, task, result, "Release task blocked");

  recordGovernedAction(actionKey, task.sourceWorkflow, task.taskId, result, { eventLabel: isOwnTask ? "Release own collaboration task" : "Release other collaboration task" });
  return persistTaskAction(task.taskId, COLLABORATION_STATES.TASK_RELEASED, {
    ownershipStatus: COLLABORATION_STATES.TASK_AVAILABLE,
    ownerUserId: null,
    ownerUserName: null,
    ownerRole: null,
    ownerDeviceId: null,
    ownerSessionId: null,
    ownerShiftId: null,
    ownerShiftLabel: null,
    releasedAt: nowIso(),
    releasedBy: context.currentUserName,
    lockMode: "NONE",
    lockReason: null,
  }, {
    eventLabel: `${context.currentUserName} released ${task.taskLabel}`,
    previousOwnerUserId: task.ownerUserId,
    newOwnerUserId: null,
  });
}

export function requestCollaborationTakeover(taskId, reason = "Owner away from device", notes = "") {
  const state = readState();
  const task = state.tasks.find((entry) => entry.taskId === taskId);
  if (!task) return { ok: false, reason: "Task not found.", state };
  const { context, result } = guarded(GOVERNED_ACTIONS.COLLAB_TASK_TAKEOVER_REQUEST);
  if (!result.allowed) return recordBlocked(GOVERNED_ACTIONS.COLLAB_TASK_TAKEOVER_REQUEST, task, result, "Takeover request blocked");

  recordGovernedAction(GOVERNED_ACTIONS.COLLAB_TASK_TAKEOVER_REQUEST, task.sourceWorkflow, task.taskId, result, { eventLabel: "Takeover requested" });
  return persistTaskAction(task.taskId, COLLABORATION_STATES.TASK_TAKEOVER_REQUESTED, {
    takeoverStatus: COLLABORATION_STATES.TASK_TAKEOVER_REQUESTED,
    takeoverRequestedBy: context.currentUserName,
    takeoverReason: reason,
    takeoverNotes: notes,
  }, {
    eventLabel: `${context.currentUserName} requested takeover`,
    previousOwnerUserId: task.ownerUserId,
    newOwnerUserId: task.ownerUserId,
  });
}

export function approveCollaborationTakeover(taskId, reason = "Approved takeover") {
  const state = readState();
  const task = state.tasks.find((entry) => entry.taskId === taskId);
  if (!task) return { ok: false, reason: "Task not found.", state };
  const { context, result } = guarded(GOVERNED_ACTIONS.COLLAB_TASK_TAKEOVER_APPROVE);
  if (!result.allowed) return recordBlocked(GOVERNED_ACTIONS.COLLAB_TASK_TAKEOVER_APPROVE, task, result, "Takeover blocked");

  const actor = currentParticipant(context);
  recordGovernedAction(GOVERNED_ACTIONS.COLLAB_TASK_TAKEOVER_APPROVE, task.sourceWorkflow, task.taskId, result, { eventLabel: "Takeover approved" });
  return persistTaskAction(task.taskId, COLLABORATION_STATES.TASK_TAKEN_OVER, {
    ownershipStatus: COLLABORATION_STATES.TASK_CLAIMED,
    ownerUserId: actor.userId,
    ownerUserName: actor.userName,
    ownerRole: actor.role,
    ownerDeviceId: actor.deviceId,
    ownerSessionId: actor.sessionId,
    ownerShiftId: actor.shiftId,
    ownerShiftLabel: actor.shiftLabel,
    claimedAt: nowIso(),
    lockMode: "SOFT_OWNER_LOCK",
    lockReason: "Taken over with elevated approval.",
    takeoverStatus: COLLABORATION_STATES.TASK_TAKEN_OVER,
    takeoverApprovedBy: context.currentUserName,
    takeoverReason: reason || task.takeoverReason,
    takeoverAt: nowIso(),
  }, {
    eventLabel: `${context.currentUserName} took over ${task.taskLabel}`,
    previousOwnerUserId: task.ownerUserId,
    newOwnerUserId: actor.userId,
  });
}

export function forceReleaseCollaborationTask(taskId) {
  const state = readState();
  const task = state.tasks.find((entry) => entry.taskId === taskId);
  if (!task) return { ok: false, reason: "Task not found.", state };
  const { context, result } = guarded(GOVERNED_ACTIONS.COLLAB_TASK_FORCE_RELEASE);
  if (!result.allowed) return recordBlocked(GOVERNED_ACTIONS.COLLAB_TASK_FORCE_RELEASE, task, result, "Force release blocked");

  recordGovernedAction(GOVERNED_ACTIONS.COLLAB_TASK_FORCE_RELEASE, task.sourceWorkflow, task.taskId, result, { eventLabel: "Force release collaboration task" });
  return persistTaskAction(task.taskId, COLLABORATION_STATES.TASK_RELEASED, {
    ownershipStatus: COLLABORATION_STATES.TASK_AVAILABLE,
    ownerUserId: null,
    ownerUserName: null,
    ownerRole: null,
    ownerDeviceId: null,
    ownerSessionId: null,
    ownerShiftId: null,
    ownerShiftLabel: null,
    releasedAt: nowIso(),
    releasedBy: context.currentUserName,
    lockMode: "NONE",
    lockReason: null,
  }, {
    eventLabel: `${context.currentUserName} force-released ${task.taskLabel}`,
    previousOwnerUserId: task.ownerUserId,
    newOwnerUserId: null,
  });
}

export function resolveCollaborationConflict(taskId, resolution = "KEEP_FIRST") {
  const state = readState();
  const task = state.tasks.find((entry) => entry.taskId === taskId);
  if (!task) return { ok: false, reason: "Task not found.", state };
  const actionKey = task.conflictRisk === "HIGH" ? GOVERNED_ACTIONS.COLLAB_CONFLICT_RESOLVE_HIGH : GOVERNED_ACTIONS.COLLAB_CONFLICT_RESOLVE;
  const { context, result } = { context: getScanOpsGovernanceContext(), result: canPerformScanOpsAction(actionKey) };
  if (!result.allowed) return recordBlocked(actionKey, task, result, "Conflict resolution blocked");

  recordGovernedAction(actionKey, task.sourceWorkflow, task.taskId, result, { eventLabel: "Collaboration conflict resolved" });
  return persistTaskAction(task.taskId, COLLABORATION_STATES.TASK_CONFLICT_RESOLVED, {
    ownershipStatus: COLLABORATION_STATES.TASK_AVAILABLE,
    conflictStatus: COLLABORATION_STATES.TASK_CONFLICT_RESOLVED,
    conflictResolution: resolution,
    conflictResolvedBy: context.currentUserName,
    conflictResolvedAt: nowIso(),
    lockMode: "NONE",
    lockReason: null,
  }, {
    eventLabel: `Conflict resolved · ${resolution}`,
    conflictStatus: COLLABORATION_STATES.TASK_CONFLICT_RESOLVED,
  });
}

export function detectRemoteOwnerEditAttempt(taskId) {
  const state = readState();
  const task = state.tasks.find((entry) => entry.taskId === taskId);
  if (!task) return { ok: false, reason: "Task not found.", state };
  const context = getScanOpsGovernanceContext();
  const ownedByOther = Boolean(task.ownerUserId && task.ownerUserId !== context.currentUserId && task.ownerDeviceId !== "HH-001");
  if (!ownedByOther) return { ok: true, task, state };
  return persistTaskAction(task.taskId, COLLABORATION_STATES.TASK_VIEW_ONLY_REMOTE_OWNER, {
    conflictStatus: COLLABORATION_STATES.TASK_CONFLICT_REVIEW_REQUIRED,
    conflictReason: COLLABORATION_CONFLICT_TYPES.REMOTE_OWNER_EDIT_ATTEMPT,
  }, {
    eventLabel: "Remote-owned task edit blocked",
    actionAllowed: false,
    blockedReason: "Task owned by another device.",
    conflictStatus: COLLABORATION_STATES.TASK_CONFLICT_REVIEW_REQUIRED,
  });
}

export function registerCollaborationTaskForRecord({ taskId, taskType, taskLabel, taskSummary, sourceWorkflow, sourceRecordId, ownerMode = "current", conflictRisk = "LOW" } = {}) {
  if (!taskId && !sourceRecordId) return null;
  const state = readState();
  const existing = state.tasks.find((task) => task.taskId === taskId || (sourceRecordId && task.sourceRecordId === sourceRecordId));
  if (existing) return existing;
  const context = getScanOpsGovernanceContext();
  const actor = currentParticipant(context);
  const ownerPatch = ownerMode === "current" ? {
    ownershipStatus: COLLABORATION_STATES.TASK_CLAIMED,
    ownerUserId: actor.userId,
    ownerUserName: actor.userName,
    ownerRole: actor.role,
    ownerDeviceId: actor.deviceId,
    ownerSessionId: actor.sessionId,
    ownerShiftId: actor.shiftId,
    ownerShiftLabel: actor.shiftLabel,
    claimedAt: nowIso(),
    lockMode: "SOFT_OWNER_LOCK",
    lockReason: "Created and owned by current pilot device.",
  } : {};
  const task = baseTask({
    taskId: taskId || `task_${sourceRecordId}`,
    taskType: taskType || TASK_TYPES.EXCEPTION_REVIEW,
    taskLabel: taskLabel || "Collaboration-aware task",
    taskSummary: taskSummary || "Created by a collaboration-aware ScanOps workflow.",
    sourceWorkflow: sourceWorkflow || "ScanOps",
    sourceRecordId,
    conflictRisk,
    ...ownerPatch,
  });
  const event = makeEvent(COLLABORATION_STATES.TASK_CLAIMED, {
    eventLabel: `${actor.userName} created collaboration task`,
    taskId: task.taskId,
    taskType: task.taskType,
    sourceWorkflow: task.sourceWorkflow,
    sourceRecordId: task.sourceRecordId,
    newOwnerUserId: task.ownerUserId,
  }, context);
  safeWrite({ ...state, tasks: [task, ...state.tasks], events: [event, ...state.events] });
  return task;
}

export function decorateWithCollaboration(taskOrRecord = {}, sourceWorkflow = "ScanOps") {
  const id = taskOrRecord.taskId || taskOrRecord.requestId || taskOrRecord.reviewId || taskOrRecord.replenishmentTaskId || taskOrRecord.id;
  if (!id) return taskOrRecord;
  const tasks = getCollaborationTasks();
  const task = tasks.find((entry) => entry.sourceRecordId === id || entry.taskId === `task_${id}`);
  if (!task) return taskOrRecord;
  return {
    ...taskOrRecord,
    collaborationVersion: COLLABORATION_VERSION,
    collaborationTaskId: task.taskId,
    collaborationOwnershipStatus: task.ownershipStatus,
    collaborationOwnerUserName: task.ownerUserName,
    collaborationOwnerRole: task.ownerRole,
    collaborationOwnerDeviceId: task.ownerDeviceId,
    collaborationLockMode: task.lockMode,
    collaborationSyncStatus: task.syncStatus,
    collaborationSourceWorkflow: sourceWorkflow,
  };
}

export function canCurrentUserEditCollaborationTask(task) {
  if (!task) return { editable: true, reason: "No collaboration task linked." };
  const context = getScanOpsGovernanceContext();
  if (!task.ownerUserId) return { editable: true, reason: "Task is available." };
  if (task.ownerUserId === context.currentUserId || task.ownerDeviceId === "HH-001") return { editable: true, reason: "Current device owns this task." };
  return {
    editable: false,
    reason: `${task.ownerUserName || "Another user"} on ${task.ownerDeviceId || "another device"} is currently working on this task.`,
  };
}

export function collaborationStatusForRecord(sourceRecordId) {
  if (!sourceRecordId) return null;
  return getCollaborationTasks().find((task) => task.sourceRecordId === sourceRecordId || task.taskId === `task_${sourceRecordId}`) || null;
}

export function useScanOpsCollaboration() {
  const [state, setState] = useState(() => getScanOpsCollaborationState());

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const refresh = () => setState(getScanOpsCollaborationState());
    window.addEventListener(EVENT_NAME, refresh);
    window.addEventListener("scanops-governance-context-updated", refresh);
    window.addEventListener("scanops-session-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT_NAME, refresh);
      window.removeEventListener("scanops-governance-context-updated", refresh);
      window.removeEventListener("scanops-session-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return useMemo(() => state, [state]);
}
