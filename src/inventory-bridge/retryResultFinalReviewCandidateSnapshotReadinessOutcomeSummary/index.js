export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_PHASE = '31';
export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_COMPONENT = 'scanops_bridge_retry_result_final_review_candidate_snapshot_readiness_outcome_summary_surface';
export const SCANOPS_BRIDGE_PHASE_30_SNAPSHOT_READINESS_OUTCOME_COMPONENT = 'scanops_bridge_retry_result_final_review_candidate_snapshot_readiness_outcome_surface';

export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_STATUSES = Object.freeze({
  READY: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_READY',
  EMPTY: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_EMPTY',
  BLOCKED: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_BLOCKED',
});

export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_BLOCKERS = Object.freeze({
  OUTCOME_SURFACE_REQUIRED: 'retry_result_final_review_candidate_snapshot_readiness_outcome_surface_required',
  SUMMARY_APPLICATION_BLOCKED: 'candidate_snapshot_readiness_outcome_summary_application_blocked',
  CLOSURE_APPLICATION_BLOCKED: 'closure_application_blocked',
  PERSISTENCE_BLOCKED: 'candidate_snapshot_readiness_outcome_summary_persistence_blocked',
  SECOND_RETRY_BLOCKED: 'second_retry_blocked',
  BACKGROUND_RETRY_BLOCKED: 'background_retry_blocked',
  QUEUE_WRITE_BLOCKED: 'queue_write_blocked',
  INVENTORY_WRITE_BLOCKED: 'inventory_write_blocked',
  DIRECT_MUTATION_BLOCKED: 'direct_mutation_blocked',
});

function freezeArray(values) {
  return Object.freeze([...(values || [])]);
}

function isValidPhase30(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && value.phase === '30'
    && value.component === SCANOPS_BRIDGE_PHASE_30_SNAPSHOT_READINESS_OUTCOME_COMPONENT
    && Array.isArray(value.snapshotReadinessOutcomeItems);
}

function nowIso(now) {
  return typeof now === 'function' ? now() : new Date().toISOString();
}

function issue(code, message, field = null) {
  return Object.freeze({ code, message, field });
}

function base(status, timestamp) {
  return {
    component: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_COMPONENT,
    phase: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_PHASE,
    status,
    timestamp,
    summaryMode: 'LOCAL_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_ONLY',
    consumesPhase30CandidateSnapshotReadinessOutcomeSurface: true,
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
  if (item.readyForLaterClosureReview === true) return 'Ready-later outcome summarized';
  if (item.keepReviewOpenBeforeClosure === true) return 'Keep-open outcome summarized';
  if (item.acknowledgementResolutionBeforeClosure === true) return 'Acknowledgement-first outcome summarized';
  return 'Final-review-first outcome summarized';
}

function buildSummaryItem(item = {}, index = 0, timestamp) {
  return Object.freeze({
    candidateSnapshotReadinessOutcomeSummaryId: `retry-result-final-review-candidate-snapshot-readiness-outcome-summary:${item.candidateSnapshotReadinessOutcomeId || index}`,
    candidateSnapshotReadinessOutcomeId: item.candidateSnapshotReadinessOutcomeId || null,
    candidateSnapshotReadinessSummaryId: item.candidateSnapshotReadinessSummaryId || null,
    finalReviewCandidateFinalSnapshotId: item.finalReviewCandidateFinalSnapshotId || null,
    queueItemId: item.queueItemId || null,
    retryResultReviewId: item.retryResultReviewId || null,
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
  if (!isValidPhase30(outcomeSurface)) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_BLOCKERS.OUTCOME_SURFACE_REQUIRED, 'Phase 31 requires the Phase 30 snapshot readiness outcome surface.', 'outcomeSurface'));
  if (options.applySummary === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_BLOCKERS.SUMMARY_APPLICATION_BLOCKED, 'Phase 31 summary is display-only.', 'applySummary'));
  if (options.applyClosure === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_BLOCKERS.CLOSURE_APPLICATION_BLOCKED, 'Phase 31 cannot apply closure.', 'applyClosure'));
  if (options.persistSummary === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_BLOCKERS.PERSISTENCE_BLOCKED, 'Phase 31 cannot persist summaries.', 'persistSummary'));
  if (options.executeRetry === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_BLOCKERS.SECOND_RETRY_BLOCKED, 'Phase 31 cannot trigger retry.', 'executeRetry'));
  if (options.backgroundRetryEnabled === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_BLOCKERS.BACKGROUND_RETRY_BLOCKED, 'Phase 31 cannot enable background retry.', 'backgroundRetryEnabled'));
  if (options.applyQueueWrites === true || options.queueWriteAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_BLOCKERS.QUEUE_WRITE_BLOCKED, 'Phase 31 cannot write queue state.', 'queueWriteAllowed'));
  if (options.inventoryMutationAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_BLOCKERS.INVENTORY_WRITE_BLOCKED, 'Phase 31 cannot mutate Inventory.', 'inventoryMutationAllowed'));
  if (options.stockMutationAllowed === true || options.priceMutationAllowed === true || options.ledgerMutationAllowed === true || options.approvalMutationAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_BLOCKERS.DIRECT_MUTATION_BLOCKED, 'Phase 31 cannot mutate governed records.', 'mutationAllowed'));
  return errors;
}

export function buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSummarySurface(outcomeSurface = null, options = {}) {
  const timestamp = nowIso(options.now);
  const errors = validationErrors(outcomeSurface, options);
  if (errors.length > 0) return Object.freeze({ ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_STATUSES.BLOCKED, timestamp), snapshotReadinessOutcomeSummaryItems: freezeArray([]), snapshotReadinessOutcomeSummaryItemCount: 0, readyLaterSummaryCount: 0, keepOpenSummaryCount: 0, acknowledgementFirstSummaryCount: 0, finalReviewFirstSummaryCount: 0, allReadyLaterSummary: false, displayOnlyCount: 0, errors: freezeArray(errors) });

  const sourceItems = outcomeSurface.snapshotReadinessOutcomeItems;
  if (sourceItems.length === 0) return Object.freeze({ ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_STATUSES.EMPTY, timestamp), snapshotReadinessOutcomeSummaryItems: freezeArray([]), snapshotReadinessOutcomeSummaryItemCount: 0, readyLaterSummaryCount: 0, keepOpenSummaryCount: 0, acknowledgementFirstSummaryCount: 0, finalReviewFirstSummaryCount: 0, allReadyLaterSummary: false, displayOnlyCount: 0, errors: freezeArray([]) });

  const snapshotReadinessOutcomeSummaryItems = sourceItems.map((item, index) => buildSummaryItem(item, index, timestamp));
  const readyLaterSummaryCount = snapshotReadinessOutcomeSummaryItems.filter((item) => item.readyForLaterClosureReview).length;
  const keepOpenSummaryCount = snapshotReadinessOutcomeSummaryItems.filter((item) => item.keepReviewOpenBeforeClosure).length;
  const acknowledgementFirstSummaryCount = snapshotReadinessOutcomeSummaryItems.filter((item) => item.acknowledgementResolutionBeforeClosure).length;
  const finalReviewFirstSummaryCount = snapshotReadinessOutcomeSummaryItems.filter((item) => item.finalReviewBeforeClosure).length;
  return Object.freeze({
    ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_STATUSES.READY, timestamp),
    snapshotReadinessOutcomeSummaryItems: freezeArray(snapshotReadinessOutcomeSummaryItems),
    snapshotReadinessOutcomeSummaryItemCount: snapshotReadinessOutcomeSummaryItems.length,
    readyLaterSummaryCount,
    keepOpenSummaryCount,
    acknowledgementFirstSummaryCount,
    finalReviewFirstSummaryCount,
    allReadyLaterSummary: snapshotReadinessOutcomeSummaryItems.length > 0 && readyLaterSummaryCount === snapshotReadinessOutcomeSummaryItems.length,
    displayOnlyCount: snapshotReadinessOutcomeSummaryItems.filter((item) => item.displayOnly && !item.queueWriteApplied && !item.closureApplied && !item.summaryPersistenceApplied).length,
    errors: freezeArray([]),
  });
}
