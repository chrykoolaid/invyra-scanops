export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_PHASE = '24';
export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_COMPONENT = 'scanops_bridge_retry_result_final_review_readiness_outcome_summary_surface';
export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_VERSION = 'scanops-retry-result-final-review-readiness-outcome-summary.v0.24.0';
export const SCANOPS_BRIDGE_PHASE_23_FINAL_REVIEW_READINESS_OUTCOME_COMPONENT = 'scanops_bridge_retry_result_final_review_readiness_outcome_descriptor_surface';

export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_STATUSES = Object.freeze({
  READY: 'RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_READY',
  EMPTY: 'RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_EMPTY',
  BLOCKED: 'RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_BLOCKED',
});

export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_BLOCKERS = Object.freeze({
  OUTCOME_SURFACE_REQUIRED: 'retry_result_final_review_readiness_outcome_surface_required',
  SUMMARY_APPLICATION_BLOCKED: 'final_review_readiness_outcome_summary_application_blocked',
  CLOSURE_APPLICATION_BLOCKED: 'closure_application_blocked',
  PERSISTENCE_BLOCKED: 'final_review_readiness_outcome_summary_persistence_blocked',
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

function isPhase23ReadinessOutcomeSurface(value) {
  return isPlainObject(value)
    && value.phase === '23'
    && value.component === SCANOPS_BRIDGE_PHASE_23_FINAL_REVIEW_READINESS_OUTCOME_COMPONENT
    && Array.isArray(value.outcomeItems);
}

function nowIso(now) {
  return typeof now === 'function' ? now() : new Date().toISOString();
}

function issue(code, message, field = null) {
  return Object.freeze({ code, message, field });
}

function base(status, timestamp) {
  return {
    component: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_COMPONENT,
    phase: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_PHASE,
    version: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_VERSION,
    status,
    timestamp,
    outcomeSummaryMode: 'LOCAL_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_ONLY',
    consumesPhase23FinalReviewReadinessOutcomeSurface: true,
    localSummaryOnly: true,
    displayOnly: true,
    closureApplicationAllowed: false,
    closureApplied: false,
    finalReviewReadinessOutcomeSummaryPersistenceAllowed: false,
    finalReviewReadinessOutcomeSummaryPersistenceApplied: false,
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
  if (item.readyForLaterClosureReview === true) return 'Ready later outcome summarized locally';
  if (item.keepReviewOpen === true) return 'Keep-open outcome summarized locally';
  if (item.acknowledgementResolutionRequired === true) return 'Acknowledgement-first outcome summarized locally';
  return 'Final-review-pending outcome summarized locally';
}

function instructionFor(item = {}) {
  if (item.readyForLaterClosureReview === true) return 'Ready-later outcome is summarized for review only. No closure is applied.';
  if (item.keepReviewOpen === true) return 'Keep-open outcome is summarized for review only. Queue state is unchanged.';
  if (item.acknowledgementResolutionRequired === true) return 'Acknowledgement-first outcome is summarized for review only. Keep visible without mutation.';
  return 'Pending outcome is summarized for review only. Keep visible without mutation.';
}

function buildSummaryItem(item = {}, index = 0, timestamp) {
  return Object.freeze({
    finalReviewReadinessOutcomeSummaryId: `retry-result-final-review-readiness-outcome-summary:${item.finalReviewReadinessOutcomeId || index}`,
    finalReviewReadinessOutcomeId: item.finalReviewReadinessOutcomeId || null,
    finalReviewReadinessSummaryItemId: item.finalReviewReadinessSummaryItemId || null,
    finalReviewSnapshotItemId: item.finalReviewSnapshotItemId || null,
    retryResultReviewId: item.retryResultReviewId || null,
    queueItemId: item.queueItemId || null,
    classification: item.classification || null,
    selectedDescriptor: item.selectedDescriptor || null,
    outcomeDescriptor: item.outcomeDescriptor || null,
    readyForLaterClosureReview: item.readyForLaterClosureReview === true,
    keepReviewOpen: item.keepReviewOpen === true,
    acknowledgementResolutionRequired: item.acknowledgementResolutionRequired === true,
    finalReviewPending: item.finalReviewPending === true,
    summaryStatus: summaryStatusFor(item),
    instruction: instructionFor(item),
    localSummaryOnly: true,
    displayOnly: true,
    closureApplicationAllowed: false,
    closureApplied: false,
    finalReviewReadinessOutcomeSummaryPersistenceAllowed: false,
    finalReviewReadinessOutcomeSummaryPersistenceApplied: false,
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

function validationErrors(outcomeSurface = null, options = {}) {
  const errors = [];
  if (!isPhase23ReadinessOutcomeSurface(outcomeSurface)) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_BLOCKERS.OUTCOME_SURFACE_REQUIRED, 'Phase 24 requires the Phase 23 outcome surface.', 'outcomeSurface'));
  }
  if (options.applySummary === true || options.applyOutcomeSummary === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_BLOCKERS.SUMMARY_APPLICATION_BLOCKED, 'Phase 24 summary is display-only.', 'applySummary'));
  if (options.applyClosure === true || options.closeReview === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_BLOCKERS.CLOSURE_APPLICATION_BLOCKED, 'Phase 24 cannot apply closure.', 'applyClosure'));
  if (options.persistSummary === true || options.persistOutcomeSummary === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_BLOCKERS.PERSISTENCE_BLOCKED, 'Phase 24 cannot persist summaries.', 'persistSummary'));
  if (options.executeRetry === true || options.applyRetry === true || options.automaticSecondRetryEnabled === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_BLOCKERS.SECOND_RETRY_BLOCKED, 'Phase 24 cannot trigger retry.', 'executeRetry'));
  if (options.backgroundRetryEnabled === true || options.backgroundReplayEnabled === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_BLOCKERS.BACKGROUND_RETRY_BLOCKED, 'Phase 24 cannot enable background retry.', 'backgroundRetryEnabled'));
  if (options.applyQueueWrites === true || options.queueWriteAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_BLOCKERS.QUEUE_WRITE_BLOCKED, 'Phase 24 cannot write queue state.', 'queueWriteAllowed'));
  if (options.inventoryMutationAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_BLOCKERS.INVENTORY_WRITE_BLOCKED, 'Phase 24 cannot mutate Inventory.', 'inventoryMutationAllowed'));
  if (options.stockMutationAllowed === true || options.priceMutationAllowed === true || options.ledgerMutationAllowed === true || options.approvalMutationAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_BLOCKERS.DIRECT_MUTATION_BLOCKED, 'Phase 24 cannot mutate governed records.', 'mutationAllowed'));
  return errors;
}

export function buildScanOpsRetryResultFinalReviewReadinessOutcomeSummarySurface(outcomeSurface = null, options = {}) {
  const timestamp = nowIso(options.now);
  const errors = validationErrors(outcomeSurface, options);
  if (errors.length > 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_STATUSES.BLOCKED, timestamp),
      outcomeSummaryItems: freezeArray([]),
      outcomeSummaryItemCount: 0,
      readyLaterSummaryCount: 0,
      keepOpenSummaryCount: 0,
      acknowledgementFirstSummaryCount: 0,
      finalReviewPendingSummaryCount: 0,
      displayOnlyCount: 0,
      errors: freezeArray(errors),
    });
  }

  const sourceItems = outcomeSurface.outcomeItems;
  if (sourceItems.length === 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_STATUSES.EMPTY, timestamp),
      outcomeSummaryItems: freezeArray([]),
      outcomeSummaryItemCount: 0,
      readyLaterSummaryCount: 0,
      keepOpenSummaryCount: 0,
      acknowledgementFirstSummaryCount: 0,
      finalReviewPendingSummaryCount: 0,
      displayOnlyCount: 0,
      errors: freezeArray([]),
    });
  }

  const outcomeSummaryItems = sourceItems.map((item, index) => buildSummaryItem(item, index, timestamp));
  return Object.freeze({
    ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_STATUSES.READY, timestamp),
    outcomeSummaryItems: freezeArray(outcomeSummaryItems),
    outcomeSummaryItemCount: outcomeSummaryItems.length,
    readyLaterSummaryCount: outcomeSummaryItems.filter((item) => item.readyForLaterClosureReview === true).length,
    keepOpenSummaryCount: outcomeSummaryItems.filter((item) => item.keepReviewOpen === true).length,
    acknowledgementFirstSummaryCount: outcomeSummaryItems.filter((item) => item.acknowledgementResolutionRequired === true).length,
    finalReviewPendingSummaryCount: outcomeSummaryItems.filter((item) => item.finalReviewPending === true).length,
    displayOnlyCount: outcomeSummaryItems.filter((item) => item.displayOnly === true && item.queueWriteApplied === false && item.closureApplied === false && item.finalReviewReadinessOutcomeSummaryPersistenceApplied === false).length,
    errors: freezeArray([]),
  });
}
