#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { BRIDGE_CONTRACT_V1 } from '../src/inventory-bridge/canonicalContract/v1/index.js';
import { createScanOpsItemLookupClientV1 } from '../src/inventory-bridge/itemLookup/v1/index.js';
import { resolveLiveItemLookupAvailability } from '../src/lib/scanOpsLiveConnectivity.js';

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

const NOW_MS = Date.parse('2026-07-23T12:00:00.000Z');
const PROFILE = Object.freeze({
  status: 'PAIRED',
  deviceId: 'HH-SCANOPS-001',
  sessionId: 'SESSION-001',
  storeId: 'STORE-001',
  inventoryInstanceId: 'inventory-training-001',
  environment: 'TRAINING',
  inventoryHost: '127.0.0.1',
  inventoryPort: 8788,
  trustReference: 'a'.repeat(64),
  trustExpiresAt: new Date(NOW_MS + 60_000).toISOString(),
});
const SESSION = Object.freeze({
  actorUserId: 'staff-001',
  deviceId: 'HH-SCANOPS-001',
  sessionId: 'SESSION-001',
  storeId: 'STORE-001',
  environment: 'TRAINING',
});
const CONNECTED_RESULT = Object.freeze({
  kind: 'HEALTH_TEST',
  ok: true,
  status: 'CONNECTED',
});

function receiptBase(envelope) {
  const timestamp = new Date(NOW_MS).toISOString();
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

function itemResult(envelope, mutationCounts = ZERO_MUTATIONS) {
  return {
    found: true,
    code: 'ITEM_FOUND',
    lookupType: envelope.payload.lookupType,
    lookupValue: envelope.payload.lookupValue,
    item: {
      canonicalItemId: 'item-phase39-0e',
      sku: envelope.payload.lookupType === 'SKU' ? envelope.payload.lookupValue : 'SKU-PHASE39-0E',
      itemName: 'Operational Lookup Item',
      primaryBarcode: envelope.payload.lookupType === 'BARCODE' ? envelope.payload.lookupValue : '9300000000039',
      lifecycleStatus: 'ACTIVE',
      unitOfMeasure: 'each',
      batchTracked: true,
      expiryTracked: false,
      primaryLocation: 'Aisle 4',
    },
    mutationCounts,
  };
}

function rejectedReceipt(envelope, code, message) {
  return new Response(JSON.stringify({
    ...receiptBase(envelope),
    admissionStatus: 'REJECTED',
    message,
    errors: [{ code, message, field: 'scope', retryable: false }],
  }), { status: 422, headers: { 'Content-Type': 'application/json' } });
}

function responseFor(envelope) {
  const value = envelope.payload.lookupValue;
  const type = envelope.payload.lookupType;
  const base = receiptBase(envelope);

  if (envelope.target.inventoryInstanceId !== PROFILE.inventoryInstanceId) {
    return rejectedReceipt(envelope, 'INVENTORY_INSTANCE_MISMATCH', 'The target Inventory instance is not allowed.');
  }
  if (envelope.source.storeId !== PROFILE.storeId || envelope.environment !== PROFILE.environment) {
    return rejectedReceipt(envelope, 'LOOKUP_SCOPE_MISMATCH', 'The lookup scope does not match Inventory.');
  }
  if (value === 'REVOKED-TRUST') {
    return rejectedReceipt(envelope, 'DEVICE_NOT_TRUSTED', 'The paired-device trust has been revoked.');
  }
  if (value === 'AUTH-UNAVAILABLE') {
    return new Response(JSON.stringify({
      ...base,
      admissionStatus: 'SERVICE_UNAVAILABLE',
      message: 'Inventory read authorisation is unavailable or expired.',
      errors: [{
        code: 'SERVICE_UNAVAILABLE',
        message: 'Inventory read authorisation is unavailable or expired.',
        field: 'itemReadAdapter',
        retryable: false,
      }],
      result: {
        found: false,
        code: 'ITEM_READ_ADAPTER_NOT_READY',
        lookupType: type,
        lookupValue: value,
        item: null,
        mutationCounts: ZERO_MUTATIONS,
      },
    }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
  if (value === 'MALFORMED-RECEIPT') {
    return new Response(JSON.stringify({
      ...base,
      traceId: 'trace:wrong',
      admissionStatus: 'ACCEPTED',
      message: 'Malformed receipt.',
      errors: [],
      result: itemResult(envelope),
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (value === 'NONZERO-MUTATION') {
    return new Response(JSON.stringify({
      ...base,
      admissionStatus: 'ACCEPTED',
      message: 'Invalid mutation evidence.',
      errors: [],
      result: itemResult(envelope, { ...ZERO_MUTATIONS, stock: 1 }),
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (value === 'EXTRA-MUTATION') {
    return new Response(JSON.stringify({
      ...base,
      admissionStatus: 'ACCEPTED',
      message: 'Unexpected mutation evidence.',
      errors: [],
      result: itemResult(envelope, { ...ZERO_MUTATIONS, scanops: 0 }),
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const found = !value.startsWith('MISSING-');
  return new Response(JSON.stringify({
    ...base,
    admissionStatus: 'ACCEPTED',
    message: found
      ? 'Inventory completed the authoritative read-only item lookup.'
      : 'Inventory completed the authoritative read-only lookup and returned ITEM_NOT_FOUND.',
    errors: [],
    result: found ? itemResult(envelope) : {
      found: false,
      code: 'ITEM_NOT_FOUND',
      lookupType: type,
      lookupValue: value,
      item: null,
      mutationCounts: ZERO_MUTATIONS,
    },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function buildInput(suffix, lookupType, lookupValue, overrides = {}) {
  return {
    envelopeId: `env:training:lookup:${suffix}`,
    idempotencyKey: `idem:training:lookup:${suffix}`,
    traceId: `trace:training:lookup:${suffix}`,
    occurredAt: new Date(NOW_MS).toISOString(),
    deviceId: PROFILE.deviceId,
    storeId: PROFILE.storeId,
    sessionId: PROFILE.sessionId,
    operatorId: SESSION.actorUserId,
    inventoryInstanceId: PROFILE.inventoryInstanceId,
    trustReference: PROFILE.trustReference,
    lookupType,
    lookupValue,
    ...overrides,
  };
}

const connected = resolveLiveItemLookupAvailability({
  profile: PROFILE,
  connectionResult: CONNECTED_RESULT,
  session: SESSION,
  nowMs: NOW_MS,
});
check('connected_trusted_scope_is_operational',
  connected.connected === true && connected.status === 'CONNECTED', connected);

const disconnected = resolveLiveItemLookupAvailability({
  profile: null,
  connectionResult: null,
  session: SESSION,
  nowMs: NOW_MS,
});
check('disconnected_scanops_does_not_authorize_dispatch',
  disconnected.connected === false
    && disconnected.reason === 'PAIRING_REQUIRED'
    && disconnected.dispatchAttempted === false,
  disconnected);

const unverified = resolveLiveItemLookupAvailability({
  profile: PROFILE,
  connectionResult: { kind: 'PAIRING', ok: true, status: 'PAIRED' },
  session: SESSION,
  nowMs: NOW_MS,
});
check('paired_but_unverified_connection_fails_closed',
  unverified.connected === false
    && unverified.reason === 'INVENTORY_CONNECTION_NOT_VERIFIED'
    && unverified.dispatchAttempted === false,
  unverified);

const expiredTrust = resolveLiveItemLookupAvailability({
  profile: { ...PROFILE, trustExpiresAt: new Date(NOW_MS - 1).toISOString() },
  connectionResult: CONNECTED_RESULT,
  session: SESSION,
  nowMs: NOW_MS,
});
check('expired_device_trust_fails_closed_before_dispatch',
  expiredTrust.connected === false
    && expiredTrust.reason === 'DEVICE_TRUST_EXPIRED'
    && expiredTrust.dispatchAttempted === false,
  expiredTrust);

const wrongEnvironment = resolveLiveItemLookupAvailability({
  profile: PROFILE,
  connectionResult: CONNECTED_RESULT,
  session: { ...SESSION, environment: 'TEST' },
  nowMs: NOW_MS,
});
check('wrong_environment_scope_is_rejected',
  wrongEnvironment.connected === false
    && wrongEnvironment.reason === 'ENVIRONMENT_SCOPE_MISMATCH',
  wrongEnvironment);

const wrongStore = resolveLiveItemLookupAvailability({
  profile: PROFILE,
  connectionResult: CONNECTED_RESULT,
  session: { ...SESSION, storeId: 'STORE-OTHER' },
  nowMs: NOW_MS,
});
check('wrong_store_scope_is_rejected',
  wrongStore.connected === false && wrongStore.reason === 'STORE_SCOPE_MISMATCH', wrongStore);

const wrongSession = resolveLiveItemLookupAvailability({
  profile: PROFILE,
  connectionResult: CONNECTED_RESULT,
  session: { ...SESSION, sessionId: 'SESSION-OTHER' },
  nowMs: NOW_MS,
});
check('wrong_paired_session_is_rejected',
  wrongSession.connected === false && wrongSession.reason === 'SESSION_SCOPE_MISMATCH', wrongSession);

const missingInstance = resolveLiveItemLookupAvailability({
  profile: { ...PROFILE, inventoryInstanceId: '' },
  connectionResult: CONNECTED_RESULT,
  session: SESSION,
  nowMs: NOW_MS,
});
check('missing_inventory_instance_scope_is_rejected',
  missingInstance.connected === false
    && missingInstance.reason === 'INVENTORY_INSTANCE_SCOPE_REQUIRED',
  missingInstance);

const dispatched = [];
const client = createScanOpsItemLookupClientV1({
  configuration: { bridge_enabled: true, transport_enabled: true },
  environment: PROFILE.environment,
  inventoryHost: PROFILE.inventoryHost,
  inventoryPort: PROFILE.inventoryPort,
  timeoutMs: 1000,
  fetchAdapter: async (_url, options = {}) => {
    const envelope = JSON.parse(options.body);
    dispatched.push(envelope);
    return responseFor(envelope);
  },
});

const foundBarcode = await client.sendItemLookup(buildInput('barcode-found', 'BARCODE', '9300000000039'));
check('connected_barcode_lookup_returns_found_item',
  foundBarcode.ok === true
    && foundBarcode.status === 'FOUND'
    && foundBarcode.correlated === true
    && foundBarcode.result.item.primaryBarcode === '9300000000039',
  foundBarcode);

const foundSku = await client.sendItemLookup(buildInput('sku-found', 'SKU', 'SKU-PHASE39-0E'));
check('connected_exact_sku_lookup_returns_found_item',
  foundSku.ok === true
    && foundSku.status === 'FOUND'
    && foundSku.correlated === true
    && foundSku.result.item.sku === 'SKU-PHASE39-0E',
  foundSku);

const missingSku = await client.sendItemLookup(buildInput('sku-missing', 'SKU', 'MISSING-SKU-0390E'));
check('unknown_sku_returns_item_not_found',
  missingSku.ok === true
    && missingSku.status === 'ITEM_NOT_FOUND'
    && missingSku.result.code === 'ITEM_NOT_FOUND'
    && missingSku.result.item === null,
  missingSku);

const missingBarcode = await client.sendItemLookup(buildInput('barcode-missing', 'BARCODE', 'MISSING-BARCODE-0390E'));
check('unknown_barcode_returns_item_not_found',
  missingBarcode.ok === true
    && missingBarcode.status === 'ITEM_NOT_FOUND'
    && missingBarcode.result.lookupType === 'BARCODE'
    && missingBarcode.result.item === null,
  missingBarcode);

const authorizationUnavailable = await client.sendItemLookup(buildInput('auth-unavailable', 'SKU', 'AUTH-UNAVAILABLE'));
check('expired_inventory_authorisation_fails_closed',
  authorizationUnavailable.ok === false
    && authorizationUnavailable.status === 'AUTHORIZATION_UNAVAILABLE'
    && authorizationUnavailable.admissionStatus === 'SERVICE_UNAVAILABLE'
    && authorizationUnavailable.reason === 'ITEM_READ_ADAPTER_NOT_READY',
  authorizationUnavailable);

const revokedTrust = await client.sendItemLookup(buildInput('revoked-trust', 'SKU', 'REVOKED-TRUST'));
check('revoked_device_trust_is_rejected',
  revokedTrust.ok === false
    && revokedTrust.status === 'REJECTED'
    && revokedTrust.reason === 'DEVICE_NOT_TRUSTED',
  revokedTrust);

const wrongInventoryInstance = await client.sendItemLookup(buildInput('wrong-instance', 'SKU', 'SKU-PHASE39-0E', {
  inventoryInstanceId: 'inventory-other-001',
}));
check('wrong_inventory_instance_is_rejected',
  wrongInventoryInstance.ok === false
    && wrongInventoryInstance.status === 'REJECTED'
    && wrongInventoryInstance.reason === 'INVENTORY_INSTANCE_MISMATCH',
  wrongInventoryInstance);

const duplicateInput = buildInput('duplicate', 'SKU', 'SKU-DUPLICATE-0390E');
const duplicateFirst = await client.sendItemLookup(duplicateInput);
const duplicateSecond = await client.sendItemLookup(duplicateInput);
check('duplicate_request_remains_correlated_and_read_only',
  duplicateFirst.ok === true
    && duplicateSecond.ok === true
    && duplicateFirst.receipt.envelopeId === duplicateSecond.receipt.envelopeId
    && duplicateFirst.receipt.idempotencyKey === duplicateSecond.receipt.idempotencyKey
    && Object.values(duplicateFirst.result.mutationCounts).every((value) => value === 0)
    && Object.values(duplicateSecond.result.mutationCounts).every((value) => value === 0),
  { duplicateFirst, duplicateSecond });

const malformed = await client.sendItemLookup(buildInput('malformed', 'SKU', 'MALFORMED-RECEIPT'));
check('malformed_or_uncorrelated_receipt_is_rejected',
  malformed.ok === false
    && malformed.status === 'REJECTED'
    && malformed.receiptValid === false
    && malformed.correlated === false,
  malformed);

const nonzeroMutation = await client.sendItemLookup(buildInput('nonzero', 'SKU', 'NONZERO-MUTATION'));
const extraMutation = await client.sendItemLookup(buildInput('extra', 'SKU', 'EXTRA-MUTATION'));
check('unexpected_or_nonzero_mutation_evidence_is_rejected',
  nonzeroMutation.ok === false
    && nonzeroMutation.receiptValid === false
    && extraMutation.ok === false
    && extraMutation.receiptValid === false,
  { nonzeroMutation, extraMutation });

const publicHostClient = createScanOpsItemLookupClientV1({
  configuration: { bridge_enabled: true, transport_enabled: true },
  environment: 'TRAINING',
  inventoryHost: 'inventory.example.com',
  inventoryPort: 8788,
  fetchAdapter: async () => { throw new Error('Public host must not dispatch.'); },
});
const publicHost = await publicHostClient.sendItemLookup(buildInput('public-host', 'SKU', 'SKU-PHASE39-0E'));
check('public_destination_is_blocked_before_dispatch',
  publicHost.ok === false
    && publicHost.dispatchAttempted === false
    && publicHost.blockers.includes('INVENTORY_HOST_NOT_LOCAL'),
  publicHost);

const httpsClient = createScanOpsItemLookupClientV1({
  configuration: { bridge_enabled: true, transport_enabled: true },
  environment: 'TRAINING',
  protocol: 'https',
  inventoryHost: '127.0.0.1',
  inventoryPort: 8788,
  fetchAdapter: async () => { throw new Error('HTTPS must not dispatch.'); },
});
const httpsDestination = await httpsClient.sendItemLookup(buildInput('https', 'SKU', 'SKU-PHASE39-0E'));
check('https_destination_is_blocked_before_dispatch',
  httpsDestination.ok === false
    && httpsDestination.dispatchAttempted === false
    && httpsDestination.blockers.includes('LOOKUP_PROTOCOL_NOT_LOCAL_HTTP'),
  httpsDestination);

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
const timeout = await timeoutClient.sendItemLookup(buildInput('timeout', 'SKU', 'SKU-TIMEOUT-0390E'));
check('timeout_is_explicit_and_non_mutating',
  timeout.ok === false
    && timeout.status === 'TIMEOUT'
    && timeout.reason === 'LOOKUP_TIMEOUT'
    && timeout.timeoutTriggered === true
    && timeout.inventoryMutationAttempted === false
    && timeout.scanOpsMutationAttempted === false,
  timeout);

check('no_lookup_credential_or_inventory_token_reaches_scanops',
  dispatched.length > 0 && dispatched.every((envelope) => {
    const serialized = JSON.stringify(envelope);
    return !serialized.includes('accessToken')
      && !serialized.includes('base44_access_token')
      && !serialized.includes('Authorization')
      && !serialized.includes('Bearer ');
  }),
  dispatched);

const scanSource = readFileSync(new URL('../src/pages/Scan.jsx', import.meta.url), 'utf8');
const serviceSource = readFileSync(new URL('../src/lib/scanOpsLiveConnectivity.js', import.meta.url), 'utf8');

check('operational_scan_uses_existing_live_lookup_service',
  scanSource.includes('runLiveItemLookup')
    && scanSource.includes('getLiveItemLookupAvailability')
    && serviceSource.includes('createScanOpsItemLookupClientV1')
    && serviceSource.includes('trustReference: profile.trustReference'),
  'Scan.jsx and scanOpsLiveConnectivity.js');

check('barcode_and_exact_sku_are_the_only_operational_modes',
  scanSource.includes('runLookup("BARCODE", barcode)')
    && scanSource.includes('runLookup("SKU", skuValue)')
    && scanSource.includes('Item name and PLU search are not available in this certified phase.')
    && !scanSource.includes('lookupType: "PLU"')
    && !scanSource.includes('lookupType: "NAME"'),
  'Scan.jsx');

check('local_cache_and_mock_lookup_are_retired_from_scan_path',
  !scanSource.includes('resolveInventoryIdentity')
    && !scanSource.includes('searchItemEntries')
    && !scanSource.includes('WorkflowHeader')
    && !scanSource.includes('inventorySystemAdapter')
    && !scanSource.includes('MOCK_INVENTORY_ITEMS')
    && !scanSource.includes('navigate(`/product/')
    && !scanSource.includes('navigate("/product/'),
  'Scan.jsx');

check('disconnected_authorisation_and_not_found_states_are_explicit',
  scanSource.includes('Inventory not connected')
    && scanSource.includes('Open Sync &amp; Connectivity')
    && scanSource.includes('Inventory read authorisation unavailable')
    && scanSource.includes('Inventory Desktop must be reauthorised')
    && scanSource.includes('Item not found')
    && scanSource.includes('ITEM_NOT_FOUND')
    && scanSource.includes('Zero mutations verified'),
  'Scan.jsx');

check('lookup_results_are_not_persisted_queued_or_automatically_retried',
  !scanSource.includes('localStorage')
    && !scanSource.includes('sessionStorage')
    && !scanSource.includes('enqueue')
    && !scanSource.includes('retryAllSyncEvents')
    && !serviceSource.includes('RECEIVING_SUBMISSION'),
  'operational lookup source');

check('sensitive_price_and_cost_fields_are_not_rendered',
  !scanSource.includes('currentPrice')
    && !scanSource.includes('pricePerKg')
    && !scanSource.includes('unitCost')
    && !scanSource.includes('costPrice'),
  'Scan.jsx');

const failures = checks.filter((entry) => !entry.passed);
const report = {
  phase: '39-0E',
  repository: 'chrykoolaid/invyra-scanops',
  passed: failures.length === 0,
  totalChecks: checks.length,
  passedChecks: checks.length - failures.length,
  failedChecks: failures.length,
  readiness: failures.length === 0 ? 'SCANOPS_OPERATIONAL_ITEM_LOOKUP_READY' : 'FAIL',
  environments: ['TEST', 'TRAINING'],
  liveAuthorized: false,
  productionAuthorized: false,
  receivingIntegrationAuthorized: false,
  localLookupRetiredFromOperationalPath: true,
  automaticRetryAdded: false,
  queueWriteAdded: false,
  persistenceAdded: false,
  credentialReceivedByScanOps: false,
  mutationCounts: {
    inventory: 0,
    stock: 0,
    ledger: 0,
    pricing: 0,
    purchaseOrder: 0,
    receiving: 0,
    itemMaster: 0,
    scanOps: 0,
  },
  tests: checks,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
console.log('SCANOPS_OPERATIONAL_ITEM_LOOKUP_READY');
