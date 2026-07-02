export const PHASE = '32';
export const COMPONENT = 'scanops_bridge_retry_result_final_review_candidate_closure_readiness_handoff_surface';
export const PHASE_31_COMPONENT = 'scanops_bridge_retry_result_final_review_candidate_snapshot_readiness_outcome_summary_surface';

export const STATUSES = Object.freeze({
  READY: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_CLOSURE_READINESS_HANDOFF_READY',
  EMPTY: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_CLOSURE_READINESS_HANDOFF_EMPTY',
  BLOCKED: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_CLOSURE_READINESS_HANDOFF_BLOCKED',
});

export const BLOCKERS = Object.freeze({
  OUTCOME_SUMMARY_REQUIRED: 'retry_result_final_review_candidate_snapshot_readiness_outcome_summary_surface_required',
  HANDOFF_APPLICATION_BLOCKED: 'candidate_closure_readiness_handoff_application_blocked',
  CLOSURE_APPLICATION_BLOCKED: 'closure_application_blocked',
  PERSISTENCE_BLOCKED: 'candidate_closure_readiness_handoff_persistence_blocked',
  SECOND_RETRY_BLOCKED: 'second_retry_blocked',
  BACKGROUND_RETRY_BLOCKED: 'background_retry_blocked',
  QUEUE_WRITE_BLOCKED: 'queue_write_blocked',
  INVENTORY_WRITE_BLOCKED: 'inventory_write_blocked',
  DIRECT_MUTATION_BLOCKED: 'direct_mutation_blocked',
});

function frozen(values) {
  return Object.freeze([...(values || [])]);
}

function validInput(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && value.phase === '31'
    && value.component === PHASE_31_COMPONENT
    && Array.isArray(value.snapshotReadinessOutcomeSummaryItems);
}

function nowIso(now) {
  return typeof now === 'function' ? now() : new Date().toISOString();
}

function issue(code, message, field = null) {
  return Object.freeze({ code, message, field });
}

function base(status, timestamp) {
  return {
    component: COMPONENT,
    phase: PHASE,
    status,
    timestamp,
    handoffMode: 'LOCAL_CLOSURE_READINESS_HANDOFF_ONLY',
    consumesPhase31CandidateSnapshotReadinessOutcomeSummarySurface: true,
    localHandoffOnly: true,
    displayOnly: true,
    closureApplicationAllowed: false,
    closureApplied: false,
    handoffPersistenceAllowed: false,
    handoffPersistenceApplied: false,
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

function statusFor(item = {}) {
  if (item.readyForLaterClosureReview === true) return 'Ready for future scoped closure review handoff';
  if (item.keepReviewOpenBeforeClosure === true) return 'Handoff blocked: keep review open';
  if (item.acknowledgementResolutionBeforeClosure === true) return 'Handoff blocked: acknowledgement first';
  return 'Handoff blocked: final review first';
}

function handoffItem(item = {}, index = 0, timestamp) {
  return Object.freeze({
    closureReadinessHandoffId: `phase32-handoff:${item.candidateSnapshotReadinessOutcomeSummaryId || index}`,
    candidateSnapshotReadinessOutcomeSummaryId: item.candidateSnapshotReadinessOutcomeSummaryId || null,
    queueItemId: item.queueItemId || null,
    retryResultReviewId: item.retryResultReviewId || null,
    outcomeDescriptor: item.outcomeDescriptor || null,
    readyForLaterClosureReview: item.readyForLaterClosureReview === true,
    keepReviewOpenBeforeClosure: item.keepReviewOpenBeforeClosure === true,
    acknowledgementResolutionBeforeClosure: item.acknowledgementResolutionBeforeClosure === true,
    finalReviewBeforeClosure: item.finalReviewBeforeClosure === true,
    handoffStatus: statusFor(item),
    instruction: `${statusFor(item)}. Display only; nothing is applied.`,
    localHandoffOnly: true,
    displayOnly: true,
    closureApplicationAllowed: false,
    closureApplied: false,
    handoffPersistenceAllowed: false,
    handoffPersistenceApplied: false,
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
    handedOffAt: timestamp,
  });
}

function validationErrors(input = null, options = {}) {
  const errors = [];
  if (!validInput(input)) errors.push(issue(BLOCKERS.OUTCOME_SUMMARY_REQUIRED, 'Phase 32 requires the Phase 31 outcome summary surface.', 'outcomeSummarySurface'));
  if (options.applyHandoff === true) errors.push(issue(BLOCKERS.HANDOFF_APPLICATION_BLOCKED, 'Phase 32 handoff is display-only.', 'applyHandoff'));
  if (options.applyClosure === true) errors.push(issue(BLOCKERS.CLOSURE_APPLICATION_BLOCKED, 'Phase 32 cannot apply closure.', 'applyClosure'));
  if (options.persistHandoff === true) errors.push(issue(BLOCKERS.PERSISTENCE_BLOCKED, 'Phase 32 cannot persist handoff state.', 'persistHandoff'));
  if (options.executeRetry === true) errors.push(issue(BLOCKERS.SECOND_RETRY_BLOCKED, 'Phase 32 cannot trigger retry.', 'executeRetry'));
  if (options.backgroundRetryEnabled === true) errors.push(issue(BLOCKERS.BACKGROUND_RETRY_BLOCKED, 'Phase 32 cannot enable background retry.', 'backgroundRetryEnabled'));
  if (options.applyQueueWrites === true || options.queueWriteAllowed === true) errors.push(issue(BLOCKERS.QUEUE_WRITE_BLOCKED, 'Phase 32 cannot write queue state.', 'queueWriteAllowed'));
  if (options.inventoryMutationAllowed === true) errors.push(issue(BLOCKERS.INVENTORY_WRITE_BLOCKED, 'Phase 32 cannot mutate Inventory.', 'inventoryMutationAllowed'));
  if (options.stockMutationAllowed === true || options.priceMutationAllowed === true || options.ledgerMutationAllowed === true || options.approvalMutationAllowed === true) errors.push(issue(BLOCKERS.DIRECT_MUTATION_BLOCKED, 'Phase 32 cannot mutate governed records.', 'mutationAllowed'));
  return errors;
}

export function buildScanOpsRetryResultFinalReviewCandidateClosureReadinessHandoffSurface(input = null, options = {}) {
  const timestamp = nowIso(options.now);
  const errors = validationErrors(input, options);
  if (errors.length > 0) return Object.freeze({ ...base(STATUSES.BLOCKED, timestamp), closureReadinessHandoffItems: frozen([]), closureReadinessHandoffItemCount: 0, readyLaterHandoffCount: 0, keepOpenBlockedHandoffCount: 0, acknowledgementBlockedHandoffCount: 0, finalReviewBlockedHandoffCount: 0, allReadyForLaterClosureHandoff: false, displayOnlyCount: 0, errors: frozen(errors) });

  const sourceItems = input.snapshotReadinessOutcomeSummaryItems;
  if (sourceItems.length === 0) return Object.freeze({ ...base(STATUSES.EMPTY, timestamp), closureReadinessHandoffItems: frozen([]), closureReadinessHandoffItemCount: 0, readyLaterHandoffCount: 0, keepOpenBlockedHandoffCount: 0, acknowledgementBlockedHandoffCount: 0, finalReviewBlockedHandoffCount: 0, allReadyForLaterClosureHandoff: false, displayOnlyCount: 0, errors: frozen([]) });

  const closureReadinessHandoffItems = sourceItems.map((item, index) => handoffItem(item, index, timestamp));
  const readyLaterHandoffCount = closureReadinessHandoffItems.filter((item) => item.readyForLaterClosureReview).length;
  return Object.freeze({
    ...base(STATUSES.READY, timestamp),
    closureReadinessHandoffItems: frozen(closureReadinessHandoffItems),
    closureReadinessHandoffItemCount: closureReadinessHandoffItems.length,
    readyLaterHandoffCount,
    keepOpenBlockedHandoffCount: closureReadinessHandoffItems.filter((item) => item.keepReviewOpenBeforeClosure).length,
    acknowledgementBlockedHandoffCount: closureReadinessHandoffItems.filter((item) => item.acknowledgementResolutionBeforeClosure).length,
    finalReviewBlockedHandoffCount: closureReadinessHandoffItems.filter((item) => item.finalReviewBeforeClosure).length,
    allReadyForLaterClosureHandoff: closureReadinessHandoffItems.length > 0 && readyLaterHandoffCount === closureReadinessHandoffItems.length,
    displayOnlyCount: closureReadinessHandoffItems.filter((item) => item.displayOnly && !item.queueWriteApplied && !item.closureApplied && !item.handoffPersistenceApplied).length,
    errors: frozen([]),
  });
}
