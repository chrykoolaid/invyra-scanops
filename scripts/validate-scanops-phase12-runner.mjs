import { SCANOPS_PHASE12, SCANOPS_PHASE12_FIXTURES } from '../src/inventory-bridge/phase12/phase12Fixtures.js';
import { buildScanOpsPhase12Runner, getScanOpsPhase12RunnerResults } from '../src/inventory-bridge/phase12/phase12Runner.js';
import { getScanOpsPhase12Status } from '../src/inventory-bridge/phase12/phase12Status.js';

const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

assert(SCANOPS_PHASE12 === '12B/12D', 'phase marker must remain 12B/12D');
assert(Object.isFrozen(SCANOPS_PHASE12_FIXTURES), 'fixtures must be frozen');
assert(SCANOPS_PHASE12_FIXTURES.length === 6, 'expected six fixtures');

const results = getScanOpsPhase12RunnerResults();
assert(Object.isFrozen(results), 'results must be frozen');

for (const result of results) {
  const { runner } = result;
  assert(result.passed === true, `fixture must pass: ${result.fixture_id}`);
  assert(Object.isFrozen(result), `result must be frozen: ${result.fixture_id}`);
  assert(Object.isFrozen(runner), `runner must be frozen: ${result.fixture_id}`);
  assert(runner.runner_candidate_only === true, `candidate only must stay true: ${result.fixture_id}`);
  assert(runner.capture_only === true, `capture only must stay true: ${result.fixture_id}`);
  assert(runner.inventory_call_attempted === false, `Inventory call must not occur: ${result.fixture_id}`);
  assert(runner.dispatch_attempted === false, `dispatch must not occur: ${result.fixture_id}`);
  assert(runner.executed === false, `execution must not occur: ${result.fixture_id}`);
  assert(runner.completed === false, `completion must not occur: ${result.fixture_id}`);
  assert(runner.persisted === false, `persistence must not occur: ${result.fixture_id}`);
  assert(runner.receipt_emitted === false, `receipt must not emit: ${result.fixture_id}`);
  assert(runner.acknowledgement_emitted === false, `acknowledgement must not emit: ${result.fixture_id}`);
  assert(runner.write_attempted === false, `write must not occur: ${result.fixture_id}`);
  assert(runner.mutation_attempted === false, `mutation must not occur: ${result.fixture_id}`);

  if (['LIVE', 'PRODUCTION'].includes(runner.environment)) {
    assert(runner.runner_candidate === false, `LIVE/PRODUCTION must be blocked: ${result.fixture_id}`);
    assert(runner.status === 'BLOCKED', `LIVE/PRODUCTION status must be BLOCKED: ${result.fixture_id}`);
  }

  if (['TRAINING', 'TEST'].includes(runner.environment) && runner.fields_present) {
    assert(runner.runner_candidate === true, `TEST/TRAINING with fields may be candidate: ${result.fixture_id}`);
    assert(runner.status === 'RUNNER_CANDIDATE_ONLY', `TEST/TRAINING status must be RUNNER_CANDIDATE_ONLY: ${result.fixture_id}`);
  }
}

const liveDirect = buildScanOpsPhase12Runner({ environment: 'LIVE' });
assert(liveDirect.runner_candidate === false, 'direct LIVE must be blocked');
assert(liveDirect.capture_only === true, 'direct LIVE must remain capture-only');
assert(liveDirect.write_attempted === false, 'direct LIVE must not write');
assert(liveDirect.mutation_attempted === false, 'direct LIVE must not mutate');

const trainingDirect = buildScanOpsPhase12Runner({
  runner_id: 'direct-training-runner',
  environment: 'TRAINING',
  handoff_id: 'handoff',
  handoff_key: 'key',
  review_id: 'review',
  evidence_id: 'evidence',
  source_system: 'SCANOPS',
  source_device_id: 'device',
  source_store_id: 'store',
  target_system: 'INVENTORY',
  runner_gate: 'REQUIRED',
  runner_profile: 'STRICT_STATIC_RUNNER',
});
assert(trainingDirect.runner_candidate === true, 'direct TRAINING may be candidate only');
assert(trainingDirect.inventory_call_attempted === false, 'direct TRAINING must not call Inventory');
assert(trainingDirect.dispatch_attempted === false, 'direct TRAINING must not dispatch');
assert(trainingDirect.executed === false, 'direct TRAINING must not execute');
assert(trainingDirect.completed === false, 'direct TRAINING must not complete');
assert(trainingDirect.persisted === false, 'direct TRAINING must not persist');
assert(trainingDirect.write_attempted === false, 'direct TRAINING must not write');
assert(trainingDirect.mutation_attempted === false, 'direct TRAINING must not mutate');

const missingDirect = buildScanOpsPhase12Runner({ environment: 'TRAINING' });
assert(missingDirect.runner_candidate === false, 'missing fields must block candidate');
assert(missingDirect.fields_present === false, 'missing fields must be detected');

const status = getScanOpsPhase12Status();
assert(status.passed === true, 'status must pass');
assert(status.fixture_count === 6, 'status fixture count must match');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps Phase 12 runner candidate remains LIVE/PRODUCTION-blocked, TEST/TRAINING candidate-only, capture-only, not dispatched, not executed, not persisted, non-receipting, non-acknowledging, non-writable, and non-mutating.');
