#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { detectLookupType } from '../src/components/scanner/itemLookup/itemLookupHelpers.js';
import { createScanOpsItemLookupClientV1 } from '../src/inventory-bridge/itemLookup/v1/scanOpsItemLookupClientV1.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const checks = [];
function check(name, condition, detail = '') {
  checks.push({ name, passed: condition === true, detail });
}

const scan = read('src/pages/Scan.jsx');
const helperSource = read('src/components/scanner/itemLookup/itemLookupHelpers.js');
const clientSource = read('src/inventory-bridge/itemLookup/v1/scanOpsItemLookupClientV1.js');
const receiptSource = read('src/inventory-bridge/itemLookup/v1/validateScanOpsItemLookupReceiptV1.js');
const acceptance = JSON.parse(read('evidence/phase39-0f8-4-canonical-id-lookup-acceptance.template.json'));

const canonicalItemId = '6a2837ecb8270c9119eeebae';
const zeroMutations = Object.freeze({
  inventory: 0,
  stock: 0,
  ledger: 0,
  item_master: 0,
  pricing: 0,
  purchase_order: 0,
  receiving: 0,
});
const dispatched = [];

function responseFor(envelope) {
  const value = envelope.payload.lookupValue;
  const found = value === canonicalItemId;
  const timestamp = '2026-08-03T11:40:00.000Z';
  return new Response(JSON.stringify({
    contractId: envelope.contractId,
    schemaVersion: envelope.schemaVersion,
    receiptId: `receipt:canonical-id:${envelope.envelopeId}`,
    envelopeId: envelope.envelopeId,
    idempotencyKey: envelope.idempotencyKey,
    traceId: envelope.traceId,
    admissionStatus: 'ACCEPTED',
    applicationStatus: 'NOT_APPLICABLE',
    receivedAt: timestamp,
    processedAt: timestamp,
    inventoryInstanceId: envelope.target.inventoryInstanceId,
    environment: envelope.environment,
    operationType: 'LOOKUP_REQUEST',
    message: found
      ? 'Inventory completed the authoritative read-only item lookup.'
      : 'Inventory completed the authoritative read-only lookup and returned ITEM_NOT_FOUND.',
    errors: [],
    warnings: [],
    result: {
      found,
      code: found ? 'ITEM_FOUND' : 'ITEM_NOT_FOUND',
      lookupType: 'CANONICAL_ID',
      lookupValue: value,
      item: found ? {
        canonicalItemId,
        sku: 'CHM-LIVE-001',
        itemName: 'Detergent 5L',
        primaryBarcode: '',
        lifecycleStatus: 'ACTIVE',
        batchTracked: false,
        expiryTracked: false,
      } : null,
      mutationCounts: zeroMutations,
    },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

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

const common = {
  deviceId: 'SCANOPS-CANONICAL-ID-TEST',
  storeId: 'STORE-TEST-001',
  sessionId: 'SESSION-CANONICAL-ID-TEST',
  operatorId: 'staff-canonical-id-test',
  inventoryInstanceId: 'inventory-test-001',
  trustReference: 'a'.repeat(64),
  occurredAt: '2026-08-03T11:40:00.000Z',
};

check('canonical_id_is_not_misclassified_as_sku',
  detectLookupType(canonicalItemId) === 'CANONICAL_ID'
    && detectLookupType('CHM-LIVE-001') === 'SKU'
    && detectLookupType('9300000000501') === 'BARCODE'
    && detectLookupType('det') === 'NAME',
  'itemLookupHelpers.js');

const built = client.buildLookupEnvelope({
  ...common,
  envelopeId: 'env:canonical-id:build',
  idempotencyKey: 'idem:canonical-id:build',
  traceId: 'trace:canonical-id:build',
  lookupType: 'CANONICAL_ID',
  lookupValue: canonicalItemId,
});
check('canonical_id_builds_exact_lookup_envelope',
  built.ok === true
    && built.buildResult.envelope.operationType === 'LOOKUP_REQUEST'
    && built.buildResult.envelope.payload.lookupType === 'CANONICAL_ID'
    && built.buildResult.envelope.payload.lookupValue === canonicalItemId,
  built);

const found = await client.sendItemLookup({
  ...common,
  envelopeId: 'env:canonical-id:found',
  idempotencyKey: 'idem:canonical-id:found',
  traceId: 'trace:canonical-id:found',
  lookupType: 'CANONICAL_ID',
  lookupValue: canonicalItemId,
});
check('canonical_id_receipt_is_accepted_and_correlated',
  found.ok === true
    && found.status === 'FOUND'
    && found.correlated === true
    && found.receiptValid === true
    && found.result.lookupType === 'CANONICAL_ID'
    && found.result.lookupValue === canonicalItemId
    && found.result.item.canonicalItemId === canonicalItemId
    && found.result.item.sku === 'CHM-LIVE-001'
    && Object.values(found.result.mutationCounts).every((value) => value === 0),
  found);

const missingId = 'ffffffffffffffffffffffff';
const missing = await client.sendItemLookup({
  ...common,
  envelopeId: 'env:canonical-id:missing',
  idempotencyKey: 'idem:canonical-id:missing',
  traceId: 'trace:canonical-id:missing',
  lookupType: 'CANONICAL_ID',
  lookupValue: missingId,
});
check('unknown_canonical_id_returns_explicit_not_found',
  missing.ok === true
    && missing.status === 'ITEM_NOT_FOUND'
    && missing.result.found === false
    && missing.result.code === 'ITEM_NOT_FOUND'
    && missing.result.item === null,
  missing);

const invalid = client.buildLookupEnvelope({
  ...common,
  lookupType: 'SELL_ID_GUESS',
  lookupValue: canonicalItemId,
});
check('unknown_lookup_type_remains_blocked_before_dispatch',
  invalid.ok === false
    && invalid.gate.blockers.includes('LOOKUP_TYPE_INVALID'),
  invalid);

const runLookupBlock = scan.slice(
  scan.indexOf('const runLookup'),
  scan.indexOf('const runNameSearch'),
);
check('canonical_id_exact_result_never_auto_opens',
  runLookupBlock.includes('runLiveItemLookup')
    && runLookupBlock.includes('setLookup')
    && !runLookupBlock.includes('runLiveItemView')
    && scan.includes('Open operational item view')
    && scan.includes('Explicit operator action required'),
  runLookupBlock);

check('scanops_sources_share_canonical_id_contract',
  helperSource.includes('return "CANONICAL_ID"')
    && clientSource.includes("'BARCODE',\n  'SKU',\n  'CANONICAL_ID'")
    && clientSource.includes('SCANOPS_EXACT_LOOKUP_TYPES_V1.includes(lookupType)')
    && receiptSource.includes("['BARCODE', 'SKU', 'CANONICAL_ID']")
    && receiptSource.includes('EXACT_LOOKUP_TYPES.includes(result.lookupType)'),
  'ScanOps exact lookup sources');

check('no_retry_queue_persistence_or_mutation_added',
  dispatched.length === 2
    && dispatched.every((envelope) => envelope.payload.lookupType === 'CANONICAL_ID')
    && !scan.includes('localStorage')
    && !clientSource.includes('queue.push')
    && clientSource.includes('persistenceAttempted: false')
    && clientSource.includes('queueWriteAttempted: false')
    && client.getDiagnostics().receivingIntegrationAuthorized === false,
  { dispatched, diagnostics: client.getDiagnostics() });

check('acceptance_template_is_pinned_and_incomplete',
  acceptance.phase === '39-0F8.4'
    && acceptance.status === 'INCOMPLETE'
    && acceptance.environment === 'TRAINING'
    && acceptance.baselines.inventory === '2efd675623f3933ee24ff5f18115b7f15dfde7f1'
    && acceptance.baselines.scanOps === '73a8844354306a889c840802b0728adef83b7cea'
    && acceptance.canonicalIdLookup.input === canonicalItemId
    && acceptance.canonicalIdLookup.lookupType === 'CANONICAL_ID'
    && acceptance.canonicalIdLookup.openedAutomatically === false
    && acceptance.validation.passed === false,
  acceptance);

check('safety_flags_remain_closed',
  acceptance.safety.liveEnabled === false
    && acceptance.safety.productionEnabled === false
    && acceptance.safety.automaticOpenAdded === false
    && acceptance.safety.automaticFallbackAdded === false
    && acceptance.safety.automaticRetryAdded === false
    && acceptance.safety.queueWriteAdded === false
    && acceptance.safety.persistenceAdded === false
    && acceptance.safety.receivingIntegrationAuthorized === false,
  acceptance.safety);

const failures = checks.filter((entry) => !entry.passed);
const report = {
  phase: '39-0F8.4',
  repository: 'chrykoolaid/invyra-scanops',
  inventoryBaseline: '2efd675623f3933ee24ff5f18115b7f15dfde7f1',
  scanOpsBaseline: '73a8844354306a889c840802b0728adef83b7cea',
  passed: failures.length === 0,
  totalChecks: checks.length,
  passedChecks: checks.length - failures.length,
  failedChecks: failures.length,
  readiness: failures.length === 0
    ? 'SCANOPS_CANONICAL_ID_LOOKUP_READY'
    : 'FAIL',
  humanAcceptancePassed: false,
  receivingIntegrationAuthorized: false,
  liveAuthorized: false,
  productionAuthorized: false,
  tests: checks,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
console.log('\nSCANOPS_CANONICAL_ID_LOOKUP_READY');
