/**
 * bridgeContractV1.js — Phase 34-D-S
 *
 * ScanOps copy of the canonical ScanOps ↔ Inventory Bridge Contract v1.
 *
 * Contract-only. No runtime, transport, persistence, queue, dispatch, fetch,
 * or mutation behaviour is introduced by this module. It is a pure data +
 * validation surface intended to be independently machine-compared with the
 * Inventory copy via a deterministic semantic SHA-256 hash.
 *
 * Locked identity:
 *   contractId: invyra.scanops.inventory-bridge
 *   schemaVersion: 1.0.0
 *   canonicalFieldStyle: camelCase
 */

export const BRIDGE_CONTRACT_V1_ID = 'invyra.scanops.inventory-bridge';
export const BRIDGE_CONTRACT_V1_SCHEMA_VERSION = '1.0.0';
export const BRIDGE_CONTRACT_V1_FIELD_STYLE = 'camelCase';
export const BRIDGE_CONTRACT_V1_VERSION = 'bridge-contract.v1.0.0';

export const CANONICAL_SOURCE_SYSTEM = 'SCANOPS';
export const CANONICAL_TARGET_SYSTEM = 'INVENTORY';

export const CANONICAL_ENVIRONMENTS = Object.freeze([
  'TRAINING',
  'TEST',
  'LIVE',
  'PRODUCTION',
]);

export const CANONICAL_RUNTIME_ALLOWED_ENVIRONMENTS = Object.freeze([
  'TRAINING',
  'TEST',
]);

export const CANONICAL_OPERATION_TYPES = Object.freeze([
  'LOOKUP_REQUEST',
  'COUNT_SUBMISSION',
  'RECEIVING_SUBMISSION',
  'TRANSFER_SUBMISSION',
  'WASTE_SUBMISSION',
  'MARKDOWN_SUBMISSION',
  'EXPIRY_SUBMISSION',
  'MOVEMENT_NOTE',
  'DEVICE_HEALTH_PING',
]);

export const CANONICAL_ADMISSION_STATUSES = Object.freeze([
  'ACCEPTED',
  'REJECTED',
  'DUPLICATE',
  'UNSUPPORTED',
  'SERVICE_UNAVAILABLE',
]);

export const CANONICAL_APPLICATION_STATUSES = Object.freeze([
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
]);

export const CANONICAL_ENVELOPE_REQUIRED_FIELDS = Object.freeze([
  'contractId',
  'schemaVersion',
  'envelopeId',
  'idempotencyKey',
  'traceId',
  'operationType',
  'occurredAt',
  'environment',
  'source',
  'target',
  'payload',
]);

export const CANONICAL_SOURCE_REQUIRED_FIELDS = Object.freeze([
  'system',
  'deviceId',
  'storeId',
  'sessionId',
]);

export const CANONICAL_TARGET_REQUIRED_FIELDS = Object.freeze([
  'system',
  'inventoryInstanceId',
]);

export const CANONICAL_RECEIPT_REQUIRED_FIELDS = Object.freeze([
  'contractId',
  'schemaVersion',
  'receiptId',
  'envelopeId',
  'idempotencyKey',
  'traceId',
  'admissionStatus',
  'applicationStatus',
  'receivedAt',
  'processedAt',
  'inventoryInstanceId',
  'environment',
  'operationType',
  'message',
  'errors',
  'warnings',
]);

export const CANONICAL_ERROR_FIELDS = Object.freeze([
  'code',
  'message',
  'field',
  'retryable',
]);

export const CANONICAL_ERROR_CODES = Object.freeze([
  'CONTRACT_ID_INVALID',
  'SCHEMA_VERSION_INVALID',
  'ENVIRONMENT_REQUIRED',
  'ENVIRONMENT_INVALID',
  'ENVELOPE_ID_REQUIRED',
  'IDEMPOTENCY_KEY_REQUIRED',
  'TRACE_ID_REQUIRED',
  'OPERATION_TYPE_INVALID',
  'TIMESTAMP_INVALID',
  'SOURCE_SYSTEM_INVALID',
  'SOURCE_DEVICE_REQUIRED',
  'SOURCE_STORE_REQUIRED',
  'SOURCE_SESSION_REQUIRED',
  'SOURCE_OPERATOR_REQUIRED',
  'TARGET_SYSTEM_INVALID',
  'INVENTORY_INSTANCE_REQUIRED',
  'PAYLOAD_INVALID',
  'RUNTIME_DISABLED',
  'DEVICE_NOT_TRUSTED',
  'STORE_NOT_ALLOWED',
  'DUPLICATE_ENVELOPE',
  'UNSUPPORTED_OPERATION',
  'SERVICE_UNAVAILABLE',
]);

export const CANONICAL_PLACEHOLDER_IDENTIFIERS = Object.freeze([
  'scanops-device-local',
  'store-local',
  'session-local',
  'inventory-desktop-local',
  'invyra-inventory-desktop-local',
]);

export const CANONICAL_ENDPOINT_DESCRIPTORS = Object.freeze([
  Object.freeze({
    method: 'GET',
    path: '/api/bridge/v1/health',
    contentType: 'application/json',
  }),
  Object.freeze({
    method: 'POST',
    path: '/api/bridge/v1/handoffs',
    contentType: 'application/json',
  }),
  Object.freeze({
    method: 'GET',
    path: '/api/bridge/v1/receipts/{receiptId}',
    contentType: 'application/json',
  }),
]);

export const CANONICAL_FAIL_CLOSED_POLICY = Object.freeze({
  emptyAcceptedSchemaListDenies: true,
  emptyAcceptedOperationListDenies: true,
  emptyTrustedDeviceListDenies: true,
  emptyAllowedStoreListDenies: true,
  missingEnvironmentDenies: true,
  missingInventoryInstanceDenies: true,
  contractMajorVersionMismatchDenies: true,
  unknownOperationDenies: true,
});

export const CANONICAL_RUNTIME_BOUNDARIES = Object.freeze({
  runtimeActivated: false,
  transportActivated: false,
  automaticSyncEnabled: false,
  outboxProcessingEnabled: false,
  persistenceEnabled: false,
  discoveryEnabled: false,
  pairingEnabled: false,
  authenticationEnabled: false,
  replayEnabled: false,
  fixtureExecutionEnabled: false,
  mutationEnabled: false,
  liveEnvironmentAllowed: false,
  productionEnvironmentAllowed: false,
});

export const CANONICAL_CONTRACT = Object.freeze({
  contractId: BRIDGE_CONTRACT_V1_ID,
  schemaVersion: BRIDGE_CONTRACT_V1_SCHEMA_VERSION,
  canonicalFieldStyle: BRIDGE_CONTRACT_V1_FIELD_STYLE,
  operationTypes: CANONICAL_OPERATION_TYPES,
  environments: CANONICAL_ENVIRONMENTS,
  runtimeAllowedEnvironments: CANONICAL_RUNTIME_ALLOWED_ENVIRONMENTS,
  admissionStatuses: CANONICAL_ADMISSION_STATUSES,
  applicationStatuses: CANONICAL_APPLICATION_STATUSES,
  envelope: Object.freeze({
    requiredFields: CANONICAL_ENVELOPE_REQUIRED_FIELDS,
    source: Object.freeze({
      requiredFields: CANONICAL_SOURCE_REQUIRED_FIELDS,
      systemValue: CANONICAL_SOURCE_SYSTEM,
      operatorRequiredExceptOperations: Object.freeze(['DEVICE_HEALTH_PING']),
    }),
    target: Object.freeze({
      requiredFields: CANONICAL_TARGET_REQUIRED_FIELDS,
      systemValue: CANONICAL_TARGET_SYSTEM,
    }),
  }),
  receipt: Object.freeze({
    requiredFields: CANONICAL_RECEIPT_REQUIRED_FIELDS,
  }),
  error: Object.freeze({
    fields: CANONICAL_ERROR_FIELDS,
    codes: CANONICAL_ERROR_CODES,
    codeFormat: 'UPPER_SNAKE_CASE',
  }),
  endpoints: CANONICAL_ENDPOINT_DESCRIPTORS,
  placeholderIdentifiers: CANONICAL_PLACEHOLDER_IDENTIFIERS,
  failClosedPolicy: CANONICAL_FAIL_CLOSED_POLICY,
  runtimeBoundaries: CANONICAL_RUNTIME_BOUNDARIES,
});

export function getBridgeContractV1() {
  return CANONICAL_CONTRACT;
}