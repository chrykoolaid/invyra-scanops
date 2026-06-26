import { SCANOPS_PHASE15, SCANOPS_PHASE15_FIXTURES } from '../src/inventory-bridge/phase15/phase15Fixtures.js';
import { buildScanOpsPhase15Review, getScanOpsPhase15ReviewResults } from '../src/inventory-bridge/phase15/phase15Review.js';
import { getScanOpsPhase15Summary } from '../src/inventory-bridge/phase15/phase15Summary.js';

const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

assert(SCANOPS_PHASE15 === '15B/15D', 'phase marker must remain 15B/15D');
assert(Object.isFrozen(SCANOPS_PHASE15_FIXTURES), 'fixtures must be frozen');
assert(SCANOPS_PHASE15_FIXTURES.length === 6, 'expected six fixtures');

const results = getScanOpsPhase15ReviewResults();
assert(Object.isFrozen(results), 'results must be frozen');

for (const result of results) {
  const { review } = result;
  assert(result.passed === true, `fixture must pass: ${result.fixture_id}`);
  assert(Object.isFrozen(result), `result must be frozen: ${result.fixture_id}`);
  assert(Object.isFrozen(review), `review must be frozen: ${result.fixture_id}`);
  assert(review.source_review_candidate_only === true, `candidate only must stay true: ${result.fixture_id}`);
  assert(review.capture_only === true, `capture only must stay true: ${result.fixture_id}`);
  assert(review.sent === false, `send must not occur: ${result.fixture_id}`);
  assert(review.inventory_called === false, `Inventory call must not occur: ${result.fixture_id}`);
  assert(review.accepted === false, `acceptance must not occur: ${result.fixture_id}`);
  assert(review.applied === false, `application must not occur: ${result.fixture_id}`);
  assert(review.completed === false, `completion must not occur: ${result.fixture_id}`);
  assert(review.persisted === false, `persistence must not occur: ${result.fixture_id}`);
  assert(review.receipt_emitted === false, `receipt must not emit: ${result.fixture_id}`);
  assert(review.acknowledgement_emitted === false, `acknowledgement must not emit: ${result.fixture_id}`);
  assert(review.write_attempted === false, `write must not occur: ${result.fixture_id}`);
  assert(review.mutation_attempted === false, `mutation must not occur: ${result.fixture_id}`);

  if (['LIVE', 'PRODUCTION'].includes(review.environment)) {
    assert(review.review_candidate === false, `LIVE/PRODUCTION must be blocked: ${result.fixture_id}`);
    assert(review.status === 'BLOCKED', `LIVE/PRODUCTION status must be BLOCKED: ${result.fixture_id}`);
  }

  if (['TRAINING', 'TEST'].includes(review.environment) && review.fields_present) {
    assert(review.review_candidate === true, `TEST/TRAINING with fields may be candidate: ${result.fixture_id}`);
    assert(review.status === 'SOURCE_REVIEW_CANDIDATE_ONLY', `TEST/TRAINING status must be SOURCE_REVIEW_CANDIDATE_ONLY: ${result.fixture_id}`);
  }
}

const liveDirect = buildScanOpsPhase15Review({ environment: 'LIVE' });
assert(liveDirect.review_candidate === false, 'direct LIVE must be blocked');
assert(liveDirect.capture_only === true, 'direct LIVE must remain capture-only');
assert(liveDirect.write_attempted === false, 'direct LIVE must not write');
assert(liveDirect.mutation_attempted === false, 'direct LIVE must not mutate');

const trainingDirect = buildScanOpsPhase15Review({
  review_id: 'direct-training-review',
  environment: 'TRAINING',
  event_id: 'event',
  event_key: 'key',
  source_system: 'SCANOPS',
  source_device_id: 'device',
  source_store_id: 'store',
  target_system: 'INVENTORY',
  event_type: 'STOCK_OBSERVATION_CANDIDATE',
  review_gate: 'REQUIRED',
  review_profile: 'STRICT_STATIC_SOURCE_REVIEW',
});
assert(trainingDirect.review_candidate === true, 'direct TRAINING may be candidate only');
assert(trainingDirect.sent === false, 'direct TRAINING must not send');
assert(trainingDirect.inventory_called === false, 'direct TRAINING must not call Inventory');
assert(trainingDirect.accepted === false, 'direct TRAINING must not accept');
assert(trainingDirect.applied === false, 'direct TRAINING must not apply');
assert(trainingDirect.completed === false, 'direct TRAINING must not complete');
assert(trainingDirect.persisted === false, 'direct TRAINING must not persist');
assert(trainingDirect.write_attempted === false, 'direct TRAINING must not write');
assert(trainingDirect.mutation_attempted === false, 'direct TRAINING must not mutate');

const missingDirect = buildScanOpsPhase15Review({ environment: 'TRAINING' });
assert(missingDirect.review_candidate === false, 'missing fields must block candidate');
assert(missingDirect.fields_present === false, 'missing fields must be detected');

const summary = getScanOpsPhase15Summary();
assert(summary.passed === true, 'summary must pass');
assert(summary.fixture_count === 6, 'summary fixture count must match');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps Phase 15 source review candidate remains LIVE/PRODUCTION-blocked, TEST/TRAINING candidate-only, capture-only, not sent, no Inventory call, not accepted, not applied, not persisted, non-receipting, non-acknowledging, non-writable, and non-mutating.');
