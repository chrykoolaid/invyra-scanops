export const SCANOPS_PHASE18 = '18B/18D';
export const SCANOPS_PHASE18_COMPONENT = 'scanops_phase18_acceptance_candidate';

export const SCANOPS_PHASE18_STATUS = Object.freeze({
  CANDIDATE: 'ACCEPTANCE_CANDIDATE_ONLY',
  BLOCKED: 'BLOCKED',
});

export const SCANOPS_PHASE18_REQUIRED_FIELDS = Object.freeze([
  'acceptance_id',
  'environment',
  'recovery_id',
  'response_id',
  'review_id',
  'event_id',
  'event_key',
  'source_system',
  'source_store_id',
  'target_system',
  'acceptance_gate',
  'acceptance_profile',
]);

const BASE = Object.freeze({
  acceptance_id: 'scanops-phase18-acceptance',
  recovery_id: 'scanops-phase17-recovery',
  response_id: 'scanops-phase16-response',
  review_id: 'scanops-phase15-review',
  event_id: 'scanops-phase14-event',
  event_key: 'event-key-placeholder',
  source_system: 'SCANOPS',
  source_store_id: 'store-placeholder',
  target_system: 'INVENTORY',
  acceptance_gate: 'REQUIRED',
  acceptance_profile: 'STRICT_STATIC_ACCEPTANCE',
});

function freezeFixture(fixture) {
  return Object.freeze({ ...fixture, descriptor: Object.freeze({ ...fixture.descriptor }), expected: Object.freeze({ ...fixture.expected }) });
}

export const SCANOPS_PHASE18_FIXTURES = Object.freeze([
  freezeFixture({ fixture_id: 'live_blocked', descriptor: { ...BASE, acceptance_id: 'scanops-phase18-live', environment: 'LIVE' }, expected: { environment: 'LIVE', status: SCANOPS_PHASE18_STATUS.BLOCKED, acceptance_candidate: false, fields_present: true, live_blocked: true } }),
  freezeFixture({ fixture_id: 'production_blocked', descriptor: { ...BASE, acceptance_id: 'scanops-phase18-production', environment: 'PRODUCTION' }, expected: { environment: 'PRODUCTION', status: SCANOPS_PHASE18_STATUS.BLOCKED, acceptance_candidate: false, fields_present: true, live_blocked: true } }),
  freezeFixture({ fixture_id: 'training_candidate', descriptor: { ...BASE, acceptance_id: 'scanops-phase18-training', environment: 'TRAINING' }, expected: { environment: 'TRAINING', status: SCANOPS_PHASE18_STATUS.CANDIDATE, acceptance_candidate: true, fields_present: true, live_blocked: false } }),
  freezeFixture({ fixture_id: 'test_candidate', descriptor: { ...BASE, acceptance_id: 'scanops-phase18-test', environment: 'TEST' }, expected: { environment: 'TEST', status: SCANOPS_PHASE18_STATUS.CANDIDATE, acceptance_candidate: true, fields_present: true, live_blocked: false } }),
  freezeFixture({ fixture_id: 'missing_field_blocked', descriptor: { ...BASE, acceptance_id: 'scanops-phase18-missing', environment: 'TRAINING', acceptance_profile: '' }, expected: { environment: 'TRAINING', status: SCANOPS_PHASE18_STATUS.BLOCKED, acceptance_candidate: false, fields_present: false, live_blocked: false } }),
  freezeFixture({ fixture_id: 'unknown_blocked', descriptor: { ...BASE, acceptance_id: 'scanops-phase18-unknown', environment: 'UNKNOWN' }, expected: { environment: 'UNKNOWN', status: SCANOPS_PHASE18_STATUS.BLOCKED, acceptance_candidate: false, fields_present: true, live_blocked: false } }),
]);
