export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_PHASE = '22';
export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_COMPONENT = 'scanops_bridge_retry_result_final_review_readiness_summary_surface';
export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_VERSION = 'scanops-retry-result-final-review-readiness-summary.v0.22.0';

export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_STATUSES = Object.freeze({
  READY: 'RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_READY',
  EMPTY: 'RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_EMPTY',
  BLOCKED: 'RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_BLOCKED',
});

export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_BLOCKERS = Object.freeze({
  FINAL_REVIEW_SNAPSHOT_REQUIRED: 'retry_result_final_review_snapshot_surface_required',
  SUMMARY_APPLICATION_BLOCKED: 'final_review_readiness_summary_application_blocked',
  CLOSURE_APPLICATION_BLOCKED: 'closure_application_blocked',
  PERSISTENCE_BLOCKED: 'final_review_readiness_summary_persistence_blocked',
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
    component: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_COMPONENT,
    phase: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_PHASE,
    version: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_VERSION,
    status,
    timestamp,
    readinessSummaryMode: 'LOCAL_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_ONLY',
    consumesPhase21FinalReviewSnapshotSurface: true,
    localSummaryOnly: true,
    displayOnly: true,
    closureApplicationAllowed: false,
    closureApplied: false,
    finalReviewReadinessSummaryPersistenceAllowed: false,
    finalReviewReadinessSummaryPersistenceApplied: false,
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
  if (item.readyForFutureClosureSelected === true) return 'Ready for later scoped closure consideration';
  if (item.keepReviewOpenSelected === true) return 'Keep review open';
  if (item.acknowledgementStillPendingSelected === true) return 'Acknowledgement pending';
  return 'Final review pending';
}

function instructionFor(item = {}) {
  if (item.readyForFutureClosureSelected === true) return 'Summarized as ready for later consideration only. No closure is applied.';
  if (item.keepReviewOpenSelected === true) return 'Summarized as keep-open only. Queue state is unchanged.';
  if (item.acknowledgementStillPendingSelected === true) return 'Summarized as acknowledgement-pending only. Keep visible without mutation.';
  return 'Summarized as final-review-pending only. Keep visible without mutation.';
}

function buildReadinessSummaryItem(item = {}, index = 0, timestamp) {
  return Object.freeze({
    finalReviewReadinessSummaryItemId: `retry-result-final-review-readiness-summary:${item.finalReviewSnapshotItemId || index}`,
    finalReviewSnapshotItemId: item.finalReviewSnapshotItemId || null,
    closureIntentSummaryId: item.closureIntentSummaryId || null,
    closureIntentId: item.closureIntentId || null,
    readinessItemId: item.readinessItemId || null,
    retryResultReviewId: item.retryResultReviewId || null,
    queueItemId: item.queueItemId || null,
    bridgeReceiptId: item.bridgeReceiptId || null,
    classification: item.classification || null,
    selectedDescriptor: item.selectedDescriptor || null,
    readyForFutureClosureSelected: item.readyForFutureClosureSelected === true,
    keepReviewOpenSelected: item.keepReviewOpenSelected === true,
    acknowledgementStillPendingSelected: item.acknowledgementStillPendingSelected === true,
    closureIntentSelected: item.closureIntentSelected === true,
    readinessStatus: readinessStatusFor(item),
    instruction: instructionFor(item),
    localSummaryOnly: true,
    displayOnly: true,
    closureApplicationAllowed: false,
    closureApplied: false,
    finalReviewReadinessSummaryPersistenceAllowed: false,
    finalReviewReadinessSummaryPersistenceApplied: false,
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

function validationErrors(finalReviewSnapshotSurface = {}, options = {}) {
  const errors = [];
  if (!isPlainObject(finalReviewSnapshotSurface)) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_BLOCKERS.FINAL_REVIEW_SNAPSHOT_REQUIRED, 'Phase 22 requires the Phase 21 final review snapshot surface.', 'finalReviewSnapshotSurface'));
  if (options.applySummary === true || options.applyReadinessSummary === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_BLOCKERS.SUMMARY_APPLICATION_BLOCKED, 'Phase 22 readiness summary is display-only.', 'applySummary'));
  if (options.applyClosure === true || options.closeReview === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_BLOCKERS.CLOSURE_APPLICATION_BLOCKED, 'Phase 22 cannot apply closure.', 'applyClosure'));
  if (options.persistSummary === true || options.persistReadinessSummary === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_BLOCKERS.PERSISTENCE_BLOCKED, 'Phase 22 cannot persist readiness summaries.', 'persistSummary'));
  if (options.executeRetry === true || options.applyRetry === true || options.automaticSecondRetryEnabled === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_BLOCKERS.SECOND_RETRY_BLOCKED, 'Phase 22 cannot trigger retry.', 'executeRetry'));
  if (options.backgroundRetryEnabled === true || options.backgroundReplayEnabled === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_BLOCKERS.BACKGROUND_RETRY_BLOCKED, 'Phase 22 cannot enable background retry.', 'backgroundRetryEnabled'));
  if (options.applyQueueWrites === true || options.queueWriteAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_BLOCKERS.QUEUE_WRITE_BLOCKED, 'Phase 22 cannot write queue state.', 'queueWriteAllowed'));
  if (options.inventoryMutationAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_BLOCKERS.INVENTORY_WRITE_BLOCKED, 'Phase 22 cannot mutate Inventory.', 'inventoryMutationAllowed'));
  if (options.stockMutationAllowed === true || options.priceMutationAllowed === true || options.ledgerMutationAllowed === true || options.approvalMutationAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_BLOCKERS.DIRECT_MUTATION_BLOCKED, 'Phase 22 cannot mutate governed records.', 'mutationAllowed'));
  return errors;
}

export function buildScanOpsRetryResultFinalReviewReadinessSummarySurface(finalReviewSnapshotSurface = {}, options = {}) {
  const timestamp = nowIso(options.now);
  const errors = validationErrors(finalReviewSnapshotSurface, options);
  if (errors.length > 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_STATUSES.BLOCKED, timestamp),
      readinessSummaryItems: freezeArray([]),
      readinessSummaryItemCount: 0,
      readyLaterCount: 0,
      keepOpenCount: 0,
      acknowledgementPendingCount: 0,
      finalReviewPendingCount: 0,
      allReadyForFutureScopedClosure: false,
      displayOnlyCount: 0,
      errors: freezeArray(errors),
    });
  }

  const sourceItems = Array.isArray(finalReviewSnapshotSurface.finalReviewSnapshotItems) ? finalReviewSnapshotSurface.finalReviewSnapshotItems : [];
  if (sourceItems.length === 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_STATUSES.EMPTY, timestamp),
      readinessSummaryItems: freezeArray([]),
      readinessSummaryItemCount: 0,
      readyLaterCount: 0,
      keepOpenCount: 0,
      acknowledgementPendingCount: 0,
      finalReviewPendingCount: 0,
      allReadyForFutureScopedClosure: false,
      displayOnlyCount: 0,
      errors: freezeArray([]),
    });
  }

  const readinessSummaryItems = sourceItems.map((item, index) => buildReadinessSummaryItem(item, index, timestamp));
  const readyLaterCount = readinessSummaryItems.filter((item) => item.readyForFutureClosureSelected === true).length;
  const keepOpenCount = readinessSummaryItems.filter((item) => item.keepReviewOpenSelected === true).length;
  const acknowledgementPendingCount = readinessSummaryItems.filter((item) => item.acknowledgementStillPendingSelected === true).length;
  const finalReviewPendingCount = readinessSummaryItems.filter((item) => item.closureIntentSelected !== true).length;

  return Object.freeze({
    ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_STATUSES.READY, timestamp),
    readinessSummaryItems: freezeArray(readinessSummaryItems),
    readinessSummaryItemCount: readinessSummaryItems.length,
    readyLaterCount,
    keepOpenCount,
    acknowledgementPendingCount,
    finalReviewPendingCount,
    allReadyForFutureScopedClosure: readinessSummaryItems.length > 0 && readyLaterCount === readinessSummaryItems.length,
    displayOnlyCount: readinessSummaryItems.filter((item) => item.displayOnly === true && item.queueWriteApplied === false && item.closureApplied === false && item.finalReviewReadinessSummaryPersistenceApplied === false).length,
    errors: freezeArray([]),
  });
}
