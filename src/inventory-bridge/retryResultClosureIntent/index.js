export const SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_PHASE = '19';
export const SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_COMPONENT = 'scanops_bridge_retry_result_closure_intent_descriptor_surface';
export const SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_VERSION = 'scanops-retry-result-closure-intent.v0.19.0';

export const SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_STATUSES = Object.freeze({
  READY: 'RETRY_RESULT_CLOSURE_INTENT_READY',
  EMPTY: 'RETRY_RESULT_CLOSURE_INTENT_EMPTY',
  BLOCKED: 'RETRY_RESULT_CLOSURE_INTENT_BLOCKED',
});

export const SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_DESCRIPTORS = Object.freeze({
  READY_FOR_FUTURE_CLOSURE: 'Ready for future closure',
  KEEP_REVIEW_OPEN: 'Keep review open',
  ACKNOWLEDGEMENT_STILL_PENDING: 'Acknowledgement still pending',
});

export const SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_BLOCKERS = Object.freeze({
  READINESS_SURFACE_REQUIRED: 'retry_result_closure_readiness_surface_required',
  CLOSURE_APPLICATION_BLOCKED: 'closure_application_blocked',
  PERSISTENCE_BLOCKED: 'closure_intent_persistence_blocked',
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

function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function nowIso(now) {
  if (typeof now === 'function') return now();
  return new Date().toISOString();
}

function issue(code, message, field = null) {
  return Object.freeze({ code, message, field });
}

function base(status, timestamp) {
  return {
    component: SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_COMPONENT,
    phase: SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_PHASE,
    version: SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_VERSION,
    status,
    timestamp,
    intentMode: 'LOCAL_RETRY_RESULT_CLOSURE_INTENT_DESCRIPTOR_ONLY',
    consumesPhase18ClosureReadinessSurface: true,
    localIntentOnly: true,
    descriptorOnly: true,
    displayOnly: true,
    closureApplicationAllowed: false,
    closureApplied: false,
    closureIntentPersistenceAllowed: false,
    closureIntentPersistenceApplied: false,
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

function descriptorsFor(readinessItem = {}) {
  if (readinessItem.acknowledgementCoverageReady === true) {
    return Object.freeze([
      SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_DESCRIPTORS.READY_FOR_FUTURE_CLOSURE,
      SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_DESCRIPTORS.KEEP_REVIEW_OPEN,
    ]);
  }
  return Object.freeze([
    SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_DESCRIPTORS.ACKNOWLEDGEMENT_STILL_PENDING,
    SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_DESCRIPTORS.KEEP_REVIEW_OPEN,
  ]);
}

function instructionFor(selectedDescriptor, readinessItem = {}) {
  if (selectedDescriptor === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_DESCRIPTORS.READY_FOR_FUTURE_CLOSURE) {
    return 'Operator marked this retry result as ready for a future scoped closure flow. Closure is not applied.';
  }
  if (selectedDescriptor === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_DESCRIPTORS.KEEP_REVIEW_OPEN) {
    return 'Operator chose to keep review visible. No persistence, queue write, or closure is applied.';
  }
  if (selectedDescriptor === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_DESCRIPTORS.ACKNOWLEDGEMENT_STILL_PENDING) {
    return 'Acknowledgement coverage is still pending. Review remains open without mutation.';
  }
  if (readinessItem.acknowledgementCoverageReady === true) {
    return 'Closure intent is available as a local descriptor only. Select an operator descriptor without applying closure.';
  }
  return 'Acknowledgement is still pending before closure intent can be marked ready.';
}

function selectedFor(readinessItem = {}, selectedClosureIntentsByReadinessItemId = {}) {
  const selected = selectedClosureIntentsByReadinessItemId[readinessItem.readinessItemId];
  const descriptor = asString(selected?.descriptor || selected);
  const availableDescriptors = descriptorsFor(readinessItem);
  if (!descriptor || !availableDescriptors.includes(descriptor)) return null;
  return descriptor;
}

function buildIntentItem(readinessItem = {}, index = 0, selectedClosureIntentsByReadinessItemId = {}, timestamp) {
  const availableClosureIntentDescriptors = descriptorsFor(readinessItem);
  const selectedDescriptor = selectedFor(readinessItem, selectedClosureIntentsByReadinessItemId);
  return Object.freeze({
    closureIntentId: `retry-result-closure-intent:${readinessItem.readinessItemId || readinessItem.retryResultReviewId || index}`,
    readinessItemId: readinessItem.readinessItemId || null,
    summaryItemId: readinessItem.summaryItemId || null,
    acknowledgementIntentId: readinessItem.acknowledgementIntentId || null,
    retryResultReviewId: readinessItem.retryResultReviewId || null,
    queueItemId: readinessItem.queueItemId || null,
    bridgeEnvelopeId: readinessItem.bridgeEnvelopeId || null,
    bridgeReceiptId: readinessItem.bridgeReceiptId || null,
    classification: readinessItem.classification || null,
    outcomeLabel: readinessItem.outcomeLabel || null,
    acknowledgementCoverageReady: readinessItem.acknowledgementCoverageReady === true,
    closureReadinessStatus: readinessItem.closureReadinessStatus || null,
    availableClosureIntentDescriptors,
    selectedDescriptor,
    closureIntentSelected: Boolean(selectedDescriptor),
    readyForFutureClosureSelected: selectedDescriptor === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_DESCRIPTORS.READY_FOR_FUTURE_CLOSURE,
    keepReviewOpenSelected: selectedDescriptor === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_DESCRIPTORS.KEEP_REVIEW_OPEN,
    acknowledgementStillPendingSelected: selectedDescriptor === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_DESCRIPTORS.ACKNOWLEDGEMENT_STILL_PENDING,
    instruction: instructionFor(selectedDescriptor, readinessItem),
    localIntentOnly: true,
    descriptorOnly: true,
    displayOnly: true,
    closureApplicationAllowed: false,
    closureApplied: false,
    closureIntentPersistenceAllowed: false,
    closureIntentPersistenceApplied: false,
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
    intentDescribedAt: timestamp,
  });
}

function validationErrors(retryResultClosureReadinessSurface = {}, options = {}) {
  const errors = [];
  if (!isPlainObject(retryResultClosureReadinessSurface)) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_BLOCKERS.READINESS_SURFACE_REQUIRED, 'Retry result closure intent requires a Phase 18 closure readiness surface.', 'retryResultClosureReadinessSurface'));
  }
  if (options.applyClosure === true || options.closeReview === true || options.applyReviewClosure === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_BLOCKERS.CLOSURE_APPLICATION_BLOCKED, 'Retry result closure intent cannot apply review closure.', 'applyClosure'));
  }
  if (options.persistClosureIntent === true || options.persistIntent === true || options.persistClosure === true || options.persistReadiness === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_BLOCKERS.PERSISTENCE_BLOCKED, 'Retry result closure intent cannot be persisted in Phase 19.', 'persistClosureIntent'));
  }
  if (options.autoRetryEnabled === true || options.automaticReplayEnabled === true || options.automaticSecondRetryEnabled === true || options.executeRetry === true || options.applyRetry === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_BLOCKERS.SECOND_RETRY_BLOCKED, 'Retry result closure intent cannot launch another retry.', 'executeRetry'));
  }
  if (options.backgroundRetryEnabled === true || options.backgroundReplayEnabled === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_BLOCKERS.BACKGROUND_RETRY_BLOCKED, 'Retry result closure intent cannot start a background retry loop.', 'backgroundRetryEnabled'));
  }
  if (options.applyQueueWrites === true || options.queueWriteAllowed === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_BLOCKERS.QUEUE_WRITE_BLOCKED, 'Retry result closure intent does not write ScanOps queue state.', 'queueWriteAllowed'));
  }
  if (options.inventoryMutationAllowed === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_BLOCKERS.INVENTORY_WRITE_BLOCKED, 'Retry result closure intent cannot mutate Inventory truth.', 'inventoryMutationAllowed'));
  }
  if (options.stockMutationAllowed === true || options.priceMutationAllowed === true || options.ledgerMutationAllowed === true || options.approvalMutationAllowed === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_BLOCKERS.DIRECT_MUTATION_BLOCKED, 'Retry result closure intent cannot mutate stock, price, ledger, or approvals.', 'mutationAllowed'));
  }
  return errors;
}

export function buildScanOpsRetryResultClosureIntentSurface(retryResultClosureReadinessSurface = {}, options = {}) {
  const timestamp = nowIso(options.now);
  const errors = validationErrors(retryResultClosureReadinessSurface, options);

  if (errors.length > 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_STATUSES.BLOCKED, timestamp),
      closureIntentItems: freezeArray([]),
      closureIntentItemCount: 0,
      selectedClosureIntentCount: 0,
      readyForFutureClosureIntentCount: 0,
      keepReviewOpenIntentCount: 0,
      acknowledgementStillPendingIntentCount: 0,
      descriptorOnlyCount: 0,
      errors: freezeArray(errors),
    });
  }

  const readinessItems = Array.isArray(retryResultClosureReadinessSurface.readinessItems)
    ? retryResultClosureReadinessSurface.readinessItems
    : [];

  if (readinessItems.length === 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_STATUSES.EMPTY, timestamp),
      closureIntentItems: freezeArray([]),
      closureIntentItemCount: 0,
      selectedClosureIntentCount: 0,
      readyForFutureClosureIntentCount: 0,
      keepReviewOpenIntentCount: 0,
      acknowledgementStillPendingIntentCount: 0,
      descriptorOnlyCount: 0,
      errors: freezeArray([]),
    });
  }

  const selectedClosureIntentsByReadinessItemId = isPlainObject(options.selectedClosureIntentsByReadinessItemId)
    ? options.selectedClosureIntentsByReadinessItemId
    : {};
  const closureIntentItems = readinessItems.map((item, index) => buildIntentItem(item, index, selectedClosureIntentsByReadinessItemId, timestamp));

  return Object.freeze({
    ...base(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_STATUSES.READY, timestamp),
    closureIntentItems: freezeArray(closureIntentItems),
    closureIntentItemCount: closureIntentItems.length,
    selectedClosureIntentCount: closureIntentItems.filter((item) => item.closureIntentSelected === true).length,
    readyForFutureClosureIntentCount: closureIntentItems.filter((item) => item.readyForFutureClosureSelected === true).length,
    keepReviewOpenIntentCount: closureIntentItems.filter((item) => item.keepReviewOpenSelected === true).length,
    acknowledgementStillPendingIntentCount: closureIntentItems.filter((item) => item.acknowledgementStillPendingSelected === true).length,
    descriptorOnlyCount: closureIntentItems.filter((item) => item.descriptorOnly === true && item.queueWriteApplied === false && item.closureApplied === false && item.closureIntentPersistenceApplied === false).length,
    errors: freezeArray([]),
  });
}
