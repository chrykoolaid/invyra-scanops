export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_PHASE = '21';
export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_COMPONENT = 'scanops_bridge_retry_result_final_review_snapshot_surface';
export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_VERSION = 'scanops-retry-result-final-review-snapshot.v0.21.0';

export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_STATUSES = Object.freeze({
  READY: 'RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_READY',
  EMPTY: 'RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_EMPTY',
  BLOCKED: 'RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_BLOCKED',
});

export const SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_BLOCKERS = Object.freeze({
  SUMMARY_SURFACE_REQUIRED: 'retry_result_closure_intent_summary_surface_required',
  SNAPSHOT_APPLICATION_BLOCKED: 'final_review_snapshot_application_blocked',
  CLOSURE_APPLICATION_BLOCKED: 'closure_application_blocked',
  PERSISTENCE_BLOCKED: 'final_review_snapshot_persistence_blocked',
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
    component: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_COMPONENT,
    phase: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_PHASE,
    version: SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_VERSION,
    status,
    timestamp,
    snapshotMode: 'LOCAL_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_ONLY',
    consumesPhase20ClosureIntentSummarySurface: true,
    localSnapshotOnly: true,
    displayOnly: true,
    closureApplicationAllowed: false,
    closureApplied: false,
    finalReviewSnapshotPersistenceAllowed: false,
    finalReviewSnapshotPersistenceApplied: false,
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

function finalReviewStatusFor(item = {}) {
  if (item.readyForFutureClosureSelected === true) return 'Ready for future scoped closure review';
  if (item.keepReviewOpenSelected === true) return 'Review kept open locally';
  if (item.acknowledgementStillPendingSelected === true) return 'Acknowledgement still pending locally';
  return 'Final review selection pending';
}

function instructionFor(item = {}) {
  if (item.readyForFutureClosureSelected === true) return 'Future closure may be considered later. Nothing is applied now.';
  if (item.keepReviewOpenSelected === true) return 'Review remains open. Queue state is unchanged.';
  if (item.acknowledgementStillPendingSelected === true) return 'Acknowledgement remains pending. Keep visible without mutation.';
  return 'No local final review selection exists. Keep review visible without mutation.';
}

function buildSnapshotItem(item = {}, index = 0, timestamp) {
  return Object.freeze({
    finalReviewSnapshotItemId: `retry-result-final-review-snapshot:${item.closureIntentSummaryId || item.closureIntentId || index}`,
    closureIntentSummaryId: item.closureIntentSummaryId || null,
    closureIntentId: item.closureIntentId || null,
    readinessItemId: item.readinessItemId || null,
    summaryItemId: item.summaryItemId || null,
    acknowledgementIntentId: item.acknowledgementIntentId || null,
    retryResultReviewId: item.retryResultReviewId || null,
    queueItemId: item.queueItemId || null,
    bridgeEnvelopeId: item.bridgeEnvelopeId || null,
    bridgeReceiptId: item.bridgeReceiptId || null,
    classification: item.classification || null,
    outcomeLabel: item.outcomeLabel || null,
    selectedDescriptor: item.selectedDescriptor || null,
    closureIntentSelected: item.closureIntentSelected === true,
    readyForFutureClosureSelected: item.readyForFutureClosureSelected === true,
    keepReviewOpenSelected: item.keepReviewOpenSelected === true,
    acknowledgementStillPendingSelected: item.acknowledgementStillPendingSelected === true,
    finalReviewStatus: finalReviewStatusFor(item),
    instruction: instructionFor(item),
    localSnapshotOnly: true,
    displayOnly: true,
    closureApplicationAllowed: false,
    closureApplied: false,
    finalReviewSnapshotPersistenceAllowed: false,
    finalReviewSnapshotPersistenceApplied: false,
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
    snapshottedAt: timestamp,
  });
}

function validationErrors(summarySurface = {}, options = {}) {
  const errors = [];
  if (!isPlainObject(summarySurface)) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_BLOCKERS.SUMMARY_SURFACE_REQUIRED, 'Phase 21 requires the Phase 20 summary surface.', 'summarySurface'));
  if (options.applySnapshot === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_BLOCKERS.SNAPSHOT_APPLICATION_BLOCKED, 'Phase 21 snapshot is display-only.', 'applySnapshot'));
  if (options.applyClosure === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_BLOCKERS.CLOSURE_APPLICATION_BLOCKED, 'Phase 21 cannot apply closure.', 'applyClosure'));
  if (options.persistSnapshot === true || options.persistFinalReviewSnapshot === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_BLOCKERS.PERSISTENCE_BLOCKED, 'Phase 21 cannot persist the snapshot.', 'persistSnapshot'));
  if (options.executeRetry === true || options.applyRetry === true || options.automaticSecondRetryEnabled === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_BLOCKERS.SECOND_RETRY_BLOCKED, 'Phase 21 cannot trigger retry.', 'executeRetry'));
  if (options.backgroundRetryEnabled === true || options.backgroundReplayEnabled === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_BLOCKERS.BACKGROUND_RETRY_BLOCKED, 'Phase 21 cannot enable background retry.', 'backgroundRetryEnabled'));
  if (options.applyQueueWrites === true || options.queueWriteAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_BLOCKERS.QUEUE_WRITE_BLOCKED, 'Phase 21 cannot write queue state.', 'queueWriteAllowed'));
  if (options.inventoryMutationAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_BLOCKERS.INVENTORY_WRITE_BLOCKED, 'Phase 21 cannot mutate Inventory.', 'inventoryMutationAllowed'));
  if (options.stockMutationAllowed === true || options.priceMutationAllowed === true || options.ledgerMutationAllowed === true || options.approvalMutationAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_BLOCKERS.DIRECT_MUTATION_BLOCKED, 'Phase 21 cannot mutate governed records.', 'mutationAllowed'));
  return errors;
}

export function buildScanOpsRetryResultFinalReviewSnapshotSurface(summarySurface = {}, options = {}) {
  const timestamp = nowIso(options.now);
  const errors = validationErrors(summarySurface, options);
  if (errors.length > 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_STATUSES.BLOCKED, timestamp),
      finalReviewSnapshotItems: freezeArray([]),
      finalReviewSnapshotItemCount: 0,
      selectedFinalReviewCount: 0,
      readyForFutureClosureReviewCount: 0,
      keepReviewOpenCount: 0,
      acknowledgementStillPendingCount: 0,
      finalReviewPendingCount: 0,
      futureScopedClosureConsiderationReady: false,
      displayOnlyCount: 0,
      errors: freezeArray(errors),
    });
  }

  const sourceItems = Array.isArray(summarySurface.closureIntentSummaryItems) ? summarySurface.closureIntentSummaryItems : [];
  if (sourceItems.length === 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_STATUSES.EMPTY, timestamp),
      finalReviewSnapshotItems: freezeArray([]),
      finalReviewSnapshotItemCount: 0,
      selectedFinalReviewCount: 0,
      readyForFutureClosureReviewCount: 0,
      keepReviewOpenCount: 0,
      acknowledgementStillPendingCount: 0,
      finalReviewPendingCount: 0,
      futureScopedClosureConsiderationReady: false,
      displayOnlyCount: 0,
      errors: freezeArray([]),
    });
  }

  const finalReviewSnapshotItems = sourceItems.map((item, index) => buildSnapshotItem(item, index, timestamp));
  const selectedFinalReviewCount = finalReviewSnapshotItems.filter((item) => item.closureIntentSelected === true).length;
  const finalReviewPendingCount = finalReviewSnapshotItems.length - selectedFinalReviewCount;
  const keepReviewOpenCount = finalReviewSnapshotItems.filter((item) => item.keepReviewOpenSelected === true).length;
  const acknowledgementStillPendingCount = finalReviewSnapshotItems.filter((item) => item.acknowledgementStillPendingSelected === true).length;

  return Object.freeze({
    ...base(SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_STATUSES.READY, timestamp),
    finalReviewSnapshotItems: freezeArray(finalReviewSnapshotItems),
    finalReviewSnapshotItemCount: finalReviewSnapshotItems.length,
    selectedFinalReviewCount,
    readyForFutureClosureReviewCount: finalReviewSnapshotItems.filter((item) => item.readyForFutureClosureSelected === true).length,
    keepReviewOpenCount,
    acknowledgementStillPendingCount,
    finalReviewPendingCount,
    futureScopedClosureConsiderationReady: finalReviewSnapshotItems.length > 0 && finalReviewPendingCount === 0 && keepReviewOpenCount === 0 && acknowledgementStillPendingCount === 0,
    displayOnlyCount: finalReviewSnapshotItems.filter((item) => item.displayOnly === true && item.queueWriteApplied === false && item.closureApplied === false && item.finalReviewSnapshotPersistenceApplied === false).length,
    errors: freezeArray([]),
  });
}
