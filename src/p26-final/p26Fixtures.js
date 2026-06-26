export const P26_SCAN = '26B/26D';

export const P26_SCAN_STATUS = Object.freeze({
  CANDIDATE: 'FINAL_VIEW_CANDIDATE_ONLY',
  BLOCKED: 'BLOCKED',
});

export const P26_SCAN_STEPS = Object.freeze([
  'REORDER_REVIEW',
  'FORECAST_FEED_READ_ONLY',
  'RFID_COMPATIBILITY_FUTURE',
]);

export const P26_SCAN_FIELDS = Object.freeze([
  'flow_id',
  'environment',
  'previous_flow_id',
  'source_system',
  'store_id',
  'target_system',
  'visibility_mode',
  'step_order',
  'compatibility_mode',
]);

const BASE = Object.freeze({
  flow_id: 'scan-p26-final',
  previous_flow_id: 'scan-p25-flow',
  source_system: 'SCANOPS',
  store_id: 'store-placeholder',
  target_system: 'INVENTORY',
  visibility_mode: 'READ_ONLY',
  step_order: P26_SCAN_STEPS.join('|'),
  compatibility_mode: 'HYBRID_FUTURE_MODEL',
});

function freezeFixture(fixture) {
  return Object.freeze({ ...fixture, descriptor: Object.freeze({ ...fixture.descriptor }), expected: Object.freeze({ ...fixture.expected }) });
}

export const P26_SCAN_FIXTURES = Object.freeze([
  freezeFixture({ fixture_id: 'live_blocked', descriptor: { ...BASE, flow_id: 'scan-p26-live', environment: 'LIVE' }, expected: { environment: 'LIVE', status: P26_SCAN_STATUS.BLOCKED, final_candidate: false, fields_present: true } }),
  freezeFixture({ fixture_id: 'production_blocked', descriptor: { ...BASE, flow_id: 'scan-p26-production', environment: 'PRODUCTION' }, expected: { environment: 'PRODUCTION', status: P26_SCAN_STATUS.BLOCKED, final_candidate: false, fields_present: true } }),
  freezeFixture({ fixture_id: 'training_candidate', descriptor: { ...BASE, flow_id: 'scan-p26-training', environment: 'TRAINING' }, expected: { environment: 'TRAINING', status: P26_SCAN_STATUS.CANDIDATE, final_candidate: true, fields_present: true } }),
  freezeFixture({ fixture_id: 'test_candidate', descriptor: { ...BASE, flow_id: 'scan-p26-test', environment: 'TEST' }, expected: { environment: 'TEST', status: P26_SCAN_STATUS.CANDIDATE, final_candidate: true, fields_present: true } }),
  freezeFixture({ fixture_id: 'missing_field_blocked', descriptor: { ...BASE, flow_id: 'scan-p26-missing', environment: 'TRAINING', compatibility_mode: '' }, expected: { environment: 'TRAINING', status: P26_SCAN_STATUS.BLOCKED, final_candidate: false, fields_present: false } }),
  freezeFixture({ fixture_id: 'unknown_blocked', descriptor: { ...BASE, flow_id: 'scan-p26-unknown', environment: 'UNKNOWN' }, expected: { environment: 'UNKNOWN', status: P26_SCAN_STATUS.BLOCKED, final_candidate: false, fields_present: true } }),
]);
