export const SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_PHASE = '16';
export const SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_COMPONENT = 'scanops_bridge_retry_result_acknowledgement_boundary';
export const SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_VERSION = 'scanops-retry-result-acknowledgement.v0.16.0';

export const SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_STATUSES = Object.freeze({
  READY: 'RETRY_RESULT_ACKNOWLEDGEMENT_READY',
  EMPTY: 'RETRY_RESULT_ACKNOWLEDGEMENT_EMPTY',
  BLOCKED: 'RETRY_RESULT_ACKNOWLEDGEMENT_BLOCKED',
});

export const SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_DESCRIPTORS = Object.freeze({
  ACKNOWLEDGE_RETRY_RESULT: 'Acknowledge retry result',
  KEEP_VISIBLE: 'Keep visible',
  REVIEW_LATER: 'Review later',
});

export const SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_BLOCKERS = Object.freeze({
  REVIEW_BOUNDARY_REQUIRED: 'retry_result_review_boundary_required',
  SECOND_RETRY_BLOCKED: 'second_retry_blocked',
  BACKGROUND_RETRY_BLOCKED: 'background_retry_blocked',
  QUEUE_WRITE_BLOCKED: 'queue_write_blocked',
  INVENTORY_WRITE_BLOCKED: 'inventory_write_blocked',
  PERSISTENCE_BLOCKED: 'acknowledgement_persistence_blocked',
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
    component: SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_COMPONENT,
    phase: SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_PHASE,
    version: SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_VERSION,
    status,
    timestamp,
    acknowledgementMode: 'LOCAL_OPERATOR_ACKNOWLEDGEMENT_INTENT_ONLY',
    consumesPhase15RetryResultReviewBoundary: true,
    localIntentOnly: true,
    descriptorOnly: true,
    acknowledgementPersistenceAllowed: false,
    acknowledgementPersistenceApplied: false,
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

function normalizeAcknowledgementMap(options = {}) {
  const source = options.selectedAcknowledgementsByRetryResultReviewId
    || options.acknowledgementByRetryResultReviewId
    || options.acknowledgementsByRetryResultReviewId
    || {};
  if (Array.isArray(source)) {
    return source.reduce((acc, acknowledgement) => {
      const retryResultReviewId = asString(acknowledgement?.retryResultReviewId);
      if (retryResultReviewId) acc[retryResultReviewId] = acknowledgement;
      return acc;
    }, {});
  }
  return isPlainObject(source) ? source : {};
}

function selectedAcknowledgementFor(retryResultItem = {}, acknowledgementMap = {}) {
  const direct = acknowledgementMap[retryResultItem.retryResultReviewId];
  if (typeof direct === 'string') {
    return Object.freeze({ descriptor: direct });
  }
  if (isPlainObject(direct)) return Object.freeze({ ...direct });
  return Object.freeze({});
}

function acknowledgementDescriptorsFor(retryResultItem = {}) {
  const classification = asString(retryResultItem.classification).toUpperCase();
  if (classification.includes('ACCEPTED') || classification.includes('DUPLICATE')) {
    return freezeArray([
      SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_DESCRIPTORS.ACKNOWLEDGE_RETRY_RESULT,
      SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_DESCRIPTORS.REVIEW_LATER,
    ]);
  }
  return freezeArray([
    SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_DESCRIPTORS.REVIEW_LATER,
    SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_DESCRIPTORS.KEEP_VISIBLE,
  ]);
}

function buildAcknowledgementItem(retryResultItem = {}, acknowledgementMap = {}, timestamp) {
  const descriptors = acknowledgementDescriptorsFor(retryResultItem);
  const selectedAcknowledgement = selectedAcknowledgementFor(retryResultItem, acknowledgementMap);
  const selectedDescriptor = asString(selectedAcknowledgement.descriptor || selectedAcknowledgement.selectedDescriptor);
  const descriptorValid = selectedDescriptor ? descriptors.includes(selectedDescriptor) : false;
  const hasSelectedAcknowledgement = Boolean(selectedDescriptor && descriptorValid);

  return Object.freeze({
    acknowledgementIntentId: `retry-result-acknowledgement:${retryResultItem.retryResultReviewId || 'unknown'}`,
    retryResultReviewId: retryResultItem.retryResultReviewId || null,
    sourceDecisionId: retryResultItem.sourceDecisionId || null,
    queueItemId: retryResultItem.queueItemId || null,
    bridgeEnvelopeId: retryResultItem.bridgeEnvelopeId || null,
    bridgeReceiptId: retryResultItem.bridgeReceiptId || null,
    classification: retryResultItem.classification || null,
    outcomeLabel: retryResultItem.outcomeLabel || null,
    instruction: retryResultItem.instruction || null,
    availableAcknowledgementDescriptors: descriptors,
    selectedDescriptor: hasSelectedAcknowledgement ? selectedDescriptor : null,
    selectedDescriptorValid: descriptorValid,
    selectedAt: hasSelectedAcknowledgement ? asString(selectedAcknowledgement.selectedAt) || timestamp : null,
    selectedBy: hasSelectedAcknowledgement ? asString(selectedAcknowledgement.selectedBy) || null : null,
    acknowledgementSelected: hasSelectedAcknowledgement,
    acknowledgeRetryResultSelected: selectedDescriptor === SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_DESCRIPTORS.ACKNOWLEDGE_RETRY_RESULT,
    keepVisibleSelected: selectedDescriptor === SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_DESCRIPTORS.KEEP_VISIBLE,
    reviewLaterSelected: selectedDescriptor === SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_DESCRIPTORS.REVIEW_LATER,
    localIntentOnly: true,
    descriptorOnly: true,
    acknowledgementPersistenceAllowed: false,
    acknowledgementPersistenceApplied: false,
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
    stagedAt: timestamp,
  });
}

function validationErrors(retryResultReceiptReviewBoundary = {}, options = {}) {
  const errors = [];
  if (!isPlainObject(retryResultReceiptReviewBoundary)) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_BLOCKERS.REVIEW_BOUNDARY_REQUIRED, 'Retry result acknowledgement requires a Phase 15 retry result receipt review boundary.', 'retryResultReceiptReviewBoundary'));
  }
  if (options.autoRetryEnabled === true || options.automaticReplayEnabled === true || options.automaticSecondRetryEnabled === true || options.executeRetry === true || options.applyRetry === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_BLOCKERS.SECOND_RETRY_BLOCKED, 'Retry result acknowledgement cannot launch another retry.', 'executeRetry'));
  }
  if (options.backgroundRetryEnabled === true || options.backgroundReplayEnabled === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_BLOCKERS.BACKGROUND_RETRY_BLOCKED, 'Retry result acknowledgement cannot start a background retry loop.', 'backgroundRetryEnabled'));
  }
  if (options.applyQueueWrites === true || options.queueWriteAllowed === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_BLOCKERS.QUEUE_WRITE_BLOCKED, 'Retry result acknowledgement does not write ScanOps queue state.', 'queueWriteAllowed'));
  }
  if (options.persistAcknowledgement === true || options.persistAcknowledgementIntent === true || options.applyAcknowledgement === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_BLOCKERS.PERSISTENCE_BLOCKED, 'Retry result acknowledgement is local intent only in Phase 16.', 'persistAcknowledgement'));
  }
  if (options.inventoryMutationAllowed === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_BLOCKERS.INVENTORY_WRITE_BLOCKED, 'Retry result acknowledgement cannot mutate Inventory truth.', 'inventoryMutationAllowed'));
  }
  if (options.stockMutationAllowed === true || options.priceMutationAllowed === true || options.ledgerMutationAllowed === true || options.approvalMutationAllowed === true) {
    errors.push(issue(SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_BLOCKERS.DIRECT_MUTATION_BLOCKED, 'Retry result acknowledgement cannot mutate stock, price, ledger, or approvals.', 'mutationAllowed'));
  }
  return errors;
}

export function buildScanOpsRetryResultAcknowledgementBoundary(retryResultReceiptReviewBoundary = {}, options = {}) {
  const timestamp = nowIso(options.now);
  const errors = validationErrors(retryResultReceiptReviewBoundary, options);

  if (errors.length > 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_STATUSES.BLOCKED, timestamp),
      acknowledgementItems: freezeArray([]),
      acknowledgementItemCount: 0,
      selectedAcknowledgementCount: 0,
      acknowledgeRetryResultCount: 0,
      keepVisibleCount: 0,
      reviewLaterCount: 0,
      descriptorOnlyCount: 0,
      errors: freezeArray(errors),
    });
  }

  const retryResultItems = Array.isArray(retryResultReceiptReviewBoundary.retryResultItems)
    ? retryResultReceiptReviewBoundary.retryResultItems
    : [];

  if (retryResultItems.length === 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_STATUSES.EMPTY, timestamp),
      acknowledgementItems: freezeArray([]),
      acknowledgementItemCount: 0,
      selectedAcknowledgementCount: 0,
      acknowledgeRetryResultCount: 0,
      keepVisibleCount: 0,
      reviewLaterCount: 0,
      descriptorOnlyCount: 0,
      errors: freezeArray([]),
    });
  }

  const acknowledgementMap = normalizeAcknowledgementMap(options);
  const acknowledgementItems = retryResultItems.map((item) => buildAcknowledgementItem(item, acknowledgementMap, timestamp));

  return Object.freeze({
    ...base(SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_STATUSES.READY, timestamp),
    acknowledgementItems: freezeArray(acknowledgementItems),
    acknowledgementItemCount: acknowledgementItems.length,
    selectedAcknowledgementCount: acknowledgementItems.filter((item) => item.acknowledgementSelected === true).length,
    acknowledgeRetryResultCount: acknowledgementItems.filter((item) => item.acknowledgeRetryResultSelected === true).length,
    keepVisibleCount: acknowledgementItems.filter((item) => item.keepVisibleSelected === true).length,
    reviewLaterCount: acknowledgementItems.filter((item) => item.reviewLaterSelected === true).length,
    descriptorOnlyCount: acknowledgementItems.filter((item) => item.descriptorOnly === true && item.queueWriteApplied === false && item.retryApplied === false && item.acknowledgementPersistenceApplied === false).length,
    errors: freezeArray([]),
  });
}
