export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_PHASE = '25';
export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_COMPONENT = 'scanops_bridge_retry_result_final_review_closure_candidate_summary_surface';
export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_VERSION = 'scanops-retry-result-final-review-closure-candidate-summary.v0.25.0';
export const SCANOPS_BRIDGE_PHASE_24_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_COMPONENT = 'scanops_bridge_retry_result_final_review_readiness_outcome_summary_surface';

export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_STATUSES = Object.freeze({
  READY: 'RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_READY',
  EMPTY: 'RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_EMPTY',
  BLOCKED: 'RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_BLOCKED',
});

export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_BLOCKERS = Object.freeze({
  OUTCOME_SUMMARY_REQUIRED: 'retry_result_final_review_readiness_outcome_summary_surface_required',
  CANDIDATE_APPLICATION_BLOCKED: 'final_review_closure_candidate_application_blocked',
  CLOSURE_APPLICATION_BLOCKED: 'closure_application_blocked',
  PERSISTENCE_BLOCKED: 'final_review_closure_candidate_summary_persistence_blocked',
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

function isPhase24OutcomeSummarySurface(value) {
  return isPlainObject(value)
    && value.phase === '24'
    && value.component === SCANOPS_BRIDGE_PHASE_24_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_COMPONENT
    && Array.isArray(value.outcomeSummaryItems);
}

function nowIso(now) {
  return typeof now === 'function' ? now() : new Date().toISOString();
}

function issue(code, message, field = null) {
  return Object.freeze({ code, message, field });
}

function base(status, timestamp) {
  return {
    component: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_COMPONENT,
    phase: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_PHASE,
    version: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_VERSION,
    status,
    timestamp,
    candidateSummaryMode: 'LOCAL_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_ONLY',
    consumesPhase24FinalReviewReadinessOutcomeSummarySurface: true,
    localCandidateSummaryOnly: true,
    displayOnly: true,
    closureApplicationAllowed: false,
    closureApplied: false,
    finalReviewClosureCandidateSummaryPersistenceAllowed: false,
    finalReviewClosureCandidateSummaryPersistenceApplied: false,
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

function candidateStatusFor(item = {}) {
  if (item.readyForLaterClosureReview === true) return 'Closure candidate for later scoped review';
  if (item.keepReviewOpen === true) return 'Not a closure candidate: keep review open';
  if (item.acknowledgementResolutionRequired === true) return 'Not a closure candidate: acknowledgement first';
  return 'Not a closure candidate: final review pending';
}

function instructionFor(item = {}) {
  if (item.readyForLaterClosureReview === true) return 'Candidate is noted for later review only. No closure is applied.';
  if (item.keepReviewOpen === true) return 'Keep-open item cannot become a closure candidate in Phase 25.';
  if (item.acknowledgementResolutionRequired === true) return 'Acknowledgement must be resolved before any later closure consideration.';
  return 'Final review remains pending. Keep visible without mutation.';
}

function buildCandidateItem(item = {}, index = 0, timestamp) {
  return Object.freeze({
    finalReviewClosureCandidateSummaryId: `retry-result-final-review-closure-candidate-summary:${item.finalReviewReadinessOutcomeSummaryId || index}`,
    finalReviewReadinessOutcomeSummaryId: item.finalReviewReadinessOutcomeSummaryId || null,
    finalReviewReadinessOutcomeId: item.finalReviewReadinessOutcomeId || null,
    finalReviewReadinessSummaryItemId: item.finalReviewReadinessSummaryItemId || null,
    finalReviewSnapshotItemId: item.finalReviewSnapshotItemId || null,
    retryResultReviewId: item.retryResultReviewId || null,
    queueItemId: item.queueItemId || null,
    classification: item.classification || null,
    selectedDescriptor: item.selectedDescriptor || null,
    outcomeDescriptor: item.outcomeDescriptor || null,
    closureCandidate: item.readyForLaterClosureReview === true,
    closureCandidateBlocked: item.readyForLaterClosureReview !== true,
    readyForLaterClosureReview: item.readyForLaterClosureReview === true,
    keepReviewOpen: item.keepReviewOpen === true,
    acknowledgementResolutionRequired: item.acknowledgementResolutionRequired === true,
    finalReviewPending: item.finalReviewPending === true,
    candidateStatus: candidateStatusFor(item),
    instruction: instructionFor(item),
    localCandidateSummaryOnly: true,
    displayOnly: true,
    closureApplicationAllowed: false,
    closureApplied: false,
    finalReviewClosureCandidateSummaryPersistenceAllowed: false,
    finalReviewClosureCandidateSummaryPersistenceApplied: false,
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

function validationErrors(outcomeSummarySurface = null, options = {}) {
  const errors = [];
  if (!isPhase24OutcomeSummarySurface(outcomeSummarySurface)) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_BLOCKERS.OUTCOME_SUMMARY_REQUIRED, 'Phase 25 requires the Phase 24 outcome summary surface.', 'outcomeSummarySurface'));
  }
  if (options.applyCandidateSummary === true || options.applyClosureCandidate === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_BLOCKERS.CANDIDATE_APPLICATION_BLOCKED, 'Phase 25 closure candidates are display-only.', 'applyCandidateSummary'));
  if (options.applyClosure === true || options.closeReview === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_BLOCKERS.CLOSURE_APPLICATION_BLOCKED, 'Phase 25 cannot apply closure.', 'applyClosure'));
  if (options.persistCandidateSummary === true || options.persistClosureCandidate === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_BLOCKERS.PERSISTENCE_BLOCKED, 'Phase 25 cannot persist closure candidate summaries.', 'persistCandidateSummary'));
  if (options.executeRetry === true || options.applyRetry === true || options.automaticSecondRetryEnabled === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_BLOCKERS.SECOND_RETRY_BLOCKED, 'Phase 25 cannot trigger retry.', 'executeRetry'));
  if (options.backgroundRetryEnabled === true || options.backgroundReplayEnabled === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_BLOCKERS.BACKGROUND_RETRY_BLOCKED, 'Phase 25 cannot enable background retry.', 'backgroundRetryEnabled'));
  if (options.applyQueueWrites === true || options.queueWriteAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_BLOCKERS.QUEUE_WRITE_BLOCKED, 'Phase 25 cannot write queue state.', 'queueWriteAllowed'));
  if (options.inventoryMutationAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_BLOCKERS.INVENTORY_WRITE_BLOCKED, 'Phase 25 cannot mutate Inventory.', 'inventoryMutationAllowed'));
  if (options.stockMutationAllowed === true || options.priceMutationAllowed === true || options.ledgerMutationAllowed === true || options.approvalMutationAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_BLOCKERS.DIRECT_MUTATION_BLOCKED, 'Phase 25 cannot mutate governed records.', 'mutationAllowed'));
  return errors;
}

export function buildScanOpsRetryResultFinalReviewClosureCandidateSummarySurface(outcomeSummarySurface = null, options = {}) {
  const timestamp = nowIso(options.now);
  const errors = validationErrors(outcomeSummarySurface, options);
  if (errors.length > 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_STATUSES.BLOCKED, timestamp),
      closureCandidateSummaryItems: freezeArray([]),
      closureCandidateSummaryItemCount: 0,
      closureCandidateCount: 0,
      closureCandidateBlockedCount: 0,
      keepOpenBlockedCount: 0,
      acknowledgementBlockedCount: 0,
      finalReviewPendingBlockedCount: 0,
      displayOnlyCount: 0,
      errors: freezeArray(errors),
    });
  }

  const sourceItems = outcomeSummarySurface.outcomeSummaryItems;
  if (sourceItems.length === 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_STATUSES.EMPTY, timestamp),
      closureCandidateSummaryItems: freezeArray([]),
      closureCandidateSummaryItemCount: 0,
      closureCandidateCount: 0,
      closureCandidateBlockedCount: 0,
      keepOpenBlockedCount: 0,
      acknowledgementBlockedCount: 0,
      finalReviewPendingBlockedCount: 0,
      displayOnlyCount: 0,
      errors: freezeArray([]),
    });
  }

  const closureCandidateSummaryItems = sourceItems.map((item, index) => buildCandidateItem(item, index, timestamp));
  return Object.freeze({
    ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_STATUSES.READY, timestamp),
    closureCandidateSummaryItems: freezeArray(closureCandidateSummaryItems),
    closureCandidateSummaryItemCount: closureCandidateSummaryItems.length,
    closureCandidateCount: closureCandidateSummaryItems.filter((item) => item.closureCandidate === true).length,
    closureCandidateBlockedCount: closureCandidateSummaryItems.filter((item) => item.closureCandidateBlocked === true).length,
    keepOpenBlockedCount: closureCandidateSummaryItems.filter((item) => item.keepReviewOpen === true).length,
    acknowledgementBlockedCount: closureCandidateSummaryItems.filter((item) => item.acknowledgementResolutionRequired === true).length,
    finalReviewPendingBlockedCount: closureCandidateSummaryItems.filter((item) => item.finalReviewPending === true).length,
    displayOnlyCount: closureCandidateSummaryItems.filter((item) => item.displayOnly === true && item.queueWriteApplied === false && item.closureApplied === false && item.finalReviewClosureCandidateSummaryPersistenceApplied === false).length,
    errors: freezeArray([]),
  });
}
