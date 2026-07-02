export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_PHASE = '26';
export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_COMPONENT = 'scanops_bridge_retry_result_final_review_closure_candidate_outcome_surface';
export const SCANOPS_BRIDGE_PHASE_25_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_COMPONENT = 'scanops_bridge_retry_result_final_review_closure_candidate_summary_surface';

export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_STATUSES = Object.freeze({
  READY: 'RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_READY',
  EMPTY: 'RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_EMPTY',
  BLOCKED: 'RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_BLOCKED',
});

export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_BLOCKERS = Object.freeze({
  CANDIDATE_SUMMARY_REQUIRED: 'retry_result_final_review_closure_candidate_summary_surface_required',
  OUTCOME_APPLICATION_BLOCKED: 'final_review_closure_candidate_outcome_application_blocked',
  CLOSURE_APPLICATION_BLOCKED: 'closure_application_blocked',
  PERSISTENCE_BLOCKED: 'final_review_closure_candidate_outcome_persistence_blocked',
  SECOND_RETRY_BLOCKED: 'second_retry_blocked',
  BACKGROUND_RETRY_BLOCKED: 'background_retry_blocked',
  QUEUE_WRITE_BLOCKED: 'queue_write_blocked',
  INVENTORY_WRITE_BLOCKED: 'inventory_write_blocked',
  DIRECT_MUTATION_BLOCKED: 'direct_mutation_blocked',
});

function freezeArray(values) {
  return Object.freeze([...(values || [])]);
}

function isValidPhase25(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && value.phase === '25'
    && value.component === SCANOPS_BRIDGE_PHASE_25_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_COMPONENT
    && Array.isArray(value.closureCandidateSummaryItems);
}

function nowIso(now) {
  return typeof now === 'function' ? now() : new Date().toISOString();
}

function issue(code, message, field = null) {
  return Object.freeze({ code, message, field });
}

function base(status, timestamp) {
  return {
    component: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_COMPONENT,
    phase: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_PHASE,
    status,
    timestamp,
    outcomeMode: 'LOCAL_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_DESCRIPTOR_ONLY',
    consumesPhase25FinalReviewClosureCandidateSummarySurface: true,
    localOutcomeOnly: true,
    descriptorOnly: true,
    displayOnly: true,
    closureApplicationAllowed: false,
    closureApplied: false,
    outcomePersistenceAllowed: false,
    outcomePersistenceApplied: false,
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

function descriptorFor(item = {}) {
  if (item.closureCandidate === true) return 'Ready for later closure review';
  if (item.keepReviewOpen === true) return 'Keep review open before closure';
  if (item.acknowledgementResolutionRequired === true) return 'Resolve acknowledgement before closure';
  return 'Complete final review before closure';
}

function buildOutcomeItem(item = {}, index = 0, timestamp) {
  const outcomeDescriptor = descriptorFor(item);
  return Object.freeze({
    finalReviewClosureCandidateOutcomeId: `retry-result-final-review-closure-candidate-outcome:${item.finalReviewClosureCandidateSummaryId || index}`,
    finalReviewClosureCandidateSummaryId: item.finalReviewClosureCandidateSummaryId || null,
    retryResultReviewId: item.retryResultReviewId || null,
    queueItemId: item.queueItemId || null,
    candidateStatus: item.candidateStatus || null,
    outcomeDescriptor,
    readyForLaterClosureReview: outcomeDescriptor === 'Ready for later closure review',
    keepReviewOpenBeforeClosure: outcomeDescriptor === 'Keep review open before closure',
    acknowledgementResolutionBeforeClosure: outcomeDescriptor === 'Resolve acknowledgement before closure',
    finalReviewBeforeClosure: outcomeDescriptor === 'Complete final review before closure',
    instruction: `${outcomeDescriptor}. Descriptor only; no closure or queue write is applied.`,
    localOutcomeOnly: true,
    descriptorOnly: true,
    displayOnly: true,
    closureApplicationAllowed: false,
    closureApplied: false,
    outcomePersistenceAllowed: false,
    outcomePersistenceApplied: false,
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
    describedAt: timestamp,
  });
}

function validationErrors(candidateSummarySurface = null, options = {}) {
  const errors = [];
  if (!isValidPhase25(candidateSummarySurface)) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_BLOCKERS.CANDIDATE_SUMMARY_REQUIRED, 'Phase 26 requires the Phase 25 closure candidate summary surface.', 'candidateSummarySurface'));
  if (options.applyOutcome === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_BLOCKERS.OUTCOME_APPLICATION_BLOCKED, 'Phase 26 outcomes are descriptor-only.', 'applyOutcome'));
  if (options.applyClosure === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_BLOCKERS.CLOSURE_APPLICATION_BLOCKED, 'Phase 26 cannot apply closure.', 'applyClosure'));
  if (options.persistOutcome === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_BLOCKERS.PERSISTENCE_BLOCKED, 'Phase 26 cannot persist outcomes.', 'persistOutcome'));
  if (options.executeRetry === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_BLOCKERS.SECOND_RETRY_BLOCKED, 'Phase 26 cannot trigger retry.', 'executeRetry'));
  if (options.backgroundRetryEnabled === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_BLOCKERS.BACKGROUND_RETRY_BLOCKED, 'Phase 26 cannot enable background retry.', 'backgroundRetryEnabled'));
  if (options.applyQueueWrites === true || options.queueWriteAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_BLOCKERS.QUEUE_WRITE_BLOCKED, 'Phase 26 cannot write queue state.', 'queueWriteAllowed'));
  if (options.inventoryMutationAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_BLOCKERS.INVENTORY_WRITE_BLOCKED, 'Phase 26 cannot mutate Inventory.', 'inventoryMutationAllowed'));
  if (options.stockMutationAllowed === true || options.priceMutationAllowed === true || options.ledgerMutationAllowed === true || options.approvalMutationAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_BLOCKERS.DIRECT_MUTATION_BLOCKED, 'Phase 26 cannot mutate governed records.', 'mutationAllowed'));
  return errors;
}

export function buildScanOpsRetryResultFinalReviewClosureCandidateOutcomeSurface(candidateSummarySurface = null, options = {}) {
  const timestamp = nowIso(options.now);
  const errors = validationErrors(candidateSummarySurface, options);
  if (errors.length > 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_STATUSES.BLOCKED, timestamp),
      closureCandidateOutcomeItems: freezeArray([]),
      closureCandidateOutcomeItemCount: 0,
      readyForLaterClosureReviewCount: 0,
      keepReviewOpenBeforeClosureCount: 0,
      acknowledgementResolutionBeforeClosureCount: 0,
      finalReviewBeforeClosureCount: 0,
      displayOnlyCount: 0,
      errors: freezeArray(errors),
    });
  }

  const sourceItems = candidateSummarySurface.closureCandidateSummaryItems;
  if (sourceItems.length === 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_STATUSES.EMPTY, timestamp),
      closureCandidateOutcomeItems: freezeArray([]),
      closureCandidateOutcomeItemCount: 0,
      readyForLaterClosureReviewCount: 0,
      keepReviewOpenBeforeClosureCount: 0,
      acknowledgementResolutionBeforeClosureCount: 0,
      finalReviewBeforeClosureCount: 0,
      displayOnlyCount: 0,
      errors: freezeArray([]),
    });
  }

  const closureCandidateOutcomeItems = sourceItems.map((item, index) => buildOutcomeItem(item, index, timestamp));
  return Object.freeze({
    ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_STATUSES.READY, timestamp),
    closureCandidateOutcomeItems: freezeArray(closureCandidateOutcomeItems),
    closureCandidateOutcomeItemCount: closureCandidateOutcomeItems.length,
    readyForLaterClosureReviewCount: closureCandidateOutcomeItems.filter((item) => item.readyForLaterClosureReview).length,
    keepReviewOpenBeforeClosureCount: closureCandidateOutcomeItems.filter((item) => item.keepReviewOpenBeforeClosure).length,
    acknowledgementResolutionBeforeClosureCount: closureCandidateOutcomeItems.filter((item) => item.acknowledgementResolutionBeforeClosure).length,
    finalReviewBeforeClosureCount: closureCandidateOutcomeItems.filter((item) => item.finalReviewBeforeClosure).length,
    displayOnlyCount: closureCandidateOutcomeItems.filter((item) => item.displayOnly && !item.queueWriteApplied && !item.closureApplied && !item.outcomePersistenceApplied).length,
    errors: freezeArray([]),
  });
}
