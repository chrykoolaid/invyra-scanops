import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_BLOCKERS,
  SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_STATUSES,
  buildScanOpsRetryResultFinalReviewReadinessSummarySurface,
} from '../src/inventory-bridge/retryResultFinalReviewReadinessSummary/index.js';

const errors = [];
const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), '..');
const fixedNow = '2026-07-02T00:00:00.000Z';

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

const finalReviewSnapshotSurface = Object.freeze({
  phase: '21',
  component: 'scanops_bridge_retry_result_final_review_snapshot_surface',
  status: 'RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_READY',
  finalReviewSnapshotItems: Object.freeze([
    Object.freeze({
      finalReviewSnapshotItemId: 'snapshot:item-1',
      retryResultReviewId: 'retry-result-review:item-1',
      queueItemId: 'item-1',
      selectedDescriptor: 'Ready for future closure',
      closureIntentSelected: true,
      readyForFutureClosureSelected: true,
      keepReviewOpenSelected: false,
      acknowledgementStillPendingSelected: false,
      queueWriteApplied: false,
      closureApplied: false,
      finalReviewSnapshotPersistenceApplied: false,
    }),
    Object.freeze({
      finalReviewSnapshotItemId: 'snapshot:item-2',
      retryResultReviewId: 'retry-result-review:item-2',
      queueItemId: 'item-2',
      selectedDescriptor: 'Keep review open',
      closureIntentSelected: true,
      readyForFutureClosureSelected: false,
      keepReviewOpenSelected: true,
      acknowledgementStillPendingSelected: false,
      queueWriteApplied: false,
      closureApplied: false,
      finalReviewSnapshotPersistenceApplied: false,
    }),
    Object.freeze({
      finalReviewSnapshotItemId: 'snapshot:item-3',
      retryResultReviewId: 'retry-result-review:item-3',
      queueItemId: 'item-3',
      selectedDescriptor: 'Acknowledgement still pending',
      closureIntentSelected: true,
      readyForFutureClosureSelected: false,
      keepReviewOpenSelected: false,
      acknowledgementStillPendingSelected: true,
      queueWriteApplied: false,
      closureApplied: false,
      finalReviewSnapshotPersistenceApplied: false,
    }),
    Object.freeze({
      finalReviewSnapshotItemId: 'snapshot:item-4',
      retryResultReviewId: 'retry-result-review:item-4',
      queueItemId: 'item-4',
      selectedDescriptor: null,
      closureIntentSelected: false,
      readyForFutureClosureSelected: false,
      keepReviewOpenSelected: false,
      acknowledgementStillPendingSelected: false,
      queueWriteApplied: false,
      closureApplied: false,
      finalReviewSnapshotPersistenceApplied: false,
    }),
  ]),
});

const readinessSummarySurface = buildScanOpsRetryResultFinalReviewReadinessSummarySurface(finalReviewSnapshotSurface, {
  now: () => fixedNow,
});

assert(readinessSummarySurface.phase === '22', 'Phase 22 readiness summary must declare phase 22');
assert(readinessSummarySurface.component === 'scanops_bridge_retry_result_final_review_readiness_summary_surface', 'Phase 22 must expose the expected component id');
assert(readinessSummarySurface.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_STATUSES.READY, 'Phase 22 must be ready for Phase 21 snapshot items');
assert(readinessSummarySurface.consumesPhase21FinalReviewSnapshotSurface === true, 'Phase 22 must consume Phase 21 final review snapshot surface');
assert(readinessSummarySurface.readinessSummaryMode === 'LOCAL_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_ONLY', 'Phase 22 must be local summary only');
assert(readinessSummarySurface.localSummaryOnly === true && readinessSummarySurface.displayOnly === true, 'Phase 22 must be display-only');
assert(readinessSummarySurface.closureApplicationAllowed === false && readinessSummarySurface.closureApplied === false, 'Phase 22 must not apply closure');
assert(readinessSummarySurface.finalReviewReadinessSummaryPersistenceAllowed === false && readinessSummarySurface.finalReviewReadinessSummaryPersistenceApplied === false, 'Phase 22 must not persist readiness summaries');
assert(readinessSummarySurface.queueWriteAllowed === false && readinessSummarySurface.queueWriteApplied === false, 'Phase 22 must not write queue state');
assert(readinessSummarySurface.retryApplied === false && readinessSummarySurface.secondRetryApplied === false && readinessSummarySurface.automaticSecondRetryEnabled === false, 'Phase 22 must not apply retry or second retry');
assert(readinessSummarySurface.backgroundRetryEnabled === false, 'Phase 22 must not enable background retry');
assert(readinessSummarySurface.inventoryMutationAttempted === false, 'Phase 22 must not mutate Inventory truth');
assert(readinessSummarySurface.stockMutationAttempted === false && readinessSummarySurface.priceMutationAttempted === false && readinessSummarySurface.ledgerMutationAttempted === false && readinessSummarySurface.approvalMutationAttempted === false, 'Phase 22 must not mutate stock, price, ledger, or approvals');
assert(readinessSummarySurface.readinessSummaryItemCount === 4, 'Phase 22 must expose one summary item per Phase 21 snapshot item');
assert(readinessSummarySurface.readyLaterCount === 1, 'Phase 22 must count ready-later items');
assert(readinessSummarySurface.keepOpenCount === 1, 'Phase 22 must count keep-open items');
assert(readinessSummarySurface.acknowledgementPendingCount === 1, 'Phase 22 must count acknowledgement-pending items');
assert(readinessSummarySurface.finalReviewPendingCount === 1, 'Phase 22 must count final-review-pending items');
assert(readinessSummarySurface.allReadyForFutureScopedClosure === false, 'Phase 22 must not mark all-ready while items are open or pending');
assert(readinessSummarySurface.displayOnlyCount === 4, 'Phase 22 summary items must remain display-only');
assert(Object.isFrozen(readinessSummarySurface.readinessSummaryItems), 'Phase 22 readiness summary items array must be immutable');
assert(readinessSummarySurface.readinessSummaryItems.some((item) => item.readinessStatus === 'Ready for later scoped closure consideration'), 'Phase 22 must describe ready-later state');
assert(readinessSummarySurface.readinessSummaryItems.some((item) => item.readinessStatus === 'Keep review open'), 'Phase 22 must describe keep-open state');
assert(readinessSummarySurface.readinessSummaryItems.some((item) => item.readinessStatus === 'Acknowledgement pending'), 'Phase 22 must describe acknowledgement-pending state');
assert(readinessSummarySurface.readinessSummaryItems.some((item) => item.readinessStatus === 'Final review pending'), 'Phase 22 must describe final-review-pending state');

const allReadySurface = buildScanOpsRetryResultFinalReviewReadinessSummarySurface({
  finalReviewSnapshotItems: finalReviewSnapshotSurface.finalReviewSnapshotItems.map((item) => Object.freeze({
    ...item,
    closureIntentSelected: true,
    readyForFutureClosureSelected: true,
    keepReviewOpenSelected: false,
    acknowledgementStillPendingSelected: false,
  })),
}, { now: () => fixedNow });
assert(allReadySurface.allReadyForFutureScopedClosure === true, 'Phase 22 may mark all-ready only when every item is ready-later');
assert(allReadySurface.closureApplied === false && allReadySurface.queueWriteApplied === false, 'All-ready summary must still not apply closure or queue writes');

const emptySummary = buildScanOpsRetryResultFinalReviewReadinessSummarySurface({ finalReviewSnapshotItems: [] }, { now: () => fixedNow });
assert(emptySummary.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_STATUSES.EMPTY, 'Phase 22 must expose empty status when there are no snapshot items');

const blockedApplySummary = buildScanOpsRetryResultFinalReviewReadinessSummarySurface(finalReviewSnapshotSurface, { applySummary: true, now: () => fixedNow });
assert(blockedApplySummary.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_STATUSES.BLOCKED, 'Phase 22 must block summary application');
assert(blockedApplySummary.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_BLOCKERS.SUMMARY_APPLICATION_BLOCKED), 'Phase 22 must report the summary application blocker');

const blockedClosure = buildScanOpsRetryResultFinalReviewReadinessSummarySurface(finalReviewSnapshotSurface, { applyClosure: true, now: () => fixedNow });
assert(blockedClosure.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_BLOCKERS.CLOSURE_APPLICATION_BLOCKED), 'Phase 22 must block closure application');

const blockedPersistence = buildScanOpsRetryResultFinalReviewReadinessSummarySurface(finalReviewSnapshotSurface, { persistSummary: true, now: () => fixedNow });
assert(blockedPersistence.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_BLOCKERS.PERSISTENCE_BLOCKED), 'Phase 22 must block persistence');

const blockedRetry = buildScanOpsRetryResultFinalReviewReadinessSummarySurface(finalReviewSnapshotSurface, { executeRetry: true, now: () => fixedNow });
assert(blockedRetry.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_BLOCKERS.SECOND_RETRY_BLOCKED), 'Phase 22 must block second retry execution');

const blockedQueueWrite = buildScanOpsRetryResultFinalReviewReadinessSummarySurface(finalReviewSnapshotSurface, { applyQueueWrites: true, now: () => fixedNow });
assert(blockedQueueWrite.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_BLOCKERS.QUEUE_WRITE_BLOCKED), 'Phase 22 must block queue writes');

const packageFile = read('package.json');
const moduleFile = read('src/inventory-bridge/retryResultFinalReviewReadinessSummary/index.js');
const componentFile = read('src/components/scanner/RetryResultFinalReviewReadinessSummarySurface.jsx');

assert(componentFile.includes('buildScanOpsRetryResultFinalReviewReadinessSummarySurface'), 'Phase 22 UI component must build the readiness summary surface');
assert(componentFile.includes('Retry Result Final Review Readiness Summary Surface'), 'Phase 22 UI component must expose readiness summary copy');
assert(componentFile.includes('Readiness summary only for final review state'), 'Phase 22 UI component must state the summary boundary');
assert(componentFile.includes('No closure is applied, persisted, written to the queue, retried, or sent to Inventory.'), 'Phase 22 UI component must state Phase 22 guardrails');
assert(packageFile.includes('validate:scanops-bridge-retry-result-final-review-readiness-summary-surface'), 'package scripts must register Phase 22 validation');

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
  assert(!forbidden.pattern.test(moduleFile), `Phase 22 readiness summary surface must not contain ${forbidden.label}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 22 retry result final review readiness summary surface validates display-only readiness summaries, no closure application, no persistence, no queue writes, no second retry/background replay, and no Inventory/stock/price/ledger/approval mutation.');
