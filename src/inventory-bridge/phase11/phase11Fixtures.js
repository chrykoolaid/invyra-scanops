export const SCANOPS_PHASE11 = '11B/11D';
export const SCANOPS_PHASE11_COMPONENT = 'scanops_phase11_handoff_candidate';

export const SCANOPS_PHASE11_STATUS = Object.freeze({
  CANDIDATE: 'HANDOFF_CANDIDATE_ONLY',
  BLOCKED: 'BLOCKED',
});

export const SCANOPS_PHASE11_REQUIRED_FIELDS = Object.freeze([
  'handoff_id',
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
  'handoff_gate',
  'handoff_profile',
]);

const BASE = Object.freeze({
  handoff_id: 'scanops-phase11-handoff',
  review_id: 'scanops-phase10-review',
  evidence_id: 'evidence-placeholder',
  evidence_key: 'evidence-key-placeholder',
  source_system: 'SCANOPS',
  source_device_id: 'scanops-device-placeholder',
  source_store_id: 'store-placeholder',
  target_system: 'INVENTORY',
  review_gate: 'REQUIRED',
  review_profile: 'STRICT_STATIC_REVIEW',
  handoff_gate: 'REQUIRED',
  handoff_profile: 'STRICT_STATIC_HANDOFF',
});

function freezeFixture(fixture) {
  return Object.freeze({
    ...fixture,
    descriptor: Object.freeze({ ...fixture.descriptor }),
    expected: Object.freeze({ ...fixture.expected }),
  });
}

export const SCANOPS_PHASE11_FIXTURES = Object.freeze([
  freezeFixture({
    fixture_id: 'live_blocked',
    descriptor: { ...BASE, handoff_id: 'scanops-phase11-live', environment: 'LIVE' },
    expected: { environment: 'LIVE', status: SCANOPS_PHASE11_STATUS.BLOCKED, handoff_candidate: false, fields_present: true, live_blocked: true },
  }),
  freezeFixture({
    fixture_id: 'production_blocked',
    descriptor: { ...BASE, handoff_id: 'scanops-phase11-production', environment: 'PRODUCTION' },
    expected: { environment: 'PRODUCTION', status: SCANOPS_PHASE11_STATUS.BLOCKED, handoff_candidate: false, fields_present: true, live_blocked: true },
  }),
  freezeFixture({
    fixture_id: 'training_candidate',
    descriptor: { ...BASE, handoff_id: 'scanops-phase11-training', environment: 'TRAINING' },
    expected: { environment: 'TRAINING', status: SCANOPS_PHASE11_STATUS.CANDIDATE, handoff_candidate: true, fields_present: true, live_blocked: false },
  }),
  freezeFixture({
    fixture_id: 'test_candidate',
    descriptor: { ...BASE, handoff_id: 'scanops-phase11-test', environment: 'TEST' },
    expected: { environment: 'TEST', status: SCANOPS_PHASE11_STATUS.CANDIDATE, handoff_candidate: true, fields_present: true, live_blocked: false },
  }),
  freezeFixture({
    fixture_id: 'missing_field_blocked',
    descriptor: { ...BASE, handoff_id: 'scanops-phase11-missing', environment: 'TRAINING', evidence_key: '' },
    expected: { environment: 'TRAINING', status: SCANOPS_PHASE11_STATUS.BLOCKED, handoff_candidate: false, fields_present: false, live_blocked: false },
  }),
  freezeFixture({
    fixture_id: 'unknown_blocked',
    descriptor: { ...BASE, handoff_id: 'scanops-phase11-unknown', environment: 'UNKNOWN' },
    expected: { environment: 'UNKNOWN', status: SCANOPS_PHASE11_STATUS.BLOCKED, handoff_candidate: false, fields_present: true, live_blocked: false },
  }),
]);
