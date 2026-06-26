export const SCANOPS_PHASE14 = '14B/14D';
export const SCANOPS_PHASE14_COMPONENT = 'scanops_phase14_candidate';

export const SCANOPS_PHASE14_STATUS = Object.freeze({
  CANDIDATE: 'OUTBOUND_EVENT_CANDIDATE_ONLY',
  BLOCKED: 'BLOCKED',
});

export const SCANOPS_PHASE14_REQUIRED_FIELDS = Object.freeze([
  'event_id',
  'environment',
  'handshake_id',
  'handshake_key',
  'runner_id',
  'source_system',
  'source_device_id',
  'source_store_id',
  'target_system',
  'event_type',
  'event_gate',
  'event_profile',
]);

const BASE = Object.freeze({
  event_id: 'scanops-phase14-event',
  handshake_id: 'scanops-phase13-handshake',
  handshake_key: 'handshake-key-placeholder',
  runner_id: 'scanops-phase12-runner',
  source_system: 'SCANOPS',
  source_device_id: 'scanops-device-placeholder',
  source_store_id: 'store-placeholder',
  target_system: 'INVENTORY',
  event_type: 'STOCK_OBSERVATION_CANDIDATE',
  event_gate: 'REQUIRED',
  event_profile: 'STRICT_STATIC_EVENT',
});

function freezeFixture(fixture) {
  return Object.freeze({ ...fixture, descriptor: Object.freeze({ ...fixture.descriptor }), expected: Object.freeze({ ...fixture.expected }) });
}

export const SCANOPS_PHASE14_FIXTURES = Object.freeze([
  freezeFixture({ fixture_id: 'live_blocked', descriptor: { ...BASE, event_id: 'scanops-phase14-live', environment: 'LIVE' }, expected: { environment: 'LIVE', status: SCANOPS_PHASE14_STATUS.BLOCKED, event_candidate: false, fields_present: true, live_blocked: true } }),
  freezeFixture({ fixture_id: 'production_blocked', descriptor: { ...BASE, event_id: 'scanops-phase14-production', environment: 'PRODUCTION' }, expected: { environment: 'PRODUCTION', status: SCANOPS_PHASE14_STATUS.BLOCKED, event_candidate: false, fields_present: true, live_blocked: true } }),
  freezeFixture({ fixture_id: 'training_candidate', descriptor: { ...BASE, event_id: 'scanops-phase14-training', environment: 'TRAINING' }, expected: { environment: 'TRAINING', status: SCANOPS_PHASE14_STATUS.CANDIDATE, event_candidate: true, fields_present: true, live_blocked: false } }),
  freezeFixture({ fixture_id: 'test_candidate', descriptor: { ...BASE, event_id: 'scanops-phase14-test', environment: 'TEST' }, expected: { environment: 'TEST', status: SCANOPS_PHASE14_STATUS.CANDIDATE, event_candidate: true, fields_present: true, live_blocked: false } }),
  freezeFixture({ fixture_id: 'missing_field_blocked', descriptor: { ...BASE, event_id: 'scanops-phase14-missing', environment: 'TRAINING', event_type: '' }, expected: { environment: 'TRAINING', status: SCANOPS_PHASE14_STATUS.BLOCKED, event_candidate: false, fields_present: false, live_blocked: false } }),
  freezeFixture({ fixture_id: 'unknown_blocked', descriptor: { ...BASE, event_id: 'scanops-phase14-unknown', environment: 'UNKNOWN' }, expected: { environment: 'UNKNOWN', status: SCANOPS_PHASE14_STATUS.BLOCKED, event_candidate: false, fields_present: true, live_blocked: false } }),
]);
