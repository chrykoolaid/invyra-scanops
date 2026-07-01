export const SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_PHASE = '17';
export const SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_COMPONENT = 'scanops_bridge_retry_result_acknowledgement_summary_surface';
export const SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_VERSION = 'scanops-retry-result-acknowledgement-summary.v0.17.0';

export const SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_STATUSES = Object.freeze({
  READY: 'RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_READY',
  EMPTY: 'RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_EMPTY',
  BLOCKED: 'RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_BLOCKED',
});

export const SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_BLOCKERS = Object.freeze({
  ACKNOWLEDGEMENT_BOUNDARY_REQUIRED: 'retry_result_acknowledgement_boundary_required',
  SUMMARY_APPLICATION_BLOCKED: 'summary_application_blocked',
  PERSISTENCE_BLOCKED: 'summary_persistence_blocked',
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
    component: SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_COMPONENT,
    phase: SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_PHASE,
    version: SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_VERSION,
    status,
    timestamp,
    summaryMode: 'LOCAL_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_ONLY',
    consumesPhase16RetryResultAcknowledgementBoundary: true,
    localSummaryOnly: true,
    displayOnly: true,
    summaryPersistenceAllowed: false,
    summaryPersistenceApplied: false,
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

function summaryStatusFor(item = {}) {
  if (item.acknowledgeRetryResultSelected === true) return 'Acknowledged locally';
  if (item.keepVisibleSelected === true) return 'Kept visible locally';
  if (item.reviewLaterSelected === true) return 'Marked review later locally';
  return 'Awaiting acknowledgement intent';
}

function instructionFor(item = {}) {
  if (item.acknowledgeRetryResultSelected === true) return 'Acknowledgement is local display intent only. Queue state is unchanged.';
  if (item.keepVisibleSelected === true) return 'Retry result stays visible for operator review. No queue write is applied.';
  if (item.reviewLaterSelected === true) return 'Retry result remains available for later review. No persistence is applied.';
  return 'No acknowledgement descriptor has been selected. Keep visible without mutation.';
}

function buildSummaryItem(acknowledgementItem = {}, index = 0, timestamp) {
  return Object.freeze({
    summaryItemId: `retry-result-ack-summary:${acknowledgementItem.retryResultReviewId || acknowledgementItem.acknowledgementIntentId || index}`,
    acknowledgementIntentId: acknowledgementItem.acknowledgementIntentId || null,
    retryResultReviewId: acknowledgementItem.retryResultReviewId || null,
    queueItemId: acknowledgementItem.queueItemId || null,
    bridgeEnvelopeId: acknowledgementItem.bridgeEnvelopeId || null,
    bridgeReceiptId: acknowledgementItem.bridgeReceiptId || null,
    classification: acknowledgementItem.classification || null,
    outcomeLabel: acknowledgementItem.outcomeLabel || null,
    selectedDescriptor: acknowledgementItem.selectedDescriptor || null,
    acknowledgementSelected: acknowledgementItem.acknowledgementSelected === true,
    acknowledgeRetryResultSelected: acknowledgementItem.acknowledgeRetryResultSelected === true,
    keepVisibleSelected: acknowledgementItem.keepVisibleSelected === true,
    reviewLaterSelected: acknowledgementItem.reviewLaterSelected === true,
    summaryStatus: summaryStatusFor(acknowledgementItem),
    instruction: instructionFor(acknowledgementItem),
    localSummaryOnly: true,
    displayOnly: true,
    summaryPersistenceAllowed: false,
    summaryPersistenceApplied: false,
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

function validationErrors(retryResultAcknowledgementBoundary = {}, options = {}) {
  const errors = [];
  if (!isPlainObject(retryResultAcknowledgementBoundary)) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_BLOCKERS.ACKNOWLEDGEMENT_BOUNDARY_REQUIRED, 'Retry result acknowledgement summary requires a Phase 16 acknowledgement boundary.', 'retryResultAcknowledgementBoundary'));
  }
  if (options.applySummary === true || options.applyAcknowledgementSummary === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_BLOCKERS.SUMMARY_APPLICATION_BLOCKED, 'Retry result acknowledgement summary is display-only and cannot apply decisions.', 'applySummary'));
  }
  if (options.persistSummary === true || options.persistAcknowledgementSummary === true || options.persistAcknowledgement === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_BLOCKERS.PERSISTENCE_BLOCKED, 'Retry result acknowledgement summary cannot be persisted in Phase 17.', 'persistSummary'));
  }
  if (options.autoRetryEnabled === true || options.automaticReplayEnabled === true || options.automaticSecondRetryEnabled === true || options.executeRetry === true || options.applyRetry === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_BLOCKERS.SECOND_RETRY_BLOCKED, 'Retry result acknowledgement summary cannot launch another retry.', 'executeRetry'));
  }
  if (options.backgroundRetryEnabled === true || options.backgroundReplayEnabled === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_BLOCKERS.BACKGROUND_RETRY_BLOCKED, 'Retry result acknowledgement summary cannot start a background retry loop.', 'backgroundRetryEnabled'));
  }
  if (options.applyQueueWrites === true || options.queueWriteAllowed === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_BLOCKERS.QUEUE_WRITE_BLOCKED, 'Retry result acknowledgement summary does not write ScanOps queue state.', 'queueWriteAllowed'));
  }
  if (options.inventoryMutationAllowed === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_BLOCKERS.INVENTORY_WRITE_BLOCKED, 'Retry result acknowledgement summary cannot mutate Inventory truth.', 'inventoryMutationAllowed'));
  }
  if (options.stockMutationAllowed === true || options.priceMutationAllowed === true || options.ledgerMutationAllowed === true || options.approvalMutationAllowed === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_BLOCKERS.DIRECT_MUTATION_BLOCKED, 'Retry result acknowledgement summary cannot mutate stock, price, ledger, or approvals.', 'mutationAllowed'));
  }
  return errors;
}

export function buildScanOpsRetryResultAcknowledgementSummarySurface(retryResultAcknowledgementBoundary = {}, options = {}) {
  const timestamp = nowIso(options.now);
  const errors = validationErrors(retryResultAcknowledgementBoundary, options);

  if (errors.length > 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_STATUSES.BLOCKED, timestamp),
      summaryItems: freezeArray([]),
      summaryItemCount: 0,
      selectedSummaryCount: 0,
      acknowledgedSummaryCount: 0,
      keptVisibleSummaryCount: 0,
      reviewLaterSummaryCount: 0,
      pendingSummaryCount: 0,
      displayOnlyCount: 0,
      errors: freezeArray(errors),
    });
  }

  const acknowledgementItems = Array.isArray(retryResultAcknowledgementBoundary.acknowledgementItems)
    ? retryResultAcknowledgementBoundary.acknowledgementItems
    : [];

  if (acknowledgementItems.length === 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_STATUSES.EMPTY, timestamp),
      summaryItems: freezeArray([]),
      summaryItemCount: 0,
      selectedSummaryCount: 0,
      acknowledgedSummaryCount: 0,
      keptVisibleSummaryCount: 0,
      reviewLaterSummaryCount: 0,
      pendingSummaryCount: 0,
      displayOnlyCount: 0,
      errors: freezeArray([]),
    });
  }

  const summaryItems = acknowledgementItems.map((item, index) => buildSummaryItem(item, index, timestamp));

  return Object.freeze({
    ...base(SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_STATUSES.READY, timestamp),
    summaryItems: freezeArray(summaryItems),
    summaryItemCount: summaryItems.length,
    selectedSummaryCount: summaryItems.filter((item) => item.acknowledgementSelected === true).length,
    acknowledgedSummaryCount: summaryItems.filter((item) => item.acknowledgeRetryResultSelected === true).length,
    keptVisibleSummaryCount: summaryItems.filter((item) => item.keepVisibleSelected === true).length,
    reviewLaterSummaryCount: summaryItems.filter((item) => item.reviewLaterSelected === true).length,
    pendingSummaryCount: summaryItems.filter((item) => item.acknowledgementSelected !== true).length,
    displayOnlyCount: summaryItems.filter((item) => item.displayOnly === true && item.queueWriteApplied === false && item.retryApplied === false && item.summaryPersistenceApplied === false).length,
    errors: freezeArray([]),
  });
}
