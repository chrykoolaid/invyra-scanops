import {
  acceptScanOpsReleaseBlocker,
  assertNoScanOpsReleaseBlockerAcceptanceOperationalMutation,
  getScanOpsReleaseBlockerAcceptanceSafeSummary,
  validateScanOpsReleaseBlockerAcceptance,
} from '../src/lib/inventoryBridge/releaseBlockerAcceptance.js';

const releaseBlocker = Object.freeze({
  ok: true,
  schema_version: '1.0.0',
  phase: '1D-D-AF',
  bridge_protocol_version: '1.0.0',
  code: 'INVENTORY_BRIDGE_RELEASE_BLOCKER_PROJECTED',
  status: 'BRIDGE_RELEASE_BLOCKED_PENDING_EXPLICIT_RELEASE_PLAN',
  source_device_id: 'SCANOPS-DEVICE-001',
  environment: 'LIVE',
  store_id: 'STORE-001',
  inventory_instance_id: 'INV-INSTANCE-001',
  source_requirements_phase: '1D-D-AD',
  source_ack_phase: '1D-D-AE',
  scanops_ack_status: 'GATE_REQUIREMENTS_ACCEPTED_LOCKED_PENDING_RELEASE',
  bridge_gate_locked: true,
  release_allowed: false,
  release_plan_required: true,
  blockers: ['explicit_release_plan_missing', 'event_transport_not_released'],
  blocker_count: 2,
  relay_enforcement_allowed: false,
  relay_transport_allowed: false,
  event_transport_allowed: false,
  event_sync_allowed: false,
  event_ingestion_allowed: false,
  inventory_mutation_allowed: false,
  evidence_projection_only: true,
  projected_at: '2026-06-20T10:00:00.000Z',
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

function reject(blocker, expectedCode, label) {
  const result = acceptScanOpsReleaseBlocker(blocker, scope, { accepted_at: '2026-06-20T11:00:00.000Z' });
  assertEqual(result.ok, false, `${label}.ok`);
  assertEqual(result.code, expectedCode, `${label}.code`);
  assertEqual(result.local_state.release_allowed, false, `${label}.release_allowed`);
  assertEqual(result.local_state.capabilities_enabled, false, `${label}.capabilities_enabled`);
}

function main() {
  const validation = validateScanOpsReleaseBlockerAcceptance(releaseBlocker, scope);
  assertEqual(validation.ok, true, 'validation.ok');
  assertEqual(validation.code, 'RELEASE_BLOCKER_ACCEPTANCE_VALID', 'validation.code');

  const accepted = acceptScanOpsReleaseBlocker(releaseBlocker, scope, { accepted_at: '2026-06-20T11:00:00.000Z' });
  assertEqual(accepted.ok, true, 'accepted.ok');
  assertEqual(accepted.code, 'SCANOPS_RELEASE_BLOCKER_ACCEPTED', 'accepted.code');
  assertEqual(accepted.local_state.status, 'RELEASE_BLOCKER_ACCEPTED_LOCKED_PENDING_RELEASE_PLAN', 'state.status');
  assertEqual(accepted.local_state.inventory_release_blocker_phase, '1D-D-AF', 'state.inventory_release_blocker_phase');
  assertEqual(accepted.local_state.bridge_gate_locked, true, 'state.bridge_gate_locked');
  assertEqual(accepted.local_state.release_allowed, false, 'state.release_allowed');
  assertEqual(accepted.local_state.release_plan_required, true, 'state.release_plan_required');
  assertEqual(accepted.local_state.blocker_count, 2, 'state.blocker_count');
  assertEqual(accepted.local_state.capabilities_enabled, false, 'state.capabilities_enabled');
  assertEqual(accepted.local_state.evidence_projection_only, true, 'state.evidence_projection_only');

  const summary = getScanOpsReleaseBlockerAcceptanceSafeSummary(accepted);
  assertEqual(summary.local_status, 'RELEASE_BLOCKER_ACCEPTED_LOCKED_PENDING_RELEASE_PLAN', 'summary.local_status');
  assertEqual(summary.release_allowed, false, 'summary.release_allowed');
  assertEqual(summary.release_plan_required, true, 'summary.release_plan_required');
  assertEqual(summary.capabilities_enabled, false, 'summary.capabilities_enabled');
  assertEqual(summary.blocker_count, 2, 'summary.blocker_count');

  reject({ ...releaseBlocker, phase: '1D-D-AD' }, 'RELEASE_BLOCKER_PHASE_MISMATCH', 'phase mismatch rejected');
  reject({ ...releaseBlocker, status: 'BRIDGE_RELEASE_ALLOWED' }, 'RELEASE_BLOCKER_STATUS_MISMATCH', 'status mismatch rejected');
  reject({ ...releaseBlocker, release_allowed: true }, 'RELEASE_BLOCKER_RELEASE_ALLOWED', 'release allowed rejected');
  reject({ ...releaseBlocker, blockers: [], blocker_count: 0 }, 'RELEASE_BLOCKER_LIST_MISSING', 'blocker list missing rejected');
  reject({ ...releaseBlocker, source_device_id: 'SCANOPS-OTHER' }, 'RELEASE_BLOCKER_SCOPE_MISMATCH', 'scope mismatch rejected');
  reject({ ...releaseBlocker, event_sync_allowed: true }, 'RELEASE_BLOCKER_CAPABILITY_ENABLED', 'event sync capability rejected');
  reject({ ...releaseBlocker, inventory_mutation_allowed: true }, 'RELEASE_BLOCKER_CAPABILITY_ENABLED', 'inventory capability rejected');

  const guardrails = assertNoScanOpsReleaseBlockerAcceptanceOperationalMutation();
  assertEqual(guardrails.projection_only, true, 'guardrails.projection_only');
  assertEqual(guardrails.local_validator_only, true, 'guardrails.local_validator_only');
  assertEqual(guardrails.release_blocker_acceptance_only, true, 'guardrails.release_blocker_acceptance_only');
  assertEqual(guardrails.no_operational_activation, true, 'guardrails.no_operational_activation');
  assertEqual(guardrails.no_relay_enforcement, true, 'guardrails.no_relay_enforcement');
  assertEqual(guardrails.no_relay_transport, true, 'guardrails.no_relay_transport');
  assertEqual(guardrails.no_event_transport, true, 'guardrails.no_event_transport');
  assertEqual(guardrails.no_event_sync, true, 'guardrails.no_event_sync');
  assertEqual(guardrails.no_event_ingestion, true, 'guardrails.no_event_ingestion');
  assertEqual(guardrails.no_persistence_write, true, 'guardrails.no_persistence_write');
  assertEqual(guardrails.no_inventory_write, true, 'guardrails.no_inventory_write');

  console.log('ScanOps release blocker acceptance validation PASS');
}

try {
  main();
} catch (error) {
  console.error('ScanOps release blocker acceptance validation FAIL');
  console.error(error);
  process.exitCode = 1;
}
