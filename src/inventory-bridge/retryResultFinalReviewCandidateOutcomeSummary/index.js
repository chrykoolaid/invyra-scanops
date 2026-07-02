export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_PHASE = '27';
export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_COMPONENT = 'scanops_bridge_retry_result_final_review_candidate_outcome_summary_surface';
export const SCANOPS_BRIDGE_PHASE_26_FINAL_REVIEW_CANDIDATE_OUTCOME_COMPONENT = 'scanops_bridge_retry_result_final_review_closure_candidate_outcome_surface';

export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_STATUSES = Object.freeze({
  READY: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_READY',
  EMPTY: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_EMPTY',
  BLOCKED: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_BLOCKED',
});

export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_BLOCKERS = Object.freeze({
  OUTCOME_SURFACE_REQUIRED: 'retry_result_final_review_candidate_outcome_surface_required',
  SUMMARY_APPLICATION_BLOCKED: 'final_review_candidate_outcome_summary_application_blocked',
  CLOSURE_APPLICATION_BLOCKED: 'closure_application_blocked',
  PERSISTENCE_BLOCKED: 'final_review_candidate_outcome_summary_persistence_blocked',
  SECOND_RETRY_BLOCKED: 'second_retry_blocked',
  BACKGROUND_RETRY_BLOCKED: 'background_retry_blocked',
  QUEUE_WRITE_BLOCKED: 'queue_write_blocked',
  INVENTORY_WRITE_BLOCKED: 'inventory_write_blocked',
  DIRECT_MUTATION_BLOCKED: 'direct_mutation_blocked',
});

function freezeArray(values) {
  return Object.freeze([...(values || [])]);
}

function isValidPhase26(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && value.phase === '26'
    && value.component === SCANOPS_BRIDGE_PHASE_26_FINAL_REVIEW_CANDIDATE_OUTCOME_COMPONENT
    && Array.isArray(value.closureCandidateOutcomeItems);
}

function nowIso(now) {
  return typeof now === 'function' ? now() : new Date().toISOString();
}

function issue(code, message, field = null) {
  return Object.freeze({ code, message, field });
}

function base(status, timestamp) {
  return {
    component: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_COMPONENT,
    phase: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_PHASE,
    status,
    timestamp,
    summaryMode: 'LOCAL_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_ONLY',
    consumesPhase26FinalReviewCandidateOutcomeSurface: true,
    localSummaryOnly: true,
    displayOnly: true,
    closureApplicationAllowed: false,
    closureApplied: false,
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
  if (item.readyForLaterClosureReview === true) return 'Ready-later outcome summarized locally';
  if (item.keepReviewOpenBeforeClosure === true) return 'Keep-open-before-closure outcome summarized locally';
  if (item.acknowledgementResolutionBeforeClosure === true) return 'Acknowledgement-before-closure outcome summarized locally';
  return 'Final-review-before-closure outcome summarized locally';
}

function buildSummaryItem(item = {}, index = 0, timestamp) {
  return Object.freeze({
    finalReviewCandidateOutcomeSummaryId: `retry-result-final-review-candidate-outcome-summary:${item.finalReviewClosureCandidateOutcomeId || index}`,
    finalReviewClosureCandidateOutcomeId: item.finalReviewClosureCandidateOutcomeId || null,
    finalReviewClosureCandidateSummaryId: item.finalReviewClosureCandidateSummaryId || null,
    retryResultReviewId: item.retryResultReviewId || null,
    queueItemId: item.queueItemId || null,
    outcomeDescriptor: item.outcomeDescriptor || null,
    readyForLaterClosureReview: item.readyForLaterClosureReview === true,
    keepReviewOpenBeforeClosure: item.keepReviewOpenBeforeClosure === true,
    acknowledgementResolutionBeforeClosure: item.acknowledgementResolutionBeforeClosure === true,
    finalReviewBeforeClosure: item.finalReviewBeforeClosure === true,
    summaryStatus: summaryStatusFor(item),
    instruction: `${summaryStatusFor(item)}. Summary only; no closure or queue write is applied.`,
    localSummaryOnly: true,
    displayOnly: true,
    closureApplicationAllowed: false,
    closureApplied: false,
    summaryPersistenceAllowed: false,
    summaryPersistenceApplied: false,
    queueWriteAllowed: false,
    queueWriteApplied: false,
    retryApplied: false,
    secondRetryApplied: false,
    backgroundRetryEnabled: false,
    inventoryMutationAttempted: false,
    stockMutationAttempted: false,
    priceMutationAttempted: false,
    ledgerMutationAttempted: false,
    approvalMutationAttempted: false,
    summarizedAt: timestamp,
  });
}

function validationErrors(outcomeSurface = null, options = {}) {
  const errors = [];
  if (!isValidPhase26(outcomeSurface)) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_BLOCKERS.OUTCOME_SURFACE_REQUIRED, 'Phase 27 requires the Phase 26 candidate outcome surface.', 'outcomeSurface'));
  if (options.applySummary === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_BLOCKERS.SUMMARY_APPLICATION_BLOCKED, 'Phase 27 summary is display-only.', 'applySummary'));
  if (options.applyClosure === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_BLOCKERS.CLOSURE_APPLICATION_BLOCKED, 'Phase 27 cannot apply closure.', 'applyClosure'));
  if (options.persistSummary === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_BLOCKERS.PERSISTENCE_BLOCKED, 'Phase 27 cannot persist summaries.', 'persistSummary'));
  if (options.executeRetry === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_BLOCKERS.SECOND_RETRY_BLOCKED, 'Phase 27 cannot trigger retry.', 'executeRetry'));
  if (options.backgroundRetryEnabled === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_BLOCKERS.BACKGROUND_RETRY_BLOCKED, 'Phase 27 cannot enable background retry.', 'backgroundRetryEnabled'));
  if (options.applyQueueWrites === true || options.queueWriteAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_BLOCKERS.QUEUE_WRITE_BLOCKED, 'Phase 27 cannot write queue state.', 'queueWriteAllowed'));
  if (options.inventoryMutationAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_BLOCKERS.INVENTORY_WRITE_BLOCKED, 'Phase 27 cannot mutate Inventory.', 'inventoryMutationAllowed'));
  if (options.stockMutationAllowed === true || options.priceMutationAllowed === true || options.ledgerMutationAllowed === true || options.approvalMutationAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_BLOCKERS.DIRECT_MUTATION_BLOCKED, 'Phase 27 cannot mutate governed records.', 'mutationAllowed'));
  return errors;
}

export function buildScanOpsRetryResultFinalReviewCandidateOutcomeSummarySurface(outcomeSurface = null, options = {}) {
  const timestamp = nowIso(options.now);
  const errors = validationErrors(outcomeSurface, options);
  if (errors.length > 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_STATUSES.BLOCKED, timestamp),
      candidateOutcomeSummaryItems: freezeArray([]),
      candidateOutcomeSummaryItemCount: 0,
      readyLaterSummaryCount: 0,
      keepOpenSummaryCount: 0,
      acknowledgementFirstSummaryCount: 0,
      finalReviewFirstSummaryCount: 0,
      displayOnlyCount: 0,
      errors: freezeArray(errors),
    });
  }

  const sourceItems = outcomeSurface.closureCandidateOutcomeItems;
  if (sourceItems.length === 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_STATUSES.EMPTY, timestamp),
      candidateOutcomeSummaryItems: freezeArray([]),
      candidateOutcomeSummaryItemCount: 0,
      readyLaterSummaryCount: 0,
      keepOpenSummaryCount: 0,
      acknowledgementFirstSummaryCount: 0,
      finalReviewFirstSummaryCount: 0,
      displayOnlyCount: 0,
      errors: freezeArray([]),
    });
  }

  const candidateOutcomeSummaryItems = sourceItems.map((item, index) => buildSummaryItem(item, index, timestamp));
  return Object.freeze({
    ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_STATUSES.READY, timestamp),
    candidateOutcomeSummaryItems: freezeArray(candidateOutcomeSummaryItems),
    candidateOutcomeSummaryItemCount: candidateOutcomeSummaryItems.length,
    readyLaterSummaryCount: candidateOutcomeSummaryItems.filter((item) => item.readyForLaterClosureReview).length,
    keepOpenSummaryCount: candidateOutcomeSummaryItems.filter((item) => item.keepReviewOpenBeforeClosure).length,
    acknowledgementFirstSummaryCount: candidateOutcomeSummaryItems.filter((item) => item.acknowledgementResolutionBeforeClosure).length,
    finalReviewFirstSummaryCount: candidateOutcomeSummaryItems.filter((item) => item.finalReviewBeforeClosure).length,
    displayOnlyCount: candidateOutcomeSummaryItems.filter((item) => item.displayOnly && !item.queueWriteApplied && !item.closureApplied && !item.summaryPersistenceApplied).length,
    errors: freezeArray([]),
  });
}
