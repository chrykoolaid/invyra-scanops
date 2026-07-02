import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_BLOCKERS,
  SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_STATUSES,
  buildScanOpsRetryResultFinalReviewClosureCandidateSummarySurface,
} from '../src/inventory-bridge/retryResultFinalReviewClosureCandidateSummary/index.js';

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

const outcomeSummarySurface = Object.freeze({
  phase: '24',
  component: 'scanops_bridge_retry_result_final_review_readiness_outcome_summary_surface',
  status: 'RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_READY',
  outcomeSummaryItems: Object.freeze([
    Object.freeze({ finalReviewReadinessOutcomeSummaryId: 'outcome-summary:item-1', finalReviewReadinessOutcomeId: 'outcome:item-1', retryResultReviewId: 'retry-result-review:item-1', queueItemId: 'item-1', outcomeDescriptor: 'Ready for later closure review', readyForLaterClosureReview: true, keepReviewOpen: false, acknowledgementResolutionRequired: false, finalReviewPending: false, queueWriteApplied: false, closureApplied: false, finalReviewReadinessOutcomeSummaryPersistenceApplied: false }),
    Object.freeze({ finalReviewReadinessOutcomeSummaryId: 'outcome-summary:item-2', finalReviewReadinessOutcomeId: 'outcome:item-2', retryResultReviewId: 'retry-result-review:item-2', queueItemId: 'item-2', outcomeDescriptor: 'Keep review open', readyForLaterClosureReview: false, keepReviewOpen: true, acknowledgementResolutionRequired: false, finalReviewPending: false, queueWriteApplied: false, closureApplied: false, finalReviewReadinessOutcomeSummaryPersistenceApplied: false }),
    Object.freeze({ finalReviewReadinessOutcomeSummaryId: 'outcome-summary:item-3', finalReviewReadinessOutcomeId: 'outcome:item-3', retryResultReviewId: 'retry-result-review:item-3', queueItemId: 'item-3', outcomeDescriptor: 'Resolve acknowledgement first', readyForLaterClosureReview: false, keepReviewOpen: false, acknowledgementResolutionRequired: true, finalReviewPending: false, queueWriteApplied: false, closureApplied: false, finalReviewReadinessOutcomeSummaryPersistenceApplied: false }),
    Object.freeze({ finalReviewReadinessOutcomeSummaryId: 'outcome-summary:item-4', finalReviewReadinessOutcomeId: 'outcome:item-4', retryResultReviewId: 'retry-result-review:item-4', queueItemId: 'item-4', outcomeDescriptor: 'Final review pending', readyForLaterClosureReview: false, keepReviewOpen: false, acknowledgementResolutionRequired: false, finalReviewPending: true, queueWriteApplied: false, closureApplied: false, finalReviewReadinessOutcomeSummaryPersistenceApplied: false }),
  ]),
});

const candidateSummarySurface = buildScanOpsRetryResultFinalReviewClosureCandidateSummarySurface(outcomeSummarySurface, { now: () => fixedNow });

assert(candidateSummarySurface.phase === '25', 'Phase 25 closure candidate summary must declare phase 25');
assert(candidateSummarySurface.component === 'scanops_bridge_retry_result_final_review_closure_candidate_summary_surface', 'Phase 25 must expose the expected component id');
assert(candidateSummarySurface.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_STATUSES.READY, 'Phase 25 must be ready for Phase 24 outcome summary items');
assert(candidateSummarySurface.consumesPhase24FinalReviewReadinessOutcomeSummarySurface === true, 'Phase 25 must consume Phase 24 outcome summary surface');
assert(candidateSummarySurface.candidateSummaryMode === 'LOCAL_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_ONLY', 'Phase 25 must be local candidate summary only');
assert(candidateSummarySurface.localCandidateSummaryOnly === true && candidateSummarySurface.displayOnly === true, 'Phase 25 must be display-only');
assert(candidateSummarySurface.closureApplicationAllowed === false && candidateSummarySurface.closureApplied === false, 'Phase 25 must not apply closure');
assert(candidateSummarySurface.finalReviewClosureCandidateSummaryPersistenceAllowed === false && candidateSummarySurface.finalReviewClosureCandidateSummaryPersistenceApplied === false, 'Phase 25 must not persist summaries');
assert(candidateSummarySurface.queueWriteAllowed === false && candidateSummarySurface.queueWriteApplied === false, 'Phase 25 must not write queue state');
assert(candidateSummarySurface.retryApplied === false && candidateSummarySurface.secondRetryApplied === false && candidateSummarySurface.automaticSecondRetryEnabled === false, 'Phase 25 must not apply retry or second retry');
assert(candidateSummarySurface.backgroundRetryEnabled === false, 'Phase 25 must not enable background retry');
assert(candidateSummarySurface.inventoryMutationAttempted === false, 'Phase 25 must not mutate Inventory truth');
assert(candidateSummarySurface.stockMutationAttempted === false && candidateSummarySurface.priceMutationAttempted === false && candidateSummarySurface.ledgerMutationAttempted === false && candidateSummarySurface.approvalMutationAttempted === false, 'Phase 25 must not mutate stock, price, ledger, or approvals');
assert(candidateSummarySurface.closureCandidateSummaryItemCount === 4, 'Phase 25 must expose one candidate summary item per Phase 24 summary item');
assert(candidateSummarySurface.closureCandidateCount === 1, 'Phase 25 must count closure candidates');
assert(candidateSummarySurface.closureCandidateBlockedCount === 3, 'Phase 25 must count blocked closure candidates');
assert(candidateSummarySurface.keepOpenBlockedCount === 1, 'Phase 25 must count keep-open blocked items');
assert(candidateSummarySurface.acknowledgementBlockedCount === 1, 'Phase 25 must count acknowledgement-blocked items');
assert(candidateSummarySurface.finalReviewPendingBlockedCount === 1, 'Phase 25 must count final-review-pending blocked items');
assert(candidateSummarySurface.displayOnlyCount === 4, 'Phase 25 candidate summary items must remain display-only');
assert(Object.isFrozen(candidateSummarySurface.closureCandidateSummaryItems), 'Phase 25 candidate summary items array must be immutable');
assert(candidateSummarySurface.closureCandidateSummaryItems.some((item) => item.candidateStatus === 'Closure candidate for later scoped review'), 'Phase 25 must summarize later candidate state');
assert(candidateSummarySurface.closureCandidateSummaryItems.some((item) => item.candidateStatus === 'Not a closure candidate: keep review open'), 'Phase 25 must summarize keep-open blocker state');
assert(candidateSummarySurface.closureCandidateSummaryItems.some((item) => item.candidateStatus === 'Not a closure candidate: acknowledgement first'), 'Phase 25 must summarize acknowledgement blocker state');
assert(candidateSummarySurface.closureCandidateSummaryItems.some((item) => item.candidateStatus === 'Not a closure candidate: final review pending'), 'Phase 25 must summarize pending blocker state');

const validEmptyPhase24Summary = Object.freeze({
  phase: '24',
  component: 'scanops_bridge_retry_result_final_review_readiness_outcome_summary_surface',
  status: 'RETRY_RESULT_FINAL_REVIEW_READINESS_OUTCOME_SUMMARY_EMPTY',
  outcomeSummaryItems: Object.freeze([]),
});
const emptyCandidate = buildScanOpsRetryResultFinalReviewClosureCandidateSummarySurface(validEmptyPhase24Summary, { now: () => fixedNow });
assert(emptyCandidate.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_STATUSES.EMPTY, 'Phase 25 must expose empty status only for a valid empty Phase 24 outcome summary surface');

const missingCandidate = buildScanOpsRetryResultFinalReviewClosureCandidateSummarySurface(undefined, { now: () => fixedNow });
assert(missingCandidate.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_STATUSES.BLOCKED, 'Phase 25 must block missing Phase 24 outcome summary input');
assert(missingCandidate.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_BLOCKERS.OUTCOME_SUMMARY_REQUIRED), 'Phase 25 must report missing Phase 24 outcome summary blocker');

const uninitializedCandidate = buildScanOpsRetryResultFinalReviewClosureCandidateSummarySurface({}, { now: () => fixedNow });
assert(uninitializedCandidate.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_STATUSES.BLOCKED, 'Phase 25 must block uninitialized outcome summary objects');
assert(uninitializedCandidate.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_BLOCKERS.OUTCOME_SUMMARY_REQUIRED), 'Phase 25 must not treat {} as a valid empty outcome summary');

const wrongComponentCandidate = buildScanOpsRetryResultFinalReviewClosureCandidateSummarySurface({ phase: '24', component: 'wrong', outcomeSummaryItems: [] }, { now: () => fixedNow });
assert(wrongComponentCandidate.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_STATUSES.BLOCKED, 'Phase 25 must block non-Phase 24 outcome summary-shaped inputs');

const blockedApplyCandidate = buildScanOpsRetryResultFinalReviewClosureCandidateSummarySurface(outcomeSummarySurface, { applyCandidateSummary: true, now: () => fixedNow });
assert(blockedApplyCandidate.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_STATUSES.BLOCKED, 'Phase 25 must block candidate application');
assert(blockedApplyCandidate.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_BLOCKERS.CANDIDATE_APPLICATION_BLOCKED), 'Phase 25 must report candidate application blocker');

const blockedClosure = buildScanOpsRetryResultFinalReviewClosureCandidateSummarySurface(outcomeSummarySurface, { applyClosure: true, now: () => fixedNow });
assert(blockedClosure.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_BLOCKERS.CLOSURE_APPLICATION_BLOCKED), 'Phase 25 must block closure application');

const blockedPersistence = buildScanOpsRetryResultFinalReviewClosureCandidateSummarySurface(outcomeSummarySurface, { persistCandidateSummary: true, now: () => fixedNow });
assert(blockedPersistence.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_BLOCKERS.PERSISTENCE_BLOCKED), 'Phase 25 must block persistence');

const blockedRetry = buildScanOpsRetryResultFinalReviewClosureCandidateSummarySurface(outcomeSummarySurface, { executeRetry: true, now: () => fixedNow });
assert(blockedRetry.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_BLOCKERS.SECOND_RETRY_BLOCKED), 'Phase 25 must block second retry execution');

const blockedQueueWrite = buildScanOpsRetryResultFinalReviewClosureCandidateSummarySurface(outcomeSummarySurface, { applyQueueWrites: true, now: () => fixedNow });
assert(blockedQueueWrite.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_BLOCKERS.QUEUE_WRITE_BLOCKED), 'Phase 25 must block queue writes');

const moduleFile = read('src/inventory-bridge/retryResultFinalReviewClosureCandidateSummary/index.js');
const componentFile = read('src/components/scanner/RetryResultFinalReviewClosureCandidateSummarySurface.jsx');

assert(componentFile.includes('buildScanOpsRetryResultFinalReviewClosureCandidateSummarySurface'), 'Phase 25 UI component must build the candidate summary surface');
assert(componentFile.includes('Retry Result Final Review Closure Candidate Summary Surface'), 'Phase 25 UI component must expose candidate summary copy');
assert(componentFile.includes('Closure candidate summary only for later scoped review'), 'Phase 25 UI component must state the candidate summary boundary');
assert(componentFile.includes('No closure is applied, persisted, written to the queue, retried, or sent to Inventory.'), 'Phase 25 UI component must state Phase 25 guardrails');
assert(moduleFile.includes('isPhase24OutcomeSummarySurface'), 'Phase 25 module must require an initialized Phase 24 outcome summary surface');
assert(moduleFile.includes('scanops_bridge_retry_result_final_review_readiness_outcome_summary_surface'), 'Phase 25 module must require the Phase 24 outcome summary component id');

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
  assert(!forbidden.pattern.test(moduleFile), `Phase 25 closure candidate summary surface must not contain ${forbidden.label}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 25 retry result final review closure candidate summary surface validates required Phase 24 outcome summary input, display-only closure candidates, no closure application, no persistence, no queue writes, no second retry/background replay, and no Inventory/stock/price/ledger/approval mutation.');
