import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCANOPS_BRIDGE_LOCAL_TRANSPORT_COMPONENT,
  SCANOPS_BRIDGE_LOCAL_TRANSPORT_FIXTURES,
  SCANOPS_BRIDGE_LOCAL_TRANSPORT_PHASE,
  buildScanOpsBridgeLocalTransportPreflight,
  getScanOpsBridgeLocalTransportDiagnostics,
  getScanOpsBridgeLocalTransportPreflightResults,
} from '../src/inventory-bridge/localTransport/index.js';

const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const requiredFixtureIds = Object.freeze([
  'disabled_default_local_transport',
  'endpoint_descriptor_static_only',
  'unsafe_enabled_request_blocked',
  'missing_endpoint_descriptor_blocked',
]);

assert(SCANOPS_BRIDGE_LOCAL_TRANSPORT_COMPONENT === 'scanops_bridge_disabled_local_transport_scaffold', 'component marker must remain stable');
assert(SCANOPS_BRIDGE_LOCAL_TRANSPORT_PHASE === '6B/6D', 'phase marker must remain 6B/6D');
assert(Object.isFrozen(SCANOPS_BRIDGE_LOCAL_TRANSPORT_FIXTURES), 'fixtures collection must be frozen');
assert(SCANOPS_BRIDGE_LOCAL_TRANSPORT_FIXTURES.length === requiredFixtureIds.length, 'fixture count must match required set');

const fixtureIds = SCANOPS_BRIDGE_LOCAL_TRANSPORT_FIXTURES.map((fixture) => fixture.fixture_id);
for (const fixtureId of requiredFixtureIds) {
  assert(fixtureIds.includes(fixtureId), `missing required fixture ${fixtureId}`);
}

for (const fixture of SCANOPS_BRIDGE_LOCAL_TRANSPORT_FIXTURES) {
  assert(Object.isFrozen(fixture), `fixture must be frozen: ${fixture.fixture_id}`);
  assert(Object.isFrozen(fixture.configuration), `fixture configuration must be frozen: ${fixture.fixture_id}`);
  assert(Object.isFrozen(fixture.endpoint_descriptor), `fixture endpoint descriptor must be frozen: ${fixture.fixture_id}`);
  assert(Object.isFrozen(fixture.expected), `fixture expected outcome must be frozen: ${fixture.fixture_id}`);
  assert(Object.isFrozen(fixture.expected.blocked_reasons), `fixture blocked reasons must be frozen: ${fixture.fixture_id}`);
}

const results = getScanOpsBridgeLocalTransportPreflightResults();
assert(Object.isFrozen(results), 'preflight results collection must be frozen');
assert(results.length === requiredFixtureIds.length, 'preflight result count must match fixture count');

for (const result of results) {
  const { preflight } = result;
  assert(result.passed === true, `preflight result must pass: ${result.fixture_id}`);
  assert(Object.isFrozen(result), `result must be frozen: ${result.fixture_id}`);
  assert(Object.isFrozen(preflight), `preflight must be frozen: ${result.fixture_id}`);
  assert(Object.isFrozen(preflight.blocked_reasons), `blocked reasons must be frozen: ${result.fixture_id}`);
  assert(preflight.bridge_enabled === false, `bridge_enabled must remain false: ${result.fixture_id}`);
  assert(preflight.capture_only === true, `capture_only must remain true: ${result.fixture_id}`);
  assert(preflight.activation_state === 'DISABLED', `activation_state must remain DISABLED: ${result.fixture_id}`);
  assert(preflight.transport_status === 'NON_OPERATIONAL', `transport_status must remain NON_OPERATIONAL: ${result.fixture_id}`);
  assert(preflight.preflight_status === 'BLOCKED', `preflight_status must remain BLOCKED: ${result.fixture_id}`);
  assert(preflight.readiness_status === 'DISABLED', `readiness_status must remain DISABLED: ${result.fixture_id}`);
  assert(preflight.can_activate === false, `can_activate must remain false: ${result.fixture_id}`);
  assert(preflight.dispatchable === false, `dispatchable must remain false: ${result.fixture_id}`);
  assert(preflight.transportable === false, `transportable must remain false: ${result.fixture_id}`);
  assert(preflight.inventory_callable === false, `inventory_callable must remain false: ${result.fixture_id}`);
  assert(preflight.outbox_processable === false, `outbox_processable must remain false: ${result.fixture_id}`);
  assert(preflight.transport_attempted === false, `transport_attempted must remain false: ${result.fixture_id}`);
  assert(preflight.network_check_attempted === false, `network_check_attempted must remain false: ${result.fixture_id}`);
  assert(preflight.port_bound === false, `port_bound must remain false: ${result.fixture_id}`);
  assert(preflight.inbound_channel_started === false, `inbound_channel_started must remain false: ${result.fixture_id}`);
  assert(preflight.outbound_channel_started === false, `outbound_channel_started must remain false: ${result.fixture_id}`);
  assert(preflight.sync_attempted === false, `sync_attempted must remain false: ${result.fixture_id}`);
  assert(preflight.inventory_call_attempted === false, `inventory_call_attempted must remain false: ${result.fixture_id}`);
  assert(preflight.outbox_processing_attempted === false, `outbox_processing_attempted must remain false: ${result.fixture_id}`);
  assert(preflight.replay_attempted === false, `replay_attempted must remain false: ${result.fixture_id}`);
  assert(preflight.receipt_emitted === false, `receipt_emitted must remain false: ${result.fixture_id}`);
  assert(preflight.acknowledgement_emitted === false, `acknowledgement_emitted must remain false: ${result.fixture_id}`);
  assert(preflight.write_attempted === false, `write_attempted must remain false: ${result.fixture_id}`);
  assert(preflight.mutation_attempted === false, `mutation_attempted must remain false: ${result.fixture_id}`);

  for (const check of result.checks) {
    assert(check.passed === true, `check failed for ${result.fixture_id}: ${check.name}`);
  }
}

const unsafePreflight = buildScanOpsBridgeLocalTransportPreflight({ bridge_enabled: true, activation_requested: true });
assert(unsafePreflight.bridge_enabled === false, 'unsafe direct preflight must not enable bridge');
assert(unsafePreflight.capture_only === true, 'unsafe direct preflight must remain capture-only');
assert(unsafePreflight.can_activate === false, 'unsafe direct preflight must not allow activation');
assert(unsafePreflight.dispatchable === false, 'unsafe direct preflight must not become dispatchable');
assert(unsafePreflight.inventory_callable === false, 'unsafe direct preflight must not call Inventory');
assert(unsafePreflight.blocked_reasons.includes('unsafe_enabled_request_blocked'), 'unsafe direct preflight must include unsafe request blocker');
assert(unsafePreflight.transport_attempted === false, 'unsafe direct preflight must not attempt transport');
assert(unsafePreflight.network_check_attempted === false, 'unsafe direct preflight must not attempt network check');
assert(unsafePreflight.outbox_processing_attempted === false, 'unsafe direct preflight must not process outbox');
assert(unsafePreflight.write_attempted === false, 'unsafe direct preflight must not attempt write');
assert(unsafePreflight.mutation_attempted === false, 'unsafe direct preflight must not attempt mutation');

const diagnostics = getScanOpsBridgeLocalTransportDiagnostics();
assert(diagnostics.passed === true, 'local transport diagnostics must pass');
assert(diagnostics.fixture_count === requiredFixtureIds.length, 'diagnostics fixture count must match required count');
assert(Object.isFrozen(diagnostics), 'diagnostics result must be frozen');

for (const check of diagnostics.checks) {
  assert(check.passed === true, `diagnostic check failed: ${check.name}`);
}

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), '..');
const scannedFiles = Object.freeze([
  'src/inventory-bridge/localTransport/localTransportFixtures.js',
  'src/inventory-bridge/localTransport/localTransportPreflight.js',
  'src/inventory-bridge/localTransport/localTransportDiagnostics.js',
  'src/inventory-bridge/localTransport/index.js',
]);

const forbiddenRuntimePatterns = Object.freeze([
  { pattern: /\bfetch\s*\(/, label: 'fetch call' },
  { pattern: /\bXMLHttpRequest\b/, label: 'XMLHttpRequest usage' },
  { pattern: /\bWebSocket\b/, label: 'WebSocket usage' },
  { pattern: /\bEventSource\b/, label: 'EventSource usage' },
  { pattern: /\bBroadcastChannel\b/, label: 'BroadcastChannel usage' },
  { pattern: /\bcreateServer\s*\(/, label: 'server creation' },
  { pattern: /\.listen\s*\(/, label: 'port binding' },
  { pattern: /\bconnect\s*\(/, label: 'transport activation call' },
  { pattern: /\bsend\s*\(/, label: 'transport dispatch call' },
  { pattern: /\bemit\s*\(/, label: 'event emission call' },
  { pattern: /\bnode:net\b|from ['"]net['"]/, label: 'net module import' },
  { pattern: /\bnode:dgram\b|from ['"]dgram['"]/, label: 'dgram module import' },
  { pattern: /\bwriteFile\s*\(/, label: 'file write' },
  { pattern: /\bappendFile\s*\(/, label: 'file append' },
  { pattern: /\bcreateWriteStream\s*\(/, label: 'write stream' },
  { pattern: /\blocalStorage\./, label: 'localStorage write surface' },
  { pattern: /\bsessionStorage\./, label: 'sessionStorage write surface' },
  { pattern: /\bindexedDB\b/, label: 'indexedDB access' },
  { pattern: /\binventoryClient\b/, label: 'Inventory client path' },
  { pattern: /\bcallInventory\b/, label: 'Inventory call path' },
  { pattern: /\bInventorySyncReceipt\b/, label: 'receipt path' },
]);

for (const relativePath of scannedFiles) {
  const filePath = path.join(repoRoot, relativePath);
  const content = fs.readFileSync(filePath, 'utf8');
  for (const forbidden of forbiddenRuntimePatterns) {
    assert(!forbidden.pattern.test(content), `${relativePath} must not contain ${forbidden.label}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 6B/6D local transport scaffold remains disabled, capture-only, read-only, non-operational, non-networking, non-dispatching, non-Inventory-calling, non-outbox-processing, non-replayable, non-receipting, non-acknowledging, non-writable, and non-mutating.');
