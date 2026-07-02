import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_BLOCKERS,
  SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_STATUSES,
  buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSummarySurface,
} from '../src/inventory-bridge/retryResultFinalReviewCandidateSnapshotReadinessOutcomeSummary/index.js';

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
  phase: '30',
  component: 'scanops_bridge_retry_result_final_review_candidate_snapshot_readiness_outcome_surface',
  status: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_READY',
  snapshotReadinessOutcomeItems: Object.freeze([
    Object.freeze({ candidateSnapshotReadinessOutcomeId: 'outcome:item-1', queueItemId: 'item-1', readyForLaterClosureReview: true, keepReviewOpenBeforeClosure: false, acknowledgementResolutionBeforeClosure: false, finalReviewBeforeClosure: false, queueWriteApplied: false, closureApplied: false, outcomePersistenceApplied: false }),
    Object.freeze({ candidateSnapshotReadinessOutcomeId: 'outcome:item-2', queueItemId: 'item-2', readyForLaterClosureReview: false, keepReviewOpenBeforeClosure: true, acknowledgementResolutionBeforeClosure: false, finalReviewBeforeClosure: false, queueWriteApplied: false, closureApplied: false, outcomePersistenceApplied: false }),
    Object.freeze({ candidateSnapshotReadinessOutcomeId: 'outcome:item-3', queueItemId: 'item-3', readyForLaterClosureReview: false, keepReviewOpenBeforeClosure: false, acknowledgementResolutionBeforeClosure: true, finalReviewBeforeClosure: false, queueWriteApplied: false, closureApplied: false, outcomePersistenceApplied: false }),
    Object.freeze({ candidateSnapshotReadinessOutcomeId: 'outcome:item-4', queueItemId: 'item-4', readyForLaterClosureReview: false, keepReviewOpenBeforeClosure: false, acknowledgementResolutionBeforeClosure: false, finalReviewBeforeClosure: true, queueWriteApplied: false, closureApplied: false, outcomePersistenceApplied: false }),
  ]),
});

const summarySurface = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSummarySurface(outcomeSurface, { now: () => fixedNow });

assert(summarySurface.phase === '31', 'Phase 31 outcome summary must declare phase 31');
assert(summarySurface.component === 'scanops_bridge_retry_result_final_review_candidate_snapshot_readiness_outcome_summary_surface', 'Phase 31 must expose the expected component id');
assert(summarySurface.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_STATUSES.READY, 'Phase 31 must be ready for Phase 30 outcome items');
assert(summarySurface.consumesPhase30CandidateSnapshotReadinessOutcomeSurface === true, 'Phase 31 must consume Phase 30 outcome surface');
assert(summarySurface.summaryMode === 'LOCAL_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_ONLY', 'Phase 31 must be local summary only');
assert(summarySurface.localSummaryOnly === true && summarySurface.displayOnly === true, 'Phase 31 must be display-only');
assert(summarySurface.closureApplicationAllowed === false && summarySurface.closureApplied === false, 'Phase 31 must not apply closure');
assert(summarySurface.summaryPersistenceAllowed === false && summarySurface.summaryPersistenceApplied === false, 'Phase 31 must not persist summaries');
assert(summarySurface.queueWriteAllowed === false && summarySurface.queueWriteApplied === false, 'Phase 31 must not write queue state');
assert(summarySurface.retryApplied === false && summarySurface.secondRetryApplied === false && summarySurface.automaticSecondRetryEnabled === false, 'Phase 31 must not apply retry or second retry');
assert(summarySurface.backgroundRetryEnabled === false, 'Phase 31 must not enable background retry');
assert(summarySurface.inventoryMutationAttempted === false, 'Phase 31 must not mutate Inventory truth');
assert(summarySurface.stockMutationAttempted === false && summarySurface.priceMutationAttempted === false && summarySurface.ledgerMutationAttempted === false && summarySurface.approvalMutationAttempted === false, 'Phase 31 must not mutate stock, price, ledger, or approvals');
assert(summarySurface.snapshotReadinessOutcomeSummaryItemCount === 4, 'Phase 31 must expose one summary item per Phase 30 outcome item');
assert(summarySurface.readyLaterSummaryCount === 1, 'Phase 31 must count ready-later summaries');
assert(summarySurface.keepOpenSummaryCount === 1, 'Phase 31 must count keep-open summaries');
assert(summarySurface.acknowledgementFirstSummaryCount === 1, 'Phase 31 must count acknowledgement-first summaries');
assert(summarySurface.finalReviewFirstSummaryCount === 1, 'Phase 31 must count final-review-first summaries');
assert(summarySurface.allReadyLaterSummary === false, 'Phase 31 must not mark all-ready while blockers remain');
assert(summarySurface.displayOnlyCount === 4, 'Phase 31 summary items must remain display-only');
assert(Object.isFrozen(summarySurface.snapshotReadinessOutcomeSummaryItems), 'Phase 31 summary items array must be immutable');
assert(summarySurface.snapshotReadinessOutcomeSummaryItems.some((item) => item.summaryStatus === 'Ready-later outcome summarized'), 'Phase 31 must summarize ready-later state');
assert(summarySurface.snapshotReadinessOutcomeSummaryItems.some((item) => item.summaryStatus === 'Keep-open outcome summarized'), 'Phase 31 must summarize keep-open state');
assert(summarySurface.snapshotReadinessOutcomeSummaryItems.some((item) => item.summaryStatus === 'Acknowledgement-first outcome summarized'), 'Phase 31 must summarize acknowledgement-first state');
assert(summarySurface.snapshotReadinessOutcomeSummaryItems.some((item) => item.summaryStatus === 'Final-review-first outcome summarized'), 'Phase 31 must summarize final-review-first state');

const allReadySurface = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSummarySurface({
  phase: '30',
  component: 'scanops_bridge_retry_result_final_review_candidate_snapshot_readiness_outcome_surface',
  snapshotReadinessOutcomeItems: outcomeSurface.snapshotReadinessOutcomeItems.map((item) => Object.freeze({ ...item, readyForLaterClosureReview: true, keepReviewOpenBeforeClosure: false, acknowledgementResolutionBeforeClosure: false, finalReviewBeforeClosure: false })),
}, { now: () => fixedNow });
assert(allReadySurface.allReadyLaterSummary === true, 'Phase 31 may mark all-ready only when every summary item is ready-later');
assert(allReadySurface.closureApplied === false && allReadySurface.queueWriteApplied === false, 'All-ready Phase 31 summary must still not close or queue-write');

const validEmptyPhase30Outcome = Object.freeze({ phase: '30', component: 'scanops_bridge_retry_result_final_review_candidate_snapshot_readiness_outcome_surface', status: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_EMPTY', snapshotReadinessOutcomeItems: Object.freeze([]) });
const emptySummary = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSummarySurface(validEmptyPhase30Outcome, { now: () => fixedNow });
assert(emptySummary.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_STATUSES.EMPTY, 'Phase 31 must expose empty status only for a valid empty Phase 30 outcome surface');

const missingSummary = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSummarySurface(undefined, { now: () => fixedNow });
assert(missingSummary.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_STATUSES.BLOCKED, 'Phase 31 must block missing Phase 30 outcome input');
assert(missingSummary.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_BLOCKERS.OUTCOME_SURFACE_REQUIRED), 'Phase 31 must report missing Phase 30 outcome blocker');

const uninitializedSummary = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSummarySurface({}, { now: () => fixedNow });
assert(uninitializedSummary.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_STATUSES.BLOCKED, 'Phase 31 must block uninitialized outcome objects');
assert(uninitializedSummary.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_BLOCKERS.OUTCOME_SURFACE_REQUIRED), 'Phase 31 must not treat {} as valid empty input');

const wrongComponentSummary = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSummarySurface({ phase: '30', component: 'wrong', snapshotReadinessOutcomeItems: [] }, { now: () => fixedNow });
assert(wrongComponentSummary.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_STATUSES.BLOCKED, 'Phase 31 must block non-Phase 30 outcome-shaped inputs');

const blockedApplySummary = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSummarySurface(outcomeSurface, { applySummary: true, now: () => fixedNow });
assert(blockedApplySummary.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_STATUSES.BLOCKED, 'Phase 31 must block summary application');
assert(blockedApplySummary.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_BLOCKERS.SUMMARY_APPLICATION_BLOCKED), 'Phase 31 must report summary application blocker');

const blockedClosure = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSummarySurface(outcomeSurface, { applyClosure: true, now: () => fixedNow });
assert(blockedClosure.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_BLOCKERS.CLOSURE_APPLICATION_BLOCKED), 'Phase 31 must block closure application');

const blockedPersistence = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSummarySurface(outcomeSurface, { persistSummary: true, now: () => fixedNow });
assert(blockedPersistence.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_BLOCKERS.PERSISTENCE_BLOCKED), 'Phase 31 must block persistence');

const blockedRetry = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSummarySurface(outcomeSurface, { executeRetry: true, now: () => fixedNow });
assert(blockedRetry.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_BLOCKERS.SECOND_RETRY_BLOCKED), 'Phase 31 must block retry execution');

const blockedQueueWrite = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSummarySurface(outcomeSurface, { applyQueueWrites: true, now: () => fixedNow });
assert(blockedQueueWrite.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_BLOCKERS.QUEUE_WRITE_BLOCKED), 'Phase 31 must block queue writes');

const moduleFile = read('src/inventory-bridge/retryResultFinalReviewCandidateSnapshotReadinessOutcomeSummary/index.js');
const componentFile = read('src/components/scanner/RetryResultFinalReviewCandidateSnapshotReadinessOutcomeSummarySurface.jsx');

assert(componentFile.includes('buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSummarySurface'), 'Phase 31 UI component must build the summary surface');
assert(componentFile.includes('Retry Result Final Review Candidate Snapshot Readiness Outcome Summary Surface'), 'Phase 31 UI component must expose summary copy');
assert(componentFile.includes('Snapshot readiness outcome summary only'), 'Phase 31 UI component must state the summary boundary');
assert(componentFile.includes('No application, persistence, queue write, retry, or Inventory mutation is allowed.'), 'Phase 31 UI component must state guardrails');
assert(moduleFile.includes('isValidPhase30'), 'Phase 31 module must require an initialized Phase 30 outcome surface');
assert(moduleFile.includes('scanops_bridge_retry_result_final_review_candidate_snapshot_readiness_outcome_surface'), 'Phase 31 module must require the Phase 30 component id');

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
  assert(!forbidden.pattern.test(moduleFile), `Phase 31 snapshot readiness outcome summary surface must not contain ${forbidden.label}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 31 retry result final review candidate snapshot readiness outcome summary surface validates required Phase 30 outcome input, display-only outcome summaries, no closure application, no persistence, no queue writes, no second retry/background replay, and no Inventory/stock/price/ledger/approval mutation.');
