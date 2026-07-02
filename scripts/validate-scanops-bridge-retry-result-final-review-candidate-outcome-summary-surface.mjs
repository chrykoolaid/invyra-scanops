import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_BLOCKERS,
  SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_STATUSES,
  buildScanOpsRetryResultFinalReviewCandidateOutcomeSummarySurface,
} from '../src/inventory-bridge/retryResultFinalReviewCandidateOutcomeSummary/index.js';

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
  phase: '26',
  component: 'scanops_bridge_retry_result_final_review_closure_candidate_outcome_surface',
  status: 'RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_READY',
  closureCandidateOutcomeItems: Object.freeze([
    Object.freeze({ finalReviewClosureCandidateOutcomeId: 'outcome:item-1', queueItemId: 'item-1', readyForLaterClosureReview: true, keepReviewOpenBeforeClosure: false, acknowledgementResolutionBeforeClosure: false, finalReviewBeforeClosure: false, queueWriteApplied: false, closureApplied: false, outcomePersistenceApplied: false }),
    Object.freeze({ finalReviewClosureCandidateOutcomeId: 'outcome:item-2', queueItemId: 'item-2', readyForLaterClosureReview: false, keepReviewOpenBeforeClosure: true, acknowledgementResolutionBeforeClosure: false, finalReviewBeforeClosure: false, queueWriteApplied: false, closureApplied: false, outcomePersistenceApplied: false }),
    Object.freeze({ finalReviewClosureCandidateOutcomeId: 'outcome:item-3', queueItemId: 'item-3', readyForLaterClosureReview: false, keepReviewOpenBeforeClosure: false, acknowledgementResolutionBeforeClosure: true, finalReviewBeforeClosure: false, queueWriteApplied: false, closureApplied: false, outcomePersistenceApplied: false }),
    Object.freeze({ finalReviewClosureCandidateOutcomeId: 'outcome:item-4', queueItemId: 'item-4', readyForLaterClosureReview: false, keepReviewOpenBeforeClosure: false, acknowledgementResolutionBeforeClosure: false, finalReviewBeforeClosure: true, queueWriteApplied: false, closureApplied: false, outcomePersistenceApplied: false }),
  ]),
});

const summarySurface = buildScanOpsRetryResultFinalReviewCandidateOutcomeSummarySurface(outcomeSurface, { now: () => fixedNow });

assert(summarySurface.phase === '27', 'Phase 27 candidate outcome summary must declare phase 27');
assert(summarySurface.component === 'scanops_bridge_retry_result_final_review_candidate_outcome_summary_surface', 'Phase 27 must expose the expected component id');
assert(summarySurface.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_STATUSES.READY, 'Phase 27 must be ready for Phase 26 outcome items');
assert(summarySurface.consumesPhase26FinalReviewCandidateOutcomeSurface === true, 'Phase 27 must consume Phase 26 outcome surface');
assert(summarySurface.summaryMode === 'LOCAL_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_ONLY', 'Phase 27 must be local summary only');
assert(summarySurface.localSummaryOnly === true && summarySurface.displayOnly === true, 'Phase 27 must be display-only');
assert(summarySurface.closureApplicationAllowed === false && summarySurface.closureApplied === false, 'Phase 27 must not apply closure');
assert(summarySurface.summaryPersistenceAllowed === false && summarySurface.summaryPersistenceApplied === false, 'Phase 27 must not persist summaries');
assert(summarySurface.queueWriteAllowed === false && summarySurface.queueWriteApplied === false, 'Phase 27 must not write queue state');
assert(summarySurface.retryApplied === false && summarySurface.secondRetryApplied === false && summarySurface.automaticSecondRetryEnabled === false, 'Phase 27 must not apply retry or second retry');
assert(summarySurface.backgroundRetryEnabled === false, 'Phase 27 must not enable background retry');
assert(summarySurface.inventoryMutationAttempted === false, 'Phase 27 must not mutate Inventory truth');
assert(summarySurface.stockMutationAttempted === false && summarySurface.priceMutationAttempted === false && summarySurface.ledgerMutationAttempted === false && summarySurface.approvalMutationAttempted === false, 'Phase 27 must not mutate stock, price, ledger, or approvals');
assert(summarySurface.candidateOutcomeSummaryItemCount === 4, 'Phase 27 must expose one summary item per Phase 26 outcome item');
assert(summarySurface.readyLaterSummaryCount === 1, 'Phase 27 must count ready-later summaries');
assert(summarySurface.keepOpenSummaryCount === 1, 'Phase 27 must count keep-open summaries');
assert(summarySurface.acknowledgementFirstSummaryCount === 1, 'Phase 27 must count acknowledgement-first summaries');
assert(summarySurface.finalReviewFirstSummaryCount === 1, 'Phase 27 must count final-review-first summaries');
assert(summarySurface.displayOnlyCount === 4, 'Phase 27 summary items must remain display-only');
assert(Object.isFrozen(summarySurface.candidateOutcomeSummaryItems), 'Phase 27 summary items array must be immutable');
assert(summarySurface.candidateOutcomeSummaryItems.some((item) => item.summaryStatus === 'Ready-later outcome summarized locally'), 'Phase 27 must summarize ready-later state');
assert(summarySurface.candidateOutcomeSummaryItems.some((item) => item.summaryStatus === 'Keep-open-before-closure outcome summarized locally'), 'Phase 27 must summarize keep-open state');
assert(summarySurface.candidateOutcomeSummaryItems.some((item) => item.summaryStatus === 'Acknowledgement-before-closure outcome summarized locally'), 'Phase 27 must summarize acknowledgement-first state');
assert(summarySurface.candidateOutcomeSummaryItems.some((item) => item.summaryStatus === 'Final-review-before-closure outcome summarized locally'), 'Phase 27 must summarize final-review-first state');

const validEmptyPhase26Outcome = Object.freeze({
  phase: '26',
  component: 'scanops_bridge_retry_result_final_review_closure_candidate_outcome_surface',
  status: 'RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_EMPTY',
  closureCandidateOutcomeItems: Object.freeze([]),
});
const emptySummary = buildScanOpsRetryResultFinalReviewCandidateOutcomeSummarySurface(validEmptyPhase26Outcome, { now: () => fixedNow });
assert(emptySummary.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_STATUSES.EMPTY, 'Phase 27 must expose empty status only for a valid empty Phase 26 outcome surface');

const missingSummary = buildScanOpsRetryResultFinalReviewCandidateOutcomeSummarySurface(undefined, { now: () => fixedNow });
assert(missingSummary.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_STATUSES.BLOCKED, 'Phase 27 must block missing Phase 26 outcome input');
assert(missingSummary.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_BLOCKERS.OUTCOME_SURFACE_REQUIRED), 'Phase 27 must report missing Phase 26 outcome blocker');

const uninitializedSummary = buildScanOpsRetryResultFinalReviewCandidateOutcomeSummarySurface({}, { now: () => fixedNow });
assert(uninitializedSummary.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_STATUSES.BLOCKED, 'Phase 27 must block uninitialized outcome objects');
assert(uninitializedSummary.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_BLOCKERS.OUTCOME_SURFACE_REQUIRED), 'Phase 27 must not treat {} as valid empty input');

const wrongComponentSummary = buildScanOpsRetryResultFinalReviewCandidateOutcomeSummarySurface({ phase: '26', component: 'wrong', closureCandidateOutcomeItems: [] }, { now: () => fixedNow });
assert(wrongComponentSummary.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_STATUSES.BLOCKED, 'Phase 27 must block non-Phase 26 outcome-shaped inputs');

const blockedApplySummary = buildScanOpsRetryResultFinalReviewCandidateOutcomeSummarySurface(outcomeSurface, { applySummary: true, now: () => fixedNow });
assert(blockedApplySummary.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_STATUSES.BLOCKED, 'Phase 27 must block summary application');
assert(blockedApplySummary.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_BLOCKERS.SUMMARY_APPLICATION_BLOCKED), 'Phase 27 must report summary application blocker');

const blockedClosure = buildScanOpsRetryResultFinalReviewCandidateOutcomeSummarySurface(outcomeSurface, { applyClosure: true, now: () => fixedNow });
assert(blockedClosure.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_BLOCKERS.CLOSURE_APPLICATION_BLOCKED), 'Phase 27 must block closure application');

const blockedPersistence = buildScanOpsRetryResultFinalReviewCandidateOutcomeSummarySurface(outcomeSurface, { persistSummary: true, now: () => fixedNow });
assert(blockedPersistence.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_BLOCKERS.PERSISTENCE_BLOCKED), 'Phase 27 must block persistence');

const blockedRetry = buildScanOpsRetryResultFinalReviewCandidateOutcomeSummarySurface(outcomeSurface, { executeRetry: true, now: () => fixedNow });
assert(blockedRetry.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_BLOCKERS.SECOND_RETRY_BLOCKED), 'Phase 27 must block retry execution');

const blockedQueueWrite = buildScanOpsRetryResultFinalReviewCandidateOutcomeSummarySurface(outcomeSurface, { applyQueueWrites: true, now: () => fixedNow });
assert(blockedQueueWrite.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_BLOCKERS.QUEUE_WRITE_BLOCKED), 'Phase 27 must block queue writes');

const moduleFile = read('src/inventory-bridge/retryResultFinalReviewCandidateOutcomeSummary/index.js');
const componentFile = read('src/components/scanner/RetryResultFinalReviewCandidateOutcomeSummarySurface.jsx');

assert(componentFile.includes('buildScanOpsRetryResultFinalReviewCandidateOutcomeSummarySurface'), 'Phase 27 UI component must build the summary surface');
assert(componentFile.includes('Retry Result Final Review Candidate Outcome Summary Surface'), 'Phase 27 UI component must expose summary copy');
assert(componentFile.includes('Candidate outcome summary only'), 'Phase 27 UI component must state the summary boundary');
assert(componentFile.includes('No application, persistence, queue write, retry, or Inventory mutation is allowed.'), 'Phase 27 UI component must state guardrails');
assert(moduleFile.includes('isValidPhase26'), 'Phase 27 module must require an initialized Phase 26 outcome surface');
assert(moduleFile.includes('scanops_bridge_retry_result_final_review_closure_candidate_outcome_surface'), 'Phase 27 module must require the Phase 26 component id');

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
  assert(!forbidden.pattern.test(moduleFile), `Phase 27 candidate outcome summary surface must not contain ${forbidden.label}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 27 retry result final review candidate outcome summary surface validates required Phase 26 outcome input, display-only summaries, no closure application, no persistence, no queue writes, no second retry/background replay, and no Inventory/stock/price/ledger/approval mutation.');
