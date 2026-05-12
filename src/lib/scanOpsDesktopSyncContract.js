import { useEffect, useMemo, useState } from "react";
import { COLLABORATION_STATES, COLLABORATION_VERSION, getCollaborationTasks } from "./scanOpsCollaboration";
import { GOVERNANCE_STATES, getScanOpsGovernanceContext } from "./scanOpsGovernance";

export const DESKTOP_SYNC_CONTRACT_VERSION = "SCANOPS_DESKTOP_SYNC_V1";
export const DESKTOP_SYNC_RESPONSE_VERSION = "INVYRA_DESKTOP_SYNC_RESPONSE_V1";
export const DESKTOP_SYNC_EVENT = "scanops-desktop-sync-contract-updated";

export const DESKTOP_SYNC_STATUSES = {
  SYNC_NOT_CONNECTED: "SYNC_NOT_CONNECTED",
  SYNC_CONTRACT_PREVIEW: "SYNC_CONTRACT_PREVIEW",
  SYNC_QUEUED: "SYNC_QUEUED",
  SYNC_VALIDATING: "SYNC_VALIDATING",
  SYNC_VALID: "SYNC_VALID",
  SYNC_INVALID: "SYNC_INVALID",
  SYNC_DEFERRED: "SYNC_DEFERRED",
  SYNC_RETRY_PENDING: "SYNC_RETRY_PENDING",
  SYNC_ACCEPTED_FOR_REVIEW: "SYNC_ACCEPTED_FOR_REVIEW",
  SYNC_BLOCKED_CONFLICT: "SYNC_BLOCKED_CONFLICT",
  SYNC_BLOCKED_PERMISSION: "SYNC_BLOCKED_PERMISSION",
  SYNC_BLOCKED_STALE_TASK: "SYNC_BLOCKED_STALE_TASK",
  SYNC_BLOCKED_SCHEMA: "SYNC_BLOCKED_SCHEMA",
  SYNC_ACKNOWLEDGED: "SYNC_ACKNOWLEDGED",
  SYNC_REJECTED: "SYNC_REJECTED",
  SYNC_LOCAL_ONLY: "SYNC_LOCAL_ONLY",
};

export const DESKTOP_RESPONSE_STATUSES = {
  DESKTOP_ACCEPTED_FOR_REVIEW: "DESKTOP_ACCEPTED_FOR_REVIEW",
  DESKTOP_ACKNOWLEDGED: "DESKTOP_ACKNOWLEDGED",
  DESKTOP_REJECTED_SCHEMA: "DESKTOP_REJECTED_SCHEMA",
  DESKTOP_REJECTED_PERMISSION: "DESKTOP_REJECTED_PERMISSION",
  DESKTOP_REJECTED_CONFLICT: "DESKTOP_REJECTED_CONFLICT",
  DESKTOP_REJECTED_STALE_TASK: "DESKTOP_REJECTED_STALE_TASK",
  DESKTOP_REQUIRES_MANAGER_REVIEW: "DESKTOP_REQUIRES_MANAGER_REVIEW",
  DESKTOP_REQUIRES_PRINT_REVIEW: "DESKTOP_REQUIRES_PRINT_REVIEW",
  DESKTOP_REQUIRES_PRICE_REVIEW: "DESKTOP_REQUIRES_PRICE_REVIEW",
  DESKTOP_REQUIRES_WASTE_REVIEW: "DESKTOP_REQUIRES_WASTE_REVIEW",
  DESKTOP_LOCAL_ONLY_PREVIEW: "DESKTOP_LOCAL_ONLY_PREVIEW",
};

export const DESKTOP_SYNC_EVENT_TYPES = {
  REPLENISHMENT_TASK_CLAIMED: "REPLENISHMENT_TASK_CLAIMED",
  REPLENISHMENT_PICK_STARTED: "REPLENISHMENT_PICK_STARTED",
  REPLENISHMENT_SHELF_FILL_RECORDED: "REPLENISHMENT_SHELF_FILL_RECORDED",
  REPLENISHMENT_TASK_COMPLETED: "REPLENISHMENT_TASK_COMPLETED",
  REPLENISHMENT_EXCEPTION_RECORDED: "REPLENISHMENT_EXCEPTION_RECORDED",
  PRICE_CHECK_COMPLETED: "PRICE_CHECK_COMPLETED",
  PRICE_MISMATCH_REPORTED: "PRICE_MISMATCH_REPORTED",
  PROMO_LABEL_MATCH_CONFIRMED: "PROMO_LABEL_MATCH_CONFIRMED",
  PROMO_LABEL_MISMATCH_REPORTED: "PROMO_LABEL_MISMATCH_REPORTED",
  SHELF_TICKET_REQUESTED: "SHELF_TICKET_REQUESTED",
  SHELF_TICKET_BATCH_READY: "SHELF_TICKET_BATCH_READY",
  SHELF_TICKET_PRINT_REVIEW_REQUIRED: "SHELF_TICKET_PRINT_REVIEW_REQUIRED",
  SHELF_TICKET_MARKED_PRINTED_LOCAL: "SHELF_TICKET_MARKED_PRINTED_LOCAL",
  MARKDOWN_REVIEW_STARTED: "MARKDOWN_REVIEW_STARTED",
  MARKDOWN_APPROVAL_REQUESTED: "MARKDOWN_APPROVAL_REQUESTED",
  MARKDOWN_APPROVED_FOR_REVIEW: "MARKDOWN_APPROVED_FOR_REVIEW",
  MARKDOWN_REJECTED_LOCAL: "MARKDOWN_REJECTED_LOCAL",
  MARKDOWN_CONFLICT_REVIEW_REQUIRED: "MARKDOWN_CONFLICT_REVIEW_REQUIRED",
  WASTE_REVIEW_SUBMITTED: "WASTE_REVIEW_SUBMITTED",
  WASTE_SHRINK_EXCEPTION_RECORDED: "WASTE_SHRINK_EXCEPTION_RECORDED",
  WASTE_QUANTITY_CONFLICT_REPORTED: "WASTE_QUANTITY_CONFLICT_REPORTED",
  WASTE_MANAGER_REVIEW_REQUIRED: "WASTE_MANAGER_REVIEW_REQUIRED",
  DEVICE_SESSION_STARTED: "DEVICE_SESSION_STARTED",
  SHIFT_CONTEXT_CONFIRMED: "SHIFT_CONTEXT_CONFIRMED",
  PERMISSION_ACTION_ALLOWED: "PERMISSION_ACTION_ALLOWED",
  PERMISSION_ACTION_BLOCKED: "PERMISSION_ACTION_BLOCKED",
  COLLAB_TASK_CLAIMED: "COLLAB_TASK_CLAIMED",
  COLLAB_TASK_RELEASED: "COLLAB_TASK_RELEASED",
  COLLAB_TAKEOVER_REQUESTED: "COLLAB_TAKEOVER_REQUESTED",
  COLLAB_TASK_TAKEN_OVER: "COLLAB_TASK_TAKEN_OVER",
  COLLAB_CONFLICT_DETECTED: "COLLAB_CONFLICT_DETECTED",
  COLLAB_CONFLICT_REVIEW_REQUIRED: "COLLAB_CONFLICT_REVIEW_REQUIRED",
  COLLAB_CONFLICT_RESOLVED_LOCAL: "COLLAB_CONFLICT_RESOLVED_LOCAL",
};

export const WORKFLOW_SYNC_CONTRACTS = [
  {
    stage: "AA",
    workflow: "Replenishment",
    eventTypes: [
      DESKTOP_SYNC_EVENT_TYPES.REPLENISHMENT_TASK_CLAIMED,
      DESKTOP_SYNC_EVENT_TYPES.REPLENISHMENT_PICK_STARTED,
      DESKTOP_SYNC_EVENT_TYPES.REPLENISHMENT_SHELF_FILL_RECORDED,
      DESKTOP_SYNC_EVENT_TYPES.REPLENISHMENT_TASK_COMPLETED,
      DESKTOP_SYNC_EVENT_TYPES.REPLENISHMENT_EXCEPTION_RECORDED,
    ],
    desktopBehavior: "Task evidence only. Stock is not mutated automatically.",
  },
  {
    stage: "AB",
    workflow: "Price Check / Promo Check",
    eventTypes: [
      DESKTOP_SYNC_EVENT_TYPES.PRICE_CHECK_COMPLETED,
      DESKTOP_SYNC_EVENT_TYPES.PRICE_MISMATCH_REPORTED,
      DESKTOP_SYNC_EVENT_TYPES.PROMO_LABEL_MATCH_CONFIRMED,
      DESKTOP_SYNC_EVENT_TYPES.PROMO_LABEL_MISMATCH_REPORTED,
    ],
    desktopBehavior: "Mismatch evidence routes to review. Prices and promotions stay unchanged.",
  },
  {
    stage: "AC",
    workflow: "Shelf Ticket Queue",
    eventTypes: [
      DESKTOP_SYNC_EVENT_TYPES.SHELF_TICKET_REQUESTED,
      DESKTOP_SYNC_EVENT_TYPES.SHELF_TICKET_BATCH_READY,
      DESKTOP_SYNC_EVENT_TYPES.SHELF_TICKET_PRINT_REVIEW_REQUIRED,
      DESKTOP_SYNC_EVENT_TYPES.SHELF_TICKET_MARKED_PRINTED_LOCAL,
    ],
    desktopBehavior: "Print-ready contract only. Desktop controls real printer routing later.",
  },
  {
    stage: "AD",
    workflow: "Markdown Approval",
    eventTypes: [
      DESKTOP_SYNC_EVENT_TYPES.MARKDOWN_REVIEW_STARTED,
      DESKTOP_SYNC_EVENT_TYPES.MARKDOWN_APPROVAL_REQUESTED,
      DESKTOP_SYNC_EVENT_TYPES.MARKDOWN_APPROVED_FOR_REVIEW,
      DESKTOP_SYNC_EVENT_TYPES.MARKDOWN_REJECTED_LOCAL,
      DESKTOP_SYNC_EVENT_TYPES.MARKDOWN_CONFLICT_REVIEW_REQUIRED,
    ],
    desktopBehavior: "Approval evidence can be reviewed. Live price mutation remains blocked.",
  },
  {
    stage: "AE",
    workflow: "Waste Review / Shrink Governance",
    eventTypes: [
      DESKTOP_SYNC_EVENT_TYPES.WASTE_REVIEW_SUBMITTED,
      DESKTOP_SYNC_EVENT_TYPES.WASTE_SHRINK_EXCEPTION_RECORDED,
      DESKTOP_SYNC_EVENT_TYPES.WASTE_QUANTITY_CONFLICT_REPORTED,
      DESKTOP_SYNC_EVENT_TYPES.WASTE_MANAGER_REVIEW_REQUIRED,
    ],
    desktopBehavior: "Waste and shrink evidence only. Accounting/write-off mutation remains blocked.",
  },
  {
    stage: "AF",
    workflow: "Device / User / Shift Governance",
    eventTypes: [
      DESKTOP_SYNC_EVENT_TYPES.DEVICE_SESSION_STARTED,
      DESKTOP_SYNC_EVENT_TYPES.SHIFT_CONTEXT_CONFIRMED,
      DESKTOP_SYNC_EVENT_TYPES.PERMISSION_ACTION_ALLOWED,
      DESKTOP_SYNC_EVENT_TYPES.PERMISSION_ACTION_BLOCKED,
    ],
    desktopBehavior: "Audit context only. User management is not mutated.",
  },
  {
    stage: "AG",
    workflow: "Session Collaboration",
    eventTypes: [
      DESKTOP_SYNC_EVENT_TYPES.COLLAB_TASK_CLAIMED,
      DESKTOP_SYNC_EVENT_TYPES.COLLAB_TASK_RELEASED,
      DESKTOP_SYNC_EVENT_TYPES.COLLAB_TAKEOVER_REQUESTED,
      DESKTOP_SYNC_EVENT_TYPES.COLLAB_TASK_TAKEN_OVER,
      DESKTOP_SYNC_EVENT_TYPES.COLLAB_CONFLICT_DETECTED,
      DESKTOP_SYNC_EVENT_TYPES.COLLAB_CONFLICT_REVIEW_REQUIRED,
      DESKTOP_SYNC_EVENT_TYPES.COLLAB_CONFLICT_RESOLVED_LOCAL,
    ],
    desktopBehavior: "Shared-work proof only. Unresolved conflicts block automatic acceptance.",
  },
];

const TASK_BASED_WORKFLOWS = new Set([
  "Replenishment",
  "Shelf Ticket Queue",
  "Markdown Approval",
  "Waste Review",
  "Session Collaboration",
]);

const REQUIRED_FIELDS = [
  "contractVersion",
  "eventId",
  "eventType",
  "sourceWorkflow",
  "deviceId",
  "sessionId",
  "shiftId",
  "actorId",
  "actorRole",
  "storeId",
  "locationId",
  "permissionResult",
  "payload",
  "syncStatus",
];

function nowIso() {
  return new Date().toISOString();
}

function readable(value) {
  return String(value || "").replaceAll("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

function buildCollaborationEnvelope(input = {}, context = getScanOpsGovernanceContext()) {
  const ownerName = input.ownerUserName || context.currentUserName || "Staff 1 Preview";
  const ownerRole = input.ownerRole || context.currentUserRole || "Staff";
  const conflictStatus = input.conflictStatus || "NONE";
  return {
    collaborationVersion: COLLABORATION_VERSION,
    ownershipStatus: input.ownershipStatus || COLLABORATION_STATES.TASK_CLAIMED,
    ownerUserId: input.ownerUserId || context.currentUserId || "staff_001",
    ownerUserName: ownerName,
    ownerRole,
    ownerDeviceId: input.ownerDeviceId || "HH-001",
    ownerSessionId: input.ownerSessionId || context.sessionId || "session_scanops_demo_001",
    ownerShiftId: input.ownerShiftId || context.shiftId || "shift_demo_morning_001",
    conflictStatus,
    conflictReason: input.conflictReason || null,
    handoffStatus: input.handoffStatus || "NONE",
  };
}

function buildEnvelope(input, context = getScanOpsGovernanceContext()) {
  const now = input.createdAt || nowIso();
  const permission = input.permission || {};
  return {
    contractVersion: DESKTOP_SYNC_CONTRACT_VERSION,
    eventId: input.eventId,
    eventType: input.eventType,
    eventLabel: input.eventLabel,
    sourceSystem: "SCANOPS_HANDHELD",
    targetSystem: "INVYRA_INVENTORY_DESKTOP",
    storeId: context.storeId || "store_001",
    storeName: context.storeName || "Invyra Demo Store",
    locationId: context.locationId || "grocery",
    locationLabel: context.locationName || "Grocery",
    deviceId: context.deviceId || "HH-SCANOPS-001",
    deviceLabel: context.deviceLabel || "HH-001",
    sessionId: context.sessionId || "session_scanops_demo_001",
    shiftId: context.shiftId || "shift_demo_morning_001",
    shiftLabel: context.shiftLabel || "Morning Shift",
    actorId: context.currentUserId || "staff_001",
    actorName: context.currentUserName || "Staff 1 Preview",
    actorRole: context.currentUserRole || "Staff",
    sourceWorkflow: input.sourceWorkflow,
    sourceRecordId: input.sourceRecordId,
    sourceTaskId: input.sourceTaskId || null,
    permissionResult: permission.permissionResult || GOVERNANCE_STATES.ACTION_ALLOWED,
    permissionKey: permission.permissionKey || input.permissionKey || "CONTRACT_PREVIEW_ALLOWED",
    actionAllowed: permission.actionAllowed !== false,
    blockedReason: permission.blockedReason || null,
    collaboration: input.collaboration || (TASK_BASED_WORKFLOWS.has(input.sourceWorkflow) ? buildCollaborationEnvelope({}, context) : null),
    payload: input.payload || {},
    validationStatus: input.validationStatus || "NOT_VALIDATED",
    syncStatus: input.syncStatus || DESKTOP_SYNC_STATUSES.SYNC_QUEUED,
    desktopReviewQueue: input.desktopReviewQueue || null,
    taskOwnerMustMatchSubmitter: Boolean(input.taskOwnerMustMatchSubmitter),
    duplicateApprovalAttempt: Boolean(input.duplicateApprovalAttempt),
    highRiskReview: Boolean(input.highRiskReview),
    mutationType: input.mutationType || "None",
    mutationAllowed: false,
    createdAt: now,
    updatedAt: input.updatedAt || now,
  };
}

export function getDesktopSyncContext() {
  const context = getScanOpsGovernanceContext();
  return {
    mode: "Contract Preview",
    transport: "Not connected",
    desktop: "Inventory Desktop Pending",
    syncStatus: DESKTOP_SYNC_STATUSES.SYNC_CONTRACT_PREVIEW,
    transportImplemented: false,
    desktopConnected: false,
    deviceId: context.deviceId || "HH-SCANOPS-001",
    deviceLabel: context.deviceLabel || "HH-001",
    actorName: context.currentUserName || "Staff 1 Preview",
    actorRole: context.currentUserRole || "Staff",
    shiftLabel: context.shiftLabel || "Morning Shift",
    storeName: context.storeName || "Invyra Demo Store",
    locationLabel: context.locationName || "Grocery",
  };
}

export function getDesktopSyncOutboundQueue() {
  const context = getScanOpsGovernanceContext();
  const collaborationTasks = getCollaborationTasks();
  const wasteConflict = collaborationTasks.find((task) => task.taskId === "task_waste_conflict_002");
  const replenish = collaborationTasks.find((task) => task.taskId === "task_replenish_aisle_3");

  return [
    buildEnvelope({
      eventId: "sync_evt_0007",
      eventType: DESKTOP_SYNC_EVENT_TYPES.SHELF_TICKET_BATCH_READY,
      eventLabel: "Shelf Ticket Batch #004",
      sourceWorkflow: "Shelf Ticket Queue",
      sourceRecordId: "shelf_ticket_batch_004",
      sourceTaskId: "task_shelf_ticket_batch_004",
      syncStatus: DESKTOP_SYNC_STATUSES.SYNC_QUEUED,
      desktopReviewQueue: "Desktop print queue review",
      collaboration: buildCollaborationEnvelope({
        ownershipStatus: COLLABORATION_STATES.TASK_CLAIMED,
        ownerUserId: context.currentUserId,
        ownerUserName: context.currentUserName,
        ownerRole: context.currentUserRole,
        ownerDeviceId: "HH-001",
        conflictStatus: "NONE",
      }, context),
      payload: {
        batchId: "shelf_ticket_batch_004",
        ticketSize: "Standard shelf ticket",
        reason: "Missing label / print-ready batch",
        productCount: 4,
        products: ["Golden Canola Oil 1L", "Laundry Powder 2kg", "Tomato Sauce 500g", "Rice 5kg"],
        desktopAction: "PRINT_QUEUE_REVIEW_ONLY",
        printerRoutingImplemented: false,
      },
    }, context),
    buildEnvelope({
      eventId: "sync_evt_0008",
      eventType: DESKTOP_SYNC_EVENT_TYPES.WASTE_QUANTITY_CONFLICT_REPORTED,
      eventLabel: "Waste Conflict #002",
      sourceWorkflow: "Waste Review",
      sourceRecordId: "waste_conflict_002",
      sourceTaskId: wasteConflict?.taskId || "task_waste_conflict_002",
      syncStatus: DESKTOP_SYNC_STATUSES.SYNC_ACCEPTED_FOR_REVIEW,
      desktopReviewQueue: "Waste / shrink review",
      highRiskReview: true,
      collaboration: buildCollaborationEnvelope({
        ownershipStatus: COLLABORATION_STATES.TASK_CONFLICT_REVIEW_REQUIRED,
        ownerUserId: wasteConflict?.ownerUserId || null,
        ownerUserName: wasteConflict?.ownerUserName || "Manager review queue",
        ownerRole: wasteConflict?.ownerRole || "Manager",
        ownerDeviceId: wasteConflict?.ownerDeviceId || "Multiple devices",
        ownerSessionId: wasteConflict?.ownerSessionId,
        ownerShiftId: wasteConflict?.ownerShiftId,
        conflictStatus: COLLABORATION_STATES.TASK_CONFLICT_REVIEW_REQUIRED,
        conflictReason: wasteConflict?.conflictReason || "QUANTITY_MISMATCH",
      }, context),
      payload: {
        wasteReviewId: "waste_conflict_002",
        item: "Short-dated dairy line",
        hh001Quantity: 2,
        hh002Quantity: 5,
        reason: "Quantity mismatch",
        shrinkRisk: "High",
        accountingMutationImplemented: false,
      },
    }, context),
    buildEnvelope({
      eventId: "sync_evt_0009",
      eventType: DESKTOP_SYNC_EVENT_TYPES.PRICE_MISMATCH_REPORTED,
      eventLabel: "Price Check Aisle 3",
      sourceWorkflow: "Price Check / Promo Check",
      sourceRecordId: "price_check_aisle_3",
      syncStatus: DESKTOP_SYNC_STATUSES.SYNC_QUEUED,
      desktopReviewQueue: "Price review",
      payload: {
        scanId: "price_check_aisle_3",
        scannedBarcode: "9300000000456",
        shelfLabelPrice: "4.50",
        systemPrice: "4.80",
        evidence: "Shelf label value captured; photo placeholder available later.",
        priceMutationImplemented: false,
      },
    }, context),
    buildEnvelope({
      eventId: "sync_evt_0010",
      eventType: DESKTOP_SYNC_EVENT_TYPES.MARKDOWN_CONFLICT_REVIEW_REQUIRED,
      eventLabel: "Markdown Approval #006",
      sourceWorkflow: "Markdown Approval",
      sourceRecordId: "markdown_approval_006",
      sourceTaskId: "task_markdown_approval_006",
      syncStatus: DESKTOP_SYNC_STATUSES.SYNC_BLOCKED_CONFLICT,
      desktopReviewQueue: "Markdown manager review",
      highRiskReview: true,
      duplicateApprovalAttempt: true,
      collaboration: buildCollaborationEnvelope({
        ownershipStatus: COLLABORATION_STATES.TASK_CONFLICT_REVIEW_REQUIRED,
        ownerUserId: "staff_002",
        ownerUserName: "Staff 2 Preview",
        ownerRole: "Staff",
        ownerDeviceId: "HH-002",
        conflictStatus: COLLABORATION_STATES.TASK_CONFLICT_REVIEW_REQUIRED,
        conflictReason: "DUPLICATE_APPROVAL_ATTEMPT",
      }, context),
      payload: {
        markdownId: "markdown_approval_006",
        item: "Expiry-driven grocery markdown",
        requestedMarkdown: "30%",
        reason: "Expiry within 2 days",
        livePriceMutationImplemented: false,
      },
    }, context),
    buildEnvelope({
      eventId: "sync_evt_0011",
      eventType: DESKTOP_SYNC_EVENT_TYPES.REPLENISHMENT_TASK_COMPLETED,
      eventLabel: "Replenishment Aisle 3",
      sourceWorkflow: "Replenishment",
      sourceRecordId: replenish?.sourceRecordId || "repl_demo_aisle_3",
      sourceTaskId: replenish?.taskId || "task_replenish_aisle_3",
      syncStatus: DESKTOP_SYNC_STATUSES.SYNC_ACCEPTED_FOR_REVIEW,
      desktopReviewQueue: "Replenishment task review",
      collaboration: buildCollaborationEnvelope({
        ownershipStatus: replenish?.ownershipStatus || COLLABORATION_STATES.TASK_AVAILABLE,
        ownerUserId: replenish?.ownerUserId || context.currentUserId,
        ownerUserName: replenish?.ownerUserName || context.currentUserName,
        ownerRole: replenish?.ownerRole || context.currentUserRole,
        ownerDeviceId: replenish?.ownerDeviceId || "HH-001",
        conflictStatus: replenish?.conflictStatus || "NONE",
      }, context),
      payload: {
        replenishmentTaskId: "repl_demo_aisle_3",
        aisle: "Aisle 3",
        shelfFillRecorded: true,
        exceptions: [],
        stockMutationImplemented: false,
      },
    }, context),
    buildEnvelope({
      eventId: "sync_evt_0012",
      eventType: DESKTOP_SYNC_EVENT_TYPES.COLLAB_TAKEOVER_REQUESTED,
      eventLabel: "Collaboration Takeover #003",
      sourceWorkflow: "Session Collaboration",
      sourceRecordId: "collab_takeover_003",
      sourceTaskId: "task_markdown_batch_004",
      syncStatus: DESKTOP_SYNC_STATUSES.SYNC_DEFERRED,
      desktopReviewQueue: "Collaboration acknowledgement",
      collaboration: buildCollaborationEnvelope({
        ownershipStatus: COLLABORATION_STATES.TASK_TAKEOVER_REQUESTED,
        ownerUserId: "staff_002",
        ownerUserName: "Staff 2 Preview",
        ownerRole: "Staff",
        ownerDeviceId: "HH-002",
        conflictStatus: "NONE",
        handoffStatus: "TAKEOVER_REQUESTED",
      }, context),
      payload: {
        takeoverRequestId: "collab_takeover_003",
        reason: "Owner away from device",
        requestedBy: context.currentUserName || "Staff 1 Preview",
        desktopAcknowledgementOnly: true,
      },
    }, context),
    buildEnvelope({
      eventId: "sync_evt_0013",
      eventType: DESKTOP_SYNC_EVENT_TYPES.DEVICE_SESSION_STARTED,
      eventLabel: "Device Session Started",
      sourceWorkflow: "Device / User / Shift Governance",
      sourceRecordId: context.sessionId || "session_scanops_demo_001",
      syncStatus: DESKTOP_SYNC_STATUSES.SYNC_LOCAL_ONLY,
      desktopReviewQueue: "Audit context only",
      payload: {
        deviceId: context.deviceId || "HH-SCANOPS-001",
        sessionId: context.sessionId || "session_scanops_demo_001",
        shiftId: context.shiftId || "shift_demo_morning_001",
        role: context.currentUserRole || "Staff",
        userManagementMutationImplemented: false,
      },
    }, context),
  ];
}

export function validateDesktopSyncPayload(envelope = {}) {
  const issues = [];
  const events = [];

  REQUIRED_FIELDS.forEach((field) => {
    const value = envelope[field];
    if (value === undefined || value === null || value === "") issues.push({ field, message: `${readable(field)} is missing.` });
  });

  if (TASK_BASED_WORKFLOWS.has(envelope.sourceWorkflow) && !envelope.collaboration) {
    issues.push({ field: "collaboration", message: "Collaboration context is required for task-based payloads." });
  }

  if (issues.length) {
    events.push("Payload incomplete");
    events.push("Desktop cannot accept this payload until required context is present");
    return {
      validationStatus: "INVALID",
      syncStatus: DESKTOP_SYNC_STATUSES.SYNC_BLOCKED_SCHEMA,
      responseStatus: DESKTOP_RESPONSE_STATUSES.DESKTOP_REJECTED_SCHEMA,
      responseLabel: "Rejected: payload incomplete",
      reviewRequired: false,
      mutationAllowed: false,
      mutationBlockedReason: "Required envelope fields are missing.",
      requiredRole: "Supervisor",
      reviewQueue: "Contract validation",
      reviewReason: "Payload incomplete",
      issues,
      events,
    };
  }

  if (envelope.actionAllowed === false || envelope.permissionResult === GOVERNANCE_STATES.ACTION_BLOCKED_ROLE || envelope.permissionResult === GOVERNANCE_STATES.ACTION_BLOCKED_SHIFT || envelope.permissionResult === GOVERNANCE_STATES.ACTION_BLOCKED_DEVICE) {
    events.push("Permission-blocked action held from sync");
    return {
      validationStatus: "VALIDATION_BLOCKED",
      syncStatus: DESKTOP_SYNC_STATUSES.SYNC_BLOCKED_PERMISSION,
      responseStatus: DESKTOP_RESPONSE_STATUSES.DESKTOP_REJECTED_PERMISSION,
      responseLabel: "Rejected: permission blocked",
      reviewRequired: true,
      mutationAllowed: false,
      mutationBlockedReason: envelope.blockedReason || "The handheld action was not allowed for this role/session.",
      requiredRole: "Supervisor",
      reviewQueue: "Permission review",
      reviewReason: "Permission-blocked handheld action",
      issues: [{ field: "permissionResult", message: "This action was permission-blocked on the handheld." }],
      events,
    };
  }

  const conflictStatus = envelope.collaboration?.conflictStatus;
  const hasUnresolvedConflict = conflictStatus && conflictStatus !== "NONE" && conflictStatus !== COLLABORATION_STATES.TASK_CONFLICT_RESOLVED;
  if (hasUnresolvedConflict) {
    events.push("Conflict held from sync");
    events.push("Desktop review required");
    return {
      validationStatus: "VALIDATION_BLOCKED",
      syncStatus: DESKTOP_SYNC_STATUSES.SYNC_BLOCKED_CONFLICT,
      responseStatus: envelope.sourceWorkflow === "Waste Review" ? DESKTOP_RESPONSE_STATUSES.DESKTOP_REQUIRES_WASTE_REVIEW : DESKTOP_RESPONSE_STATUSES.DESKTOP_REJECTED_CONFLICT,
      responseLabel: envelope.sourceWorkflow === "Waste Review" ? "Requires waste review" : "Blocked by conflict",
      reviewRequired: true,
      mutationAllowed: false,
      mutationBlockedReason: "Unresolved collaboration conflict exists.",
      requiredRole: envelope.highRiskReview ? "Manager" : "Supervisor",
      reviewQueue: envelope.desktopReviewQueue || "Conflict review",
      reviewReason: envelope.collaboration?.conflictReason || "Collaboration conflict",
      issues: [{ field: "collaboration.conflictStatus", message: "An unresolved collaboration conflict exists." }],
      events,
    };
  }

  const ownerId = envelope.collaboration?.ownerUserId;
  if (envelope.taskOwnerMustMatchSubmitter && ownerId && ownerId !== envelope.actorId) {
    events.push("Task owner mismatch blocked");
    return {
      validationStatus: "VALIDATION_BLOCKED",
      syncStatus: DESKTOP_SYNC_STATUSES.SYNC_BLOCKED_STALE_TASK,
      responseStatus: DESKTOP_RESPONSE_STATUSES.DESKTOP_REJECTED_STALE_TASK,
      responseLabel: "Rejected: stale task owner",
      reviewRequired: true,
      mutationAllowed: false,
      mutationBlockedReason: "Task owner does not match submitter.",
      requiredRole: "Supervisor",
      reviewQueue: "Stale task review",
      reviewReason: "Task ownership changed before sync",
      issues: [{ field: "collaboration.ownerUserId", message: "Task owner does not match this submitter." }],
      events,
    };
  }

  if (envelope.duplicateApprovalAttempt) {
    events.push("Duplicate approval attempt routed to review");
    return {
      validationStatus: "VALID_REVIEW_REQUIRED",
      syncStatus: DESKTOP_SYNC_STATUSES.SYNC_ACCEPTED_FOR_REVIEW,
      responseStatus: DESKTOP_RESPONSE_STATUSES.DESKTOP_REQUIRES_MANAGER_REVIEW,
      responseLabel: "Accepted for manager review",
      reviewRequired: true,
      mutationAllowed: false,
      mutationBlockedReason: "Duplicate approval attempts cannot mutate desktop records.",
      requiredRole: "Manager",
      reviewQueue: envelope.desktopReviewQueue || "Manager review",
      reviewReason: "Duplicate approval attempt",
      issues: [{ field: "duplicateApprovalAttempt", message: "Duplicate approval attempt needs manager review." }],
      events,
    };
  }

  if (envelope.sourceWorkflow === "Shelf Ticket Queue") {
    events.push("Payload validated");
    events.push("Desktop print review required");
    return {
      validationStatus: "VALID_REVIEW_REQUIRED",
      syncStatus: DESKTOP_SYNC_STATUSES.SYNC_ACCEPTED_FOR_REVIEW,
      responseStatus: DESKTOP_RESPONSE_STATUSES.DESKTOP_REQUIRES_PRINT_REVIEW,
      responseLabel: "Accepted for print review",
      reviewRequired: true,
      mutationAllowed: false,
      mutationBlockedReason: "Printer routing is not implemented in Stage AH.",
      requiredRole: "Staff",
      reviewQueue: envelope.desktopReviewQueue || "Desktop print queue review",
      reviewReason: "Print-ready contract needs desktop review",
      issues: [],
      events,
    };
  }

  if (envelope.sourceWorkflow === "Price Check / Promo Check") {
    events.push("Payload validated");
    events.push("Price or promo review required");
    return {
      validationStatus: "VALID_REVIEW_REQUIRED",
      syncStatus: DESKTOP_SYNC_STATUSES.SYNC_ACCEPTED_FOR_REVIEW,
      responseStatus: DESKTOP_RESPONSE_STATUSES.DESKTOP_REQUIRES_PRICE_REVIEW,
      responseLabel: "Accepted for price review",
      reviewRequired: true,
      mutationAllowed: false,
      mutationBlockedReason: "Handheld price/promo mutation is not allowed.",
      requiredRole: "Supervisor",
      reviewQueue: envelope.desktopReviewQueue || "Price review",
      reviewReason: "Price or promo evidence submitted",
      issues: [],
      events,
    };
  }

  if (envelope.sourceWorkflow === "Device / User / Shift Governance") {
    events.push("Governance context captured");
    events.push("Local-only contract preview");
    return {
      validationStatus: "VALID_LOCAL_ONLY",
      syncStatus: DESKTOP_SYNC_STATUSES.SYNC_LOCAL_ONLY,
      responseStatus: DESKTOP_RESPONSE_STATUSES.DESKTOP_LOCAL_ONLY_PREVIEW,
      responseLabel: "Local-only preview",
      reviewRequired: false,
      mutationAllowed: false,
      mutationBlockedReason: "Desktop transport is not connected yet.",
      requiredRole: "Staff",
      reviewQueue: "Audit context only",
      reviewReason: "Local/demo context event",
      issues: [],
      events,
    };
  }

  if (envelope.sourceWorkflow === "Session Collaboration") {
    events.push("Collaboration event packaged");
    events.push("Desktop acknowledgement deferred");
    return {
      validationStatus: "VALID_DEFERRED",
      syncStatus: DESKTOP_SYNC_STATUSES.SYNC_DEFERRED,
      responseStatus: DESKTOP_RESPONSE_STATUSES.DESKTOP_ACCEPTED_FOR_REVIEW,
      responseLabel: "Deferred for desktop acknowledgement",
      reviewRequired: true,
      mutationAllowed: false,
      mutationBlockedReason: "Collaboration proof cannot mutate desktop records automatically.",
      requiredRole: "Supervisor",
      reviewQueue: envelope.desktopReviewQueue || "Collaboration acknowledgement",
      reviewReason: "Shared-work proof",
      issues: [],
      events,
    };
  }

  events.push("Payload validated");
  events.push("Desktop review required");
  return {
    validationStatus: "VALID_REVIEW_REQUIRED",
    syncStatus: envelope.syncStatus === DESKTOP_SYNC_STATUSES.SYNC_DEFERRED ? DESKTOP_SYNC_STATUSES.SYNC_DEFERRED : DESKTOP_SYNC_STATUSES.SYNC_ACCEPTED_FOR_REVIEW,
    responseStatus: DESKTOP_RESPONSE_STATUSES.DESKTOP_ACCEPTED_FOR_REVIEW,
    responseLabel: "Accepted for review",
    reviewRequired: true,
    mutationAllowed: false,
    mutationBlockedReason: "Stage AH is contract preview only.",
    requiredRole: envelope.highRiskReview ? "Manager" : "Supervisor",
    reviewQueue: envelope.desktopReviewQueue || "Desktop review",
    reviewReason: "Review required before desktop mutation",
    issues: [],
    events,
  };
}

export function buildDesktopResponsePreview(envelope = {}, validation = null) {
  const result = validation || validateDesktopSyncPayload(envelope);
  return {
    responseVersion: DESKTOP_SYNC_RESPONSE_VERSION,
    responseId: `desktop_resp_${envelope.eventId || "preview"}`,
    eventId: envelope.eventId,
    responseStatus: result.responseStatus,
    responseLabel: result.responseLabel,
    accepted: !String(result.responseStatus || "").includes("REJECTED"),
    rejected: String(result.responseStatus || "").includes("REJECTED"),
    reviewRequired: Boolean(result.reviewRequired),
    desktopAction: result.reviewQueue || "Desktop review",
    desktopRecordType: envelope.sourceWorkflow || "ScanOps event",
    desktopRecordId: envelope.sourceRecordId || null,
    mutationAllowed: false,
    mutationBlockedReason: result.mutationBlockedReason || "Stage AH is contract preview only.",
    requiredRole: result.requiredRole || "Supervisor",
    reviewQueue: result.reviewQueue || envelope.desktopReviewQueue || "Desktop review",
    reviewReason: result.reviewReason || "Review required",
    syncStatus: result.syncStatus,
    acknowledgedAt: null,
  };
}

export function summarizeDesktopSyncQueue(queue = getDesktopSyncOutboundQueue()) {
  const count = (status) => queue.filter((event) => event.syncStatus === status).length;
  const reviewRequired = queue.filter((event) => validateDesktopSyncPayload(event).reviewRequired).length;
  const blocked = queue.filter((event) => [DESKTOP_SYNC_STATUSES.SYNC_BLOCKED_CONFLICT, DESKTOP_SYNC_STATUSES.SYNC_BLOCKED_PERMISSION, DESKTOP_SYNC_STATUSES.SYNC_BLOCKED_SCHEMA, DESKTOP_SYNC_STATUSES.SYNC_BLOCKED_STALE_TASK].includes(validateDesktopSyncPayload(event).syncStatus)).length;
  return {
    total: queue.length,
    queued: count(DESKTOP_SYNC_STATUSES.SYNC_QUEUED),
    deferred: count(DESKTOP_SYNC_STATUSES.SYNC_DEFERRED),
    acceptedForReview: count(DESKTOP_SYNC_STATUSES.SYNC_ACCEPTED_FOR_REVIEW),
    blocked,
    reviewRequired,
    conflicts: queue.filter((event) => event.collaboration?.conflictStatus && event.collaboration.conflictStatus !== "NONE").length,
  };
}

export function useDesktopSyncContract() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const refresh = () => setTick((value) => value + 1);
    window.addEventListener(DESKTOP_SYNC_EVENT, refresh);
    window.addEventListener("scanops-governance-updated", refresh);
    window.addEventListener("scanops-collaboration-updated", refresh);
    window.addEventListener("scanops-session-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(DESKTOP_SYNC_EVENT, refresh);
      window.removeEventListener("scanops-governance-updated", refresh);
      window.removeEventListener("scanops-collaboration-updated", refresh);
      window.removeEventListener("scanops-session-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return useMemo(() => {
    const context = getDesktopSyncContext();
    const queue = getDesktopSyncOutboundQueue();
    return { context, queue, summary: summarizeDesktopSyncQueue(queue), tick };
  }, [tick]);
}
