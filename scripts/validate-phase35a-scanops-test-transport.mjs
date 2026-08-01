#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canonicalizeBridgeContractV1,
  computeBridgeContractV1SemanticHash,
} from '../src/inventory-bridge/canonicalContract/v1/canonicalizeBridgeContractV1.js';
import { BRIDGE_CONTRACT_V1 } from '../src/inventory-bridge/canonicalContract/v1/bridgeContractV1.js';
import { createScanOpsTestTransportClientV1 } from '../src/inventory-bridge/testTransport/v1/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const goldenEnvelope = JSON.parse(readFileSync(
  join(root, 'src/inventory-bridge/canonicalAdapter/v1/fixtures/healthEnvelopeV1.json'),
  'utf8',
));
const goldenReceipt = JSON.parse(readFileSync(
  join(root, 'src/inventory-bridge/canonicalAdapter/v1/fixtures/healthReceiptV1.json'),
  'utf8',
));
const expectedHashes = Object.freeze({
  contract: '9a7718a37f66236d0c0e9873cade6745c83f3a56cf41d969edf8ef9359eee5f5',
  envelope: '50c8098e8ec84b63b49e307c648e691c2b3aba41f015614edd3a5f4c9a0f4a81',
  receipt: 'c5fdfbe7f0b990e9b312ba669a35fab411539c6cdafd8bd808bc0a7be906d192',
});
const stableNow = () => goldenEnvelope.occurredAt;
const checks = [];

function check(name, condition, detail = '') {
  checks.push({ name, passed: condition === true, detail });
}

function hash(value) {
  return createHash('sha256')
    .update(canonicalizeBridgeContractV1(value), 'utf8')
    .digest('hex');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function startJsonServer(handler) {
  const server = createServer(handler);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  return {
    server,
    port: address.port,
    stop: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

function writeJson(response, status, value) {
  const body = JSON.stringify(value);
  response.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  response.end(body);
}

function enabledClient(port, overrides = {}) {
  return createScanOpsTestTransportClientV1({
    configuration: { bridge_enabled: true, transport_enabled: true },
    environment: 'TEST',
    inventoryHost: '127.0.0.1',
    inventoryPort: port,
    timeoutMs: 2_000,
    now: stableNow,
    ...overrides,
  });
}

const healthInput = Object.freeze({
  envelopeId: goldenEnvelope.envelopeId,
  idempotencyKey: goldenEnvelope.idempotencyKey,
  traceId: goldenEnvelope.traceId,
  occurredAt: goldenEnvelope.occurredAt,
  deviceId: goldenEnvelope.source.deviceId,
  storeId: goldenEnvelope.source.storeId,
  sessionId: goldenEnvelope.source.sessionId,
  inventoryInstanceId: goldenEnvelope.target.inventoryInstanceId,
  payload: goldenEnvelope.payload,
});

check('contract_hash_locked', computeBridgeContractV1SemanticHash() === expectedHashes.contract, computeBridgeContractV1SemanticHash());
check('contract_hash_independent', hash(BRIDGE_CONTRACT_V1) === expectedHashes.contract, hash(BRIDGE_CONTRACT_V1));
check('golden_envelope_hash_locked', hash(goldenEnvelope) === expectedHashes.envelope, hash(goldenEnvelope));
check('golden_receipt_hash_locked', hash(goldenReceipt) === expectedHashes.receipt, hash(goldenReceipt));

const defaultClient = createScanOpsTestTransportClientV1();
const defaultResult = await defaultClient.sendHealthPing(healthInput);
check('default_transport_disabled', defaultResult.status === 'BLOCKED' && defaultResult.dispatchAttempted === false, defaultResult);

for (const [name, options] of Object.entries({
  bridge_disabled: {
    configuration: { bridge_enabled: false, transport_enabled: true }, environment: 'TEST', inventoryHost: '127.0.0.1', inventoryPort: 8787,
  },
  transport_disabled: {
    configuration: { bridge_enabled: true, transport_enabled: false }, environment: 'TEST', inventoryHost: '127.0.0.1', inventoryPort: 8787,
  },
  missing_host: {
    configuration: { bridge_enabled: true, transport_enabled: true }, environment: 'TEST', inventoryHost: '', inventoryPort: 8787,
  },
  live_environment: {
    configuration: { bridge_enabled: true, transport_enabled: true }, environment: 'LIVE', inventoryHost: '127.0.0.1', inventoryPort: 8787,
  },
  production_environment: {
    configuration: { bridge_enabled: true, transport_enabled: true }, environment: 'PRODUCTION', inventoryHost: '127.0.0.1', inventoryPort: 8787,
  },
})) {
  const client = createScanOpsTestTransportClientV1({ ...options, now: stableNow });
  const result = await client.sendHealthPing(healthInput);
  check(`${name}_fails_closed`, result.status === 'BLOCKED' && result.dispatchAttempted === false, result);
}

let observedRequest = null;
const positiveServer = await startJsonServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  observedRequest = {
    method: request.method,
    path: request.url,
    contentType: request.headers['content-type'],
    envelope: JSON.parse(Buffer.concat(chunks).toString('utf8')),
  };
  writeJson(response, 200, goldenReceipt);
});
const positiveClient = enabledClient(positiveServer.port);
const built = positiveClient.buildHealthEnvelope(healthInput);
check('canonical_health_envelope_builds', built.ok === true, built);
check('built_envelope_hash_locked', built.ok && hash(built.buildResult.envelope) === expectedHashes.envelope, built.ok ? hash(built.buildResult.envelope) : 'not-built');
const positive = await positiveClient.sendHealthPing(healthInput);
check('real_http_request_sent', observedRequest?.method === 'POST' && observedRequest?.path === '/api/bridge/v1/handoffs', observedRequest);
check('real_http_json_content_type', observedRequest?.contentType?.startsWith('application/json') === true, observedRequest?.contentType || null);
check(
  'real_http_envelope_hash',
  observedRequest !== null && hash(observedRequest.envelope) === expectedHashes.envelope,
  observedRequest?.envelope || null,
);
check('positive_http_status_200', positive.httpStatus === 200, positive);
check('positive_receipt_valid', positive.receiptValid === true, positive);
check('positive_receipt_correlated', positive.ok === true && positive.correlated === true && positive.status === 'CORRELATED', positive);
check('positive_admission_application', positive.admissionStatus === 'ACCEPTED' && positive.applicationStatus === 'NOT_APPLICABLE', positive);
check(
  'positive_receipt_hash_locked',
  Boolean(positive.receipt) && hash(positive.receipt) === expectedHashes.receipt,
  positive.receipt || null,
);
await positiveServer.stop();

const unsupportedEnvelope = { ...clone(goldenEnvelope), operationType: 'COUNT_SUBMISSION' };
const unsupported = await positiveClient.sendEnvelope(unsupportedEnvelope);
check('unsupported_business_operation_blocked_before_dispatch', unsupported.status === 'BLOCKED' && unsupported.dispatchAttempted === false, unsupported);

for (const [name, input] of Object.entries({
  placeholder_device_id: { ...healthInput, deviceId: 'scanops-device-local' },
  placeholder_store_id: { ...healthInput, storeId: 'store-local' },
  placeholder_session_id: { ...healthInput, sessionId: 'session-local' },
  placeholder_inventory_instance_id: { ...healthInput, inventoryInstanceId: 'inventory-desktop-local' },
})) {
  const result = await positiveClient.sendHealthPing(input);
  check(`${name}_blocked_before_dispatch`, result.status === 'ENVELOPE_INVALID' && result.dispatchAttempted === false, result);
}

const malformedReceiptServer = await startJsonServer((_request, response) => writeJson(response, 200, { receiptId: '', admissionStatus: 'ACCEPTED' }));
const malformedReceipt = await enabledClient(malformedReceiptServer.port).sendHealthPing(healthInput);
check('malformed_receipt_rejected', malformedReceipt.status === 'RECEIPT_INVALID' && malformedReceipt.correlated === false, malformedReceipt);
await malformedReceiptServer.stop();

const mismatch = clone(goldenReceipt);
mismatch.envelopeId = 'env:mismatch';
const mismatchServer = await startJsonServer((_request, response) => writeJson(response, 200, mismatch));
const mismatchResult = await enabledClient(mismatchServer.port).sendHealthPing(healthInput);
check('receipt_correlation_mismatch_rejected', mismatchResult.status === 'RECEIPT_INVALID' && mismatchResult.correlated === false, mismatchResult);
await mismatchServer.stop();

const invalidJsonServer = await startJsonServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end('{invalid-json');
});
const invalidJson = await enabledClient(invalidJsonServer.port).sendHealthPing(healthInput);
check('invalid_json_response_fails_safely', invalidJson.status === 'TRANSPORT_ERROR' && invalidJson.receiptReceived === false, invalidJson);
await invalidJsonServer.stop();

const non2xxServer = await startJsonServer((_request, response) => writeJson(response, 422, { error: { code: 'UNSUPPORTED_OPERATION' } }));
const non2xx = await enabledClient(non2xxServer.port).sendHealthPing(healthInput);
check('non_2xx_handled', non2xx.status === 'HTTP_ERROR' && non2xx.httpStatus === 422, non2xx);
await non2xxServer.stop();

const timeoutServer = await startJsonServer((_request, response) => {
  setTimeout(() => writeJson(response, 200, goldenReceipt), 200);
});
const timeoutResult = await enabledClient(timeoutServer.port, { timeoutMs: 25 }).sendHealthPing(healthInput);
check('request_timeout_aborts', timeoutResult.status === 'TIMEOUT' && timeoutResult.timeoutTriggered === true, timeoutResult);
await timeoutServer.stop();

const refusedProbe = await startJsonServer((_request, response) => writeJson(response, 200, goldenReceipt));
const refusedPort = refusedProbe.port;
await refusedProbe.stop();
const refused = await enabledClient(refusedPort, { timeoutMs: 100 }).sendHealthPing(healthInput);
check('connection_refused_fails_safely', refused.status === 'TRANSPORT_ERROR' && refused.receiptReceived === false, refused);

const diagnostics = positiveClient.getDiagnostics();
check('no_persistence_or_queue', diagnostics.persistenceAttempted === false && diagnostics.queueWriteAttempted === false, diagnostics);
check('no_retry_or_replay', diagnostics.automaticRetryScheduled === false && diagnostics.replayAttempted === false, diagnostics);
check('no_mutation', diagnostics.inventoryMutationAttempted === false && diagnostics.scanOpsMutationAttempted === false, diagnostics);
check('no_discovery_pairing_auth', diagnostics.discoveryAttempted === false && diagnostics.pairingAttempted === false && diagnostics.authenticationStateCreated === false, diagnostics);
check('defaults_still_disabled', diagnostics.runtimeDefaultsRemainDisabled === true, diagnostics);

const failures = checks.filter((entry) => !entry.passed);
const report = Object.freeze({
  phase: '35-A',
  repository: 'chrykoolaid/invyra-scanops',
  passed: failures.length === 0,
  totalChecks: checks.length,
  passedChecks: checks.length - failures.length,
  failedChecks: failures.length,
  inventoryEndpoint: { host: '127.0.0.1', port: positiveServer.port },
  request: { method: observedRequest?.method || null, path: observedRequest?.path || null },
  httpStatus: positive.httpStatus,
  envelopeSemanticHash: observedRequest ? hash(observedRequest.envelope) : null,
  receiptSemanticHash: positive.receipt ? hash(positive.receipt) : null,
  admissionStatus: positive.admissionStatus,
  applicationStatus: positive.applicationStatus,
  correlated: positive.correlated,
  mutationFlags: { inventory: false, scanOps: false },
  persistenceAttempted: false,
  queueWriteAttempted: false,
  retryScheduled: false,
  replayAttempted: false,
  checks,
});

console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exit(1);
