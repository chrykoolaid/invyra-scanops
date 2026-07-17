/** Pure ScanOps canonical envelope builder. No sending, queueing or mutation. */
import { BRIDGE_CONTRACT_V1 } from '../../canonicalContract/v1/bridgeContractV1.js';

const HEALTH_OPERATION = BRIDGE_CONTRACT_V1.envelope.source.operatorId.exceptionOperations[0];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeRequiredString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidIsoTimestamp(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);

  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) {
    return false;
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return false;

  if (match[7] !== 'Z') {
    const [offsetHour, offsetMinute] = match[7].slice(1).split(':').map(Number);
    if (offsetHour > 23 || offsetMinute > 59) return false;
  }

  return !Number.isNaN(Date.parse(normalized));
}

function deepCloneFreeze(value) {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(deepCloneFreeze));
  }
  if (isPlainObject(value)) {
    const clone = {};
    for (const [key, item] of Object.entries(value)) {
      clone[key] = deepCloneFreeze(item);
    }
    return Object.freeze(clone);
  }
  return value;
}

function canonicalError(code, field, message, retryable = false) {
  if (!BRIDGE_CONTRACT_V1.errorObject.coreRegistry.includes(code)) {
    throw new Error(`Non-canonical error code requested: ${code}`);
  }
  return Object.freeze({
    code,
    field,
    message,
    retryable: Boolean(retryable),
  });
}

function makeErrorResult(code, field, message) {
  return Object.freeze({
    ok: false,
    envelope: null,
    metadata: null,
    errors: Object.freeze([canonicalError(code, field, message)]),
    warnings: Object.freeze([]),
    dispatchAttempted: false,
    envelopeSendAllowed: false,
    queueWriteAttempted: false,
    persistenceAttempted: false,
    inventoryMutationAttempted: false,
    scanOpsMutationAttempted: false,
  });
}

function requireIdentifier(value, code, field, label) {
  const normalized = normalizeRequiredString(value);
  if (!normalized) {
    return {
      error: makeErrorResult(code, field, `${label} must be a non-empty string.`),
    };
  }

  if (BRIDGE_CONTRACT_V1.envelope.placeholderIdsRejected.includes(normalized)) {
    return {
      error: makeErrorResult(code, field, `${label} is a reserved placeholder identifier.`),
    };
  }

  return { value: normalized };
}

export function buildCanonicalEnvelopeV1(input) {
  if (!isPlainObject(input)) {
    return makeErrorResult(
      'PAYLOAD_INVALID',
      'input',
      'Envelope input must be a plain object.',
    );
  }

  if (Object.prototype.hasOwnProperty.call(input, 'operatorId')) {
    return makeErrorResult(
      'PAYLOAD_INVALID',
      'operatorId',
      'operatorId must be supplied only as source.operatorId.',
    );
  }

  const envelopeId = requireIdentifier(
    input.envelopeId,
    'ENVELOPE_ID_REQUIRED',
    'envelopeId',
    'Envelope ID',
  );
  if (envelopeId.error) return envelopeId.error;

  const idempotencyKey = requireIdentifier(
    input.idempotencyKey,
    'IDEMPOTENCY_KEY_REQUIRED',
    'idempotencyKey',
    'Idempotency key',
  );
  if (idempotencyKey.error) return idempotencyKey.error;

  const traceId = requireIdentifier(
    input.traceId,
    'TRACE_ID_REQUIRED',
    'traceId',
    'Trace ID',
  );
  if (traceId.error) return traceId.error;

  if (!BRIDGE_CONTRACT_V1.operationTypes.includes(input.operationType)) {
    return makeErrorResult(
      'UNSUPPORTED_OPERATION',
      'operationType',
      'operationType must be one of the canonical operations.',
    );
  }

  if (!isValidIsoTimestamp(input.occurredAt)) {
    return makeErrorResult(
      'TIMESTAMP_INVALID',
      'occurredAt',
      'occurredAt must be a real ISO-8601 timestamp.',
    );
  }

  if (
    typeof input.environment !== 'string'
    || !BRIDGE_CONTRACT_V1.environments.recognized.includes(input.environment)
    || input.environment === 'UNKNOWN'
    || !BRIDGE_CONTRACT_V1.environments.allowedRuntime.includes(input.environment)
  ) {
    return makeErrorResult(
      input.environment ? 'ENVIRONMENT_INVALID' : 'ENVIRONMENT_REQUIRED',
      'environment',
      'environment must be an admitted TRAINING or TEST value.',
    );
  }

  if (!isPlainObject(input.source)) {
    return makeErrorResult('PAYLOAD_INVALID', 'source', 'source must be a plain object.');
  }

  const deviceId = requireIdentifier(
    input.source.deviceId,
    'SOURCE_DEVICE_REQUIRED',
    'source.deviceId',
    'Source device ID',
  );
  if (deviceId.error) return deviceId.error;

  const storeId = requireIdentifier(
    input.source.storeId,
    'SOURCE_STORE_REQUIRED',
    'source.storeId',
    'Source store ID',
  );
  if (storeId.error) return storeId.error;

  const sessionId = requireIdentifier(
    input.source.sessionId,
    'SOURCE_SESSION_REQUIRED',
    'source.sessionId',
    'Source session ID',
  );
  if (sessionId.error) return sessionId.error;

  const operatorSupplied = Object.prototype.hasOwnProperty.call(
    input.source,
    'operatorId',
  );
  const operatorId = normalizeRequiredString(input.source.operatorId);
  const operatorRequired = input.operationType !== HEALTH_OPERATION;

  if (operatorRequired && !operatorId) {
    return makeErrorResult(
      'SOURCE_OPERATOR_REQUIRED',
      'source.operatorId',
      'source.operatorId is required for this operation.',
    );
  }

  if (operatorSupplied && !operatorId) {
    return makeErrorResult(
      'SOURCE_OPERATOR_REQUIRED',
      'source.operatorId',
      'A supplied source.operatorId must be a non-empty string.',
    );
  }

  if (
    operatorId
    && BRIDGE_CONTRACT_V1.envelope.placeholderIdsRejected.includes(operatorId)
  ) {
    return makeErrorResult(
      'SOURCE_OPERATOR_REQUIRED',
      'source.operatorId',
      'source.operatorId is a reserved placeholder identifier.',
    );
  }

  if (!isPlainObject(input.target)) {
    return makeErrorResult('PAYLOAD_INVALID', 'target', 'target must be a plain object.');
  }

  const inventoryInstanceId = requireIdentifier(
    input.target.inventoryInstanceId,
    'INVENTORY_INSTANCE_REQUIRED',
    'target.inventoryInstanceId',
    'Inventory instance ID',
  );
  if (inventoryInstanceId.error) return inventoryInstanceId.error;

  if (!isPlainObject(input.payload)) {
    return makeErrorResult('PAYLOAD_INVALID', 'payload', 'payload must be a plain object.');
  }

  const source = {
    system: BRIDGE_CONTRACT_V1.envelope.source.systemMustEqual,
    deviceId: deviceId.value,
    storeId: storeId.value,
    sessionId: sessionId.value,
  };
  if (operatorId) source.operatorId = operatorId;

  const envelope = deepCloneFreeze({
    contractId: BRIDGE_CONTRACT_V1.contractId,
    schemaVersion: BRIDGE_CONTRACT_V1.schemaVersion,
    envelopeId: envelopeId.value,
    idempotencyKey: idempotencyKey.value,
    traceId: traceId.value,
    operationType: input.operationType,
    occurredAt: input.occurredAt.trim(),
    environment: input.environment,
    source,
    target: {
      system: BRIDGE_CONTRACT_V1.envelope.target.systemMustEqual,
      inventoryInstanceId: inventoryInstanceId.value,
    },
    payload: input.payload,
  });

  return Object.freeze({
    ok: true,
    envelope,
    metadata: Object.freeze({
      contractMajor: BRIDGE_CONTRACT_V1.schemaVersion.split('.')[0],
      operatorIdIncludedInEnvelope: Boolean(operatorId),
    }),
    errors: Object.freeze([]),
    warnings: Object.freeze([]),
    dispatchAttempted: false,
    envelopeSendAllowed: false,
    queueWriteAttempted: false,
    persistenceAttempted: false,
    inventoryMutationAttempted: false,
    scanOpsMutationAttempted: false,
  });
}
