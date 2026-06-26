export const SCANOPS_PHASE12 = '12B/12D';
export const SCANOPS_PHASE12_COMPONENT = 'scanops_phase12_runner_candidate';

export const SCANOPS_PHASE12_STATUS = Object.freeze({
  CANDIDATE: 'RUNNER_CANDIDATE_ONLY',
  BLOCKED: 'BLOCKED',
});

export const SCANOPS_PHASE12_REQUIRED_FIELDS = Object.freeze([
  'runner_id',
  'environment',
  'handoff_id',
  'handoff_key',
  'review_id',
  'evidence_id',
  'source_system',
  'source_device_id',
  'source_store_id',
  'target_system',
  'runner_gate',
  'runner_profile',
]);

const BASE = Object.freeze({
  runner_id: 'scanops-phase12-runner',
  handoff_id: 'scanops-phase11-handoff',
  handoff_key: 'handoff-key-placeholder',
  review_id: 'scanops-phase10-review',
  evidence_id: 'evidence-placeholder',
  source_system: 'SCANOPS',
  source_device_id: 'scanops-device-placeholder',
  source_store_id: 'store-placeholder',
  target_system: 'INVENTORY',
  runner_gate: 'REQUIRED',
  runner_profile: 'STRICT_STATIC_RUNNER',
});

function freezeFixture(fixture) {
  return Object.freeze({
    ...fixture,
    descriptor: Object.freeze({ ...fixture.descriptor }),
    expected: Object.freeze({ ...fixture.expected }),
  });
}

export const SCANOPS_PHASE12_FIXTURES = Object.freeze([
  freezeFixture({
    fixture_id: 'live_blocked',
    descriptor: { ...BASE, runner_id: 'scanops-phase12-live', environment: 'LIVE' },
    expected: { environment: 'LIVE', status: SCANOPS_PHASE12_STATUS.BLOCKED, runner_candidate: false, fields_present: true, live_blocked: true },
  }),
  freezeFixture({
    fixture_id: 'production_blocked',
    descriptor: { ...BASE, runner_id: 'scanops-phase12-production', environment: 'PRODUCTION' },
    expected: { environment: 'PRODUCTION', status: SCANOPS_PHASE12_STATUS.BLOCKED, runner_candidate: false, fields_present: true, live_blocked: true },
  }),
  freezeFixture({
    fixture_id: 'training_candidate',
    descriptor: { ...BASE, runner_id: 'scanops-phase12-training', environment: 'TRAINING' },
    expected: { environment: 'TRAINING', status: SCANOPS_PHASE12_STATUS.CANDIDATE, runner_candidate: true, fields_present: true, live_blocked: false },
  }),
  freezeFixture({
    fixture_id: 'test_candidate',
    descriptor: { ...BASE, runner_id: 'scanops-phase12-test', environment: 'TEST' },
    expected: { environment: 'TEST', status: SCANOPS_PHASE12_STATUS.CANDIDATE, runner_candidate: true, fields_present: true, live_blocked: false },
  }),
  freezeFixture({
    fixture_id: 'missing_field_blocked',
    descriptor: { ...BASE, runner_id: 'scanops-phase12-missing', environment: 'TRAINING', handoff_key: '' },
    expected: { environment: 'TRAINING', status: SCANOPS_PHASE12_STATUS.BLOCKED, runner_candidate: false, fields_present: false, live_blocked: false },
  }),
  freezeFixture({
    fixture_id: 'unknown_blocked',
    descriptor: { ...BASE, runner_id: 'scanops-phase12-unknown', environment: 'UNKNOWN' },
    expected: { environment: 'UNKNOWN', status: SCANOPS_PHASE12_STATUS.BLOCKED, runner_candidate: false, fields_present: true, live_blocked: false },
  }),
]);
