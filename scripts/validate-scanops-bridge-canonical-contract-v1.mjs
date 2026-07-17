#!/usr/bin/env node
/**
 * validate-scanops-bridge-canonical-contract-v1.mjs — Phase 34-D-S
 *
 * Deterministic validator for the ScanOps canonical Bridge Contract v1.
 * Contract-only: performs no dispatch, fetch, queue write, persistence,
 * or mutation. Prints contractId, schemaVersion, and semanticHash.
 *
 * Usage:
 *   node scripts/validate-scanops-bridge-canonical-contract-v1.mjs
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
const schemaPath = join(repoRoot, 'src/inventory-bridge/canonicalContract/v1/bridgeContractV1.schema.json');

const { CANONICAL_CONTRACT, getBridgeContractV1 } = await import(contractModulePath);
const { canonicalizeBridgeContractV1, computeBridgeContractV1SemanticHash } = await import(canonicalizeModulePath);

const schemaJson = JSON.parse(readFileSync(schemaPath, 'utf8'));

function check(name, passed, detail = '') {
  return { name, passed: passed === true, detail };
}

function arraysEqual(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);
}

const expectedOperationTypes = [
  'LOOKUP_REQUEST',
  'COUNT_SUBMISSION',
  'RECEIVING_SUBMISSION',
  'TRANSFER_SUBMISSION',
  'WASTE_SUBMISSION',
  'MARKDOWN_SUBMISSION',
  'EXPIRY_SUBMISSION',
  'MOVEMENT_NOTE',
  'DEVICE_HEALTH_PING',
];

const expectedEnvironments = ['TRAINING', 'TEST', 'LIVE', 'PRODUCTION'];
const expectedRuntimeEnvironments = ['TRAINING', 'TEST'];
const expectedAdmission = ['ACCEPTED', 'REJECTED', 'DUPLICATE', 'UNSUPPORTED', 'SERVICE_UNAVAILABLE'];
const expectedApplication = [
  'NOT_APPLICABLE',
  'STAGED',
  'VALIDATION_FAILED',
  'NEEDS_REVIEW',
  'APPROVED',
  'APPLYING',
  'APPLIED',
  'APPLICATION_FAILED',
  'CANCELLED',
  'DEAD_LETTER',
];
const expectedEnvelopeFields = [
  'contractId', 'schemaVersion', 'envelopeId', 'idempotencyKey', 'traceId',
  'operationType', 'occurredAt', 'environment', 'source', 'target', 'payload',
];
const expectedSourceFields = ['system', 'deviceId', 'storeId', 'sessionId'];
const expectedTargetFields = ['system', 'inventoryInstanceId'];
const expectedReceiptFields = [
  'contractId', 'schemaVersion', 'receiptId', 'envelopeId', 'idempotencyKey',
  'traceId', 'admissionStatus', 'applicationStatus', 'receivedAt', 'processedAt',
  'inventoryInstanceId', 'environment', 'operationType', 'message', 'errors', 'warnings',
];
const expectedErrorFields = ['code', 'message', 'field', 'retryable'];
const expectedErrorCodes = [
  'CONTRACT_ID_INVALID', 'SCHEMA_VERSION_INVALID', 'ENVIRONMENT_REQUIRED', 'ENVIRONMENT_INVALID',
  'ENVELOPE_ID_REQUIRED', 'IDEMPOTENCY_KEY_REQUIRED', 'TRACE_ID_REQUIRED', 'OPERATION_TYPE_INVALID',
  'TIMESTAMP_INVALID', 'SOURCE_SYSTEM_INVALID', 'SOURCE_DEVICE_REQUIRED', 'SOURCE_STORE_REQUIRED',
  'SOURCE_SESSION_REQUIRED', 'SOURCE_OPERATOR_REQUIRED', 'TARGET_SYSTEM_INVALID',
  'INVENTORY_INSTANCE_REQUIRED', 'PAYLOAD_INVALID', 'RUNTIME_DISABLED', 'DEVICE_NOT_TRUSTED',
  'STORE_NOT_ALLOWED', 'DUPLICATE_ENVELOPE', 'UNSUPPORTED_OPERATION', 'SERVICE_UNAVAILABLE',
];
const expectedPlaceholders = [
  'scanops-device-local', 'store-local', 'session-local',
  'inventory-desktop-local', 'invyra-inventory-desktop-local',
];
const expectedEndpoints = [
  { method: 'GET', path: '/api/bridge/v1/health', contentType: 'application/json' },
  { method: 'POST', path: '/api/bridge/v1/handoffs', contentType: 'application/json' },
  { method: 'GET', path: '/api/bridge/v1/receipts/{receiptId}', contentType: 'application/json' },
];

const checks = [];

// Contract identity
const contract = getBridgeContractV1();
checks.push(check('contract_id_locked', contract.contractId === 'invyra.scanops.inventory-bridge'));
checks.push(check('schema_version_locked', contract.schemaVersion === '1.0.0'));
checks.push(check('field_style_camel_case', contract.canonicalFieldStyle === 'camelCase'));

// Operation list + order
checks.push(check('operation_types_exact_order', arraysEqual([...contract.operationTypes], expectedOperationTypes)));
checks.push(check('operation_types_no_extras', contract.operationTypes.length === expectedOperationTypes.length));

// Envelope required fields
checks.push(check('envelope_required_fields', arraysEqual([...contract.envelope.requiredFields], expectedEnvelopeFields)));
checks.push(check('source_required_fields', arraysEqual([...contract.envelope.source.requiredFields], expectedSourceFields)));
checks.push(check('target_required_fields', arraysEqual([...contract.envelope.target.requiredFields], expectedTargetFields)));
checks.push(check('source_system_scanops', contract.envelope.source.systemValue === 'SCANOPS'));
checks.push(check('target_system_inventory', contract.envelope.target.systemValue === 'INVENTORY'));

// Operator exception for health ping
checks.push(check('operator_exception_health_ping', arraysEqual([...contract.envelope.source.operatorRequiredExceptOperations], ['DEVICE_HEALTH_PING'])));

// Environments
checks.push(check('environments_exact', arraysEqual([...contract.environments], expectedEnvironments)));
checks.push(check('runtime_environments_training_test', arraysEqual([...contract.runtimeAllowedEnvironments], expectedRuntimeEnvironments)));

// Receipt statuses
checks.push(check('admission_statuses_exact', arraysEqual([...contract.admissionStatuses], expectedAdmission)));
checks.push(check('application_statuses_exact', arraysEqual([...contract.applicationStatuses], expectedApplication)));
checks.push(check('receipt_required_fields', arraysEqual([...contract.receipt.requiredFields], expectedReceiptFields)));

// Error object
checks.push(check('error_fields', arraysEqual([...contract.error.fields], expectedErrorFields)));
checks.push(check('error_codes_exact_order', arraysEqual([...contract.error.codes], expectedErrorCodes)));
checks.push(check('error_code_upper_snake', contract.error.codes.every((c) => /^[A-Z][A-Z0-9_]*$/.test(c))));
checks.push(check('error_code_format', contract.error.codeFormat === 'UPPER_SNAKE_CASE'));

// Endpoints
checks.push(check('endpoint_descriptors', arraysEqual(
  contract.endpoints.map((e) => `${e.method} ${e.path} ${e.contentType}`),
  expectedEndpoints.map((e) => `${e.method} ${e.path} ${e.contentType}`),
)));

// Placeholder rejection
checks.push(check('placeholder_identifiers', arraysEqual([...contract.placeholderIdentifiers], expectedPlaceholders)));

// Fail-closed policy
const fc = contract.failClosedPolicy;
checks.push(check('fail_closed_empty_schema_denies', fc.emptyAcceptedSchemaListDenies === true));
checks.push(check('fail_closed_empty_operation_denies', fc.emptyAcceptedOperationListDenies === true));
checks.push(check('fail_closed_empty_trusted_device_denies', fc.emptyTrustedDeviceListDenies === true));
checks.push(check('fail_closed_empty_allowed_store_denies', fc.emptyAllowedStoreListDenies === true));
checks.push(check('fail_closed_missing_environment_denies', fc.missingEnvironmentDenies === true));
checks.push(check('fail_closed_missing_inventory_instance_denies', fc.missingInventoryInstanceDenies === true));
checks.push(check('fail_closed_major_version_mismatch_denies', fc.contractMajorVersionMismatchDenies === true));
checks.push(check('fail_closed_unknown_operation_denies', fc.unknownOperationDenies === true));

// Runtime boundaries remain disabled
const rb = contract.runtimeBoundaries;
checks.push(check('runtime_not_activated', rb.runtimeActivated === false));
checks.push(check('transport_not_activated', rb.transportActivated === false));
checks.push(check('auto_sync_disabled', rb.automaticSyncEnabled === false));
checks.push(check('outbox_disabled', rb.outboxProcessingEnabled === false));
checks.push(check('persistence_disabled', rb.persistenceEnabled === false));
checks.push(check('discovery_disabled', rb.discoveryEnabled === false));
checks.push(check('pairing_disabled', rb.pairingEnabled === false));
checks.push(check('auth_disabled', rb.authenticationEnabled === false));
checks.push(check('replay_disabled', rb.replayEnabled === false));
checks.push(check('fixture_disabled', rb.fixtureExecutionEnabled === false));
checks.push(check('mutation_disabled', rb.mutationEnabled === false));
checks.push(check('live_blocked', rb.liveEnvironmentAllowed === false));
checks.push(check('production_blocked', rb.productionEnvironmentAllowed === false));

// Deterministic hash stability
const hash1 = computeBridgeContractV1SemanticHash();
const hash2 = computeBridgeContractV1SemanticHash(getBridgeContractV1());
checks.push(check('semantic_hash_stable', hash1 === hash2 && /^[0-9a-f]{64}$/.test(hash1)));
checks.push(check('canonical_json_no_whitespace', !/\s/.test(canonicalizeBridgeContractV1())));

// JSON schema parity (basic structural parity against schema required keys)
checks.push(check('schema_contract_id_const', schemaJson.properties.contractId.const === 'invyra.scanops.inventory-bridge'));
checks.push(check('schema_schema_version_const', schemaJson.properties.schemaVersion.const === '1.0.0'));

// No forbidden runtime/transport imports in contract modules (source scan)
import { readFileSync as readRaw } from 'node:fs';
const contractSrc = readRaw(contractModulePath, 'utf8');
const canonicalizeSrc = readRaw(canonicalizeModulePath, 'utf8');
checks.push(check('no_fetch_in_contract_module', !/\bfetch\(/.test(contractSrc) && !/\bfetch\(/.test(canonicalizeSrc)));
checks.push(check('no_dispatch_in_contract_module', !/createScanOpsBridgeTransportClient/.test(contractSrc) && !/sendHandoff/.test(contractSrc)));
checks.push(check('no_persistence_in_contract_module', !/base44\.entities/.test(contractSrc) && !/localStorage/.test(contractSrc) && !/indexedDB/.test(contractSrc)));
checks.push(check('no_mutation_in_contract_module', !/\.create\(/.test(contractSrc) && !/\.update\(/.test(contractSrc) && !/\.delete\(/.test(contractSrc)));
checks.push(check('canonicalize_only_node_crypto', /node:crypto/.test(canonicalizeSrc) && !/base44/.test(canonicalizeSrc)));

const passed = checks.every((c) => c.passed);
const summary = {
  contractId: contract.contractId,
  schemaVersion: contract.schemaVersion,
  semanticHash: hash1,
};

console.log(JSON.stringify({
  phase: '34-D-S',
  passed,
  checks,
  summary,
}, null, 2));

process.exit(passed ? 0 : 1);