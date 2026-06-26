export const SCANOPS_PHASE19 = '19B/19D';
export const SCANOPS_PHASE19_COMPONENT = 'scanops_phase19_readiness_gate_candidate';

export const SCANOPS_PHASE19_STATUS = Object.freeze({
  CANDIDATE: 'READINESS_GATE_CANDIDATE_ONLY',
  BLOCKED: 'BLOCKED',
});

export const SCANOPS_PHASE19_REQUIRED_FIELDS = Object.freeze([
  'gate_id',
  'environment',
  'acceptance_id',
  'recovery_id',
  'response_id',
  'review_id',
  'event_id',
  'source_system',
  'source_store_id',
  'target_system',
  'readiness_gate',
  'readiness_profile',
]);

const BASE = Object.freeze({
  gate_id: 'scanops-phase19-readiness',
  acceptance_id: 'scanops-phase18-acceptance',
  recovery_id: 'scanops-phase17-recovery',
  response_id: 'scanops-phase16-response',
  review_id: 'scanops-phase15-review',
  event_id: 'scanops-phase14-event',
  source_system: 'SCANOPS',
  source_store_id: 'store-placeholder',
  target_system: 'INVENTORY',
  readiness_gate: 'REQUIRED',
  readiness_profile: 'STRICT_STATIC_READINESS',
});

function freezeFixture(fixture) {
  return Object.freeze({ ...fixture, descriptor: Object.freeze({ ...fixture.descriptor }), expected: Object.freeze({ ...fixture.expected }) });
}

export const SCANOPS_PHASE19_FIXTURES = Object.freeze([
  freezeFixture({ fixture_id: 'live_blocked', descriptor: { ...BASE, gate_id: 'scanops-phase19-live', environment: 'LIVE' }, expected: { environment: 'LIVE', status: SCANOPS_PHASE19_STATUS.BLOCKED, readiness_candidate: false, fields_present: true, live_blocked: true } }),
  freezeFixture({ fixture_id: 'production_blocked', descriptor: { ...BASE, gate_id: 'scanops-phase19-production', environment: 'PRODUCTION' }, expected: { environment: 'PRODUCTION', status: SCANOPS_PHASE19_STATUS.BLOCKED, readiness_candidate: false, fields_present: true, live_blocked: true } }),
  freezeFixture({ fixture_id: 'training_candidate', descriptor: { ...BASE, gate_id: 'scanops-phase19-training', environment: 'TRAINING' }, expected: { environment: 'TRAINING', status: SCANOPS_PHASE19_STATUS.CANDIDATE, readiness_candidate: true, fields_present: true, live_blocked: false } }),
  freezeFixture({ fixture_id: 'test_candidate', descriptor: { ...BASE, gate_id: 'scanops-phase19-test', environment: 'TEST' }, expected: { environment: 'TEST', status: SCANOPS_PHASE19_STATUS.CANDIDATE, readiness_candidate: true, fields_present: true, live_blocked: false } }),
  freezeFixture({ fixture_id: 'missing_field_blocked', descriptor: { ...BASE, gate_id: 'scanops-phase19-missing', environment: 'TRAINING', readiness_profile: '' }, expected: { environment: 'TRAINING', status: SCANOPS_PHASE19_STATUS.BLOCKED, readiness_candidate: false, fields_present: false, live_blocked: false } }),
  freezeFixture({ fixture_id: 'unknown_blocked', descriptor: { ...BASE, gate_id: 'scanops-phase19-unknown', environment: 'UNKNOWN' }, expected: { environment: 'UNKNOWN', status: SCANOPS_PHASE19_STATUS.BLOCKED, readiness_candidate: false, fields_present: true, live_blocked: false } }),
]);
