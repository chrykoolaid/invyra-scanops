import { SCANOPS_PHASE11, SCANOPS_PHASE11_FIXTURES } from '../src/inventory-bridge/phase11/phase11Fixtures.js';
import { buildScanOpsPhase11Handoff, getScanOpsPhase11HandoffResults } from '../src/inventory-bridge/phase11/phase11Handoff.js';
import { getScanOpsPhase11Summary } from '../src/inventory-bridge/phase11/phase11Summary.js';

const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

assert(SCANOPS_PHASE11 === '11B/11D', 'phase marker must remain 11B/11D');
assert(Object.isFrozen(SCANOPS_PHASE11_FIXTURES), 'fixtures must be frozen');
assert(SCANOPS_PHASE11_FIXTURES.length === 6, 'expected six fixtures');

const results = getScanOpsPhase11HandoffResults();
assert(Object.isFrozen(results), 'results must be frozen');

for (const result of results) {
  const { handoff } = result;
  assert(result.passed === true, `fixture must pass: ${result.fixture_id}`);
  assert(Object.isFrozen(result), `result must be frozen: ${result.fixture_id}`);
  assert(Object.isFrozen(handoff), `handoff must be frozen: ${result.fixture_id}`);
  assert(handoff.handoff_only === true, `handoff only must stay true: ${result.fixture_id}`);
  assert(handoff.capture_only === true, `capture only must stay true: ${result.fixture_id}`);
  assert(handoff.dispatched === false, `dispatch must not occur: ${result.fixture_id}`);
  assert(handoff.inventory_called === false, `Inventory call must not occur: ${result.fixture_id}`);
  assert(handoff.completed === false, `completion must not occur: ${result.fixture_id}`);
  assert(handoff.persisted === false, `persistence must not occur: ${result.fixture_id}`);
  assert(handoff.receipt_emitted === false, `receipt must not emit: ${result.fixture_id}`);
  assert(handoff.acknowledgement_emitted === false, `acknowledgement must not emit: ${result.fixture_id}`);
  assert(handoff.write_attempted === false, `write must not occur: ${result.fixture_id}`);
  assert(handoff.mutation_attempted === false, `mutation must not occur: ${result.fixture_id}`);

  if (['LIVE', 'PRODUCTION'].includes(handoff.environment)) {
    assert(handoff.handoff_candidate === false, `LIVE/PRODUCTION must be blocked: ${result.fixture_id}`);
    assert(handoff.status === 'BLOCKED', `LIVE/PRODUCTION status must be BLOCKED: ${result.fixture_id}`);
  }

  if (['TRAINING', 'TEST'].includes(handoff.environment) && handoff.fields_present) {
    assert(handoff.handoff_candidate === true, `TEST/TRAINING with fields may be candidate: ${result.fixture_id}`);
    assert(handoff.status === 'HANDOFF_CANDIDATE_ONLY', `TEST/TRAINING status must be HANDOFF_CANDIDATE_ONLY: ${result.fixture_id}`);
  }
}

const liveDirect = buildScanOpsPhase11Handoff({ environment: 'LIVE' });
assert(liveDirect.handoff_candidate === false, 'direct LIVE must be blocked');
assert(liveDirect.capture_only === true, 'direct LIVE must stay capture-only');
assert(liveDirect.write_attempted === false, 'direct LIVE must not write');
assert(liveDirect.mutation_attempted === false, 'direct LIVE must not mutate');

const trainingDirect = buildScanOpsPhase11Handoff({
  handoff_id: 'direct-training',
  review_id: 'review',
  environment: 'TRAINING',
  evidence_id: 'evidence',
  evidence_key: 'key',
  source_system: 'SCANOPS',
  source_device_id: 'device',
  source_store_id: 'store',
  target_system: 'INVENTORY',
  review_gate: 'REQUIRED',
  review_profile: 'STRICT_STATIC_REVIEW',
  handoff_gate: 'REQUIRED',
  handoff_profile: 'STRICT_STATIC_HANDOFF',
});
assert(trainingDirect.handoff_candidate === true, 'direct TRAINING may be candidate');
assert(trainingDirect.dispatched === false, 'direct TRAINING must not dispatch');
assert(trainingDirect.inventory_called === false, 'direct TRAINING must not call Inventory');
assert(trainingDirect.completed === false, 'direct TRAINING must not complete');
assert(trainingDirect.persisted === false, 'direct TRAINING must not persist');
assert(trainingDirect.write_attempted === false, 'direct TRAINING must not write');
assert(trainingDirect.mutation_attempted === false, 'direct TRAINING must not mutate');

const missingDirect = buildScanOpsPhase11Handoff({ environment: 'TRAINING' });
assert(missingDirect.handoff_candidate === false, 'missing fields must block candidate');
assert(missingDirect.fields_present === false, 'missing fields must be detected');

const summary = getScanOpsPhase11Summary();
assert(summary.passed === true, 'summary must pass');
assert(summary.fixture_count === 6, 'summary fixture count must match');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps Phase 11 handoff candidate remains LIVE-blocked, TEST/TRAINING candidate-only, capture-only, not dispatched, not completed, not persisted, non-receipting, non-acknowledging, non-writable, and non-mutating.');
