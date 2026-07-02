export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_PHASE = '29';
export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_COMPONENT = 'scanops_bridge_retry_result_final_review_candidate_snapshot_readiness_summary_surface';
export const SCANOPS_BRIDGE_PHASE_28_CANDIDATE_FINAL_SNAPSHOT_COMPONENT = 'scanops_bridge_retry_result_final_review_candidate_final_snapshot_surface';

export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_STATUSES = Object.freeze({
  READY: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_READY',
  EMPTY: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_EMPTY',
  BLOCKED: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_BLOCKED',
});

export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_BLOCKERS = Object.freeze({
  FINAL_SNAPSHOT_REQUIRED: 'retry_result_final_review_candidate_final_snapshot_surface_required',
  SUMMARY_APPLICATION_BLOCKED: 'candidate_snapshot_readiness_summary_application_blocked',
  CLOSURE_APPLICATION_BLOCKED: 'closure_application_blocked',
  PERSISTENCE_BLOCKED: 'candidate_snapshot_readiness_summary_persistence_blocked',
  SECOND_RETRY_BLOCKED: 'second_retry_blocked',
  BACKGROUND_RETRY_BLOCKED: 'background_retry_blocked',
  QUEUE_WRITE_BLOCKED: 'queue_write_blocked',
  INVENTORY_WRITE_BLOCKED: 'inventory_write_blocked',
  DIRECT_MUTATION_BLOCKED: 'direct_mutation_blocked',
});

function freezeArray(values) {
  return Object.freeze([...(values || [])]);
}

function isValidPhase28(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && value.phase === '28'
    && value.component === SCANOPS_BRIDGE_PHASE_28_CANDIDATE_FINAL_SNAPSHOT_COMPONENT
    && Array.isArray(value.finalSnapshotItems);
}

function nowIso(now) {
  return typeof now === 'function' ? now() : new Date().toISOString();
}

function issue(code, message, field = null) {
  return Object.freeze({ code, message, field });
}

function base(status, timestamp) {
  return {
    component: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_COMPONENT,
    phase: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_PHASE,
    status,
    timestamp,
    summaryMode: 'LOCAL_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_ONLY',
    consumesPhase28CandidateFinalSnapshotSurface: true,
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

function readinessStatusFor(item = {}) {
  if (item.readyForLaterClosureReview === true) return 'Ready later snapshot retained';
  if (item.keepReviewOpenBeforeClosure === true) return 'Keep-open snapshot retained';
  if (item.acknowledgementResolutionBeforeClosure === true) return 'Acknowledgement-first snapshot retained';
  return 'Final-review-first snapshot retained';
}

function buildReadinessItem(item = {}, index = 0, timestamp) {
  return Object.freeze({
    candidateSnapshotReadinessSummaryId: `retry-result-final-review-candidate-snapshot-readiness-summary:${item.finalReviewCandidateFinalSnapshotId || index}`,
    finalReviewCandidateFinalSnapshotId: item.finalReviewCandidateFinalSnapshotId || null,
    finalReviewCandidateOutcomeSummaryId: item.finalReviewCandidateOutcomeSummaryId || null,
    queueItemId: item.queueItemId || null,
    retryResultReviewId: item.retryResultReviewId || null,
    outcomeDescriptor: item.outcomeDescriptor || null,
    readyForLaterClosureReview: item.readyForLaterClosureReview === true,
    keepReviewOpenBeforeClosure: item.keepReviewOpenBeforeClosure === true,
    acknowledgementResolutionBeforeClosure: item.acknowledgementResolutionBeforeClosure === true,
    finalReviewBeforeClosure: item.finalReviewBeforeClosure === true,
    readinessStatus: readinessStatusFor(item),
    instruction: `${readinessStatusFor(item)}. Readiness summary only; no closure or queue write is applied.`,
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

function validationErrors(finalSnapshotSurface = null, options = {}) {
  const errors = [];
  if (!isValidPhase28(finalSnapshotSurface)) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_BLOCKERS.FINAL_SNAPSHOT_REQUIRED, 'Phase 29 requires the Phase 28 final snapshot surface.', 'finalSnapshotSurface'));
  if (options.applySummary === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_BLOCKERS.SUMMARY_APPLICATION_BLOCKED, 'Phase 29 summary is display-only.', 'applySummary'));
  if (options.applyClosure === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_BLOCKERS.CLOSURE_APPLICATION_BLOCKED, 'Phase 29 cannot apply closure.', 'applyClosure'));
  if (options.persistSummary === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_BLOCKERS.PERSISTENCE_BLOCKED, 'Phase 29 cannot persist summaries.', 'persistSummary'));
  if (options.executeRetry === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_BLOCKERS.SECOND_RETRY_BLOCKED, 'Phase 29 cannot trigger retry.', 'executeRetry'));
  if (options.backgroundRetryEnabled === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_BLOCKERS.BACKGROUND_RETRY_BLOCKED, 'Phase 29 cannot enable background retry.', 'backgroundRetryEnabled'));
  if (options.applyQueueWrites === true || options.queueWriteAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_BLOCKERS.QUEUE_WRITE_BLOCKED, 'Phase 29 cannot write queue state.', 'queueWriteAllowed'));
  if (options.inventoryMutationAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_BLOCKERS.INVENTORY_WRITE_BLOCKED, 'Phase 29 cannot mutate Inventory.', 'inventoryMutationAllowed'));
  if (options.stockMutationAllowed === true || options.priceMutationAllowed === true || options.ledgerMutationAllowed === true || options.approvalMutationAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_BLOCKERS.DIRECT_MUTATION_BLOCKED, 'Phase 29 cannot mutate governed records.', 'mutationAllowed'));
  return errors;
}

export function buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessSummarySurface(finalSnapshotSurface = null, options = {}) {
  const timestamp = nowIso(options.now);
  const errors = validationErrors(finalSnapshotSurface, options);
  if (errors.length > 0) return Object.freeze({ ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_STATUSES.BLOCKED, timestamp), snapshotReadinessSummaryItems: freezeArray([]), snapshotReadinessSummaryItemCount: 0, readyLaterReadinessCount: 0, keepOpenReadinessCount: 0, acknowledgementFirstReadinessCount: 0, finalReviewFirstReadinessCount: 0, finalSnapshotReadyForLaterOnly: false, displayOnlyCount: 0, errors: freezeArray(errors) });

  const sourceItems = finalSnapshotSurface.finalSnapshotItems;
  if (sourceItems.length === 0) return Object.freeze({ ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_STATUSES.EMPTY, timestamp), snapshotReadinessSummaryItems: freezeArray([]), snapshotReadinessSummaryItemCount: 0, readyLaterReadinessCount: 0, keepOpenReadinessCount: 0, acknowledgementFirstReadinessCount: 0, finalReviewFirstReadinessCount: 0, finalSnapshotReadyForLaterOnly: false, displayOnlyCount: 0, errors: freezeArray([]) });

  const snapshotReadinessSummaryItems = sourceItems.map((item, index) => buildReadinessItem(item, index, timestamp));
  const readyLaterReadinessCount = snapshotReadinessSummaryItems.filter((item) => item.readyForLaterClosureReview).length;
  const keepOpenReadinessCount = snapshotReadinessSummaryItems.filter((item) => item.keepReviewOpenBeforeClosure).length;
  const acknowledgementFirstReadinessCount = snapshotReadinessSummaryItems.filter((item) => item.acknowledgementResolutionBeforeClosure).length;
  const finalReviewFirstReadinessCount = snapshotReadinessSummaryItems.filter((item) => item.finalReviewBeforeClosure).length;
  return Object.freeze({
    ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_STATUSES.READY, timestamp),
    snapshotReadinessSummaryItems: freezeArray(snapshotReadinessSummaryItems),
    snapshotReadinessSummaryItemCount: snapshotReadinessSummaryItems.length,
    readyLaterReadinessCount,
    keepOpenReadinessCount,
    acknowledgementFirstReadinessCount,
    finalReviewFirstReadinessCount,
    finalSnapshotReadyForLaterOnly: snapshotReadinessSummaryItems.length > 0 && readyLaterReadinessCount === snapshotReadinessSummaryItems.length,
    displayOnlyCount: snapshotReadinessSummaryItems.filter((item) => item.displayOnly && !item.queueWriteApplied && !item.closureApplied && !item.summaryPersistenceApplied).length,
    errors: freezeArray([]),
  });
}
