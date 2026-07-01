import { buildScanOpsReceiptApplicationBoundary } from '../src/inventory-bridge/receiptApplication/index.js';
import { buildScanOpsReceiptReviewDecisionSurface } from '../src/inventory-bridge/receiptReview/index.js';
import { buildScanOpsReceiptDecisionIntentSurface } from '../src/inventory-bridge/receiptDecisionIntent/index.js';
import {
  SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES,
  buildScanOpsManualRetryExecutionBoundary,
  runScanOpsManualRetryExecutionBoundary,
} from '../src/inventory-bridge/manualRetry/index.js';

const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const stableNow = () => '2026-07-01T00:00:00.000Z';
const queueItems = Object.freeze([
  Object.freeze({
    id: 'queue-service',
    status: 'sync_failed',
    eventType: 'RECEIVING_SUBMISSION',
    sourceWorkflow: 'Receiving',
    payload: Object.freeze({ sku: 'SKU-SERVICE', qty: 2 }),
  }),
  Object.freeze({
    id: 'queue-transport',
    status: 'sync_failed',
    eventType: 'WASTE_SUBMISSION',
    sourceWorkflow: 'Wastage',
    payload: Object.freeze({ sku: 'SKU-TRANSPORT', qty: 1 }),
  }),
  Object.freeze({
    id: 'queue-duplicate',
    status: 'needs_review',
    eventType: 'COUNT_SUBMISSION',
    sourceWorkflow: 'Stock Count',
    payload: Object.freeze({ sku: 'SKU-DUPLICATE', count: 7 }),
  }),
]);

const manualSyncResult = Object.freeze({
  status: 'MANUAL_SYNC_PARTIAL',
  projectedQueuePatches: Object.freeze([
    Object.freeze({ id: 'queue-service', status: 'SERVICE_UNAVAILABLE', bridgeEnvelopeId: 'env-service', bridgeReceiptId: 'receipt-service', bridgeReceiptStatus: 'SERVICE_UNAVAILABLE' }),
    Object.freeze({ id: 'queue-transport', status: 'TRANSPORT_ERROR', bridgeEnvelopeId: 'env-transport', bridgeReceiptId: 'receipt-transport', bridgeReceiptStatus: 'TRANSPORT_ERROR' }),
    Object.freeze({ id: 'queue-duplicate', status: 'DUPLICATE', bridgeEnvelopeId: 'env-duplicate', bridgeReceiptId: 'receipt-duplicate', bridgeReceiptStatus: 'DUPLICATE' }),
  ]),
  syncResults: Object.freeze([
    Object.freeze({ queueItemId: 'queue-service', operationType: 'RECEIVING_SUBMISSION', status: 'SERVICE_UNAVAILABLE' }),
    Object.freeze({ queueItemId: 'queue-transport', operationType: 'WASTE_SUBMISSION', status: 'TRANSPORT_ERROR' }),
    Object.freeze({ queueItemId: 'queue-duplicate', operationType: 'COUNT_SUBMISSION', status: 'DUPLICATE' }),
  ]),
});

const receiptBoundary = buildScanOpsReceiptApplicationBoundary(manualSyncResult, { now: stableNow });
const reviewSurface = buildScanOpsReceiptReviewDecisionSurface(receiptBoundary, { now: stableNow });
const serviceDecision = reviewSurface.decisionItems.find((item) => item.queueItemId === 'queue-service');
const selectedIntentsByDecisionId = Object.freeze({
  [serviceDecision.decisionId]: Object.freeze({ descriptor: 'Retry manually', selectedAt: '2026-07-01T00:01:00.000Z', selectedBy: 'operator-001' }),
});
const decisionIntentSurface = buildScanOpsReceiptDecisionIntentSurface(reviewSurface, { selectedIntentsByDecisionId, now: stableNow });

const manualRetryRequest = Object.freeze({
  userInitiated: true,
  trigger: 'manual_retry',
  requestedBy: 'operator-001',
  requestedAt: '2026-07-01T00:02:00.000Z',
  reason: 'Operator selected Retry manually from receipt review.',
});

const boundary = buildScanOpsManualRetryExecutionBoundary(queueItems, decisionIntentSurface, {
  manualRetryRequest,
  executeRetry: true,
  endpoint: Object.freeze({ host: '127.0.0.1', port: '4411', path: '/scanops/handoff' }),
  deviceIdentity: Object.freeze({ deviceId: 'scanner-001', storeId: 'store-001', sessionId: 'session-001' }),
  now: stableNow,
});

assert(boundary.status === SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES.READY, 'Phase 13 manual retry boundary must be ready for explicit selected retry intent');
assert(boundary.executionMode === 'EXPLICIT_OPERATOR_MANUAL_RETRY_ONLY', 'manual retry boundary must remain explicit operator retry only');
assert(boundary.retryCandidateCount === 1, 'manual retry boundary must include only selected Retry manually intent');
assert(boundary.readyRetryCandidateCount === 1, 'manual retry boundary must mark matched retry intent ready');
assert(boundary.queueWriteAllowed === false, 'manual retry boundary must not allow queue writes');
assert(boundary.queueWriteApplied === false, 'manual retry boundary must not apply queue writes');
assert(boundary.automaticReplayEnabled === false, 'manual retry boundary must not enable automatic replay');
assert(boundary.backgroundRetryEnabled === false, 'manual retry boundary must not enable background retry');
assert(boundary.inventoryMutationAttempted === false, 'manual retry boundary must not mutate Inventory');
assert(boundary.stockMutationAttempted === false, 'manual retry boundary must not mutate stock');
assert(boundary.priceMutationAttempted === false, 'manual retry boundary must not mutate pricing');
assert(boundary.approvalMutationAttempted === false, 'manual retry boundary must not mutate approvals');

const empty = buildScanOpsManualRetryExecutionBoundary(queueItems, buildScanOpsReceiptDecisionIntentSurface(reviewSurface, { now: stableNow }), {
  manualRetryRequest,
  executeRetry: true,
  now: stableNow,
});
assert(empty.status === SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES.EMPTY, 'manual retry boundary must be empty when no Retry manually intent is selected');

const blockedNoRequest = buildScanOpsManualRetryExecutionBoundary(queueItems, decisionIntentSurface, { executeRetry: true, now: stableNow });
assert(blockedNoRequest.status === SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES.BLOCKED, 'manual retry boundary must require explicit operator retry request');

const blockedNoExecute = buildScanOpsManualRetryExecutionBoundary(queueItems, decisionIntentSurface, { manualRetryRequest, now: stableNow });
assert(blockedNoExecute.status === SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES.BLOCKED, 'manual retry boundary must require executeRetry true');

const blockedAuto = buildScanOpsManualRetryExecutionBoundary(queueItems, decisionIntentSurface, { manualRetryRequest, executeRetry: true, autoRetryEnabled: true, now: stableNow });
assert(blockedAuto.status === SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES.BLOCKED, 'manual retry boundary must block automatic retry');

const blockedBackground = buildScanOpsManualRetryExecutionBoundary(queueItems, decisionIntentSurface, { manualRetryRequest, executeRetry: true, backgroundRetryEnabled: true, now: stableNow });
assert(blockedBackground.status === SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES.BLOCKED, 'manual retry boundary must block background retry loops');

const blockedQueueWrite = buildScanOpsManualRetryExecutionBoundary(queueItems, decisionIntentSurface, { manualRetryRequest, executeRetry: true, applyQueueWrites: true, now: stableNow });
assert(blockedQueueWrite.status === SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES.BLOCKED, 'manual retry boundary must block queue writes');

const retryRun = await runScanOpsManualRetryExecutionBoundary(queueItems, decisionIntentSurface, {
  manualRetryRequest,
  executeRetry: true,
  endpoint: Object.freeze({ host: '127.0.0.1', port: '4411', path: '/scanops/handoff' }),
  deviceIdentity: Object.freeze({ deviceId: 'scanner-001', storeId: 'store-001', sessionId: 'session-001' }),
  dispatch: async ({ envelope }) => Object.freeze({
    receiptId: `receipt:${envelope.envelopeId}`,
    envelopeId: envelope.envelopeId,
    status: 'ACCEPTED',
  }),
  now: stableNow,
});

assert(retryRun.status === SCANOPS_BRIDGE_MANUAL_RETRY_STATUSES.COMPLETED, 'manual retry run must complete when the explicit retry handoff is accepted');
assert(retryRun.dispatchAttempted === true, 'manual retry run must dispatch only after explicit retry execution');
assert(retryRun.retryResults.length === 1, 'manual retry run must dispatch only the selected retry candidate');
assert(retryRun.projectedQueuePatches.length === 1, 'manual retry run must create one projected queue patch');
assert(retryRun.queueWriteApplied === false, 'manual retry run must not apply queue writes');
assert(retryRun.projectedQueuePatches.every((patch) => patch.queueWriteApplied === false && patch.localProjectionOnly === true), 'manual retry patches must remain local projections only');
assert(retryRun.inventoryMutationAttempted === false, 'manual retry run must not mutate Inventory');
assert(retryRun.stockMutationAttempted === false, 'manual retry run must not mutate stock');
assert(retryRun.priceMutationAttempted === false, 'manual retry run must not mutate pricing');
assert(retryRun.approvalMutationAttempted === false, 'manual retry run must not mutate approvals');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 13 manual retry execution boundary validates explicit operator retry execution only, selected retry candidate filtering, no automatic/background retry, no queue writes, and no Inventory/stock/price/approval mutation.');
