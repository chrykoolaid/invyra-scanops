import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_BLOCKERS,
  SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_STATUSES,
  buildScanOpsRetryResultFinalReviewClosureCandidateOutcomeSurface,
} from '../src/inventory-bridge/retryResultFinalReviewClosureCandidateOutcome/index.js';

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

const candidateSummarySurface = Object.freeze({
  phase: '25',
  component: 'scanops_bridge_retry_result_final_review_closure_candidate_summary_surface',
  status: 'RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_READY',
  closureCandidateSummaryItems: Object.freeze([
    Object.freeze({ finalReviewClosureCandidateSummaryId: 'candidate:item-1', retryResultReviewId: 'retry-result-review:item-1', queueItemId: 'item-1', closureCandidate: true, closureCandidateBlocked: false, keepReviewOpen: false, acknowledgementResolutionRequired: false, finalReviewPending: false, queueWriteApplied: false, closureApplied: false, finalReviewClosureCandidateSummaryPersistenceApplied: false }),
    Object.freeze({ finalReviewClosureCandidateSummaryId: 'candidate:item-2', retryResultReviewId: 'retry-result-review:item-2', queueItemId: 'item-2', closureCandidate: false, closureCandidateBlocked: true, keepReviewOpen: true, acknowledgementResolutionRequired: false, finalReviewPending: false, queueWriteApplied: false, closureApplied: false, finalReviewClosureCandidateSummaryPersistenceApplied: false }),
    Object.freeze({ finalReviewClosureCandidateSummaryId: 'candidate:item-3', retryResultReviewId: 'retry-result-review:item-3', queueItemId: 'item-3', closureCandidate: false, closureCandidateBlocked: true, keepReviewOpen: false, acknowledgementResolutionRequired: true, finalReviewPending: false, queueWriteApplied: false, closureApplied: false, finalReviewClosureCandidateSummaryPersistenceApplied: false }),
    Object.freeze({ finalReviewClosureCandidateSummaryId: 'candidate:item-4', retryResultReviewId: 'retry-result-review:item-4', queueItemId: 'item-4', closureCandidate: false, closureCandidateBlocked: true, keepReviewOpen: false, acknowledgementResolutionRequired: false, finalReviewPending: true, queueWriteApplied: false, closureApplied: false, finalReviewClosureCandidateSummaryPersistenceApplied: false }),
  ]),
});

const outcomeSurface = buildScanOpsRetryResultFinalReviewClosureCandidateOutcomeSurface(candidateSummarySurface, { now: () => fixedNow });

assert(outcomeSurface.phase === '26', 'Phase 26 closure candidate outcome must declare phase 26');
assert(outcomeSurface.component === 'scanops_bridge_retry_result_final_review_closure_candidate_outcome_surface', 'Phase 26 must expose the expected component id');
assert(outcomeSurface.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_STATUSES.READY, 'Phase 26 must be ready for Phase 25 candidate summary items');
assert(outcomeSurface.consumesPhase25FinalReviewClosureCandidateSummarySurface === true, 'Phase 26 must consume Phase 25 closure candidate summary surface');
assert(outcomeSurface.outcomeMode === 'LOCAL_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_DESCRIPTOR_ONLY', 'Phase 26 must be descriptor-only');
assert(outcomeSurface.localOutcomeOnly === true && outcomeSurface.descriptorOnly === true && outcomeSurface.displayOnly === true, 'Phase 26 must be display-only');
assert(outcomeSurface.closureApplicationAllowed === false && outcomeSurface.closureApplied === false, 'Phase 26 must not apply closure');
assert(outcomeSurface.outcomePersistenceAllowed === false && outcomeSurface.outcomePersistenceApplied === false, 'Phase 26 must not persist outcomes');
assert(outcomeSurface.queueWriteAllowed === false && outcomeSurface.queueWriteApplied === false, 'Phase 26 must not write queue state');
assert(outcomeSurface.retryApplied === false && outcomeSurface.secondRetryApplied === false && outcomeSurface.automaticSecondRetryEnabled === false, 'Phase 26 must not apply retry or second retry');
assert(outcomeSurface.backgroundRetryEnabled === false, 'Phase 26 must not enable background retry');
assert(outcomeSurface.inventoryMutationAttempted === false, 'Phase 26 must not mutate Inventory truth');
assert(outcomeSurface.stockMutationAttempted === false && outcomeSurface.priceMutationAttempted === false && outcomeSurface.ledgerMutationAttempted === false && outcomeSurface.approvalMutationAttempted === false, 'Phase 26 must not mutate stock, price, ledger, or approvals');
assert(outcomeSurface.closureCandidateOutcomeItemCount === 4, 'Phase 26 must expose one outcome item per Phase 25 candidate summary item');
assert(outcomeSurface.readyForLaterClosureReviewCount === 1, 'Phase 26 must count ready-later outcomes');
assert(outcomeSurface.keepReviewOpenBeforeClosureCount === 1, 'Phase 26 must count keep-open outcomes');
assert(outcomeSurface.acknowledgementResolutionBeforeClosureCount === 1, 'Phase 26 must count acknowledgement-first outcomes');
assert(outcomeSurface.finalReviewBeforeClosureCount === 1, 'Phase 26 must count final-review-first outcomes');
assert(outcomeSurface.displayOnlyCount === 4, 'Phase 26 outcome items must remain display-only');
assert(Object.isFrozen(outcomeSurface.closureCandidateOutcomeItems), 'Phase 26 outcome items array must be immutable');
assert(outcomeSurface.closureCandidateOutcomeItems.some((item) => item.outcomeDescriptor === 'Ready for later closure review'), 'Phase 26 must describe ready-later state');
assert(outcomeSurface.closureCandidateOutcomeItems.some((item) => item.outcomeDescriptor === 'Keep review open before closure'), 'Phase 26 must describe keep-open state');
assert(outcomeSurface.closureCandidateOutcomeItems.some((item) => item.outcomeDescriptor === 'Resolve acknowledgement before closure'), 'Phase 26 must describe acknowledgement-first state');
assert(outcomeSurface.closureCandidateOutcomeItems.some((item) => item.outcomeDescriptor === 'Complete final review before closure'), 'Phase 26 must describe final-review-first state');

const validEmptyPhase25Summary = Object.freeze({
  phase: '25',
  component: 'scanops_bridge_retry_result_final_review_closure_candidate_summary_surface',
  status: 'RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_SUMMARY_EMPTY',
  closureCandidateSummaryItems: Object.freeze([]),
});
const emptyOutcome = buildScanOpsRetryResultFinalReviewClosureCandidateOutcomeSurface(validEmptyPhase25Summary, { now: () => fixedNow });
assert(emptyOutcome.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_STATUSES.EMPTY, 'Phase 26 must expose empty status only for a valid empty Phase 25 candidate summary surface');

const missingOutcome = buildScanOpsRetryResultFinalReviewClosureCandidateOutcomeSurface(undefined, { now: () => fixedNow });
assert(missingOutcome.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_STATUSES.BLOCKED, 'Phase 26 must block missing Phase 25 candidate summary input');
assert(missingOutcome.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_BLOCKERS.CANDIDATE_SUMMARY_REQUIRED), 'Phase 26 must report missing Phase 25 candidate summary blocker');

const uninitializedOutcome = buildScanOpsRetryResultFinalReviewClosureCandidateOutcomeSurface({}, { now: () => fixedNow });
assert(uninitializedOutcome.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_STATUSES.BLOCKED, 'Phase 26 must block uninitialized candidate summary objects');
assert(uninitializedOutcome.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_BLOCKERS.CANDIDATE_SUMMARY_REQUIRED), 'Phase 26 must not treat {} as a valid empty candidate summary');

const wrongComponentOutcome = buildScanOpsRetryResultFinalReviewClosureCandidateOutcomeSurface({ phase: '25', component: 'wrong', closureCandidateSummaryItems: [] }, { now: () => fixedNow });
assert(wrongComponentOutcome.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_STATUSES.BLOCKED, 'Phase 26 must block non-Phase 25 candidate summary-shaped inputs');

const blockedApplyOutcome = buildScanOpsRetryResultFinalReviewClosureCandidateOutcomeSurface(candidateSummarySurface, { applyOutcome: true, now: () => fixedNow });
assert(blockedApplyOutcome.status === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_STATUSES.BLOCKED, 'Phase 26 must block outcome application');
assert(blockedApplyOutcome.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_BLOCKERS.OUTCOME_APPLICATION_BLOCKED), 'Phase 26 must report outcome application blocker');

const blockedClosure = buildScanOpsRetryResultFinalReviewClosureCandidateOutcomeSurface(candidateSummarySurface, { applyClosure: true, now: () => fixedNow });
assert(blockedClosure.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_BLOCKERS.CLOSURE_APPLICATION_BLOCKED), 'Phase 26 must block closure application');

const blockedPersistence = buildScanOpsRetryResultFinalReviewClosureCandidateOutcomeSurface(candidateSummarySurface, { persistOutcome: true, now: () => fixedNow });
assert(blockedPersistence.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_BLOCKERS.PERSISTENCE_BLOCKED), 'Phase 26 must block persistence');

const blockedRetry = buildScanOpsRetryResultFinalReviewClosureCandidateOutcomeSurface(candidateSummarySurface, { executeRetry: true, now: () => fixedNow });
assert(blockedRetry.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_BLOCKERS.SECOND_RETRY_BLOCKED), 'Phase 26 must block retry execution');

const blockedQueueWrite = buildScanOpsRetryResultFinalReviewClosureCandidateOutcomeSurface(candidateSummarySurface, { applyQueueWrites: true, now: () => fixedNow });
assert(blockedQueueWrite.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CLOSURE_CANDIDATE_OUTCOME_BLOCKERS.QUEUE_WRITE_BLOCKED), 'Phase 26 must block queue writes');

const moduleFile = read('src/inventory-bridge/retryResultFinalReviewClosureCandidateOutcome/index.js');
const componentFile = read('src/components/scanner/RetryResultFinalReviewClosureCandidateOutcomeSurface.jsx');

assert(componentFile.includes('buildScanOpsRetryResultFinalReviewClosureCandidateOutcomeSurface'), 'Phase 26 UI component must build the outcome surface');
assert(componentFile.includes('Retry Result Final Review Closure Candidate Outcome Surface'), 'Phase 26 UI component must expose outcome copy');
assert(componentFile.includes('Closure candidate outcome descriptors only'), 'Phase 26 UI component must state the descriptor boundary');
assert(componentFile.includes('No closure is applied, persisted, written to the queue, retried, or sent to Inventory.'), 'Phase 26 UI component must state Phase 26 guardrails');
assert(moduleFile.includes('isValidPhase25'), 'Phase 26 module must require an initialized Phase 25 candidate summary surface');
assert(moduleFile.includes('scanops_bridge_retry_result_final_review_closure_candidate_summary_surface'), 'Phase 26 module must require the Phase 25 component id');

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
  assert(!forbidden.pattern.test(moduleFile), `Phase 26 closure candidate outcome surface must not contain ${forbidden.label}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 26 retry result final review closure candidate outcome surface validates required Phase 25 candidate summary input, display-only outcome descriptors, no closure application, no persistence, no queue writes, no second retry/background replay, and no Inventory/stock/price/ledger/approval mutation.');
