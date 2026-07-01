import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_BLOCKERS,
  SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_DESCRIPTORS,
  SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_STATUSES,
  buildScanOpsRetryResultClosureIntentSurface,
} from '../src/inventory-bridge/retryResultClosureIntent/index.js';

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

const closureReadinessSurface = Object.freeze({
  phase: '18',
  component: 'scanops_bridge_retry_result_closure_readiness_surface',
  status: 'RETRY_RESULT_CLOSURE_READINESS_READY',
  readinessItems: Object.freeze([
    Object.freeze({
      readinessItemId: 'retry-result-closure-readiness:retry-result-ack-summary:item-1',
      summaryItemId: 'retry-result-ack-summary:item-1',
      acknowledgementIntentId: 'retry-result-acknowledgement:item-1',
      retryResultReviewId: 'retry-result-review:item-1',
      queueItemId: 'item-1',
      bridgeReceiptId: 'receipt-1',
      classification: 'RETRY_ACCEPTED',
      outcomeLabel: 'Retry accepted',
      acknowledgementCoverageReady: true,
      closureReadinessStatus: 'Closure-ready locally',
      queueWriteApplied: false,
      closureApplied: false,
      closurePersistenceApplied: false,
    }),
    Object.freeze({
      readinessItemId: 'retry-result-closure-readiness:retry-result-ack-summary:item-2',
      summaryItemId: 'retry-result-ack-summary:item-2',
      acknowledgementIntentId: 'retry-result-acknowledgement:item-2',
      retryResultReviewId: 'retry-result-review:item-2',
      queueItemId: 'item-2',
      bridgeReceiptId: 'receipt-2',
      classification: 'RETRY_SERVICE_UNAVAILABLE',
      outcomeLabel: 'Retry service unavailable',
      acknowledgementCoverageReady: false,
      closureReadinessStatus: 'Pending acknowledgement before closure readiness',
      queueWriteApplied: false,
      closureApplied: false,
      closurePersistenceApplied: false,
    }),
  ]),
});

const selectedClosureIntentsByReadinessItemId = Object.freeze({
  'retry-result-closure-readiness:retry-result-ack-summary:item-1': Object.freeze({
    descriptor: SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_DESCRIPTORS.READY_FOR_FUTURE_CLOSURE,
    selectedAt: fixedNow,
    selectedBy: 'operator',
  }),
  'retry-result-closure-readiness:retry-result-ack-summary:item-2': Object.freeze({
    descriptor: SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_DESCRIPTORS.ACKNOWLEDGEMENT_STILL_PENDING,
    selectedAt: fixedNow,
    selectedBy: 'operator',
  }),
});

const intentSurface = buildScanOpsRetryResultClosureIntentSurface(closureReadinessSurface, {
  selectedClosureIntentsByReadinessItemId,
  now: () => fixedNow,
});

assert(intentSurface.phase === '19', 'Phase 19 closure intent surface must declare phase 19');
assert(intentSurface.component === 'scanops_bridge_retry_result_closure_intent_descriptor_surface', 'Phase 19 closure intent surface must expose the expected component id');
assert(intentSurface.status === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_STATUSES.READY, 'Phase 19 closure intent surface must be ready for closure readiness items');
assert(intentSurface.consumesPhase18ClosureReadinessSurface === true, 'Phase 19 must consume the Phase 18 closure readiness surface');
assert(intentSurface.intentMode === 'LOCAL_RETRY_RESULT_CLOSURE_INTENT_DESCRIPTOR_ONLY', 'Phase 19 intent must be local descriptor only');
assert(intentSurface.localIntentOnly === true && intentSurface.descriptorOnly === true && intentSurface.displayOnly === true, 'Phase 19 intent must be display-only local descriptors');
assert(intentSurface.closureApplicationAllowed === false && intentSurface.closureApplied === false, 'Phase 19 intent must not apply closure');
assert(intentSurface.closureIntentPersistenceAllowed === false && intentSurface.closureIntentPersistenceApplied === false, 'Phase 19 intent must not persist closure intent');
assert(intentSurface.queueWriteAllowed === false && intentSurface.queueWriteApplied === false, 'Phase 19 intent must not write queue state');
assert(intentSurface.retryApplied === false && intentSurface.secondRetryApplied === false && intentSurface.automaticSecondRetryEnabled === false, 'Phase 19 intent must not apply retry or second retry');
assert(intentSurface.backgroundRetryEnabled === false, 'Phase 19 intent must not enable background retry');
assert(intentSurface.inventoryMutationAttempted === false, 'Phase 19 intent must not mutate Inventory truth');
assert(intentSurface.stockMutationAttempted === false && intentSurface.priceMutationAttempted === false && intentSurface.ledgerMutationAttempted === false && intentSurface.approvalMutationAttempted === false, 'Phase 19 intent must not mutate stock, price, ledger, or approvals');
assert(intentSurface.closureIntentItemCount === 2, 'Phase 19 intent must expose one closure intent item per readiness item');
assert(intentSurface.selectedClosureIntentCount === 2, 'Phase 19 intent must count selected closure descriptors');
assert(intentSurface.readyForFutureClosureIntentCount === 1, 'Phase 19 intent must count ready-for-future-closure descriptors');
assert(intentSurface.keepReviewOpenIntentCount === 0, 'Phase 19 intent must count keep-review-open descriptors');
assert(intentSurface.acknowledgementStillPendingIntentCount === 1, 'Phase 19 intent must count acknowledgement-still-pending descriptors');
assert(intentSurface.descriptorOnlyCount === 2, 'Phase 19 intent items must remain descriptor-only');
assert(Object.isFrozen(intentSurface.closureIntentItems), 'Phase 19 closure intent items array must be immutable');
assert(intentSurface.closureIntentItems[0].availableClosureIntentDescriptors.includes(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_DESCRIPTORS.READY_FOR_FUTURE_CLOSURE), 'Closure-ready items must expose ready-for-future-closure descriptor');
assert(intentSurface.closureIntentItems[0].availableClosureIntentDescriptors.includes(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_DESCRIPTORS.KEEP_REVIEW_OPEN), 'Closure-ready items must expose keep-review-open descriptor');
assert(intentSurface.closureIntentItems[1].availableClosureIntentDescriptors.includes(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_DESCRIPTORS.ACKNOWLEDGEMENT_STILL_PENDING), 'Pending items must expose acknowledgement-still-pending descriptor');
assert(intentSurface.closureIntentItems[1].availableClosureIntentDescriptors.includes(SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_DESCRIPTORS.KEEP_REVIEW_OPEN), 'Pending items must expose keep-review-open descriptor');

const keepOpenSurface = buildScanOpsRetryResultClosureIntentSurface(closureReadinessSurface, {
  selectedClosureIntentsByReadinessItemId: Object.freeze({
    'retry-result-closure-readiness:retry-result-ack-summary:item-1': Object.freeze({ descriptor: SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_DESCRIPTORS.KEEP_REVIEW_OPEN }),
  }),
  now: () => fixedNow,
});
assert(keepOpenSurface.keepReviewOpenIntentCount === 1, 'Phase 19 intent must count keep-review-open selections');
assert(keepOpenSurface.closureApplied === false && keepOpenSurface.queueWriteApplied === false, 'Keep-review-open selection must not apply closure or queue writes');

const emptyIntent = buildScanOpsRetryResultClosureIntentSurface({ readinessItems: [] }, { now: () => fixedNow });
assert(emptyIntent.status === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_STATUSES.EMPTY, 'Phase 19 must expose empty status when there are no readiness items');

const blockedApplyClosure = buildScanOpsRetryResultClosureIntentSurface(closureReadinessSurface, { applyClosure: true, now: () => fixedNow });
assert(blockedApplyClosure.status === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_STATUSES.BLOCKED, 'Phase 19 must block closure application');
assert(blockedApplyClosure.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_BLOCKERS.CLOSURE_APPLICATION_BLOCKED), 'Phase 19 must report the closure application blocker');

const blockedPersistence = buildScanOpsRetryResultClosureIntentSurface(closureReadinessSurface, { persistClosureIntent: true, now: () => fixedNow });
assert(blockedPersistence.status === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_STATUSES.BLOCKED, 'Phase 19 must block closure intent persistence');
assert(blockedPersistence.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_BLOCKERS.PERSISTENCE_BLOCKED), 'Phase 19 must report the closure intent persistence blocker');

const blockedSecondRetry = buildScanOpsRetryResultClosureIntentSurface(closureReadinessSurface, { executeRetry: true, now: () => fixedNow });
assert(blockedSecondRetry.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_BLOCKERS.SECOND_RETRY_BLOCKED), 'Phase 19 must block second retry execution');

const blockedQueueWrite = buildScanOpsRetryResultClosureIntentSurface(closureReadinessSurface, { applyQueueWrites: true, now: () => fixedNow });
assert(blockedQueueWrite.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_CLOSURE_INTENT_BLOCKERS.QUEUE_WRITE_BLOCKED), 'Phase 19 must block queue writes');

const componentFile = read('src/components/scanner/ReceiptDecisionIntentSurface.jsx');
const packageFile = read('package.json');
const moduleFile = read('src/inventory-bridge/retryResultClosureIntent/index.js');

assert(componentFile.includes('buildScanOpsRetryResultClosureIntentSurface'), 'Manual retry UI must build the Phase 19 retry result closure intent surface');
assert(componentFile.includes('retryResultClosureIntentSurface'), 'Manual retry UI must keep the Phase 19 closure intent derived from readiness state');
assert(componentFile.includes('Retry Result Closure Intent Descriptor Surface'), 'Manual retry UI must expose Phase 19 closure intent copy');
assert(componentFile.includes('Local descriptor intent only'), 'Manual retry UI must state the Phase 19 descriptor boundary');
assert(componentFile.includes('No closure is applied, persisted, written to the queue, retried, or sent to Inventory.'), 'Manual retry UI must state Phase 19 guardrails');
assert(componentFile.includes('Ready for future closure'), 'Manual retry UI must expose the ready-for-future-closure descriptor through boundary-driven rendering');
assert(componentFile.includes('Keep review open'), 'Manual retry UI must expose the keep-review-open descriptor through boundary-driven rendering');
assert(componentFile.includes('Acknowledgement still pending'), 'Manual retry UI must expose the acknowledgement-still-pending descriptor through boundary-driven rendering');
assert(packageFile.includes('validate:scanops-bridge-retry-result-closure-intent-surface'), 'package scripts must register Phase 19 validation');

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
  assert(!forbidden.pattern.test(moduleFile), `Phase 19 closure intent surface must not contain ${forbidden.label}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 19 retry result closure intent descriptor surface validates local descriptor-only closure intent, no closure application, no persistence, no queue writes, no second retry/background replay, and no Inventory/stock/price/ledger/approval mutation.');
