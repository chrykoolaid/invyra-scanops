#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRIDGE_CONTRACT_V1 } from '../src/inventory-bridge/canonicalContract/v1/bridgeContractV1.js';
import {
  canonicalizeBridgeContractV1,
  computeBridgeContractV1SemanticHash,
} from '../src/inventory-bridge/canonicalContract/v1/canonicalizeBridgeContractV1.js';
import {
  buildCanonicalEnvelopeV1,
  validateCanonicalReceiptV1,
} from '../src/inventory-bridge/canonicalAdapter/v1/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envelopeFixture = JSON.parse(readFileSync(
  join(root, 'src/inventory-bridge/canonicalAdapter/v1/fixtures/healthEnvelopeV1.json'),
  'utf8',
));
const receiptFixture = JSON.parse(readFileSync(
  join(root, 'src/inventory-bridge/canonicalAdapter/v1/fixtures/healthReceiptV1.json'),
  'utf8',
));
const EXPECTED = Object.freeze({
  contract: '9a7718a37f66236d0c0e9873cade6745c83f3a56cf41d969edf8ef9359eee5f5',
  envelope: '50c8098e8ec84b63b49e307c648e691c2b3aba41f015614edd3a5f4c9a0f4a81',
  receipt: 'c5fdfbe7f0b990e9b312ba669a35fab411539c6cdafd8bd808bc0a7be906d192',
});
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

check(
  'contract_hash',
  computeBridgeContractV1SemanticHash() === EXPECTED.contract,
  computeBridgeContractV1SemanticHash(),
);
check('envelope_hash', hash(envelopeFixture) === EXPECTED.envelope, hash(envelopeFixture));
check('receipt_hash', hash(receiptFixture) === EXPECTED.receipt, hash(receiptFixture));

const healthInput = {
  envelopeId: 'env:test:health:000001',
  idempotencyKey: 'idem:test:health:000001',
  traceId: 'trace:test:health:000001',
  operationType: 'DEVICE_HEALTH_PING',
  occurredAt: '2026-07-17T12:00:00.000Z',
  environment: 'TEST',
  source: {
    deviceId: 'scanops-device-001',
    storeId: 'store-001',
    sessionId: 'session-001',
  },
  target: { inventoryInstanceId: 'inventory-instance-001' },
  payload: {
    requestType: 'BRIDGE_HEALTH',
    clientTime: '2026-07-17T12:00:00.000Z',
  },
};

const healthBuilt = buildCanonicalEnvelopeV1(healthInput);
check('health_builds', healthBuilt.ok === true);
check('health_hash', hash(healthBuilt.envelope) === EXPECTED.envelope);
check(
  'health_operator_omitted',
  !Object.prototype.hasOwnProperty.call(healthBuilt.envelope.source, 'operatorId'),
);
check(
  'builder_flags',
  healthBuilt.dispatchAttempted === false
    && healthBuilt.envelopeSendAllowed === false
    && healthBuilt.queueWriteAttempted === false
    && healthBuilt.persistenceAttempted === false
    && healthBuilt.inventoryMutationAttempted === false
    && healthBuilt.scanOpsMutationAttempted === false,
);

const businessInput = {
  envelopeId: 'env:test:count:000001',
  idempotencyKey: 'idem:test:count:000001',
  traceId: 'trace:test:count:000001',
  operationType: 'COUNT_SUBMISSION',
  occurredAt: '2026-07-17T12:00:00.000Z',
  environment: 'TEST',
  source: {
    deviceId: 'scanops-device-001',
    storeId: 'store-001',
    sessionId: 'session-001',
    operatorId: 'operator-001',
  },
  target: { inventoryInstanceId: 'inventory-instance-001' },
  payload: { count: 5, nested: { value: 1 } },
};

const businessBuilt = buildCanonicalEnvelopeV1(businessInput);
check('business_builds', businessBuilt.ok === true);
check(
  'operator_inside_source',
  businessBuilt.envelope.source.operatorId === 'operator-001'
    && businessBuilt.metadata.operatorIdIncludedInEnvelope === true,
);
check(
  'no_operator_sidecar',
  !Object.prototype.hasOwnProperty.call(businessBuilt.metadata, 'operatorId'),
);

const originalNested = businessInput.payload.nested;
originalNested.value = 99;
check('payload_deep_cloned', businessBuilt.envelope.payload.nested.value === 1);
check('payload_deep_frozen', Object.isFrozen(businessBuilt.envelope.payload.nested));

function expectBuilderError(name, input) {
  const result = buildCanonicalEnvelopeV1(input);
  check(
    name,
    result.ok === false && result.envelope === null && result.errors.length > 0,
  );
  return result;
}

expectBuilderError('top_level_operator_rejected', {
  ...businessInput,
  operatorId: 'operator-001',
});
expectBuilderError('business_missing_operator', {
  ...businessInput,
  source: { ...businessInput.source, operatorId: undefined },
});

for (const placeholder of BRIDGE_CONTRACT_V1.envelope.placeholderIdsRejected) {
  expectBuilderError(`health_placeholder_operator_${placeholder}`, {
    ...healthInput,
    source: { ...healthInput.source, operatorId: placeholder },
  });
}

for (const [field, value] of [
  ['envelopeId', '   '],
  ['idempotencyKey', 123],
  ['traceId', {}],
]) {
  expectBuilderError(`invalid_${field}`, { ...businessInput, [field]: value });
}

expectBuilderError('invalid_device_type', {
  ...businessInput,
  source: { ...businessInput.source, deviceId: 123 },
});
expectBuilderError('invalid_store_whitespace', {
  ...businessInput,
  source: { ...businessInput.source, storeId: '   ' },
});
expectBuilderError('invalid_session_type', {
  ...businessInput,
  source: { ...businessInput.source, sessionId: [] },
});
expectBuilderError('invalid_operator_type', {
  ...businessInput,
  source: { ...businessInput.source, operatorId: 456 },
});
expectBuilderError('invalid_inventory_type', {
  ...businessInput,
  target: { inventoryInstanceId: true },
});
expectBuilderError('invalid_calendar_timestamp', {
  ...businessInput,
  occurredAt: '2026-99-99T99:99:99Z',
});
expectBuilderError('live_blocked', { ...businessInput, environment: 'LIVE' });
expectBuilderError('production_blocked', {
  ...businessInput,
  environment: 'PRODUCTION',
});
expectBuilderError('payload_non_object', { ...businessInput, payload: 'bad' });

const receiptPositive = validateCanonicalReceiptV1(
  receiptFixture,
  healthBuilt.envelope,
);
check('receipt_positive', receiptPositive.valid && receiptPositive.correlated);
check(
  'receipt_hash_normalized',
  hash(receiptPositive.normalizedReceipt) === EXPECTED.receipt,
);
check(
  'receipt_flags',
  !receiptPositive.inventoryMutationAttempted
    && !receiptPositive.scanOpsMutationAttempted
    && !receiptPositive.persistenceAttempted
    && !receiptPositive.dispatchAttempted
    && !receiptPositive.queueWriteAttempted,
);

function expectReceiptInvalid(name, receipt, envelope = healthBuilt.envelope) {
  let result;
  let threw = false;
  try {
    result = validateCanonicalReceiptV1(receipt, envelope);
  } catch (error) {
    threw = true;
    result = error;
  }
  check(name, !threw && result.valid === false);
  return result;
}

expectReceiptInvalid(
  'malformed_envelope_rejected_without_throw',
  receiptFixture,
  {},
);
expectReceiptInvalid('invalid_calendar_received', {
  ...receiptFixture,
  receivedAt: '2026-99-99T99:99:99Z',
});
expectReceiptInvalid('invalid_calendar_processed', {
  ...receiptFixture,
  processedAt: '2026-02-31T12:00:00Z',
});
expectReceiptInvalid('health_accepted_applied', {
  ...receiptFixture,
  applicationStatus: 'APPLIED',
});
expectReceiptInvalid('rejected_applied', {
  ...receiptFixture,
  admissionStatus: 'REJECTED',
  applicationStatus: 'APPLIED',
});
expectReceiptInvalid('service_unavailable_applied', {
  ...receiptFixture,
  admissionStatus: 'SERVICE_UNAVAILABLE',
  applicationStatus: 'APPLIED',
});
expectReceiptInvalid(
  'business_accepted_not_applicable',
  {
    ...receiptFixture,
    receiptId: 'receipt:test:count:000001',
    envelopeId: businessBuilt.envelope.envelopeId,
    idempotencyKey: businessBuilt.envelope.idempotencyKey,
    traceId: businessBuilt.envelope.traceId,
    operationType: businessBuilt.envelope.operationType,
    inventoryInstanceId: businessBuilt.envelope.target.inventoryInstanceId,
    applicationStatus: 'NOT_APPLICABLE',
  },
  businessBuilt.envelope,
);
expectReceiptInvalid('wrong_contract', {
  ...receiptFixture,
  contractId: 'wrong',
});
expectReceiptInvalid('wrong_schema', {
  ...receiptFixture,
  schemaVersion: '2.0.0',
});
expectReceiptInvalid('unknown_admission', {
  ...receiptFixture,
  admissionStatus: 'WEIRD',
});
expectReceiptInvalid('unknown_application', {
  ...receiptFixture,
  applicationStatus: 'WEIRD',
});
expectReceiptInvalid('invalid_error_object', {
  ...receiptFixture,
  errors: [{ code: 'BAD', message: 'x' }],
});
expectReceiptInvalid('live_receipt', {
  ...receiptFixture,
  environment: 'LIVE',
});
expectReceiptInvalid('correlation_mismatch', {
  ...receiptFixture,
  traceId: 'other',
});

const nestedReceipt = clone(receiptFixture);
nestedReceipt.warnings = [{ detail: { value: 1 } }];
const nestedResult = validateCanonicalReceiptV1(
  nestedReceipt,
  healthBuilt.envelope,
);
nestedReceipt.warnings[0].detail.value = 999;
check(
  'normalized_receipt_deep_cloned',
  nestedResult.normalizedReceipt.warnings[0].detail.value === 1,
);
check(
  'normalized_receipt_deep_frozen',
  Object.isFrozen(nestedResult.normalizedReceipt.warnings[0].detail),
);

const builderSrc = readFileSync(
  join(root, 'src/inventory-bridge/canonicalAdapter/v1/buildCanonicalEnvelopeV1.js'),
  'utf8',
);
const receiptSrc = readFileSync(
  join(root, 'src/inventory-bridge/canonicalAdapter/v1/validateCanonicalReceiptV1.js'),
  'utf8',
);
const forbidden = [
  /\bfetch\s*\(/,
  /createScanOpsBridgeTransportClient/,
  /httpDispatchAdapter/,
  /offlineSyncQueue/,
  /\blocalStorage\b/,
  /\bindexedDB\b/,
  /base44\.entities/,
  /\.create\s*\(/,
  /\.update\s*\(/,
  /\.delete\s*\(/,
  /setTimeout\s*\(/,
  /setInterval\s*\(/,
];
check(
  'source_no_side_effects',
  [builderSrc, receiptSrc].every(
    (source) => forbidden.every((pattern) => !pattern.test(source)),
  ),
);
check(
  'single_contract_import',
  /canonicalContract\/v1\/bridgeContractV1\.js/.test(builderSrc)
    && /canonicalContract\/v1\/bridgeContractV1\.js/.test(receiptSrc),
);
check(
  'no_duplicate_operation_array',
  !builderSrc.includes("['LOOKUP_REQUEST'")
    && !receiptSrc.includes("['LOOKUP_REQUEST'"),
);

const failed = checks.filter((item) => !item.passed);
console.log(JSON.stringify({
  phase: '34-E-S-correction',
  passed: failed.length === 0,
  totalChecks: checks.length,
  checksPassed: checks.length - failed.length,
  checksFailed: failed.length,
  hashes: {
    contract: computeBridgeContractV1SemanticHash(),
    envelope: hash(envelopeFixture),
    receipt: hash(receiptFixture),
  },
  failed,
}, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
