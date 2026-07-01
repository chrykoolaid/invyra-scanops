import {
  SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES,
  buildScanOpsQueueSyncCandidate,
  runScanOpsQueueSyncHandoff,
} from '../queueSync/index.js';
import {
  SCANOPS_BRIDGE_MANUAL_SYNC_BLOCKERS,
  SCANOPS_BRIDGE_MANUAL_SYNC_COMPONENT,
  SCANOPS_BRIDGE_MANUAL_SYNC_PHASE,
  SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES,
  SCANOPS_BRIDGE_MANUAL_SYNC_SUCCESS_QUEUE_STATUSES,
  SCANOPS_BRIDGE_MANUAL_SYNC_VERSION,
} from './manualSyncTypes.js';
import {
  asTrimmedString,
  freezeArray,
  freezeIssue,
  isManualRequest,
  isPlainObject,
  manualRequestRequestedBy,
  nowIso,
  queueItemId,
} from './manualSyncUtils.js';

function resultBase(status, timestamp) {
  return {
    component: SCANOPS_BRIDGE_MANUAL_SYNC_COMPONENT,
    phase: SCANOPS_BRIDGE_MANUAL_SYNC_PHASE,
    version: SCANOPS_BRIDGE_MANUAL_SYNC_VERSION,
    status,
    timestamp,
    executionMode: 'MANUAL_ONLY',
    userInitiatedOnly: true,
    autoSyncEnabled: false,
    backgroundReplayEnabled: false,
    inventoryMutationAttempted: false,
    scanOpsMutationAttempted: false,
    stockMutationAttempted: false,
    priceMutationAttempted: false,
    approvalMutationAttempted: false,
    projectionOnly: true,
    queueWriteApplied: false,
    localProjectedStatusUpdateOnly: true,
  };
}

function manualSyncContext(options = {}) {
  const manualRequest = isPlainObject(options.manualRequest) ? options.manualRequest : {};
  return Object.freeze({
    requested: isManualRequest(options),
    requestedBy: manualRequestRequestedBy(manualRequest),
    requestedAt: asTrimmedString(manualRequest.requestedAt || manualRequest.requested_at) || null,
    reason: asTrimmedString(manualRequest.reason) || 'Operator requested manual bridge sync.',
    trigger: asTrimmedString(manualRequest.trigger) || (isManualRequest(options) ? 'manual' : null),
  });
}

export function validateScanOpsManualSyncRequest(queueItems = [], options = {}) {
  const errors = [];
  const manual = manualSyncContext(options);

  if (!manual.requested) {
    errors.push(freezeIssue(SCANOPS_BRIDGE_MANUAL_SYNC_BLOCKERS.MANUAL_REQUEST_REQUIRED, 'Manual sync execution requires an explicit user/operator initiated request.', 'manualRequest'));
  }

  if (options.autoSyncEnabled === true) {
    errors.push(freezeIssue(SCANOPS_BRIDGE_MANUAL_SYNC_BLOCKERS.AUTO_SYNC_BLOCKED, 'Automatic sync is not enabled for ScanOps bridge execution.', 'autoSyncEnabled'));
  }

  if (options.backgroundReplayEnabled === true) {
    errors.push(freezeIssue(SCANOPS_BRIDGE_MANUAL_SYNC_BLOCKERS.BACKGROUND_REPLAY_BLOCKED, 'Background replay is not enabled for ScanOps bridge execution.', 'backgroundReplayEnabled'));
  }

  if (!Array.isArray(queueItems)) {
    errors.push(freezeIssue(SCANOPS_BRIDGE_MANUAL_SYNC_BLOCKERS.QUEUE_ITEMS_REQUIRED, 'Manual sync execution requires a queue item array.', 'queueItems'));
  }

  return Object.freeze({
    valid: errors.length === 0,
    manual,
    errors: freezeArray(errors),
  });
}

function buildPlanItem(queueItem, candidate, index) {
  return Object.freeze({
    index,
    queueItemId: queueItemId(queueItem) || candidate.queueItemId || null,
    sourceEventType: candidate.sourceEventType || null,
    operationType: candidate.operationType || null,
    status: candidate.status,
    ready: candidate.status === SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.READY,
    candidate,
    errors: freezeArray(candidate.errors),
  });
}

export function buildScanOpsManualSyncExecutionPlan(queueItems = [], options = {}) {
  const timestamp = nowIso(options.now);
  const requestValidation = validateScanOpsManualSyncRequest(queueItems, options);

  if (!requestValidation.valid) {
    return Object.freeze({
      ...resultBase(SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.BLOCKED, timestamp),
      manualRequest: requestValidation.manual,
      queueItemCount: Array.isArray(queueItems) ? queueItems.length : 0,
      readyQueueItemCount: 0,
      blockedQueueItemCount: 0,
      planItems: freezeArray([]),
      errors: requestValidation.errors,
    });
  }

  if (queueItems.length === 0) {
    return Object.freeze({
      ...resultBase(SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.EMPTY, timestamp),
      manualRequest: requestValidation.manual,
      queueItemCount: 0,
      readyQueueItemCount: 0,
      blockedQueueItemCount: 0,
      planItems: freezeArray([]),
      errors: freezeArray([]),
    });
  }

  const planItems = queueItems.map((queueItem, index) => buildPlanItem(
    queueItem,
    buildScanOpsQueueSyncCandidate(queueItem, {
      endpoint: options.endpoint || {},
      deviceIdentity: options.deviceIdentity || {},
      now: options.now,
    }),
    index
  ));
  const readyQueueItemCount = planItems.filter((item) => item.ready).length;
  const blockedQueueItemCount = planItems.length - readyQueueItemCount;
  const noReadyErrors = readyQueueItemCount > 0 ? [] : [freezeIssue(SCANOPS_BRIDGE_MANUAL_SYNC_BLOCKERS.READY_QUEUE_ITEMS_REQUIRED, 'Manual sync execution found no queue items eligible for bridge handoff.', 'queueItems')];

  return Object.freeze({
    ...resultBase(readyQueueItemCount > 0 ? SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.READY : SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.BLOCKED, timestamp),
    manualRequest: requestValidation.manual,
    queueItemCount: queueItems.length,
    readyQueueItemCount,
    blockedQueueItemCount,
    planItems: freezeArray(planItems),
    errors: freezeArray(noReadyErrors),
  });
}

function hasDispatchSurface(options = {}) {
  return typeof options.dispatch === 'function'
    || (isPlainObject(options.transportClient) && typeof options.transportClient.sendHandoff === 'function');
}

function queueExecutionStatus(syncResults = []) {
  if (syncResults.length === 0) return SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.FAILED;
  const successCount = syncResults.filter((result) => SCANOPS_BRIDGE_MANUAL_SYNC_SUCCESS_QUEUE_STATUSES.includes(result.status)).length;
  if (successCount === syncResults.length) return SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.COMPLETED;
  if (successCount > 0) return SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.PARTIAL;
  return SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.FAILED;
}

export async function runScanOpsManualSyncExecution(queueItems = [], options = {}) {
  const plan = buildScanOpsManualSyncExecutionPlan(queueItems, options);
  const timestamp = nowIso(options.now);

  if (plan.status !== SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.READY) {
    return Object.freeze({
      ...resultBase(plan.status, timestamp),
      manualRequest: plan.manualRequest,
      plan,
      syncResults: freezeArray([]),
      projectedQueuePatches: freezeArray([]),
      dispatchAttempted: false,
      errors: plan.errors,
    });
  }

  if (!hasDispatchSurface(options)) {
    return Object.freeze({
      ...resultBase(SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.BLOCKED, timestamp),
      manualRequest: plan.manualRequest,
      plan,
      syncResults: freezeArray([]),
      projectedQueuePatches: freezeArray([]),
      dispatchAttempted: false,
      errors: freezeArray([freezeIssue(SCANOPS_BRIDGE_MANUAL_SYNC_BLOCKERS.DISPATCH_REQUIRED, 'Manual sync execution requires an explicit dispatch adapter or transport client.', 'dispatch')]),
    });
  }

  const syncResults = [];
  for (const planItem of plan.planItems) {
    if (!planItem.ready) continue;
    const result = await runScanOpsQueueSyncHandoff(queueItems[planItem.index], {
      endpoint: options.endpoint || {},
      deviceIdentity: options.deviceIdentity || {},
      transportClient: options.transportClient,
      dispatch: options.dispatch,
      now: options.now,
    });
    syncResults.push(Object.freeze({
      queueItemId: planItem.queueItemId,
      operationType: planItem.operationType,
      status: result.status,
      dispatchAttempted: result.dispatchAttempted === true,
      receiptProjection: result.receiptProjection,
      transportResult: result.transportResult,
      inventoryMutationAttempted: false,
      scanOpsMutationAttempted: false,
      stockMutationAttempted: false,
      priceMutationAttempted: false,
      queueWriteApplied: false,
    }));
  }

  const projectedQueuePatches = syncResults
    .map((result) => result.receiptProjection?.projectedQueuePatch)
    .filter(Boolean)
    .map((patch) => Object.freeze({ ...patch, localProjectionOnly: true, queueWriteApplied: false }));

  const finalStatus = queueExecutionStatus(syncResults);
  return Object.freeze({
    ...resultBase(finalStatus, nowIso(options.now)),
    manualRequest: plan.manualRequest,
    plan,
    syncResults: freezeArray(syncResults),
    projectedQueuePatches: freezeArray(projectedQueuePatches),
    dispatchAttempted: syncResults.some((result) => result.dispatchAttempted === true),
    errors: freezeArray(syncResults.flatMap((result) => result.receiptProjection?.errors || [])),
  });
}
