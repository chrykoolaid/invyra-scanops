import {
  acceptScanOpsBridgeGate,
  assertNoScanOpsBridgeGateAcceptanceOperationalMutation,
  getScanOpsBridgeGateAcceptanceSafeSummary,
  validateScanOpsBridgeGate,
} from '../src/lib/inventoryBridge/bridgeGateAcceptance.js';

const inventoryBridgeGate = Object.freeze({
  ok: true,
  schema_version: '1.0.0',
  phase: '1D-D-AB',
  contract_version: '1.0.0',
  bridge_protocol_version: '1.0.0',
  code: 'INVENTORY_BRIDGE_GATE_PROJECTED',
  status: 'BRIDGE_GATE_LOCKED_PENDING_EXPLICIT_ENFORCEMENT',
  source_device_id: 'SCANOPS-DEVICE-001',
  environment: 'LIVE',
  store_id: 'STORE-001',
  inventory_instance_id: 'INV-INSTANCE-001',
  relay_instance_ref: 'BASE44-CLOUD-RELAY-PROTOTYPE',
  handshake_evidence_closed: true,
  bridge_gate_locked: true,
  explicit_future_enforcement_phase_required: true,
  relay_enforcement_allowed: false,
  relay_transport_allowed: false,
  event_transport_allowed: false,
  event_sync_allowed: false,
  event_ingestion_allowed: false,
  inventory_mutation_allowed: false,
  ingestion_validation_still_required_per_event: true,
  evidence_projection_only: true,
  projected_at: '2026-06-20T06:00:00.000Z',
});

const localScope = Object.freeze({
  source_device_id: 'SCANOPS-DEVICE-001',
  environment: 'LIVE',
  store_id: 'STORE-001',
  inventory_instance_id: 'INV-INSTANCE-001',
  relay_instance_ref: 'BASE44-CLOUD-RELAY-PROTOTYPE',
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function assertRejected(gate, expectedCode, label) {
  const result = acceptScanOpsBridgeGate(gate, localScope, { accepted_at: '2026-06-20T07:00:00.000Z' });
  assertEqual(result.ok, false, `${label}.ok`);
  assertEqual(result.code, expectedCode, `${label}.code`);
  assertEqual(result.local_state.relay_enforcement_allowed, false, `${label}.relay_enforcement_allowed`);
  assertEqual(result.local_state.relay_transport_allowed, false, `${label}.relay_transport_allowed`);
  assertEqual(result.local_state.event_transport_allowed, false, `${label}.event_transport_allowed`);
  assertEqual(result.local_state.event_sync_allowed, false, `${label}.event_sync_allowed`);
  assertEqual(result.local_state.event_ingestion_allowed, false, `${label}.event_ingestion_allowed`);
}

function main() {
  const validation = validateScanOpsBridgeGate(inventoryBridgeGate, localScope);
  assertEqual(validation.ok, true, 'validation.ok');
  assertEqual(validation.code, 'BRIDGE_GATE_VALID', 'validation.code');

  const accepted = acceptScanOpsBridgeGate(inventoryBridgeGate, localScope, {
    accepted_at: '2026-06-20T07:00:00.000Z',
  });
  assertEqual(accepted.ok, true, 'accepted.ok');
  assertEqual(accepted.code, 'SCANOPS_BRIDGE_GATE_ACCEPTED', 'accepted.code');
  assertEqual(accepted.local_state.status, 'BRIDGE_GATE_ACCEPTED_LOCKED_PENDING_EXPLICIT_ENFORCEMENT', 'local_state.status');
  assertEqual(accepted.local_state.bridge_gate_locked, true, 'local_state.bridge_gate_locked');
  assertEqual(accepted.local_state.explicit_future_enforcement_phase_required, true, 'local_state.explicit_future_enforcement_phase_required');
  assertEqual(accepted.local_state.relay_enforcement_allowed, false, 'local_state.relay_enforcement_allowed');
  assertEqual(accepted.local_state.relay_transport_allowed, false, 'local_state.relay_transport_allowed');
  assertEqual(accepted.local_state.event_transport_allowed, false, 'local_state.event_transport_allowed');
  assertEqual(accepted.local_state.event_sync_allowed, false, 'local_state.event_sync_allowed');
  assertEqual(accepted.local_state.event_ingestion_allowed, false, 'local_state.event_ingestion_allowed');
  assertEqual(accepted.local_state.can_sync_events, false, 'local_state.can_sync_events');
  assertEqual(accepted.local_state.can_start_relay_transport, false, 'local_state.can_start_relay_transport');
  assertEqual(accepted.local_state.can_enable_event_transport, false, 'local_state.can_enable_event_transport');
  assertEqual(accepted.local_state.can_call_inventory_ingestion, false, 'local_state.can_call_inventory_ingestion');
  assertEqual(accepted.local_state.can_write_event_outbox, false, 'local_state.can_write_event_outbox');
  assertEqual(accepted.local_state.can_write_local_storage, false, 'local_state.can_write_local_storage');

  const summary = getScanOpsBridgeGateAcceptanceSafeSummary(accepted);
  assertEqual(summary.local_status, 'BRIDGE_GATE_ACCEPTED_LOCKED_PENDING_EXPLICIT_ENFORCEMENT', 'summary.local_status');
  assertEqual(summary.bridge_gate_locked, true, 'summary.bridge_gate_locked');
  assertEqual(summary.explicit_future_enforcement_phase_required, true, 'summary.explicit_future_enforcement_phase_required');
  assertEqual(summary.relay_enforcement_allowed, false, 'summary.relay_enforcement_allowed');
  assertEqual(summary.event_sync_allowed, false, 'summary.event_sync_allowed');
  assertEqual(summary.event_ingestion_allowed, false, 'summary.event_ingestion_allowed');

  assertRejected({ ...inventoryBridgeGate, phase: '1D-D-Z' }, 'BRIDGE_GATE_PHASE_MISMATCH', 'phase mismatch rejected');
  assertRejected({ ...inventoryBridgeGate, status: 'BRIDGE_GATE_BLOCKED' }, 'BRIDGE_GATE_STATUS_INVALID', 'wrong status rejected');
  assertRejected({ ...inventoryBridgeGate, source_device_id: 'SCANOPS-OTHER' }, 'BRIDGE_GATE_DEVICE_MISMATCH', 'device mismatch rejected');
  assertRejected({ ...inventoryBridgeGate, bridge_gate_locked: false }, 'BRIDGE_GATE_NOT_LOCKED', 'gate not locked rejected');
  assertRejected({ ...inventoryBridgeGate, explicit_future_enforcement_phase_required: false }, 'EXPLICIT_ENFORCEMENT_PHASE_NOT_REQUIRED', 'future enforcement requirement rejected');
  assertRejected({ ...inventoryBridgeGate, event_sync_allowed: true }, 'EVENT_SYNC_ALREADY_ALLOWED', 'event sync allowed rejected');
  assertRejected({ ...inventoryBridgeGate, event_ingestion_allowed: true }, 'EVENT_INGESTION_ALREADY_ALLOWED', 'event ingestion allowed rejected');

  const guardrails = assertNoScanOpsBridgeGateAcceptanceOperationalMutation();
  assertEqual(guardrails.scanops_bridge_gate_acceptance_projection_only, true, 'guardrails.projection_only');
  assertEqual(guardrails.local_validator_only, true, 'guardrails.local_validator_only');
  assertEqual(guardrails.no_relay_enforcement, true, 'guardrails.no_relay_enforcement');
  assertEqual(guardrails.no_event_sync, true, 'guardrails.no_event_sync');
  assertEqual(guardrails.no_event_transport, true, 'guardrails.no_event_transport');

  console.log('ScanOps bridge gate acceptance validation PASS');
}

try {
  main();
} catch (error) {
  console.error('ScanOps bridge gate acceptance validation FAIL');
  console.error(error);
  process.exitCode = 1;
}
