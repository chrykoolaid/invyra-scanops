import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_BLOCKERS,
  SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_STATUSES,
  buildScanOpsRetryResultClosureIntentSummarySurface,
} from '../src/inventory-bridge/retryResultClosureIntentSummary/index.js';

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

const closureIntentSurface = Object.freeze({
  phase: '19',
  component: 'scanops_bridge_retry_result_closure_intent_descriptor_surface',
  status: 'RETRY_RESULT_CLOSURE_INTENT_READY',
  closureIntentItems: Object.freeze([
    Object.freeze({
      closureIntentId: 'retry-result-closure-intent:item-1',
      readinessItemId: 'retry-result-closure-readiness:item-1',
      summaryItemId: 'retry-result-ack-summary:item-1',
      acknowledgementIntentId: 'retry-result-acknowledgement:item-1',
      retryResultReviewId: 'retry-result-review:item-1',
      queueItemId: 'item-1',
      bridgeReceiptId: 'receipt-1',
      classification: 'RETRY_ACCEPTED',
      outcomeLabel: 'Retry accepted',
      selectedDescriptor: 'Ready for future closure',
      closureIntentSelected: true,
      readyForFutureClosureSelected: true,
      keepReviewOpenSelected: false,
      acknowledgementStillPendingSelected: false,
      queueWriteApplied: false,
      closureApplied: false,
      closureIntentPersistenceApplied: false,
    }),
    Object.freeze({
      closureIntentId: 'retry-result-closure-intent:item-2',
      readinessItemId: 'retry-result-closure-readiness:item-2',
      summaryItemId: 'retry-result-ack-summary:item-2',
      acknowledgementIntentId: 'retry-result-acknowledgement:item-2',
      retryResultReviewId: 'retry-result-review:item-2',
      queueItemId: 'item-2',
      bridgeReceiptId: 'receipt-2',
      classification: 'RETRY_SERVICE_UNAVAILABLE',
      outcomeLabel: 'Retry service unavailable',
      selectedDescriptor: 'Keep review open',
      closureIntentSelected: true,
      readyForFutureClosureSelected: false,
      keepReviewOpenSelected: true,
      acknowledgementStillPendingSelected: false,
      queueWriteApplied: false,
      closureApplied: false,
      closureIntentPersistenceApplied: false,
    }),
    Object.freeze({
      closureIntentId: 'retry-result-closure-intent:item-3',
      readinessItemId: 'retry-result-closure-readiness:item-3',
      summaryItemId: 'retry-result-ack-summary:item-3',
      acknowledgementIntentId: 'retry-result-acknowledgement:item-3',
      retryResultReviewId: 'retry-result-review:item-3',
      queueItemId: 'item-3',
      bridgeReceiptId: 'receipt-3',
      classification: 'RETRY_TRANSPORT_ERROR',
      outcomeLabel: 'Retry transport error',
      selectedDescriptor: 'Acknowledgement still pending',
      closureIntentSelected: true,
      readyForFutureClosureSelected: false,
      keepReviewOpenSelected: false,
      acknowledgementStillPendingSelected: true,
      queueWriteApplied: false,
      closureApplied: false,
      closureIntentPersistenceApplied: false,
    }),
    Object.freeze({
      closureIntentId: 'retry-result-closure-intent:item-4',
      readinessItemId: 'retry-result-closure-readiness:item-4',
      summaryItemId: 'retry-result-ack-summary:item-4',
      acknowledgementIntentId: 'retry-result-acknowledgement:item-4',
      retryResultReviewId: 'retry-result-review:item-4',
      queueItemId: 'item-4',
      bridgeReceiptId: 'receipt-4',
      classification: 'RETRY_REJECTED',
      outcomeLabel: 'Retry rejected',
      selectedDescriptor: null,
      closureIntentSelected: false,
      readyForFutureClosureSelected: false,
      keepReviewOpenSelected: false,
      acknowledgementStillPendingSelected: false,
      queueWriteApplied: false,
      closureApplied: false,
      closureIntentPersistenceApplied: false,
    }),
  ]),
});

const summarySurface = buildScanOpsRetryResultClosureIntentSummarySurface(closureIntentSurface, {
  now: () => fixedNow,
});

assert(summarySurface.phase === '20', 'Phase 20 closure intent summary surface must declare phase 20');
assert(summarySurface.component === 'scanops_bridge_retry_result_closure_intent_summary_surface', 'Phase 20 closure intent summary surface must expose the expected component id');
assert(summarySurface.status === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_STATUSES.READY, 'Phase 20 closure intent summary surface must be ready for closure intent items');
assert(summarySurface.consumesPhase19ClosureIntentSurface === true, 'Phase 20 must consume the Phase 19 closure intent surface');
assert(summarySurface.summaryMode === 'LOCAL_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_ONLY', 'Phase 20 summary must be local summary only');
assert(summarySurface.localSummaryOnly === true && summarySurface.displayOnly === true, 'Phase 20 summary must be display-only local summary');
assert(summarySurface.closureApplicationAllowed === false && summarySurface.closureApplied === false, 'Phase 20 summary must not apply closure');
assert(summarySurface.closureIntentSummaryPersistenceAllowed === false && summarySurface.closureIntentSummaryPersistenceApplied === false, 'Phase 20 summary must not persist closure intent summaries');
assert(summarySurface.queueWriteAllowed === false && summarySurface.queueWriteApplied === false, 'Phase 20 summary must not write queue state');
assert(summarySurface.retryApplied === false && summarySurface.secondRetryApplied === false && summarySurface.automaticSecondRetryEnabled === false, 'Phase 20 summary must not apply retry or second retry');
assert(summarySurface.backgroundRetryEnabled === false, 'Phase 20 summary must not enable background retry');
assert(summarySurface.inventoryMutationAttempted === false, 'Phase 20 summary must not mutate Inventory truth');
assert(summarySurface.stockMutationAttempted === false && summarySurface.priceMutationAttempted === false && summarySurface.ledgerMutationAttempted === false && summarySurface.approvalMutationAttempted === false, 'Phase 20 summary must not mutate stock, price, ledger, or approvals');
assert(summarySurface.closureIntentSummaryItemCount === 4, 'Phase 20 summary must expose one summary item per closure intent item');
assert(summarySurface.selectedClosureIntentSummaryCount === 3, 'Phase 20 summary must count selected closure intent summaries');
assert(summarySurface.readyForFutureClosureSummaryCount === 1, 'Phase 20 summary must count ready-for-future-closure summaries');
assert(summarySurface.keepReviewOpenSummaryCount === 1, 'Phase 20 summary must count keep-review-open summaries');
assert(summarySurface.acknowledgementStillPendingSummaryCount === 1, 'Phase 20 summary must count acknowledgement-still-pending summaries');
assert(summarySurface.pendingClosureIntentSummaryCount === 1, 'Phase 20 summary must count pending closure intent summaries');
assert(summarySurface.displayOnlyCount === 4, 'Phase 20 summary items must remain display-only');
assert(Object.isFrozen(summarySurface.closureIntentSummaryItems), 'Phase 20 closure intent summary items array must be immutable');
assert(summarySurface.closureIntentSummaryItems.some((item) => item.summaryStatus === 'Future closure intent selected locally'), 'Phase 20 summary must describe ready-for-future-closure local state');
assert(summarySurface.closureIntentSummaryItems.some((item) => item.summaryStatus === 'Keep review open selected locally'), 'Phase 20 summary must describe keep-review-open local state');
assert(summarySurface.closureIntentSummaryItems.some((item) => item.summaryStatus === 'Acknowledgement still pending selected locally'), 'Phase 20 summary must describe acknowledgement-still-pending local state');
assert(summarySurface.closureIntentSummaryItems.some((item) => item.summaryStatus === 'Closure intent not selected'), 'Phase 20 summary must describe unselected closure intent state');

const emptySummary = buildScanOpsRetryResultClosureIntentSummarySurface({ closureIntentItems: [] }, { now: () => fixedNow });
assert(emptySummary.status === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_STATUSES.EMPTY, 'Phase 20 must expose empty status when there are no closure intent items');

const blockedApplySummary = buildScanOpsRetryResultClosureIntentSummarySurface(closureIntentSurface, { applySummary: true, now: () => fixedNow });
assert(blockedApplySummary.status === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_STATUSES.BLOCKED, 'Phase 20 must block summary application');
assert(blockedApplySummary.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_BLOCKERS.SUMMARY_APPLICATION_BLOCKED), 'Phase 20 must report the summary application blocker');

const blockedApplyClosure = buildScanOpsRetryResultClosureIntentSummarySurface(closureIntentSurface, { applyClosure: true, now: () => fixedNow });
assert(blockedApplyClosure.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_BLOCKERS.CLOSURE_APPLICATION_BLOCKED), 'Phase 20 must block closure application');

const blockedPersistence = buildScanOpsRetryResultClosureIntentSummarySurface(closureIntentSurface, { persistClosureIntentSummary: true, now: () => fixedNow });
assert(blockedPersistence.status === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_STATUSES.BLOCKED, 'Phase 20 must block closure intent summary persistence');
assert(blockedPersistence.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_BLOCKERS.PERSISTENCE_BLOCKED), 'Phase 20 must report the closure intent summary persistence blocker');

const blockedSecondRetry = buildScanOpsRetryResultClosureIntentSummarySurface(closureIntentSurface, { executeRetry: true, now: () => fixedNow });
assert(blockedSecondRetry.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_BLOCKERS.SECOND_RETRY_BLOCKED), 'Phase 20 must block second retry execution');

const blockedQueueWrite = buildScanOpsRetryResultClosureIntentSummarySurface(closureIntentSurface, { applyQueueWrites: true, now: () => fixedNow });
assert(blockedQueueWrite.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_SUMMARY_BLOCKERS.QUEUE_WRITE_BLOCKED), 'Phase 20 must block queue writes');

const componentFile = read('src/components/scanner/ReceiptDecisionIntentSurface.jsx');
const packageFile = read('package.json');
const moduleFile = read('src/inventory-bridge/retryResultClosureIntentSummary/index.js');

assert(componentFile.includes('buildScanOpsRetryResultClosureIntentSummarySurface'), 'Manual retry UI must build the Phase 20 retry result closure intent summary surface');
assert(componentFile.includes('retryResultClosureIntentSummarySurface'), 'Manual retry UI must keep the Phase 20 closure intent summary derived from Phase 19 state');
assert(componentFile.includes('Retry Result Closure Intent Summary Surface'), 'Manual retry UI must expose Phase 20 closure intent summary copy');
assert(componentFile.includes('Summary only for selected local closure-intent descriptors'), 'Manual retry UI must state the Phase 20 summary boundary');
assert(componentFile.includes('No closure is applied, persisted, written to the queue, retried, or sent to Inventory.'), 'Manual retry UI must state Phase 20 guardrails');
assert(packageFile.includes('validate:scanops-bridge-retry-result-closure-intent-summary-surface'), 'package scripts must register Phase 20 validation');

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
  assert(!forbidden.pattern.test(moduleFile), `Phase 20 closure intent summary surface must not contain ${forbidden.label}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 20 retry result closure intent summary surface validates local display-only closure intent summaries, no closure application, no persistence, no queue writes, no second retry/background replay, and no Inventory/stock/price/ledger/approval mutation.');
