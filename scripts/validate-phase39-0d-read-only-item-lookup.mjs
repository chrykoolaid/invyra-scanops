#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { BRIDGE_CONTRACT_V1 } from '../src/inventory-bridge/canonicalContract/v1/index.js';
import { createScanOpsItemLookupClientV1 } from '../src/inventory-bridge/itemLookup/v1/index.js';

const checks = [];
function check(name, condition, detail = '') {
  checks.push({ name, passed: condition === true, detail });
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function writeJson(response, statusCode, body, headers = {}) {
  const text = JSON.stringify(body);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(text),
    ...headers,
  });
  response.end(text);
}

const mutationCounts = Object.freeze({
  inventory: 0,
  stock: 0,
  ledger: 0,
  item_master: 0,
  pricing: 0,
  purchase_order: 0,
  receiving: 0,
});

function receiptBase(envelope) {
  const timestamp = new Date().toISOString();
  return {
    contractId: BRIDGE_CONTRACT_V1.contractId,
    schemaVersion: BRIDGE_CONTRACT_V1.schemaVersion,
    receiptId: `receipt:lookup:${envelope.envelopeId}`,
    envelopeId: envelope.envelopeId,
    idempotencyKey: envelope.idempotencyKey,
    traceId: envelope.traceId,
    receivedAt: timestamp,
    processedAt: timestamp,
    inventoryInstanceId: envelope.target.inventoryInstanceId,
    environment: envelope.environment,
    operationType: 'LOOKUP_REQUEST',
    applicationStatus: 'NOT_APPLICABLE',
    warnings: [],
  };
}

const requests = [];
const server = createServer(async (request, response) => {
  if (request.method !== 'POST' || request.url !== '/api/bridge/v1/handoffs') {
    writeJson(response, 404, { ok: false, reason: 'NOT_FOUND' });
    return;
  }
  const envelope = await readBody(request);
  requests.push(envelope);
  const base = receiptBase(envelope);
  const lookupValue = envelope.payload?.lookupValue;

  if (envelope.payload?.trustReference === 'bad-trust') {
    writeJson(response, 422, {
      ...base,
      admissionStatus: 'REJECTED',
      message: 'The paired trust reference is invalid.',
      errors: [{
        code: 'DEVICE_NOT_TRUSTED',
        message: 'The paired trust reference is invalid.',
        field: 'payload.trustReference',
        retryable: false,
      }],
    });
    return;
  }

  if (lookupValue === 'AUTH-UNAVAILABLE') {
    writeJson(response, 503, {
      ...base,
      admissionStatus: 'SERVICE_UNAVAILABLE',
      message: 'Inventory read authorisation is unavailable or expired.',
      errors: [{
        code: 'SERVICE_UNAVAILABLE',
        message: 'Inventory read authorisation is unavailable or expired.',
        field: 'itemReadAdapter',
        retryable: true,
      }],
      result: {
        found: false,
        code: 'ITEM_READ_ADAPTER_NOT_READY',
        lookupType: envelope.payload.lookupType,
        lookupValue,
        item: null,
        mutationCounts,
      },
    });
    return;
  }

  const found = lookupValue !== 'MISSING-SKU-0390D';
  writeJson(response, 200, {
    ...base,
    admissionStatus: 'ACCEPTED',
    message: found
      ? 'Inventory completed the authoritative read-only item lookup.'
      : 'Inventory completed the authoritative read-only lookup and returned ITEM_NOT_FOUND.',
    errors: [],
    result: {
      found,
      code: found ? 'ITEM_FOUND' : 'ITEM_NOT_FOUND',
      lookupType: envelope.payload.lookupType,
      lookupValue,
      item: found ? {
        canonicalItemId: 'item-phase39-0d',
        sku: envelope.payload.lookupType === 'SKU' ? lookupValue : 'SKU-PHASE39-0D',
        itemName: 'Phase 39 Read-Only Item',
        primaryBarcode: envelope.payload.lookupType === 'BARCODE' ? lookupValue : '9300000000039',
        lifecycleStatus: 'ACTIVE',
        batchTracked: true,
        expiryTracked: true,
      } : null,
      mutationCounts,
    },
  });
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const publicPort = server.address().port;

function buildInput(suffix, lookupValue, overrides = {}) {
  return {
    envelopeId: `env:training:lookup:${suffix}`,
    idempotencyKey: `idem:training:lookup:${suffix}`,
    traceId: `trace:training:lookup:${suffix}`,
    occurredAt: new Date().toISOString(),
    deviceId: 'SCANOPS-HH-0390D',
    storeId: 'STORE-TEST-001',
    sessionId: 'SESSION-0390D',
    operatorId: 'staff-phase39-0d',
    inventoryInstanceId: 'inventory-test-001',
    trustReference: 'a'.repeat(64),
    lookupType: 'SKU',
    lookupValue,
    ...overrides,
  };
}

const client = createScanOpsItemLookupClientV1({
  configuration: { bridge_enabled: true, transport_enabled: true },
  environment: 'TRAINING',
  inventoryHost: '127.0.0.1',
  inventoryPort: publicPort,
  timeoutMs: 1000,
});

const built = client.buildLookupEnvelope(buildInput('build', 'SKU-PHASE39-0D'));
check('canonical_lookup_envelope_builds',
  built.ok === true
    && built.buildResult.envelope.operationType === 'LOOKUP_REQUEST'
    && built.buildResult.envelope.source.operatorId === 'staff-phase39-0d'
    && built.buildResult.envelope.payload.trustReference === 'a'.repeat(64),
  built);

const found = await client.sendItemLookup(buildInput('found', 'SKU-PHASE39-0D'));
check('known_item_returns_correlated_found_projection',
  found.ok === true
    && found.status === 'FOUND'
    && found.correlated === true
    && found.receiptValid === true
    && found.result.item.canonicalItemId === 'item-phase39-0d'
    && found.result.item.itemName === 'Phase 39 Read-Only Item',
  found);
check('known_item_zero_mutations',
  Object.values(found.result.mutationCounts).every((value) => value === 0)
    && found.inventoryMutationAttempted === false
    && found.scanOpsMutationAttempted === false,
  found);

const missing = await client.sendItemLookup(buildInput('missing', 'MISSING-SKU-0390D'));
check('unknown_item_returns_item_not_found',
  missing.ok === true
    && missing.status === 'ITEM_NOT_FOUND'
    && missing.result.found === false
    && missing.result.code === 'ITEM_NOT_FOUND'
    && missing.result.item === null,
  missing);

const unavailable = await client.sendItemLookup(buildInput('unavailable', 'AUTH-UNAVAILABLE'));
check('expired_or_missing_authorisation_fails_closed',
  unavailable.ok === false
    && unavailable.status === 'AUTHORIZATION_UNAVAILABLE'
    && unavailable.admissionStatus === 'SERVICE_UNAVAILABLE'
    && unavailable.reason === 'ITEM_READ_ADAPTER_NOT_READY',
  unavailable);

const rejected = await client.sendItemLookup(buildInput('rejected', 'SKU-PHASE39-0D', {
  trustReference: 'bad-trust',
}));
check('invalid_trust_is_rejected',
  rejected.ok === false
    && rejected.status === 'REJECTED'
    && rejected.admissionStatus === 'REJECTED'
    && rejected.reason === 'DEVICE_NOT_TRUSTED',
  rejected);

const invalid = await client.sendItemLookup(buildInput('invalid', '', { operatorId: '' }));
check('invalid_lookup_blocked_before_dispatch',
  invalid.ok === false
    && invalid.dispatchAttempted === false
    && invalid.blockers.includes('LOOKUP_VALUE_REQUIRED')
    && invalid.blockers.includes('SOURCE_OPERATOR_REQUIRED'),
  invalid);

const liveClient = createScanOpsItemLookupClientV1({
  configuration: { bridge_enabled: true, transport_enabled: true },
  environment: 'LIVE',
  inventoryHost: '127.0.0.1',
  inventoryPort: publicPort,
});
const liveBlocked = await liveClient.sendItemLookup(buildInput('live', 'SKU-PHASE39-0D'));
check('live_lookup_blocked_before_dispatch',
  liveBlocked.ok === false
    && liveBlocked.dispatchAttempted === false
    && liveBlocked.blockers.includes('ENVIRONMENT_BLOCKED'),
  liveBlocked);

const timeoutClient = createScanOpsItemLookupClientV1({
  configuration: { bridge_enabled: true, transport_enabled: true },
  environment: 'TRAINING',
  inventoryHost: '127.0.0.1',
  inventoryPort: 8788,
  timeoutMs: 20,
  fetchAdapter: (_url, options = {}) => new Promise((_resolve, reject) => {
    options.signal?.addEventListener('abort', () => {
      reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    });
  }),
});
const timeout = await timeoutClient.sendItemLookup(buildInput('timeout', 'SKU-PHASE39-0D'));
check('lookup_timeout_is_explicit_and_non_mutating',
  timeout.ok === false
    && timeout.status === 'TIMEOUT'
    && timeout.reason === 'LOOKUP_TIMEOUT'
    && timeout.timeoutTriggered === true
    && timeout.inventoryMutationAttempted === false
    && timeout.scanOpsMutationAttempted === false,
  timeout);

check('sent_envelopes_never_contain_inventory_credentials',
  requests.length === 4
    && requests.every((entry) => !JSON.stringify(entry).includes('accessToken')
      && !JSON.stringify(entry).includes('base44_access_token')
      && !JSON.stringify(entry).includes('secret-never-returned')),
  requests);

const uiSource = readFileSync(new URL('../src/components/sync/ReadOnlyItemLookupPilot.jsx', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../src/pages/SyncHandoff.jsx', import.meta.url), 'utf8');
const serviceSource = readFileSync(new URL('../src/lib/scanOpsLiveConnectivity.js', import.meta.url), 'utf8');
const clientSource = readFileSync(new URL('../src/inventory-bridge/itemLookup/v1/scanOpsItemLookupClientV1.js', import.meta.url), 'utf8');
check('lookup_ui_is_connected_state_only',
  pageSource.includes("state.key === 'connected'")
    && pageSource.includes('<ReadOnlyItemLookupPilot session={session} />'),
  'SyncHandoff');
check('lookup_ui_exposes_required_read_only_fields',
  uiSource.includes('Look up an Inventory item')
    && uiSource.includes('Zero mutations verified')
    && uiSource.includes('Batch tracked')
    && uiSource.includes('Expiry tracked')
    && uiSource.includes('cannot create an item or change stock'),
  'ReadOnlyItemLookupPilot');
check('service_uses_trusted_lookup_client_without_persistence',
  serviceSource.includes('createScanOpsItemLookupClientV1')
    && serviceSource.includes('runLiveItemLookup')
    && !clientSource.includes('localStorage')
    && !clientSource.includes('sessionStorage')
    && !clientSource.includes('queue'),
  'lookup service/client');
check('receiving_and_mutation_authority_not_added',
  !clientSource.includes('RECEIVING_SUBMISSION')
    && !clientSource.includes('.create(')
    && !clientSource.includes('.update(')
    && !clientSource.includes('.delete('),
  'lookup client');

await new Promise((resolve) => server.close(resolve));
const failures = checks.filter((entry) => !entry.passed);
const report = {
  phase: '39-0D',
  repository: 'chrykoolaid/invyra-scanops',
  passed: failures.length === 0,
  totalChecks: checks.length,
  passedChecks: checks.length - failures.length,
  failedChecks: failures.length,
  readiness: failures.length === 0 ? 'SCANOPS_READ_ONLY_LOOKUP_READY' : 'FAIL',
  environments: ['TEST', 'TRAINING'],
  liveAuthorized: false,
  productionAuthorized: false,
  receivingIntegrationAuthorized: false,
  credentialReceivedByScanOps: false,
  mutationCounts: {
    inventory: 0, stock: 0, ledger: 0, pricing: 0,
    purchaseOrder: 0, receiving: 0, itemMaster: 0, scanOps: 0,
  },
  tests: checks,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
console.log('SCANOPS_READ_ONLY_LOOKUP_READY');
