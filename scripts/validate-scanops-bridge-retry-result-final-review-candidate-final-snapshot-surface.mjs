import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_BLOCKERS,
  SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_STATUSES,
  buildScanOpsRetryResultFinalReviewCandidateFinalSnapshotSurface,
} from '../src/inventory-bridge/retryResultFinalReviewCandidateFinalSnapshot/index.js';

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

const summarySurface = Object.freeze({
  phase: '27',
  component: 'scanops_bridge_retry_result_final_review_candidate_outcome_summary_surface',
  status: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_READY',
  candidateOutcomeSummaryItems: Object.freeze([
    Object.freeze({ finalReviewCandidateOutcomeSummaryId: 'summary:item-1', queueItemId: 'item-1', readyForLaterClosureReview: true, keepReviewOpenBeforeClosure: false, acknowledgementResolutionBeforeClosure: false, finalReviewBeforeClosure: false, queueWriteApplied: false, closureApplied: false, summaryPersistenceApplied: false }),
    Object.freeze({ finalReviewCandidateOutcomeSummaryId: 'summary:item-2', queueItemId: 'item-2', readyForLaterClosureReview: false, keepReviewOpenBeforeClosure: true, acknowledgementResolutionBeforeClosure: false, finalReviewBeforeClosure: false, queueWriteApplied: false, closureApplied: false, summaryPersistenceApplied: false }),
    Object.freeze({ finalReviewCandidateOutcomeSummaryId: 'summary:item-3', queueItemId: 'item-3', readyForLaterClosureReview: false, keepReviewOpenBeforeClosure: false, acknowledgementResolutionBeforeClosure: true, finalReviewBeforeClosure: false, queueWriteApplied: false, closureApplied: false, summaryPersistenceApplied: false }),
    Object.freeze({ finalReviewCandidateOutcomeSummaryId: 'summary:item-4', queueItemId: 'item-4', readyForLaterClosureReview: false, keepReviewOpenBeforeClosure: false, acknowledgementResolutionBeforeClosure: false, finalReviewBeforeClosure: true, queueWriteApplied: false, closureApplied: false, summaryPersistenceApplied: false }),
  ]),
});

const snapshotSurface = buildScanOpsRetryResultFinalReviewCandidateFinalSnapshotSurface(summarySurface, { now: () => fixedNow });

assert(snapshotSurface.phase === '28', 'Phase 28 final snapshot must declare phase 28');
assert(snapshotSurface.component === 'scanops_bridge_retry_result_final_review_candidate_final_snapshot_surface', 'Phase 28 must expose the expected component id');
assert(snapshotSurface.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_STATUSES.READY, 'Phase 28 must be ready for Phase 27 summary items');
assert(snapshotSurface.consumesPhase27CandidateOutcomeSummarySurface === true, 'Phase 28 must consume Phase 27 summary surface');
assert(snapshotSurface.snapshotMode === 'LOCAL_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_ONLY', 'Phase 28 must be local snapshot only');
assert(snapshotSurface.localSnapshotOnly === true && snapshotSurface.displayOnly === true, 'Phase 28 must be display-only');
assert(snapshotSurface.closureApplicationAllowed === false && snapshotSurface.closureApplied === false, 'Phase 28 must not apply closure');
assert(snapshotSurface.snapshotPersistenceAllowed === false && snapshotSurface.snapshotPersistenceApplied === false, 'Phase 28 must not persist snapshots');
assert(snapshotSurface.queueWriteAllowed === false && snapshotSurface.queueWriteApplied === false, 'Phase 28 must not write queue state');
assert(snapshotSurface.retryApplied === false && snapshotSurface.secondRetryApplied === false && snapshotSurface.automaticSecondRetryEnabled === false, 'Phase 28 must not apply retry or second retry');
assert(snapshotSurface.backgroundRetryEnabled === false, 'Phase 28 must not enable background retry');
assert(snapshotSurface.inventoryMutationAttempted === false, 'Phase 28 must not mutate Inventory truth');
assert(snapshotSurface.stockMutationAttempted === false && snapshotSurface.priceMutationAttempted === false && snapshotSurface.ledgerMutationAttempted === false && snapshotSurface.approvalMutationAttempted === false, 'Phase 28 must not mutate stock, price, ledger, or approvals');
assert(snapshotSurface.finalSnapshotItemCount === 4, 'Phase 28 must expose one final snapshot item per Phase 27 summary item');
assert(snapshotSurface.readyLaterSnapshotCount === 1, 'Phase 28 must count ready-later snapshots');
assert(snapshotSurface.keepOpenSnapshotCount === 1, 'Phase 28 must count keep-open snapshots');
assert(snapshotSurface.acknowledgementFirstSnapshotCount === 1, 'Phase 28 must count acknowledgement-first snapshots');
assert(snapshotSurface.finalReviewFirstSnapshotCount === 1, 'Phase 28 must count final-review-first snapshots');
assert(snapshotSurface.displayOnlyCount === 4, 'Phase 28 snapshot items must remain display-only');
assert(Object.isFrozen(snapshotSurface.finalSnapshotItems), 'Phase 28 snapshot items array must be immutable');
assert(snapshotSurface.finalSnapshotItems.some((item) => item.finalSnapshotStatus === 'Final snapshot: ready later'), 'Phase 28 must snapshot ready-later state');
assert(snapshotSurface.finalSnapshotItems.some((item) => item.finalSnapshotStatus === 'Final snapshot: keep review open'), 'Phase 28 must snapshot keep-open state');
assert(snapshotSurface.finalSnapshotItems.some((item) => item.finalSnapshotStatus === 'Final snapshot: acknowledgement first'), 'Phase 28 must snapshot acknowledgement-first state');
assert(snapshotSurface.finalSnapshotItems.some((item) => item.finalSnapshotStatus === 'Final snapshot: final review first'), 'Phase 28 must snapshot final-review-first state');

const validEmptyPhase27Summary = Object.freeze({
  phase: '27',
  component: 'scanops_bridge_retry_result_final_review_candidate_outcome_summary_surface',
  status: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_OUTCOME_SUMMARY_EMPTY',
  candidateOutcomeSummaryItems: Object.freeze([]),
});
const emptySnapshot = buildScanOpsRetryResultFinalReviewCandidateFinalSnapshotSurface(validEmptyPhase27Summary, { now: () => fixedNow });
assert(emptySnapshot.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_STATUSES.EMPTY, 'Phase 28 must expose empty status only for a valid empty Phase 27 summary surface');

const missingSnapshot = buildScanOpsRetryResultFinalReviewCandidateFinalSnapshotSurface(undefined, { now: () => fixedNow });
assert(missingSnapshot.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_STATUSES.BLOCKED, 'Phase 28 must block missing Phase 27 summary input');
assert(missingSnapshot.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_BLOCKERS.SUMMARY_SURFACE_REQUIRED), 'Phase 28 must report missing Phase 27 summary blocker');

const uninitializedSnapshot = buildScanOpsRetryResultFinalReviewCandidateFinalSnapshotSurface({}, { now: () => fixedNow });
assert(uninitializedSnapshot.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_STATUSES.BLOCKED, 'Phase 28 must block uninitialized summary objects');
assert(uninitializedSnapshot.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_BLOCKERS.SUMMARY_SURFACE_REQUIRED), 'Phase 28 must not treat {} as valid empty input');

const wrongComponentSnapshot = buildScanOpsRetryResultFinalReviewCandidateFinalSnapshotSurface({ phase: '27', component: 'wrong', candidateOutcomeSummaryItems: [] }, { now: () => fixedNow });
assert(wrongComponentSnapshot.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_STATUSES.BLOCKED, 'Phase 28 must block non-Phase 27 summary-shaped inputs');

const blockedApplySnapshot = buildScanOpsRetryResultFinalReviewCandidateFinalSnapshotSurface(summarySurface, { applySnapshot: true, now: () => fixedNow });
assert(blockedApplySnapshot.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_STATUSES.BLOCKED, 'Phase 28 must block snapshot application');
assert(blockedApplySnapshot.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_BLOCKERS.SNAPSHOT_APPLICATION_BLOCKED), 'Phase 28 must report snapshot application blocker');

const blockedClosure = buildScanOpsRetryResultFinalReviewCandidateFinalSnapshotSurface(summarySurface, { applyClosure: true, now: () => fixedNow });
assert(blockedClosure.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_BLOCKERS.CLOSURE_APPLICATION_BLOCKED), 'Phase 28 must block closure application');

const blockedPersistence = buildScanOpsRetryResultFinalReviewCandidateFinalSnapshotSurface(summarySurface, { persistSnapshot: true, now: () => fixedNow });
assert(blockedPersistence.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_BLOCKERS.PERSISTENCE_BLOCKED), 'Phase 28 must block persistence');

const blockedRetry = buildScanOpsRetryResultFinalReviewCandidateFinalSnapshotSurface(summarySurface, { executeRetry: true, now: () => fixedNow });
assert(blockedRetry.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_BLOCKERS.SECOND_RETRY_BLOCKED), 'Phase 28 must block retry execution');

const blockedQueueWrite = buildScanOpsRetryResultFinalReviewCandidateFinalSnapshotSurface(summarySurface, { applyQueueWrites: true, now: () => fixedNow });
assert(blockedQueueWrite.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_FINAL_SNAPSHOT_BLOCKERS.QUEUE_WRITE_BLOCKED), 'Phase 28 must block queue writes');

const moduleFile = read('src/inventory-bridge/retryResultFinalReviewCandidateFinalSnapshot/index.js');
const componentFile = read('src/components/scanner/RetryResultFinalReviewCandidateFinalSnapshotSurface.jsx');

assert(componentFile.includes('buildScanOpsRetryResultFinalReviewCandidateFinalSnapshotSurface'), 'Phase 28 UI component must build the snapshot surface');
assert(componentFile.includes('Retry Result Final Review Candidate Final Snapshot Surface'), 'Phase 28 UI component must expose snapshot copy');
assert(componentFile.includes('Final snapshot only'), 'Phase 28 UI component must state the snapshot boundary');
assert(componentFile.includes('No application, persistence, queue write, retry, or Inventory mutation is allowed.'), 'Phase 28 UI component must state guardrails');
assert(moduleFile.includes('isValidPhase27'), 'Phase 28 module must require an initialized Phase 27 summary surface');
assert(moduleFile.includes('scanops_bridge_retry_result_final_review_candidate_outcome_summary_surface'), 'Phase 28 module must require the Phase 27 component id');

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
  assert(!forbidden.pattern.test(moduleFile), `Phase 28 final snapshot surface must not contain ${forbidden.label}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 28 retry result final review candidate final snapshot surface validates required Phase 27 summary input, display-only final snapshots, no closure application, no persistence, no queue writes, no second retry/background replay, and no Inventory/stock/price/ledger/approval mutation.');
