import { P21_SCAN, P21_SCAN_FIXTURES } from '../src/p21-gate/p21Fixtures.js';
import { buildP21ScanGate, getP21ScanGateResults } from '../src/p21-gate/p21Gate.js';
import { getP21ScanCheck } from '../src/p21-gate/p21Check.js';

const errors = [];
function assert(condition, message) { if (!condition) errors.push(message); }

assert(P21_SCAN === '21B/21D', 'phase marker must remain 21B/21D');
assert(Object.isFrozen(P21_SCAN_FIXTURES), 'fixtures must be frozen');
assert(P21_SCAN_FIXTURES.length === 6, 'expected six fixtures');

const results = getP21ScanGateResults();
assert(Object.isFrozen(results), 'results must be frozen');

for (const result of results) {
  const { gate } = result;
  assert(result.passed === true, `fixture must pass: ${result.fixture_id}`);
  assert(Object.isFrozen(result), `result must be frozen: ${result.fixture_id}`);
  assert(Object.isFrozen(gate), `gate must be frozen: ${result.fixture_id}`);
  assert(gate.gate_candidate_only === true, `candidate only must stay true: ${result.fixture_id}`);
  assert(gate.capture_only === true, `capture only must stay true: ${result.fixture_id}`);
  assert(gate.approval_granted === false, `approval must not be granted: ${result.fixture_id}`);
  assert(gate.run_allowed === false, `run must not be allowed: ${result.fixture_id}`);
  assert(gate.run_attempted === false, `run must not be attempted: ${result.fixture_id}`);
  assert(gate.completed === false, `completion must not occur: ${result.fixture_id}`);
  assert(gate.persisted === false, `persistence must not occur: ${result.fixture_id}`);
  assert(gate.receipt_emitted === false, `receipt must not emit: ${result.fixture_id}`);
  assert(gate.acknowledgement_emitted === false, `acknowledgement must not emit: ${result.fixture_id}`);
  assert(gate.write_attempted === false, `write must not occur: ${result.fixture_id}`);
  assert(gate.mutation_attempted === false, `mutation must not occur: ${result.fixture_id}`);

  if (['LIVE', 'PRODUCTION'].includes(gate.environment)) {
    assert(gate.gate_candidate === false, `LIVE/PRODUCTION must be blocked: ${result.fixture_id}`);
    assert(gate.status === 'BLOCKED', `LIVE/PRODUCTION status must be BLOCKED: ${result.fixture_id}`);
  }

  if (['TRAINING', 'TEST'].includes(gate.environment) && gate.fields_present && gate.role_allowed) {
    assert(gate.gate_candidate === true, `TEST/TRAINING with valid fields may be candidate: ${result.fixture_id}`);
    assert(gate.status === 'GATE_CANDIDATE_ONLY', `TEST/TRAINING status must be GATE_CANDIDATE_ONLY: ${result.fixture_id}`);
  }
}

const liveDirect = buildP21ScanGate({ environment: 'LIVE' });
assert(liveDirect.gate_candidate === false, 'direct LIVE must be blocked');
assert(liveDirect.capture_only === true, 'direct LIVE must stay capture-only');
assert(liveDirect.approval_granted === false, 'direct LIVE must not approve');
assert(liveDirect.run_allowed === false, 'direct LIVE must not allow run');
assert(liveDirect.write_attempted === false, 'direct LIVE must not write');
assert(liveDirect.mutation_attempted === false, 'direct LIVE must not mutate');

const trainingDirect = buildP21ScanGate({
  gate_id: 'direct-training-gate',
  environment: 'TRAINING',
  plan_id: 'plan',
  role: 'OWNER',
  person_id: 'owner-placeholder',
  state: 'DESIGN_ONLY',
  source_system: 'SCANOPS',
  store_id: 'store',
  target_system: 'INVENTORY',
});
assert(trainingDirect.gate_candidate === true, 'direct TRAINING may be candidate only');
assert(trainingDirect.approval_granted === false, 'direct TRAINING must not approve');
assert(trainingDirect.run_allowed === false, 'direct TRAINING must not allow run');
assert(trainingDirect.run_attempted === false, 'direct TRAINING must not run');
assert(trainingDirect.persisted === false, 'direct TRAINING must not persist');
assert(trainingDirect.write_attempted === false, 'direct TRAINING must not write');
assert(trainingDirect.mutation_attempted === false, 'direct TRAINING must not mutate');

const invalidRole = buildP21ScanGate({ ...trainingDirect.descriptor, role: 'STAFF' });
assert(invalidRole.gate_candidate === false, 'invalid role must block candidate');
assert(invalidRole.role_allowed === false, 'invalid role must be detected');

const missingDirect = buildP21ScanGate({ environment: 'TRAINING' });
assert(missingDirect.gate_candidate === false, 'missing fields must block candidate');
assert(missingDirect.fields_present === false, 'missing fields must be detected');

const status = getP21ScanCheck();
assert(status.passed === true, 'status must pass');
assert(status.fixture_count === 6, 'status fixture count must match');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('P21 ScanOps gate remains LIVE/PRODUCTION-blocked, TEST/TRAINING candidate-only, capture-only, role-limited, approval not granted, no run, not persisted, non-receipting, non-acknowledging, non-writable, and non-mutating.');
