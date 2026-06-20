import {
  acceptScanOpsGateRequirementsAck,
  assertNoScanOpsGateRequirementsAckOperationalMutation,
  getScanOpsGateRequirementsAckSafeSummary,
  validateScanOpsGateRequirementsAck,
} from '../src/lib/inventoryBridge/gateRequirementsAck.js';

const manifest = Object.freeze({
  schema_version: '1.0.0',
  phase: '1D-D-AD',
  bridge_protocol_version: '1.0.0',
  code: 'INVENTORY_BRIDGE_GATE_REQUIREMENTS_PROJECTED',
  status: 'BRIDGE_GATE_REQUIREMENTS_PROJECTED_LOCKED',
  source_device_id: 'SCANOPS-DEVICE-001',
  environment: 'LIVE',
  store_id: 'STORE-001',
  inventory_instance_id: 'INV-INSTANCE-001',
  bridge_gate_locked: true,
  later_release_phase_required: true,
  requirements: ['separate_release_phase_required', 'scope_recheck_required'],
  requirement_count: 2,
  relay_transport_allowed: false,
  event_transport_allowed: false,
  event_sync_allowed: false,
  event_ingestion_allowed: false,
  inventory_mutation_allowed: false,
  evidence_projection_only: true,
  projected_at: '2026-06-20T08:00:00.000Z',
});

const scope = Object.freeze({
  source_device_id: 'SCANOPS-DEVICE-001',
  environment: 'LIVE',
  store_id: 'STORE-001',
  inventory_instance_id: 'INV-INSTANCE-001',
});

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
}

function reject(changed, expectedCode, label) {
  const result = acceptScanOpsGateRequirementsAck(changed, scope, { accepted_at: '2026-06-20T09:00:00.000Z' });
  assertEqual(result.ok, false, `${label}.ok`);
  assertEqual(result.code, expectedCode, `${label}.code`);
  assertEqual(result.local_state.capabilities_enabled, false, `${label}.capabilities_enabled`);
}

function main() {
  const validation = validateScanOpsGateRequirementsAck(manifest, scope);
  assertEqual(validation.ok, true, 'validation.ok');
  assertEqual(validation.code, 'GATE_REQUIREMENTS_ACK_VALID', 'validation.code');

  const accepted = acceptScanOpsGateRequirementsAck(manifest, scope, { accepted_at: '2026-06-20T09:00:00.000Z' });
  assertEqual(accepted.ok, true, 'accepted.ok');
  assertEqual(accepted.code, 'SCANOPS_GATE_REQUIREMENTS_ACCEPTED', 'accepted.code');
  assertEqual(accepted.local_state.status, 'GATE_REQUIREMENTS_ACCEPTED_LOCKED_PENDING_RELEASE', 'state.status');
  assertEqual(accepted.local_state.bridge_gate_locked, true, 'state.bridge_gate_locked');
  assertEqual(accepted.local_state.later_release_required, true, 'state.later_release_required');
  assertEqual(accepted.local_state.requirement_count, 2, 'state.requirement_count');
  assertEqual(accepted.local_state.capabilities_enabled, false, 'state.capabilities_enabled');
  assertEqual(accepted.local_state.evidence_projection_only, true, 'state.evidence_projection_only');

  const summary = getScanOpsGateRequirementsAckSafeSummary(accepted);
  assertEqual(summary.local_status, 'GATE_REQUIREMENTS_ACCEPTED_LOCKED_PENDING_RELEASE', 'summary.local_status');
  assertEqual(summary.capabilities_enabled, false, 'summary.capabilities_enabled');
  assertEqual(summary.requirement_count, 2, 'summary.requirement_count');

  reject({ ...manifest, phase: '1D-D-AB' }, 'GATE_REQUIREMENTS_PHASE_MISMATCH', 'phase mismatch rejected');
  reject({ ...manifest, status: 'BRIDGE_GATE_REQUIREMENTS_BLOCKED' }, 'GATE_REQUIREMENTS_STATUS_MISMATCH', 'status mismatch rejected');
  reject({ ...manifest, requirements: [], requirement_count: 0 }, 'GATE_REQUIREMENTS_LIST_MISSING', 'requirements missing rejected');
  reject({ ...manifest, source_device_id: 'SCANOPS-OTHER' }, 'GATE_REQUIREMENTS_SCOPE_MISMATCH', 'scope mismatch rejected');
  reject({ ...manifest, event_sync_allowed: true }, 'GATE_REQUIREMENTS_CAPABILITY_ENABLED', 'capability enabled rejected');
  reject({ ...manifest, inventory_mutation_allowed: true }, 'GATE_REQUIREMENTS_CAPABILITY_ENABLED', 'inventory capability rejected');

  const guardrails = assertNoScanOpsGateRequirementsAckOperationalMutation();
  assertEqual(guardrails.projection_only, true, 'guardrails.projection_only');
  assertEqual(guardrails.local_validator_only, true, 'guardrails.local_validator_only');
  assertEqual(guardrails.no_operational_activation, true, 'guardrails.no_operational_activation');
  assertEqual(guardrails.no_persistence_write, true, 'guardrails.no_persistence_write');
  assertEqual(guardrails.no_inventory_write, true, 'guardrails.no_inventory_write');

  console.log('ScanOps gate requirements acknowledgement validation PASS');
}

try {
  main();
} catch (error) {
  console.error('ScanOps gate requirements acknowledgement validation FAIL');
  console.error(error);
  process.exitCode = 1;
}
