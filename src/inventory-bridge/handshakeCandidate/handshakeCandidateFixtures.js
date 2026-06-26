export const SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_PHASE = '8B/8D';
export const SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_COMPONENT = 'scanops_bridge_test_training_handshake_candidate';

export const SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_STATUSES = Object.freeze({
  CANDIDATE_READY: 'CANDIDATE_READY',
  BLOCKED: 'BLOCKED',
  READ_ONLY: 'READ_ONLY',
});

export const SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS = Object.freeze({
  LIVE_BLOCKED: 'live_environment_blocked',
  PRODUCTION_BLOCKED: 'production_environment_blocked',
  UNKNOWN_ENVIRONMENT: 'unknown_environment_blocked',
  DISPATCH_BLOCKED: 'dispatch_blocked_in_phase_8',
  INVENTORY_CALL_BLOCKED: 'inventory_call_blocked_in_phase_8',
  PERSIST_BLOCKED: 'persist_blocked_in_phase_8',
  WRITE_BLOCKED: 'write_blocked_in_phase_8',
  MUTATION_BLOCKED: 'mutation_blocked_in_phase_8',
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
    candidate_descriptor: freezeObject(fixture.candidate_descriptor),
    expected: Object.freeze({
      ...fixture.expected,
      blocked_reasons: freezeArray(fixture.expected.blocked_reasons),
    }),
  });
}

const BASE_CANDIDATE_DESCRIPTOR = Object.freeze({
  candidate_id: 'scanops-handshake-candidate-v1',
  phase: SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_PHASE,
  source_system: 'SCANOPS',
  source_device_id: 'scanops-device-placeholder',
  source_store_id: 'store-placeholder',
  target_system: 'INVENTORY',
  requested_capability: 'HANDSHAKE_CANDIDATE_EVIDENCE_ONLY',
  training_gate: 'REQUIRED',
  evidence_profile: 'STATIC_CANDIDATE_ONLY',
});

const REQUIRED_EVIDENCE_ONLY_EXPECTATION = Object.freeze({
  evidence_only: true,
  capture_only: true,
  can_dispatch: false,
  can_call_inventory: false,
  can_persist: false,
  can_write: false,
  can_mutate: false,
  dispatched: false,
  inventory_called: false,
  persisted: false,
  receipt_emitted: false,
  acknowledgement_emitted: false,
  write_attempted: false,
  mutation_attempted: false,
});

export const SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_FIXTURES = Object.freeze([
  freezeFixture({
    fixture_id: 'live_candidate_blocked',
    description: 'LIVE ScanOps candidate remains blocked.',
    candidate_descriptor: {
      ...BASE_CANDIDATE_DESCRIPTOR,
      candidate_id: 'scanops-live-candidate-blocked-v1',
      environment: 'LIVE',
    },
    expected: {
      ...REQUIRED_EVIDENCE_ONLY_EXPECTATION,
      environment: 'LIVE',
      candidate_status: SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_STATUSES.BLOCKED,
      live_blocked: true,
      can_generate_candidate: false,
      blocked_reasons: [
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.LIVE_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.DISPATCH_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.INVENTORY_CALL_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.PERSIST_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.WRITE_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.MUTATION_BLOCKED,
      ],
    },
  }),
  freezeFixture({
    fixture_id: 'training_candidate_ready',
    description: 'TRAINING ScanOps candidate may be generated as evidence only.',
    candidate_descriptor: {
      ...BASE_CANDIDATE_DESCRIPTOR,
      candidate_id: 'scanops-training-candidate-v1',
      environment: 'TRAINING',
    },
    expected: {
      ...REQUIRED_EVIDENCE_ONLY_EXPECTATION,
      environment: 'TRAINING',
      candidate_status: SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_STATUSES.CANDIDATE_READY,
      live_blocked: false,
      can_generate_candidate: true,
      blocked_reasons: [
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.DISPATCH_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.INVENTORY_CALL_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.PERSIST_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.WRITE_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.MUTATION_BLOCKED,
      ],
    },
  }),
  freezeFixture({
    fixture_id: 'test_candidate_ready',
    description: 'TEST ScanOps candidate may be generated as evidence only.',
    candidate_descriptor: {
      ...BASE_CANDIDATE_DESCRIPTOR,
      candidate_id: 'scanops-test-candidate-v1',
      environment: 'TEST',
    },
    expected: {
      ...REQUIRED_EVIDENCE_ONLY_EXPECTATION,
      environment: 'TEST',
      candidate_status: SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_STATUSES.CANDIDATE_READY,
      live_blocked: false,
      can_generate_candidate: true,
      blocked_reasons: [
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.DISPATCH_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.INVENTORY_CALL_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.PERSIST_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.WRITE_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.MUTATION_BLOCKED,
      ],
    },
  }),
  freezeFixture({
    fixture_id: 'production_candidate_blocked',
    description: 'PRODUCTION ScanOps candidate remains blocked.',
    candidate_descriptor: {
      ...BASE_CANDIDATE_DESCRIPTOR,
      candidate_id: 'scanops-production-candidate-blocked-v1',
      environment: 'PRODUCTION',
    },
    expected: {
      ...REQUIRED_EVIDENCE_ONLY_EXPECTATION,
      environment: 'PRODUCTION',
      candidate_status: SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_STATUSES.BLOCKED,
      live_blocked: true,
      can_generate_candidate: false,
      blocked_reasons: [
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.PRODUCTION_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.DISPATCH_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.INVENTORY_CALL_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.PERSIST_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.WRITE_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.MUTATION_BLOCKED,
      ],
    },
  }),
  freezeFixture({
    fixture_id: 'unknown_candidate_blocked',
    description: 'UNKNOWN ScanOps candidate remains blocked.',
    candidate_descriptor: {
      ...BASE_CANDIDATE_DESCRIPTOR,
      candidate_id: 'scanops-unknown-candidate-blocked-v1',
      environment: 'UNKNOWN',
    },
    expected: {
      ...REQUIRED_EVIDENCE_ONLY_EXPECTATION,
      environment: 'UNKNOWN',
      candidate_status: SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_STATUSES.BLOCKED,
      live_blocked: false,
      can_generate_candidate: false,
      blocked_reasons: [
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.UNKNOWN_ENVIRONMENT,
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.DISPATCH_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.INVENTORY_CALL_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.PERSIST_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.WRITE_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.MUTATION_BLOCKED,
      ],
    },
  }),
]);
