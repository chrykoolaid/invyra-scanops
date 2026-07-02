import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_BLOCKERS,
  SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_DESCRIPTORS,
  SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_STATUSES,
  buildScanOpsRetryResultFinalReviewReadinessOutcomeSurface,
} from '../src/inventory-bridge/retryResultFinalReviewReadinessOutcome/index.js';

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

const readinessSummarySurface = Object.freeze({
  phase: '22',
  component: 'scanops_bridge_retry_result_final_review_readiness_summary_surface',
  status: 'RETRY_RESULT_FINAL_REVIEW_READINESS_SUMMARY_READY',
  readinessSummaryItems: Object.freeze([
    Object.freeze({
      finalReviewReadinessSummaryItemId: 'summary:item-1',
      finalReviewSnapshotItemId: 'snapshot:item-1',
      retryResultReviewId: 'retry-result-review:item-1',
      queueItemId: 'item-1',
      selectedDescriptor: 'Ready for future closure',
      readyForFutureClosureSelected: true,
      keepReviewOpenSelected: false,
      acknowledgementStillPendingSelected: false,
      closureIntentSelected: true,
      queueWriteApplied: false,
      closureApplied: false,
      finalReviewReadinessSummaryPersistenceApplied: false,
    }),
    Object.freeze({
      finalReviewReadinessSummaryItemId: 'summary:item-2',
      finalReviewSnapshotItemId: 'snapshot:item-2',
      retryResultReviewId: 'retry-result-review:item-2',
      queueItemId: 'item-2',
      selectedDescriptor: 'Keep review open',
      readyForFutureClosureSelected: false,
      keepReviewOpenSelected: true,
      acknowledgementStillPendingSelected: false,
      closureIntentSelected: true,
      queueWriteApplied: false,
      closureApplied: false,
      finalReviewReadinessSummaryPersistenceApplied: false,
    }),
    Object.freeze({
      finalReviewReadinessSummaryItemId: 'summary:item-3',
      finalReviewSnapshotItemId: 'snapshot:item-3',
      retryResultReviewId: 'retry-result-review:item-3',
      queueItemId: 'item-3',
      selectedDescriptor: 'Acknowledgement still pending',
      readyForFutureClosureSelected: false,
      keepReviewOpenSelected: false,
      acknowledgementStillPendingSelected: true,
      closureIntentSelected: true,
      queueWriteApplied: false,
      closureApplied: false,
      finalReviewReadinessSummaryPersistenceApplied: false,
    }),
    Object.freeze({
      finalReviewReadinessSummaryItemId: 'summary:item-4',
      finalReviewSnapshotItemId: 'snapshot:item-4',
      retryResultReviewId: 'retry-result-review:item-4',
      queueItemId: 'item-4',
      selectedDescriptor: null,
      readyForFutureClosureSelected: false,
      keepReviewOpenSelected: false,
      acknowledgementStillPendingSelected: false,
      closureIntentSelected: false,
      queueWriteApplied: false,
      closureApplied: false,
      finalReviewReadinessSummaryPersistenceApplied: false,
    }),
  ]),
});

const outcomeSurface = buildScanOpsRetryResultFinalReviewReadinessOutcomeSurface(readinessSummarySurface, {
  now: () => fixedNow,
});

assert(outcomeSurface.phase === '23', 'Phase 23 readiness outcome must declare phase 23');
assert(outcomeSurface.component === 'scanops_bridge_retry_result_final_review_readiness_outcome_descriptor_surface', 'Phase 23 must expose the expected component id');
assert(outcomeSurface.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_STATUSES.READY, 'Phase 23 must be ready for Phase 22 summary items');
assert(outcomeSurface.consumesPhase22FinalReviewReadinessSummarySurface === true, 'Phase 23 must consume Phase 22 readiness summary surface');
assert(outcomeSurface.outcomeMode === 'LOCAL_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_DESCRIPTOR_ONLY', 'Phase 23 must be descriptor-only');
assert(outcomeSurface.localOutcomeOnly === true && outcomeSurface.descriptorOnly === true && outcomeSurface.displayOnly === true, 'Phase 23 must be display-only local outcome descriptors');
assert(outcomeSurface.closureApplicationAllowed === false && outcomeSurface.closureApplied === false, 'Phase 23 must not apply closure');
assert(outcomeSurface.finalReviewReadinessOutcomePersistenceAllowed === false && outcomeSurface.finalReviewReadinessOutcomePersistenceApplied === false, 'Phase 23 must not persist outcomes');
assert(outcomeSurface.queueWriteAllowed === false && outcomeSurface.queueWriteApplied === false, 'Phase 23 must not write queue state');
assert(outcomeSurface.retryApplied === false && outcomeSurface.secondRetryApplied === false && outcomeSurface.automaticSecondRetryEnabled === false, 'Phase 23 must not apply retry or second retry');
assert(outcomeSurface.backgroundRetryEnabled === false, 'Phase 23 must not enable background retry');
assert(outcomeSurface.inventoryMutationAttempted === false, 'Phase 23 must not mutate Inventory truth');
assert(outcomeSurface.stockMutationAttempted === false && outcomeSurface.priceMutationAttempted === false && outcomeSurface.ledgerMutationAttempted === false && outcomeSurface.approvalMutationAttempted === false, 'Phase 23 must not mutate stock, price, ledger, or approvals');
assert(outcomeSurface.outcomeItemCount === 4, 'Phase 23 must expose one outcome item per Phase 22 summary item');
assert(outcomeSurface.readyForLaterClosureReviewCount === 1, 'Phase 23 must count ready-later outcomes');
assert(outcomeSurface.keepReviewOpenCount === 1, 'Phase 23 must count keep-open outcomes');
assert(outcomeSurface.acknowledgementResolutionRequiredCount === 1, 'Phase 23 must count acknowledgement-first outcomes');
assert(outcomeSurface.finalReviewPendingCount === 1, 'Phase 23 must count final-review-pending outcomes');
assert(outcomeSurface.displayOnlyCount === 4, 'Phase 23 outcome items must remain display-only');
assert(Object.isFrozen(outcomeSurface.outcomeItems), 'Phase 23 outcome items array must be immutable');
assert(outcomeSurface.outcomeItems.some((item) => item.outcomeDescriptor === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_DESCRIPTORS.READY_FOR_LATER_CLOSURE_REVIEW), 'Phase 23 must describe ready-later outcome');
assert(outcomeSurface.outcomeItems.some((item) => item.outcomeDescriptor === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_DESCRIPTORS.KEEP_REVIEW_OPEN), 'Phase 23 must describe keep-open outcome');
assert(outcomeSurface.outcomeItems.some((item) => item.outcomeDescriptor === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_DESCRIPTORS.RESOLVE_ACKNOWLEDGEMENT_FIRST), 'Phase 23 must describe acknowledgement-first outcome');
assert(outcomeSurface.outcomeItems.some((item) => item.outcomeDescriptor === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_DESCRIPTORS.FINAL_REVIEW_PENDING), 'Phase 23 must describe final-review-pending outcome');

const emptyOutcome = buildScanOpsRetryResultFinalReviewReadinessOutcomeSurface({ readinessSummaryItems: [] }, { now: () => fixedNow });
assert(emptyOutcome.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_STATUSES.EMPTY, 'Phase 23 must expose empty status when there are no summary items');

const blockedOutcome = buildScanOpsRetryResultFinalReviewReadinessOutcomeSurface(readinessSummarySurface, { applyOutcome: true, now: () => fixedNow });
assert(blockedOutcome.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_STATUSES.BLOCKED, 'Phase 23 must block outcome application');
assert(blockedOutcome.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_BLOCKERS.OUTCOME_APPLICATION_BLOCKED), 'Phase 23 must report the outcome application blocker');

const blockedClosure = buildScanOpsRetryResultFinalReviewReadinessOutcomeSurface(readinessSummarySurface, { applyClosure: true, now: () => fixedNow });
assert(blockedClosure.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_BLOCKERS.CLOSURE_APPLICATION_BLOCKED), 'Phase 23 must block closure application');

const blockedPersistence = buildScanOpsRetryResultFinalReviewReadinessOutcomeSurface(readinessSummarySurface, { persistOutcome: true, now: () => fixedNow });
assert(blockedPersistence.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_BLOCKERS.PERSISTENCE_BLOCKED), 'Phase 23 must block persistence');

const blockedRetry = buildScanOpsRetryResultFinalReviewReadinessOutcomeSurface(readinessSummarySurface, { executeRetry: true, now: () => fixedNow });
assert(blockedRetry.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_BLOCKERS.SECOND_RETRY_BLOCKED), 'Phase 23 must block second retry execution');

const blockedQueueWrite = buildScanOpsRetryResultFinalReviewReadinessOutcomeSurface(readinessSummarySurface, { applyQueueWrites: true, now: () => fixedNow });
assert(blockedQueueWrite.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_BLOCKERS.QUEUE_WRITE_BLOCKED), 'Phase 23 must block queue writes');

const packageFile = read('package.json');
const moduleFile = read('src/inventory-bridge/retryResultFinalReviewReadinessOutcome/index.js');
const componentFile = read('src/components/scanner/RetryResultFinalReviewReadinessOutcomeSurface.jsx');

assert(componentFile.includes('buildScanOpsRetryResultFinalReviewReadinessOutcomeSurface'), 'Phase 23 UI component must build the outcome surface');
assert(componentFile.includes('Retry Result Final Review Readiness Outcome Descriptor Surface'), 'Phase 23 UI component must expose outcome copy');
assert(componentFile.includes('Outcome descriptors only for final review readiness'), 'Phase 23 UI component must state the descriptor boundary');
assert(componentFile.includes('No closure is applied, persisted, written to the queue, retried, or sent to Inventory.'), 'Phase 23 UI component must state Phase 23 guardrails');
assert(packageFile.includes('validate:scanops-bridge-retry-result-final-review-readiness-outcome-surface'), 'package scripts must register Phase 23 validation');

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
  assert(!forbidden.pattern.test(moduleFile), `Phase 23 readiness outcome surface must not contain ${forbidden.label}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 23 retry result final review readiness outcome descriptor surface validates display-only outcome descriptors, no closure application, no persistence, no queue writes, no second retry/background replay, and no Inventory/stock/price/ledger/approval mutation.');
