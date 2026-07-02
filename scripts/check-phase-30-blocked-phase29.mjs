import {
  SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_STATUSES,
  buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSurface,
} from '../src/inventory-bridge/retryResultFinalReviewCandidateSnapshotReadinessOutcome/index.js';

const phase29Summary = Object.freeze({
  phase: '29',
  component: 'scanops_bridge_retry_result_final_review_candidate_snapshot_readiness_summary_surface',
  status: 'RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_SUMMARY_BLOCKED',
  snapshotReadinessSummaryItems: Object.freeze([]),
});

const outcome = buildScanOpsRetryResultFinalReviewCandidateSnapshotReadinessOutcomeSurface(phase29Summary, {
  now: () => '2026-07-02T00:00:00.000Z',
});

if (outcome.status !== SCANOPS_BRIDGE_RETRY_RESULT_FINAL_REVIEW_CANDIDATE_SNAPSHOT_READINESS_OUTCOME_STATUSES.BLOCKED) {
  console.error('Phase 30 must not accept a blocked Phase 29 summary.');
  process.exit(1);
}

console.log('Phase 30 blocked Phase 29 regression check passed.');
