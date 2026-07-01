import { runScanOpsManualSyncExecution } from '../manualSync/index.js';

export const SCANOPS_BRIDGE_MANUAL_RETRY_PHASE = '13';
export const SCANOPS_BRIDGE_MANUAL_RETRY_COMPONENT = 'scanops_bridge_manual_retry_execution_boundary';
export const SCANOPS_BRIDGE_MANUAL_RETRY_VERSION = 'scanops-manual-retry.v0.13.0';

export const SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES = Object.freeze({
  READY: 'MANUAL_RETRY_READY',
  EMPTY: 'MANUAL_RETRY_EMPTY',
  BLOCKED: 'MANUAL_RETRY_BLOCKED',
  COMPLETED: 'MANUAL_RETRY_COMPLETED',
  PARTIAL: 'MANUAL_RETRY_PARTIAL',
  FAILED: 'MANUAL_RETRY_FAILED',
});

export const SCANOPS_BRIDGE_MANUAL_RETRY_BLOCKERS = Object.freeze({
  DECISION_INTENT_REQUIRED: 'decision_intent_surface_required',
  QUEUE_ITEMS_REQUIRED: 'queue_items_required',
  MANUAL_RETRY_REQUEST_REQUIRED: 'manual_retry_request_required',
  EXECUTE_RETRY_FLAG_REQUIRED: 'execute_retry_flag_required',
  AUTO_RETRY_BLOCKED: 'auto_retry_blocked',
  BACKGROUND_RETRY_BLOCKED: 'background_retry_blocked',
  QUEUE_WRITE_BLOCKED: 'queue_write_blocked',
  INVENTORY_WRITE_BLOCKED: 'inventory_write_blocked',
});

function freezeArray(values) {
  return Object.freeze([...(values || [])]);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function nowIso(now) {
  if (typeof now === 'function') return now();
  return new Date().toISOString();
}

function issue(code, message, field = null) {
  return Object.freeze({ code, message, field });
}

function queueItemId(queueItem = {}) {
  return asString(queueItem.id || queueItem.queueItemId || queueItem.queue_item_id);
}

function manualRetryRequest(options = {}) {
  const request = isPlainObject(options.manualRetryRequest) ? options.manualRetryRequest : {};
  const trigger = asString(request.trigger || request.reasonCode || request.reason_code);
  return Object.freeze({
    requested: request.userInitiated === true && (trigger === 'manual_retry' || trigger === 'retry_manually' || trigger === 'manual'),
    requestedBy: asString(request.requestedBy || request.operatorId || request.operator_id) || null,
    requestedAt: asString(request.requestedAt || request.requested_at) || null,
    reason: asString(request.reason) || 'Operator selected Retry manually.',
    trigger: trigger || null,
  });
}

function base(status, timestamp) {
  return {
    component: SCANOPS_BRIDGE_MANUAL_RETRY_COMPONENT,
    phase: SCANOPS_BRIDGE_MANUAL_RETRY_PHASE,
    version: SCANOPS_BRIDGE_MANUAL_RETRY_VERSION,
    status,
    timestamp,
    executionMode: 'EXPLICIT_OPERATOR_MANUAL_RETRY_ONLY',
    explicitOperatorDecisionRequired: true,
    automaticReplayEnabled: false,
    autoRetryEnabled: false,
    backgroundRetryEnabled: false,
    queueWriteAllowed: false,
    queueWriteApplied: false,
    localProjectedStatusUpdateOnly: true,
    inventoryMutationAttempted: false,
    scanOpsMutationAttempted: false,
    stockMutationAttempted: false,
    priceMutationAttempted: false,
    ledgerMutationAttempted: false,
    approvalMutationAttempted: false,
  };
}

function validateBoundaryInputs(queueItems = [], decisionIntentSurface = {}, options = {}) {
  const errors = [];
  const retryRequest = manualRetryRequest(options);

  if (!Array.isArray(queueItems)) errors.push(issue(SCANOPS_BRIDGE_MANUAL_RETRY_BLOCKERS.QUEUE_ITEMS_REQUIRED, 'Manual retry execution requires a queue item array.', 'queueItems'));
  if (!isPlainObject(decisionIntentSurface)) errors.push(issue(SCANOPS_BRIDGE_MANUAL_RETRY_BLOCKERS.DECISION_INTENT_REQUIRED, 'Manual retry execution requires a Phase 12 decision intent surface.', 'decisionIntentSurface'));
  if (!retryRequest.requested) errors.push(issue(SCANOPS_BRIDGE_MANUAL_RETRY_BLOCKERS.MANUAL_RETRY_REQUEST_REQUIRED, 'Manual retry execution requires an explicit operator retry request.', 'manualRetryRequest'));
  if (options.executeRetry !== true) errors.push(issue(SCANOPS_BRIDGE_MANUAL_RETRY_BLOCKERS.EXECUTE_RETRY_FLAG_REQUIRED, 'Manual retry execution requires executeRetry true.', 'executeRetry'));
  if (options.autoRetryEnabled === true || options.automaticReplayEnabled === true) errors.push(issue(SCANOPS_BRIDGE_MANUAL_RETRY_BLOCKERS.AUTO_RETRY_BLOCKED, 'Automatic retry is not allowed.', 'autoRetryEnabled'));
  if (options.backgroundRetryEnabled === true || options.backgroundReplayEnabled === true) errors.push(issue(SCANOPS_BRIDGE_MANUAL_RETRY_BLOCKERS.BACKGROUND_RETRY_BLOCKED, 'Background retry loops are not allowed.', 'backgroundRetryEnabled'));
  if (options.applyQueueWrites === true || options.queueWriteAllowed === true) errors.push(issue(SCANOPS_BRIDGE_MANUAL_RETRY_BLOCKERS.QUEUE_WRITE_BLOCKED, 'Manual retry boundary cannot apply queue writes.', 'queueWriteAllowed'));
  if (options.inventoryMutationAllowed === true) errors.push(issue(SCANOPS_BRIDGE_MANUAL_RETRY_BLOCKERS.INVENTORY_WRITE_BLOCKED, 'Manual retry boundary cannot mutate Inventory truth.', 'inventoryMutationAllowed'));

  return Object.freeze({
    valid: errors.length === 0,
    manualRetryRequest: retryRequest,
    errors: freezeArray(errors),
  });
}

function retryIntentItems(decisionIntentSurface = {}) {
  return Array.isArray(decisionIntentSurface.intentItems)
    ? decisionIntentSurface.intentItems.filter((item) => item.retryIntentSelected === true && item.selectedDescriptor === 'Retry manually')
    : [];
}

function buildQueueLookup(queueItems = []) {
  return new Map(queueItems.map((item) => [queueItemId(item), item]).filter(([id]) => Boolean(id)));
}

function buildRetryCandidate(intentItem = {}, queueItem = null, index = 0) {
  return Object.freeze({
    retryCandidateId: `manual-retry:${intentItem.decisionId || intentItem.intentId || index}`,
    queueItemId: intentItem.queueItemId || null,
    decisionId: intentItem.decisionId || null,
    intentId: intentItem.intentId || null,
    selectedDescriptor: intentItem.selectedDescriptor || null,
    retryIntentSelected: intentItem.retryIntentSelected === true,
    queueItemMatched: Boolean(queueItem),
    ready: Boolean(queueItem) && intentItem.retryIntentSelected === true && intentItem.selectedDescriptor === 'Retry manually',
    queueWriteAllowed: false,
    queueWriteApplied: false,
    retryAppliedAutomatically: false,
    inventoryMutationAttempted: false,
    scanOpsMutationAttempted: false,
    stockMutationAttempted: false,
    priceMutationAttempted: false,
    ledgerMutationAttempted: false,
    approvalMutationAttempted: false,
  });
}

export function buildScanOpsManualRetryExecutionBoundary(queueItems = [], decisionIntentSurface = {}, options = {}) {
  const timestamp = nowIso(options.now);
  const validation = validateBoundaryInputs(queueItems, decisionIntentSurface, options);

  if (!validation.valid) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES.BLOCKED, timestamp),
      manualRetryRequest: validation.manualRetryRequest,
      retryCandidates: freezeArray([]),
      retryCandidateCount: 0,
      readyRetryCandidateCount: 0,
      blockedRetryCandidateCount: 0,
      errors: validation.errors,
    });
  }

  const queueLookup = buildQueueLookup(queueItems);
  const candidates = retryIntentItems(decisionIntentSurface).map((intentItem, index) => buildRetryCandidate(
    intentItem,
    queueLookup.get(intentItem.queueItemId) || null,
    index
  ));
  const readyRetryCandidateCount = candidates.filter((candidate) => candidate.ready).length;

  if (candidates.length === 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES.EMPTY, timestamp),
      manualRetryRequest: validation.manualRetryRequest,
      retryCandidates: freezeArray([]),
      retryCandidateCount: 0,
      readyRetryCandidateCount: 0,
      blockedRetryCandidateCount: 0,
      errors: freezeArray([]),
    });
  }

  return Object.freeze({
    ...base(readyRetryCandidateCount > 0 ? SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES.READY : SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES.BLOCKED, timestamp),
    manualRetryRequest: validation.manualRetryRequest,
    retryCandidates: freezeArray(candidates),
    retryCandidateCount: candidates.length,
    readyRetryCandidateCount,
    blockedRetryCandidateCount: candidates.length - readyRetryCandidateCount,
    errors: freezeArray([]),
  });
}

function retryQueueItems(queueItems = [], boundary = {}) {
  const readyIds = new Set((boundary.retryCandidates || []).filter((candidate) => candidate.ready).map((candidate) => candidate.queueItemId));
  return queueItems.filter((item) => readyIds.has(queueItemId(item)));
}

function mapManualSyncStatus(status) {
  if (status === 'MANUAL_SYNC_COMPLETED') return SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES.COMPLETED;
  if (status === 'MANUAL_SYNC_PARTIAL') return SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES.PARTIAL;
  if (status === 'MANUAL_SYNC_FAILED') return SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES.FAILED;
  if (status === 'MANUAL_SYNC_EMPTY') return SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES.EMPTY;
  if (status === 'MANUAL_SYNC_READY') return SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES.READY;
  return SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES.BLOCKED;
}

export async function runScanOpsManualRetryExecutionBoundary(queueItems = [], decisionIntentSurface = {}, options = {}) {
  const boundary = buildScanOpsManualRetryExecutionBoundary(queueItems, decisionIntentSurface, options);
  const timestamp = nowIso(options.now);

  if (boundary.status !== SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES.READY) {
    return Object.freeze({
      ...base(boundary.status, timestamp),
      manualRetryRequest: boundary.manualRetryRequest,
      boundary,
      retryResults: freezeArray([]),
      projectedQueuePatches: freezeArray([]),
      dispatchAttempted: false,
      errors: boundary.errors,
    });
  }

  const selectedQueueItems = retryQueueItems(queueItems, boundary);
  const manualSyncResult = await runScanOpsManualSyncExecution(selectedQueueItems, {
    endpoint: options.endpoint || {},
    deviceIdentity: options.deviceIdentity || {},
    dispatch: options.dispatch,
    transportClient: options.transportClient,
    manualRequest: Object.freeze({
      userInitiated: true,
      trigger: 'manual',
      requestedBy: boundary.manualRetryRequest.requestedBy || 'operator',
      requestedAt: boundary.manualRetryRequest.requestedAt || timestamp,
      reason: boundary.manualRetryRequest.reason,
    }),
    now: options.now,
  });

  return Object.freeze({
    ...base(mapManualSyncStatus(manualSyncResult.status), nowIso(options.now)),
    manualRetryRequest: boundary.manualRetryRequest,
    boundary,
    manualSyncResult,
    retryResults: freezeArray(manualSyncResult.syncResults || []),
    projectedQueuePatches: freezeArray(manualSyncResult.projectedQueuePatches || []),
    dispatchAttempted: manualSyncResult.dispatchAttempted === true,
    errors: freezeArray(manualSyncResult.errors || []),
  });
}
