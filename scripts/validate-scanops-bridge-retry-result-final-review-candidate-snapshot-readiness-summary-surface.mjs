import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_BLOCKERS,
  SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_STATUSES,
  buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessSummarySurface,
} from '../src/inventory-bridge/retryResultFinalReviewCandidateSnapshotReadinessSummary/index.js';

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

const finalSnapshotSurface = Object.freeze({
  phase: '28',
  component: 'scanops_bridge_retry_result_final_review_candidate_final_snapshot_surface',
  status: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_READY',
  finalSnapshotItems: Object.freeze([
    Object.freeze({ finalReviewCandidateFinalSnapshotId: 'snapshot:item-1', queueItemId: 'item-1', readyForLaterClosureReview: true, keepReviewOpenBeforeClosure: false, acknowledgementResolutionBeforeClosure: false, finalReviewBeforeClosure: false, queueWriteApplied: false, closureApplied: false, snapshotPersistenceApplied: false }),
    Object.freeze({ finalReviewCandidateFinalSnapshotId: 'snapshot:item-2', queueItemId: 'item-2', readyForLaterClosureReview: false, keepReviewOpenBeforeClosure: true, acknowledgementResolutionBeforeClosure: false, finalReviewBeforeClosure: false, queueWriteApplied: false, closureApplied: false, snapshotPersistenceApplied: false }),
    Object.freeze({ finalReviewCandidateFinalSnapshotId: 'snapshot:item-3', queueItemId: 'item-3', readyForLaterClosureReview: false, keepReviewOpenBeforeClosure: false, acknowledgementResolutionBeforeClosure: true, finalReviewBeforeClosure: false, queueWriteApplied: false, closureApplied: false, snapshotPersistenceApplied: false }),
    Object.freeze({ finalReviewCandidateFinalSnapshotId: 'snapshot:item-4', queueItemId: 'item-4', readyForLaterClosureReview: false, keepReviewOpenBeforeClosure: false, acknowledgementResolutionBeforeClosure: false, finalReviewBeforeClosure: true, queueWriteApplied: false, closureApplied: false, snapshotPersistenceApplied: false }),
  ]),
});

const summarySurface = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessSummarySurface(finalSnapshotSurface, { now: () => fixedNow });

assert(summarySurface.phase === '29', 'Phase 29 snapshot readiness summary must declare phase 29');
assert(summarySurface.component === 'scanops_bridge_retry_result_final_review_candidate_snapshot_readiness_summary_surface', 'Phase 29 must expose the expected component id');
assert(summarySurface.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_STATUSES.READY, 'Phase 29 must be ready for Phase 28 final snapshot items');
assert(summarySurface.consumesPhase28CandidateFinalSnapshotSurface === true, 'Phase 29 must consume Phase 28 final snapshot surface');
assert(summarySurface.summaryMode === 'LOCAL_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_ONLY', 'Phase 29 must be local summary only');
assert(summarySurface.localSummaryOnly === true && summarySurface.displayOnly === true, 'Phase 29 must be display-only');
assert(summarySurface.closureApplicationAllowed === false && summarySurface.closureApplied === false, 'Phase 29 must not apply closure');
assert(summarySurface.summaryPersistenceAllowed === false && summarySurface.summaryPersistenceApplied === false, 'Phase 29 must not persist summaries');
assert(summarySurface.queueWriteAllowed === false && summarySurface.queueWriteApplied === false, 'Phase 29 must not write queue state');
assert(summarySurface.retryApplied === false && summarySurface.secondRetryApplied === false && summarySurface.automaticSecondRetryEnabled === false, 'Phase 29 must not apply retry or second retry');
assert(summarySurface.backgroundRetryEnabled === false, 'Phase 29 must not enable background retry');
assert(summarySurface.inventoryMutationAttempted === false, 'Phase 29 must not mutate Inventory truth');
assert(summarySurface.stockMutationAttempted === false && summarySurface.priceMutationAttempted === false && summarySurface.ledgerMutationAttempted === false && summarySurface.approvalMutationAttempted === false, 'Phase 29 must not mutate stock, price, ledger, or approvals');
assert(summarySurface.snapshotReadinessSummaryItemCount === 4, 'Phase 29 must expose one summary item per Phase 28 snapshot item');
assert(summarySurface.readyLaterReadinessCount === 1, 'Phase 29 must count ready-later readiness');
assert(summarySurface.keepOpenReadinessCount === 1, 'Phase 29 must count keep-open readiness');
assert(summarySurface.acknowledgementFirstReadinessCount === 1, 'Phase 29 must count acknowledgement-first readiness');
assert(summarySurface.finalReviewFirstReadinessCount === 1, 'Phase 29 must count final-review-first readiness');
assert(summarySurface.finalSnapshotReadyForLaterOnly === false, 'Phase 29 must not mark all-ready while blockers remain');
assert(summarySurface.displayOnlyCount === 4, 'Phase 29 summary items must remain display-only');
assert(Object.isFrozen(summarySurface.snapshotReadinessSummaryItems), 'Phase 29 summary items array must be immutable');
assert(summarySurface.snapshotReadinessSummaryItems.some((item) => item.readinessStatus === 'Ready later snapshot retained'), 'Phase 29 must summarize ready-later state');
assert(summarySurface.snapshotReadinessSummaryItems.some((item) => item.readinessStatus === 'Keep-open snapshot retained'), 'Phase 29 must summarize keep-open state');
assert(summarySurface.snapshotReadinessSummaryItems.some((item) => item.readinessStatus === 'Acknowledgement-first snapshot retained'), 'Phase 29 must summarize acknowledgement-first state');
assert(summarySurface.snapshotReadinessSummaryItems.some((item) => item.readinessStatus === 'Final-review-first snapshot retained'), 'Phase 29 must summarize final-review-first state');

const allReadySurface = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessSummarySurface({
  phase: '28',
  component: 'scanops_bridge_retry_result_final_review_candidate_final_snapshot_surface',
  finalSnapshotItems: finalSnapshotSurface.finalSnapshotItems.map((item) => Object.freeze({ ...item, readyForLaterClosureReview: true, keepReviewOpenBeforeClosure: false, acknowledgementResolutionBeforeClosure: false, finalReviewBeforeClosure: false })),
}, { now: () => fixedNow });
assert(allReadySurface.finalSnapshotReadyForLaterOnly === true, 'Phase 29 may mark all-ready only when every snapshot is ready-later');
assert(allReadySurface.closureApplied === false && allReadySurface.queueWriteApplied === false, 'All-ready Phase 29 summary must still not close or queue-write');

const validEmptyPhase28Snapshot = Object.freeze({ phase: '28', component: 'scanops_bridge_retry_result_final_review_candidate_final_snapshot_surface', status: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_EMPTY', finalSnapshotItems: Object.freeze([]) });
const emptySummary = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessSummarySurface(validEmptyPhase28Snapshot, { now: () => fixedNow });
assert(emptySummary.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_STATUSES.EMPTY, 'Phase 29 must expose empty status only for a valid empty Phase 28 snapshot surface');

const missingSummary = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessSummarySurface(undefined, { now: () => fixedNow });
assert(missingSummary.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_STATUSES.BLOCKED, 'Phase 29 must block missing Phase 28 snapshot input');
assert(missingSummary.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_BLOCKERS.FINAL_SNAPSHOT_REQUIRED), 'Phase 29 must report missing Phase 28 snapshot blocker');

const uninitializedSummary = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessSummarySurface({}, { now: () => fixedNow });
assert(uninitializedSummary.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_STATUSES.BLOCKED, 'Phase 29 must block uninitialized snapshot objects');
assert(uninitializedSummary.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_BLOCKERS.FINAL_SNAPSHOT_REQUIRED), 'Phase 29 must not treat {} as valid empty input');

const wrongComponentSummary = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessSummarySurface({ phase: '28', component: 'wrong', finalSnapshotItems: [] }, { now: () => fixedNow });
assert(wrongComponentSummary.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_STATUSES.BLOCKED, 'Phase 29 must block non-Phase 28 snapshot-shaped inputs');

const blockedApplySummary = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessSummarySurface(finalSnapshotSurface, { applySummary: true, now: () => fixedNow });
assert(blockedApplySummary.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_STATUSES.BLOCKED, 'Phase 29 must block summary application');
assert(blockedApplySummary.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_BLOCKERS.SUMMARY_APPLICATION_BLOCKED), 'Phase 29 must report summary application blocker');

const blockedClosure = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessSummarySurface(finalSnapshotSurface, { applyClosure: true, now: () => fixedNow });
assert(blockedClosure.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_BLOCKERS.CLOSURE_APPLICATION_BLOCKED), 'Phase 29 must block closure application');

const blockedPersistence = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessSummarySurface(finalSnapshotSurface, { persistSummary: true, now: () => fixedNow });
assert(blockedPersistence.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_BLOCKERS.PERSISTENCE_BLOCKED), 'Phase 29 must block persistence');

const blockedRetry = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessSummarySurface(finalSnapshotSurface, { executeRetry: true, now: () => fixedNow });
assert(blockedRetry.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_BLOCKERS.SECOND_RETRY_BLOCKED), 'Phase 29 must block retry execution');

const blockedQueueWrite = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessSummarySurface(finalSnapshotSurface, { applyQueueWrites: true, now: () => fixedNow });
assert(blockedQueueWrite.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_BLOCKERS.QUEUE_WRITE_BLOCKED), 'Phase 29 must block queue writes');

const moduleFile = read('src/inventory-bridge/retryResultFinalReviewCandidateSnapshotReadinessSummary/index.js');
const componentFile = read('src/components/scanner/RetryResultFinalReviewCandidateSnapshotReadinessSummarySurface.jsx');

assert(componentFile.includes('buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessSummarySurface'), 'Phase 29 UI component must build the summary surface');
assert(componentFile.includes('Retry Result Final Review Candidate Snapshot Readiness Summary Surface'), 'Phase 29 UI component must expose summary copy');
assert(componentFile.includes('Snapshot readiness summary only'), 'Phase 29 UI component must state the summary boundary');
assert(componentFile.includes('No application, persistence, queue write, retry, or Inventory mutation is allowed.'), 'Phase 29 UI component must state guardrails');
assert(moduleFile.includes('isValidPhase28'), 'Phase 29 module must require an initialized Phase 28 final snapshot surface');
assert(moduleFile.includes('scanops_bridge_retry_result_final_review_candidate_final_snapshot_surface'), 'Phase 29 module must require the Phase 28 component id');

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
  assert(!forbidden.pattern.test(moduleFile), `Phase 29 snapshot readiness summary surface must not contain ${forbidden.label}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 29 retry result final review candidate snapshot readiness summary surface validates required Phase 28 final snapshot input, display-only readiness summaries, no closure application, no persistence, no queue writes, no second retry/background replay, and no Inventory/stock/price/ledger/approval mutation.');
