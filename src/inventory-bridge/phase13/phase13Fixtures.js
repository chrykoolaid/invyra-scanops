export const SCANOPS_PHASE13 = '13B/13D';
export const SCANOPS_PHASE13_COMPONENT = 'scanops_phase13_local_handshake_candidate';

export const SCANOPS_PHASE13_STATUS = Object.freeze({
  CANDIDATE: 'LOCAL_HANDSHAKE_CANDIDATE_ONLY',
  BLOCKED: 'BLOCKED',
});

export const SCANOPS_PHASE13_REQUIRED_FIELDS = Object.freeze([
  'handshake_id',
  'environment',
  'runner_id',
  'runner_key',
  'handoff_id',
  'source_system',
  'source_device_id',
  'source_store_id',
  'target_system',
  'local_endpoint_id',
  'handshake_gate',
  'handshake_profile',
]);

const BASE = Object.freeze({
  handshake_id: 'scanops-phase13-handshake',
  runner_id: 'scanops-phase12-runner',
  runner_key: 'runner-key-placeholder',
  handoff_id: 'scanops-phase11-handoff',
  source_system: 'SCANOPS',
  source_device_id: 'scanops-device-placeholder',
  source_store_id: 'store-placeholder',
  target_system: 'INVENTORY',
  local_endpoint_id: 'local-endpoint-placeholder',
  handshake_gate: 'REQUIRED',
  handshake_profile: 'STRICT_STATIC_LOCAL_HANDSHAKE',
});

function freezeFixture(fixture) {
  return Object.freeze({
    ...fixture,
    descriptor: Object.freeze({ ...fixture.descriptor }),
    expected: Object.freeze({ ...fixture.expected }),
  });
}

export const SCANOPS_PHASE13_FIXTURES = Object.freeze([
  freezeFixture({
    fixture_id: 'live_blocked',
    descriptor: { ...BASE, handshake_id: 'scanops-phase13-live', environment: 'LIVE' },
    expected: { environment: 'LIVE', status: SCANOPS_PHASE13_STATUS.BLOCKED, handshake_candidate: false, fields_present: true, live_blocked: true },
  }),
  freezeFixture({
    fixture_id: 'production_blocked',
    descriptor: { ...BASE, handshake_id: 'scanops-phase13-production', environment: 'PRODUCTION' },
    expected: { environment: 'PRODUCTION', status: SCANOPS_PHASE13_STATUS.BLOCKED, handshake_candidate: false, fields_present: true, live_blocked: true },
  }),
  freezeFixture({
    fixture_id: 'training_candidate',
    descriptor: { ...BASE, handshake_id: 'scanops-phase13-training', environment: 'TRAINING' },
    expected: { environment: 'TRAINING', status: SCANOPS_PHASE13_STATUS.CANDIDATE, handshake_candidate: true, fields_present: true, live_blocked: false },
  }),
  freezeFixture({
    fixture_id: 'test_candidate',
    descriptor: { ...BASE, handshake_id: 'scanops-phase13-test', environment: 'TEST' },
    expected: { environment: 'TEST', status: SCANOPS_PHASE13_STATUS.CANDIDATE, handshake_candidate: true, fields_present: true, live_blocked: false },
  }),
  freezeFixture({
    fixture_id: 'missing_field_blocked',
    descriptor: { ...BASE, handshake_id: 'scanops-phase13-missing', environment: 'TRAINING', local_endpoint_id: '' },
    expected: { environment: 'TRAINING', status: SCANOPS_PHASE13_STATUS.BLOCKED, handshake_candidate: false, fields_present: false, live_blocked: false },
  }),
  freezeFixture({
    fixture_id: 'unknown_blocked',
    descriptor: { ...BASE, handshake_id: 'scanops-phase13-unknown', environment: 'UNKNOWN' },
    expected: { environment: 'UNKNOWN', status: SCANOPS_PHASE13_STATUS.BLOCKED, handshake_candidate: false, fields_present: true, live_blocked: false },
  }),
]);
