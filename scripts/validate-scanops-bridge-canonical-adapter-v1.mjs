#!/usr/bin/env node
/**
 * validate-scanops-bridge-canonical-adapter-v1.mjs — Phase 34-E-S
 *
 * Validates the pure canonical transport adapter foundation:
 *  - prerequisite canonical contract hash
 *  - envelope builder positive + negative tests
 *  - receipt validator positive + negative tests
 *  - golden fixture hash drift lock
 *  - safety: no fetch/dispatch/queue/persistence/mutation
 *
 * Contract-only. Performs no transport, dispatch, persistence, queue, or
 * mutation work.
 *
 * Usage:
 *   node scripts/validate-scanops-bridge-canonical-adapter-v1.mjs
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');

const contractModulePath = join(repoRoot, 'src/inventory-bridge/canonicalContract/v1/bridgeContractV1.js');
const canonicalizeModulePath = join(repoRoot, 'src/inventory-bridge/canonicalContract/v1/canonicalizeBridgeContractV1.js');
const builderModulePath = join(repoRoot, 'src/inventory-bridge/canonicalAdapter/v1/buildCanonicalEnvelopeV1.js');
const receiptModulePath = join(repoRoot, 'src/inventory-bridge/canonicalAdapter/v1/validateCanonicalReceiptV1.js');
const envelopeFixturePath = join(repoRoot, 'src/inventory-bridge/canonicalAdapter/v1/fixtures/healthEnvelopeV1.json');
const receiptFixturePath = join(repoRoot, 'src/inventory-bridge/canonicalAdapter/v1/fixtures/healthReceiptV1.json');

const { computeBridgeContractV1SemanticHash } = await import(canonicalizeModulePath);
const { buildCanonicalEnvelopeV1 } = await import(builderModulePath);
const { validateCanonicalReceiptV1 } = await import(receiptModulePath);

const envelopeFixture = JSON.parse(readFileSync(envelopeFixturePath, 'utf8'));
const receiptFixture = JSON.parse(readFileSync(receiptFixturePath, 'utf8'));

const EXPECTED_CONTRACT_HASH = '9a7718a37f66236d0c0e9873cade6745c83f3a56cf41d969edf8ef9359eee5f5';
const EXPECTED_ENVELOPE_HASH = '50c8098e8ec84b63b49e307c648e691c2b3aba41f015614edd3a5f4c9a0f4a81';
const EXPECTED_RECEIPT_HASH = 'c5fdfbe7f0b990e9b312ba669a35fab411539c6cdafd8bd808bc0a7be906d192';

function sortKeysDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value && typeof value === 'object') {
    const result = {};
    for (const key of Object.keys(value).sort()) {
      result[key] = sortKeysDeep(value[key]);
    }
    return result;
  }
  return value;
}

function semanticHash(obj) {
  return createHash('sha256').update(JSON.stringify(sortKeysDeep(obj)), 'utf8').digest('hex');
}

const checks = [];
function check(name, passed, detail = '') {
  checks.push({ name, passed: passed === true, detail });
}

// --- Prerequisite: canonical contract hash ---
const contractHash = computeBridgeContractV1SemanticHash();
check('prerequisite_contract_hash_matches', contractHash === EXPECTED_CONTRACT_HASH, contractHash);

// --- Golden fixture hashes (computed, not copied) ---
const computedEnvelopeFixtureHash = semanticHash(envelopeFixture);
check('envelope_fixture_hash_matches', computedEnvelopeFixtureHash === EXPECTED_ENVELOPE_HASH, computedEnvelopeFixtureHash);
const computedReceiptFixtureHash = semanticHash(receiptFixture);
check('receipt_fixture_hash_matches', computedReceiptFixtureHash === EXPECTED_RECEIPT_HASH, computedReceiptFixtureHash);

// --- Envelope builder positive ---
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
  target: {
    inventoryInstanceId: 'inventory-instance-001',
  },
  payload: {
    requestType: 'BRIDGE_HEALTH',
    clientTime: '2026-07-17T12:00:00.000Z',
  },
};

const built = buildCanonicalEnvelopeV1(healthInput);
check('builder_positive_ok', built.ok === true);
check('builder_positive_contract_id', built.envelope.contractId === 'invyra.scanops.inventory-bridge');
check('builder_positive_schema_version', built.envelope.schemaVersion === '1.0.0');
check('builder_positive_source_system_scanops', built.envelope.source.system === 'SCANOPS');
check('builder_positive_target_system_inventory', built.envelope.target.system === 'INVENTORY');
check('builder_positive_envelope_frozen', Object.isFrozen(built.envelope));
check('builder_positive_envelope_matches_fixture', semanticHash(built.envelope) === EXPECTED_ENVELOPE_HASH);
check('builder_positive_no_dispatch', built.dispatchAttempted === false);
check('builder_positive_no_queue', built.queueWriteAttempted === false);
check('builder_positive_no_persistence', built.persistenceAttempted === false);
check('builder_positive_no_inventory_mutation', built.inventoryMutationAttempted === false);
check('builder_positive_no_scanops_mutation', built.scanOpsMutationAttempted === false);

// --- Envelope builder negative tests ---
function expectEnvelopeError(name, input) {
  const result = buildCanonicalEnvelopeV1(input);
  check(name, result.ok === false && result.errors.length > 0 && result.envelope === null);
}

const baseValid = {
  envelopeId: 'env:test:count:000001',
  idempotencyKey: 'idem:test:count:000001',
  traceId: 'trace:test:count:000001',
  operationType: 'COUNT_SUBMISSION',
  occurredAt: '2026-07-17T12:00:00.000Z',
  environment: 'TEST',
  operatorId: 'operator-001',
  source: {
    deviceId: 'scanops-device-001',
    storeId: 'store-001',
    sessionId: 'session-001',
  },
  target: {
    inventoryInstanceId: 'inventory-instance-001',
  },
  payload: { count: 5 },
};

expectEnvelopeError('neg_missing_envelope_id', { ...baseValid, envelopeId: undefined });
expectEnvelopeError('neg_missing_idempotency_key', { ...baseValid, idempotencyKey: undefined });
expectEnvelopeError('neg_missing_trace_id', { ...baseValid, traceId: undefined });
expectEnvelopeError('neg_missing_timestamp', { ...baseValid, occurredAt: undefined });
expectEnvelopeError('neg_invalid_timestamp', { ...baseValid, occurredAt: '2026-07-17 12:00:00' });
expectEnvelopeError('neg_missing_environment', { ...baseValid, environment: undefined });
expectEnvelopeError('neg_unknown_environment', { ...baseValid, environment: 'UNKNOWN' });
expectEnvelopeError('neg_live_environment', { ...baseValid, environment: 'LIVE' });
expectEnvelopeError('neg_production_environment', { ...baseValid, environment: 'PRODUCTION' });
expectEnvelopeError('neg_unsupported_operation', { ...baseValid, operationType: 'SCAN_FINGERPRINT' });
expectEnvelopeError('neg_missing_device', { ...baseValid, source: { ...baseValid.source, deviceId: undefined } });
expectEnvelopeError('neg_placeholder_device', { ...baseValid, source: { ...baseValid.source, deviceId: 'scanops-device-local' } });
expectEnvelopeError('neg_missing_store', { ...baseValid, source: { ...baseValid.source, storeId: undefined } });
expectEnvelopeError('neg_placeholder_store', { ...baseValid, source: { ...baseValid.source, storeId: 'store-local' } });
expectEnvelopeError('neg_missing_session', { ...baseValid, source: { ...baseValid.source, sessionId: undefined } });
expectEnvelopeError('neg_placeholder_session', { ...baseValid, source: { ...baseValid.source, sessionId: 'session-local' } });
expectEnvelopeError('neg_missing_operator_for_count', { ...baseValid, operatorId: undefined });
expectEnvelopeError('neg_missing_inventory_instance', { ...baseValid, target: { ...baseValid.target, inventoryInstanceId: undefined } });
expectEnvelopeError('neg_placeholder_inventory_instance', { ...baseValid, target: { ...baseValid.target, inventoryInstanceId: 'inventory-desktop-local' } });
expectEnvelopeError('neg_non_object_payload', { ...baseValid, payload: 'not-an-object' });

// Health ping without operator passes
const healthNoOperator = buildCanonicalEnvelopeV1({
  ...healthInput,
});
check('neg_health_ping_without_operator_passes', healthNoOperator.ok === true);

// No identifier silently defaulted: building with empty source object should fail
expectEnvelopeError('neg_no_silent_default_device', { ...baseValid, source: {} });

// --- Receipt validator positive ---
const validated = validateCanonicalReceiptV1(receiptFixture, built.envelope);
check('receipt_positive_valid', validated.valid === true);
check('receipt_positive_correlated', validated.correlated === true);
check('receipt_positive_admission', validated.admissionStatus === 'ACCEPTED');
check('receipt_positive_application', validated.applicationStatus === 'NOT_APPLICABLE');
check('receipt_positive_result_frozen', Object.isFrozen(validated));
check('receipt_positive_no_inventory_mutation', validated.inventoryMutationAttempted === false);
check('receipt_positive_no_scanops_mutation', validated.scanOpsMutationAttempted === false);
check('receipt_positive_no_persistence', validated.persistenceAttempted === false);
check('receipt_positive_no_dispatch', validated.dispatchAttempted === false);
check('receipt_positive_no_queue', validated.queueWriteAttempted === false);
check('receipt_positive_normalized_frozen', Object.isFrozen(validated.normalizedReceipt));
check('receipt_positive_normalized_hash', semanticHash(validated.normalizedReceipt) === EXPECTED_RECEIPT_HASH);

// --- Receipt validator negative tests ---
function expectReceiptInvalid(name, receipt, envelope = built.envelope) {
  const result = validateCanonicalReceiptV1(receipt, envelope);
  check(name, result.valid === false);
}

const baseReceipt = { ...receiptFixture };

expectReceiptInvalid('neg_receipt_missing', null);
expectReceiptInvalid('neg_receipt_wrong_contract_id', { ...baseReceipt, contractId: 'wrong.contract' });
expectReceiptInvalid('neg_receipt_wrong_major_schema', { ...baseReceipt, schemaVersion: '2.0.0' });
expectReceiptInvalid('neg_receipt_missing_receipt_id', { ...baseReceipt, receiptId: undefined });
expectReceiptInvalid('neg_receipt_unknown_admission', { ...baseReceipt, admissionStatus: 'WEIRD' });
expectReceiptInvalid('neg_receipt_unknown_application', { ...baseReceipt, applicationStatus: 'WEIRD' });
expectReceiptInvalid('neg_receipt_envelope_id_mismatch', { ...baseReceipt, envelopeId: 'env:other' });
expectReceiptInvalid('neg_receipt_idempotency_mismatch', { ...baseReceipt, idempotencyKey: 'idem:other' });
expectReceiptInvalid('neg_receipt_trace_mismatch', { ...baseReceipt, traceId: 'trace:other' });
expectReceiptInvalid('neg_receipt_operation_mismatch', { ...baseReceipt, operationType: 'COUNT_SUBMISSION' });
expectReceiptInvalid('neg_receipt_environment_mismatch', { ...baseReceipt, environment: 'TRAINING' });
expectReceiptInvalid('neg_receipt_inventory_instance_mismatch', { ...baseReceipt, inventoryInstanceId: 'inventory-instance-999' });
expectReceiptInvalid('neg_receipt_invalid_timestamp', { ...baseReceipt, receivedAt: '2026-07-17 12:00:01' });
expectReceiptInvalid('neg_receipt_invalid_errors_array', { ...baseReceipt, errors: 'not-array' });
expectReceiptInvalid('neg_receipt_invalid_error_object', { ...baseReceipt, errors: [{ code: 'BAD', message: 'x' }] });
expectReceiptInvalid('neg_receipt_live', { ...baseReceipt, environment: 'LIVE' });
expectReceiptInvalid('neg_receipt_production', { ...baseReceipt, environment: 'PRODUCTION' });

// Business operation ACCEPTED + NOT_APPLICABLE rejected
const businessReceipt = {
  ...baseReceipt,
  receiptId: 'receipt:test:count:000001',
  envelopeId: 'env:test:count:000001',
  idempotencyKey: 'idem:test:count:000001',
  traceId: 'trace:test:count:000001',
  operationType: 'COUNT_SUBMISSION',
  admissionStatus: 'ACCEPTED',
  applicationStatus: 'NOT_APPLICABLE',
};
const businessEnvelope = buildCanonicalEnvelopeV1(baseValid);
const businessValidation = validateCanonicalReceiptV1(businessReceipt, businessEnvelope.envelope);
check('neg_receipt_business_accepted_not_applicable_rejected', businessValidation.valid === false);

// --- Safety: source scans ---
const builderSrc = readFileSync(builderModulePath, 'utf8');
const receiptSrc = readFileSync(receiptModulePath, 'utf8');
check('no_fetch_in_builder', !/\bfetch\(/.test(builderSrc) && !/\bfetch\(/.test(receiptSrc));
check('no_dispatch_adapter_in_builder', !/createScanOpsBridgeTransportClient/.test(builderSrc) && !/httpDispatchAdapter/.test(builderSrc));
check('no_queue_write_in_builder', !/offlineSyncQueue/.test(builderSrc) && !/localStorage/.test(builderSrc) && !/indexedDB/.test(builderSrc));
check('no_base44_entity_in_builder', !/base44\.entities/.test(builderSrc) && !/base44\.entities/.test(receiptSrc));
check('no_mutation_in_receipt_validator', !/\.create\(/.test(receiptSrc) || receiptSrc.includes('makeError'));
check('no_retry_in_builder', !/setTimeout/.test(builderSrc) && !/setInterval/.test(builderSrc));
check('import_authority_from_contract', /from '\.\.\/\.\.\/canonicalContract\/v1\/bridgeContractV1\.js'/.test(builderSrc) && /from '\.\.\/\.\.\/canonicalContract\/v1\/bridgeContractV1\.js'/.test(receiptSrc));
check('no_duplicate_operation_list_in_builder', !/\[ ['"]LOOKUP_REQUEST['"],/.test(builderSrc));

// Final tally
const passed = checks.every((c) => c.passed);
const checksPassed = checks.filter((c) => c.passed).length;
const checksFailed = checks.filter((c) => !c.passed).length;

console.log(JSON.stringify({
  phase: '34-E-S',
  passed,
  checksPassed,
  checksFailed,
  totalChecks: checks.length,
  canonicalContractHash: contractHash,
  goldenEnvelopeHash: computedEnvelopeFixtureHash,
  goldenReceiptHash: computedReceiptFixtureHash,
  builderPositive: { ok: built.ok, envelopeHash: built.ok ? semanticHash(built.envelope) : null },
  receiptCorrelationPositive: { valid: validated.valid, correlated: validated.correlated },
  checks,
}, null, 2));

process.exit(passed ? 0 : 1);