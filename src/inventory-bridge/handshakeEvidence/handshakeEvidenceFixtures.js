export const SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_PHASE = '9B/9D';
export const SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_COMPONENT = 'scanops_bridge_test_training_handshake_evidence';

export const SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_STATUSES = Object.freeze({
  EVIDENCE_READY: 'EVIDENCE_READY',
  BLOCKED: 'BLOCKED',
  READ_ONLY: 'READ_ONLY',
});

export const SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS = Object.freeze({
  LIVE_BLOCKED: 'live_environment_blocked',
  PRODUCTION_BLOCKED: 'production_environment_blocked',
  UNKNOWN_ENVIRONMENT: 'unknown_environment_blocked',
  REQUIRED_FIELDS_MISSING: 'required_fields_missing',
  DISPATCH_BLOCKED: 'dispatch_blocked_in_phase_9',
  INVENTORY_CALL_BLOCKED: 'inventory_call_blocked_in_phase_9',
  PERSIST_BLOCKED: 'persist_blocked_in_phase_9',
  WRITE_BLOCKED: 'write_blocked_in_phase_9',
  MUTATION_BLOCKED: 'mutation_blocked_in_phase_9',
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
    evidence_descriptor: freezeObject(fixture.evidence_descriptor),
    expected: Object.freeze({
      ...fixture.expected,
      blocked_reasons: freezeArray(fixture.expected.blocked_reasons),
    }),
  });
}

const BASE_EVIDENCE_DESCRIPTOR = Object.freeze({
  evidence_id: 'scanops-handshake-evidence-v1',
  phase: SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_PHASE,
  source_system: 'SCANOPS',
  source_device_id: 'scanops-device-placeholder',
  source_store_id: 'store-placeholder',
  target_system: 'INVENTORY',
  training_gate: 'REQUIRED',
  evidence_profile: 'STRICT_STATIC_EVIDENCE',
  candidate_id: 'candidate-placeholder',
  candidate_key: 'candidate-key-placeholder',
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

export const SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_REQUIRED_FIELDS = Object.freeze([
  'evidence_id',
  'environment',
  'source_system',
  'source_device_id',
  'source_store_id',
  'target_system',
  'training_gate',
  'evidence_profile',
  'candidate_id',
  'candidate_key',
]);

export const SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_FIXTURES = Object.freeze([
  freezeFixture({
    fixture_id: 'live_evidence_blocked',
    description: 'LIVE ScanOps evidence remains blocked.',
    evidence_descriptor: {
      ...BASE_EVIDENCE_DESCRIPTOR,
      evidence_id: 'scanops-live-evidence-blocked-v1',
      environment: 'LIVE',
    },
    expected: {
      ...REQUIRED_EVIDENCE_ONLY_EXPECTATION,
      environment: 'LIVE',
      evidence_status: SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_STATUSES.BLOCKED,
      live_blocked: true,
      can_build_evidence: false,
      required_fields_present: true,
      blocked_reasons: [
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.LIVE_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.DISPATCH_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.INVENTORY_CALL_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.PERSIST_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.WRITE_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.MUTATION_BLOCKED,
      ],
    },
  }),
  freezeFixture({
    fixture_id: 'training_evidence_ready',
    description: 'TRAINING ScanOps evidence may be built as evidence only.',
    evidence_descriptor: {
      ...BASE_EVIDENCE_DESCRIPTOR,
      evidence_id: 'scanops-training-evidence-v1',
      environment: 'TRAINING',
    },
    expected: {
      ...REQUIRED_EVIDENCE_ONLY_EXPECTATION,
      environment: 'TRAINING',
      evidence_status: SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_STATUSES.EVIDENCE_READY,
      live_blocked: false,
      can_build_evidence: true,
      required_fields_present: true,
      blocked_reasons: [
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.DISPATCH_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.INVENTORY_CALL_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.PERSIST_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.WRITE_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.MUTATION_BLOCKED,
      ],
    },
  }),
  freezeFixture({
    fixture_id: 'test_evidence_ready',
    description: 'TEST ScanOps evidence may be built as evidence only.',
    evidence_descriptor: {
      ...BASE_EVIDENCE_DESCRIPTOR,
      evidence_id: 'scanops-test-evidence-v1',
      environment: 'TEST',
    },
    expected: {
      ...REQUIRED_EVIDENCE_ONLY_EXPECTATION,
      environment: 'TEST',
      evidence_status: SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_STATUSES.EVIDENCE_READY,
      live_blocked: false,
      can_build_evidence: true,
      required_fields_present: true,
      blocked_reasons: [
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.DISPATCH_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.INVENTORY_CALL_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.PERSIST_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.WRITE_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.MUTATION_BLOCKED,
      ],
    },
  }),
  freezeFixture({
    fixture_id: 'production_evidence_blocked',
    description: 'PRODUCTION ScanOps evidence remains blocked.',
    evidence_descriptor: {
      ...BASE_EVIDENCE_DESCRIPTOR,
      evidence_id: 'scanops-production-evidence-blocked-v1',
      environment: 'PRODUCTION',
    },
    expected: {
      ...REQUIRED_EVIDENCE_ONLY_EXPECTATION,
      environment: 'PRODUCTION',
      evidence_status: SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_STATUSES.BLOCKED,
      live_blocked: true,
      can_build_evidence: false,
      required_fields_present: true,
      blocked_reasons: [
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.PRODUCTION_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.DISPATCH_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.INVENTORY_CALL_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.PERSIST_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.WRITE_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.MUTATION_BLOCKED,
      ],
    },
  }),
  freezeFixture({
    fixture_id: 'missing_required_field_blocked',
    description: 'Missing candidate key blocks ScanOps evidence.',
    evidence_descriptor: {
      ...BASE_EVIDENCE_DESCRIPTOR,
      evidence_id: 'scanops-missing-field-evidence-blocked-v1',
      environment: 'TRAINING',
      candidate_key: '',
    },
    expected: {
      ...REQUIRED_EVIDENCE_ONLY_EXPECTATION,
      environment: 'TRAINING',
      evidence_status: SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_STATUSES.BLOCKED,
      live_blocked: false,
      can_build_evidence: false,
      required_fields_present: false,
      blocked_reasons: [
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.REQUIRED_FIELDS_MISSING,
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.DISPATCH_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.INVENTORY_CALL_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.PERSIST_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.WRITE_BLOCKED,
        SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_BLOCKERS.MUTATION_BLOCKED,
      ],
    },
  }),
]);
