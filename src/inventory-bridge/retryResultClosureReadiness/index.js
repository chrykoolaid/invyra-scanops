export const SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_PHASE = '18';
export const SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_COMPONENT = 'scanops_bridge_retry_result_closure_readiness_surface';
export const SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_VERSION = 'scanops-retry-result-closure-readiness.v0.18.0';

export const SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_STATUSES = Object.freeze({
  READY: 'RETRY_RESULT_CLOSURE_READINESS_READY',
  EMPTY: 'RETRY_RESULT_CLOSURE_READINESS_EMPTY',
  BLOCKED: 'RETRY_RESULT_CLOSURE_READINESS_BLOCKED',
});

export const SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_BLOCKERS = Object.freeze({
  SUMMARY_SURFACE_REQUIRED: 'retry_result_acknowledgement_summary_surface_required',
  CLOSURE_APPLICATION_BLOCKED: 'closure_application_blocked',
  PERSISTENCE_BLOCKED: 'closure_persistence_blocked',
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

function nowIso(now) {
  if (typeof now === 'function') return now();
  return new Date().toISOString();
}

function issue(code, message, field = null) {
  return Object.freeze({ code, message, field });
}

function base(status, timestamp) {
  return {
    component: SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_COMPONENT,
    phase: SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_PHASE,
    version: SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_VERSION,
    status,
    timestamp,
    readinessMode: 'LOCAL_RETRY_RESULT_REVIEW_CLOSURE_READINESS_ONLY',
    consumesPhase17AcknowledgementSummarySurface: true,
    localReadinessOnly: true,
    displayOnly: true,
    closureApplicationAllowed: false,
    closureApplied: false,
    closurePersistenceAllowed: false,
    closurePersistenceApplied: false,
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

function readinessStatusFor(summaryItem = {}) {
  if (summaryItem.acknowledgementSelected === true) return 'Closure-ready locally';
  return 'Pending acknowledgement before closure readiness';
}

function instructionFor(summaryItem = {}) {
  if (summaryItem.acknowledgementSelected === true) {
    return 'Local acknowledgement coverage exists. This is readiness only; no closure is applied.';
  }
  return 'A local acknowledgement descriptor is still pending. Keep visible without mutation.';
}

function buildReadinessItem(summaryItem = {}, index = 0, timestamp) {
  const acknowledgementCovered = summaryItem.acknowledgementSelected === true;
  return Object.freeze({
    readinessItemId: `retry-result-closure-readiness:${summaryItem.summaryItemId || summaryItem.retryResultReviewId || index}`,
    summaryItemId: summaryItem.summaryItemId || null,
    acknowledgementIntentId: summaryItem.acknowledgementIntentId || null,
    retryResultReviewId: summaryItem.retryResultReviewId || null,
    queueItemId: summaryItem.queueItemId || null,
    bridgeEnvelopeId: summaryItem.bridgeEnvelopeId || null,
    bridgeReceiptId: summaryItem.bridgeReceiptId || null,
    classification: summaryItem.classification || null,
    outcomeLabel: summaryItem.outcomeLabel || null,
    selectedDescriptor: summaryItem.selectedDescriptor || null,
    acknowledgementSelected: acknowledgementCovered,
    acknowledgementCoverageReady: acknowledgementCovered,
    closureReadinessStatus: readinessStatusFor(summaryItem),
    instruction: instructionFor(summaryItem),
    localReadinessOnly: true,
    displayOnly: true,
    closureApplicationAllowed: false,
    closureApplied: false,
    closurePersistenceAllowed: false,
    closurePersistenceApplied: false,
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
    readinessCheckedAt: timestamp,
  });
}

function validationErrors(retryResultAcknowledgementSummarySurface = {}, options = {}) {
  const errors = [];
  if (!isPlainObject(retryResultAcknowledgementSummarySurface)) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_BLOCKERS.SUMMARY_SURFACE_REQUIRED, 'Retry result closure readiness requires a Phase 17 acknowledgement summary surface.', 'retryResultAcknowledgementSummarySurface'));
  }
  if (options.applyClosure === true || options.closeReview === true || options.applyReviewClosure === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_BLOCKERS.CLOSURE_APPLICATION_BLOCKED, 'Retry result closure readiness cannot apply review closure.', 'applyClosure'));
  }
  if (options.persistClosure === true || options.persistReadiness === true || options.persistClosureReadiness === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_BLOCKERS.PERSISTENCE_BLOCKED, 'Retry result closure readiness cannot be persisted in Phase 18.', 'persistClosure'));
  }
  if (options.autoRetryEnabled === true || options.automaticReplayEnabled === true || options.automaticSecondRetryEnabled === true || options.executeRetry === true || options.applyRetry === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_BLOCKERS.SECOND_RETRY_BLOCKED, 'Retry result closure readiness cannot launch another retry.', 'executeRetry'));
  }
  if (options.backgroundRetryEnabled === true || options.backgroundReplayEnabled === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_BLOCKERS.BACKGROUND_RETRY_BLOCKED, 'Retry result closure readiness cannot start a background retry loop.', 'backgroundRetryEnabled'));
  }
  if (options.applyQueueWrites === true || options.queueWriteAllowed === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_BLOCKERS.QUEUE_WRITE_BLOCKED, 'Retry result closure readiness does not write ScanOps queue state.', 'queueWriteAllowed'));
  }
  if (options.inventoryMutationAllowed === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_BLOCKERS.INVENTORY_WRITE_BLOCKED, 'Retry result closure readiness cannot mutate Inventory truth.', 'inventoryMutationAllowed'));
  }
  if (options.stockMutationAllowed === true || options.priceMutationAllowed === true || options.ledgerMutationAllowed === true || options.approvalMutationAllowed === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_BLOCKERS.DIRECT_MUTATION_BLOCKED, 'Retry result closure readiness cannot mutate stock, price, ledger, or approvals.', 'mutationAllowed'));
  }
  return errors;
}

export function buildScanOpsRetryResultClosureReadinessSurface(retryResultAcknowledgementSummarySurface = {}, options = {}) {
  const timestamp = nowIso(options.now);
  const errors = validationErrors(retryResultAcknowledgementSummarySurface, options);

  if (errors.length > 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_STATUSES.BLOCKED, timestamp),
      readinessItems: freezeArray([]),
      readinessItemCount: 0,
      closureReadyCount: 0,
      closurePendingCount: 0,
      futureScopedClosureReady: false,
      displayOnlyCount: 0,
      errors: freezeArray(errors),
    });
  }

  const summaryItems = Array.isArray(retryResultAcknowledgementSummarySurface.summaryItems)
    ? retryResultAcknowledgementSummarySurface.summaryItems
    : [];

  if (summaryItems.length === 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_STATUSES.EMPTY, timestamp),
      readinessItems: freezeArray([]),
      readinessItemCount: 0,
      closureReadyCount: 0,
      closurePendingCount: 0,
      futureScopedClosureReady: false,
      displayOnlyCount: 0,
      errors: freezeArray([]),
    });
  }

  const readinessItems = summaryItems.map((item, index) => buildReadinessItem(item, index, timestamp));
  const closureReadyCount = readinessItems.filter((item) => item.acknowledgementCoverageReady === true).length;
  const closurePendingCount = readinessItems.length - closureReadyCount;

  return Object.freeze({
    ...base(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_STATUSES.READY, timestamp),
    readinessItems: freezeArray(readinessItems),
    readinessItemCount: readinessItems.length,
    closureReadyCount,
    closurePendingCount,
    futureScopedClosureReady: readinessItems.length > 0 && closurePendingCount === 0,
    displayOnlyCount: readinessItems.filter((item) => item.displayOnly === true && item.queueWriteApplied === false && item.closureApplied === false && item.closurePersistenceApplied === false).length,
    errors: freezeArray([]),
  });
}
