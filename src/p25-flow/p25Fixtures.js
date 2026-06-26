export const P25_SCAN = '25B/25D';

export const P25_SCAN_STATUS = Object.freeze({
  CANDIDATE: 'FLOW_VIEW_CANDIDATE_ONLY',
  BLOCKED: 'BLOCKED',
});

export const P25_SCAN_STEPS = Object.freeze([
  'STOCK_OUT_EXCEPTIONS',
  'STOCKTAKE',
  'RECEIVING',
  'TRANSFERS',
]);

export const P25_SCAN_FIELDS = Object.freeze([
  'flow_id',
  'environment',
  'previous_flow_id',
  'source_system',
  'store_id',
  'target_system',
  'visibility_mode',
  'step_order',
]);

const BASE = Object.freeze({
  flow_id: 'scan-p25-flow',
  previous_flow_id: 'scan-p24-flow',
  source_system: 'SCANOPS',
  store_id: 'store-placeholder',
  target_system: 'INVENTORY',
  visibility_mode: 'READ_ONLY',
  step_order: P25_SCAN_STEPS.join('|'),
});

function freezeFixture(fixture) {
  return Object.freeze({ ...fixture, descriptor: Object.freeze({ ...fixture.descriptor }), expected: Object.freeze({ ...fixture.expected }) });
}

export const P25_SCAN_FIXTURES = Object.freeze([
  freezeFixture({ fixture_id: 'live_blocked', descriptor: { ...BASE, flow_id: 'scan-p25-live', environment: 'LIVE' }, expected: { environment: 'LIVE', status: P25_SCAN_STATUS.BLOCKED, flow_candidate: false, fields_present: true } }),
  freezeFixture({ fixture_id: 'production_blocked', descriptor: { ...BASE, flow_id: 'scan-p25-production', environment: 'PRODUCTION' }, expected: { environment: 'PRODUCTION', status: P25_SCAN_STATUS.BLOCKED, flow_candidate: false, fields_present: true } }),
  freezeFixture({ fixture_id: 'training_candidate', descriptor: { ...BASE, flow_id: 'scan-p25-training', environment: 'TRAINING' }, expected: { environment: 'TRAINING', status: P25_SCAN_STATUS.CANDIDATE, flow_candidate: true, fields_present: true } }),
  freezeFixture({ fixture_id: 'test_candidate', descriptor: { ...BASE, flow_id: 'scan-p25-test', environment: 'TEST' }, expected: { environment: 'TEST', status: P25_SCAN_STATUS.CANDIDATE, flow_candidate: true, fields_present: true } }),
  freezeFixture({ fixture_id: 'missing_field_blocked', descriptor: { ...BASE, flow_id: 'scan-p25-missing', environment: 'TRAINING', step_order: '' }, expected: { environment: 'TRAINING', status: P25_SCAN_STATUS.BLOCKED, flow_candidate: false, fields_present: false } }),
  freezeFixture({ fixture_id: 'unknown_blocked', descriptor: { ...BASE, flow_id: 'scan-p25-unknown', environment: 'UNKNOWN' }, expected: { environment: 'UNKNOWN', status: P25_SCAN_STATUS.BLOCKED, flow_candidate: false, fields_present: true } }),
]);
