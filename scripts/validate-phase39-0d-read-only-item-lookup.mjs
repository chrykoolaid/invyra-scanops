#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { BRIDGE_CONTRACT_V1 } from '../src/inventory-bridge/canonicalContract/v1/index.js';
import { createScanOpsItemLookupClientV1 } from '../src/inventory-bridge/itemLookup/v1/index.js';

const checks = [];
function check(name, condition, detail = '') {
  checks.push({ name, passed: condition === true, detail });
}

const ZERO_MUTATIONS = Object.freeze({
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

function foundResult(envelope, mutationCounts = ZERO_MUTATIONS) {
  const lookupType = envelope.payload.lookupType;
  const lookupValue = envelope.payload.lookupValue;
  return {
    found: true,
    code: 'ITEM_FOUND',
    lookupType,
    lookupValue,
    item: {
      canonicalItemId: 'item-phase39-0d',
      sku: lookupType === 'SKU' ? lookupValue : 'SKU-PHASE39-0D',
      itemName: 'Phase 39 Read-Only Item',
      primaryBarcode: lookupType === 'BARCODE' ? lookupValue : '9300000000039',
      lifecycleStatus: 'ACTIVE',
      batchTracked: true,
      expiryTracked: true,
    },
    mutationCounts,
  };
}

function responseFor(envelope) {
  const base = receiptBase(envelope);
  const lookupType = envelope.payload.lookupType;
  const lookupValue = envelope.payload.lookupValue;

  if (envelope.payload.trustReference === 'bad-trust') {
    return new Response(JSON.stringify({
      ...base,
      admissionStatus: 'REJECTED',
      message: 'The paired trust reference is invalid.',
      errors: [{
        code: 'DEVICE_NOT_TRUSTED',
        message: 'The paired trust reference is invalid.',
        field: 'payload.trustReference',
        retryable: false,
      }],
    }), { status: 422, headers: { 'Content-Type': 'application/json' } });
  }

  if (lookupValue === 'AUTH-UNAVAILABLE') {
    return new Response(JSON.stringify({
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
        lookupType,
        lookupValue,
        item: null,
        mutationCounts: ZERO_MUTATIONS,
      },
    }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }

  if (lookupValue === 'MALICIOUS-MUTATION') {
    return new Response(JSON.stringify({
      ...base,
      admissionStatus: 'ACCEPTED',
      message: 'Malformed mutation evidence must be rejected.',
      errors: [],
      result: foundResult(envelope, { ...ZERO_MUTATIONS, scanops: 1 }),
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const found = lookupValue !== 'MISSING-SKU-0390D';
  return new Response(JSON.stringify({
    ...base,
    admissionStatus: 'ACCEPTED',
    message: found
      ? 'Inventory completed the authoritative read-only item lookup.'
      : 'Inventory completed the authoritative read-only lookup and returned ITEM_NOT_FOUND.',
    errors: [],
    result: found ? foundResult(envelope) : {
      found: false,
      code: 'ITEM_NOT_FOUND',
      lookupType,
      lookupValue,
      item: null,
      mutationCounts: ZERO_MUTATIONS,
    },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

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

const dispatched = [];
const client = createScanOpsItemLookupClientV1({
  configuration: { bridge_enabled: true, transport_enabled: true },
  environment: 'TRAINING',
  inventoryHost: '127.0.0.1',
  inventoryPort: 8788,
  timeoutMs: 1000,
  fetchAdapter: async (_url, options = {}) => {
    const envelope = JSON.parse(options.body);
    dispatched.push(envelope);
    return responseFor(envelope);
  },
});

const built = client.buildLookupEnvelope(buildInput('build', 'SKU-PHASE39-0D'));
check('canonical_lookup_envelope_builds',
  built.ok === true
    && built.buildResult.envelope.operationType === 'LOOKUP_REQUEST'
    && built.buildResult.envelope.source.operatorId === 'staff-phase39-0d'
    && built.buildResult.envelope.payload.trustReference === 'a'.repeat(64),
  built);

const found = await client.sendItemLookup(buildInput('found', 'SKU-PHASE39-0D'));
check('known_item_returns_correlated_projection',
  found.ok === true
    && found.status === 'FOUND'
    && found.correlated === true
    && found.receiptValid === true
    && found.result.item.canonicalItemId === 'item-phase39-0d'
    && found.result.item.itemName === 'Phase 39 Read-Only Item',
  found);
check('known_item_has_zero_mutation_evidence',
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
check('expired_authorisation_fails_closed',
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

const malicious = await client.sendItemLookup(buildInput('malicious', 'MALICIOUS-MUTATION'));
check('unexpected_or_nonzero_mutation_evidence_is_rejected',
  malicious.ok === false
    && malicious.status === 'REJECTED'
    && malicious.receiptValid === false
    && malicious.validationErrors.some((error) => error.field === 'result.mutationCounts.scanops'),
  malicious);

const invalid = await client.sendItemLookup(buildInput('invalid', '', { operatorId: '' }));
check('invalid_input_blocked_before_dispatch',
  invalid.ok === false
    && invalid.dispatchAttempted === false
    && invalid.blockers.includes('LOOKUP_VALUE_REQUIRED')
    && invalid.blockers.includes('SOURCE_OPERATOR_REQUIRED'),
  invalid);

const liveClient = createScanOpsItemLookupClientV1({
  configuration: { bridge_enabled: true, transport_enabled: true },
  environment: 'LIVE',
  inventoryHost: '127.0.0.1',
  inventoryPort: 8788,
  fetchAdapter: async () => { throw new Error('LIVE must not dispatch.'); },
});
const liveBlocked = await liveClient.sendItemLookup(buildInput('live', 'SKU-PHASE39-0D'));
check('live_lookup_blocked_before_dispatch',
  liveBlocked.ok === false
    && liveBlocked.dispatchAttempted === false
    && liveBlocked.blockers.includes('ENVIRONMENT_BLOCKED'),
  liveBlocked);

const publicHostClient = createScanOpsItemLookupClientV1({
  configuration: { bridge_enabled: true, transport_enabled: true },
  environment: 'TRAINING',
  inventoryHost: 'inventory.example.com',
  inventoryPort: 8788,
  fetchAdapter: async () => { throw new Error('Public host must not dispatch.'); },
});
const publicHostBlocked = await publicHostClient.sendItemLookup(buildInput('public-host', 'SKU-PHASE39-0D'));
check('public_inventory_host_blocked_before_dispatch',
  publicHostBlocked.ok === false
    && publicHostBlocked.dispatchAttempted === false
    && publicHostBlocked.blockers.includes('INVENTORY_HOST_NOT_LOCAL'),
  publicHostBlocked);

const httpsClient = createScanOpsItemLookupClientV1({
  configuration: { bridge_enabled: true, transport_enabled: true },
  environment: 'TRAINING',
  protocol: 'https',
  inventoryHost: '127.0.0.1',
  inventoryPort: 8788,
  fetchAdapter: async () => { throw new Error('HTTPS lookup must not dispatch.'); },
});
const httpsBlocked = await httpsClient.sendItemLookup(buildInput('https', 'SKU-PHASE39-0D'));
check('https_lookup_destination_blocked_before_dispatch',
  httpsBlocked.ok === false
    && httpsBlocked.dispatchAttempted === false
    && httpsBlocked.blockers.includes('LOOKUP_PROTOCOL_NOT_LOCAL_HTTP'),
  httpsBlocked);

const timeoutClient = createScanOpsItemLookupClientV1({
  configuration: { bridge_enabled: true, transport_enabled: true },
  environment: 'TRAINING',
  inventoryHost: '127.0.0.1',
  inventoryPort: 8788,
  timeoutMs: 20,
  fetchAdapter: (_url, options = {}) => new Promise((_resolve, rejectPromise) => {
    options.signal?.addEventListener('abort', () => {
      rejectPromise(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    });
  }),
});
const timeout = await timeoutClient.sendItemLookup(buildInput('timeout', 'SKU-PHASE39-0D'));
check('timeout_is_explicit_and_non_mutating',
  timeout.ok === false
    && timeout.status === 'TIMEOUT'
    && timeout.reason === 'LOOKUP_TIMEOUT'
    && timeout.timeoutTriggered === true
    && timeout.inventoryMutationAttempted === false
    && timeout.scanOpsMutationAttempted === false,
  timeout);

check('scanops_never_receives_or_sends_inventory_credentials',
  dispatched.length === 5
    && dispatched.every((entry) => {
      const text = JSON.stringify(entry);
      return !text.includes('accessToken')
        && !text.includes('base44_access_token')
        && !text.includes('secret-never-returned');
    }),
  dispatched);

const uiSource = readFileSync(new URL('../src/components/sync/ReadOnlyItemLookupPilot.jsx', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../src/pages/SyncHandoff.jsx', import.meta.url), 'utf8');
const serviceSource = readFileSync(new URL('../src/lib/scanOpsLiveConnectivity.js', import.meta.url), 'utf8');
check('lookup_ui_is_connected_state_only',
  pageSource.includes("state.key === 'connected'")
    && pageSource.includes('<ReadOnlyItemLookupPilot session={session} />'),
  'SyncHandoff');
check('lookup_ui_exposes_read_only_result_fields',
  uiSource.includes('Look up an Inventory item')
    && uiSource.includes('Zero mutations verified')
    && uiSource.includes('Batch tracked')
    && uiSource.includes('Expiry tracked')
    && uiSource.includes('cannot create an item or change stock'),
  'ReadOnlyItemLookupPilot');
check('service_uses_trusted_lookup_client',
  serviceSource.includes('createScanOpsItemLookupClientV1')
    && serviceSource.includes('runLiveItemLookup')
    && serviceSource.includes('trustReference: profile.trustReference'),
  'scanOpsLiveConnectivity');

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
    inventory: 0,
    stock: 0,
    ledger: 0,
    pricing: 0,
    purchaseOrder: 0,
    receiving: 0,
    itemMaster: 0,
    scanOps: 0
  },
  tests: checks,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
console.log('SCANOPS_READ_ONLY_LOOKUP_READY');
