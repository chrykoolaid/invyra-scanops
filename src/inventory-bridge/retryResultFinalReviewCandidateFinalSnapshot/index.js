export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_PHASE = '28';
export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_COMPONENT = 'scanops_bridge_retry_result_final_review_candidate_final_snapshot_surface';
export const SCANOPS_BRIDGE_PHASE_27_CANDIDATE_OUTCOME_SUMMARY_COMPONENT = 'scanops_bridge_retry_result_final_review_candidate_outcome_summary_surface';

export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_STATUSES = Object.freeze({
  READY: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_READY',
  EMPTY: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_EMPTY',
  BLOCKED: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_BLOCKED',
});

export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_BLOCKERS = Object.freeze({
  SUMMARY_SURFACE_REQUIRED: 'retry_result_final_review_candidate_outcome_summary_surface_required',
  SNAPSHOT_APPLICATION_BLOCKED: 'final_review_candidate_final_snapshot_application_blocked',
  CLOSURE_APPLICATION_BLOCKED: 'closure_application_blocked',
  PERSISTENCE_BLOCKED: 'final_review_candidate_final_snapshot_persistence_blocked',
  SECOND_RETRY_BLOCKED: 'second_retry_blocked',
  BACKGROUND_RETRY_BLOCKED: 'background_retry_blocked',
  QUEUE_WRITE_BLOCKED: 'queue_write_blocked',
  INVENTORY_WRITE_BLOCKED: 'inventory_write_blocked',
  DIRECT_MUTATION_BLOCKED: 'direct_mutation_blocked',
});

function freezeArray(values) {
  return Object.freeze([...(values || [])]);
}

function isValidPhase27(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && value.phase === '27'
    && value.component === SCANOPS_BRIDGE_PHASE_27_CANDIDATE_OUTCOME_SUMMARY_COMPONENT
    && Array.isArray(value.candidateOutcomeSummaryItems);
}

function nowIso(now) {
  return typeof now === 'function' ? now() : new Date().toISOString();
}

function issue(code, message, field = null) {
  return Object.freeze({ code, message, field });
}

function base(status, timestamp) {
  return {
    component: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_COMPONENT,
    phase: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_PHASE,
    status,
    timestamp,
    snapshotMode: 'LOCAL_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_ONLY',
    consumesPhase27CandidateOutcomeSummarySurface: true,
    localSnapshotOnly: true,
    displayOnly: true,
    closureApplicationAllowed: false,
    closureApplied: false,
    snapshotPersistenceAllowed: false,
    snapshotPersistenceApplied: false,
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

function finalStatusFor(item = {}) {
  if (item.readyForLaterClosureReview === true) return 'Final snapshot: ready later';
  if (item.keepReviewOpenBeforeClosure === true) return 'Final snapshot: keep review open';
  if (item.acknowledgementResolutionBeforeClosure === true) return 'Final snapshot: acknowledgement first';
  return 'Final snapshot: final review first';
}

function buildSnapshotItem(item = {}, index = 0, timestamp) {
  return Object.freeze({
    finalReviewCandidateFinalSnapshotId: `retry-result-final-review-candidate-final-snapshot:${item.finalReviewCandidateOutcomeSummaryId || index}`,
    finalReviewCandidateOutcomeSummaryId: item.finalReviewCandidateOutcomeSummaryId || null,
    finalReviewClosureCandidateOutcomeId: item.finalReviewClosureCandidateOutcomeId || null,
    queueItemId: item.queueItemId || null,
    retryResultReviewId: item.retryResultReviewId || null,
    outcomeDescriptor: item.outcomeDescriptor || null,
    readyForLaterClosureReview: item.readyForLaterClosureReview === true,
    keepReviewOpenBeforeClosure: item.keepReviewOpenBeforeClosure === true,
    acknowledgementResolutionBeforeClosure: item.acknowledgementResolutionBeforeClosure === true,
    finalReviewBeforeClosure: item.finalReviewBeforeClosure === true,
    finalSnapshotStatus: finalStatusFor(item),
    instruction: `${finalStatusFor(item)}. Snapshot only; no closure or queue write is applied.`,
    localSnapshotOnly: true,
    displayOnly: true,
    closureApplicationAllowed: false,
    closureApplied: false,
    snapshotPersistenceAllowed: false,
    snapshotPersistenceApplied: false,
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
    snapshottedAt: timestamp,
  });
}

function validationErrors(summarySurface = null, options = {}) {
  const errors = [];
  if (!isValidPhase27(summarySurface)) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_BLOCKERS.SUMMARY_SURFACE_REQUIRED, 'Phase 28 requires the Phase 27 candidate outcome summary surface.', 'summarySurface'));
  if (options.applySnapshot === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_BLOCKERS.SNAPSHOT_APPLICATION_BLOCKED, 'Phase 28 snapshot is display-only.', 'applySnapshot'));
  if (options.applyClosure === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_BLOCKERS.CLOSURE_APPLICATION_BLOCKED, 'Phase 28 cannot apply closure.', 'applyClosure'));
  if (options.persistSnapshot === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_BLOCKERS.PERSISTENCE_BLOCKED, 'Phase 28 cannot persist snapshots.', 'persistSnapshot'));
  if (options.executeRetry === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_BLOCKERS.SECOND_RETRY_BLOCKED, 'Phase 28 cannot trigger retry.', 'executeRetry'));
  if (options.backgroundRetryEnabled === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_BLOCKERS.BACKGROUND_RETRY_BLOCKED, 'Phase 28 cannot enable background retry.', 'backgroundRetryEnabled'));
  if (options.applyQueueWrites === true || options.queueWriteAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_BLOCKERS.QUEUE_WRITE_BLOCKED, 'Phase 28 cannot write queue state.', 'queueWriteAllowed'));
  if (options.inventoryMutationAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_BLOCKERS.INVENTORY_WRITE_BLOCKED, 'Phase 28 cannot mutate Inventory.', 'inventoryMutationAllowed'));
  if (options.stockMutationAllowed === true || options.priceMutationAllowed === true || options.ledgerMutationAllowed === true || options.approvalMutationAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_BLOCKERS.DIRECT_MUTATION_BLOCKED, 'Phase 28 cannot mutate governed records.', 'mutationAllowed'));
  return errors;
}

export function buildScanOpsRetryResultFinalReviewCandidateFinalSnapshotSurface(summarySurface = null, options = {}) {
  const timestamp = nowIso(options.now);
  const errors = validationErrors(summarySurface, options);
  if (errors.length > 0) return Object.freeze({ ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_STATUSES.BLOCKED, timestamp), finalSnapshotItems: freezeArray([]), finalSnapshotItemCount: 0, readyLaterSnapshotCount: 0, keepOpenSnapshotCount: 0, acknowledgementFirstSnapshotCount: 0, finalReviewFirstSnapshotCount: 0, displayOnlyCount: 0, errors: freezeArray(errors) });

  const sourceItems = summarySurface.candidateOutcomeSummaryItems;
  if (sourceItems.length === 0) return Object.freeze({ ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_STATUSES.EMPTY, timestamp), finalSnapshotItems: freezeArray([]), finalSnapshotItemCount: 0, readyLaterSnapshotCount: 0, keepOpenSnapshotCount: 0, acknowledgementFirstSnapshotCount: 0, finalReviewFirstSnapshotCount: 0, displayOnlyCount: 0, errors: freezeArray([]) });

  const finalSnapshotItems = sourceItems.map((item, index) => buildSnapshotItem(item, index, timestamp));
  return Object.freeze({
    ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_STATUSES.READY, timestamp),
    finalSnapshotItems: freezeArray(finalSnapshotItems),
    finalSnapshotItemCount: finalSnapshotItems.length,
    readyLaterSnapshotCount: finalSnapshotItems.filter((item) => item.readyForLaterClosureReview).length,
    keepOpenSnapshotCount: finalSnapshotItems.filter((item) => item.keepReviewOpenBeforeClosure).length,
    acknowledgementFirstSnapshotCount: finalSnapshotItems.filter((item) => item.acknowledgementResolutionBeforeClosure).length,
    finalReviewFirstSnapshotCount: finalSnapshotItems.filter((item) => item.finalReviewBeforeClosure).length,
    displayOnlyCount: finalSnapshotItems.filter((item) => item.displayOnly && !item.queueWriteApplied && !item.closureApplied && !item.snapshotPersistenceApplied).length,
    errors: freezeArray([]),
  });
}
