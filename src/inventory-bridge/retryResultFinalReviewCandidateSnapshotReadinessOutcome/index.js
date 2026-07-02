export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_PHASE = '30';
export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_COMPONENT = 'scanops_bridge_retry_result_final_review_candidate_snapshot_readiness_outcome_surface';
export const SCANOPS_BRIDGE_PHASE_29_SNAPSHOT_READINESS_SUMMARY_COMPONENT = 'scanops_bridge_retry_result_final_review_candidate_snapshot_readiness_summary_surface';

export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_STATUSES = Object.freeze({
  READY: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_READY',
  EMPTY: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_EMPTY',
  BLOCKED: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_BLOCKED',
});

export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_BLOCKERS = Object.freeze({
  READINESS_SUMMARY_REQUIRED: 'retry_result_final_review_candidate_snapshot_readiness_summary_surface_required',
  OUTCOME_APPLICATION_BLOCKED: 'candidate_snapshot_readiness_outcome_application_blocked',
  CLOSURE_APPLICATION_BLOCKED: 'closure_application_blocked',
  PERSISTENCE_BLOCKED: 'candidate_snapshot_readiness_outcome_persistence_blocked',
  SECOND_RETRY_BLOCKED: 'second_retry_blocked',
  BACKGROUND_RETRY_BLOCKED: 'background_retry_blocked',
  QUEUE_WRITE_BLOCKED: 'queue_write_blocked',
  INVENTORY_WRITE_BLOCKED: 'inventory_write_blocked',
  DIRECT_MUTATION_BLOCKED: 'direct_mutation_blocked',
});

function freezeArray(values) {
  return Object.freeze([...(values || [])]);
}

function hasBlockedPhase29Status(value) {
  return typeof value?.status === 'string' && value.status.endsWith('_BLOCKED');
}

function isValidPhase29(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && value.phase === '29'
    && value.component === SCANOPS_BRIDGE_PHASE_29_SNAPSHOT_READINESS_SUMMARY_COMPONENT
    && !hasBlockedPhase29Status(value)
    && Array.isArray(value.snapshotReadinessSummaryItems);
}

function nowIso(now) {
  return typeof now === 'function' ? now() : new Date().toISOString();
}

function issue(code, message, field = null) {
  return Object.freeze({ code, message, field });
}

function base(status, timestamp) {
  return {
    component: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_COMPONENT,
    phase: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_PHASE,
    status,
    timestamp,
    outcomeMode: 'LOCAL_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_DESCRIPTOR_ONLY',
    consumesPhase29CandidateSnapshotReadinessSummarySurface: true,
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
  if (item.readyForLaterClosureReview === true) return 'Ready later snapshot outcome';
  if (item.keepReviewOpenBeforeClosure === true) return 'Keep review open snapshot outcome';
  if (item.acknowledgementResolutionBeforeClosure === true) return 'Acknowledgement first snapshot outcome';
  return 'Final review first snapshot outcome';
}

function buildOutcomeItem(item = {}, index = 0, timestamp) {
  const outcomeDescriptor = descriptorFor(item);
  return Object.freeze({
    candidateSnapshotReadinessOutcomeId: `retry-result-final-review-candidate-snapshot-readiness-outcome:${item.candidateSnapshotReadinessSummaryId || index}`,
    candidateSnapshotReadinessSummaryId: item.candidateSnapshotReadinessSummaryId || null,
    finalReviewCandidateFinalSnapshotId: item.finalReviewCandidateFinalSnapshotId || null,
    queueItemId: item.queueItemId || null,
    retryResultReviewId: item.retryResultReviewId || null,
    outcomeDescriptor,
    readyForLaterClosureReview: item.readyForLaterClosureReview === true,
    keepReviewOpenBeforeClosure: item.keepReviewOpenBeforeClosure === true,
    acknowledgementResolutionBeforeClosure: item.acknowledgementResolutionBeforeClosure === true,
    finalReviewBeforeClosure: item.finalReviewBeforeClosure === true,
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

function validationErrors(readinessSummarySurface = null, options = {}) {
  const errors = [];
  if (!isValidPhase29(readinessSummarySurface)) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_BLOCKERS.READINESS_SUMMARY_REQUIRED, 'Phase 30 requires the Phase 29 snapshot readiness summary surface.', 'readinessSummarySurface'));
  if (options.applyOutcome === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_BLOCKERS.OUTCOME_APPLICATION_BLOCKED, 'Phase 30 outcome is display-only.', 'applyOutcome'));
  if (options.applyClosure === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_BLOCKERS.CLOSURE_APPLICATION_BLOCKED, 'Phase 30 cannot apply closure.', 'applyClosure'));
  if (options.persistOutcome === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_BLOCKERS.PERSISTENCE_BLOCKED, 'Phase 30 cannot persist outcomes.', 'persistOutcome'));
  if (options.executeRetry === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_BLOCKERS.SECOND_RETRY_BLOCKED, 'Phase 30 cannot trigger retry.', 'executeRetry'));
  if (options.backgroundRetryEnabled === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_BLOCKERS.BACKGROUND_RETRY_BLOCKED, 'Phase 30 cannot enable background retry.', 'backgroundRetryEnabled'));
  if (options.applyQueueWrites === true || options.queueWriteAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_BLOCKERS.QUEUE_WRITE_BLOCKED, 'Phase 30 cannot write queue state.', 'queueWriteAllowed'));
  if (options.inventoryMutationAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_BLOCKERS.INVENTORY_WRITE_BLOCKED, 'Phase 30 cannot mutate Inventory.', 'inventoryMutationAllowed'));
  if (options.stockMutationAllowed === true || options.priceMutationAllowed === true || options.ledgerMutationAllowed === true || options.approvalMutationAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_BLOCKERS.DIRECT_MUTATION_BLOCKED, 'Phase 30 cannot mutate governed records.', 'mutationAllowed'));
  return errors;
}

export function buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSurface(readinessSummarySurface = null, options = {}) {
  const timestamp = nowIso(options.now);
  const errors = validationErrors(readinessSummarySurface, options);
  if (errors.length > 0) return Object.freeze({ ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_STATUSES.BLOCKED, timestamp), snapshotReadinessOutcomeItems: freezeArray([]), snapshotReadinessOutcomeItemCount: 0, readyLaterOutcomeCount: 0, keepOpenOutcomeCount: 0, acknowledgementFirstOutcomeCount: 0, finalReviewFirstOutcomeCount: 0, allReadyLaterOutcome: false, displayOnlyCount: 0, errors: freezeArray(errors) });

  const sourceItems = readinessSummarySurface.snapshotReadinessSummaryItems;
  if (sourceItems.length === 0) return Object.freeze({ ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_STATUSES.EMPTY, timestamp), snapshotReadinessOutcomeItems: freezeArray([]), snapshotReadinessOutcomeItemCount: 0, readyLaterOutcomeCount: 0, keepOpenOutcomeCount: 0, acknowledgementFirstOutcomeCount: 0, finalReviewFirstOutcomeCount: 0, allReadyLaterOutcome: false, displayOnlyCount: 0, errors: freezeArray([]) });

  const snapshotReadinessOutcomeItems = sourceItems.map((item, index) => buildOutcomeItem(item, index, timestamp));
  const readyLaterOutcomeCount = snapshotReadinessOutcomeItems.filter((item) => item.readyForLaterClosureReview).length;
  const keepOpenOutcomeCount = snapshotReadinessOutcomeItems.filter((item) => item.keepReviewOpenBeforeClosure).length;
  const acknowledgementFirstOutcomeCount = snapshotReadinessOutcomeItems.filter((item) => item.acknowledgementResolutionBeforeClosure).length;
  const finalReviewFirstOutcomeCount = snapshotReadinessOutcomeItems.filter((item) => item.finalReviewBeforeClosure).length;
  return Object.freeze({
    ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_STATUSES.READY, timestamp),
    snapshotReadinessOutcomeItems: freezeArray(snapshotReadinessOutcomeItems),
    snapshotReadinessOutcomeItemCount: snapshotReadinessOutcomeItems.length,
    readyLaterOutcomeCount,
    keepOpenOutcomeCount,
    acknowledgementFirstOutcomeCount,
    finalReviewFirstOutcomeCount,
    allReadyLaterOutcome: snapshotReadinessOutcomeItems.length > 0 && readyLaterOutcomeCount === snapshotReadinessOutcomeItems.length,
    displayOnlyCount: snapshotReadinessOutcomeItems.filter((item) => item.displayOnly && !item.queueWriteApplied && !item.closureApplied && !item.outcomePersistenceApplied).length,
    errors: freezeArray([]),
  });
}
