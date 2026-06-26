export const P24_SCAN = '24B/24D';

export const P24_SCAN_STATUS = Object.freeze({
  CANDIDATE: 'FLOW_VIEW_CANDIDATE_ONLY',
  BLOCKED: 'BLOCKED',
});

export const P24_SCAN_STEPS = Object.freeze([
  'DASHBOARD_NOTIFICATIONS',
  'GAP_SCAN',
  'SCANNER_INTAKE',
  'ITEM_DETAILS',
]);

export const P24_SCAN_FIELDS = Object.freeze([
  'flow_id',
  'environment',
  'event_test_id',
  'source_system',
  'store_id',
  'target_system',
  'visibility_mode',
  'step_order',
]);

const BASE = Object.freeze({
  flow_id: 'scan-p24-flow',
  event_test_id: 'scan-p23-event-test',
  source_system: 'SCANOPS',
  store_id: 'store-placeholder',
  target_system: 'INVENTORY',
  visibility_mode: 'READ_ONLY',
  step_order: P24_SCAN_STEPS.join('|'),
});

function freezeFixture(fixture) {
  return Object.freeze({ ...fixture, descriptor: Object.freeze({ ...fixture.descriptor }), expected: Object.freeze({ ...fixture.expected }) });
}

export const P24_SCAN_FIXTURES = Object.freeze([
  freezeFixture({ fixture_id: 'live_blocked', descriptor: { ...BASE, flow_id: 'scan-p24-live', environment: 'LIVE' }, expected: { environment: 'LIVE', status: P24_SCAN_STATUS.BLOCKED, flow_candidate: false, fields_present: true } }),
  freezeFixture({ fixture_id: 'production_blocked', descriptor: { ...BASE, flow_id: 'scan-p24-production', environment: 'PRODUCTION' }, expected: { environment: 'PRODUCTION', status: P24_SCAN_STATUS.BLOCKED, flow_candidate: false, fields_present: true } }),
  freezeFixture({ fixture_id: 'training_candidate', descriptor: { ...BASE, flow_id: 'scan-p24-training', environment: 'TRAINING' }, expected: { environment: 'TRAINING', status: P24_SCAN_STATUS.CANDIDATE, flow_candidate: true, fields_present: true } }),
  freezeFixture({ fixture_id: 'test_candidate', descriptor: { ...BASE, flow_id: 'scan-p24-test', environment: 'TEST' }, expected: { environment: 'TEST', status: P24_SCAN_STATUS.CANDIDATE, flow_candidate: true, fields_present: true } }),
  freezeFixture({ fixture_id: 'missing_field_blocked', descriptor: { ...BASE, flow_id: 'scan-p24-missing', environment: 'TRAINING', step_order: '' }, expected: { environment: 'TRAINING', status: P24_SCAN_STATUS.BLOCKED, flow_candidate: false, fields_present: false } }),
  freezeFixture({ fixture_id: 'unknown_blocked', descriptor: { ...BASE, flow_id: 'scan-p24-unknown', environment: 'UNKNOWN' }, expected: { environment: 'UNKNOWN', status: P24_SCAN_STATUS.BLOCKED, flow_candidate: false, fields_present: true } }),
]);
