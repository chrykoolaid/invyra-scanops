import { SCANOPS_PHASE19, SCANOPS_PHASE19_FIXTURES } from '../src/inventory-bridge/phase19/phase19Fixtures.js';
import { buildScanOpsPhase19Gate, getScanOpsPhase19GateResults } from '../src/inventory-bridge/phase19/phase19Gate.js';
import { getScanOpsPhase19Summary } from '../src/inventory-bridge/phase19/phase19Summary.js';

const errors = [];
function assert(condition, message) { if (!condition) errors.push(message); }

assert(SCANOPS_PHASE19 === '19B/19D', 'phase marker must remain 19B/19D');
assert(Object.isFrozen(SCANOPS_PHASE19_FIXTURES), 'fixtures must be frozen');
assert(SCANOPS_PHASE19_FIXTURES.length === 6, 'expected six fixtures');

const results = getScanOpsPhase19GateResults();
assert(Object.isFrozen(results), 'results must be frozen');

for (const result of results) {
  const { gate } = result;
  assert(result.passed === true, `fixture must pass: ${result.fixture_id}`);
  assert(Object.isFrozen(result), `result must be frozen: ${result.fixture_id}`);
  assert(Object.isFrozen(gate), `gate must be frozen: ${result.fixture_id}`);
  assert(gate.readiness_gate_candidate_only === true, `candidate only must stay true: ${result.fixture_id}`);
  assert(gate.capture_only === true, `capture only must stay true: ${result.fixture_id}`);
  assert(gate.live_enabled === false, `LIVE must not enable: ${result.fixture_id}`);
  assert(gate.activation_allowed === false, `activation must not be allowed: ${result.fixture_id}`);
  assert(gate.activation_attempted === false, `activation must not be attempted: ${result.fixture_id}`);
  assert(gate.sync_executed === false, `sync must not execute: ${result.fixture_id}`);
  assert(gate.dispatched === false, `dispatch must not occur: ${result.fixture_id}`);
  assert(gate.received === false, `receive must not occur: ${result.fixture_id}`);
  assert(gate.completed === false, `completion must not occur: ${result.fixture_id}`);
  assert(gate.persisted === false, `persistence must not occur: ${result.fixture_id}`);
  assert(gate.receipt_emitted === false, `receipt must not emit: ${result.fixture_id}`);
  assert(gate.acknowledgement_emitted === false, `acknowledgement must not emit: ${result.fixture_id}`);
  assert(gate.write_attempted === false, `write must not occur: ${result.fixture_id}`);
  assert(gate.mutation_attempted === false, `mutation must not occur: ${result.fixture_id}`);

  if (['LIVE', 'PRODUCTION'].includes(gate.environment)) {
    assert(gate.readiness_candidate === false, `LIVE/PRODUCTION must be blocked: ${result.fixture_id}`);
    assert(gate.status === 'BLOCKED', `LIVE/PRODUCTION status must be BLOCKED: ${result.fixture_id}`);
  }

  if (['TRAINING', 'TEST'].includes(gate.environment) && gate.fields_present) {
    assert(gate.readiness_candidate === true, `TEST/TRAINING with fields may be candidate: ${result.fixture_id}`);
    assert(gate.status === 'READINESS_GATE_CANDIDATE_ONLY', `TEST/TRAINING status must be READINESS_GATE_CANDIDATE_ONLY: ${result.fixture_id}`);
  }
}

const liveDirect = buildScanOpsPhase19Gate({ environment: 'LIVE' });
assert(liveDirect.readiness_candidate === false, 'direct LIVE must be blocked');
assert(liveDirect.capture_only === true, 'direct LIVE must stay capture-only');
assert(liveDirect.live_enabled === false, 'direct LIVE must not enable');
assert(liveDirect.activation_allowed === false, 'direct LIVE must not allow activation');
assert(liveDirect.write_attempted === false, 'direct LIVE must not write');
assert(liveDirect.mutation_attempted === false, 'direct LIVE must not mutate');

const trainingDirect = buildScanOpsPhase19Gate({
  gate_id: 'direct-training-gate',
  environment: 'TRAINING',
  acceptance_id: 'acceptance',
  recovery_id: 'recovery',
  response_id: 'response',
  review_id: 'review',
  event_id: 'event',
  source_system: 'SCANOPS',
  source_store_id: 'store',
  target_system: 'INVENTORY',
  readiness_gate: 'REQUIRED',
  readiness_profile: 'STRICT_STATIC_READINESS',
});
assert(trainingDirect.readiness_candidate === true, 'direct TRAINING may be candidate only');
assert(trainingDirect.live_enabled === false, 'direct TRAINING must not enable LIVE');
assert(trainingDirect.activation_allowed === false, 'direct TRAINING must not allow activation');
assert(trainingDirect.activation_attempted === false, 'direct TRAINING must not attempt activation');
assert(trainingDirect.sync_executed === false, 'direct TRAINING must not execute sync');
assert(trainingDirect.dispatched === false, 'direct TRAINING must not dispatch');
assert(trainingDirect.received === false, 'direct TRAINING must not receive');
assert(trainingDirect.persisted === false, 'direct TRAINING must not persist');
assert(trainingDirect.write_attempted === false, 'direct TRAINING must not write');
assert(trainingDirect.mutation_attempted === false, 'direct TRAINING must not mutate');

const missingDirect = buildScanOpsPhase19Gate({ environment: 'TRAINING' });
assert(missingDirect.readiness_candidate === false, 'missing fields must block candidate');
assert(missingDirect.fields_present === false, 'missing fields must be detected');

const summary = getScanOpsPhase19Summary();
assert(summary.passed === true, 'summary must pass');
assert(summary.fixture_count === 6, 'summary fixture count must match');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps Phase 19 readiness gate remains LIVE/PRODUCTION-blocked, TEST/TRAINING candidate-only, capture-only, LIVE not enabled, activation not allowed, no sync execution, no dispatch, no receive, not persisted, non-receipting, non-acknowledging, non-writable, and non-mutating.');
