import { P26_SCAN, P26_SCAN_FIXTURES } from '../src/p26-final/p26Fixtures.js';
import { buildP26Scan, getP26ScanResults } from '../src/p26-final/p26Core.js';

const errors = [];
function assert(condition, message) { if (!condition) errors.push(message); }

assert(P26_SCAN === '26B/26D', 'phase marker must remain 26B/26D');
assert(Object.isFrozen(P26_SCAN_FIXTURES), 'fixtures must be frozen');
assert(P26_SCAN_FIXTURES.length === 6, 'expected six fixtures');

const results = getP26ScanResults();
assert(Object.isFrozen(results), 'results must be frozen');

for (const result of results) {
  const { item } = result;
  assert(result.passed === true, `fixture must pass: ${result.fixture_id}`);
  assert(Object.isFrozen(result), `result must be frozen: ${result.fixture_id}`);
  assert(Object.isFrozen(item), `item must be frozen: ${result.fixture_id}`);
  assert(item.candidate_only === true, `candidate only must stay true: ${result.fixture_id}`);
  assert(item.capture_only === true, `capture only must stay true: ${result.fixture_id}`);
  assert(item.stock_change === false, `stock change must not be allowed: ${result.fixture_id}`);
  assert(item.workflow_change === false, `workflow change must not be allowed: ${result.fixture_id}`);
  assert(item.po_write === false, `PO write must not be allowed: ${result.fixture_id}`);
  assert(item.forecast_write === false, `forecast write must not be allowed: ${result.fixture_id}`);
  assert(item.rfid_write === false, `RFID write must not be allowed: ${result.fixture_id}`);
  assert(item.reorder_done === false, `reorder must not execute: ${result.fixture_id}`);
  assert(item.forecast_done === false, `forecast must not execute: ${result.fixture_id}`);
  assert(item.rfid_done === false, `RFID must not execute: ${result.fixture_id}`);
  assert(item.completed === false, `completion must not occur: ${result.fixture_id}`);
  assert(item.saved === false, `save must not occur: ${result.fixture_id}`);
  assert(item.wrote === false, `write must not occur: ${result.fixture_id}`);
  assert(item.mutated === false, `mutation must not occur: ${result.fixture_id}`);

  if (['LIVE', 'PRODUCTION'].includes(item.environment)) {
    assert(item.candidate === false, `LIVE/PRODUCTION must be blocked: ${result.fixture_id}`);
    assert(item.status === 'BLOCKED', `LIVE/PRODUCTION status must be BLOCKED: ${result.fixture_id}`);
  }

  if (['TRAINING', 'TEST'].includes(item.environment) && item.fields_present && item.read_only && item.order_ok && item.hybrid_future) {
    assert(item.candidate === true, `TEST/TRAINING with valid fields may be candidate: ${result.fixture_id}`);
    assert(item.status === 'FINAL_VIEW_CANDIDATE_ONLY', `TEST/TRAINING status must be FINAL_VIEW_CANDIDATE_ONLY: ${result.fixture_id}`);
    assert(item.reorder_candidate === true, `reorder candidate must be true: ${result.fixture_id}`);
    assert(item.forecast_candidate === true, `forecast candidate must be true: ${result.fixture_id}`);
    assert(item.rfid_candidate === true, `RFID candidate must be true: ${result.fixture_id}`);
  }
}

const liveDirect = buildP26Scan({ environment: 'LIVE' });
assert(liveDirect.candidate === false, 'direct LIVE must be blocked');
assert(liveDirect.capture_only === true, 'direct LIVE must stay capture-only');
assert(liveDirect.stock_change === false, 'direct LIVE must not allow stock change');
assert(liveDirect.wrote === false, 'direct LIVE must not write');
assert(liveDirect.mutated === false, 'direct LIVE must not mutate');

const trainingDirect = buildP26Scan({
  flow_id: 'direct-training-flow',
  environment: 'TRAINING',
  previous_flow_id: 'previous-flow',
  source_system: 'SCANOPS',
  store_id: 'store',
  target_system: 'INVENTORY',
  visibility_mode: 'READ_ONLY',
  step_order: 'REORDER_REVIEW|FORECAST_FEED_READ_ONLY|RFID_COMPATIBILITY_FUTURE',
  compatibility_mode: 'HYBRID_FUTURE_MODEL',
});
assert(trainingDirect.candidate === true, 'direct TRAINING may be candidate only');
assert(trainingDirect.read_only === true, 'direct TRAINING must be read-only');
assert(trainingDirect.order_ok === true, 'direct TRAINING must keep order');
assert(trainingDirect.hybrid_future === true, 'direct TRAINING must keep hybrid future mode');
assert(trainingDirect.reorder_done === false, 'direct TRAINING must not execute reorder');
assert(trainingDirect.forecast_done === false, 'direct TRAINING must not execute forecast');
assert(trainingDirect.rfid_done === false, 'direct TRAINING must not execute RFID');
assert(trainingDirect.saved === false, 'direct TRAINING must not save');
assert(trainingDirect.wrote === false, 'direct TRAINING must not write');
assert(trainingDirect.mutated === false, 'direct TRAINING must not mutate');

const wrongOrder = buildP26Scan({ ...trainingDirect.descriptor, step_order: 'RFID_COMPATIBILITY_FUTURE|REORDER_REVIEW|FORECAST_FEED_READ_ONLY' });
assert(wrongOrder.candidate === false, 'wrong order must block candidate');
assert(wrongOrder.order_ok === false, 'wrong order must be detected');

const writeMode = buildP26Scan({ ...trainingDirect.descriptor, visibility_mode: 'WRITE' });
assert(writeMode.candidate === false, 'non-read-only mode must block candidate');
assert(writeMode.read_only === false, 'non-read-only mode must be detected');

const wrongCompatibility = buildP26Scan({ ...trainingDirect.descriptor, compatibility_mode: 'ACTIVE_RFID' });
assert(wrongCompatibility.candidate === false, 'active RFID mode must block candidate');
assert(wrongCompatibility.hybrid_future === false, 'active RFID mode must be detected');

const missingDirect = buildP26Scan({ environment: 'TRAINING' });
assert(missingDirect.candidate === false, 'missing fields must block candidate');
assert(missingDirect.fields_present === false, 'missing fields must be detected');

const statusPassed = results.every((result) => result.passed);
assert(statusPassed === true, 'status must pass');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('P26 ScanOps final candidate remains LIVE/PRODUCTION-blocked, TEST/TRAINING candidate-only, capture-only, read-only, ordered, hybrid-future-only, no reorder execution, no forecast execution, no RFID execution, no PO/forecast/RFID writes, not saved, non-writable, and non-mutating.');
