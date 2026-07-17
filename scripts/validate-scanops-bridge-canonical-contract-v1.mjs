#!/usr/bin/env node
/**
 * validate-scanops-bridge-canonical-contract-v1.mjs — Phase 34-D-S1
 *
 * Deterministic validator for the ScanOps canonical Bridge Contract v1.
 * Contract-only: no dispatch, fetch, queue write, persistence, or mutation.
 * Prints contractId, schemaVersion, and semanticHash and fails with a non-zero
 * exit code when the computed hash drifts from the authoritative Inventory hash.
 *
 * Usage:
 *   node scripts/validate-scanops-bridge-canonical-contract-v1.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');

const contractModulePath = join(repoRoot, 'src/inventory-bridge/canonicalContract/v1/bridgeContractV1.js');
const canonicalizeModulePath = join(repoRoot, 'src/inventory-bridge/canonicalContract/v1/canonicalizeBridgeContractV1.js');
const schemaPath = join(repoRoot, 'src/inventory-bridge/canonicalContract/v1/bridgeContractV1.schema.json');

const { BRIDGE_CONTRACT_V1, getBridgeContractV1 } = await import(contractModulePath);
const { canonicalizeBridgeContractV1, computeBridgeContractV1SemanticHash } = await import(canonicalizeModulePath);

const schemaJson = JSON.parse(readFileSync(schemaPath, 'utf8'));

// Drift lock — authoritative Inventory semantic hash.
const EXPECTED_SEMANTIC_HASH = '9a7718a37f66236d0c0e9873cade6745c83f3a56cf41d969edf8ef9359eee5f5';
const PREVIOUS_SEMANTIC_HASH = 'c7917bc17659a6e36db707604db8a99c7fb1e2ca03ac71a05452a7047dac9efb';

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
const expectedEnvelopeFields = [
  'contractId', 'schemaVersion', 'envelopeId', 'idempotencyKey', 'traceId',
  'operationType', 'occurredAt', 'environment', 'source', 'target', 'payload',
];
const expectedSourceFields = ['system', 'deviceId', 'storeId', 'sessionId'];
const expectedTargetFields = ['system', 'inventoryInstanceId'];
const expectedPlaceholders = [
  'scanops-device-local', 'store-local', 'session-local',
  'inventory-desktop-local', 'invyra-inventory-desktop-local',
];
const expectedRecognized = ['TRAINING', 'TEST', 'LIVE', 'PRODUCTION'];
const expectedAllowedRuntime = ['TRAINING', 'TEST'];
const expectedBlockedRuntime = ['LIVE', 'PRODUCTION'];
const expectedReceiptFields = [
  'contractId', 'schemaVersion', 'receiptId', 'envelopeId', 'idempotencyKey',
  'traceId', 'admissionStatus', 'applicationStatus', 'receivedAt', 'processedAt',
  'inventoryInstanceId', 'environment', 'operationType', 'message', 'errors', 'warnings',
];
const expectedAdmission = ['ACCEPTED', 'REJECTED', 'DUPLICATE', 'UNSUPPORTED', 'SERVICE_UNAVAILABLE'];
const expectedApplication = [
  'NOT_APPLICABLE', 'STAGED', 'VALIDATION_FAILED', 'NEEDS_REVIEW', 'APPROVED',
  'APPLYING', 'APPLIED', 'APPLICATION_FAILED', 'CANCELLED', 'DEAD_LETTER',
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
const expectedEndpoints = [
  { method: 'GET', path: '/api/bridge/v1/health' },
  { method: 'POST', path: '/api/bridge/v1/handoffs' },
  { method: 'GET', path: '/api/bridge/v1/receipts/{receiptId}' },
];

const checks = [];
const contract = getBridgeContractV1();

// Contract identity
checks.push(check('contract_id_locked', contract.contractId === 'invyra.scanops.inventory-bridge'));
checks.push(check('schema_version_locked', contract.schemaVersion === '1.0.0'));
checks.push(check('field_style_camel_case', contract.canonicalFieldStyle === 'camelCase'));

// Operation list + order
checks.push(check('operation_types_exact_order', arraysEqual([...contract.operationTypes], expectedOperationTypes)));
checks.push(check('operation_types_no_extras', contract.operationTypes.length === expectedOperationTypes.length));

// Envelope structure
checks.push(check('envelope_required_top_level_fields', arraysEqual([...contract.envelope.requiredTopLevelFields], expectedEnvelopeFields)));
checks.push(check('source_required_fields', arraysEqual([...contract.envelope.source.requiredFields], expectedSourceFields)));
checks.push(check('target_required_fields', arraysEqual([...contract.envelope.target.requiredFields], expectedTargetFields)));
checks.push(check('source_system_must_equal_scanops', contract.envelope.source.systemMustEqual === 'SCANOPS'));
checks.push(check('target_system_must_equal_inventory', contract.envelope.target.systemMustEqual === 'INVENTORY'));
checks.push(check('target_inventory_instance_required', contract.envelope.target.inventoryInstanceIdRequired === true));
checks.push(check('operator_id_required', contract.envelope.source.operatorId.required === true));
checks.push(check('operator_id_exception_operations', arraysEqual([...contract.envelope.source.operatorId.exceptionOperations], ['DEVICE_HEALTH_PING'])));
checks.push(check('placeholder_ids_rejected', arraysEqual([...contract.envelope.placeholderIdsRejected], expectedPlaceholders)));
checks.push(check('no_default_identifiers', contract.envelope.noDefaultIdentifiers === true));
checks.push(check('missing_identifiers_must_fail', contract.envelope.missingIdentifiersMustFail === true));

// Environments
checks.push(check('environments_recognized', arraysEqual([...contract.environments.recognized], expectedRecognized)));
checks.push(check('environments_allowed_runtime', arraysEqual([...contract.environments.allowedRuntime], expectedAllowedRuntime)));
checks.push(check('environments_blocked_runtime', arraysEqual([...contract.environments.blockedRuntime], expectedBlockedRuntime)));
checks.push(check('environments_unknown_invalid', contract.environments.unknownInvalid === true));
checks.push(check('environments_no_default', contract.environments.noDefault === true));
checks.push(check('environments_no_runtime_activation', contract.environments.thisPhaseDoesNotActivateRuntime === true));

// Receipt
checks.push(check('receipt_required_fields', arraysEqual([...contract.receipt.requiredFields], expectedReceiptFields)));
checks.push(check('receipt_admission_statuses_exact', arraysEqual([...contract.receipt.admissionStatuses], expectedAdmission)));
checks.push(check('receipt_application_statuses_exact', arraysEqual([...contract.receipt.applicationStatuses], expectedApplication)));

// Error object
checks.push(check('error_object_required_fields', arraysEqual([...contract.errorObject.requiredFields], expectedErrorFields)));
checks.push(check('error_object_code_format', contract.errorObject.codeFormat === 'UPPER_SNAKE_CASE'));
checks.push(check('error_object_core_registry_exact_order', arraysEqual([...contract.errorObject.coreRegistry], expectedErrorCodes)));
checks.push(check('error_codes_upper_snake', contract.errorObject.coreRegistry.every((c) => /^[A-Z][A-Z0-9_]*$/.test(c))));

// Endpoint descriptors
checks.push(check('endpoint_descriptors_order', arraysEqual(
  contract.endpointDescriptors.map((e) => `${e.method} ${e.path}`),
  expectedEndpoints.map((e) => `${e.method} ${e.path}`),
)));
checks.push(check('endpoint_descriptors_descriptor_only', contract.endpointDescriptors.every((e) => e.descriptorOnly === true)));
checks.push(check('endpoint_descriptors_not_implemented', contract.endpointDescriptors.every((e) => e.implemented === false)));

// Top-level content type + http server flag
checks.push(check('content_type_application_json', contract.contentType === 'application/json'));
checks.push(check('http_server_not_implemented', contract.httpServerImplemented === false));

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

// Runtime activation declaration
const ra = contract.runtimeActivation;
checks.push(check('runtime_not_activated_declaration', ra.thisPhaseDoesNotActivateRuntime === true));
checks.push(check('runtime_live_prod_blocked_separately', ra.liveAndProductionBlockedBySeparateRuntimePolicy === true));
checks.push(check('runtime_no_network_calls', ra.noNetworkCalls === true));
checks.push(check('runtime_no_persistence', ra.noPersistence === true));
checks.push(check('runtime_no_mutation', ra.noMutation === true));

// Old flattened semantic keys are absent from the hashed object
const topKeys = Object.keys(contract);
checks.push(check('absent_top_level_runtime_allowed_environments', !topKeys.includes('runtimeAllowedEnvironments')));
checks.push(check('absent_top_level_admission_statuses', !topKeys.includes('admissionStatuses')));
checks.push(check('absent_top_level_application_statuses', !topKeys.includes('applicationStatuses')));
checks.push(check('absent_top_level_endpoints', !topKeys.includes('endpoints')));
checks.push(check('absent_top_level_placeholder_identifiers', !topKeys.includes('placeholderIdentifiers')));
checks.push(check('absent_top_level_runtime_boundaries', !topKeys.includes('runtimeBoundaries')));
checks.push(check('absent_envelope_required_fields', !Object.keys(contract.envelope).includes('requiredFields')));
checks.push(check('absent_source_system_value', !Object.keys(contract.envelope.source).includes('systemValue')));
checks.push(check('absent_target_system_value', !Object.keys(contract.envelope.target).includes('systemValue')));
checks.push(check('absent_top_level_error', !topKeys.includes('error')));

// Deterministic hash + drift lock
const computedHash = computeBridgeContractV1SemanticHash();
checks.push(check('semantic_hash_stable', computedHash === computeBridgeContractV1SemanticHash(getBridgeContractV1()) && /^[0-9a-f]{64}$/.test(computedHash)));
checks.push(check('canonical_json_no_whitespace', !/\s/.test(canonicalizeBridgeContractV1())));
checks.push(check('semantic_hash_matches_authoritative', computedHash === EXPECTED_SEMANTIC_HASH));
checks.push(check('semantic_hash_changed_from_previous', computedHash !== PREVIOUS_SEMANTIC_HASH));

// Schema parity
checks.push(check('schema_contract_id_const', schemaJson.properties.contractId.const === 'invyra.scanops.inventory-bridge'));
checks.push(check('schema_schema_version_const', schemaJson.properties.schemaVersion.const === '1.0.0'));
checks.push(check('schema_envelope_required_top_level_fields', schemaJson.properties.envelope.properties.requiredTopLevelFields.minItems === 11));
checks.push(check('schema_envelope_operator_id_nested', !!schemaJson.properties.envelope.properties.source.properties.operatorId));
checks.push(check('schema_envelope_source_system_must_equal', schemaJson.properties.envelope.properties.source.properties.systemMustEqual.const === 'SCANOPS'));
checks.push(check('schema_envelope_target_system_must_equal', schemaJson.properties.envelope.properties.target.properties.systemMustEqual.const === 'INVENTORY'));
checks.push(check('schema_envelope_target_inventory_instance_required', schemaJson.properties.envelope.properties.target.properties.inventoryInstanceIdRequired.const === true));
checks.push(check('schema_environments_nested', !!schemaJson.properties.environments.properties.recognized));
checks.push(check('schema_error_object', !!schemaJson.properties.errorObject.properties.coreRegistry));
checks.push(check('schema_endpoint_descriptor_safety_flags', schemaJson.properties.endpointDescriptors.items.properties.descriptorOnly.const === true && schemaJson.properties.endpointDescriptors.items.properties.implemented.const === false));
checks.push(check('schema_content_type_top_level', schemaJson.properties.contentType.const === 'application/json'));
checks.push(check('schema_http_server_not_implemented', schemaJson.properties.httpServerImplemented.const === false));
checks.push(check('schema_fail_closed_policy', !!schemaJson.properties.failClosedPolicy.properties.emptyAcceptedSchemaListDenies));
checks.push(check('schema_runtime_activation', !!schemaJson.properties.runtimeActivation.properties.thisPhaseDoesNotActivateRuntime));

// No forbidden runtime/transport behaviour in contract modules
const contractSrc = readFileSync(contractModulePath, 'utf8');
const canonicalizeSrc = readFileSync(canonicalizeModulePath, 'utf8');
checks.push(check('no_fetch_in_contract_module', !/\bfetch\(/.test(contractSrc) && !/\bfetch\(/.test(canonicalizeSrc)));
checks.push(check('no_dispatch_in_contract_module', !/createScanOpsBridgeTransportClient/.test(contractSrc) && !/sendHandoff/.test(contractSrc)));
checks.push(check('no_persistence_in_contract_module', !/base44\.entities/.test(contractSrc) && !/localStorage/.test(contractSrc) && !/indexedDB/.test(contractSrc)));
checks.push(check('no_mutation_in_contract_module', !/base44\.entities/.test(canonicalizeSrc)));
checks.push(check('canonicalize_only_node_crypto', /node:crypto/.test(canonicalizeSrc) && !/base44/.test(canonicalizeSrc)));

const passed = checks.every((c) => c.passed);
const summary = {
  contractId: contract.contractId,
  schemaVersion: contract.schemaVersion,
  semanticHash: computedHash,
  expectedSemanticHash: EXPECTED_SEMANTIC_HASH,
  matchesExpected: computedHash === EXPECTED_SEMANTIC_HASH,
};

console.log(JSON.stringify({
  phase: '34-D-S1',
  passed,
  checksPassed: checks.filter((c) => c.passed).length,
  checksFailed: checks.filter((c) => !c.passed).length,
  totalChecks: checks.length,
  checks,
  summary,
}, null, 2));

process.exit(passed ? 0 : 1);