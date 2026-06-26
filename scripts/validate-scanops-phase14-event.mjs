import { SCANOPS_PHASE14, SCANOPS_PHASE14_FIXTURES } from '../src/inventory-bridge/phase14/phase14Fixtures.js';
import { buildScanOpsPhase14Event, getScanOpsPhase14EventResults } from '../src/inventory-bridge/phase14/phase14Event.js';
import { getScanOpsPhase14Summary } from '../src/inventory-bridge/phase14/phase14Summary.js';

const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

assert(SCANOPS_PHASE14 === '14B/14D', 'phase marker must remain 14B/14D');
assert(Object.isFrozen(SCANOPS_PHASE14_FIXTURES), 'fixtures must be frozen');
assert(SCANOPS_PHASE14_FIXTURES.length === 6, 'expected six fixtures');

const results = getScanOpsPhase14EventResults();
assert(Object.isFrozen(results), 'results must be frozen');

for (const result of results) {
  const { event } = result;
  assert(result.passed === true, `fixture must pass: ${result.fixture_id}`);
  assert(Object.isFrozen(result), `result must be frozen: ${result.fixture_id}`);
  assert(Object.isFrozen(event), `event must be frozen: ${result.fixture_id}`);
  assert(event.event_candidate_only === true, `candidate only must stay true: ${result.fixture_id}`);
  assert(event.capture_only === true, `capture only must stay true: ${result.fixture_id}`);
  assert(event.output_attempted === false, `output must not occur: ${result.fixture_id}`);
  assert(event.inventory_call_attempted === false, `Inventory call must not occur: ${result.fixture_id}`);
  assert(event.processed === false, `processing must not occur: ${result.fixture_id}`);
  assert(event.completed === false, `completion must not occur: ${result.fixture_id}`);
  assert(event.persisted === false, `persistence must not occur: ${result.fixture_id}`);
  assert(event.receipt_emitted === false, `receipt must not emit: ${result.fixture_id}`);
  assert(event.acknowledgement_emitted === false, `acknowledgement must not emit: ${result.fixture_id}`);
  assert(event.write_attempted === false, `write must not occur: ${result.fixture_id}`);
  assert(event.mutation_attempted === false, `mutation must not occur: ${result.fixture_id}`);

  if (['LIVE', 'PRODUCTION'].includes(event.environment)) {
    assert(event.event_candidate === false, `LIVE/PRODUCTION must be blocked: ${result.fixture_id}`);
    assert(event.status === 'BLOCKED', `LIVE/PRODUCTION status must be BLOCKED: ${result.fixture_id}`);
  }

  if (['TRAINING', 'TEST'].includes(event.environment) && event.fields_present) {
    assert(event.event_candidate === true, `TEST/TRAINING with fields may be candidate: ${result.fixture_id}`);
    assert(event.status === 'OUTBOUND_EVENT_CANDIDATE_ONLY', `TEST/TRAINING status must be OUTBOUND_EVENT_CANDIDATE_ONLY: ${result.fixture_id}`);
  }
}

const liveDirect = buildScanOpsPhase14Event({ environment: 'LIVE' });
assert(liveDirect.event_candidate === false, 'direct LIVE must be blocked');
assert(liveDirect.capture_only === true, 'direct LIVE must remain capture-only');
assert(liveDirect.write_attempted === false, 'direct LIVE must not write');
assert(liveDirect.mutation_attempted === false, 'direct LIVE must not mutate');

const trainingDirect = buildScanOpsPhase14Event({
  event_id: 'direct-training-event',
  environment: 'TRAINING',
  handshake_id: 'handshake',
  handshake_key: 'key',
  runner_id: 'runner',
  source_system: 'SCANOPS',
  source_device_id: 'device',
  source_store_id: 'store',
  target_system: 'INVENTORY',
  event_type: 'STOCK_OBSERVATION_CANDIDATE',
  event_gate: 'REQUIRED',
  event_profile: 'STRICT_STATIC_EVENT',
});
assert(trainingDirect.event_candidate === true, 'direct TRAINING may be candidate only');
assert(trainingDirect.output_attempted === false, 'direct TRAINING must not output');
assert(trainingDirect.inventory_call_attempted === false, 'direct TRAINING must not call Inventory');
assert(trainingDirect.processed === false, 'direct TRAINING must not process');
assert(trainingDirect.completed === false, 'direct TRAINING must not complete');
assert(trainingDirect.persisted === false, 'direct TRAINING must not persist');
assert(trainingDirect.write_attempted === false, 'direct TRAINING must not write');
assert(trainingDirect.mutation_attempted === false, 'direct TRAINING must not mutate');

const missingDirect = buildScanOpsPhase14Event({ environment: 'TRAINING' });
assert(missingDirect.event_candidate === false, 'missing fields must block candidate');
assert(missingDirect.fields_present === false, 'missing fields must be detected');

const summary = getScanOpsPhase14Summary();
assert(summary.passed === true, 'summary must pass');
assert(summary.fixture_count === 6, 'summary fixture count must match');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps Phase 14 event candidate remains LIVE/PRODUCTION-blocked, TEST/TRAINING candidate-only, capture-only, no output, no Inventory call, not processed, not persisted, non-receipting, non-acknowledging, non-writable, and non-mutating.');
