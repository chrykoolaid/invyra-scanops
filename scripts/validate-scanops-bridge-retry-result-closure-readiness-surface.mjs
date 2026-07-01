import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_BLOCKERS,
  SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_STATUSES,
  buildScanOpsRetryResultClosureReadinessSurface,
} from '../src/inventory-bridge/retryResultClosureReadiness/index.js';

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

const acknowledgementSummarySurface = Object.freeze({
  phase: '17',
  component: 'scanops_bridge_retry_result_acknowledgement_summary_surface',
  status: 'RETRY_RESULT_ACKNOWLEDGEMENT_SUMMARY_READY',
  summaryItems: Object.freeze([
    Object.freeze({
      summaryItemId: 'retry-result-ack-summary:retry-result-review:item-1:receipt-1',
      acknowledgementIntentId: 'retry-result-acknowledgement:retry-result-review:item-1:receipt-1',
      retryResultReviewId: 'retry-result-review:item-1:receipt-1',
      queueItemId: 'item-1',
      bridgeReceiptId: 'receipt-1',
      classification: 'RETRY_ACCEPTED',
      outcomeLabel: 'Retry accepted',
      selectedDescriptor: 'Acknowledge retry result',
      acknowledgementSelected: true,
      queueWriteApplied: false,
      summaryPersistenceApplied: false,
    }),
    Object.freeze({
      summaryItemId: 'retry-result-ack-summary:retry-result-review:item-2:receipt-2',
      acknowledgementIntentId: 'retry-result-acknowledgement:retry-result-review:item-2:receipt-2',
      retryResultReviewId: 'retry-result-review:item-2:receipt-2',
      queueItemId: 'item-2',
      bridgeReceiptId: 'receipt-2',
      classification: 'RETRY_SERVICE_UNAVAILABLE',
      outcomeLabel: 'Retry service unavailable',
      selectedDescriptor: 'Keep visible',
      acknowledgementSelected: true,
      queueWriteApplied: false,
      summaryPersistenceApplied: false,
    }),
    Object.freeze({
      summaryItemId: 'retry-result-ack-summary:retry-result-review:item-3:receipt-3',
      acknowledgementIntentId: 'retry-result-acknowledgement:retry-result-review:item-3:receipt-3',
      retryResultReviewId: 'retry-result-review:item-3:receipt-3',
      queueItemId: 'item-3',
      bridgeReceiptId: 'receipt-3',
      classification: 'RETRY_TRANSPORT_ERROR',
      outcomeLabel: 'Retry transport error',
      selectedDescriptor: null,
      acknowledgementSelected: false,
      queueWriteApplied: false,
      summaryPersistenceApplied: false,
    }),
  ]),
});

const readinessSurface = buildScanOpsRetryResultClosureReadinessSurface(acknowledgementSummarySurface, {
  now: () => fixedNow,
});

assert(readinessSurface.phase === '18', 'Phase 18 closure readiness surface must declare phase 18');
assert(readinessSurface.component === 'scanops_bridge_retry_result_closure_readiness_surface', 'Phase 18 closure readiness surface must expose the expected component id');
assert(readinessSurface.status === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_STATUSES.READY, 'Phase 18 closure readiness surface must be ready for acknowledgement summaries');
assert(readinessSurface.consumesPhase17AcknowledgementSummarySurface === true, 'Phase 18 must consume the Phase 17 acknowledgement summary surface');
assert(readinessSurface.readinessMode === 'LOCAL_RETRY_RESULT_REVIEW_CLOSURE_READINESS_ONLY', 'Phase 18 readiness must be local closure readiness only');
assert(readinessSurface.localReadinessOnly === true && readinessSurface.displayOnly === true, 'Phase 18 readiness must be display-only local readiness');
assert(readinessSurface.closureApplicationAllowed === false && readinessSurface.closureApplied === false, 'Phase 18 readiness must not apply closure');
assert(readinessSurface.closurePersistenceAllowed === false && readinessSurface.closurePersistenceApplied === false, 'Phase 18 readiness must not persist closure readiness');
assert(readinessSurface.queueWriteAllowed === false && readinessSurface.queueWriteApplied === false, 'Phase 18 readiness must not write queue state');
assert(readinessSurface.retryApplied === false && readinessSurface.secondRetryApplied === false && readinessSurface.automaticSecondRetryEnabled === false, 'Phase 18 readiness must not apply retry or second retry');
assert(readinessSurface.backgroundRetryEnabled === false, 'Phase 18 readiness must not enable background retry');
assert(readinessSurface.inventoryMutationAttempted === false, 'Phase 18 readiness must not mutate Inventory truth');
assert(readinessSurface.stockMutationAttempted === false && readinessSurface.priceMutationAttempted === false && readinessSurface.ledgerMutationAttempted === false && readinessSurface.approvalMutationAttempted === false, 'Phase 18 readiness must not mutate stock, price, ledger, or approvals');
assert(readinessSurface.readinessItemCount === 3, 'Phase 18 readiness must expose one readiness item per acknowledgement summary');
assert(readinessSurface.closureReadyCount === 2, 'Phase 18 readiness must count acknowledgement-covered items');
assert(readinessSurface.closurePendingCount === 1, 'Phase 18 readiness must count pending acknowledgement items');
assert(readinessSurface.futureScopedClosureReady === false, 'Phase 18 readiness must not mark future scoped closure ready while acknowledgement is pending');
assert(readinessSurface.displayOnlyCount === 3, 'Phase 18 readiness items must remain display-only');
assert(Object.isFrozen(readinessSurface.readinessItems), 'Phase 18 readiness items array must be immutable');
assert(readinessSurface.readinessItems.some((item) => item.closureReadinessStatus === 'Closure-ready locally'), 'Phase 18 readiness must describe local closure-ready state');
assert(readinessSurface.readinessItems.some((item) => item.closureReadinessStatus === 'Pending acknowledgement before closure readiness'), 'Phase 18 readiness must describe pending acknowledgement state');

const allCoveredSurface = buildScanOpsRetryResultClosureReadinessSurface({
  summaryItems: acknowledgementSummarySurface.summaryItems.map((item) => Object.freeze({
    ...item,
    acknowledgementSelected: true,
  })),
}, { now: () => fixedNow });
assert(allCoveredSurface.futureScopedClosureReady === true, 'Phase 18 readiness may mark future scoped closure ready only when all items have acknowledgement coverage');
assert(allCoveredSurface.closurePendingCount === 0, 'Phase 18 readiness must have no pending items when all acknowledgements are covered');
assert(allCoveredSurface.closureApplied === false && allCoveredSurface.queueWriteApplied === false, 'Future scoped closure readiness must still not apply closure or queue writes');

const emptyReadiness = buildScanOpsRetryResultClosureReadinessSurface({ summaryItems: [] }, { now: () => fixedNow });
assert(emptyReadiness.status === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_STATUSES.EMPTY, 'Phase 18 must expose empty status when there are no summary items');

const blockedApplyClosure = buildScanOpsRetryResultClosureReadinessSurface(acknowledgementSummarySurface, { applyClosure: true, now: () => fixedNow });
assert(blockedApplyClosure.status === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_STATUSES.BLOCKED, 'Phase 18 must block closure application');
assert(blockedApplyClosure.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_BLOCKERS.CLOSURE_APPLICATION_BLOCKED), 'Phase 18 must report the closure application blocker');

const blockedPersistence = buildScanOpsRetryResultClosureReadinessSurface(acknowledgementSummarySurface, { persistClosure: true, now: () => fixedNow });
assert(blockedPersistence.status === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_STATUSES.BLOCKED, 'Phase 18 must block closure readiness persistence');
assert(blockedPersistence.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_BLOCKERS.PERSISTENCE_BLOCKED), 'Phase 18 must report the closure persistence blocker');

const blockedSecondRetry = buildScanOpsRetryResultClosureReadinessSurface(acknowledgementSummarySurface, { executeRetry: true, now: () => fixedNow });
assert(blockedSecondRetry.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_BLOCKERS.SECOND_RETRY_BLOCKED), 'Phase 18 must block second retry execution');

const blockedQueueWrite = buildScanOpsRetryResultClosureReadinessSurface(acknowledgementSummarySurface, { applyQueueWrites: true, now: () => fixedNow });
assert(blockedQueueWrite.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_READINESS_BLOCKERS.QUEUE_WRITE_BLOCKED), 'Phase 18 must block queue writes');

const componentFile = read('src/components/scanner/ReceiptDecisionIntentSurface.jsx');
const packageFile = read('package.json');
const moduleFile = read('src/inventory-bridge/retryResultClosureReadiness/index.js');

assert(componentFile.includes('buildScanOpsRetryResultClosureReadinessSurface'), 'Manual retry UI must build the Phase 18 retry result closure readiness surface');
assert(componentFile.includes('retryResultClosureReadinessSurface'), 'Manual retry UI must keep the Phase 18 closure readiness derived from summary state');
assert(componentFile.includes('Retry Result Review Closure Readiness Surface'), 'Manual retry UI must expose Phase 18 closure readiness copy');
assert(componentFile.includes('Readiness only for future scoped closure'), 'Manual retry UI must state the Phase 18 readiness boundary');
assert(componentFile.includes('No closure is applied, persisted, written to the queue, retried, or sent to Inventory.'), 'Manual retry UI must state Phase 18 guardrails');
assert(packageFile.includes('validate:scanops-bridge-retry-result-closure-readiness-surface'), 'package scripts must register Phase 18 validation');

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
  assert(!forbidden.pattern.test(moduleFile), `Phase 18 closure readiness surface must not contain ${forbidden.label}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 18 retry result closure readiness surface validates display-only closure readiness coverage, no closure application, no persistence, no queue writes, no second retry/background replay, and no Inventory/stock/price/ledger/approval mutation.');
