import { buildScanOpsReceiptApplicationBoundary } from '../src/inventory-bridge/receiptApplication/index.js';
import { buildScanOpsReceiptReviewDecisionSurface } from '../src/inventory-bridge/receiptReview/index.js';
import {
  SCANOPS_BRIDGE_RECEIPT_DECISION_INTENT_STATUSES,
  buildScanOpsReceiptDecisionIntentSurface,
} from '../src/inventory-bridge/receiptDecisionIntent/index.js';

const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const stableNow = () => '2026-07-01T00:00:00.000Z';
const manualSyncResult = Object.freeze({
  status: 'MANUAL_SYNC_PARTIAL',
  projectedQueuePatches: Object.freeze([
    Object.freeze({ id: 'queue-accepted', status: 'SYNCED', bridgeEnvelopeId: 'env-accepted', bridgeReceiptId: 'receipt-accepted', bridgeReceiptStatus: 'ACCEPTED' }),
    Object.freeze({ id: 'queue-duplicate', status: 'DUPLICATE', bridgeEnvelopeId: 'env-duplicate', bridgeReceiptId: 'receipt-duplicate', bridgeReceiptStatus: 'DUPLICATE' }),
    Object.freeze({ id: 'queue-service', status: 'SERVICE_UNAVAILABLE', bridgeEnvelopeId: 'env-service', bridgeReceiptId: 'receipt-service', bridgeReceiptStatus: 'SERVICE_UNAVAILABLE' }),
    Object.freeze({ id: 'queue-transport', status: 'TRANSPORT_ERROR', bridgeEnvelopeId: 'env-transport', bridgeReceiptId: 'receipt-transport', bridgeReceiptStatus: 'TRANSPORT_ERROR' }),
    Object.freeze({ id: 'queue-rejected', status: 'REJECTED', bridgeEnvelopeId: 'env-rejected', bridgeReceiptId: 'receipt-rejected', bridgeReceiptStatus: 'REJECTED' }),
    Object.freeze({ id: 'queue-blocked', status: 'BLOCKED', bridgeEnvelopeId: 'env-blocked', bridgeReceiptId: 'receipt-blocked', bridgeReceiptStatus: 'BLOCKED' }),
  ]),
  syncResults: Object.freeze([
    Object.freeze({ queueItemId: 'queue-accepted', operationType: 'STOCK_COUNT_EVIDENCE', status: 'SYNCED' }),
    Object.freeze({ queueItemId: 'queue-duplicate', operationType: 'REPLENISHMENT_EVIDENCE', status: 'DUPLICATE' }),
    Object.freeze({ queueItemId: 'queue-service', operationType: 'RECEIVING_EVIDENCE', status: 'SERVICE_UNAVAILABLE' }),
    Object.freeze({ queueItemId: 'queue-transport', operationType: 'RECEIVING_EVIDENCE', status: 'TRANSPORT_ERROR' }),
    Object.freeze({ queueItemId: 'queue-rejected', operationType: 'WASTAGE_EVIDENCE', status: 'REJECTED' }),
    Object.freeze({ queueItemId: 'queue-blocked', operationType: 'ADJUSTMENT_EVIDENCE', status: 'BLOCKED' }),
  ]),
});

const boundary = buildScanOpsReceiptApplicationBoundary(manualSyncResult, { now: stableNow });
const reviewSurface = buildScanOpsReceiptReviewDecisionSurface(boundary, { now: stableNow });
const retryItem = reviewSurface.decisionItems.find((item) => item.queueItemId === 'queue-service');
const duplicateItem = reviewSurface.decisionItems.find((item) => item.queueItemId === 'queue-duplicate');
const rejectedItem = reviewSurface.decisionItems.find((item) => item.queueItemId === 'queue-rejected');

const selectedIntentsByDecisionId = Object.freeze({
  [retryItem.decisionId]: Object.freeze({ descriptor: 'Retry manually', selectedAt: '2026-07-01T00:01:00.000Z', selectedBy: 'operator-001' }),
  [duplicateItem.decisionId]: Object.freeze({ descriptor: 'Acknowledge duplicate', selectedAt: '2026-07-01T00:02:00.000Z', selectedBy: 'operator-001' }),
  [rejectedItem.decisionId]: Object.freeze({ descriptor: 'Review', selectedAt: '2026-07-01T00:03:00.000Z', selectedBy: 'operator-001' }),
});

const surface = buildScanOpsReceiptDecisionIntentSurface(reviewSurface, { selectedIntentsByDecisionId, now: stableNow });

assert(surface.status === SCANOPS_BRIDGE_RECEIPT_DECISION_INTENT_STATUSES.READY, 'Phase 12 receipt decision intent surface must be ready when Phase 11 decisions exist');
assert(surface.intentMode === 'LOCAL_OPERATOR_INTENT_ONLY', 'decision intent must remain local operator intent only');
assert(surface.intentItemCount === 6, 'decision intent surface must preserve Phase 11 decision item count');
assert(surface.selectedIntentCount === 3, 'decision intent surface must count selected local intents');
assert(surface.retryIntentSelectedCount === 1, 'Retry manually must be captured as local intent only');
assert(surface.duplicateAcknowledgementIntentSelectedCount === 1, 'Acknowledge duplicate must be captured as local intent only');
assert(surface.reviewIntentSelectedCount === 1, 'Review must be captured as local intent only');
assert(surface.pendingIntentCount === 2, 'unselected operator-required items must stay pending without automatic decisions');
assert(surface.descriptorOnlyCount === 6, 'all decision intent items must be descriptor-only');
assert(surface.intentPersistenceAllowed === false, 'decision intent persistence must not be allowed');
assert(surface.intentPersistenceApplied === false, 'decision intent persistence must not be applied');
assert(surface.queueWriteAllowed === false, 'decision intent must not allow queue writes');
assert(surface.queueWriteApplied === false, 'decision intent must not apply queue writes');
assert(surface.retryApplied === false, 'decision intent must not apply retry');
assert(surface.decisionApplied === false, 'decision intent must not apply decisions');
assert(surface.inventoryMutationAttempted === false, 'decision intent must not mutate Inventory');
assert(surface.stockMutationAttempted === false, 'decision intent must not mutate stock');
assert(surface.priceMutationAttempted === false, 'decision intent must not mutate price');
assert(surface.approvalMutationAttempted === false, 'decision intent must not mutate approvals');

const retryIntent = surface.intentItems.find((item) => item.queueItemId === 'queue-service');
assert(retryIntent?.selectedDescriptor === 'Retry manually', 'retry descriptor must be captured for service unavailable item');
assert(retryIntent?.retryIntentSelected === true, 'retry intent must be flagged locally');
assert(retryIntent?.retryApplied === false, 'retry intent must not execute retry');
assert(retryIntent?.queueWriteApplied === false, 'retry intent must not write queue state');

const duplicateIntent = surface.intentItems.find((item) => item.queueItemId === 'queue-duplicate');
assert(duplicateIntent?.selectedDescriptor === 'Acknowledge duplicate', 'duplicate acknowledgement descriptor must be captured');
assert(duplicateIntent?.duplicateAcknowledgementIntentSelected === true, 'duplicate acknowledgement must be flagged locally');
assert(duplicateIntent?.decisionApplied === false, 'duplicate acknowledgement must not apply decision');

const empty = buildScanOpsReceiptDecisionIntentSurface({ decisionItems: [] }, { now: stableNow });
assert(empty.status === SCANOPS_BRIDGE_RECEIPT_DECISION_INTENT_STATUSES.EMPTY, 'decision intent surface must report empty when no review decisions exist');

const blockedAuto = buildScanOpsReceiptDecisionIntentSurface(reviewSurface, { autoRetryEnabled: true, now: stableNow });
assert(blockedAuto.status === SCANOPS_BRIDGE_RECEIPT_DECISION_INTENT_STATUSES.BLOCKED, 'decision intent surface must block automatic retry');

const blockedBackground = buildScanOpsReceiptDecisionIntentSurface(reviewSurface, { backgroundRetryEnabled: true, now: stableNow });
assert(blockedBackground.status === SCANOPS_BRIDGE_RECEIPT_DECISION_INTENT_STATUSES.BLOCKED, 'decision intent surface must block background retry loops');

const blockedQueueWrite = buildScanOpsReceiptDecisionIntentSurface(reviewSurface, { applyQueueWrites: true, now: stableNow });
assert(blockedQueueWrite.status === SCANOPS_BRIDGE_RECEIPT_DECISION_INTENT_STATUSES.BLOCKED, 'decision intent surface must block queue writes');

const blockedDecisionApply = buildScanOpsReceiptDecisionIntentSurface(reviewSurface, { applyRetryDecision: true, now: stableNow });
assert(blockedDecisionApply.status === SCANOPS_BRIDGE_RECEIPT_DECISION_INTENT_STATUSES.BLOCKED, 'decision intent surface must block decision application');

const blockedPersistence = buildScanOpsReceiptDecisionIntentSurface(reviewSurface, { persistIntent: true, now: stableNow });
assert(blockedPersistence.status === SCANOPS_BRIDGE_RECEIPT_DECISION_INTENT_STATUSES.BLOCKED, 'decision intent surface must block persistence');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 12 receipt decision intent surface validates explicit operator-selected descriptors as local intent only, with no automatic replay, no background retry loop, no persistence, no queue writes, and no Inventory/stock/price/approval mutation.');
