import { SCANOPS_PHASE18, SCANOPS_PHASE18_FIXTURES } from '../src/inventory-bridge/phase18/phase18Fixtures.js';
import { buildScanOpsPhase18Acceptance, getScanOpsPhase18AcceptanceResults } from '../src/inventory-bridge/phase18/phase18Acceptance.js';
import { getScanOpsPhase18Summary } from '../src/inventory-bridge/phase18/phase18Summary.js';

const errors = [];
function assert(condition, message) { if (!condition) errors.push(message); }

assert(SCANOPS_PHASE18 === '18B/18D', 'phase marker must remain 18B/18D');
assert(Object.isFrozen(SCANOPS_PHASE18_FIXTURES), 'fixtures must be frozen');
assert(SCANOPS_PHASE18_FIXTURES.length === 6, 'expected six fixtures');

const results = getScanOpsPhase18AcceptanceResults();
assert(Object.isFrozen(results), 'results must be frozen');

for (const result of results) {
  const { acceptance } = result;
  assert(result.passed === true, `fixture must pass: ${result.fixture_id}`);
  assert(Object.isFrozen(result), `result must be frozen: ${result.fixture_id}`);
  assert(Object.isFrozen(acceptance), `acceptance must be frozen: ${result.fixture_id}`);
  assert(acceptance.acceptance_candidate_only === true, `candidate only must stay true: ${result.fixture_id}`);
  assert(acceptance.capture_only === true, `capture only must stay true: ${result.fixture_id}`);
  assert(acceptance.accepted === false, `acceptance must not occur: ${result.fixture_id}`);
  assert(acceptance.activated === false, `activation must not occur: ${result.fixture_id}`);
  assert(acceptance.sync_executed === false, `sync must not execute: ${result.fixture_id}`);
  assert(acceptance.dispatched === false, `dispatch must not occur: ${result.fixture_id}`);
  assert(acceptance.received === false, `receive must not occur: ${result.fixture_id}`);
  assert(acceptance.completed === false, `completion must not occur: ${result.fixture_id}`);
  assert(acceptance.persisted === false, `persistence must not occur: ${result.fixture_id}`);
  assert(acceptance.receipt_emitted === false, `receipt must not emit: ${result.fixture_id}`);
  assert(acceptance.acknowledgement_emitted === false, `acknowledgement must not emit: ${result.fixture_id}`);
  assert(acceptance.write_attempted === false, `write must not occur: ${result.fixture_id}`);
  assert(acceptance.mutation_attempted === false, `mutation must not occur: ${result.fixture_id}`);

  if (['LIVE', 'PRODUCTION'].includes(acceptance.environment)) {
    assert(acceptance.acceptance_candidate === false, `LIVE/PRODUCTION must be blocked: ${result.fixture_id}`);
    assert(acceptance.status === 'BLOCKED', `LIVE/PRODUCTION status must be BLOCKED: ${result.fixture_id}`);
  }

  if (['TRAINING', 'TEST'].includes(acceptance.environment) && acceptance.fields_present) {
    assert(acceptance.acceptance_candidate === true, `TEST/TRAINING with fields may be candidate: ${result.fixture_id}`);
    assert(acceptance.status === 'ACCEPTANCE_CANDIDATE_ONLY', `TEST/TRAINING status must be ACCEPTANCE_CANDIDATE_ONLY: ${result.fixture_id}`);
  }
}

const liveDirect = buildScanOpsPhase18Acceptance({ environment: 'LIVE' });
assert(liveDirect.acceptance_candidate === false, 'direct LIVE must be blocked');
assert(liveDirect.capture_only === true, 'direct LIVE must stay capture-only');
assert(liveDirect.accepted === false, 'direct LIVE must not accept');
assert(liveDirect.activated === false, 'direct LIVE must not activate');
assert(liveDirect.write_attempted === false, 'direct LIVE must not write');
assert(liveDirect.mutation_attempted === false, 'direct LIVE must not mutate');

const trainingDirect = buildScanOpsPhase18Acceptance({
  acceptance_id: 'direct-training-acceptance',
  environment: 'TRAINING',
  recovery_id: 'recovery',
  response_id: 'response',
  review_id: 'review',
  event_id: 'event',
  event_key: 'key',
  source_system: 'SCANOPS',
  source_store_id: 'store',
  target_system: 'INVENTORY',
  acceptance_gate: 'REQUIRED',
  acceptance_profile: 'STRICT_STATIC_ACCEPTANCE',
});
assert(trainingDirect.acceptance_candidate === true, 'direct TRAINING may be candidate only');
assert(trainingDirect.accepted === false, 'direct TRAINING must not accept');
assert(trainingDirect.activated === false, 'direct TRAINING must not activate');
assert(trainingDirect.sync_executed === false, 'direct TRAINING must not execute sync');
assert(trainingDirect.dispatched === false, 'direct TRAINING must not dispatch');
assert(trainingDirect.received === false, 'direct TRAINING must not receive');
assert(trainingDirect.persisted === false, 'direct TRAINING must not persist');
assert(trainingDirect.write_attempted === false, 'direct TRAINING must not write');
assert(trainingDirect.mutation_attempted === false, 'direct TRAINING must not mutate');

const missingDirect = buildScanOpsPhase18Acceptance({ environment: 'TRAINING' });
assert(missingDirect.acceptance_candidate === false, 'missing fields must block candidate');
assert(missingDirect.fields_present === false, 'missing fields must be detected');

const summary = getScanOpsPhase18Summary();
assert(summary.passed === true, 'summary must pass');
assert(summary.fixture_count === 6, 'summary fixture count must match');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps Phase 18 acceptance candidate remains LIVE/PRODUCTION-blocked, TEST/TRAINING candidate-only, capture-only, not accepted, not activated, no sync execution, no dispatch, no receive, not persisted, non-receipting, non-acknowledging, non-writable, and non-mutating.');
