import { buildScanOpsReceiptApplicationBoundary } from '../receiptApplication/index.js';
import { buildScanOpsReceiptReviewDecisionSurface } from '../receiptReview/index.js';

export const SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_PHASE = '15';
export const SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_COMPONENT = 'scanops_bridge_retry_result_receipt_review_boundary';
export const SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_VERSION = 'scanops-retry-result-receipt-review.v0.15.0';

export const SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_STATUSES = Object.freeze({
  READY: 'RETRY_RESULT_RECEIPT_REVIEW_READY',
  EMPTY: 'RETRY_RESULT_RECEIPT_REVIEW_EMPTY',
  BLOCKED: 'RETRY_RESULT_RECEIPT_REVIEW_BLOCKED',
});

export const SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS = Object.freeze({
  RETRY_ACCEPTED: 'RETRY_ACCEPTED',
  RETRY_DUPLICATE: 'RETRY_DUPLICATE',
  RETRY_STILL_FAILED: 'RETRY_STILL_FAILED',
  RETRY_REJECTED: 'RETRY_REJECTED',
  RETRY_BLOCKED: 'RETRY_BLOCKED',
  RETRY_SERVICE_UNAVAILABLE: 'RETRY_SERVICE_UNAVAILABLE',
  RETRY_TRANSPORT_ERROR: 'RETRY_TRANSPORT_ERROR',
  RETRY_REVIEW_REQUIRED: 'RETRY_REVIEW_REQUIRED',
});

export const SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_BLOCKERS = Object.freeze({
  RETRY_RESULT_REQUIRED: 'manual_retry_result_required',
  SECOND_RETRY_BLOCKED: 'second_retry_blocked',
  BACKGROUND_RETRY_BLOCKED: 'background_retry_blocked',
  QUEUE_WRITE_BLOCKED: 'queue_write_blocked',
  INVENTORY_WRITE_BLOCKED: 'inventory_write_blocked',
  DIRECT_MUTATION_BLOCKED: 'direct_mutation_blocked',
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

function base(status, timestamp) {
  return {
    component: SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_COMPONENT,
    phase: SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_PHASE,
    version: SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_VERSION,
    status,
    timestamp,
    reviewMode: 'RETRY_RESULT_RECEIPT_DISPLAY_ONLY',
    consumesPhase13ManualRetryResults: true,
    wrapsReceiptApplicationBoundary: true,
    wrapsReceiptReviewSurface: true,
    localDisplayOnly: true,
    queueWriteAllowed: false,
    queueWriteApplied: false,
    retryApplied: false,
    secondRetryApplied: false,
    automaticSecondRetryEnabled: false,
    backgroundRetryEnabled: false,
    inventoryMutationAttempted: false,
    scanOpsMutationAttempted: false,
    stockMutationAttempted: false,
    priceMutationAttempted: false,
    ledgerMutationAttempted: false,
    approvalMutationAttempted: false,
  };
}

function retryResultSource(manualRetryResult = {}) {
  if (isPlainObject(manualRetryResult.manualSyncResult)) return manualRetryResult.manualSyncResult;
  return manualRetryResult;
}

function normalizedStatus(item = {}) {
  return asString(
    item.bridgeReceiptStatus
    || item.projectedQueueStatus
    || item.retryResultStatus
    || item.outcomeType
    || item.classification
    || item.displayStatus
  ).toUpperCase();
}

function retryClassificationFor(item = {}) {
  const status = normalizedStatus(item);
  if (status.includes('ACCEPTED') || status.includes('SYNCED')) return SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_ACCEPTED;
  if (status.includes('DUPLICATE')) return SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_DUPLICATE;
  if (status.includes('SERVICE_UNAVAILABLE')) return SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_SERVICE_UNAVAILABLE;
  if (status.includes('TRANSPORT_ERROR')) return SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_TRANSPORT_ERROR;
  if (status.includes('REJECTED')) return SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_REJECTED;
  if (status.includes('BLOCKED')) return SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_BLOCKED;
  if (status.includes('FAILED')) return SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_STILL_FAILED;
  return SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_REVIEW_REQUIRED;
}

function labelFor(classification) {
  if (classification === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_ACCEPTED) return 'Retry accepted';
  if (classification === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_DUPLICATE) return 'Retry duplicate';
  if (classification === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_SERVICE_UNAVAILABLE) return 'Retry service unavailable';
  if (classification === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_TRANSPORT_ERROR) return 'Retry transport error';
  if (classification === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_REJECTED) return 'Retry rejected';
  if (classification === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_BLOCKED) return 'Retry blocked';
  if (classification === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_STILL_FAILED) return 'Retry still failed';
  return 'Retry review required';
}

function instructionFor(classification) {
  if (classification === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_ACCEPTED) return 'Retry receipt was accepted by Inventory Desktop. Display confirmation only.';
  if (classification === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_DUPLICATE) return 'Retry receipt was identified as duplicate. Display duplicate state only.';
  if (classification === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_SERVICE_UNAVAILABLE) return 'Inventory Desktop was still unavailable. No automatic second retry is allowed.';
  if (classification === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_TRANSPORT_ERROR) return 'Retry transport failed. No background retry loop is allowed.';
  if (classification === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_REJECTED) return 'Inventory Desktop rejected the retry receipt. ScanOps must not override validation.';
  if (classification === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_BLOCKED) return 'Retry receipt is blocked. Keep visible without queue or Inventory mutation.';
  if (classification === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_STILL_FAILED) return 'Retry still failed. Display result only; do not launch another retry from this boundary.';
  return 'Retry result needs review. Inventory Desktop remains the source of truth.';
}

function buildRetryResultItem(decisionItem = {}, index = 0, manualRetryResult = {}, timestamp) {
  const classification = retryClassificationFor(decisionItem);
  return Object.freeze({
    retryResultReviewId: `retry-result-review:${decisionItem.queueItemId || 'unknown'}:${decisionItem.bridgeReceiptId || decisionItem.bridgeEnvelopeId || index}`,
    sourceDecisionId: decisionItem.decisionId || null,
    sourceBoundaryId: decisionItem.boundaryId || null,
    queueItemId: decisionItem.queueItemId || null,
    bridgeEnvelopeId: decisionItem.bridgeEnvelopeId || null,
    bridgeReceiptId: decisionItem.bridgeReceiptId || null,
    bridgeReceiptStatus: decisionItem.bridgeReceiptStatus || null,
    projectedQueueStatus: decisionItem.projectedQueueStatus || null,
    displayStatus: decisionItem.displayStatus || null,
    retryResultStatus: normalizedStatus(decisionItem) || null,
    manualRetryStatus: manualRetryResult.status || null,
    classification,
    outcomeLabel: labelFor(classification),
    instruction: instructionFor(classification),
    displayOnly: true,
    localDisplayOnly: true,
    queueWriteAllowed: false,
    queueWriteApplied: false,
    retryApplied: false,
    secondRetryApplied: false,
    automaticSecondRetryEnabled: false,
    backgroundRetryEnabled: false,
    inventoryMutationAttempted: false,
    scanOpsMutationAttempted: false,
    stockMutationAttempted: false,
    priceMutationAttempted: false,
    ledgerMutationAttempted: false,
    approvalMutationAttempted: false,
    reviewedAt: timestamp,
  });
}

function validationErrors(manualRetryResult = {}, options = {}) {
  const errors = [];
  if (!isPlainObject(manualRetryResult)) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_BLOCKERS.RETRY_RESULT_REQUIRED, 'Manual retry result object is required before retry receipt review.', 'manualRetryResult'));
  if (options.autoRetryEnabled === true || options.automaticReplayEnabled === true || options.automaticSecondRetryEnabled === true || options.executeRetry === true || options.applyRetry === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_BLOCKERS.SECOND_RETRY_BLOCKED, 'Retry result review cannot launch a second retry.', 'executeRetry'));
  }
  if (options.backgroundRetryEnabled === true || options.backgroundReplayEnabled === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_BLOCKERS.BACKGROUND_RETRY_BLOCKED, 'Retry result review cannot start a background retry loop.', 'backgroundRetryEnabled'));
  }
  if (options.applyQueueWrites === true || options.queueWriteAllowed === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_BLOCKERS.QUEUE_WRITE_BLOCKED, 'Retry result review does not write ScanOps queue state.', 'queueWriteAllowed'));
  }
  if (options.inventoryMutationAllowed === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_BLOCKERS.INVENTORY_WRITE_BLOCKED, 'Retry result review cannot mutate Inventory truth.', 'inventoryMutationAllowed'));
  }
  if (options.stockMutationAllowed === true || options.priceMutationAllowed === true || options.ledgerMutationAllowed === true || options.approvalMutationAllowed === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_BLOCKERS.DIRECT_MUTATION_BLOCKED, 'Retry result review cannot mutate stock, price, ledger, or approvals.', 'mutationAllowed'));
  }
  return errors;
}

export function buildScanOpsRetryResultReceiptReviewBoundary(manualRetryResult = {}, options = {}) {
  const timestamp = nowIso(options.now);
  const errors = validationErrors(manualRetryResult, options);

  if (errors.length > 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_STATUSES.BLOCKED, timestamp),
      receiptBoundary: null,
      receiptReviewSurface: null,
      retryResultItems: freezeArray([]),
      retryResultItemCount: 0,
      retryAcceptedCount: 0,
      retryDuplicateCount: 0,
      retryStillFailedCount: 0,
      retryRejectedCount: 0,
      retryBlockedCount: 0,
      retryServiceUnavailableCount: 0,
      retryTransportErrorCount: 0,
      failedOutcomeCount: 0,
      displayOnlyCount: 0,
      errors: freezeArray(errors),
    });
  }

  const receiptSource = retryResultSource(manualRetryResult);
  const receiptBoundary = buildScanOpsReceiptApplicationBoundary(receiptSource, { now: options.now });
  const receiptReviewSurface = buildScanOpsReceiptReviewDecisionSurface(receiptBoundary, { now: options.now });
  const decisionItems = Array.isArray(receiptReviewSurface.decisionItems) ? receiptReviewSurface.decisionItems : [];

  if (decisionItems.length === 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_STATUSES.EMPTY, timestamp),
      receiptBoundary,
      receiptReviewSurface,
      retryResultItems: freezeArray([]),
      retryResultItemCount: 0,
      retryAcceptedCount: 0,
      retryDuplicateCount: 0,
      retryStillFailedCount: 0,
      retryRejectedCount: 0,
      retryBlockedCount: 0,
      retryServiceUnavailableCount: 0,
      retryTransportErrorCount: 0,
      failedOutcomeCount: 0,
      displayOnlyCount: 0,
      errors: freezeArray([]),
    });
  }

  const retryResultItems = decisionItems.map((item, index) => buildRetryResultItem(item, index, manualRetryResult, timestamp));
  const failedClassifications = new Set([
    SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_STILL_FAILED,
    SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_REJECTED,
    SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_BLOCKED,
    SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_SERVICE_UNAVAILABLE,
    SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_TRANSPORT_ERROR,
    SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_REVIEW_REQUIRED,
  ]);

  return Object.freeze({
    ...base(SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_STATUSES.READY, timestamp),
    receiptBoundary,
    receiptReviewSurface,
    retryResultItems: freezeArray(retryResultItems),
    retryResultItemCount: retryResultItems.length,
    retryAcceptedCount: retryResultItems.filter((item) => item.classification === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_ACCEPTED).length,
    retryDuplicateCount: retryResultItems.filter((item) => item.classification === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_DUPLICATE).length,
    retryStillFailedCount: retryResultItems.filter((item) => item.classification === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_STILL_FAILED).length,
    retryRejectedCount: retryResultItems.filter((item) => item.classification === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_REJECTED).length,
    retryBlockedCount: retryResultItems.filter((item) => item.classification === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_BLOCKED).length,
    retryServiceUnavailableCount: retryResultItems.filter((item) => item.classification === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_SERVICE_UNAVAILABLE).length,
    retryTransportErrorCount: retryResultItems.filter((item) => item.classification === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_TRANSPORT_ERROR).length,
    failedOutcomeCount: retryResultItems.filter((item) => failedClassifications.has(item.classification)).length,
    displayOnlyCount: retryResultItems.filter((item) => item.displayOnly === true && item.queueWriteApplied === false && item.secondRetryApplied === false).length,
    errors: freezeArray([]),
  });
}
