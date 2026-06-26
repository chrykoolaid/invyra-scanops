import { P23_SCAN, P23_SCAN_FIXTURES } from '../src/p23-event/p23Fixtures.js';
import { buildP23Scan, getP23ScanResults } from '../src/p23-event/p23Core.js';
import { getP23ScanStatus } from '../src/p23-event/p23Status.js';

const errors = [];
function assert(condition, message) { if (!condition) errors.push(message); }

assert(P23_SCAN === '23B/23D', 'phase marker must remain 23B/23D');
assert(Object.isFrozen(P23_SCAN_FIXTURES), 'fixtures must be frozen');
assert(P23_SCAN_FIXTURES.length === 6, 'expected six fixtures');

const results = getP23ScanResults();
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
  assert(item.sent === false, `send must not occur: ${result.fixture_id}`);
  assert(item.ack_out === false, `ack must not emit: ${result.fixture_id}`);
  assert(item.retry_done === false, `retry must not execute: ${result.fixture_id}`);
  assert(item.replay_done === false, `replay must not execute: ${result.fixture_id}`);
  assert(item.duplicate_saved === false, `duplicate save must not occur: ${result.fixture_id}`);
  assert(item.audit_saved === false, `audit save must not occur: ${result.fixture_id}`);
  assert(item.completed === false, `completion must not occur: ${result.fixture_id}`);
  assert(item.saved === false, `save must not occur: ${result.fixture_id}`);
  assert(item.wrote === false, `write must not occur: ${result.fixture_id}`);
  assert(item.mutated === false, `mutation must not occur: ${result.fixture_id}`);

  if (['LIVE', 'PRODUCTION'].includes(item.environment)) {
    assert(item.candidate === false, `LIVE/PRODUCTION must be blocked: ${result.fixture_id}`);
    assert(item.status === 'BLOCKED', `LIVE/PRODUCTION status must be BLOCKED: ${result.fixture_id}`);
  }

  if (['TRAINING', 'TEST'].includes(item.environment) && item.fields_present && item.read_only) {
    assert(item.candidate === true, `TEST/TRAINING with valid fields may be candidate: ${result.fixture_id}`);
    assert(item.status === 'EVENT_TEST_CANDIDATE_ONLY', `TEST/TRAINING status must be EVENT_TEST_CANDIDATE_ONLY: ${result.fixture_id}`);
    assert(item.tx_candidate === true, `tx candidate must be true: ${result.fixture_id}`);
    assert(item.ack_candidate === true, `ack candidate must be true: ${result.fixture_id}`);
    assert(item.retry_candidate === true, `retry candidate must be true: ${result.fixture_id}`);
    assert(item.duplicate_candidate === true, `duplicate candidate must be true: ${result.fixture_id}`);
    assert(item.audit_candidate === true, `audit candidate must be true: ${result.fixture_id}`);
  }
}

const liveDirect = buildP23Scan({ environment: 'LIVE' });
assert(liveDirect.candidate === false, 'direct LIVE must be blocked');
assert(liveDirect.capture_only === true, 'direct LIVE must stay capture-only');
assert(liveDirect.stock_change === false, 'direct LIVE must not allow stock change');
assert(liveDirect.wrote === false, 'direct LIVE must not write');
assert(liveDirect.mutated === false, 'direct LIVE must not mutate');

const trainingDirect = buildP23Scan({
  event_test_id: 'direct-training-event',
  environment: 'TRAINING',
  link_id: 'link',
  device_id: 'device',
  event_id: 'event',
  event_type: 'READ_ONLY_VISIBILITY_CHECK',
  source_system: 'SCANOPS',
  store_id: 'store',
  target_system: 'INVENTORY',
  visibility_mode: 'READ_ONLY',
  audit_scope: 'STATIC_AUDIT_CANDIDATE',
});
assert(trainingDirect.candidate === true, 'direct TRAINING may be candidate only');
assert(trainingDirect.read_only === true, 'direct TRAINING must be read-only');
assert(trainingDirect.tx_candidate === true, 'direct TRAINING may shape tx candidate');
assert(trainingDirect.ack_candidate === true, 'direct TRAINING may shape ack candidate');
assert(trainingDirect.sent === false, 'direct TRAINING must not send');
assert(trainingDirect.ack_out === false, 'direct TRAINING must not emit ack');
assert(trainingDirect.retry_done === false, 'direct TRAINING must not retry');
assert(trainingDirect.replay_done === false, 'direct TRAINING must not replay');
assert(trainingDirect.saved === false, 'direct TRAINING must not save');
assert(trainingDirect.wrote === false, 'direct TRAINING must not write');
assert(trainingDirect.mutated === false, 'direct TRAINING must not mutate');

const writableDirect = buildP23Scan({ ...trainingDirect.descriptor, visibility_mode: 'WRITE' });
assert(writableDirect.candidate === false, 'non-read-only mode must block candidate');
assert(writableDirect.read_only === false, 'non-read-only mode must be detected');

const missingDirect = buildP23Scan({ environment: 'TRAINING' });
assert(missingDirect.candidate === false, 'missing fields must block candidate');
assert(missingDirect.fields_present === false, 'missing fields must be detected');

const status = getP23ScanStatus();
assert(status.passed === true, 'status must pass');
assert(status.fixture_count === 6, 'status fixture count must match');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('P23 ScanOps event candidate remains LIVE/PRODUCTION-blocked, TEST/TRAINING candidate-only, capture-only, read-only, no stock change, no workflow change, no send, no ack, no retry, no replay, no duplicate save, no audit save, not saved, and non-mutating.');
