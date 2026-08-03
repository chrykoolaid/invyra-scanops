#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { detectLookupType } from '../src/components/scanner/itemLookup/itemLookupHelpers.js';
import { createScanOpsItemLookupClientV1 } from '../src/inventory-bridge/itemLookup/v1/index.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const checks = [];

function check(name, condition, detail = '') {
  checks.push({ name, passed: condition === true, detail });
}

const liveConnectivity = read('src/lib/scanOpsLiveConnectivity.js');
const scanPage = read('src/pages/Scan.jsx');
const knownCanonicalId = '6a2837ecb8270c9119eeebae';
const unknownCanonicalId = 'ffffffffffffffffffffffff';

check(
  'known_and_unknown_inventory_sell_ids_classify_as_canonical_ids',
  detectLookupType(knownCanonicalId) === 'CANONICAL_ID'
    && detectLookupType(unknownCanonicalId) === 'CANONICAL_ID',
  'itemLookupHelpers.js runtime classification',
);

check(
  'live_lookup_boundary_admits_canonical_id',
  liveConnectivity.includes("['BARCODE', 'SKU', 'CANONICAL_ID'].includes(normalizedType)")
    && !liveConnectivity.includes("!['BARCODE', 'SKU'].includes(normalizedType)"),
  'scanOpsLiveConnectivity.js',
);

check(
  'operator_validation_message_names_inventory_sell_id',
  liveConnectivity.includes('Scan a barcode or enter an exact SKU or Inventory sell ID.')
    && !liveConnectivity.includes("'Scan a barcode or enter an exact SKU.',"),
  'scanOpsLiveConnectivity.js',
);

const client = createScanOpsItemLookupClientV1({
  configuration: { bridge_enabled: true, transport_enabled: true },
  environment: 'TRAINING',
  inventoryHost: '127.0.0.1',
  inventoryPort: 8788,
});

function canonicalInput(value, suffix) {
  return {
    envelopeId: `env:training:canonical:${suffix}`,
    idempotencyKey: `idem:training:canonical:${suffix}`,
    traceId: `trace:training:canonical:${suffix}`,
    occurredAt: '2026-08-03T12:40:00.000Z',
    deviceId: 'SCANOPS-F8-5',
    storeId: 'STORE-TEST-001',
    sessionId: 'SESSION-F8-5',
    operatorId: 'staff-f8-5',
    inventoryInstanceId: 'inventory-test-001',
    trustReference: 'a'.repeat(64),
    lookupType: 'CANONICAL_ID',
    lookupValue: value,
  };
}

const knownBuild = client.buildLookupEnvelope(canonicalInput(knownCanonicalId, 'known'));
const unknownBuild = client.buildLookupEnvelope(canonicalInput(unknownCanonicalId, 'unknown'));

check(
  'canonical_id_client_envelopes_are_admitted_without_dispatch',
  knownBuild.ok === true
    && unknownBuild.ok === true
    && knownBuild.buildResult.envelope.operationType === 'LOOKUP_REQUEST'
    && knownBuild.buildResult.envelope.payload.lookupType === 'CANONICAL_ID'
    && knownBuild.buildResult.envelope.payload.lookupValue === knownCanonicalId
    && unknownBuild.buildResult.envelope.payload.lookupValue === unknownCanonicalId,
  { knownBuild: knownBuild.ok, unknownBuild: unknownBuild.ok },
);

check(
  'scan_page_routes_detected_exact_type_without_rewriting_to_sku',
  scanPage.includes('const type = detectLookupType(value);')
    && scanPage.includes('runLookup(type || "SKU", value)')
    && !scanPage.includes('type === "CANONICAL_ID" ? "SKU"'),
  'Scan.jsx',
);

check(
  'no_automatic_open_fallback_or_retry_added',
  scanPage.includes('Explicit operator action required')
    && scanPage.includes('No broader search was started automatically')
    && !liveConnectivity.includes('setInterval(() => runLiveItemLookup')
    && !liveConnectivity.includes('retryItemLookup'),
  'Scan.jsx and scanOpsLiveConnectivity.js',
);

check(
  'zero_mutation_and_receiving_boundary_preserved',
  liveConnectivity.includes('inventoryMutationAttempted: false')
    && liveConnectivity.includes('scanOpsMutationAttempted: false')
    && !liveConnectivity.includes('RECEIVING_SUBMISSION')
    && !liveConnectivity.includes('localStorage.setItem')
    && !liveConnectivity.includes('queue.push'),
  'scanOpsLiveConnectivity.js',
);

const invalidBuild = client.buildLookupEnvelope({
  ...canonicalInput(knownCanonicalId, 'invalid'),
  lookupType: 'SELL_ID_GUESS',
});
const invalidBlockers = invalidBuild.gate?.blockers
  || invalidBuild.buildResult?.errors?.map((entry) => entry?.code || entry)
  || [];
check(
  'unknown_lookup_types_remain_blocked',
  invalidBuild.ok === false && invalidBlockers.includes('LOOKUP_TYPE_INVALID'),
  invalidBlockers,
);

const failures = checks.filter((entry) => !entry.passed);
const report = {
  phase: '39-0F8.5',
  repository: 'chrykoolaid/invyra-scanops',
  baseline: 'e03022a4b1c8a731220c5dfcbe01872e2195b195',
  passed: failures.length === 0,
  totalChecks: checks.length,
  passedChecks: checks.length - failures.length,
  failedChecks: failures.length,
  readiness: failures.length === 0
    ? 'SCANOPS_LIVE_CANONICAL_ID_ROUTING_READY'
    : 'FAIL',
  humanAcceptancePassed: false,
  receivingIntegrationAuthorized: false,
  liveAuthorized: false,
  productionAuthorized: false,
  tests: checks,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
console.log('\nSCANOPS_LIVE_CANONICAL_ID_ROUTING_READY');
