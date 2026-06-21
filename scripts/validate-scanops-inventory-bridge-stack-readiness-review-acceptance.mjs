import {
  acceptScanOpsStackReadinessReview,
  assertNoScanOpsStackReadinessReviewAcceptanceOperationalMutation,
  getScanOpsStackReadinessReviewAcceptanceSafeSummary,
  validateScanOpsStackReadinessReviewAcceptance,
} from '../src/lib/inventoryBridge/stackReadinessReviewAcceptance.js';

const readinessReviewManifest = Object.freeze({
  ok: true,
  schema_version: '1.0.0',
  phase: '1D-D-AL',
  bridge_protocol_version: '1.0.0',
  code: 'INVENTORY_BRIDGE_STACK_READINESS_REVIEW_PROJECTED',
  status: 'BRIDGE_STACK_READINESS_REVIEW_PROJECTED_LOCKED_NON_OPERATIONAL',
  source_device_id: 'SCANOPS-DEVICE-001',
  environment: 'LIVE',
  store_id: 'STORE-001',
  inventory_instance_id: 'INV-INSTANCE-001',
  inventory_stack_evidence_phase: '1D-D-AJ',
  scanops_stack_acceptance_phase: '1D-D-AK',
  scanops_acceptance_status: 'STACK_EVIDENCE_ACCEPTED_LOCKED_NON_OPERATIONAL',
  bridge_gate_locked: true,
  ready_for_ordered_review: true,
  merge_allowed: false,
  release_allowed: false,
  runtime_activation_allowed: false,
  operationally_enabled: false,
  review_order: [
    'Inventory PR #1 / 1D-D-U relay admission evidence projection',
    'ScanOps PR #1 / 1D-D-V relay admission evidence acceptance',
    'ScanOps PR #2 / 1D-D-W relay readiness preflight projection',
    'Inventory PR #2 / 1D-D-X relay readiness preflight acceptance',
    'ScanOps PR #3 / 1D-D-Y relay enforcement candidate acceptance',
    'Inventory PR #3 / 1D-D-Z relay handshake evidence projection',
    'ScanOps PR #4 / 1D-D-AA handshake evidence acceptance',
    'Inventory PR #4 / 1D-D-AB bridge gate projection',
    'ScanOps PR #5 / 1D-D-AC bridge gate acceptance',
    'Inventory PR #5 / 1D-D-AD bridge gate requirements manifest',
    'ScanOps PR #6 / 1D-D-AE gate requirements acknowledgement',
    'Inventory PR #6 / 1D-D-AF bridge release blocker projection',
    'ScanOps PR #7 / 1D-D-AG release blocker acceptance',
    'Inventory PR #7 / 1D-D-AH release plan draft projection',
    'ScanOps PR #8 / 1D-D-AI release plan draft acceptance',
    'Inventory PR #8 / 1D-D-AJ stack evidence manifest projection',
    'ScanOps PR #9 / 1D-D-AK stack evidence acceptance',
    'Inventory PR / 1D-D-AL stack readiness review manifest projection',
  ],
  review_order_count: 18,
  relay_enforcement_allowed: false,
  relay_transport_allowed: false,
  event_transport_allowed: false,
  event_sync_allowed: false,
  event_ingestion_allowed: false,
  inventory_mutation_allowed: false,
  evidence_projection_only: true,
  projected_at: '2026-06-20T16:00:00.000Z',
});

const scope = Object.freeze({
  source_device_id: 'SCANOPS-DEVICE-001',
  environment: 'LIVE',
  store_id: 'STORE-001',
  inventory_instance_id: 'INV-INSTANCE-001',
});

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function reject(manifest, expectedCode, label) {
  const result = acceptScanOpsStackReadinessReview(manifest, scope, {
    accepted_at: '2026-06-20T17:00:00.000Z',
  });
  assertEqual(result.ok, false, `${label}.ok`);
  assertEqual(result.code, expectedCode, `${label}.code`);
  assertEqual(result.local_state.ready_for_ordered_review, false, `${label}.ready_for_ordered_review`);
  assertEqual(result.local_state.merge_allowed, false, `${label}.merge_allowed`);
  assertEqual(result.local_state.runtime_activation_allowed, false, `${label}.runtime_activation_allowed`);
  assertEqual(result.local_state.operationally_enabled, false, `${label}.operationally_enabled`);
}

function main() {
  const validation = validateScanOpsStackReadinessReviewAcceptance(readinessReviewManifest, scope);
  assertEqual(validation.ok, true, 'validation.ok');
  assertEqual(validation.code, 'STACK_READINESS_REVIEW_ACCEPTANCE_VALID', 'validation.code');

  const accepted = acceptScanOpsStackReadinessReview(readinessReviewManifest, scope, {
    accepted_at: '2026-06-20T17:00:00.000Z',
  });
  assertEqual(accepted.ok, true, 'accepted.ok');
  assertEqual(accepted.code, 'SCANOPS_STACK_READINESS_REVIEW_ACCEPTED', 'accepted.code');
  assertEqual(accepted.local_state.status, 'STACK_READINESS_REVIEW_ACCEPTED_LOCKED_NON_OPERATIONAL', 'accepted.local_state.status');
  assertEqual(accepted.local_state.inventory_stack_readiness_review_phase, '1D-D-AL', 'accepted.local_state.inventory_stack_readiness_review_phase');
  assertEqual(accepted.local_state.bridge_gate_locked, true, 'accepted.local_state.bridge_gate_locked');
  assertEqual(accepted.local_state.ready_for_ordered_review, true, 'accepted.local_state.ready_for_ordered_review');
  assertEqual(accepted.local_state.merge_allowed, false, 'accepted.local_state.merge_allowed');
  assertEqual(accepted.local_state.release_allowed, false, 'accepted.local_state.release_allowed');
  assertEqual(accepted.local_state.runtime_activation_allowed, false, 'accepted.local_state.runtime_activation_allowed');
  assertEqual(accepted.local_state.operationally_enabled, false, 'accepted.local_state.operationally_enabled');
  assertEqual(accepted.local_state.review_order_count, 18, 'accepted.local_state.review_order_count');
  assertEqual(accepted.local_state.capabilities_enabled, false, 'accepted.local_state.capabilities_enabled');

  const summary = getScanOpsStackReadinessReviewAcceptanceSafeSummary(accepted);
  assertEqual(summary.local_status, 'STACK_READINESS_REVIEW_ACCEPTED_LOCKED_NON_OPERATIONAL', 'summary.local_status');
  assertEqual(summary.ready_for_ordered_review, true, 'summary.ready_for_ordered_review');
  assertEqual(summary.merge_allowed, false, 'summary.merge_allowed');
  assertEqual(summary.runtime_activation_allowed, false, 'summary.runtime_activation_allowed');

  reject({ ...readinessReviewManifest, phase: '1D-D-AJ' }, 'STACK_READINESS_REVIEW_PHASE_MISMATCH', 'phase mismatch blocked');
  reject({ ...readinessReviewManifest, status: 'BRIDGE_STACK_READINESS_REVIEW_OPEN' }, 'STACK_READINESS_REVIEW_STATUS_MISMATCH', 'status mismatch blocked');
  reject({ ...readinessReviewManifest, ready_for_ordered_review: false }, 'STACK_READINESS_REVIEW_STATUS_MISMATCH', 'not ready blocked');
  reject({ ...readinessReviewManifest, operationally_enabled: true }, 'STACK_READINESS_REVIEW_OPERATIONAL_ENABLED', 'operational enabled blocked');
  reject({ ...readinessReviewManifest, runtime_activation_allowed: true }, 'STACK_READINESS_REVIEW_OPERATIONAL_ENABLED', 'runtime activation blocked');
  reject({ ...readinessReviewManifest, merge_allowed: true }, 'STACK_READINESS_REVIEW_MERGE_OR_RELEASE_ENABLED', 'merge enabled blocked');
  reject({ ...readinessReviewManifest, release_allowed: true }, 'STACK_READINESS_REVIEW_MERGE_OR_RELEASE_ENABLED', 'release enabled blocked');
  reject({ ...readinessReviewManifest, review_order: [], review_order_count: 0 }, 'STACK_READINESS_REVIEW_ORDER_MISSING', 'review order missing blocked');
  reject({ ...readinessReviewManifest, source_device_id: 'SCANOPS-OTHER' }, 'STACK_READINESS_REVIEW_SCOPE_MISMATCH', 'scope mismatch blocked');
  reject({ ...readinessReviewManifest, event_sync_allowed: true }, 'STACK_READINESS_REVIEW_CAPABILITY_ENABLED', 'capability enabled blocked');

  const guardrails = assertNoScanOpsStackReadinessReviewAcceptanceOperationalMutation();
  assertEqual(guardrails.projection_only, true, 'guardrails.projection_only');
  assertEqual(guardrails.local_validator_only, true, 'guardrails.local_validator_only');
  assertEqual(guardrails.readiness_review_acceptance_only, true, 'guardrails.readiness_review_acceptance_only');
  assertEqual(guardrails.non_operational, true, 'guardrails.non_operational');
  assertEqual(guardrails.merge_allowed, false, 'guardrails.merge_allowed');
  assertEqual(guardrails.release_allowed, false, 'guardrails.release_allowed');
  assertEqual(guardrails.runtime_activation_allowed, false, 'guardrails.runtime_activation_allowed');
  assertEqual(guardrails.no_event_sync, true, 'guardrails.no_event_sync');
  assertEqual(guardrails.no_event_ingestion, true, 'guardrails.no_event_ingestion');
  assertEqual(guardrails.no_persistence_write, true, 'guardrails.no_persistence_write');

  console.log('ScanOps stack readiness review acceptance validation PASS');
}

try {
  main();
} catch (error) {
  console.error('ScanOps stack readiness review acceptance validation FAIL');
  console.error(error);
  process.exitCode = 1;
}
