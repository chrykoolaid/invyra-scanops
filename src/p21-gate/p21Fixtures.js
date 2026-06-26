export const P21_SCAN = '21B/21D';

export const P21_SCAN_STATUS = Object.freeze({
  CANDIDATE: 'GATE_CANDIDATE_ONLY',
  BLOCKED: 'BLOCKED',
});

export const P21_SCAN_ROLES = Object.freeze(['OWNER', 'ADMIN', 'BRIDGE_ADMIN']);

export const P21_SCAN_FIELDS = Object.freeze([
  'gate_id',
  'environment',
  'plan_id',
  'role',
  'person_id',
  'state',
  'source_system',
  'store_id',
  'target_system',
]);

const BASE = Object.freeze({
  gate_id: 'scan-p21-gate',
  plan_id: 'scan-p20-plan',
  role: 'OWNER',
  person_id: 'future-person-placeholder',
  state: 'DESIGN_ONLY',
  source_system: 'SCANOPS',
  store_id: 'store-placeholder',
  target_system: 'INVENTORY',
});

function freezeFixture(fixture) {
  return Object.freeze({ ...fixture, descriptor: Object.freeze({ ...fixture.descriptor }), expected: Object.freeze({ ...fixture.expected }) });
}

export const P21_SCAN_FIXTURES = Object.freeze([
  freezeFixture({ fixture_id: 'live_blocked', descriptor: { ...BASE, gate_id: 'scan-p21-live', environment: 'LIVE' }, expected: { environment: 'LIVE', status: P21_SCAN_STATUS.BLOCKED, gate_candidate: false, fields_present: true, role_allowed: true } }),
  freezeFixture({ fixture_id: 'production_blocked', descriptor: { ...BASE, gate_id: 'scan-p21-production', environment: 'PRODUCTION' }, expected: { environment: 'PRODUCTION', status: P21_SCAN_STATUS.BLOCKED, gate_candidate: false, fields_present: true, role_allowed: true } }),
  freezeFixture({ fixture_id: 'training_candidate', descriptor: { ...BASE, gate_id: 'scan-p21-training', environment: 'TRAINING' }, expected: { environment: 'TRAINING', status: P21_SCAN_STATUS.CANDIDATE, gate_candidate: true, fields_present: true, role_allowed: true } }),
  freezeFixture({ fixture_id: 'test_candidate', descriptor: { ...BASE, gate_id: 'scan-p21-test', environment: 'TEST' }, expected: { environment: 'TEST', status: P21_SCAN_STATUS.CANDIDATE, gate_candidate: true, fields_present: true, role_allowed: true } }),
  freezeFixture({ fixture_id: 'missing_field_blocked', descriptor: { ...BASE, gate_id: 'scan-p21-missing', environment: 'TRAINING', person_id: '' }, expected: { environment: 'TRAINING', status: P21_SCAN_STATUS.BLOCKED, gate_candidate: false, fields_present: false, role_allowed: true } }),
  freezeFixture({ fixture_id: 'unknown_blocked', descriptor: { ...BASE, gate_id: 'scan-p21-unknown', environment: 'UNKNOWN' }, expected: { environment: 'UNKNOWN', status: P21_SCAN_STATUS.BLOCKED, gate_candidate: false, fields_present: true, role_allowed: true } }),
]);
