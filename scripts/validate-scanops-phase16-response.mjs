import { SCANOPS_PHASE16, SCANOPS_PHASE16_FIXTURES } from '../src/inventory-bridge/phase16/phase16Fixtures.js';
import { buildScanOpsPhase16Response, getScanOpsPhase16ResponseResults } from '../src/inventory-bridge/phase16/phase16Response.js';
import { getScanOpsPhase16Summary } from '../src/inventory-bridge/phase16/phase16Summary.js';

const errors = [];
function assert(condition, message) { if (!condition) errors.push(message); }

assert(SCANOPS_PHASE16 === '16B/16D', 'phase marker must remain 16B/16D');
assert(Object.isFrozen(SCANOPS_PHASE16_FIXTURES), 'fixtures must be frozen');
assert(SCANOPS_PHASE16_FIXTURES.length === 6, 'expected six fixtures');

const results = getScanOpsPhase16ResponseResults();
assert(Object.isFrozen(results), 'results must be frozen');

for (const result of results) {
  const { response } = result;
  assert(result.passed === true, `fixture must pass: ${result.fixture_id}`);
  assert(Object.isFrozen(result), `result must be frozen: ${result.fixture_id}`);
  assert(Object.isFrozen(response), `response must be frozen: ${result.fixture_id}`);
  assert(response.response_candidate_only === true, `candidate only must stay true: ${result.fixture_id}`);
  assert(response.capture_only === true, `capture only must stay true: ${result.fixture_id}`);
  assert(response.received === false, `receive must not occur: ${result.fixture_id}`);
  assert(response.receipt_emitted === false, `receipt must not emit: ${result.fixture_id}`);
  assert(response.acknowledgement_emitted === false, `acknowledgement must not emit: ${result.fixture_id}`);
  assert(response.emitted === false, `emit must not occur: ${result.fixture_id}`);
  assert(response.sent === false, `send must not occur: ${result.fixture_id}`);
  assert(response.accepted === false, `acceptance must not occur: ${result.fixture_id}`);
  assert(response.applied === false, `application must not occur: ${result.fixture_id}`);
  assert(response.completed === false, `completion must not occur: ${result.fixture_id}`);
  assert(response.persisted === false, `persistence must not occur: ${result.fixture_id}`);
  assert(response.write_attempted === false, `write must not occur: ${result.fixture_id}`);
  assert(response.mutation_attempted === false, `mutation must not occur: ${result.fixture_id}`);

  if (['LIVE', 'PRODUCTION'].includes(response.environment)) {
    assert(response.response_candidate === false, `LIVE/PRODUCTION must be blocked: ${result.fixture_id}`);
    assert(response.status === 'BLOCKED', `LIVE/PRODUCTION status must be BLOCKED: ${result.fixture_id}`);
  }

  if (['TRAINING', 'TEST'].includes(response.environment) && response.fields_present) {
    assert(response.response_candidate === true, `TEST/TRAINING with fields may be candidate: ${result.fixture_id}`);
    assert(response.status === 'RESPONSE_CANDIDATE_ONLY', `TEST/TRAINING status must be RESPONSE_CANDIDATE_ONLY: ${result.fixture_id}`);
  }
}

const liveDirect = buildScanOpsPhase16Response({ environment: 'LIVE' });
assert(liveDirect.response_candidate === false, 'direct LIVE must be blocked');
assert(liveDirect.capture_only === true, 'direct LIVE must remain capture-only');
assert(liveDirect.receipt_emitted === false, 'direct LIVE must not receipt');
assert(liveDirect.acknowledgement_emitted === false, 'direct LIVE must not acknowledge');
assert(liveDirect.write_attempted === false, 'direct LIVE must not write');
assert(liveDirect.mutation_attempted === false, 'direct LIVE must not mutate');

const trainingDirect = buildScanOpsPhase16Response({
  response_id: 'direct-training-response',
  environment: 'TRAINING',
  review_id: 'review',
  event_id: 'event',
  event_key: 'key',
  source_system: 'INVENTORY',
  source_device_id: 'desktop',
  source_store_id: 'store',
  target_system: 'SCANOPS',
  response_gate: 'REQUIRED',
  response_profile: 'STRICT_STATIC_RESPONSE',
});
assert(trainingDirect.response_candidate === true, 'direct TRAINING may be candidate only');
assert(trainingDirect.received === false, 'direct TRAINING must not receive');
assert(trainingDirect.receipt_emitted === false, 'direct TRAINING must not receipt');
assert(trainingDirect.acknowledgement_emitted === false, 'direct TRAINING must not acknowledge');
assert(trainingDirect.emitted === false, 'direct TRAINING must not emit');
assert(trainingDirect.sent === false, 'direct TRAINING must not send');
assert(trainingDirect.persisted === false, 'direct TRAINING must not persist');
assert(trainingDirect.write_attempted === false, 'direct TRAINING must not write');
assert(trainingDirect.mutation_attempted === false, 'direct TRAINING must not mutate');

const missingDirect = buildScanOpsPhase16Response({ environment: 'TRAINING' });
assert(missingDirect.response_candidate === false, 'missing fields must block candidate');
assert(missingDirect.fields_present === false, 'missing fields must be detected');

const summary = getScanOpsPhase16Summary();
assert(summary.passed === true, 'summary must pass');
assert(summary.fixture_count === 6, 'summary fixture count must match');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps Phase 16 response candidate remains LIVE/PRODUCTION-blocked, TEST/TRAINING candidate-only, capture-only, no receipt, no acknowledgement, no receive, no emit, no send, not persisted, non-writable, and non-mutating.');
