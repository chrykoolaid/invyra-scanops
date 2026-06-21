import {
  acceptScanOpsStackEvidence,
  assertNoScanOpsStackEvidenceAcceptanceOperationalMutation,
  getScanOpsStackEvidenceAcceptanceSafeSummary,
  validateScanOpsStackEvidenceAcceptance,
} from '../src/lib/inventoryBridge/stackEvidenceAcceptance.js';

const stackEvidence = Object.freeze({
  ok: true,
  schema_version: '1.0.0',
  phase: '1D-D-AJ',
  bridge_protocol_version: '1.0.0',
  code: 'INVENTORY_BRIDGE_STACK_EVIDENCE_PROJECTED',
  status: 'BRIDGE_STACK_EVIDENCE_PROJECTED_LOCKED_NON_OPERATIONAL',
  source_device_id: 'SCANOPS-DEVICE-001',
  environment: 'LIVE',
  store_id: 'STORE-001',
  inventory_instance_id: 'INV-INSTANCE-001',
  bridge_gate_locked: true,
  operationally_enabled: false,
  required_phases: ['1D-D-U', '1D-D-V', '1D-D-AI'],
  required_phase_count: 3,
  relay_enforcement_allowed: false,
  relay_transport_allowed: false,
  event_transport_allowed: false,
  event_sync_allowed: false,
  event_ingestion_allowed: false,
  inventory_mutation_allowed: false,
  evidence_projection_only: true,
  projected_at: '2026-06-20T14:00:00.000Z',
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
  const result = acceptScanOpsStackEvidence(manifest, scope, { accepted_at: '2026-06-20T15:00:00.000Z' });
  assertEqual(result.ok, false, `${label}.ok`);
  assertEqual(result.code, expectedCode, `${label}.code`);
  assertEqual(result.local_state.operationally_enabled, false, `${label}.operationally_enabled`);
  assertEqual(result.local_state.capabilities_enabled, false, `${label}.capabilities_enabled`);
}

function main() {
  const validation = validateScanOpsStackEvidenceAcceptance(stackEvidence, scope);
  assertEqual(validation.ok, true, 'validation.ok');
  assertEqual(validation.code, 'STACK_EVIDENCE_ACCEPTANCE_VALID', 'validation.code');

  const accepted = acceptScanOpsStackEvidence(stackEvidence, scope, { accepted_at: '2026-06-20T15:00:00.000Z' });
  assertEqual(accepted.ok, true, 'accepted.ok');
  assertEqual(accepted.code, 'SCANOPS_STACK_EVIDENCE_ACCEPTED', 'accepted.code');
  assertEqual(accepted.local_state.status, 'STACK_EVIDENCE_ACCEPTED_LOCKED_NON_OPERATIONAL', 'state.status');
  assertEqual(accepted.local_state.inventory_stack_evidence_phase, '1D-D-AJ', 'state.inventory_stack_evidence_phase');
  assertEqual(accepted.local_state.bridge_gate_locked, true, 'state.bridge_gate_locked');
  assertEqual(accepted.local_state.operationally_enabled, false, 'state.operationally_enabled');
  assertEqual(accepted.local_state.required_phase_count, 3, 'state.required_phase_count');
  assertEqual(accepted.local_state.capabilities_enabled, false, 'state.capabilities_enabled');
  assertEqual(accepted.local_state.evidence_projection_only, true, 'state.evidence_projection_only');

  const summary = getScanOpsStackEvidenceAcceptanceSafeSummary(accepted);
  assertEqual(summary.local_status, 'STACK_EVIDENCE_ACCEPTED_LOCKED_NON_OPERATIONAL', 'summary.local_status');
  assertEqual(summary.operationally_enabled, false, 'summary.operationally_enabled');
  assertEqual(summary.capabilities_enabled, false, 'summary.capabilities_enabled');
  assertEqual(summary.required_phase_count, 3, 'summary.required_phase_count');

  reject({ ...stackEvidence, phase: '1D-D-AH' }, 'STACK_EVIDENCE_PHASE_MISMATCH', 'phase mismatch rejected');
  reject({ ...stackEvidence, status: 'BRIDGE_STACK_EVIDENCE_OPEN' }, 'STACK_EVIDENCE_STATUS_MISMATCH', 'status mismatch rejected');
  reject({ ...stackEvidence, operationally_enabled: true }, 'STACK_EVIDENCE_OPERATIONAL_ENABLED', 'operational enabled rejected');
  reject({ ...stackEvidence, required_phases: [], required_phase_count: 0 }, 'STACK_EVIDENCE_PHASE_LIST_MISSING', 'phase list missing rejected');
  reject({ ...stackEvidence, source_device_id: 'SCANOPS-OTHER' }, 'STACK_EVIDENCE_SCOPE_MISMATCH', 'scope mismatch rejected');
  reject({ ...stackEvidence, event_sync_allowed: true }, 'STACK_EVIDENCE_CAPABILITY_ENABLED', 'event sync capability rejected');
  reject({ ...stackEvidence, inventory_mutation_allowed: true }, 'STACK_EVIDENCE_CAPABILITY_ENABLED', 'inventory capability rejected');

  const guardrails = assertNoScanOpsStackEvidenceAcceptanceOperationalMutation();
  assertEqual(guardrails.projection_only, true, 'guardrails.projection_only');
  assertEqual(guardrails.local_validator_only, true, 'guardrails.local_validator_only');
  assertEqual(guardrails.stack_evidence_acceptance_only, true, 'guardrails.stack_evidence_acceptance_only');
  assertEqual(guardrails.non_operational, true, 'guardrails.non_operational');
  assertEqual(guardrails.no_operational_activation, true, 'guardrails.no_operational_activation');
  assertEqual(guardrails.no_relay_enforcement, true, 'guardrails.no_relay_enforcement');
  assertEqual(guardrails.no_event_sync, true, 'guardrails.no_event_sync');
  assertEqual(guardrails.no_event_ingestion, true, 'guardrails.no_event_ingestion');
  assertEqual(guardrails.no_persistence_write, true, 'guardrails.no_persistence_write');
  assertEqual(guardrails.no_inventory_write, true, 'guardrails.no_inventory_write');

  console.log('ScanOps stack evidence acceptance validation PASS');
}

try {
  main();
} catch (error) {
  console.error('ScanOps stack evidence acceptance validation FAIL');
  console.error(error);
  process.exitCode = 1;
}
