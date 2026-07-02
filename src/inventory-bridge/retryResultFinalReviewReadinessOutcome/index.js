export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_PHASE = '23';
export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_COMPONENT = 'scanops_bridge_retry_result_final_review_readiness_outcome_descriptor_surface';
export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_VERSION = 'scanops-retry-result-final-review-readiness-outcome.v0.23.0';

export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_STATUSES = Object.freeze({
  READY: 'RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_READY',
  EMPTY: 'RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_EMPTY',
  BLOCKED: 'RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_BLOCKED',
});

export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_DESCRIPTORS = Object.freeze({
  READY_FOR_LATER_CLOSURE_REVIEW: 'Ready for later closure review',
  KEEP_REVIEW_OPEN: 'Keep review open',
  RESOLVE_ACKNOWLEDGEMENT_FIRST: 'Resolve acknowledgement first',
  FINAL_REVIEW_PENDING: 'Final review pending',
});

export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_BLOCKERS = Object.freeze({
  READINESS_SUMMARY_REQUIRED: 'retry_result_final_review_readiness_summary_surface_required',
  OUTCOME_APPLICATION_BLOCKED: 'final_review_readiness_outcome_application_blocked',
  CLOSURE_APPLICATION_BLOCKED: 'closure_application_blocked',
  PERSISTENCE_BLOCKED: 'final_review_readiness_outcome_persistence_blocked',
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
  return typeof now === 'function' ? now() : new Date().toISOString();
}

function issue(code, message, field = null) {
  return Object.freeze({ code, message, field });
}

function base(status, timestamp) {
  return {
    component: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_COMPONENT,
    phase: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_PHASE,
    version: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_VERSION,
    status,
    timestamp,
    outcomeMode: 'LOCAL_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_DESCRIPTOR_ONLY',
    consumesPhase22FinalReviewReadinessSummarySurface: true,
    localOutcomeOnly: true,
    descriptorOnly: true,
    displayOnly: true,
    closureApplicationAllowed: false,
    closureApplied: false,
    finalReviewReadinessOutcomePersistenceAllowed: false,
    finalReviewReadinessOutcomePersistenceApplied: false,
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
  if (item.readyForFutureClosureSelected === true) return SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_DESCRIPTORS.READY_FOR_LATER_CLOSURE_REVIEW;
  if (item.keepReviewOpenSelected === true) return SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_DESCRIPTORS.KEEP_REVIEW_OPEN;
  if (item.acknowledgementStillPendingSelected === true) return SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_DESCRIPTORS.RESOLVE_ACKNOWLEDGEMENT_FIRST;
  return SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_DESCRIPTORS.FINAL_REVIEW_PENDING;
}

function instructionFor(descriptor) {
  if (descriptor === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_DESCRIPTORS.READY_FOR_LATER_CLOSURE_REVIEW) return 'Outcome says ready for a later scoped closure review only. Nothing is applied.';
  if (descriptor === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_DESCRIPTORS.KEEP_REVIEW_OPEN) return 'Outcome says keep review open. Queue state is unchanged.';
  if (descriptor === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_DESCRIPTORS.RESOLVE_ACKNOWLEDGEMENT_FIRST) return 'Outcome says acknowledgement must be resolved first. Keep visible without mutation.';
  return 'Outcome says final review is still pending. Keep visible without mutation.';
}

function buildOutcomeItem(item = {}, index = 0, timestamp) {
  const descriptor = descriptorFor(item);
  return Object.freeze({
    finalReviewReadinessOutcomeId: `retry-result-final-review-readiness-outcome:${item.finalReviewReadinessSummaryItemId || index}`,
    finalReviewReadinessSummaryItemId: item.finalReviewReadinessSummaryItemId || null,
    finalReviewSnapshotItemId: item.finalReviewSnapshotItemId || null,
    closureIntentSummaryId: item.closureIntentSummaryId || null,
    closureIntentId: item.closureIntentId || null,
    retryResultReviewId: item.retryResultReviewId || null,
    queueItemId: item.queueItemId || null,
    classification: item.classification || null,
    selectedDescriptor: item.selectedDescriptor || null,
    readinessStatus: item.readinessStatus || null,
    outcomeDescriptor: descriptor,
    readyForLaterClosureReview: descriptor === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_DESCRIPTORS.READY_FOR_LATER_CLOSURE_REVIEW,
    keepReviewOpen: descriptor === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_DESCRIPTORS.KEEP_REVIEW_OPEN,
    acknowledgementResolutionRequired: descriptor === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_DESCRIPTORS.RESOLVE_ACKNOWLEDGEMENT_FIRST,
    finalReviewPending: descriptor === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_DESCRIPTORS.FINAL_REVIEW_PENDING,
    instruction: instructionFor(descriptor),
    localOutcomeOnly: true,
    descriptorOnly: true,
    displayOnly: true,
    closureApplicationAllowed: false,
    closureApplied: false,
    finalReviewReadinessOutcomePersistenceAllowed: false,
    finalReviewReadinessOutcomePersistenceApplied: false,
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
    describedAt: timestamp,
  });
}

function validationErrors(summarySurface = {}, options = {}) {
  const errors = [];
  if (!isPlainObject(summarySurface)) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_BLOCKERS.READINESS_SUMMARY_REQUIRED, 'Phase 23 requires the Phase 22 readiness summary surface.', 'summarySurface'));
  if (options.applyOutcome === true || options.applyReadinessOutcome === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_BLOCKERS.OUTCOME_APPLICATION_BLOCKED, 'Phase 23 outcome is descriptor-only.', 'applyOutcome'));
  if (options.applyClosure === true || options.closeReview === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_BLOCKERS.CLOSURE_APPLICATION_BLOCKED, 'Phase 23 cannot apply closure.', 'applyClosure'));
  if (options.persistOutcome === true || options.persistReadinessOutcome === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_BLOCKERS.PERSISTENCE_BLOCKED, 'Phase 23 cannot persist outcomes.', 'persistOutcome'));
  if (options.executeRetry === true || options.applyRetry === true || options.automaticSecondRetryEnabled === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_BLOCKERS.SECOND_RETRY_BLOCKED, 'Phase 23 cannot trigger retry.', 'executeRetry'));
  if (options.backgroundRetryEnabled === true || options.backgroundReplayEnabled === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_BLOCKERS.BACKGROUND_RETRY_BLOCKED, 'Phase 23 cannot enable background retry.', 'backgroundRetryEnabled'));
  if (options.applyQueueWrites === true || options.queueWriteAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_BLOCKERS.QUEUE_WRITE_BLOCKED, 'Phase 23 cannot write queue state.', 'queueWriteAllowed'));
  if (options.inventoryMutationAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_BLOCKERS.INVENTORY_WRITE_BLOCKED, 'Phase 23 cannot mutate Inventory.', 'inventoryMutationAllowed'));
  if (options.stockMutationAllowed === true || options.priceMutationAllowed === true || options.ledgerMutationAllowed === true || options.approvalMutationAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_BLOCKERS.DIRECT_MUTATION_BLOCKED, 'Phase 23 cannot mutate governed records.', 'mutationAllowed'));
  return errors;
}

export function buildScanOpsRetryResultFinalReviewReadinessOutcomeSurface(summarySurface = {}, options = {}) {
  const timestamp = nowIso(options.now);
  const errors = validationErrors(summarySurface, options);
  if (errors.length > 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_STATUSES.BLOCKED, timestamp),
      outcomeItems: freezeArray([]),
      outcomeItemCount: 0,
      readyForLaterClosureReviewCount: 0,
      keepReviewOpenCount: 0,
      acknowledgementResolutionRequiredCount: 0,
      finalReviewPendingCount: 0,
      displayOnlyCount: 0,
      errors: freezeArray(errors),
    });
  }

  const sourceItems = Array.isArray(summarySurface.readinessSummaryItems) ? summarySurface.readinessSummaryItems : [];
  if (sourceItems.length === 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_STATUSES.EMPTY, timestamp),
      outcomeItems: freezeArray([]),
      outcomeItemCount: 0,
      readyForLaterClosureReviewCount: 0,
      keepReviewOpenCount: 0,
      acknowledgementResolutionRequiredCount: 0,
      finalReviewPendingCount: 0,
      displayOnlyCount: 0,
      errors: freezeArray([]),
    });
  }

  const outcomeItems = sourceItems.map((item, index) => buildOutcomeItem(item, index, timestamp));

  return Object.freeze({
    ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_STATUSES.READY, timestamp),
    outcomeItems: freezeArray(outcomeItems),
    outcomeItemCount: outcomeItems.length,
    readyForLaterClosureReviewCount: outcomeItems.filter((item) => item.readyForLaterClosureReview === true).length,
    keepReviewOpenCount: outcomeItems.filter((item) => item.keepReviewOpen === true).length,
    acknowledgementResolutionRequiredCount: outcomeItems.filter((item) => item.acknowledgementResolutionRequired === true).length,
    finalReviewPendingCount: outcomeItems.filter((item) => item.finalReviewPending === true).length,
    displayOnlyCount: outcomeItems.filter((item) => item.displayOnly === true && item.queueWriteApplied === false && item.closureApplied === false && item.finalReviewReadinessOutcomePersistenceApplied === false).length,
    errors: freezeArray([]),
  });
}
