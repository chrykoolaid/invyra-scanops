import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS,
  SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_STATUSES,
  buildScanOpsRetryResultReceiptReviewBoundary,
} from '../src/inventory-bridge/retryResultReceiptReview/index.js';

const errors = [];
const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), '..');

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

const stableNow = () => '2026-07-01T00:00:00.000Z';
const manualRetryResult = Object.freeze({
  status: 'MANUAL_RETRY_PARTIAL',
  dispatchAttempted: true,
  queueWriteApplied: false,
  manualSyncResult: Object.freeze({
    status: 'MANUAL_SYNC_PARTIAL',
    projectedQueuePatches: Object.freeze([
      Object.freeze({ id: 'queue-accepted', status: 'SYNCED', bridgeEnvelopeId: 'env-accepted', bridgeReceiptId: 'receipt-accepted', bridgeReceiptStatus: 'ACCEPTED' }),
      Object.freeze({ id: 'queue-duplicate', status: 'DUPLICATE', bridgeEnvelopeId: 'env-duplicate', bridgeReceiptId: 'receipt-duplicate', bridgeReceiptStatus: 'DUPLICATE' }),
      Object.freeze({ id: 'queue-failed', status: 'FAILED', bridgeEnvelopeId: 'env-failed', bridgeReceiptId: 'receipt-failed', bridgeReceiptStatus: 'FAILED' }),
      Object.freeze({ id: 'queue-rejected', status: 'REJECTED', bridgeEnvelopeId: 'env-rejected', bridgeReceiptId: 'receipt-rejected', bridgeReceiptStatus: 'REJECTED' }),
      Object.freeze({ id: 'queue-blocked', status: 'BLOCKED', bridgeEnvelopeId: 'env-blocked', bridgeReceiptId: 'receipt-blocked', bridgeReceiptStatus: 'BLOCKED' }),
      Object.freeze({ id: 'queue-service', status: 'SERVICE_UNAVAILABLE', bridgeEnvelopeId: 'env-service', bridgeReceiptId: 'receipt-service', bridgeReceiptStatus: 'SERVICE_UNAVAILABLE' }),
      Object.freeze({ id: 'queue-transport', status: 'TRANSPORT_ERROR', bridgeEnvelopeId: 'env-transport', bridgeReceiptId: 'receipt-transport', bridgeReceiptStatus: 'TRANSPORT_ERROR' }),
    ]),
    syncResults: Object.freeze([
      Object.freeze({ queueItemId: 'queue-accepted', operationType: 'RECEIVING_SUBMISSION', status: 'SYNCED' }),
      Object.freeze({ queueItemId: 'queue-duplicate', operationType: 'COUNT_SUBMISSION', status: 'DUPLICATE' }),
      Object.freeze({ queueItemId: 'queue-failed', operationType: 'WASTE_SUBMISSION', status: 'FAILED' }),
      Object.freeze({ queueItemId: 'queue-rejected', operationType: 'WASTE_SUBMISSION', status: 'REJECTED' }),
      Object.freeze({ queueItemId: 'queue-blocked', operationType: 'TRANSFER_SUBMISSION', status: 'BLOCKED' }),
      Object.freeze({ queueItemId: 'queue-service', operationType: 'RECEIVING_SUBMISSION', status: 'SERVICE_UNAVAILABLE' }),
      Object.freeze({ queueItemId: 'queue-transport', operationType: 'WASTE_SUBMISSION', status: 'TRANSPORT_ERROR' }),
    ]),
  }),
});

const boundary = buildScanOpsRetryResultReceiptReviewBoundary(manualRetryResult, { now: stableNow });

assert(boundary.status === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_STATUSES.READY, 'Phase 15 retry result receipt review boundary must be ready when Phase 13 retry receipts exist');
assert(boundary.reviewMode === 'RETRY_RESULT_RECEIPT_DISPLAY_ONLY', 'retry result review must be display-only');
assert(boundary.consumesPhase13ManualRetryResults === true, 'retry result review must consume Phase 13 manual retry results');
assert(boundary.wrapsReceiptApplicationBoundary === true, 'retry result review must wrap Phase 10 receipt staging');
assert(boundary.wrapsReceiptReviewSurface === true, 'retry result review must wrap Phase 11 receipt review');
assert(boundary.receiptBoundary?.stagedReceiptCount === 7, 'retry result review must preserve staged retry receipt count');
assert(boundary.receiptReviewSurface?.decisionItemCount === 7, 'retry result review must preserve review decision item count');
assert(boundary.retryResultItemCount === 7, 'retry result review must expose all retry result receipt items');
assert(boundary.retryAcceptedCount === 1, 'retry accepted receipt must be counted');
assert(boundary.retryDuplicateCount === 1, 'retry duplicate receipt must be counted');
assert(boundary.retryStillFailedCount === 1, 'retry still failed receipt must be counted');
assert(boundary.retryRejectedCount === 1, 'retry rejected receipt must be counted');
assert(boundary.retryBlockedCount === 1, 'retry blocked receipt must be counted');
assert(boundary.retryServiceUnavailableCount === 1, 'retry service unavailable receipt must be counted');
assert(boundary.retryTransportErrorCount === 1, 'retry transport error receipt must be counted');
assert(boundary.failedOutcomeCount === 5, 'retry failed outcomes must include still failed, rejected, blocked, service unavailable, and transport error');
assert(boundary.displayOnlyCount === 7, 'all retry result receipt items must be display-only');
assert(boundary.queueWriteAllowed === false && boundary.queueWriteApplied === false, 'retry result review must not allow or apply queue writes');
assert(boundary.retryApplied === false && boundary.secondRetryApplied === false, 'retry result review must not apply another retry');
assert(boundary.automaticSecondRetryEnabled === false && boundary.backgroundRetryEnabled === false, 'retry result review must not enable automatic second retry or background retry');
assert(boundary.inventoryMutationAttempted === false, 'retry result review must not mutate Inventory');
assert(boundary.stockMutationAttempted === false, 'retry result review must not mutate stock');
assert(boundary.priceMutationAttempted === false, 'retry result review must not mutate price');
assert(boundary.ledgerMutationAttempted === false, 'retry result review must not mutate ledger');
assert(boundary.approvalMutationAttempted === false, 'retry result review must not mutate approvals');

const labels = new Set(boundary.retryResultItems.map((item) => item.outcomeLabel));
assert(labels.has('Retry accepted'), 'retry accepted label must be shown');
assert(labels.has('Retry duplicate'), 'retry duplicate label must be shown');
assert(labels.has('Retry still failed'), 'retry still failed label must be shown');
assert(labels.has('Retry rejected'), 'retry rejected label must be shown');
assert(labels.has('Retry blocked'), 'retry blocked label must be shown');
assert(labels.has('Retry service unavailable'), 'retry service unavailable label must be shown');
assert(labels.has('Retry transport error'), 'retry transport error label must be shown');
assert(boundary.retryResultItems.every((item) => item.displayOnly === true && item.queueWriteApplied === false && item.secondRetryApplied === false), 'retry result items must remain display-only and second-retry-free');
assert(boundary.retryResultItems.find((item) => item.classification === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_REJECTED)?.instruction.includes('must not override validation'), 'rejected retry receipt must preserve Inventory validation boundary');

const empty = buildScanOpsRetryResultReceiptReviewBoundary({ status: 'MANUAL_RETRY_COMPLETED', projectedQueuePatches: [], syncResults: [] }, { now: stableNow });
assert(empty.status === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_STATUSES.EMPTY, 'retry result review must report empty when no retry receipt descriptors exist');

const blockedSecondRetry = buildScanOpsRetryResultReceiptReviewBoundary(manualRetryResult, { executeRetry: true, now: stableNow });
assert(blockedSecondRetry.status === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_STATUSES.BLOCKED, 'retry result review must block second retry execution');

const blockedAutoSecondRetry = buildScanOpsRetryResultReceiptReviewBoundary(manualRetryResult, { automaticSecondRetryEnabled: true, now: stableNow });
assert(blockedAutoSecondRetry.status === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_STATUSES.BLOCKED, 'retry result review must block automatic second retry');

const blockedBackground = buildScanOpsRetryResultReceiptReviewBoundary(manualRetryResult, { backgroundRetryEnabled: true, now: stableNow });
assert(blockedBackground.status === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_STATUSES.BLOCKED, 'retry result review must block background retry loops');

const blockedQueueWrite = buildScanOpsRetryResultReceiptReviewBoundary(manualRetryResult, { applyQueueWrites: true, now: stableNow });
assert(blockedQueueWrite.status === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_STATUSES.BLOCKED, 'retry result review must block queue write application');

const blockedInventoryWrite = buildScanOpsRetryResultReceiptReviewBoundary(manualRetryResult, { inventoryMutationAllowed: true, now: stableNow });
assert(blockedInventoryWrite.status === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_STATUSES.BLOCKED, 'retry result review must block Inventory mutation');

const blockedDirectMutation = buildScanOpsRetryResultReceiptReviewBoundary(manualRetryResult, { stockMutationAllowed: true, now: stableNow });
assert(blockedDirectMutation.status === SCANOPS_BRIDGE_RETRY_RESULT_RECEIPT_REVIEW_STATUSES.BLOCKED, 'retry result review must block stock, price, ledger, and approval mutation');

const moduleFile = read('src/inventory-bridge/retryResultReceiptReview/index.js');
const retryControlFile = read('src/components/scanner/ReceiptDecisionIntentSurface.jsx');
const manualSyncPage = read('src/pages/ManualSyncControl.jsx');

assert(retryControlFile.includes('buildScanOpsRetryResultReceiptReviewBoundary'), 'manual retry UI must build the Phase 15 retry result review boundary');
assert(retryControlFile.includes('Retry Result Receipt Review Boundary'), 'manual retry UI must expose the Phase 15 boundary title');
assert(retryControlFile.includes('Retry result receipts are display-only'), 'manual retry UI must label retry result receipts as display-only');
assert(retryControlFile.includes('No automatic second retry'), 'manual retry UI must state that no automatic second retry is allowed');
assert(manualSyncPage.includes('ReceiptDecisionIntentSurface'), 'Manual Sync page must continue to host the manual retry surface that displays Phase 15 results');

const forbiddenModulePatterns = [
  { pattern: /localStorage\./, label: 'localStorage persistence' },
  { pattern: /sessionStorage\./, label: 'sessionStorage persistence' },
  { pattern: /indexedDB/i, label: 'indexedDB persistence' },
  { pattern: /saveSyncQueue\s*\(/, label: 'queue persistence helper' },
  { pattern: /markSyncSucceeded\s*\(/, label: 'direct queue success mutation' },
  { pattern: /markSyncFailed\s*\(/, label: 'direct queue failure mutation' },
  { pattern: /retryAll/i, label: 'retry-all behavior' },
  { pattern: /runScanOpsManualRetryExecutionBoundary/i, label: 'retry execution call' },
  { pattern: /runScanOpsManualSyncExecution/i, label: 'manual sync execution call' },
  { pattern: /createScanOpsBridgeHttpDispatchAdapter/i, label: 'transport dispatch adapter' },
  { pattern: /postInventoryMovement/i, label: 'Inventory movement posting' },
  { pattern: /StockMovement/i, label: 'StockMovement write path' },
  { pattern: /createPurchaseOrder/i, label: 'purchase order creation' },
  { pattern: /approve.*markdown/i, label: 'markdown approval mutation' },
  { pattern: /approve.*waste/i, label: 'waste approval mutation' },
  { pattern: /setInterval\s*\(/, label: 'background interval' },
  { pattern: /setTimeout\s*\(/, label: 'background timer' },
  { pattern: /Phase 32/i, label: 'Phase 32 scaffold reference' },
  { pattern: /Phase 33/i, label: 'Phase 33 scaffold reference' },
];

for (const forbidden of forbiddenModulePatterns) {
  assert(!forbidden.pattern.test(moduleFile), `retry result receipt review boundary must not contain ${forbidden.label}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 15 retry result receipt review boundary validates Phase 13 retry receipt consumption, Phase 10/11 wrapping, accepted/duplicate/still failed/rejected/blocked/service unavailable/transport error display-only outcomes, no queue writes, no automatic second retry, no background retry loop, no Inventory/stock/price/ledger/approval mutation, and no Phase 32/33 scaffold expansion.');
