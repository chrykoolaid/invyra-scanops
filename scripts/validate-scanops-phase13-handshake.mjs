import { SCANOPS_PHASE13, SCANOPS_PHASE13_FIXTURES } from '../src/inventory-bridge/phase13/phase13Fixtures.js';
import { buildScanOpsPhase13Handshake, getScanOpsPhase13HandshakeResults } from '../src/inventory-bridge/phase13/phase13Handshake.js';
import { getScanOpsPhase13Status } from '../src/inventory-bridge/phase13/phase13Status.js';

const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

assert(SCANOPS_PHASE13 === '13B/13D', 'phase marker must remain 13B/13D');
assert(Object.isFrozen(SCANOPS_PHASE13_FIXTURES), 'fixtures must be frozen');
assert(SCANOPS_PHASE13_FIXTURES.length === 6, 'expected six fixtures');

const results = getScanOpsPhase13HandshakeResults();
assert(Object.isFrozen(results), 'results must be frozen');

for (const result of results) {
  const { handshake } = result;
  assert(result.passed === true, `fixture must pass: ${result.fixture_id}`);
  assert(Object.isFrozen(result), `result must be frozen: ${result.fixture_id}`);
  assert(Object.isFrozen(handshake), `handshake must be frozen: ${result.fixture_id}`);
  assert(handshake.local_handshake_candidate_only === true, `candidate only must stay true: ${result.fixture_id}`);
  assert(handshake.capture_only === true, `capture only must stay true: ${result.fixture_id}`);
  assert(handshake.local_attempted === false, `local attempt must not occur: ${result.fixture_id}`);
  assert(handshake.inventory_call_attempted === false, `Inventory call must not occur: ${result.fixture_id}`);
  assert(handshake.dispatch_attempted === false, `dispatch must not occur: ${result.fixture_id}`);
  assert(handshake.executed === false, `execution must not occur: ${result.fixture_id}`);
  assert(handshake.completed === false, `completion must not occur: ${result.fixture_id}`);
  assert(handshake.persisted === false, `persistence must not occur: ${result.fixture_id}`);
  assert(handshake.receipt_emitted === false, `receipt must not emit: ${result.fixture_id}`);
  assert(handshake.acknowledgement_emitted === false, `acknowledgement must not emit: ${result.fixture_id}`);
  assert(handshake.write_attempted === false, `write must not occur: ${result.fixture_id}`);
  assert(handshake.mutation_attempted === false, `mutation must not occur: ${result.fixture_id}`);

  if (['LIVE', 'PRODUCTION'].includes(handshake.environment)) {
    assert(handshake.handshake_candidate === false, `LIVE/PRODUCTION must be blocked: ${result.fixture_id}`);
    assert(handshake.status === 'BLOCKED', `LIVE/PRODUCTION status must be BLOCKED: ${result.fixture_id}`);
  }

  if (['TRAINING', 'TEST'].includes(handshake.environment) && handshake.fields_present) {
    assert(handshake.handshake_candidate === true, `TEST/TRAINING with fields may be candidate: ${result.fixture_id}`);
    assert(handshake.status === 'LOCAL_HANDSHAKE_CANDIDATE_ONLY', `TEST/TRAINING status must be LOCAL_HANDSHAKE_CANDIDATE_ONLY: ${result.fixture_id}`);
  }
}

const liveDirect = buildScanOpsPhase13Handshake({ environment: 'LIVE' });
assert(liveDirect.handshake_candidate === false, 'direct LIVE must be blocked');
assert(liveDirect.capture_only === true, 'direct LIVE must remain capture-only');
assert(liveDirect.write_attempted === false, 'direct LIVE must not write');
assert(liveDirect.mutation_attempted === false, 'direct LIVE must not mutate');

const trainingDirect = buildScanOpsPhase13Handshake({
  handshake_id: 'direct-training-handshake',
  environment: 'TRAINING',
  runner_id: 'runner',
  runner_key: 'key',
  handoff_id: 'handoff',
  source_system: 'SCANOPS',
  source_device_id: 'device',
  source_store_id: 'store',
  target_system: 'INVENTORY',
  local_endpoint_id: 'endpoint',
  handshake_gate: 'REQUIRED',
  handshake_profile: 'STRICT_STATIC_LOCAL_HANDSHAKE',
});
assert(trainingDirect.handshake_candidate === true, 'direct TRAINING may be candidate only');
assert(trainingDirect.local_attempted === false, 'direct TRAINING must not attempt local path');
assert(trainingDirect.inventory_call_attempted === false, 'direct TRAINING must not call Inventory');
assert(trainingDirect.dispatch_attempted === false, 'direct TRAINING must not dispatch');
assert(trainingDirect.executed === false, 'direct TRAINING must not execute');
assert(trainingDirect.completed === false, 'direct TRAINING must not complete');
assert(trainingDirect.persisted === false, 'direct TRAINING must not persist');
assert(trainingDirect.write_attempted === false, 'direct TRAINING must not write');
assert(trainingDirect.mutation_attempted === false, 'direct TRAINING must not mutate');

const missingDirect = buildScanOpsPhase13Handshake({ environment: 'TRAINING' });
assert(missingDirect.handshake_candidate === false, 'missing fields must block candidate');
assert(missingDirect.fields_present === false, 'missing fields must be detected');

const status = getScanOpsPhase13Status();
assert(status.passed === true, 'status must pass');
assert(status.fixture_count === 6, 'status fixture count must match');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps Phase 13 local handshake candidate remains LIVE/PRODUCTION-blocked, TEST/TRAINING candidate-only, capture-only, no local attempt, no Inventory call, not dispatched, not executed, not persisted, non-receipting, non-acknowledging, non-writable, and non-mutating.');
