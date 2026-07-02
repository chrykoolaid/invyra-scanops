import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BLOCKERS,
  STATUSES,
  buildScanOpsRetryResultFinalReviewCandidateClosureReadinessHandoffSurface,
} from '../src/inventory-bridge/retryResultFinalReviewCandidateClosureReadinessHandoff/index.js';

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
  phase: '31',
  component: 'scanops_bridge_retry_result_final_review_candidate_snapshot_readiness_outcome_summary_surface',
  status: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_SUMMARY_READY',
  snapshotReadinessOutcomeSummaryItems: Object.freeze([
    Object.freeze({ candidateSnapshotReadinessOutcomeSummaryId: 'summary:item-1', queueItemId: 'item-1', readyForLaterClosureReview: true, keepReviewOpenBeforeClosure: false, acknowledgementResolutionBeforeClosure: false, finalReviewBeforeClosure: false, queueWriteApplied: false, closureApplied: false, summaryPersistenceApplied: false }),
    Object.freeze({ candidateSnapshotReadinessOutcomeSummaryId: 'summary:item-2', queueItemId: 'item-2', readyForLaterClosureReview: false, keepReviewOpenBeforeClosure: true, acknowledgementResolutionBeforeClosure: false, finalReviewBeforeClosure: false, queueWriteApplied: false, closureApplied: false, summaryPersistenceApplied: false }),
    Object.freeze({ candidateSnapshotReadinessOutcomeSummaryId: 'summary:item-3', queueItemId: 'item-3', readyForLaterClosureReview: false, keepReviewOpenBeforeClosure: false, acknowledgementResolutionBeforeClosure: true, finalReviewBeforeClosure: false, queueWriteApplied: false, closureApplied: false, summaryPersistenceApplied: false }),
    Object.freeze({ candidateSnapshotReadinessOutcomeSummaryId: 'summary:item-4', queueItemId: 'item-4', readyForLaterClosureReview: false, keepReviewOpenBeforeClosure: false, acknowledgementResolutionBeforeClosure: false, finalReviewBeforeClosure: true, queueWriteApplied: false, closureApplied: false, summaryPersistenceApplied: false }),
  ]),
});

const handoffSurface = buildScanOpsRetryResultFinalReviewCandidateClosureReadinessHandoffSurface(outcomeSummarySurface, { now: () => fixedNow });

assert(handoffSurface.phase === '32', 'Phase 32 handoff must declare phase 32');
assert(handoffSurface.component === 'scanops_bridge_retry_result_final_review_candidate_closure_readiness_handoff_surface', 'Phase 32 must expose expected component id');
assert(handoffSurface.status === STATUSES.READY, 'Phase 32 must be ready for Phase 31 summary items');
assert(handoffSurface.consumesPhase31CandidateSnapshotReadinessOutcomeSummarySurface === true, 'Phase 32 must consume Phase 31 summary surface');
assert(handoffSurface.handoffMode === 'LOCAL_CLOSURE_READINESS_HANDOFF_ONLY', 'Phase 32 must be local handoff only');
assert(handoffSurface.localHandoffOnly === true && handoffSurface.displayOnly === true, 'Phase 32 must be display-only');
assert(handoffSurface.closureApplicationAllowed === false && handoffSurface.closureApplied === false, 'Phase 32 must not apply closure');
assert(handoffSurface.handoffPersistenceAllowed === false && handoffSurface.handoffPersistenceApplied === false, 'Phase 32 must not persist handoff state');
assert(handoffSurface.queueWriteAllowed === false && handoffSurface.queueWriteApplied === false, 'Phase 32 must not write queue state');
assert(handoffSurface.retryApplied === false && handoffSurface.secondRetryApplied === false && handoffSurface.automaticSecondRetryEnabled === false, 'Phase 32 must not apply retry or second retry');
assert(handoffSurface.backgroundRetryEnabled === false, 'Phase 32 must not enable background retry');
assert(handoffSurface.inventoryMutationAttempted === false, 'Phase 32 must not mutate Inventory truth');
assert(handoffSurface.stockMutationAttempted === false && handoffSurface.priceMutationAttempted === false && handoffSurface.ledgerMutationAttempted === false && handoffSurface.approvalMutationAttempted === false, 'Phase 32 must not mutate stock, price, ledger, or approvals');
assert(handoffSurface.closureReadinessHandoffItemCount === 4, 'Phase 32 must expose one handoff item per Phase 31 summary item');
assert(handoffSurface.readyLaterHandoffCount === 1, 'Phase 32 must count ready-later handoffs');
assert(handoffSurface.keepOpenBlockedHandoffCount === 1, 'Phase 32 must count keep-open blockers');
assert(handoffSurface.acknowledgementBlockedHandoffCount === 1, 'Phase 32 must count acknowledgement blockers');
assert(handoffSurface.finalReviewBlockedHandoffCount === 1, 'Phase 32 must count final-review blockers');
assert(handoffSurface.allReadyForLaterClosureHandoff === false, 'Phase 32 must not mark all-ready while blockers remain');
assert(handoffSurface.displayOnlyCount === 4, 'Phase 32 handoff items must remain display-only');
assert(Object.isFrozen(handoffSurface.closureReadinessHandoffItems), 'Phase 32 handoff items array must be immutable');
assert(handoffSurface.closureReadinessHandoffItems.some((item) => item.handoffStatus === 'Ready for future scoped closure review handoff'), 'Phase 32 must expose ready-later handoff state');
assert(handoffSurface.closureReadinessHandoffItems.some((item) => item.handoffStatus === 'Handoff blocked: keep review open'), 'Phase 32 must expose keep-open blocker state');
assert(handoffSurface.closureReadinessHandoffItems.some((item) => item.handoffStatus === 'Handoff blocked: acknowledgement first'), 'Phase 32 must expose acknowledgement blocker state');
assert(handoffSurface.closureReadinessHandoffItems.some((item) => item.handoffStatus === 'Handoff blocked: final review first'), 'Phase 32 must expose final-review blocker state');

const allReadySurface = buildScanOpsRetryResultFinalReviewCandidateClosureReadinessHandoffSurface({
  phase: '31',
  component: 'scanops_bridge_retry_result_final_review_candidate_snapshot_readiness_outcome_summary_surface',
  snapshotReadinessOutcomeSummaryItems: outcomeSummarySurface.snapshotReadinessOutcomeSummaryItems.map((item) => Object.freeze({ ...item, readyForLaterClosureReview: true, keepReviewOpenBeforeClosure: false, acknowledgementResolutionBeforeClosure: false, finalReviewBeforeClosure: false })),
}, { now: () => fixedNow });
assert(allReadySurface.allReadyForLaterClosureHandoff === true, 'Phase 32 may mark all-ready only when every handoff item is ready-later');
assert(allReadySurface.closureApplied === false && allReadySurface.queueWriteApplied === false, 'All-ready Phase 32 handoff must still not close or queue-write');

const emptyInput = Object.freeze({ phase: '31', component: 'scanops_bridge_retry_result_final_review_candidate_snapshot_readiness_outcome_summary_surface', snapshotReadinessOutcomeSummaryItems: Object.freeze([]) });
const emptyHandoff = buildScanOpsRetryResultFinalReviewCandidateClosureReadinessHandoffSurface(emptyInput, { now: () => fixedNow });
assert(emptyHandoff.status === STATUSES.EMPTY, 'Phase 32 must expose empty status only for a valid empty Phase 31 summary surface');

const missingHandoff = buildScanOpsRetryResultFinalReviewCandidateClosureReadinessHandoffSurface(undefined, { now: () => fixedNow });
assert(missingHandoff.status === STATUSES.BLOCKED, 'Phase 32 must block missing Phase 31 summary input');
assert(missingHandoff.errors.some((error) => error.code === BLOCKERS.OUTCOME_SUMMARY_REQUIRED), 'Phase 32 must report missing Phase 31 summary blocker');

const uninitializedHandoff = buildScanOpsRetryResultFinalReviewCandidateClosureReadinessHandoffSurface({}, { now: () => fixedNow });
assert(uninitializedHandoff.status === STATUSES.BLOCKED, 'Phase 32 must block uninitialized summary objects');
assert(uninitializedHandoff.errors.some((error) => error.code === BLOCKERS.OUTCOME_SUMMARY_REQUIRED), 'Phase 32 must not treat {} as valid empty input');

const wrongComponentHandoff = buildScanOpsRetryResultFinalReviewCandidateClosureReadinessHandoffSurface({ phase: '31', component: 'wrong', snapshotReadinessOutcomeSummaryItems: [] }, { now: () => fixedNow });
assert(wrongComponentHandoff.status === STATUSES.BLOCKED, 'Phase 32 must block non-Phase 31 summary-shaped inputs');

const blockedApply = buildScanOpsRetryResultFinalReviewCandidateClosureReadinessHandoffSurface(outcomeSummarySurface, { applyHandoff: true, now: () => fixedNow });
assert(blockedApply.status === STATUSES.BLOCKED, 'Phase 32 must block handoff application');
assert(blockedApply.errors.some((error) => error.code === BLOCKERS.HANDOFF_APPLICATION_BLOCKED), 'Phase 32 must report handoff application blocker');

const blockedClosure = buildScanOpsRetryResultFinalReviewCandidateClosureReadinessHandoffSurface(outcomeSummarySurface, { applyClosure: true, now: () => fixedNow });
assert(blockedClosure.errors.some((error) => error.code === BLOCKERS.CLOSURE_APPLICATION_BLOCKED), 'Phase 32 must block closure application');

const blockedPersistence = buildScanOpsRetryResultFinalReviewCandidateClosureReadinessHandoffSurface(outcomeSummarySurface, { persistHandoff: true, now: () => fixedNow });
assert(blockedPersistence.errors.some((error) => error.code === BLOCKERS.PERSISTENCE_BLOCKED), 'Phase 32 must block persistence');

const blockedRetry = buildScanOpsRetryResultFinalReviewCandidateClosureReadinessHandoffSurface(outcomeSummarySurface, { executeRetry: true, now: () => fixedNow });
assert(blockedRetry.errors.some((error) => error.code === BLOCKERS.SECOND_RETRY_BLOCKED), 'Phase 32 must block retry execution');

const blockedQueueWrite = buildScanOpsRetryResultFinalReviewCandidateClosureReadinessHandoffSurface(outcomeSummarySurface, { applyQueueWrites: true, now: () => fixedNow });
assert(blockedQueueWrite.errors.some((error) => error.code === BLOCKERS.QUEUE_WRITE_BLOCKED), 'Phase 32 must block queue writes');

const moduleFile = read('src/inventory-bridge/retryResultFinalReviewCandidateClosureReadinessHandoff/index.js');
const componentFile = read('src/components/scanner/RetryResultFinalReviewCandidateClosureReadinessHandoffSurface.jsx');

assert(componentFile.includes('buildScanOpsRetryResultFinalReviewCandidateClosureReadinessHandoffSurface'), 'Phase 32 UI component must build the handoff surface');
assert(componentFile.includes('Retry Result Final Review Candidate Closure Readiness Handoff Surface'), 'Phase 32 UI component must expose handoff copy');
assert(componentFile.includes('Closure readiness handoff only'), 'Phase 32 UI component must state the handoff boundary');
assert(componentFile.includes('No application, persistence, queue write, retry, or Inventory mutation is allowed.'), 'Phase 32 UI component must state guardrails');
assert(moduleFile.includes('validInput'), 'Phase 32 module must require an initialized Phase 31 summary surface');
assert(moduleFile.includes('scanops_bridge_retry_result_final_review_candidate_snapshot_readiness_outcome_summary_surface'), 'Phase 32 module must require the Phase 31 component id');

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
  assert(!forbidden.pattern.test(moduleFile), `Phase 32 closure readiness handoff surface must not contain ${forbidden.label}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 32 retry result final review candidate closure readiness handoff surface validates required Phase 31 summary input, display-only handoff state, no closure application, no persistence, no queue writes, no second retry/background replay, and no Inventory/stock/price/ledger/approval mutation.');
