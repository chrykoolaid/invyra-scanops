import {
  SCANOPS_BRIDGE_TRAINING_HANDSHAKE_COMPONENT,
  SCANOPS_BRIDGE_TRAINING_HANDSHAKE_FIXTURES,
  SCANOPS_BRIDGE_TRAINING_HANDSHAKE_PHASE,
  buildScanOpsBridgeTrainingHandshakeReadiness,
  getScanOpsBridgeTrainingHandshakeReadinessResults,
  getScanOpsBridgeTrainingHandshakeStatus,
} from '../src/inventory-bridge/trainingHandshake/index.js';

const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const requiredFixtureIds = Object.freeze([
  'live_handshake_blocked',
  'training_handshake_preparation_allowed',
  'test_handshake_preparation_allowed',
  'production_alias_handshake_blocked',
  'unknown_environment_handshake_blocked',
]);

assert(SCANOPS_BRIDGE_TRAINING_HANDSHAKE_COMPONENT === 'scanops_bridge_test_training_handshake_preparation', 'component marker must remain stable');
assert(SCANOPS_BRIDGE_TRAINING_HANDSHAKE_PHASE === '7B/7D', 'phase marker must remain 7B/7D');
assert(Object.isFrozen(SCANOPS_BRIDGE_TRAINING_HANDSHAKE_FIXTURES), 'fixtures collection must be frozen');
assert(SCANOPS_BRIDGE_TRAINING_HANDSHAKE_FIXTURES.length === requiredFixtureIds.length, 'fixture count must match required set');

const fixtureIds = SCANOPS_BRIDGE_TRAINING_HANDSHAKE_FIXTURES.map((fixture) => fixture.fixture_id);
for (const fixtureId of requiredFixtureIds) {
  assert(fixtureIds.includes(fixtureId), `missing required fixture ${fixtureId}`);
}

for (const fixture of SCANOPS_BRIDGE_TRAINING_HANDSHAKE_FIXTURES) {
  assert(Object.isFrozen(fixture), `fixture must be frozen: ${fixture.fixture_id}`);
  assert(Object.isFrozen(fixture.handshake_descriptor), `handshake descriptor must be frozen: ${fixture.fixture_id}`);
  assert(Object.isFrozen(fixture.expected), `fixture expected outcome must be frozen: ${fixture.fixture_id}`);
  assert(Object.isFrozen(fixture.expected.blocked_reasons), `fixture blocked reasons must be frozen: ${fixture.fixture_id}`);
}

const results = getScanOpsBridgeTrainingHandshakeReadinessResults();
assert(Object.isFrozen(results), 'readiness results collection must be frozen');
assert(results.length === requiredFixtureIds.length, 'readiness result count must match fixture count');

for (const result of results) {
  const { readiness } = result;
  assert(result.passed === true, `readiness result must pass: ${result.fixture_id}`);
  assert(Object.isFrozen(result), `result must be frozen: ${result.fixture_id}`);
  assert(Object.isFrozen(readiness), `readiness must be frozen: ${result.fixture_id}`);
  assert(Object.isFrozen(readiness.blocked_reasons), `blocked reasons must be frozen: ${result.fixture_id}`);
  assert(readiness.capture_only === true, `capture_only must remain true: ${result.fixture_id}`);
  assert(readiness.non_production_only === true, `non_production_only must remain true: ${result.fixture_id}`);
  assert(readiness.can_dispatch === false, `can_dispatch must remain false: ${result.fixture_id}`);
  assert(readiness.can_call_inventory === false, `can_call_inventory must remain false: ${result.fixture_id}`);
  assert(readiness.can_process_outbox === false, `can_process_outbox must remain false: ${result.fixture_id}`);
  assert(readiness.can_replay === false, `can_replay must remain false: ${result.fixture_id}`);
  assert(readiness.can_emit_receipt === false, `can_emit_receipt must remain false: ${result.fixture_id}`);
  assert(readiness.can_emit_acknowledgement === false, `can_emit_acknowledgement must remain false: ${result.fixture_id}`);
  assert(readiness.can_write === false, `can_write must remain false: ${result.fixture_id}`);
  assert(readiness.can_mutate === false, `can_mutate must remain false: ${result.fixture_id}`);
  assert(readiness.dispatch_attempted === false, `dispatch_attempted must remain false: ${result.fixture_id}`);
  assert(readiness.inventory_call_attempted === false, `inventory_call_attempted must remain false: ${result.fixture_id}`);
  assert(readiness.outbox_processing_attempted === false, `outbox_processing_attempted must remain false: ${result.fixture_id}`);
  assert(readiness.replay_attempted === false, `replay_attempted must remain false: ${result.fixture_id}`);
  assert(readiness.receipt_emitted === false, `receipt_emitted must remain false: ${result.fixture_id}`);
  assert(readiness.acknowledgement_emitted === false, `acknowledgement_emitted must remain false: ${result.fixture_id}`);
  assert(readiness.write_attempted === false, `write_attempted must remain false: ${result.fixture_id}`);
  assert(readiness.mutation_attempted === false, `mutation_attempted must remain false: ${result.fixture_id}`);

  if (['LIVE', 'PRODUCTION'].includes(readiness.environment)) {
    assert(readiness.can_prepare_handshake === false, `LIVE/PRODUCTION must not prepare handshake: ${result.fixture_id}`);
    assert(readiness.handshake_preparation_status === 'BLOCKED', `LIVE/PRODUCTION status must be BLOCKED: ${result.fixture_id}`);
  }

  if (['TRAINING', 'TEST'].includes(readiness.environment)) {
    assert(readiness.can_prepare_handshake === true, `TEST/TRAINING may prepare only readiness: ${result.fixture_id}`);
    assert(readiness.handshake_preparation_status === 'PREPARATION_ALLOWED', `TEST/TRAINING status must be PREPARATION_ALLOWED: ${result.fixture_id}`);
  }

  for (const check of result.checks) {
    assert(check.passed === true, `check failed for ${result.fixture_id}: ${check.name}`);
  }
}

const liveDirect = buildScanOpsBridgeTrainingHandshakeReadiness({ environment: 'LIVE' });
assert(liveDirect.can_prepare_handshake === false, 'direct LIVE readiness must block preparation');
assert(liveDirect.live_blocked === true, 'direct LIVE readiness must mark live_blocked');
assert(liveDirect.capture_only === true, 'direct LIVE readiness must remain capture-only');
assert(liveDirect.can_dispatch === false, 'direct LIVE readiness must not dispatch');
assert(liveDirect.can_call_inventory === false, 'direct LIVE readiness must not call Inventory');
assert(liveDirect.can_write === false, 'direct LIVE readiness must not write');
assert(liveDirect.can_mutate === false, 'direct LIVE readiness must not mutate');

const trainingDirect = buildScanOpsBridgeTrainingHandshakeReadiness({ environment: 'TRAINING' });
assert(trainingDirect.can_prepare_handshake === true, 'direct TRAINING readiness may allow preparation');
assert(trainingDirect.capture_only === true, 'direct TRAINING readiness must remain capture-only');
assert(trainingDirect.can_dispatch === false, 'direct TRAINING readiness must not dispatch');
assert(trainingDirect.can_call_inventory === false, 'direct TRAINING readiness must not call Inventory');
assert(trainingDirect.can_write === false, 'direct TRAINING readiness must not write');
assert(trainingDirect.can_mutate === false, 'direct TRAINING readiness must not mutate');

const status = getScanOpsBridgeTrainingHandshakeStatus();
assert(status.passed === true, 'training handshake status must pass');
assert(status.fixture_count === requiredFixtureIds.length, 'status fixture count must match required count');
assert(Object.isFrozen(status), 'status result must be frozen');

for (const check of status.checks) {
  assert(check.passed === true, `status check failed: ${check.name}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 7B/7D handshake preparation remains LIVE-blocked, TEST/TRAINING preparation-only, capture-only, read-only, non-operational, non-dispatching, non-Inventory-calling, non-outbox-processing, non-replayable, non-receipting, non-acknowledging, non-writable, and non-mutating.');
