export const P22_SCAN = '22B/22D';

export const P22_SCAN_STATUS = Object.freeze({
  CANDIDATE: 'LINK_TEST_CANDIDATE_ONLY',
  BLOCKED: 'BLOCKED',
});

export const P22_SCAN_FIELDS = Object.freeze([
  'link_id',
  'environment',
  'gate_id',
  'pairing_id',
  'device_id',
  'source_system',
  'store_id',
  'target_system',
  'visibility_mode',
  'test_scope',
]);

const BASE = Object.freeze({
  link_id: 'scan-p22-link',
  gate_id: 'scan-p21-gate',
  pairing_id: 'pairing-placeholder',
  device_id: 'device-placeholder',
  source_system: 'SCANOPS',
  store_id: 'store-placeholder',
  target_system: 'INVENTORY',
  visibility_mode: 'READ_ONLY',
  test_scope: 'PAIRING_LINK_CANDIDATE',
});

function freezeFixture(fixture) {
  return Object.freeze({ ...fixture, descriptor: Object.freeze({ ...fixture.descriptor }), expected: Object.freeze({ ...fixture.expected }) });
}

export const P22_SCAN_FIXTURES = Object.freeze([
  freezeFixture({ fixture_id: 'live_blocked', descriptor: { ...BASE, link_id: 'scan-p22-live', environment: 'LIVE' }, expected: { environment: 'LIVE', status: P22_SCAN_STATUS.BLOCKED, link_candidate: false, fields_present: true } }),
  freezeFixture({ fixture_id: 'production_blocked', descriptor: { ...BASE, link_id: 'scan-p22-production', environment: 'PRODUCTION' }, expected: { environment: 'PRODUCTION', status: P22_SCAN_STATUS.BLOCKED, link_candidate: false, fields_present: true } }),
  freezeFixture({ fixture_id: 'training_candidate', descriptor: { ...BASE, link_id: 'scan-p22-training', environment: 'TRAINING' }, expected: { environment: 'TRAINING', status: P22_SCAN_STATUS.CANDIDATE, link_candidate: true, fields_present: true } }),
  freezeFixture({ fixture_id: 'test_candidate', descriptor: { ...BASE, link_id: 'scan-p22-test', environment: 'TEST' }, expected: { environment: 'TEST', status: P22_SCAN_STATUS.CANDIDATE, link_candidate: true, fields_present: true } }),
  freezeFixture({ fixture_id: 'missing_field_blocked', descriptor: { ...BASE, link_id: 'scan-p22-missing', environment: 'TRAINING', device_id: '' }, expected: { environment: 'TRAINING', status: P22_SCAN_STATUS.BLOCKED, link_candidate: false, fields_present: false } }),
  freezeFixture({ fixture_id: 'unknown_blocked', descriptor: { ...BASE, link_id: 'scan-p22-unknown', environment: 'UNKNOWN' }, expected: { environment: 'UNKNOWN', status: P22_SCAN_STATUS.BLOCKED, link_candidate: false, fields_present: true } }),
]);
