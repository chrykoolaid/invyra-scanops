export const SCANOPS_BRIDGE_RECEIPT_APPLICATION_PHASE = '10';
export const SCANOPS_BRIDGE_RECEIPT_APPLICATION_COMPONENT = 'scanops_bridge_receipt_application_boundary';
export const SCANOPS_BRIDGE_RECEIPT_APPLICATION_VERSION = 'scanops-receipt-application.v0.10.0';

export const SCANOPS_BRIDGE_RECEIPT_APPLICATION_STATUSES = Object.freeze({
  STAGED: 'RECEIPT_APPLICATION_STAGED',
  EMPTY: 'RECEIPT_APPLICATION_EMPTY',
  BLOCKED: 'RECEIPT_APPLICATION_BLOCKED',
});

export const SCANOPS_BRIDGE_RECEIPT_DISPLAY_STATUSES = Object.freeze({
  DISPLAY_SYNCED: 'DISPLAY_SYNCED',
  DISPLAY_DUPLICATE: 'DISPLAY_DUPLICATE',
  DISPLAY_REVIEW_REQUIRED: 'DISPLAY_REVIEW_REQUIRED',
  DISPLAY_RETRY_REQUIRED: 'DISPLAY_RETRY_REQUIRED',
  DISPLAY_BLOCKED: 'DISPLAY_BLOCKED',
});

const BLOCKERS = Object.freeze({
  RESULT_REQUIRED: 'manual_sync_result_required',
  AUTO_BLOCKED: 'auto_receipt_application_blocked',
  QUEUE_WRITE_BLOCKED: 'queue_write_blocked',
  INVENTORY_WRITE_BLOCKED: 'inventory_write_blocked',
  BACKGROUND_BLOCKED: 'background_replay_blocked',
});

export const SCANOPS_BRIDGE_RECEIPT_APPLICATION_BLOCKERS = BLOCKERS;

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

function base(status, timestamp) {
  return {
    component: SCANOPS_BRIDGE_RECEIPT_APPLICATION_COMPONENT,
    phase: SCANOPS_BRIDGE_RECEIPT_APPLICATION_PHASE,
    version: SCANOPS_BRIDGE_RECEIPT_APPLICATION_VERSION,
    status,
    timestamp,
    applicationMode: 'DISPLAY_STAGING_ONLY',
    localDisplayOnly: true,
    receiptApplicationBoundary: true,
    inventoryMutationAttempted: false,
    scanOpsMutationAttempted: false,
    stockMutationAttempted: false,
    priceMutationAttempted: false,
    ledgerMutationAttempted: false,
    approvalMutationAttempted: false,
    queueWriteAllowed: false,
    queueWriteApplied: false,
    backgroundReplayEnabled: false,
    autoApplicationEnabled: false,
  };
}

function displayStatusFor(status) {
  switch (asString(status).toUpperCase()) {
    case 'SYNCED': return SCANOPS_BRIDGE_RECEIPT_DISPLAY_STATUSES.DISPLAY_SYNCED;
    case 'DUPLICATE': return SCANOPS_BRIDGE_RECEIPT_DISPLAY_STATUSES.DISPLAY_DUPLICATE;
    case 'SERVICE_UNAVAILABLE':
    case 'TRANSPORT_ERROR': return SCANOPS_BRIDGE_RECEIPT_DISPLAY_STATUSES.DISPLAY_RETRY_REQUIRED;
    case 'BLOCKED': return SCANOPS_BRIDGE_RECEIPT_DISPLAY_STATUSES.DISPLAY_BLOCKED;
    default: return SCANOPS_BRIDGE_RECEIPT_DISPLAY_STATUSES.DISPLAY_REVIEW_REQUIRED;
  }
}

function nextActionFor(displayStatus) {
  if (displayStatus === SCANOPS_BRIDGE_RECEIPT_DISPLAY_STATUSES.DISPLAY_SYNCED) return 'Show receipt confirmed after Inventory Desktop validation.';
  if (displayStatus === SCANOPS_BRIDGE_RECEIPT_DISPLAY_STATUSES.DISPLAY_DUPLICATE) return 'Show duplicate receipt and keep evidence visible for review.';
  if (displayStatus === SCANOPS_BRIDGE_RECEIPT_DISPLAY_STATUSES.DISPLAY_RETRY_REQUIRED) return 'Show retry required; do not replay automatically.';
  if (displayStatus === SCANOPS_BRIDGE_RECEIPT_DISPLAY_STATUSES.DISPLAY_BLOCKED) return 'Show blocked state and require operator review.';
  return 'Show review required; Inventory Desktop remains source of truth.';
}

function patchFromResult(syncResult = {}) {
  return syncResult.receiptProjection?.projectedQueuePatch || null;
}

function matchingResultForPatch(syncResults = [], patch = {}) {
  const id = asString(patch.id || patch.queueItemId);
  return syncResults.find((result) => asString(result.queueItemId) === id) || null;
}

function buildDisplayStage(patch = {}, syncResult = {}, index = 0, timestamp) {
  const projectedQueueStatus = asString(patch.status || patch.nextQueueStatus || syncResult.status) || 'NEEDS_REVIEW';
  const displayStatus = displayStatusFor(projectedQueueStatus);
  const receiptProjection = syncResult.receiptProjection || {};
  const receipt = receiptProjection.receipt || syncResult.transportResult?.receipt || null;
  const queueItemId = asString(patch.id || patch.queueItemId || syncResult.queueItemId) || null;
  return Object.freeze({
    boundaryId: `receipt-stage:${queueItemId || 'unknown'}:${asString(patch.bridgeReceiptId || patch.bridgeEnvelopeId) || index}`,
    queueItemId,
    previousQueueStatus: asString(receiptProjection.previousQueueStatus) || null,
    projectedQueueStatus,
    displayStatus,
    displayOnly: true,
    stagedLocally: true,
    localProjectionOnly: true,
    queueWriteAllowed: false,
    queueWriteApplied: false,
    inventoryMutationAttempted: false,
    scanOpsMutationAttempted: false,
    stockMutationAttempted: false,
    priceMutationAttempted: false,
    ledgerMutationAttempted: false,
    approvalMutationAttempted: false,
    requiresInventoryDesktopReceipt: true,
    requiresOperatorReview: displayStatus !== SCANOPS_BRIDGE_RECEIPT_DISPLAY_STATUSES.DISPLAY_SYNCED,
    bridgeEnvelopeId: asString(patch.bridgeEnvelopeId || receiptProjection.envelopeId) || null,
    bridgeReceiptId: asString(patch.bridgeReceiptId || receipt?.receiptId || receipt?.receipt_id) || null,
    bridgeReceiptStatus: asString(patch.bridgeReceiptStatus || receipt?.status) || null,
    operationType: asString(receiptProjection.operationType || syncResult.operationType) || null,
    stagedAt: timestamp,
    nextAction: nextActionFor(displayStatus),
  });
}

export function buildScanOpsReceiptApplicationBoundary(manualSyncResult = {}, options = {}) {
  const timestamp = nowIso(options.now);
  const errors = [];

  if (!isPlainObject(manualSyncResult)) errors.push(issue(BLOCKERS.RESULT_REQUIRED, 'Manual sync result object is required before receipt display staging.', 'manualSyncResult'));
  if (options.autoApplicationEnabled === true) errors.push(issue(BLOCKERS.AUTO_BLOCKED, 'Receipt display staging cannot run automatically in ScanOps.', 'autoApplicationEnabled'));
  if (options.backgroundReplayEnabled === true) errors.push(issue(BLOCKERS.BACKGROUND_BLOCKED, 'Receipt display staging cannot use background replay.', 'backgroundReplayEnabled'));
  if (options.applyQueueWrites === true || options.queueWriteAllowed === true) errors.push(issue(BLOCKERS.QUEUE_WRITE_BLOCKED, 'Receipt display staging does not write ScanOps queue state.', 'queueWriteAllowed'));
  if (options.inventoryMutationAllowed === true) errors.push(issue(BLOCKERS.INVENTORY_WRITE_BLOCKED, 'Receipt display staging cannot mutate Inventory truth.', 'inventoryMutationAllowed'));

  if (errors.length > 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RECEIPT_APPLICATION_STATUSES.BLOCKED, timestamp),
      stagedReceiptApplications: freezeArray([]),
      stagedReceiptCount: 0,
      displayOnlyCount: 0,
      reviewRequiredCount: 0,
      retryRequiredCount: 0,
      errors: freezeArray(errors),
    });
  }

  const syncResults = Array.isArray(manualSyncResult.syncResults) ? manualSyncResult.syncResults : [];
  const projectedPatches = Array.isArray(manualSyncResult.projectedQueuePatches)
    ? manualSyncResult.projectedQueuePatches
    : syncResults.map(patchFromResult).filter(Boolean);

  if (projectedPatches.length === 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RECEIPT_APPLICATION_STATUSES.EMPTY, timestamp),
      stagedReceiptApplications: freezeArray([]),
      stagedReceiptCount: 0,
      displayOnlyCount: 0,
      reviewRequiredCount: 0,
      retryRequiredCount: 0,
      errors: freezeArray([]),
    });
  }

  const stagedReceiptApplications = projectedPatches.map((patch, index) => buildDisplayStage(
    patch,
    matchingResultForPatch(syncResults, patch) || syncResults[index] || {},
    index,
    timestamp
  ));

  return Object.freeze({
    ...base(SCANOPS_BRIDGE_RECEIPT_APPLICATION_STATUSES.STAGED, timestamp),
    stagedReceiptApplications: freezeArray(stagedReceiptApplications),
    stagedReceiptCount: stagedReceiptApplications.length,
    displayOnlyCount: stagedReceiptApplications.filter((item) => item.displayOnly === true).length,
    reviewRequiredCount: stagedReceiptApplications.filter((item) => item.requiresOperatorReview === true).length,
    retryRequiredCount: stagedReceiptApplications.filter((item) => item.displayStatus === SCANOPS_BRIDGE_RECEIPT_DISPLAY_STATUSES.DISPLAY_RETRY_REQUIRED).length,
    errors: freezeArray([]),
  });
}
