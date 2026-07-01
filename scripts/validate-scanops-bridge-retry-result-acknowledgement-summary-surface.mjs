import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_BLOCKERS,
  SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_STATUSES,
  buildScanOpsRetryResultAcknowledgementSummarySurface,
} from '../src/inventory-bridge/retryResultAcknowledgementSummary/index.js';

const errors = [];
const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), '..');
const fixedNow = '2026-07-01T00:00:00.000Z';

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

const retryResultAcknowledgementBoundary = Object.freeze({
  phase: '16',
  component: 'scanops_bridge_retry_result_acknowledgement_boundary',
  status: 'RETRY_RESULT_ACKNOWLEDGEMENT_READY',
  acknowledgementItems: Object.freeze([
    Object.freeze({
      acknowledgementIntentId: 'retry-result-acknowledgement:retry-result-review:item-1:receipt-1',
      retryResultReviewId: 'retry-result-review:item-1:receipt-1',
      queueItemId: 'item-1',
      bridgeReceiptId: 'receipt-1',
      classification: 'RETRY_ACCEPTED',
      outcomeLabel: 'Retry accepted',
      selectedDescriptor: 'Acknowledge retry result',
      acknowledgementSelected: true,
      acknowledgeRetryResultSelected: true,
      keepVisibleSelected: false,
      reviewLaterSelected: false,
      queueWriteApplied: false,
      secondRetryApplied: false,
    }),
    Object.freeze({
      acknowledgementIntentId: 'retry-result-acknowledgement:retry-result-review:item-2:receipt-2',
      retryResultReviewId: 'retry-result-review:item-2:receipt-2',
      queueItemId: 'item-2',
      bridgeReceiptId: 'receipt-2',
      classification: 'RETRY_SERVICE_UNAVAILABLE',
      outcomeLabel: 'Retry service unavailable',
      selectedDescriptor: 'Keep visible',
      acknowledgementSelected: true,
      acknowledgeRetryResultSelected: false,
      keepVisibleSelected: true,
      reviewLaterSelected: false,
      queueWriteApplied: false,
      secondRetryApplied: false,
    }),
    Object.freeze({
      acknowledgementIntentId: 'retry-result-acknowledgement:retry-result-review:item-3:receipt-3',
      retryResultReviewId: 'retry-result-review:item-3:receipt-3',
      queueItemId: 'item-3',
      bridgeReceiptId: 'receipt-3',
      classification: 'RETRY_TRANSPORT_ERROR',
      outcomeLabel: 'Retry transport error',
      selectedDescriptor: null,
      acknowledgementSelected: false,
      acknowledgeRetryResultSelected: false,
      keepVisibleSelected: false,
      reviewLaterSelected: false,
      queueWriteApplied: false,
      secondRetryApplied: false,
    }),
  ]),
});

const summarySurface = buildScanOpsRetryResultAcknowledgementSummarySurface(retryResultAcknowledgementBoundary, {
  now: () => fixedNow,
});

assert(summarySurface.phase === '17', 'Phase 17 summary surface must declare phase 17');
assert(summarySurface.component === 'scanops_bridge_retry_result_acknowledgement_summary_surface', 'Phase 17 summary surface must expose the expected component id');
assert(summarySurface.status === SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_STATUSES.READY, 'Phase 17 summary surface must be ready for acknowledgement items');
assert(summarySurface.consumesPhase16RetryResultAcknowledgementBoundary === true, 'Phase 17 must consume the Phase 16 retry result acknowledgement boundary');
assert(summarySurface.summaryMode === 'LOCAL_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_ONLY', 'Phase 17 summary must be local summary only');
assert(summarySurface.localSummaryOnly === true && summarySurface.displayOnly === true, 'Phase 17 summary must be display-only local summary');
assert(summarySurface.summaryPersistenceAllowed === false && summarySurface.summaryPersistenceApplied === false, 'Phase 17 summary must not persist acknowledgement summaries');
assert(summarySurface.queueWriteAllowed === false && summarySurface.queueWriteApplied === false, 'Phase 17 summary must not write queue state');
assert(summarySurface.retryApplied === false && summarySurface.secondRetryApplied === false && summarySurface.automaticSecondRetryEnabled === false, 'Phase 17 summary must not apply retry or second retry');
assert(summarySurface.backgroundRetryEnabled === false, 'Phase 17 summary must not enable background retry');
assert(summarySurface.inventoryMutationAttempted === false, 'Phase 17 summary must not mutate Inventory truth');
assert(summarySurface.stockMutationAttempted === false && summarySurface.priceMutationAttempted === false && summarySurface.ledgerMutationAttempted === false && summarySurface.approvalMutationAttempted === false, 'Phase 17 summary must not mutate stock, price, ledger, or approvals');
assert(summarySurface.summaryItemCount === 3, 'Phase 17 summary must expose one summary item per acknowledgement item');
assert(summarySurface.selectedSummaryCount === 2, 'Phase 17 summary must count selected acknowledgement summaries');
assert(summarySurface.acknowledgedSummaryCount === 1, 'Phase 17 summary must count acknowledged summaries');
assert(summarySurface.keptVisibleSummaryCount === 1, 'Phase 17 summary must count keep-visible summaries');
assert(summarySurface.reviewLaterSummaryCount === 0, 'Phase 17 summary must count review-later summaries');
assert(summarySurface.pendingSummaryCount === 1, 'Phase 17 summary must count pending summaries');
assert(summarySurface.displayOnlyCount === 3, 'Phase 17 summary items must remain display-only');
assert(Object.isFrozen(summarySurface.summaryItems), 'Phase 17 summary items array must be immutable');
assert(summarySurface.summaryItems.some((item) => item.summaryStatus === 'Acknowledged locally'), 'Phase 17 summary must describe acknowledged local state');
assert(summarySurface.summaryItems.some((item) => item.summaryStatus === 'Kept visible locally'), 'Phase 17 summary must describe keep-visible local state');
assert(summarySurface.summaryItems.some((item) => item.summaryStatus === 'Awaiting acknowledgement intent'), 'Phase 17 summary must describe pending acknowledgement state');

const emptySummary = buildScanOpsRetryResultAcknowledgementSummarySurface({ acknowledgementItems: [] }, { now: () => fixedNow });
assert(emptySummary.status === SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_STATUSES.EMPTY, 'Phase 17 must expose empty status when there are no acknowledgement items');

const blockedApplySummary = buildScanOpsRetryResultAcknowledgementSummarySurface(retryResultAcknowledgementBoundary, { applySummary: true, now: () => fixedNow });
assert(blockedApplySummary.status === SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_STATUSES.BLOCKED, 'Phase 17 must block summary application');
assert(blockedApplySummary.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_BLOCKERS.SUMMARY_APPLICATION_BLOCKED), 'Phase 17 must report the summary application blocker');

const blockedPersistence = buildScanOpsRetryResultAcknowledgementSummarySurface(retryResultAcknowledgementBoundary, { persistSummary: true, now: () => fixedNow });
assert(blockedPersistence.status === SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_STATUSES.BLOCKED, 'Phase 17 must block summary persistence');
assert(blockedPersistence.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_BLOCKERS.PERSISTENCE_BLOCKED), 'Phase 17 must report the summary persistence blocker');

const blockedSecondRetry = buildScanOpsRetryResultAcknowledgementSummarySurface(retryResultAcknowledgementBoundary, { executeRetry: true, now: () => fixedNow });
assert(blockedSecondRetry.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_BLOCKERS.SECOND_RETRY_BLOCKED), 'Phase 17 must block second retry execution');

const blockedQueueWrite = buildScanOpsRetryResultAcknowledgementSummarySurface(retryResultAcknowledgementBoundary, { applyQueueWrites: true, now: () => fixedNow });
assert(blockedQueueWrite.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_BLOCKERS.QUEUE_WRITE_BLOCKED), 'Phase 17 must block queue writes');

const componentFile = read('src/components/scanner/ReceiptDecisionIntentSurface.jsx');
const packageFile = read('package.json');
const moduleFile = read('src/inventory-bridge/retryResultAcknowledgementSummary/index.js');

assert(componentFile.includes('buildScanOpsRetryResultAcknowledgementSummarySurface'), 'Manual retry UI must build the Phase 17 retry result acknowledgement summary surface');
assert(componentFile.includes('retryResultAcknowledgementSummarySurface'), 'Manual retry UI must keep the Phase 17 summary derived from local acknowledgement state');
assert(componentFile.includes('Retry Result Acknowledgement Summary Surface'), 'Manual retry UI must expose Phase 17 summary copy');
assert(componentFile.includes('Summary only for local acknowledgement selections'), 'Manual retry UI must state the Phase 17 summary boundary');
assert(componentFile.includes('No persistence, queue write, second retry, background loop, or Inventory mutation is allowed.'), 'Manual retry UI must state Phase 17 guardrails');
assert(packageFile.includes('validate:scanops-bridge-retry-result-acknowledgement-summary-surface'), 'package scripts must register Phase 17 validation');

const forbiddenModulePatterns = [
  { pattern: /setInterval\s*\(/, label: 'background interval' },
  { pattern: /setTimeout\s*\(/, label: 'background timer' },
  { pattern: /retryAll/i, label: 'retry-all behavior' },
  { pattern: /localStorage\./, label: 'localStorage persistence' },
  { pattern: /sessionStorage\./, label: 'sessionStorage persistence' },
  { pattern: /indexedDB/i, label: 'indexedDB persistence' },
  { pattern: /saveSyncQueue\s*\(/, label: 'queue persistence helper' },
  { pattern: /markSyncSucceeded\s*\(/, label: 'direct queue success mutation' },
  { pattern: /markSyncFailed\s*\(/, label: 'direct queue failure mutation' },
  { pattern: /postInventoryMovement/i, label: 'Inventory movement posting' },
  { pattern: /StockMovement/i, label: 'StockMovement write path' },
  { pattern: /createPurchaseOrder/i, label: 'purchase order creation' },
  { pattern: /approve.*markdown/i, label: 'markdown approval mutation' },
  { pattern: /approve.*waste/i, label: 'waste approval mutation' },
];

for (const forbidden of forbiddenModulePatterns) {
  assert(!forbidden.pattern.test(moduleFile), `Phase 17 acknowledgement summary surface must not contain ${forbidden.label}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 17 retry result acknowledgement summary surface validates local display-only acknowledgement summaries, no persistence, no queue writes, no second retry/background replay, and no Inventory/stock/price/ledger/approval mutation.');
