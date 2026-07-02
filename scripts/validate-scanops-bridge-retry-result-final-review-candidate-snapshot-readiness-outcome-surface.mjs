import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_BLOCKERS,
  SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_STATUSES,
  buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSurface,
} from '../src/inventory-bridge/retryResultFinalReviewCandidateSnapshotReadinessOutcome/index.js';

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
  phase: '29',
  component: 'scanops_bridge_retry_result_final_review_candidate_snapshot_readiness_summary_surface',
  status: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_READY',
  snapshotReadinessSummaryItems: Object.freeze([
    Object.freeze({ candidateSnapshotReadinessSummaryId: 'readiness:item-1', queueItemId: 'item-1', readyForLaterClosureReview: true, keepReviewOpenBeforeClosure: false, acknowledgementResolutionBeforeClosure: false, finalReviewBeforeClosure: false, queueWriteApplied: false, closureApplied: false, summaryPersistenceApplied: false }),
    Object.freeze({ candidateSnapshotReadinessSummaryId: 'readiness:item-2', queueItemId: 'item-2', readyForLaterClosureReview: false, keepReviewOpenBeforeClosure: true, acknowledgementResolutionBeforeClosure: false, finalReviewBeforeClosure: false, queueWriteApplied: false, closureApplied: false, summaryPersistenceApplied: false }),
    Object.freeze({ candidateSnapshotReadinessSummaryId: 'readiness:item-3', queueItemId: 'item-3', readyForLaterClosureReview: false, keepReviewOpenBeforeClosure: false, acknowledgementResolutionBeforeClosure: true, finalReviewBeforeClosure: false, queueWriteApplied: false, closureApplied: false, summaryPersistenceApplied: false }),
    Object.freeze({ candidateSnapshotReadinessSummaryId: 'readiness:item-4', queueItemId: 'item-4', readyForLaterClosureReview: false, keepReviewOpenBeforeClosure: false, acknowledgementResolutionBeforeClosure: false, finalReviewBeforeClosure: true, queueWriteApplied: false, closureApplied: false, summaryPersistenceApplied: false }),
  ]),
});

const outcomeSurface = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSurface(readinessSummarySurface, { now: () => fixedNow });

assert(outcomeSurface.phase === '30', 'Phase 30 snapshot readiness outcome must declare phase 30');
assert(outcomeSurface.component === 'scanops_bridge_retry_result_final_review_candidate_snapshot_readiness_outcome_surface', 'Phase 30 must expose the expected component id');
assert(outcomeSurface.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_STATUSES.READY, 'Phase 30 must be ready for Phase 29 readiness summary items');
assert(outcomeSurface.consumesPhase29CandidateSnapshotReadinessSummarySurface === true, 'Phase 30 must consume Phase 29 readiness summary surface');
assert(outcomeSurface.outcomeMode === 'LOCAL_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_DESCRIPTOR_ONLY', 'Phase 30 must be descriptor-only');
assert(outcomeSurface.localOutcomeOnly === true && outcomeSurface.descriptorOnly === true && outcomeSurface.displayOnly === true, 'Phase 30 must be display-only');
assert(outcomeSurface.closureApplicationAllowed === false && outcomeSurface.closureApplied === false, 'Phase 30 must not apply closure');
assert(outcomeSurface.outcomePersistenceAllowed === false && outcomeSurface.outcomePersistenceApplied === false, 'Phase 30 must not persist outcomes');
assert(outcomeSurface.queueWriteAllowed === false && outcomeSurface.queueWriteApplied === false, 'Phase 30 must not write queue state');
assert(outcomeSurface.retryApplied === false && outcomeSurface.secondRetryApplied === false && outcomeSurface.automaticSecondRetryEnabled === false, 'Phase 30 must not apply retry or second retry');
assert(outcomeSurface.backgroundRetryEnabled === false, 'Phase 30 must not enable background retry');
assert(outcomeSurface.inventoryMutationAttempted === false, 'Phase 30 must not mutate Inventory truth');
assert(outcomeSurface.stockMutationAttempted === false && outcomeSurface.priceMutationAttempted === false && outcomeSurface.ledgerMutationAttempted === false && outcomeSurface.approvalMutationAttempted === false, 'Phase 30 must not mutate stock, price, ledger, or approvals');
assert(outcomeSurface.snapshotReadinessOutcomeItemCount === 4, 'Phase 30 must expose one outcome item per Phase 29 summary item');
assert(outcomeSurface.readyLaterOutcomeCount === 1, 'Phase 30 must count ready-later outcomes');
assert(outcomeSurface.keepOpenOutcomeCount === 1, 'Phase 30 must count keep-open outcomes');
assert(outcomeSurface.acknowledgementFirstOutcomeCount === 1, 'Phase 30 must count acknowledgement-first outcomes');
assert(outcomeSurface.finalReviewFirstOutcomeCount === 1, 'Phase 30 must count final-review-first outcomes');
assert(outcomeSurface.allReadyLaterOutcome === false, 'Phase 30 must not mark all-ready while blockers remain');
assert(outcomeSurface.displayOnlyCount === 4, 'Phase 30 outcome items must remain display-only');
assert(Object.isFrozen(outcomeSurface.snapshotReadinessOutcomeItems), 'Phase 30 outcome items array must be immutable');
assert(outcomeSurface.snapshotReadinessOutcomeItems.some((item) => item.outcomeDescriptor === 'Ready later snapshot outcome'), 'Phase 30 must describe ready-later outcome');
assert(outcomeSurface.snapshotReadinessOutcomeItems.some((item) => item.outcomeDescriptor === 'Keep review open snapshot outcome'), 'Phase 30 must describe keep-open outcome');
assert(outcomeSurface.snapshotReadinessOutcomeItems.some((item) => item.outcomeDescriptor === 'Acknowledgement first snapshot outcome'), 'Phase 30 must describe acknowledgement-first outcome');
assert(outcomeSurface.snapshotReadinessOutcomeItems.some((item) => item.outcomeDescriptor === 'Final review first snapshot outcome'), 'Phase 30 must describe final-review-first outcome');

const allReadySurface = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSurface({
  phase: '29',
  component: 'scanops_bridge_retry_result_final_review_candidate_snapshot_readiness_summary_surface',
  snapshotReadinessSummaryItems: readinessSummarySurface.snapshotReadinessSummaryItems.map((item) => Object.freeze({ ...item, readyForLaterClosureReview: true, keepReviewOpenBeforeClosure: false, acknowledgementResolutionBeforeClosure: false, finalReviewBeforeClosure: false })),
}, { now: () => fixedNow });
assert(allReadySurface.allReadyLaterOutcome === true, 'Phase 30 may mark all-ready only when every outcome is ready-later');
assert(allReadySurface.closureApplied === false && allReadySurface.queueWriteApplied === false, 'All-ready Phase 30 outcome must still not close or queue-write');

const validEmptyPhase29Summary = Object.freeze({ phase: '29', component: 'scanops_bridge_retry_result_final_review_candidate_snapshot_readiness_summary_surface', status: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_EMPTY', snapshotReadinessSummaryItems: Object.freeze([]) });
const emptyOutcome = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSurface(validEmptyPhase29Summary, { now: () => fixedNow });
assert(emptyOutcome.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_STATUSES.EMPTY, 'Phase 30 must expose empty status only for a valid empty Phase 29 summary surface');

const missingOutcome = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSurface(undefined, { now: () => fixedNow });
assert(missingOutcome.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_STATUSES.BLOCKED, 'Phase 30 must block missing Phase 29 readiness summary input');
assert(missingOutcome.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_BLOCKERS.READINESS_SUMMARY_REQUIRED), 'Phase 30 must report missing Phase 29 summary blocker');

const uninitializedOutcome = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSurface({}, { now: () => fixedNow });
assert(uninitializedOutcome.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_STATUSES.BLOCKED, 'Phase 30 must block uninitialized summary objects');
assert(uninitializedOutcome.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_BLOCKERS.READINESS_SUMMARY_REQUIRED), 'Phase 30 must not treat {} as valid empty input');

const wrongComponentOutcome = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSurface({ phase: '29', component: 'wrong', snapshotReadinessSummaryItems: [] }, { now: () => fixedNow });
assert(wrongComponentOutcome.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_STATUSES.BLOCKED, 'Phase 30 must block non-Phase 29 summary-shaped inputs');

const blockedApplyOutcome = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSurface(readinessSummarySurface, { applyOutcome: true, now: () => fixedNow });
assert(blockedApplyOutcome.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_STATUSES.BLOCKED, 'Phase 30 must block outcome application');
assert(blockedApplyOutcome.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_BLOCKERS.OUTCOME_APPLICATION_BLOCKED), 'Phase 30 must report outcome application blocker');

const blockedClosure = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSurface(readinessSummarySurface, { applyClosure: true, now: () => fixedNow });
assert(blockedClosure.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_BLOCKERS.CLOSURE_APPLICATION_BLOCKED), 'Phase 30 must block closure application');

const blockedPersistence = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSurface(readinessSummarySurface, { persistOutcome: true, now: () => fixedNow });
assert(blockedPersistence.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_BLOCKERS.PERSISTENCE_BLOCKED), 'Phase 30 must block persistence');

const blockedRetry = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSurface(readinessSummarySurface, { executeRetry: true, now: () => fixedNow });
assert(blockedRetry.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_BLOCKERS.SECOND_RETRY_BLOCKED), 'Phase 30 must block retry execution');

const blockedQueueWrite = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSurface(readinessSummarySurface, { applyQueueWrites: true, now: () => fixedNow });
assert(blockedQueueWrite.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_BLOCKERS.QUEUE_WRITE_BLOCKED), 'Phase 30 must block queue writes');

const moduleFile = read('src/inventory-bridge/retryResultFinalReviewCandidateSnapshotReadinessOutcome/index.js');
const componentFile = read('src/components/scanner/RetryResultFinalReviewCandidateSnapshotReadinessOutcomeSurface.jsx');

assert(componentFile.includes('buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSurface'), 'Phase 30 UI component must build the outcome surface');
assert(componentFile.includes('Retry Result Final Review Candidate Snapshot Readiness Outcome Surface'), 'Phase 30 UI component must expose outcome copy');
assert(componentFile.includes('Snapshot readiness outcome descriptors only'), 'Phase 30 UI component must state the outcome boundary');
assert(componentFile.includes('No application, persistence, queue write, retry, or Inventory mutation is allowed.'), 'Phase 30 UI component must state guardrails');
assert(moduleFile.includes('isValidPhase29'), 'Phase 30 module must require an initialized Phase 29 summary surface');
assert(moduleFile.includes('scanops_bridge_retry_result_final_review_candidate_snapshot_readiness_summary_surface'), 'Phase 30 module must require the Phase 29 component id');

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
  assert(!forbidden.pattern.test(moduleFile), `Phase 30 snapshot readiness outcome surface must not contain ${forbidden.label}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 30 retry result final review candidate snapshot readiness outcome surface validates required Phase 29 readiness summary input, display-only outcome descriptors, no closure application, no persistence, no queue writes, no second retry/background replay, and no Inventory/stock/price/ledger/approval mutation.');
