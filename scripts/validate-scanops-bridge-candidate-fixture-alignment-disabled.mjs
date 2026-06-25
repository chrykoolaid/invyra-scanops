import {
  SCANOPS_BRIDGE_CANDIDATE_ALIGNMENT_COMPONENT,
  SCANOPS_BRIDGE_CANDIDATE_ALIGNMENT_FIXTURES,
  SCANOPS_BRIDGE_CANDIDATE_ALIGNMENT_PHASE,
  getScanOpsBridgeCandidateAlignmentDiagnostics,
  getScanOpsBridgeCandidateAlignmentResults,
} from '../src/inventory-bridge/fixtures/index.js';

const errors = [];

function assert(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

const requiredFixtureIds = Object.freeze([
  'valid_evidence_runtime_disabled',
  'schema_mismatch',
  'event_type_mismatch',
  'store_mismatch',
  'device_mismatch',
  'malformed_payload',
  'unsafe_enabled_configuration_attempt',
]);

assert(SCANOPS_BRIDGE_CANDIDATE_ALIGNMENT_COMPONENT === 'scanops_bridge_cross_repo_candidate_fixture_alignment', 'component marker must remain stable');
assert(SCANOPS_BRIDGE_CANDIDATE_ALIGNMENT_PHASE === '5C', 'phase marker must remain 5C');
assert(Object.isFrozen(SCANOPS_BRIDGE_CANDIDATE_ALIGNMENT_FIXTURES), 'fixtures collection must be frozen');
assert(SCANOPS_BRIDGE_CANDIDATE_ALIGNMENT_FIXTURES.length === requiredFixtureIds.length, 'fixture count must match required fixture set');

const fixtureIds = SCANOPS_BRIDGE_CANDIDATE_ALIGNMENT_FIXTURES.map((fixture) => fixture.fixture_id);
for (const fixtureId of requiredFixtureIds) {
  assert(fixtureIds.includes(fixtureId), `missing required fixture ${fixtureId}`);
}

for (const fixture of SCANOPS_BRIDGE_CANDIDATE_ALIGNMENT_FIXTURES) {
  assert(Object.isFrozen(fixture), `fixture ${fixture.fixture_id} must be frozen`);
  assert(Object.isFrozen(fixture.candidate), `fixture ${fixture.fixture_id} candidate must be frozen`);
  assert(Object.isFrozen(fixture.configuration), `fixture ${fixture.fixture_id} configuration must be frozen`);
  assert(Object.isFrozen(fixture.expected), `fixture ${fixture.fixture_id} expected outcome must be frozen`);
}

const results = getScanOpsBridgeCandidateAlignmentResults();
assert(Object.isFrozen(results), 'alignment results collection must be frozen');
assert(results.length === requiredFixtureIds.length, 'alignment result count must match fixture count');

for (const result of results) {
  const { preview } = result;

  assert(result.passed === true, `fixture result must pass: ${result.fixture_id}`);
  assert(Object.isFrozen(result), `fixture result must be frozen: ${result.fixture_id}`);
  assert(Object.isFrozen(preview), `preview must be frozen: ${result.fixture_id}`);
  assert(preview.runtime_enabled === false, `runtime_enabled must remain false: ${result.fixture_id}`);
  assert(preview.runtime_ready === false, `runtime_ready must remain false: ${result.fixture_id}`);
  assert(preview.runtime_operational === false, `runtime_operational must remain false: ${result.fixture_id}`);
  assert(preview.contract_accepted === false, `contract_accepted must remain false: ${result.fixture_id}`);
  assert(preview.contract_dispatchable === false, `contract_dispatchable must remain false: ${result.fixture_id}`);
  assert(preview.contract_transportable === false, `contract_transportable must remain false: ${result.fixture_id}`);
  assert(preview.contract_outbox_processable === false, `contract_outbox_processable must remain false: ${result.fixture_id}`);
  assert(preview.contract_inventory_callable === false, `contract_inventory_callable must remain false: ${result.fixture_id}`);
  assert(preview.contract_writable === false, `contract_writable must remain false: ${result.fixture_id}`);
  assert(preview.capture_only === true, `capture_only must remain true: ${result.fixture_id}`);
  assert(preview.dispatchable === false, `dispatchable must remain false: ${result.fixture_id}`);
  assert(preview.transportable === false, `transportable must remain false: ${result.fixture_id}`);
  assert(preview.outbox_processable === false, `outbox_processable must remain false: ${result.fixture_id}`);
  assert(preview.inventory_callable === false, `inventory_callable must remain false: ${result.fixture_id}`);
  assert(preview.persistable === false, `persistable must remain false: ${result.fixture_id}`);
  assert(preview.writable === false, `writable must remain false: ${result.fixture_id}`);
  assert(preview.replayable === false, `replayable must remain false: ${result.fixture_id}`);
  assert(preview.acknowledgement_emittable === false, `acknowledgement_emittable must remain false: ${result.fixture_id}`);
  assert(preview.receipt_emittable === false, `receipt_emittable must remain false: ${result.fixture_id}`);
  assert(preview.mutating === false, `mutating must remain false: ${result.fixture_id}`);
  assert(preview.idempotency_key.endsWith(result.expected.evidence_identity_key), `idempotency key must retain shared evidence identity suffix: ${result.fixture_id}`);

  for (const check of result.checks) {
    assert(check.passed === true, `fixture check failed for ${result.fixture_id}: ${check.name}`);
  }
}

const diagnostics = getScanOpsBridgeCandidateAlignmentDiagnostics();
assert(diagnostics.passed === true, 'candidate alignment diagnostics must pass');
assert(diagnostics.fixture_count === requiredFixtureIds.length, 'diagnostics fixture count must match required fixture count');
assert(Object.isFrozen(diagnostics), 'diagnostics result must be frozen');

for (const check of diagnostics.checks) {
  assert(check.passed === true, `diagnostic check failed: ${check.name}`);
}

const unsafeResult = results.find((result) => result.fixture_id === 'unsafe_enabled_configuration_attempt');
assert(Boolean(unsafeResult), 'unsafe enabled configuration fixture result must exist');
assert(unsafeResult.preview.runtime_enabled === false, 'unsafe enabled configuration must not enable runtime');
assert(unsafeResult.preview.dispatchable === false, 'unsafe enabled configuration must not become dispatchable');
assert(unsafeResult.preview.transportable === false, 'unsafe enabled configuration must not become transportable');
assert(unsafeResult.preview.outbox_processable === false, 'unsafe enabled configuration must not become outbox-processable');
assert(unsafeResult.preview.inventory_callable === false, 'unsafe enabled configuration must not become Inventory-callable');
assert(unsafeResult.preview.writable === false, 'unsafe enabled configuration must not become writable');
assert(unsafeResult.preview.receipt_emittable === false, 'unsafe enabled configuration must not emit receipt');
assert(unsafeResult.preview.acknowledgement_emittable === false, 'unsafe enabled configuration must not emit acknowledgement');
assert(unsafeResult.preview.mutating === false, 'unsafe enabled configuration must not mutate');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 5C candidate fixture alignment remains static, disabled, capture-only, read-only, non-dispatchable, non-transportable, non-outbox-processable, non-Inventory-callable, non-writable, non-replayable, non-receipting, non-acknowledging, and non-mutating.');
