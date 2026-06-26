export const SCANOPS_BRIDGE_TRAINING_HANDSHAKE_PHASE = '7B/7D';
export const SCANOPS_BRIDGE_TRAINING_HANDSHAKE_COMPONENT = 'scanops_bridge_test_training_handshake_preparation';

export const SCANOPS_BRIDGE_TRAINING_HANDSHAKE_STATUSES = Object.freeze({
  PREPARATION_ALLOWED: 'PREPARATION_ALLOWED',
  BLOCKED: 'BLOCKED',
  READ_ONLY: 'READ_ONLY',
});

export const SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS = Object.freeze({
  LIVE_BLOCKED: 'live_environment_blocked',
  PRODUCTION_BLOCKED: 'production_environment_blocked',
  UNKNOWN_ENVIRONMENT: 'unknown_environment_blocked',
  PRODUCTION_ACTIVATION_BLOCKED: 'production_activation_blocked',
  DISPATCH_BLOCKED: 'dispatch_blocked_in_phase_7',
  INVENTORY_CALL_BLOCKED: 'inventory_call_blocked_in_phase_7',
  OUTBOX_BLOCKED: 'outbox_processing_blocked_in_phase_7',
  RECEIPT_BLOCKED: 'receipt_blocked_in_phase_7',
  ACKNOWLEDGEMENT_BLOCKED: 'acknowledgement_blocked_in_phase_7',
  WRITE_BLOCKED: 'write_blocked_in_phase_7',
  MUTATION_BLOCKED: 'mutation_blocked_in_phase_7',
});

function freezeArray(values) {
  return Object.freeze([...(values || [])]);
}

function freezeObject(value) {
  return Object.freeze({ ...(value || {}) });
}

function freezeFixture(fixture) {
  return Object.freeze({
    ...fixture,
    handshake_descriptor: freezeObject(fixture.handshake_descriptor),
    expected: Object.freeze({
      ...fixture.expected,
      blocked_reasons: freezeArray(fixture.expected.blocked_reasons),
    }),
  });
}

const REQUIRED_NON_OPERATIONAL_EXPECTATION = Object.freeze({
  capture_only: true,
  non_production_only: true,
  can_dispatch: false,
  can_call_inventory: false,
  can_process_outbox: false,
  can_replay: false,
  can_emit_receipt: false,
  can_emit_acknowledgement: false,
  can_write: false,
  can_mutate: false,
  dispatch_attempted: false,
  inventory_call_attempted: false,
  outbox_processing_attempted: false,
  replay_attempted: false,
  receipt_emitted: false,
  acknowledgement_emitted: false,
  write_attempted: false,
  mutation_attempted: false,
});

const BASE_HANDSHAKE_DESCRIPTOR = Object.freeze({
  handshake_id: 'scanops-training-handshake-prep-v1',
  handshake_mode: 'TEST_TRAINING_PREPARATION_ONLY',
  source_system: 'SCANOPS',
  source_device_id: 'scanops-device-placeholder',
  source_store_id: 'store-placeholder',
  target_system: 'INVENTORY',
  requested_capability: 'HANDSHAKE_READINESS_ONLY',
  training_gate: 'REQUIRED',
  operator_role: 'ADMIN_OR_DEV_ONLY',
  evidence_profile: 'STATIC_DESCRIPTOR_ONLY',
});

export const SCANOPS_BRIDGE_TRAINING_HANDSHAKE_FIXTURES = Object.freeze([
  freezeFixture({
    fixture_id: 'live_handshake_blocked',
    description: 'LIVE ScanOps handshake preparation remains blocked.',
    handshake_descriptor: {
      ...BASE_HANDSHAKE_DESCRIPTOR,
      handshake_id: 'scanops-live-handshake-blocked-v1',
      environment: 'LIVE',
    },
    expected: {
      ...REQUIRED_NON_OPERATIONAL_EXPECTATION,
      environment: 'LIVE',
      handshake_preparation_status: SCANOPS_BRIDGE_TRAINING_HANDSHAKE_STATUSES.BLOCKED,
      live_blocked: true,
      can_prepare_handshake: false,
      blocked_reasons: [
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.LIVE_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.PRODUCTION_ACTIVATION_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.DISPATCH_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.INVENTORY_CALL_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.OUTBOX_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.RECEIPT_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.ACKNOWLEDGEMENT_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.WRITE_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.MUTATION_BLOCKED,
      ],
    },
  }),
  freezeFixture({
    fixture_id: 'training_handshake_preparation_allowed',
    description: 'TRAINING ScanOps handshake preparation is allowed as readiness evidence only.',
    handshake_descriptor: {
      ...BASE_HANDSHAKE_DESCRIPTOR,
      handshake_id: 'scanops-training-handshake-prep-v1',
      environment: 'TRAINING',
    },
    expected: {
      ...REQUIRED_NON_OPERATIONAL_EXPECTATION,
      environment: 'TRAINING',
      handshake_preparation_status: SCANOPS_BRIDGE_TRAINING_HANDSHAKE_STATUSES.PREPARATION_ALLOWED,
      live_blocked: false,
      can_prepare_handshake: true,
      blocked_reasons: [
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.PRODUCTION_ACTIVATION_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.DISPATCH_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.INVENTORY_CALL_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.OUTBOX_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.RECEIPT_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.ACKNOWLEDGEMENT_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.WRITE_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.MUTATION_BLOCKED,
      ],
    },
  }),
  freezeFixture({
    fixture_id: 'test_handshake_preparation_allowed',
    description: 'TEST ScanOps handshake preparation is allowed as readiness evidence only.',
    handshake_descriptor: {
      ...BASE_HANDSHAKE_DESCRIPTOR,
      handshake_id: 'scanops-test-handshake-prep-v1',
      environment: 'TEST',
    },
    expected: {
      ...REQUIRED_NON_OPERATIONAL_EXPECTATION,
      environment: 'TEST',
      handshake_preparation_status: SCANOPS_BRIDGE_TRAINING_HANDSHAKE_STATUSES.PREPARATION_ALLOWED,
      live_blocked: false,
      can_prepare_handshake: true,
      blocked_reasons: [
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.PRODUCTION_ACTIVATION_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.DISPATCH_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.INVENTORY_CALL_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.OUTBOX_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.RECEIPT_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.ACKNOWLEDGEMENT_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.WRITE_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.MUTATION_BLOCKED,
      ],
    },
  }),
  freezeFixture({
    fixture_id: 'production_alias_handshake_blocked',
    description: 'PRODUCTION alias is treated as LIVE and blocked.',
    handshake_descriptor: {
      ...BASE_HANDSHAKE_DESCRIPTOR,
      handshake_id: 'scanops-production-handshake-blocked-v1',
      environment: 'PRODUCTION',
    },
    expected: {
      ...REQUIRED_NON_OPERATIONAL_EXPECTATION,
      environment: 'PRODUCTION',
      handshake_preparation_status: SCANOPS_BRIDGE_TRAINING_HANDSHAKE_STATUSES.BLOCKED,
      live_blocked: true,
      can_prepare_handshake: false,
      blocked_reasons: [
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.PRODUCTION_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.PRODUCTION_ACTIVATION_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.DISPATCH_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.INVENTORY_CALL_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.OUTBOX_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.RECEIPT_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.ACKNOWLEDGEMENT_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.WRITE_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.MUTATION_BLOCKED,
      ],
    },
  }),
  freezeFixture({
    fixture_id: 'unknown_environment_handshake_blocked',
    description: 'Unknown environment is blocked for ScanOps handshake preparation.',
    handshake_descriptor: {
      ...BASE_HANDSHAKE_DESCRIPTOR,
      handshake_id: 'scanops-unknown-handshake-blocked-v1',
      environment: 'UNKNOWN',
    },
    expected: {
      ...REQUIRED_NON_OPERATIONAL_EXPECTATION,
      environment: 'UNKNOWN',
      handshake_preparation_status: SCANOPS_BRIDGE_TRAINING_HANDSHAKE_STATUSES.BLOCKED,
      live_blocked: false,
      can_prepare_handshake: false,
      blocked_reasons: [
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.UNKNOWN_ENVIRONMENT,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.PRODUCTION_ACTIVATION_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.DISPATCH_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.INVENTORY_CALL_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.OUTBOX_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.RECEIPT_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.ACKNOWLEDGEMENT_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.WRITE_BLOCKED,
        SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.MUTATION_BLOCKED,
      ],
    },
  }),
]);
