export const SCANOPS_BRIDGE_RECEIPT_DECISION_INTENT_PHASE = '12';
export const SCANOPS_BRIDGE_RECEIPT_DECISION_INTENT_COMPONENT = 'scanops_bridge_receipt_decision_intent_surface';
export const SCANOPS_BRIDGE_RECEIPT_DECISION_INTENT_VERSION = 'scanops-receipt-decision-intent.v0.12.0';

export const SCANOPS_BRIDGE_RECEIPT_DECISION_INTENT_STATUSES = Object.freeze({
  READY: 'RECEIPT_DECISION_INTENT_READY',
  EMPTY: 'RECEIPT_DECISION_INTENT_EMPTY',
  BLOCKED: 'RECEIPT_DECISION_INTENT_BLOCKED',
});

export const SCANOPS_BRIDGE_RECEIPT_DECISION_INTENT_BLOCKERS = Object.freeze({
  REVIEW_SURFACE_REQUIRED: 'receipt_review_surface_required',
  AUTO_RETRY_BLOCKED: 'auto_retry_blocked',
  BACKGROUND_RETRY_BLOCKED: 'background_retry_blocked',
  QUEUE_WRITE_BLOCKED: 'queue_write_blocked',
  INVENTORY_WRITE_BLOCKED: 'inventory_write_blocked',
  DECISION_APPLICATION_BLOCKED: 'decision_application_blocked',
  PERSISTENCE_BLOCKED: 'decision_persistence_blocked',
});

function freezeArray(values) {
  return Object.freeze([...(values || [])]);
}

function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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
    component: SCANOPS_BRIDGE_RECEIPT_DECISION_INTENT_COMPONENT,
    phase: SCANOPS_BRIDGE_RECEIPT_DECISION_INTENT_PHASE,
    version: SCANOPS_BRIDGE_RECEIPT_DECISION_INTENT_VERSION,
    status,
    timestamp,
    intentMode: 'LOCAL_OPERATOR_INTENT_ONLY',
    localIntentOnly: true,
    descriptorOnly: true,
    intentPersistenceAllowed: false,
    intentPersistenceApplied: false,
    queueWriteAllowed: false,
    queueWriteApplied: false,
    retryApplied: false,
    decisionApplied: false,
    automaticReplayEnabled: false,
    backgroundRetryEnabled: false,
    inventoryMutationAttempted: false,
    scanOpsMutationAttempted: false,
    stockMutationAttempted: false,
    priceMutationAttempted: false,
    ledgerMutationAttempted: false,
    approvalMutationAttempted: false,
  };
}

function normalizeIntentMap(options = {}) {
  const source = options.selectedIntentsByDecisionId || options.intentByDecisionId || options.intentsByDecisionId || {};
  if (Array.isArray(source)) {
    return source.reduce((acc, intent) => {
      const decisionId = asString(intent?.decisionId);
      if (decisionId) acc[decisionId] = intent;
      return acc;
    }, {});
  }
  return isPlainObject(source) ? source : {};
}

function selectedIntentFor(decisionItem = {}, intentMap = {}) {
  const direct = intentMap[decisionItem.decisionId];
  if (typeof direct === 'string') {
    return Object.freeze({ descriptor: direct });
  }
  if (isPlainObject(direct)) return Object.freeze({ ...direct });
  return Object.freeze({});
}

function normalizedDescriptors(decisionItem = {}) {
  return Array.isArray(decisionItem.decisionDescriptors)
    ? decisionItem.decisionDescriptors.map(asString).filter(Boolean)
    : [];
}

function buildIntentItem(decisionItem = {}, intentMap = {}, timestamp) {
  const descriptors = normalizedDescriptors(decisionItem);
  const selectedIntent = selectedIntentFor(decisionItem, intentMap);
  const selectedDescriptor = asString(selectedIntent.descriptor || selectedIntent.selectedDescriptor);
  const descriptorValid = selectedDescriptor ? descriptors.includes(selectedDescriptor) : false;
  const hasSelectedIntent = Boolean(selectedDescriptor && descriptorValid);

  return Object.freeze({
    intentId: `receipt-decision-intent:${decisionItem.decisionId || 'unknown'}`,
    decisionId: decisionItem.decisionId || null,
    queueItemId: decisionItem.queueItemId || null,
    bridgeReceiptId: decisionItem.bridgeReceiptId || null,
    bridgeEnvelopeId: decisionItem.bridgeEnvelopeId || null,
    classification: decisionItem.classification || null,
    outcomeType: decisionItem.outcomeType || null,
    outcomeLabel: decisionItem.outcomeLabel || null,
    availableDescriptors: freezeArray(descriptors),
    selectedDescriptor: hasSelectedIntent ? selectedDescriptor : null,
    selectedDescriptorValid: descriptorValid,
    selectedAt: hasSelectedIntent ? asString(selectedIntent.selectedAt) || timestamp : null,
    selectedBy: hasSelectedIntent ? asString(selectedIntent.selectedBy) || null : null,
    requiresOperatorDecision: decisionItem.requiresOperatorDecision === true,
    intentSelected: hasSelectedIntent,
    pendingOperatorIntent: decisionItem.requiresOperatorDecision === true && !hasSelectedIntent,
    retryIntentSelected: selectedDescriptor === 'Retry manually',
    duplicateAcknowledgementIntentSelected: selectedDescriptor === 'Acknowledge duplicate',
    keepQueuedIntentSelected: selectedDescriptor === 'Keep queued',
    reviewIntentSelected: selectedDescriptor === 'Review' || selectedDescriptor === 'Review receipt',
    localIntentOnly: true,
    descriptorOnly: true,
    intentPersistenceAllowed: false,
    intentPersistenceApplied: false,
    queueWriteAllowed: false,
    queueWriteApplied: false,
    retryApplied: false,
    decisionApplied: false,
    inventoryMutationAttempted: false,
    scanOpsMutationAttempted: false,
    stockMutationAttempted: false,
    priceMutationAttempted: false,
    ledgerMutationAttempted: false,
    approvalMutationAttempted: false,
    stagedAt: timestamp,
  });
}

export function buildScanOpsReceiptDecisionIntentSurface(receiptReviewSurface = {}, options = {}) {
  const timestamp = nowIso(options.now);
  const errors = [];

  if (!isPlainObject(receiptReviewSurface)) errors.push(issue(SCANOPS_BRIDGE_RECEIPT_DECISION_INTENT_BLOCKERS.REVIEW_SURFACE_REQUIRED, 'Receipt decision intent requires a Phase 11 receipt review surface object.', 'receiptReviewSurface'));
  if (options.autoRetryEnabled === true || options.automaticReplayEnabled === true) errors.push(issue(SCANOPS_BRIDGE_RECEIPT_DECISION_INTENT_BLOCKERS.AUTO_RETRY_BLOCKED, 'Receipt decision intent cannot trigger automatic retry.', 'autoRetryEnabled'));
  if (options.backgroundRetryEnabled === true || options.backgroundReplayEnabled === true) errors.push(issue(SCANOPS_BRIDGE_RECEIPT_DECISION_INTENT_BLOCKERS.BACKGROUND_RETRY_BLOCKED, 'Receipt decision intent cannot start a background retry loop.', 'backgroundRetryEnabled'));
  if (options.applyQueueWrites === true || options.queueWriteAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RECEIPT_DECISION_INTENT_BLOCKERS.QUEUE_WRITE_BLOCKED, 'Receipt decision intent does not write queue state.', 'queueWriteAllowed'));
  if (options.inventoryMutationAllowed === true) errors.push(issue(SCANOPS_BRIDGE_RECEIPT_DECISION_INTENT_BLOCKERS.INVENTORY_WRITE_BLOCKED, 'Receipt decision intent cannot mutate Inventory truth.', 'inventoryMutationAllowed'));
  if (options.applyDecision === true || options.applyRetryDecision === true) errors.push(issue(SCANOPS_BRIDGE_RECEIPT_DECISION_INTENT_BLOCKERS.DECISION_APPLICATION_BLOCKED, 'Receipt decision intent stages local intent only; application is out of scope.', 'applyDecision'));
  if (options.persistIntent === true || options.persistDecisionIntent === true) errors.push(issue(SCANOPS_BRIDGE_RECEIPT_DECISION_INTENT_BLOCKERS.PERSISTENCE_BLOCKED, 'Receipt decision intent is not persisted in Phase 12.', 'persistIntent'));

  if (errors.length > 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RECEIPT_DECISION_INTENT_STATUSES.BLOCKED, timestamp),
      intentItems: freezeArray([]),
      intentItemCount: 0,
      selectedIntentCount: 0,
      pendingIntentCount: 0,
      retryIntentSelectedCount: 0,
      duplicateAcknowledgementIntentSelectedCount: 0,
      keepQueuedIntentSelectedCount: 0,
      reviewIntentSelectedCount: 0,
      descriptorOnlyCount: 0,
      errors: freezeArray(errors),
    });
  }

  const decisionItems = Array.isArray(receiptReviewSurface.decisionItems)
    ? receiptReviewSurface.decisionItems
    : [];

  if (decisionItems.length === 0) {
    return Object.freeze({
      ...base(SCANOPS_BRIDGE_RECEIPT_DECISION_INTENT_STATUSES.EMPTY, timestamp),
      intentItems: freezeArray([]),
      intentItemCount: 0,
      selectedIntentCount: 0,
      pendingIntentCount: 0,
      retryIntentSelectedCount: 0,
      duplicateAcknowledgementIntentSelectedCount: 0,
      keepQueuedIntentSelectedCount: 0,
      reviewIntentSelectedCount: 0,
      descriptorOnlyCount: 0,
      errors: freezeArray([]),
    });
  }

  const intentMap = normalizeIntentMap(options);
  const intentItems = decisionItems.map((decisionItem) => buildIntentItem(decisionItem, intentMap, timestamp));

  return Object.freeze({
    ...base(SCANOPS_BRIDGE_RECEIPT_DECISION_INTENT_STATUSES.READY, timestamp),
    intentItems: freezeArray(intentItems),
    intentItemCount: intentItems.length,
    selectedIntentCount: intentItems.filter((item) => item.intentSelected === true).length,
    pendingIntentCount: intentItems.filter((item) => item.pendingOperatorIntent === true).length,
    retryIntentSelectedCount: intentItems.filter((item) => item.retryIntentSelected === true).length,
    duplicateAcknowledgementIntentSelectedCount: intentItems.filter((item) => item.duplicateAcknowledgementIntentSelected === true).length,
    keepQueuedIntentSelectedCount: intentItems.filter((item) => item.keepQueuedIntentSelected === true).length,
    reviewIntentSelectedCount: intentItems.filter((item) => item.reviewIntentSelected === true).length,
    descriptorOnlyCount: intentItems.filter((item) => item.descriptorOnly === true && item.queueWriteApplied === false && item.retryApplied === false && item.decisionApplied === false).length,
    errors: freezeArray([]),
  });
}
