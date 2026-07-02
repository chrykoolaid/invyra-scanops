import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_BLOCKERS,
  SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_STATUSES,
  buildScanOpsRetryResultFinalReviewSnapshotSurface,
} from '../src/inventory-bridge/retryResultFinalReviewSnapshot/index.js';

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

const phase20SummarySurface = Object.freeze({
  phase: '20',
  component: 'scanops_bridge_retry_result_closure_intent_summary_surface',
  status: 'RETRY_RESULT_CLOSURE_INTENT_SUMMARY_READY',
  closureIntentSummaryItems: Object.freeze([
    Object.freeze({
      closureIntentSummaryId: 'summary:item-1',
      closureIntentId: 'intent:item-1',
      retryResultReviewId: 'retry-result-review:item-1',
      queueItemId: 'item-1',
      classification: 'RETRY_ACCEPTED',
      outcomeLabel: 'Retry accepted',
      selectedDescriptor: 'Ready for future closure',
      closureIntentSelected: true,
      readyForFutureClosureSelected: true,
      keepReviewOpenSelected: false,
      acknowledgementStillPendingSelected: false,
      queueWriteApplied: false,
      closureApplied: false,
      closureIntentSummaryPersistenceApplied: false,
    }),
    Object.freeze({
      closureIntentSummaryId: 'summary:item-2',
      closureIntentId: 'intent:item-2',
      retryResultReviewId: 'retry-result-review:item-2',
      queueItemId: 'item-2',
      classification: 'RETRY_SERVICE_UNAVAILABLE',
      outcomeLabel: 'Retry service unavailable',
      selectedDescriptor: 'Keep review open',
      closureIntentSelected: true,
      readyForFutureClosureSelected: false,
      keepReviewOpenSelected: true,
      acknowledgementStillPendingSelected: false,
      queueWriteApplied: false,
      closureApplied: false,
      closureIntentSummaryPersistenceApplied: false,
    }),
    Object.freeze({
      closureIntentSummaryId: 'summary:item-3',
      closureIntentId: 'intent:item-3',
      retryResultReviewId: 'retry-result-review:item-3',
      queueItemId: 'item-3',
      classification: 'RETRY_TRANSPORT_ERROR',
      outcomeLabel: 'Retry transport error',
      selectedDescriptor: 'Acknowledgement still pending',
      closureIntentSelected: true,
      readyForFutureClosureSelected: false,
      keepReviewOpenSelected: false,
      acknowledgementStillPendingSelected: true,
      queueWriteApplied: false,
      closureApplied: false,
      closureIntentSummaryPersistenceApplied: false,
    }),
    Object.freeze({
      closureIntentSummaryId: 'summary:item-4',
      closureIntentId: 'intent:item-4',
      retryResultReviewId: 'retry-result-review:item-4',
      queueItemId: 'item-4',
      classification: 'RETRY_REJECTED',
      outcomeLabel: 'Retry rejected',
      selectedDescriptor: null,
      closureIntentSelected: false,
      readyForFutureClosureSelected: false,
      keepReviewOpenSelected: false,
      acknowledgementStillPendingSelected: false,
      queueWriteApplied: false,
      closureApplied: false,
      closureIntentSummaryPersistenceApplied: false,
    }),
  ]),
});

const snapshotSurface = buildScanOpsRetryResultFinalReviewSnapshotSurface(phase20SummarySurface, {
  now: () => fixedNow,
});

assert(snapshotSurface.phase === '21', 'Phase 21 final review snapshot must declare phase 21');
assert(snapshotSurface.component === 'scanops_bridge_retry_result_final_review_snapshot_surface', 'Phase 21 must expose the expected component id');
assert(snapshotSurface.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_STATUSES.READY, 'Phase 21 must be ready for Phase 20 summary items');
assert(snapshotSurface.consumesPhase20ClosureIntentSummarySurface === true, 'Phase 21 must consume the Phase 20 summary surface');
assert(snapshotSurface.snapshotMode === 'LOCAL_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_ONLY', 'Phase 21 must be local snapshot only');
assert(snapshotSurface.localSnapshotOnly === true && snapshotSurface.displayOnly === true, 'Phase 21 must be display-only');
assert(snapshotSurface.closureApplicationAllowed === false && snapshotSurface.closureApplied === false, 'Phase 21 must not apply closure');
assert(snapshotSurface.finalReviewSnapshotPersistenceAllowed === false && snapshotSurface.finalReviewSnapshotPersistenceApplied === false, 'Phase 21 must not persist final review snapshots');
assert(snapshotSurface.queueWriteAllowed === false && snapshotSurface.queueWriteApplied === false, 'Phase 21 must not write queue state');
assert(snapshotSurface.retryApplied === false && snapshotSurface.secondRetryApplied === false && snapshotSurface.automaticSecondRetryEnabled === false, 'Phase 21 must not apply retry or second retry');
assert(snapshotSurface.backgroundRetryEnabled === false, 'Phase 21 must not enable background retry');
assert(snapshotSurface.inventoryMutationAttempted === false, 'Phase 21 must not mutate Inventory truth');
assert(snapshotSurface.stockMutationAttempted === false && snapshotSurface.priceMutationAttempted === false && snapshotSurface.ledgerMutationAttempted === false && snapshotSurface.approvalMutationAttempted === false, 'Phase 21 must not mutate stock, price, ledger, or approvals');
assert(snapshotSurface.finalReviewSnapshotItemCount === 4, 'Phase 21 must expose one snapshot item per Phase 20 summary item');
assert(snapshotSurface.selectedFinalReviewCount === 3, 'Phase 21 must count selected final review items');
assert(snapshotSurface.readyForFutureClosureReviewCount === 1, 'Phase 21 must count ready-for-future-closure review items');
assert(snapshotSurface.keepReviewOpenCount === 1, 'Phase 21 must count keep-open items');
assert(snapshotSurface.acknowledgementStillPendingCount === 1, 'Phase 21 must count pending acknowledgement items');
assert(snapshotSurface.finalReviewPendingCount === 1, 'Phase 21 must count final review pending items');
assert(snapshotSurface.futureScopedClosureConsiderationReady === false, 'Phase 21 must not mark future consideration ready while items are open or pending');
assert(snapshotSurface.displayOnlyCount === 4, 'Phase 21 snapshot items must remain display-only');
assert(Object.isFrozen(snapshotSurface.finalReviewSnapshotItems), 'Phase 21 snapshot items array must be immutable');
assert(snapshotSurface.finalReviewSnapshotItems.some((item) => item.finalReviewStatus === 'Ready for future scoped closure review'), 'Phase 21 must describe ready-later state');
assert(snapshotSurface.finalReviewSnapshotItems.some((item) => item.finalReviewStatus === 'Review kept open locally'), 'Phase 21 must describe keep-open state');
assert(snapshotSurface.finalReviewSnapshotItems.some((item) => item.finalReviewStatus === 'Acknowledgement still pending locally'), 'Phase 21 must describe acknowledgement-pending state');
assert(snapshotSurface.finalReviewSnapshotItems.some((item) => item.finalReviewStatus === 'Final review selection pending'), 'Phase 21 must describe pending final review state');

const allReadySurface = buildScanOpsRetryResultFinalReviewSnapshotSurface({
  closureIntentSummaryItems: phase20SummarySurface.closureIntentSummaryItems.map((item) => Object.freeze({
    ...item,
    closureIntentSelected: true,
    readyForFutureClosureSelected: true,
    keepReviewOpenSelected: false,
    acknowledgementStillPendingSelected: false,
  })),
}, { now: () => fixedNow });
assert(allReadySurface.futureScopedClosureConsiderationReady === true, 'Phase 21 may mark future consideration ready only when all items are ready-later');
assert(allReadySurface.closureApplied === false && allReadySurface.queueWriteApplied === false, 'Future consideration readiness must still not apply closure or queue writes');

const emptySnapshot = buildScanOpsRetryResultFinalReviewSnapshotSurface({ closureIntentSummaryItems: [] }, { now: () => fixedNow });
assert(emptySnapshot.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_STATUSES.EMPTY, 'Phase 21 must expose empty status when there are no summary items');

const blockedSnapshot = buildScanOpsRetryResultFinalReviewSnapshotSurface(phase20SummarySurface, { applySnapshot: true, now: () => fixedNow });
assert(blockedSnapshot.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_STATUSES.BLOCKED, 'Phase 21 must block snapshot application');
assert(blockedSnapshot.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_BLOCKERS.SNAPSHOT_APPLICATION_BLOCKED), 'Phase 21 must report the snapshot application blocker');

const blockedClosure = buildScanOpsRetryResultFinalReviewSnapshotSurface(phase20SummarySurface, { applyClosure: true, now: () => fixedNow });
assert(blockedClosure.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_BLOCKERS.CLOSURE_APPLICATION_BLOCKED), 'Phase 21 must block closure application');

const blockedPersistence = buildScanOpsRetryResultFinalReviewSnapshotSurface(phase20SummarySurface, { persistFinalReviewSnapshot: true, now: () => fixedNow });
assert(blockedPersistence.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_BLOCKERS.PERSISTENCE_BLOCKED), 'Phase 21 must block persistence');

const blockedRetry = buildScanOpsRetryResultFinalReviewSnapshotSurface(phase20SummarySurface, { executeRetry: true, now: () => fixedNow });
assert(blockedRetry.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_BLOCKERS.SECOND_RETRY_BLOCKED), 'Phase 21 must block second retry execution');

const blockedQueueWrite = buildScanOpsRetryResultFinalReviewSnapshotSurface(phase20SummarySurface, { applyQueueWrites: true, now: () => fixedNow });
assert(blockedQueueWrite.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_SNAPSHOT_BLOCKERS.QUEUE_WRITE_BLOCKED), 'Phase 21 must block queue writes');

const componentFile = read('src/components/scanner/ReceiptDecisionIntentSurface.jsx');
const packageFile = read('package.json');
const moduleFile = read('src/inventory-bridge/retryResultFinalReviewSnapshot/index.js');

assert(componentFile.includes('buildScanOpsRetryResultFinalReviewSnapshotSurface'), 'Manual retry UI must build the Phase 21 final review snapshot surface');
assert(componentFile.includes('retryResultFinalReviewSnapshotSurface'), 'Manual retry UI must keep Phase 21 derived from Phase 20 state');
assert(componentFile.includes('Retry Result Final Review Snapshot Surface'), 'Manual retry UI must expose Phase 21 copy');
assert(componentFile.includes('Final review snapshot only'), 'Manual retry UI must state the Phase 21 boundary');
assert(componentFile.includes('No closure is applied, persisted, written to the queue, retried, or sent to Inventory.'), 'Manual retry UI must state Phase 21 guardrails');
assert(packageFile.includes('validate:scanops-bridge-retry-result-final-review-snapshot-surface'), 'package scripts must register Phase 21 validation');

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
  assert(!forbidden.pattern.test(moduleFile), `Phase 21 final review snapshot surface must not contain ${forbidden.label}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 21 retry result final review snapshot surface validates display-only final review snapshots, no closure application, no persistence, no queue writes, no second retry/background replay, and no Inventory/stock/price/ledger/approval mutation.');
