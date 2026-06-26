import { P25_SCAN, P25_SCAN_FIXTURES } from '../src/p25-flow/p25Fixtures.js';
import { buildP25ScanFlow, getP25ScanFlowResults } from '../src/p25-flow/p25Flow.js';

const errors = [];
function assert(condition, message) { if (!condition) errors.push(message); }

assert(P25_SCAN === '25B/25D', 'phase marker must remain 25B/25D');
assert(Object.isFrozen(P25_SCAN_FIXTURES), 'fixtures must be frozen');
assert(P25_SCAN_FIXTURES.length === 6, 'expected six fixtures');

const results = getP25ScanFlowResults();
assert(Object.isFrozen(results), 'results must be frozen');

for (const result of results) {
  const { flow } = result;
  assert(result.passed === true, `fixture must pass: ${result.fixture_id}`);
  assert(Object.isFrozen(result), `result must be frozen: ${result.fixture_id}`);
  assert(Object.isFrozen(flow), `flow must be frozen: ${result.fixture_id}`);
  assert(flow.flow_candidate_only === true, `candidate only must stay true: ${result.fixture_id}`);
  assert(flow.capture_only === true, `capture only must stay true: ${result.fixture_id}`);
  assert(flow.stock_mutation_allowed === false, `stock mutation must not be allowed: ${result.fixture_id}`);
  assert(flow.workflow_write_allowed === false, `workflow write must not be allowed: ${result.fixture_id}`);
  assert(flow.stock_out_posted === false, `stock-out must not post: ${result.fixture_id}`);
  assert(flow.stocktake_reconciled === false, `stocktake must not reconcile: ${result.fixture_id}`);
  assert(flow.receiving_posted === false, `receiving must not post: ${result.fixture_id}`);
  assert(flow.transfer_posted === false, `transfer must not post: ${result.fixture_id}`);
  assert(flow.completed === false, `completion must not occur: ${result.fixture_id}`);
  assert(flow.persisted === false, `persistence must not occur: ${result.fixture_id}`);
  assert(flow.write_attempted === false, `write must not occur: ${result.fixture_id}`);
  assert(flow.mutation_attempted === false, `mutation must not occur: ${result.fixture_id}`);

  if (['LIVE', 'PRODUCTION'].includes(flow.environment)) {
    assert(flow.flow_candidate === false, `LIVE/PRODUCTION must be blocked: ${result.fixture_id}`);
    assert(flow.status === 'BLOCKED', `LIVE/PRODUCTION status must be BLOCKED: ${result.fixture_id}`);
  }

  if (['TRAINING', 'TEST'].includes(flow.environment) && flow.fields_present && flow.read_only && flow.order_ok) {
    assert(flow.flow_candidate === true, `TEST/TRAINING with valid fields may be candidate: ${result.fixture_id}`);
    assert(flow.status === 'FLOW_VIEW_CANDIDATE_ONLY', `TEST/TRAINING status must be FLOW_VIEW_CANDIDATE_ONLY: ${result.fixture_id}`);
    assert(flow.stock_out_candidate === true, `stock-out candidate must be true: ${result.fixture_id}`);
    assert(flow.stocktake_candidate === true, `stocktake candidate must be true: ${result.fixture_id}`);
    assert(flow.receiving_candidate === true, `receiving candidate must be true: ${result.fixture_id}`);
    assert(flow.transfer_candidate === true, `transfer candidate must be true: ${result.fixture_id}`);
  }
}

const trainingDirect = buildP25ScanFlow({
  flow_id: 'direct-training-flow',
  environment: 'TRAINING',
  previous_flow_id: 'previous-flow',
  source_system: 'SCANOPS',
  store_id: 'store',
  target_system: 'INVENTORY',
  visibility_mode: 'READ_ONLY',
  step_order: 'STOCK_OUT_EXCEPTIONS|STOCKTAKE|RECEIVING|TRANSFERS',
});
assert(trainingDirect.flow_candidate === true, 'direct TRAINING may be candidate only');
assert(trainingDirect.read_only === true, 'direct TRAINING must be read-only');
assert(trainingDirect.order_ok === true, 'direct TRAINING must keep order');
assert(trainingDirect.stock_out_posted === false, 'direct TRAINING must not post stock-out');
assert(trainingDirect.stocktake_reconciled === false, 'direct TRAINING must not reconcile stocktake');
assert(trainingDirect.receiving_posted === false, 'direct TRAINING must not post receiving');
assert(trainingDirect.transfer_posted === false, 'direct TRAINING must not post transfer');
assert(trainingDirect.persisted === false, 'direct TRAINING must not persist');
assert(trainingDirect.write_attempted === false, 'direct TRAINING must not write');
assert(trainingDirect.mutation_attempted === false, 'direct TRAINING must not mutate');

const wrongOrder = buildP25ScanFlow({ ...trainingDirect.descriptor, step_order: 'RECEIVING|STOCK_OUT_EXCEPTIONS|STOCKTAKE|TRANSFERS' });
assert(wrongOrder.flow_candidate === false, 'wrong order must block candidate');
assert(wrongOrder.order_ok === false, 'wrong order must be detected');

const writableDirect = buildP25ScanFlow({ ...trainingDirect.descriptor, visibility_mode: 'WRITE' });
assert(writableDirect.flow_candidate === false, 'non-read-only mode must block candidate');
assert(writableDirect.read_only === false, 'non-read-only mode must be detected');

const missingDirect = buildP25ScanFlow({ environment: 'TRAINING' });
assert(missingDirect.flow_candidate === false, 'missing fields must block candidate');
assert(missingDirect.fields_present === false, 'missing fields must be detected');

const statusPassed = results.every((result) => result.passed);
assert(statusPassed === true, 'status must pass');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('P25 ScanOps flow candidate remains LIVE/PRODUCTION-blocked, TEST/TRAINING candidate-only, capture-only, read-only, ordered, no stock-out post, no stocktake reconcile, no receiving post, no transfer post, not persisted, non-writable, and non-mutating.');
