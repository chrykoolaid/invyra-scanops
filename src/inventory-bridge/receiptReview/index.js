export const SCANOPS_BRIDGE_RECEIPT_REVIEW_PHASE = '11';
export const SCANOPS_BRIDGE_RECEIPT_REVIEW_COMPONENT = 'scanops_bridge_receipt_review_retry_decision_surface';
export const SCANOPS_BRIDGE_RECEIPT_REVIEW_VERSION = 'scanops-receipt-review.v0.11.0';

export const SCANOPS_BRIDGE_RECEIPT_REVIEW_STATUSES = Object.freeze({
  READY: 'RECEIPT_REVIEW_READY',
  EMPTY: 'RECEIPT_REVIEW_EMPTY',
  BLOCKED: 'RECEIPT_REVIEW_BLOCKED',
});

export const SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS = Object.freeze({
  ACCEPTED: 'ACCEPTED',
  DUPLICATE: 'DUPLICATE',
  RETRY_REQUIRED: 'RETRY_REQUIRED',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
  BLOCKED: 'BLOCKED',
});

export const SCANOPS_BRIDGE_RECEIPT_REVIEW_OUTCOMES = Object.freeze({
  ACCEPTED: 'RECEIPT_ACCEPTED',
  DUPLICATE: 'RECEIPT_DUPLICATE',
  SERVICE_UNAVAILABLE: 'RECEIPT_SERVICE_UNAVAILABLE',
  TRANSPORT_ERROR: 'RECEIPT_TRANSPORT_ERROR',
  REJECTED: 'RECEIPT_REJECTED',
  BLOCKED: 'RECEIPT_BLOCKED',
  REVIEW_REQUIRED: 'RECEIPT_REVIEW_REQUIRED',
});

export const SCANOPS_BRIDGE_RECEIPT_REVIEW_BLOCKERS = Object.freeze({
  BOUNDARY_REQUIRED: 'receipt_boundary_required',
  AUTO_RETRY_BLOCKED: 'auto_retry_blocked',
  BACKGROUND_RETRY_BLOCKED: 'background_retry_blocked',
  QUEUE_WRITE_BLOCKED: 'queue_write_blocked',
  INVENTORY_WRITE_BLOCKED: 'inventory_write_blocked',
  DECISION_APPLICATION_BLOCKED: 'decision_application_blocked',
});

function freezeArray(values) {
  return Object.freeze([...(values || [])]);
}

function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nowIso(now) {
  if (typeof now === 'function') return now();
  return new Date().toISOString();
}

function issue(code, message, field = null) {
  return Object.freeze({ code, message, field });
}

function normalizedStatus(item = {}) {
  return asString(item.bridgeReceiptStatus || item.projectedQueueStatus || item.displayStatus).toUpperCase();
}

function classificationFor(item = {}) {
  const status = normalizedStatus(item);
  if (status.includes('SYNCED') || status.includes('ACCEPTED')) return SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.ACCEPTED;
  if (status.includes('DUPLICATE')) return SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.DUPLICATE;
  if (status.includes('SERVICE_UNAVAILABLE') || status.includes('TRANSPORT_ERROR') || status.includes('RETRY_REQUIRED')) return SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_REQUIRED;
  if (status.includes('BLOCKED')) return SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.BLOCKED;
  return SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.REVIEW_REQUIRED;
}

function outcomeFor(item = {}, classification) {
  const status = normalizedStatus(item);
  if (classification === SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.ACCEPTED) return SCANOPS_BRIDGE_RECEIPT_REVIEW_OUTCOMES.ACCEPTED;
  if (classification === SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.DUPLICATE) return SCANOPS_BRIDGE_RECEIPT_REVIEW_OUTCOMES.DUPLICATE;
  if (status.includes('SERVICE_UNAVAILABLE')) return SCANOPS_BRIDGE_RECEIPT_REVIEW_OUTCOMES.SERVICE_UNAVAILABLE;
  if (status.includes('TRANSPORT_ERROR')) return SCANOPS_BRIDGE_RECEIPT_REVIEW_OUTCOMES.TRANSPORT_ERROR;
  if (status.includes('REJECTED')) return SCANOPS_BRIDGE_RECEIPT_REVIEW_OUTCOMES.REJECTED;
  if (classification === SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.BLOCKED) return SCANOPS_BRIDGE_RECEIPT_REVIEW_OUTCOMES.BLOCKED;
  return SCANOPS_BRIDGE_RECEIPT_REVIEW_OUTCOMES.REVIEW_REQUIRED;
}

function labelFor(classification, outcomeType) {
  if (classification === SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.ACCEPTED) return 'Synced / accepted';
  if (classification === SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.DUPLICATE) return 'Duplicate';
  if (outcomeType === SCANOPS_BRIDGE_RECEIPT_REVIEW_OUTCOMES.SERVICE_UNAVAILABLE) return 'Service unavailable';
  if (outcomeType === SCANOPS_BRIDGE_RECEIPT_REVIEW_OUTCOMES.TRANSPORT_ERROR) return 'Transport error';
  if (outcomeType === SCANOPS_BRIDGE_RECEIPT_REVIEW_OUTCOMES.REJECTED) return 'Rejected';
  if (classification === SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_REQUIRED) return 'Retry required';
  if (classification === SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.BLOCKED) return 'Blocked';
  return 'Review required';
}

function decisionDescriptorsFor(classification) {
  if (classification === SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.ACCEPTED) return ['Review receipt'];
  if (classification === SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.DUPLICATE) return ['Acknowledge duplicate', 'Keep queued'];
  if (classification === SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_REQUIRED) return ['Retry manually', 'Keep queued', 'Review'];
  if (classification === SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.BLOCKED) return ['Review', 'Keep queued'];
  return ['Review', 'Keep queued'];
}

function instructionFor(classification, outcomeType) {
  if (classification === SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.ACCEPTED) return 'Receipt accepted by Inventory Desktop. Show confirmation only.';
  if (classification === SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.DUPLICATE) return 'Duplicate receipt needs operator acknowledgement before any later scoped queue handling.';
  if (outcomeType === SCANOPS_BRIDGE_RECEIPT_REVIEW_OUTCOMES.SERVICE_UNAVAILABLE) return 'Inventory Desktop was unavailable. Operator may choose a later manual retry; no automatic replay is allowed.';
  if (outcomeType === SCANOPS_BRIDGE_RECEIPT_REVIEW_OUTCOMES.TRANSPORT_ERROR) return 'Transport failed. Operator may choose a later manual retry; no background retry loop is allowed.';
  if (outcomeType === SCANOPS_BRIDGE_RECEIPT_REVIEW_OUTCOMES.REJECTED) return 'Inventory Desktop rejected the receipt. Operator review is required; ScanOps must not override validation.';
  if (classification === SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.BLOCKED) return 'Receipt is blocked. Keep visible for review without queue or Inventory mutation.';
  return 'Receipt needs review. Inventory Desktop remains the source of truth.';
}

function base(status, timestamp) {
  return {
    component: SCANOPS_BRIDGE_RECEIPT_REVIEW_COMPONENT,
    phase: SCANOPS_BRIDGE_RECEIPT_REVIEW_PHASE,
    version: SCANOPS_BRIDGE_RECEIPT_REVIEW_VERSION,
    status,
    timestamp,
    decisionMode: 'OPERATOR_DECISION_DESCRIPTORS_ONLY',
    consumesReceiptBoundaryDescriptors: true,
    localDisplayOnly: true,
    queueWriteAllowed: false,
    queueWriteApplied: false,
    retryApplied: false,
    automaticReplayEnabled: false,
    backgroundRetryEnabled: false,
    inventoryMutationAttempted: false,
    scanOpsMutationAttempted: false,
    stockMutationAttempted: false,
    priceMutationAttempted: false,
    ledgerMutationAttempted: false,
    approvalMutationAttempted: false,
  };
}

function buildDecisionItem(item = {}, index = 0, timestamp) {
  const classification = classificationFor(item);
  const outcomeType = outcomeFor(item, classification);
  const decisionDescriptors = decisionDescriptorsFor(classification);
  return Object.freeze({
    decisionId: `receipt-review:${item.queueItemId || 'unknown'}:${item.bridgeReceiptId || item.bridgeEnvelopeId || index}`,
    boundaryId: item.boundaryId || null,
    queueItemId: item.queueItemId || null,
    bridgeEnvelopeId: item.bridgeEnvelopeId || null,
    bridgeReceiptId: item.bridgeReceiptId || null,
    bridgeReceiptStatus: item.bridgeReceiptStatus || null,
    displayStatus: item.displayStatus || null,
    projectedQueueStatus: item.projectedQueueStatus || null,
    classification,
    outcomeType,
    outcomeLabel: labelFor(classification, outcomeType),
    instruction: instructionFor(classification, outcomeType),
    decisionDescriptors: freezeArray(decisionDescriptors),
    recommendedDescriptor: decisionDescriptors[0] || 'Review',
    requiresOperatorDecision: classification !== SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.ACCEPTED,
    retryDecisionAvailable: classification === SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_REQUIRED,
    duplicateAcknowledgementAvailable: classification === SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.DUPLICATE,
    keepQueuedDescriptorAvailable: classification !== SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.ACCEPTED,
    descriptorOnly: true,
    localDisplayOnly: true,
    queueWriteAllowed: false,
    queueWriteApplied: false,
    retryApplied: false,
    inventoryMutationAttempted: false,
    scanOpsMutationAttempted: false,
    stockMutationAttempted: false,
    priceMutationAttempted: false,
    ledgerMutationAttempted: false,
    approvalMutationAttempted: false,
    stagedAt: item.stagedAt || timestamp,
    reviewedAt: timestamp,
  });
}

export function buildScanOpsReceiptReviewDecisionSurface(receiptBoundary = {}, options = {}) {
  const timestamp = nowIso(options.now);
  const errors = [];

  if (!isPlainObject(receiptBoundary)) errors.push(issue(SCANOPS_BRIDGE_RECEIPT_REVIEW_BLOCKERS.BOUNDARY_REQUIRED, 'Receipt review requires a Phase 10 receipt boundary object.', 'receiptBoundary'));
  if (options.autoRetryEnabled === true || options.automaticReplayEnabled === true) errors.push(issue(SCANOPS_BRIDGE_RECEIPT_REVIEW_BLOCKERS.AUTO_RETRY_BLOCKED, 'Receipt review cannot trigger automatic retry.', 'autoRetryEnabled'));
  if (options.backgroundRetryEnabled === true || options.backgroundReplayEnabled === true) errors.push(issue(SCANOPS_BRIDGE_RECEIPT_REVIEW_BLOCKERS.BACKGROUND_RETRY_BLOCKED, 'Receipt review cannot start a background retry loop.', 'backgroundRetryEnabled'));
  if (options.applyQueueWrites === true || options.queueWriteAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RECEIPT_REVIEW_BLOCKERS.QUEUE_WRITE_BLOCKED, 'Receipt review decision descriptors do not write queue state.', 'queueWriteAllowed'));
  if (options.inventoryMutationAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RECEIPT_REVIEW_BLOCKERS.INVENTORY_WRITE_BLOCKED, 'Receipt review cannot mutate Inventory truth.', 'inventoryMutationAllowed'));
  if (options.applyDecision === true || options.applyRetryDecision === true) errors.push(issue(SCANOPS_BRIDGE_RECEIPT_REVIEW_BLOCKERS.DECISION_APPLICATION_BLOCKED, 'Receipt review exposes descriptors only; decision application is out of scope.', 'applyDecision'));

  if (errors.length > 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RECEIPT_REVIEW_STATUSES.BLOCKED, timestamp),
      decisionItems: freezeArray([]),
      decisionItemCount: 0,
      acceptedCount: 0,
      duplicateCount: 0,
      retryRequiredCount: 0,
      reviewRequiredCount: 0,
      blockedCount: 0,
      descriptorOnlyCount: 0,
      errors: freezeArray(errors),
    });
  }

  const boundaryItems = Array.isArray(receiptBoundary.stagedReceiptApplications)
    ? receiptBoundary.stagedReceiptApplications
    : [];

  if (boundaryItems.length === 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RECEIPT_REVIEW_STATUSES.EMPTY, timestamp),
      decisionItems: freezeArray([]),
      decisionItemCount: 0,
      acceptedCount: 0,
      duplicateCount: 0,
      retryRequiredCount: 0,
      reviewRequiredCount: 0,
      blockedCount: 0,
      descriptorOnlyCount: 0,
      errors: freezeArray([]),
    });
  }

  const decisionItems = boundaryItems.map((item, index) => buildDecisionItem(item, index, timestamp));

  return Object.freeze({
    ...base(SCANOPS_BRIDGE_RECEIPT_REVIEW_STATUSES.READY, timestamp),
    decisionItems: freezeArray(decisionItems),
    decisionItemCount: decisionItems.length,
    acceptedCount: decisionItems.filter((item) => item.classification === SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.ACCEPTED).length,
    duplicateCount: decisionItems.filter((item) => item.classification === SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.DUPLICATE).length,
    retryRequiredCount: decisionItems.filter((item) => item.classification === SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_REQUIRED).length,
    reviewRequiredCount: decisionItems.filter((item) => item.classification === SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.REVIEW_REQUIRED).length,
    blockedCount: decisionItems.filter((item) => item.classification === SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.BLOCKED).length,
    descriptorOnlyCount: decisionItems.filter((item) => item.descriptorOnly === true && item.queueWriteApplied === false && item.retryApplied === false).length,
    errors: freezeArray([]),
  });
}
