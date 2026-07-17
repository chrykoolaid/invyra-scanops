/**
 * bridgeContractV1.js — Phase 34-D-S1
 *
 * ScanOps copy of the canonical ScanOps ↔ Inventory Bridge Contract v1.
 *
 * Contract-only. No runtime, transport, persistence, queue, dispatch, fetch,
 * or mutation behaviour. The single semantic contract authority is
 * BRIDGE_CONTRACT_V1. Convenience constants below are derived from it and are
 * never independently hashed.
 *
 * Locked identity:
 *   contractId: invyra.scanops.inventory-bridge
 *   schemaVersion: 1.0.0
 *   canonicalFieldStyle: camelCase
 */

export const BRIDGE_CONTRACT_V1 = Object.freeze({
  contractId: 'invyra.scanops.inventory-bridge',
  schemaVersion: '1.0.0',
  canonicalFieldStyle: 'camelCase',
  operationTypes: Object.freeze([
    'LOOKUP_REQUEST',
    'COUNT_SUBMISSION',
    'RECEIVING_SUBMISSION',
    'TRANSFER_SUBMISSION',
    'WASTE_SUBMISSION',
    'MARKDOWN_SUBMISSION',
    'EXPIRY_SUBMISSION',
    'MOVEMENT_NOTE',
    'DEVICE_HEALTH_PING',
  ]),
  envelope: Object.freeze({
    requiredTopLevelFields: Object.freeze([
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
    ]),
    source: Object.freeze({
      requiredFields: Object.freeze([
        'system',
        'deviceId',
        'storeId',
        'sessionId',
      ]),
      systemMustEqual: 'SCANOPS',
      operatorId: Object.freeze({
        required: true,
        exceptionOperations: Object.freeze([
          'DEVICE_HEALTH_PING',
        ]),
      }),
    }),
    target: Object.freeze({
      requiredFields: Object.freeze([
        'system',
        'inventoryInstanceId',
      ]),
      systemMustEqual: 'INVENTORY',
      inventoryInstanceIdRequired: true,
    }),
    placeholderIdsRejected: Object.freeze([
      'scanops-device-local',
      'store-local',
      'session-local',
      'inventory-desktop-local',
      'invyra-inventory-desktop-local',
    ]),
    noDefaultIdentifiers: true,
    missingIdentifiersMustFail: true,
  }),
  environments: Object.freeze({
    recognized: Object.freeze([
      'TRAINING',
      'TEST',
      'LIVE',
      'PRODUCTION',
    ]),
    allowedRuntime: Object.freeze([
      'TRAINING',
      'TEST',
    ]),
    blockedRuntime: Object.freeze([
      'LIVE',
      'PRODUCTION',
    ]),
    unknownInvalid: true,
    noDefault: true,
    thisPhaseDoesNotActivateRuntime: true,
  }),
  receipt: Object.freeze({
    requiredFields: Object.freeze([
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
    ]),
    admissionStatuses: Object.freeze([
      'ACCEPTED',
      'REJECTED',
      'DUPLICATE',
      'UNSUPPORTED',
      'SERVICE_UNAVAILABLE',
    ]),
    applicationStatuses: Object.freeze([
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
    ]),
  }),
  errorObject: Object.freeze({
    requiredFields: Object.freeze([
      'code',
      'message',
      'field',
      'retryable',
    ]),
    codeFormat: 'UPPER_SNAKE_CASE',
    coreRegistry: Object.freeze([
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
    ]),
  }),
  endpointDescriptors: Object.freeze([
    Object.freeze({
      method: 'GET',
      path: '/api/bridge/v1/health',
      descriptorOnly: true,
      implemented: false,
    }),
    Object.freeze({
      method: 'POST',
      path: '/api/bridge/v1/handoffs',
      descriptorOnly: true,
      implemented: false,
    }),
    Object.freeze({
      method: 'GET',
      path: '/api/bridge/v1/receipts/{receiptId}',
      descriptorOnly: true,
      implemented: false,
    }),
  ]),
  contentType: 'application/json',
  httpServerImplemented: false,
  failClosedPolicy: Object.freeze({
    emptyAcceptedSchemaListDenies: true,
    emptyAcceptedOperationListDenies: true,
    emptyTrustedDeviceListDenies: true,
    emptyAllowedStoreListDenies: true,
    missingEnvironmentDenies: true,
    missingInventoryInstanceDenies: true,
    contractMajorVersionMismatchDenies: true,
    unknownOperationDenies: true,
  }),
  runtimeActivation: Object.freeze({
    thisPhaseDoesNotActivateRuntime: true,
    liveAndProductionBlockedBySeparateRuntimePolicy: true,
    noNetworkCalls: true,
    noPersistence: true,
    noMutation: true,
  }),
});

// --- Derived convenience constants (never independently hashed) ---

export const BRIDGE_CONTRACT_V1_ID = BRIDGE_CONTRACT_V1.contractId;
export const BRIDGE_CONTRACT_V1_SCHEMA_VERSION = BRIDGE_CONTRACT_V1.schemaVersion;
export const BRIDGE_CONTRACT_V1_FIELD_STYLE = BRIDGE_CONTRACT_V1.canonicalFieldStyle;
export const BRIDGE_CONTRACT_V1_VERSION = 'bridge-contract.v1.0.0';

export const CANONICAL_OPERATION_TYPES = BRIDGE_CONTRACT_V1.operationTypes;
export const CANONICAL_ENVELOPE_REQUIRED_FIELDS = BRIDGE_CONTRACT_V1.envelope.requiredTopLevelFields;
export const CANONICAL_SOURCE_REQUIRED_FIELDS = BRIDGE_CONTRACT_V1.envelope.source.requiredFields;
export const CANONICAL_TARGET_REQUIRED_FIELDS = BRIDGE_CONTRACT_V1.envelope.target.requiredFields;
export const CANONICAL_PLACEHOLDER_IDENTIFIERS = BRIDGE_CONTRACT_V1.envelope.placeholderIdsRejected;
export const CANONICAL_RECEIPT_REQUIRED_FIELDS = BRIDGE_CONTRACT_V1.receipt.requiredFields;
export const CANONICAL_ADMISSION_STATUSES = BRIDGE_CONTRACT_V1.receipt.admissionStatuses;
export const CANONICAL_APPLICATION_STATUSES = BRIDGE_CONTRACT_V1.receipt.applicationStatuses;
export const CANONICAL_ERROR_FIELDS = BRIDGE_CONTRACT_V1.errorObject.requiredFields;
export const CANONICAL_ERROR_CODES = BRIDGE_CONTRACT_V1.errorObject.coreRegistry;
export const CANONICAL_ENVIRONMENTS = BRIDGE_CONTRACT_V1.environments.recognized;
export const CANONICAL_RUNTIME_ALLOWED_ENVIRONMENTS = BRIDGE_CONTRACT_V1.environments.allowedRuntime;
export const CANONICAL_ENDPOINT_DESCRIPTORS = BRIDGE_CONTRACT_V1.endpointDescriptors;
export const CANONICAL_FAIL_CLOSED_POLICY = BRIDGE_CONTRACT_V1.failClosedPolicy;
export const CANONICAL_RUNTIME_ACTIVATION = BRIDGE_CONTRACT_V1.runtimeActivation;

export function getBridgeContractV1() {
  return BRIDGE_CONTRACT_V1;
}