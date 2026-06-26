import { SCANOPS_PHASE17, SCANOPS_PHASE17_FIXTURES } from '../src/inventory-bridge/phase17/phase17Fixtures.js';
import { buildScanOpsPhase17Recovery, getScanOpsPhase17RecoveryResults } from '../src/inventory-bridge/phase17/phase17Recovery.js';
import { getScanOpsPhase17Summary } from '../src/inventory-bridge/phase17/phase17Summary.js';

const errors = [];
function assert(condition, message) { if (!condition) errors.push(message); }

assert(SCANOPS_PHASE17 === '17B/17D', 'phase marker must remain 17B/17D');
assert(Object.isFrozen(SCANOPS_PHASE17_FIXTURES), 'fixtures must be frozen');
assert(SCANOPS_PHASE17_FIXTURES.length === 6, 'expected six fixtures');

const results = getScanOpsPhase17RecoveryResults();
assert(Object.isFrozen(results), 'results must be frozen');

for (const result of results) {
  const { recovery } = result;
  assert(result.passed === true, `fixture must pass: ${result.fixture_id}`);
  assert(Object.isFrozen(result), `result must be frozen: ${result.fixture_id}`);
  assert(Object.isFrozen(recovery), `recovery must be frozen: ${result.fixture_id}`);
  assert(recovery.recovery_candidate_only === true, `candidate only must stay true: ${result.fixture_id}`);
  assert(recovery.capture_only === true, `capture only must stay true: ${result.fixture_id}`);
  assert(recovery.replay_attempted === false, `replay must not occur: ${result.fixture_id}`);
  assert(recovery.retry_attempted === false, `retry must not occur: ${result.fixture_id}`);
  assert(recovery.dispatched === false, `dispatch must not occur: ${result.fixture_id}`);
  assert(recovery.received === false, `receive must not occur: ${result.fixture_id}`);
  assert(recovery.emitted === false, `emit must not occur: ${result.fixture_id}`);
  assert(recovery.completed === false, `completion must not occur: ${result.fixture_id}`);
  assert(recovery.persisted === false, `persistence must not occur: ${result.fixture_id}`);
  assert(recovery.receipt_emitted === false, `receipt must not emit: ${result.fixture_id}`);
  assert(recovery.acknowledgement_emitted === false, `acknowledgement must not emit: ${result.fixture_id}`);
  assert(recovery.write_attempted === false, `write must not occur: ${result.fixture_id}`);
  assert(recovery.mutation_attempted === false, `mutation must not occur: ${result.fixture_id}`);

  if (['LIVE', 'PRODUCTION'].includes(recovery.environment)) {
    assert(recovery.recovery_candidate === false, `LIVE/PRODUCTION must be blocked: ${result.fixture_id}`);
    assert(recovery.status === 'BLOCKED', `LIVE/PRODUCTION status must be BLOCKED: ${result.fixture_id}`);
  }

  if (['TRAINING', 'TEST'].includes(recovery.environment) && recovery.fields_present) {
    assert(recovery.recovery_candidate === true, `TEST/TRAINING with fields may be candidate: ${result.fixture_id}`);
    assert(recovery.status === 'RECOVERY_CANDIDATE_ONLY', `TEST/TRAINING status must be RECOVERY_CANDIDATE_ONLY: ${result.fixture_id}`);
  }
}

const liveDirect = buildScanOpsPhase17Recovery({ environment: 'LIVE' });
assert(liveDirect.recovery_candidate === false, 'direct LIVE must be blocked');
assert(liveDirect.capture_only === true, 'direct LIVE must stay capture-only');
assert(liveDirect.replay_attempted === false, 'direct LIVE must not replay');
assert(liveDirect.retry_attempted === false, 'direct LIVE must not retry');
assert(liveDirect.write_attempted === false, 'direct LIVE must not write');
assert(liveDirect.mutation_attempted === false, 'direct LIVE must not mutate');

const trainingDirect = buildScanOpsPhase17Recovery({
  recovery_id: 'direct-training-recovery',
  environment: 'TRAINING',
  response_id: 'response',
  review_id: 'review',
  event_id: 'event',
  event_key: 'key',
  source_system: 'SCANOPS',
  source_store_id: 'store',
  target_system: 'INVENTORY',
  failure_code: 'STATIC_TEST_FAILURE',
  recovery_gate: 'REQUIRED',
  recovery_profile: 'STRICT_STATIC_RECOVERY',
});
assert(trainingDirect.recovery_candidate === true, 'direct TRAINING may be candidate only');
assert(trainingDirect.replay_attempted === false, 'direct TRAINING must not replay');
assert(trainingDirect.retry_attempted === false, 'direct TRAINING must not retry');
assert(trainingDirect.dispatched === false, 'direct TRAINING must not dispatch');
assert(trainingDirect.received === false, 'direct TRAINING must not receive');
assert(trainingDirect.emitted === false, 'direct TRAINING must not emit');
assert(trainingDirect.persisted === false, 'direct TRAINING must not persist');
assert(trainingDirect.write_attempted === false, 'direct TRAINING must not write');
assert(trainingDirect.mutation_attempted === false, 'direct TRAINING must not mutate');

const missingDirect = buildScanOpsPhase17Recovery({ environment: 'TRAINING' });
assert(missingDirect.recovery_candidate === false, 'missing fields must block candidate');
assert(missingDirect.fields_present === false, 'missing fields must be detected');

const summary = getScanOpsPhase17Summary();
assert(summary.passed === true, 'summary must pass');
assert(summary.fixture_count === 6, 'summary fixture count must match');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps Phase 17 recovery candidate remains LIVE/PRODUCTION-blocked, TEST/TRAINING candidate-only, capture-only, no replay, no retry, no dispatch, no receive, no emit, not persisted, non-receipting, non-acknowledging, non-writable, and non-mutating.');
