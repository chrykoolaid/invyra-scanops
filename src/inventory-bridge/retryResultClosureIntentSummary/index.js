export const SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_PHASE = '20';
export const SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_COMPONENT = 'scanops_bridge_retry_result_closure_intent_summary_surface';
export const SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_VERSION = 'scanops-retry-result-closure-intent-summary.v0.20.0';

export const SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_STATUSES = Object.freeze({
  READY: 'RETRY_RESULT_CLOSURE_INTENT_SUMMARY_READY',
  EMPTY: 'RETRY_RESULT_CLOSURE_INTENT_SUMMARY_EMPTY',
  BLOCKED: 'RETRY_RESULT_CLOSURE_INTENT_SUMMARY_BLOCKED',
});

export const SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_BLOCKERS = Object.freeze({
  INTENT_SURFACE_REQUIRED: 'retry_result_closure_intent_surface_required',
  SUMMARY_APPLICATION_BLOCKED: 'closure_intent_summary_application_blocked',
  CLOSURE_APPLICATION_BLOCKED: 'closure_application_blocked',
  PERSISTENCE_BLOCKED: 'closure_intent_summary_persistence_blocked',
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
    component: SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_COMPONENT,
    phase: SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_PHASE,
    version: SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_VERSION,
    status,
    timestamp,
    summaryMode: 'LOCAL_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_ONLY',
    consumesPhase19ClosureIntentSurface: true,
    localSummaryOnly: true,
    displayOnly: true,
    closureApplicationAllowed: false,
    closureApplied: false,
    closureIntentSummaryPersistenceAllowed: false,
    closureIntentSummaryPersistenceApplied: false,
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

function summaryStatusFor(closureIntentItem = {}) {
  if (closureIntentItem.readyForFutureClosureSelected === true) return 'Future closure intent selected locally';
  if (closureIntentItem.keepReviewOpenSelected === true) return 'Keep review open selected locally';
  if (closureIntentItem.acknowledgementStillPendingSelected === true) return 'Acknowledgement still pending selected locally';
  return 'Closure intent not selected';
}

function instructionFor(closureIntentItem = {}) {
  if (closureIntentItem.readyForFutureClosureSelected === true) {
    return 'Ready-for-future-closure is summarized locally only. No closure is applied.';
  }
  if (closureIntentItem.keepReviewOpenSelected === true) {
    return 'Keep-review-open is summarized locally only. Queue state is unchanged.';
  }
  if (closureIntentItem.acknowledgementStillPendingSelected === true) {
    return 'Acknowledgement-still-pending is summarized locally only. Review remains visible without mutation.';
  }
  return 'No closure intent descriptor has been selected. Summary remains display-only.';
}

function buildSummaryItem(closureIntentItem = {}, index = 0, timestamp) {
  return Object.freeze({
    closureIntentSummaryId: `retry-result-closure-intent-summary:${closureIntentItem.closureIntentId || closureIntentItem.readinessItemId || index}`,
    closureIntentId: closureIntentItem.closureIntentId || null,
    readinessItemId: closureIntentItem.readinessItemId || null,
    summaryItemId: closureIntentItem.summaryItemId || null,
    acknowledgementIntentId: closureIntentItem.acknowledgementIntentId || null,
    retryResultReviewId: closureIntentItem.retryResultReviewId || null,
    queueItemId: closureIntentItem.queueItemId || null,
    bridgeEnvelopeId: closureIntentItem.bridgeEnvelopeId || null,
    bridgeReceiptId: closureIntentItem.bridgeReceiptId || null,
    classification: closureIntentItem.classification || null,
    outcomeLabel: closureIntentItem.outcomeLabel || null,
    selectedDescriptor: closureIntentItem.selectedDescriptor || null,
    closureIntentSelected: closureIntentItem.closureIntentSelected === true,
    readyForFutureClosureSelected: closureIntentItem.readyForFutureClosureSelected === true,
    keepReviewOpenSelected: closureIntentItem.keepReviewOpenSelected === true,
    acknowledgementStillPendingSelected: closureIntentItem.acknowledgementStillPendingSelected === true,
    summaryStatus: summaryStatusFor(closureIntentItem),
    instruction: instructionFor(closureIntentItem),
    localSummaryOnly: true,
    displayOnly: true,
    closureApplicationAllowed: false,
    closureApplied: false,
    closureIntentSummaryPersistenceAllowed: false,
    closureIntentSummaryPersistenceApplied: false,
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
    summarizedAt: timestamp,
  });
}

function validationErrors(retryResultClosureIntentSurface = {}, options = {}) {
  const errors = [];
  if (!isPlainObject(retryResultClosureIntentSurface)) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_BLOCKERS.INTENT_SURFACE_REQUIRED, 'Retry result closure intent summary requires a Phase 19 closure intent surface.', 'retryResultClosureIntentSurface'));
  }
  if (options.applySummary === true || options.applyClosureIntentSummary === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_BLOCKERS.SUMMARY_APPLICATION_BLOCKED, 'Retry result closure intent summary is display-only and cannot apply summary state.', 'applySummary'));
  }
  if (options.applyClosure === true || options.closeReview === true || options.applyReviewClosure === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_BLOCKERS.CLOSURE_APPLICATION_BLOCKED, 'Retry result closure intent summary cannot apply review closure.', 'applyClosure'));
  }
  if (options.persistClosureIntentSummary === true || options.persistSummary === true || options.persistIntent === true || options.persistClosure === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_BLOCKERS.PERSISTENCE_BLOCKED, 'Retry result closure intent summary cannot be persisted in Phase 20.', 'persistClosureIntentSummary'));
  }
  if (options.autoRetryEnabled === true || options.automaticReplayEnabled === true || options.automaticSecondRetryEnabled === true || options.executeRetry === true || options.applyRetry === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_BLOCKERS.SECOND_RETRY_BLOCKED, 'Retry result closure intent summary cannot launch another retry.', 'executeRetry'));
  }
  if (options.backgroundRetryEnabled === true || options.backgroundReplayEnabled === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_BLOCKERS.BACKGROUND_RETRY_BLOCKED, 'Retry result closure intent summary cannot start a background retry loop.', 'backgroundRetryEnabled'));
  }
  if (options.applyQueueWrites === true || options.queueWriteAllowed === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_BLOCKERS.QUEUE_WRITE_BLOCKED, 'Retry result closure intent summary does not write ScanOps queue state.', 'queueWriteAllowed'));
  }
  if (options.inventoryMutationAllowed === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_BLOCKERS.INVENTORY_WRITE_BLOCKED, 'Retry result closure intent summary cannot mutate Inventory truth.', 'inventoryMutationAllowed'));
  }
  if (options.stockMutationAllowed === true || options.priceMutationAllowed === true || options.ledgerMutationAllowed === true || options.approvalMutationAllowed === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_BLOCKERS.DIRECT_MUTATION_BLOCKED, 'Retry result closure intent summary cannot mutate stock, price, ledger, or approvals.', 'mutationAllowed'));
  }
  return errors;
}

export function buildScanOpsRetryResultClosureIntentSummarySurface(retryResultClosureIntentSurface = {}, options = {}) {
  const timestamp = nowIso(options.now);
  const errors = validationErrors(retryResultClosureIntentSurface, options);

  if (errors.length > 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_STATUSES.BLOCKED, timestamp),
      closureIntentSummaryItems: freezeArray([]),
      closureIntentSummaryItemCount: 0,
      selectedClosureIntentSummaryCount: 0,
      readyForFutureClosureSummaryCount: 0,
      keepReviewOpenSummaryCount: 0,
      acknowledgementStillPendingSummaryCount: 0,
      pendingClosureIntentSummaryCount: 0,
      displayOnlyCount: 0,
      errors: freezeArray(errors),
    });
  }

  const closureIntentItems = Array.isArray(retryResultClosureIntentSurface.closureIntentItems)
    ? retryResultClosureIntentSurface.closureIntentItems
    : [];

  if (closureIntentItems.length === 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_STATUSES.EMPTY, timestamp),
      closureIntentSummaryItems: freezeArray([]),
      closureIntentSummaryItemCount: 0,
      selectedClosureIntentSummaryCount: 0,
      readyForFutureClosureSummaryCount: 0,
      keepReviewOpenSummaryCount: 0,
      acknowledgementStillPendingSummaryCount: 0,
      pendingClosureIntentSummaryCount: 0,
      displayOnlyCount: 0,
      errors: freezeArray([]),
    });
  }

  const closureIntentSummaryItems = closureIntentItems.map((item, index) => buildSummaryItem(item, index, timestamp));

  return Object.freeze({
    ...base(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_STATUSES.READY, timestamp),
    closureIntentSummaryItems: freezeArray(closureIntentSummaryItems),
    closureIntentSummaryItemCount: closureIntentSummaryItems.length,
    selectedClosureIntentSummaryCount: closureIntentSummaryItems.filter((item) => item.closureIntentSelected === true).length,
    readyForFutureClosureSummaryCount: closureIntentSummaryItems.filter((item) => item.readyForFutureClosureSelected === true).length,
    keepReviewOpenSummaryCount: closureIntentSummaryItems.filter((item) => item.keepReviewOpenSelected === true).length,
    acknowledgementStillPendingSummaryCount: closureIntentSummaryItems.filter((item) => item.acknowledgementStillPendingSelected === true).length,
    pendingClosureIntentSummaryCount: closureIntentSummaryItems.filter((item) => item.closureIntentSelected !== true).length,
    displayOnlyCount: closureIntentSummaryItems.filter((item) => item.displayOnly === true && item.queueWriteApplied === false && item.closureApplied === false && item.closureIntentSummaryPersistenceApplied === false).length,
    errors: freezeArray([]),
  });
}
