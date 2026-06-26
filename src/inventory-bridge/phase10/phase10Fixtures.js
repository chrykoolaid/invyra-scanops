export const SCANOPS_PHASE10 = '10B/10D';
export const SCANOPS_PHASE10_COMPONENT = 'scanops_phase10_review_check';

export const SCANOPS_PHASE10_STATUS = Object.freeze({
  READY: 'REVIEW_READY',
  BLOCKED: 'BLOCKED',
});

export const SCANOPS_PHASE10_REQUIRED_FIELDS = Object.freeze([
  'review_id',
  'environment',
  'evidence_id',
  'evidence_key',
  'source_system',
  'source_device_id',
  'source_store_id',
  'target_system',
  'review_gate',
  'review_profile',
]);

const BASE = Object.freeze({
  review_id: 'scanops-phase10-review',
  evidence_id: 'evidence-placeholder',
  evidence_key: 'evidence-key-placeholder',
  source_system: 'SCANOPS',
  source_device_id: 'scanops-device-placeholder',
  source_store_id: 'store-placeholder',
  target_system: 'INVENTORY',
  review_gate: 'REQUIRED',
  review_profile: 'STRICT_STATIC_REVIEW',
});

function freezeFixture(fixture) {
  return Object.freeze({
    ...fixture,
    descriptor: Object.freeze({ ...fixture.descriptor }),
    expected: Object.freeze({ ...fixture.expected }),
  });
}

export const SCANOPS_PHASE10_FIXTURES = Object.freeze([
  freezeFixture({
    fixture_id: 'live_blocked',
    descriptor: { ...BASE, review_id: 'scanops-phase10-live', environment: 'LIVE' },
    expected: { environment: 'LIVE', status: SCANOPS_PHASE10_STATUS.BLOCKED, ready: false, fields_present: true, live_blocked: true },
  }),
  freezeFixture({
    fixture_id: 'training_ready',
    descriptor: { ...BASE, review_id: 'scanops-phase10-training', environment: 'TRAINING' },
    expected: { environment: 'TRAINING', status: SCANOPS_PHASE10_STATUS.READY, ready: true, fields_present: true, live_blocked: false },
  }),
  freezeFixture({
    fixture_id: 'test_ready',
    descriptor: { ...BASE, review_id: 'scanops-phase10-test', environment: 'TEST' },
    expected: { environment: 'TEST', status: SCANOPS_PHASE10_STATUS.READY, ready: true, fields_present: true, live_blocked: false },
  }),
  freezeFixture({
    fixture_id: 'missing_field_blocked',
    descriptor: { ...BASE, review_id: 'scanops-phase10-missing', environment: 'TRAINING', evidence_key: '' },
    expected: { environment: 'TRAINING', status: SCANOPS_PHASE10_STATUS.BLOCKED, ready: false, fields_present: false, live_blocked: false },
  }),
]);
