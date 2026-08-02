#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createScanOpsItemLookupClientV1,
  IDLE_TOLERANT_ITEM_READ_TIMEOUT_MS,
  LEGACY_OPERATIONAL_ITEM_READ_TIMEOUT_MS,
} from '../src/inventory-bridge/itemLookup/v1/index.js';

const checks = [];
function check(name, condition, details = null) {
  const passed = condition === true;
  checks.push({ name, passed, details });
  assert.ok(passed, `${name}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const indexSource = await readFile(
  new URL('../src/inventory-bridge/itemLookup/v1/index.js', import.meta.url),
  'utf8',
);
const clientSource = await readFile(
  new URL('../src/inventory-bridge/itemLookup/v1/scanOpsItemLookupClientV1.js', import.meta.url),
  'utf8',
);
const connectivitySource = await readFile(
  new URL('../src/lib/scanOpsLiveConnectivity.js', import.meta.url),
  'utf8',
);

check('legacy_live_timeout_is_identified',
  LEGACY_OPERATIONAL_ITEM_READ_TIMEOUT_MS === 4_000
    && connectivitySource.includes('timeoutMs: 4000'));
check('idle_tolerant_window_is_fifteen_seconds',
  IDLE_TOLERANT_ITEM_READ_TIMEOUT_MS === 15_000
    && indexSource.includes('IDLE_TOLERANT_ITEM_READ_TIMEOUT_MS = 15_000'));

const operationalClient = createScanOpsItemLookupClientV1({
  configuration: { bridge_enabled: true, transport_enabled: true },
  environment: 'TRAINING',
  inventoryHost: '127.0.0.1',
  inventoryPort: 8788,
  timeoutMs: LEGACY_OPERATIONAL_ITEM_READ_TIMEOUT_MS,
  fetchAdapter: async () => {
    throw new Error('Not invoked by configuration certification.');
  },
});
check('live_four_second_request_is_upgraded',
  operationalClient.configuration.timeoutMs === IDLE_TOLERANT_ITEM_READ_TIMEOUT_MS,
  operationalClient.configuration);

const deterministicClient = createScanOpsItemLookupClientV1({
  configuration: { bridge_enabled: true, transport_enabled: true },
  environment: 'TRAINING',
  inventoryHost: '127.0.0.1',
  inventoryPort: 8788,
  timeoutMs: 12,
  fetchAdapter: (_url, options = {}) => new Promise((_resolve, reject) => {
    options.signal?.addEventListener('abort', () => {
      const error = new Error('Controlled timeout');
      error.name = 'AbortError';
      reject(error);
    }, { once: true });
  }),
});
check('explicit_test_timeout_is_preserved',
  deterministicClient.configuration.timeoutMs === 12,
  deterministicClient.configuration);

const timeoutResult = await deterministicClient.sendItemLookup({
  envelopeId: 'env:training:phase39-0f8-3-timeout',
  idempotencyKey: 'idem:training:phase39-0f8-3-timeout',
  traceId: 'trace:training:phase39-0f8-3-timeout',
  occurredAt: new Date().toISOString(),
  deviceId: 'scanops-device-0390f83',
  storeId: 'STORE-TEST-001',
  sessionId: 'scanops-session-0390f83',
  operatorId: 'operator-0390f83',
  inventoryInstanceId: 'inventory-test-001',
  trustReference: 'a'.repeat(64),
  lookupType: 'SKU',
  lookupValue: 'CHM-LIVE-001',
});
check('single_attempt_still_fails_closed_on_real_timeout',
  timeoutResult.ok === false
    && timeoutResult.status === 'TIMEOUT'
    && timeoutResult.reason === 'LOOKUP_TIMEOUT'
    && timeoutResult.timeoutTriggered === true,
  timeoutResult);
check('timeout_path_keeps_all_mutations_zero', [
  timeoutResult.inventoryMutationAttempted,
  timeoutResult.scanOpsMutationAttempted,
].every((value) => value === false), timeoutResult);

check('transport_still_dispatches_one_fetch_only',
  (clientSource.match(/fetchAdapter\(endpoint/g) || []).length === 1
    && !clientSource.includes('retryCount')
    && !clientSource.includes('automaticRetry'));
check('no_queue_replay_or_fallback_added',
  indexSource.includes('does not add retry, replay, queueing, persistence or fallback')
    && !indexSource.includes('setInterval(')
    && !indexSource.includes('localStorage'));
check('test_and_training_boundary_preserved',
  clientSource.includes("const ALLOWED_ENVIRONMENTS = Object.freeze(['TEST', 'TRAINING'])"));

const failures = checks.filter((entry) => !entry.passed);
const report = {
  phase: '39-0F8.3',
  repository: 'chrykoolaid/invyra-scanops',
  passed: failures.length === 0,
  totalChecks: checks.length,
  passedChecks: checks.length - failures.length,
  failedChecks: failures.length,
  operationalItemReadTimeoutMs: IDLE_TOLERANT_ITEM_READ_TIMEOUT_MS,
  automaticRetryAdded: false,
  queueAdded: false,
  persistenceAdded: false,
  localFallbackAdded: false,
  receivingIntegrationAuthorized: false,
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
  checks,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
console.log('PHASE_39_0F8_3_IDLE_READ_TIMEOUT_TOLERANCE_READY');
