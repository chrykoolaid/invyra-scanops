/**
 * buildCanonicalEnvelopeV1.js — Phase 34-E-S
 *
 * Pure canonical Bridge Contract v1 envelope builder.
 *
 * Builds envelopes from explicit governed inputs only. Never defaults,
 * generates, persists, sends, dispatches, or mutates. Returns a frozen
 * envelope on success, or a canonical error result on invalid input.
 *
 * Import authority: src/inventory-bridge/canonicalContract/v1/
 */

import {
  BRIDGE_CONTRACT_V1,
} from '../../canonicalContract/v1/bridgeContractV1.js';

const ISO_8601_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function makeErrorResult(code, field, message, retryable = false) {
  return Object.freeze({
    ok: false,
    envelope: null,
    errors: Object.freeze([
      Object.freeze({ code, field, message, retryable }),
    ]),
    warnings: Object.freeze([]),
    dispatchAttempted: false,
    queueWriteAttempted: false,
    persistenceAttempted: false,
    inventoryMutationAttempted: false,
    scanOpsMutationAttempted: false,
  });
}

/**
 * Build a canonical Bridge Contract v1 envelope from explicit governed inputs.
 *
 * @param {object} input - Explicit values; nothing is defaulted.
 * @returns {object} Frozen envelope on success; frozen error result otherwise.
 */
export function buildCanonicalEnvelopeV1(input) {
  if (!isPlainObject(input)) {
    return makeErrorResult('PAYLOAD_INVALID', 'input', 'Envelope input must be a plain object.');
  }

  const contractId = BRIDGE_CONTRACT_V1.contractId;
  const schemaVersion = BRIDGE_CONTRACT_V1.schemaVersion;
  const contractMajor = schemaVersion.split('.')[0];

  // Envelope ID
  if (input.envelopeId === undefined || input.envelopeId === null || input.envelopeId === '') {
    return makeErrorResult('ENVELOPE_ID_REQUIRED', 'envelopeId', 'Envelope ID is required.');
  }
  if (typeof input.envelopeId !== 'string') {
    return makeErrorResult('ENVELOPE_ID_REQUIRED', 'envelopeId', 'Envelope ID must be a string.');
  }

  // Idempotency key
  if (input.idempotencyKey === undefined || input.idempotencyKey === null || input.idempotencyKey === '') {
    return makeErrorResult('IDEMPOTENCY_KEY_REQUIRED', 'idempotencyKey', 'Idempotency key is required.');
  }
  if (typeof input.idempotencyKey !== 'string') {
    return makeErrorResult('IDEMPOTENCY_KEY_REQUIRED', 'idempotencyKey', 'Idempotency key must be a string.');
  }

  // Trace ID
  if (input.traceId === undefined || input.traceId === null || input.traceId === '') {
    return makeErrorResult('TRACE_ID_REQUIRED', 'traceId', 'Trace ID is required.');
  }
  if (typeof input.traceId !== 'string') {
    return makeErrorResult('TRACE_ID_REQUIRED', 'traceId', 'Trace ID must be a string.');
  }

  // Operation type
  if (input.operationType === undefined || input.operationType === null || input.operationType === '') {
    return makeErrorResult('OPERATION_TYPE_INVALID', 'operationType', 'Operation type is required.');
  }
  if (!BRIDGE_CONTRACT_V1.operationTypes.includes(input.operationType)) {
    return makeErrorResult('UNSUPPORTED_OPERATION', 'operationType', `Unsupported operation type: ${String(input.operationType)}`);
  }

  // Timestamp
  if (input.occurredAt === undefined || input.occurredAt === null || input.occurredAt === '') {
    return makeErrorResult('TIMESTAMP_INVALID', 'occurredAt', 'Occurred-at timestamp is required.');
  }
  if (typeof input.occurredAt !== 'string' || !ISO_8601_REGEX.test(input.occurredAt)) {
    return makeErrorResult('TIMESTAMP_INVALID', 'occurredAt', 'Occurred-at must be an ISO-8601 string.');
  }

  // Environment
  if (input.environment === undefined || input.environment === null || input.environment === '') {
    return makeErrorResult('ENVIRONMENT_REQUIRED', 'environment', 'Environment is required.');
  }
  if (input.environment === 'UNKNOWN') {
    return makeErrorResult('ENVIRONMENT_INVALID', 'environment', 'UNKNOWN environment is invalid.');
  }
  if (!BRIDGE_CONTRACT_V1.environments.recognized.includes(input.environment)) {
    return makeErrorResult('ENVIRONMENT_INVALID', 'environment', `Unrecognized environment: ${String(input.environment)}`);
  }
  if (!BRIDGE_CONTRACT_V1.environments.allowedRuntime.includes(input.environment)) {
    return makeErrorResult('ENVIRONMENT_INVALID', 'environment', `Environment not allowed at runtime: ${String(input.environment)}`);
  }

  // Source
  if (!isPlainObject(input.source)) {
    return makeErrorResult('PAYLOAD_INVALID', 'source', 'Source must be a plain object.');
  }
  const source = input.source;

  if (source.deviceId === undefined || source.deviceId === null || source.deviceId === '') {
    return makeErrorResult('SOURCE_DEVICE_REQUIRED', 'source.deviceId', 'Source device ID is required.');
  }
  if (BRIDGE_CONTRACT_V1.envelope.placeholderIdsRejected.includes(source.deviceId)) {
    return makeErrorResult('SOURCE_DEVICE_REQUIRED', 'source.deviceId', 'Placeholder device identifier is rejected.');
  }

  if (source.storeId === undefined || source.storeId === null || source.storeId === '') {
    return makeErrorResult('SOURCE_STORE_REQUIRED', 'source.storeId', 'Source store ID is required.');
  }
  if (BRIDGE_CONTRACT_V1.envelope.placeholderIdsRejected.includes(source.storeId)) {
    return makeErrorResult('SOURCE_STORE_REQUIRED', 'source.storeId', 'Placeholder store identifier is rejected.');
  }

  if (source.sessionId === undefined || source.sessionId === null || source.sessionId === '') {
    return makeErrorResult('SOURCE_SESSION_REQUIRED', 'source.sessionId', 'Source session ID is required.');
  }
  if (BRIDGE_CONTRACT_V1.envelope.placeholderIdsRejected.includes(source.sessionId)) {
    return makeErrorResult('SOURCE_SESSION_REQUIRED', 'source.sessionId', 'Placeholder session identifier is rejected.');
  }

  // Operator (required except DEVICE_HEALTH_PING)
  const operatorRequired =
    !BRIDGE_CONTRACT_V1.envelope.source.operatorId.exceptionOperations.includes(input.operationType);
  if (operatorRequired) {
    if (input.operatorId === undefined || input.operatorId === null || input.operatorId === '') {
      return makeErrorResult('SOURCE_OPERATOR_REQUIRED', 'operatorId', 'Operator ID is required for this operation.');
    }
    if (BRIDGE_CONTRACT_V1.envelope.placeholderIdsRejected.includes(input.operatorId)) {
      return makeErrorResult('SOURCE_OPERATOR_REQUIRED', 'operatorId', 'Placeholder operator identifier is rejected.');
    }
  }

  // Target
  if (!isPlainObject(input.target)) {
    return makeErrorResult('PAYLOAD_INVALID', 'target', 'Target must be a plain object.');
  }
  const target = input.target;
  if (target.inventoryInstanceId === undefined || target.inventoryInstanceId === null || target.inventoryInstanceId === '') {
    return makeErrorResult('INVENTORY_INSTANCE_REQUIRED', 'target.inventoryInstanceId', 'Inventory instance ID is required.');
  }
  if (BRIDGE_CONTRACT_V1.envelope.placeholderIdsRejected.includes(target.inventoryInstanceId)) {
    return makeErrorResult('INVENTORY_INSTANCE_REQUIRED', 'target.inventoryInstanceId', 'Placeholder Inventory instance identifier is rejected.');
  }

  // Payload
  if (!isPlainObject(input.payload)) {
    return makeErrorResult('PAYLOAD_INVALID', 'payload', 'Payload must be a plain object.');
  }

  const envelope = Object.freeze({
    contractId,
    schemaVersion,
    envelopeId: input.envelopeId,
    idempotencyKey: input.idempotencyKey,
    traceId: input.traceId,
    operationType: input.operationType,
    occurredAt: input.occurredAt,
    environment: input.environment,
    source: Object.freeze({
      system: BRIDGE_CONTRACT_V1.envelope.source.systemMustEqual,
      deviceId: source.deviceId,
      storeId: source.storeId,
      sessionId: source.sessionId,
    }),
    target: Object.freeze({
      system: BRIDGE_CONTRACT_V1.envelope.target.systemMustEqual,
      inventoryInstanceId: target.inventoryInstanceId,
    }),
    payload: Object.freeze({ ...input.payload }),
  });

  // operatorId is carried outside the canonical envelope shape when present
  // (the contract requires it for non-health operations but it is not a
  // top-level envelope field). Return it as a sidecar for audit only.
  const sidecar = Object.freeze({
    operatorId: operatorRequired ? input.operatorId : (input.operatorId ?? null),
    contractMajor,
  });

  return Object.freeze({
    ok: true,
    envelope,
    sidecar,
    errors: Object.freeze([]),
    warnings: Object.freeze([]),
    dispatchAttempted: false,
    queueWriteAttempted: false,
    persistenceAttempted: false,
    inventoryMutationAttempted: false,
    scanOpsMutationAttempted: false,
  });
}