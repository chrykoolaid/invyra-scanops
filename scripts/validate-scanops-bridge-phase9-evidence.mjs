import {
  SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_COMPONENT,
  SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_FIXTURES,
  SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_PHASE,
} from '../src/inventory-bridge/handshakeEvidence/handshakeEvidenceFixtures.js';
import {
  buildScanOpsBridgeHandshakeEvidence,
  getScanOpsBridgeHandshakeEvidenceResults,
} from '../src/inventory-bridge/handshakeEvidence/handshakeEvidenceProjection.js';
import { getScanOpsBridgeHandshakeEvidenceStatus } from '../src/inventory-bridge/handshakeEvidence/handshakeEvidenceStatus.js';

const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const requiredFixtureIds = Object.freeze([
  'live_evidence_blocked',
  'training_evidence_ready',
  'test_evidence_ready',
  'production_evidence_blocked',
  'missing_required_field_blocked',
]);

assert(SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_COMPONENT === 'scanops_bridge_test_training_handshake_evidence', 'component marker must remain stable');
assert(SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_PHASE === '9B/9D', 'phase marker must remain 9B/9D');
assert(Object.isFrozen(SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_FIXTURES), 'fixtures collection must be frozen');
assert(SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_FIXTURES.length === requiredFixtureIds.length, 'fixture count must match required set');

const fixtureIds = SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_FIXTURES.map((fixture) => fixture.fixture_id);
for (const fixtureId of requiredFixtureIds) {
  assert(fixtureIds.includes(fixtureId), `missing required fixture ${fixtureId}`);
}

for (const fixture of SCANOPS_BRIDGE_HANDSHAKE_EVIDENCE_FIXTURES) {
  assert(Object.isFrozen(fixture), `fixture must be frozen: ${fixture.fixture_id}`);
  assert(Object.isFrozen(fixture.evidence_descriptor), `evidence descriptor must be frozen: ${fixture.fixture_id}`);
  assert(Object.isFrozen(fixture.expected), `fixture expected outcome must be frozen: ${fixture.fixture_id}`);
  assert(Object.isFrozen(fixture.expected.blocked_reasons), `fixture blocked reasons must be frozen: ${fixture.fixture_id}`);
}

const results = getScanOpsBridgeHandshakeEvidenceResults();
assert(Object.isFrozen(results), 'evidence results collection must be frozen');
assert(results.length === requiredFixtureIds.length, 'evidence result count must match fixture count');

for (const result of results) {
  const { evidence } = result;
  assert(result.passed === true, `evidence result must pass: ${result.fixture_id}`);
  assert(Object.isFrozen(result), `result must be frozen: ${result.fixture_id}`);
  assert(Object.isFrozen(evidence), `evidence must be frozen: ${result.fixture_id}`);
  assert(Object.isFrozen(evidence.blocked_reasons), `blocked reasons must be frozen: ${result.fixture_id}`);
  assert(evidence.evidence_only === true, `evidence_only must remain true: ${result.fixture_id}`);
  assert(evidence.capture_only === true, `capture_only must remain true: ${result.fixture_id}`);
  assert(evidence.can_dispatch === false, `can_dispatch must remain false: ${result.fixture_id}`);
  assert(evidence.can_call_inventory === false, `can_call_inventory must remain false: ${result.fixture_id}`);
  assert(evidence.can_persist === false, `can_persist must remain false: ${result.fixture_id}`);
  assert(evidence.can_write === false, `can_write must remain false: ${result.fixture_id}`);
  assert(evidence.can_mutate === false, `can_mutate must remain false: ${result.fixture_id}`);
  assert(evidence.dispatched === false, `dispatched must remain false: ${result.fixture_id}`);
  assert(evidence.inventory_called === false, `inventory_called must remain false: ${result.fixture_id}`);
  assert(evidence.persisted === false, `persisted must remain false: ${result.fixture_id}`);
  assert(evidence.receipt_emitted === false, `receipt_emitted must remain false: ${result.fixture_id}`);
  assert(evidence.acknowledgement_emitted === false, `acknowledgement_emitted must remain false: ${result.fixture_id}`);
  assert(evidence.write_attempted === false, `write_attempted must remain false: ${result.fixture_id}`);
  assert(evidence.mutation_attempted === false, `mutation_attempted must remain false: ${result.fixture_id}`);

  if (['LIVE', 'PRODUCTION'].includes(evidence.environment)) {
    assert(evidence.can_build_evidence === false, `LIVE/PRODUCTION must not build evidence: ${result.fixture_id}`);
    assert(evidence.evidence_status === 'BLOCKED', `LIVE/PRODUCTION status must be BLOCKED: ${result.fixture_id}`);
  }

  if (['TRAINING', 'TEST'].includes(evidence.environment) && evidence.required_fields_present) {
    assert(evidence.can_build_evidence === true, `TEST/TRAINING may build evidence: ${result.fixture_id}`);
    assert(evidence.evidence_status === 'EVIDENCE_READY', `TEST/TRAINING status must be EVIDENCE_READY: ${result.fixture_id}`);
  }

  for (const check of result.checks) {
    assert(check.passed === true, `check failed for ${result.fixture_id}: ${check.name}`);
  }
}

const liveDirect = buildScanOpsBridgeHandshakeEvidence({ environment: 'LIVE' });
assert(liveDirect.can_build_evidence === false, 'direct LIVE evidence must block build');
assert(liveDirect.capture_only === true, 'direct LIVE evidence must remain capture-only');
assert(liveDirect.can_write === false, 'direct LIVE evidence must not write');
assert(liveDirect.can_mutate === false, 'direct LIVE evidence must not mutate');

const trainingDirect = buildScanOpsBridgeHandshakeEvidence({
  evidence_id: 'direct-training',
  environment: 'TRAINING',
  source_system: 'SCANOPS',
  source_device_id: 'device',
  source_store_id: 'store',
  target_system: 'INVENTORY',
  training_gate: 'REQUIRED',
  evidence_profile: 'STRICT_STATIC_EVIDENCE',
  candidate_id: 'candidate',
  candidate_key: 'key',
});
assert(trainingDirect.can_build_evidence === true, 'direct TRAINING evidence may build evidence');
assert(trainingDirect.can_dispatch === false, 'direct TRAINING evidence must not dispatch');
assert(trainingDirect.can_call_inventory === false, 'direct TRAINING evidence must not call Inventory');
assert(trainingDirect.can_persist === false, 'direct TRAINING evidence must not persist');
assert(trainingDirect.can_write === false, 'direct TRAINING evidence must not write');
assert(trainingDirect.can_mutate === false, 'direct TRAINING evidence must not mutate');

const missingDirect = buildScanOpsBridgeHandshakeEvidence({ environment: 'TRAINING' });
assert(missingDirect.can_build_evidence === false, 'missing required fields must block evidence');
assert(missingDirect.required_fields_present === false, 'missing required fields must be detected');

const status = getScanOpsBridgeHandshakeEvidenceStatus();
assert(status.passed === true, 'evidence status must pass');
assert(status.fixture_count === requiredFixtureIds.length, 'status fixture count must match required count');
assert(Object.isFrozen(status), 'status result must be frozen');

for (const check of status.checks) {
  assert(check.passed === true, `status check failed: ${check.name}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 9B/9D evidence check remains LIVE-blocked, TEST/TRAINING evidence-only, capture-only, read-only, not dispatched, not persisted, non-receipting, non-acknowledging, non-writable, and non-mutating.');
