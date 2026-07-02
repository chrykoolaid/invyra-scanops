import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_BLOCKERS,
  SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_STATUSES,
  buildScanOpsRetryResultFinalReviewReadinessOutcomeSummarySurface,
} from '../src/inventory-bridge/retryResultFinalReviewReadinessOutcomeSummary/index.js';

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

const outcomeSurface = Object.freeze({
  phase: '23',
  component: 'scanops_bridge_retry_result_final_review_readiness_outcome_descriptor_surface',
  status: 'RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_READY',
  outcomeItems: Object.freeze([
    Object.freeze({
      finalReviewReadinessOutcomeId: 'outcome:item-1',
      finalReviewReadinessSummaryItemId: 'summary:item-1',
      retryResultReviewId: 'retry-result-review:item-1',
      queueItemId: 'item-1',
      outcomeDescriptor: 'Ready for later closure review',
      readyForLaterClosureReview: true,
      keepReviewOpen: false,
      acknowledgementResolutionRequired: false,
      finalReviewPending: false,
      queueWriteApplied: false,
      closureApplied: false,
      finalReviewReadinessOutcomePersistenceApplied: false,
    }),
    Object.freeze({
      finalReviewReadinessOutcomeId: 'outcome:item-2',
      finalReviewReadinessSummaryItemId: 'summary:item-2',
      retryResultReviewId: 'retry-result-review:item-2',
      queueItemId: 'item-2',
      outcomeDescriptor: 'Keep review open',
      readyForLaterClosureReview: false,
      keepReviewOpen: true,
      acknowledgementResolutionRequired: false,
      finalReviewPending: false,
      queueWriteApplied: false,
      closureApplied: false,
      finalReviewReadinessOutcomePersistenceApplied: false,
    }),
    Object.freeze({
      finalReviewReadinessOutcomeId: 'outcome:item-3',
      finalReviewReadinessSummaryItemId: 'summary:item-3',
      retryResultReviewId: 'retry-result-review:item-3',
      queueItemId: 'item-3',
      outcomeDescriptor: 'Resolve acknowledgement first',
      readyForLaterClosureReview: false,
      keepReviewOpen: false,
      acknowledgementResolutionRequired: true,
      finalReviewPending: false,
      queueWriteApplied: false,
      closureApplied: false,
      finalReviewReadinessOutcomePersistenceApplied: false,
    }),
    Object.freeze({
      finalReviewReadinessOutcomeId: 'outcome:item-4',
      finalReviewReadinessSummaryItemId: 'summary:item-4',
      retryResultReviewId: 'retry-result-review:item-4',
      queueItemId: 'item-4',
      outcomeDescriptor: 'Final review pending',
      readyForLaterClosureReview: false,
      keepReviewOpen: false,
      acknowledgementResolutionRequired: false,
      finalReviewPending: true,
      queueWriteApplied: false,
      closureApplied: false,
      finalReviewReadinessOutcomePersistenceApplied: false,
    }),
  ]),
});

const summarySurface = buildScanOpsRetryResultFinalReviewReadinessOutcomeSummarySurface(outcomeSurface, {
  now: () => fixedNow,
});

assert(summarySurface.phase === '24', 'Phase 24 outcome summary must declare phase 24');
assert(summarySurface.component === 'scanops_bridge_retry_result_final_review_readiness_outcome_summary_surface', 'Phase 24 must expose the expected component id');
assert(summarySurface.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_STATUSES.READY, 'Phase 24 must be ready for Phase 23 outcome items');
assert(summarySurface.consumesPhase23FinalReviewReadinessOutcomeSurface === true, 'Phase 24 must consume Phase 23 outcome surface');
assert(summarySurface.outcomeSummaryMode === 'LOCAL_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_ONLY', 'Phase 24 must be local summary only');
assert(summarySurface.localSummaryOnly === true && summarySurface.displayOnly === true, 'Phase 24 must be display-only');
assert(summarySurface.closureApplicationAllowed === false && summarySurface.closureApplied === false, 'Phase 24 must not apply closure');
assert(summarySurface.finalReviewReadinessOutcomeSummaryPersistenceAllowed === false && summarySurface.finalReviewReadinessOutcomeSummaryPersistenceApplied === false, 'Phase 24 must not persist summaries');
assert(summarySurface.queueWriteAllowed === false && summarySurface.queueWriteApplied === false, 'Phase 24 must not write queue state');
assert(summarySurface.retryApplied === false && summarySurface.secondRetryApplied === false && summarySurface.automaticSecondRetryEnabled === false, 'Phase 24 must not apply retry or second retry');
assert(summarySurface.backgroundRetryEnabled === false, 'Phase 24 must not enable background retry');
assert(summarySurface.inventoryMutationAttempted === false, 'Phase 24 must not mutate Inventory truth');
assert(summarySurface.stockMutationAttempted === false && summarySurface.priceMutationAttempted === false && summarySurface.ledgerMutationAttempted === false && summarySurface.approvalMutationAttempted === false, 'Phase 24 must not mutate stock, price, ledger, or approvals');
assert(summarySurface.outcomeSummaryItemCount === 4, 'Phase 24 must expose one summary item per Phase 23 outcome item');
assert(summarySurface.readyLaterSummaryCount === 1, 'Phase 24 must count ready-later summaries');
assert(summarySurface.keepOpenSummaryCount === 1, 'Phase 24 must count keep-open summaries');
assert(summarySurface.acknowledgementFirstSummaryCount === 1, 'Phase 24 must count acknowledgement-first summaries');
assert(summarySurface.finalReviewPendingSummaryCount === 1, 'Phase 24 must count final-review-pending summaries');
assert(summarySurface.displayOnlyCount === 4, 'Phase 24 summary items must remain display-only');
assert(Object.isFrozen(summarySurface.outcomeSummaryItems), 'Phase 24 outcome summary items array must be immutable');
assert(summarySurface.outcomeSummaryItems.some((item) => item.summaryStatus === 'Ready later outcome summarized locally'), 'Phase 24 must summarize ready-later state');
assert(summarySurface.outcomeSummaryItems.some((item) => item.summaryStatus === 'Keep-open outcome summarized locally'), 'Phase 24 must summarize keep-open state');
assert(summarySurface.outcomeSummaryItems.some((item) => item.summaryStatus === 'Acknowledgement-first outcome summarized locally'), 'Phase 24 must summarize acknowledgement-first state');
assert(summarySurface.outcomeSummaryItems.some((item) => item.summaryStatus === 'Final-review-pending outcome summarized locally'), 'Phase 24 must summarize final-review-pending state');

const emptySummary = buildScanOpsRetryResultFinalReviewReadinessOutcomeSummarySurface({ outcomeItems: [] }, { now: () => fixedNow });
assert(emptySummary.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_STATUSES.EMPTY, 'Phase 24 must expose empty status when there are no outcome items');

const blockedApplySummary = buildScanOpsRetryResultFinalReviewReadinessOutcomeSummarySurface(outcomeSurface, { applySummary: true, now: () => fixedNow });
assert(blockedApplySummary.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_STATUSES.BLOCKED, 'Phase 24 must block summary application');
assert(blockedApplySummary.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_BLOCKERS.SUMMARY_APPLICATION_BLOCKED), 'Phase 24 must report summary application blocker');

const blockedClosure = buildScanOpsRetryResultFinalReviewReadinessOutcomeSummarySurface(outcomeSurface, { applyClosure: true, now: () => fixedNow });
assert(blockedClosure.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_BLOCKERS.CLOSURE_APPLICATION_BLOCKED), 'Phase 24 must block closure application');

const blockedPersistence = buildScanOpsRetryResultFinalReviewReadinessOutcomeSummarySurface(outcomeSurface, { persistSummary: true, now: () => fixedNow });
assert(blockedPersistence.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_BLOCKERS.PERSISTENCE_BLOCKED), 'Phase 24 must block persistence');

const blockedRetry = buildScanOpsRetryResultFinalReviewReadinessOutcomeSummarySurface(outcomeSurface, { executeRetry: true, now: () => fixedNow });
assert(blockedRetry.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_BLOCKERS.SECOND_RETRY_BLOCKED), 'Phase 24 must block second retry execution');

const blockedQueueWrite = buildScanOpsRetryResultFinalReviewReadinessOutcomeSummarySurface(outcomeSurface, { applyQueueWrites: true, now: () => fixedNow });
assert(blockedQueueWrite.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_BLOCKERS.QUEUE_WRITE_BLOCKED), 'Phase 24 must block queue writes');

const moduleFile = read('src/inventory-bridge/retryResultFinalReviewReadinessOutcomeSummary/index.js');
const componentFile = read('src/components/scanner/RetryResultFinalReviewReadinessOutcomeSummarySurface.jsx');

assert(componentFile.includes('buildScanOpsRetryResultFinalReviewReadinessOutcomeSummarySurface'), 'Phase 24 UI component must build the summary surface');
assert(componentFile.includes('Retry Result Final Review Readiness Outcome Summary Surface'), 'Phase 24 UI component must expose summary copy');
assert(componentFile.includes('Outcome summary only for final review readiness descriptors'), 'Phase 24 UI component must state the summary boundary');
assert(componentFile.includes('No closure is applied, persisted, written to the queue, retried, or sent to Inventory.'), 'Phase 24 UI component must state Phase 24 guardrails');

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
  assert(!forbidden.pattern.test(moduleFile), `Phase 24 outcome summary surface must not contain ${forbidden.label}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 24 retry result final review readiness outcome summary surface validates display-only outcome summaries, no closure application, no persistence, no queue writes, no second retry/background replay, and no Inventory/stock/price/ledger/approval mutation.');
