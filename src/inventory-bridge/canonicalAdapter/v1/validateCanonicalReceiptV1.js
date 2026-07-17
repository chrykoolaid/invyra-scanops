/** Pure ScanOps canonical receipt validation and correlation. */
import { BRIDGE_CONTRACT_V1 } from '../../canonicalContract/v1/bridgeContractV1.js';

const [ADMISSION_ACCEPTED] = BRIDGE_CONTRACT_V1.receipt.admissionStatuses;
const [
  APPLICATION_NOT_APPLICABLE,
  APPLICATION_STAGED,
  APPLICATION_VALIDATION_FAILED,
  APPLICATION_NEEDS_REVIEW,
  APPLICATION_APPROVED,
  APPLICATION_APPLYING,
  APPLICATION_APPLIED,
  APPLICATION_FAILED,
  APPLICATION_CANCELLED,
  APPLICATION_DEAD_LETTER,
] = BRIDGE_CONTRACT_V1.receipt.applicationStatuses;
const HEALTH_OPERATION = BRIDGE_CONTRACT_V1.envelope.source.operatorId.exceptionOperations[0];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
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

function makeError(code, field, message, retryable = false) {
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

function freezeResult(partial) {
  return Object.freeze({
    ...partial,
    inventoryMutationAttempted: false,
    scanOpsMutationAttempted: false,
    persistenceAttempted: false,
    dispatchAttempted: false,
    queueWriteAttempted: false,
  });
}

export function validateCanonicalReceiptV1(receipt, envelope) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(receipt)) {
    return freezeResult({
      valid: false,
      correlated: false,
      admissionStatus: null,
      applicationStatus: null,
      normalizedReceipt: null,
      errors: Object.freeze([
        makeError('PAYLOAD_INVALID', 'receipt', 'Receipt must be a plain object.'),
      ]),
      warnings: Object.freeze([]),
    });
  }

  const envelopeShapeValid = isPlainObject(envelope)
    && isPlainObject(envelope.target);
  if (!envelopeShapeValid) {
    return freezeResult({
      valid: false,
      correlated: false,
      admissionStatus: receipt.admissionStatus ?? null,
      applicationStatus: receipt.applicationStatus ?? null,
      normalizedReceipt: deepCloneFreeze(receipt),
      errors: Object.freeze([
        makeError(
          'PAYLOAD_INVALID',
          'envelope',
          'Envelope and envelope.target must be plain objects for correlation.',
        ),
      ]),
      warnings: Object.freeze([]),
    });
  }

  if (receipt.contractId !== BRIDGE_CONTRACT_V1.contractId) {
    errors.push(makeError(
      'CONTRACT_ID_INVALID',
      'contractId',
      'Receipt contractId does not match.',
    ));
  }

  if (
    typeof receipt.schemaVersion !== 'string'
    || receipt.schemaVersion.split('.')[0]
      !== BRIDGE_CONTRACT_V1.schemaVersion.split('.')[0]
  ) {
    errors.push(makeError(
      'SCHEMA_VERSION_INVALID',
      'schemaVersion',
      'Receipt schema major version does not match.',
    ));
  }

  for (const field of BRIDGE_CONTRACT_V1.receipt.requiredFields) {
    if (
      !Object.prototype.hasOwnProperty.call(receipt, field)
      || receipt[field] === null
      || receipt[field] === ''
    ) {
      errors.push(makeError(
        'PAYLOAD_INVALID',
        field,
        `Receipt field ${field} is required.`,
      ));
    }
  }

  if (typeof receipt.receiptId !== 'string' || !receipt.receiptId.trim()) {
    errors.push(makeError(
      'PAYLOAD_INVALID',
      'receiptId',
      'receiptId must be a non-empty string.',
    ));
  }

  const admission = receipt.admissionStatus;
  const application = receipt.applicationStatus;

  if (!BRIDGE_CONTRACT_V1.receipt.admissionStatuses.includes(admission)) {
    errors.push(makeError(
      'PAYLOAD_INVALID',
      'admissionStatus',
      'Unknown admission status.',
    ));
  }

  if (!BRIDGE_CONTRACT_V1.receipt.applicationStatuses.includes(application)) {
    errors.push(makeError(
      'PAYLOAD_INVALID',
      'applicationStatus',
      'Unknown application status.',
    ));
  }

  if (!isValidIsoTimestamp(receipt.receivedAt)) {
    errors.push(makeError(
      'TIMESTAMP_INVALID',
      'receivedAt',
      'receivedAt must be a real ISO-8601 timestamp.',
    ));
  }

  if (!isValidIsoTimestamp(receipt.processedAt)) {
    errors.push(makeError(
      'TIMESTAMP_INVALID',
      'processedAt',
      'processedAt must be a real ISO-8601 timestamp.',
    ));
  }

  if (
    typeof receipt.inventoryInstanceId !== 'string'
    || !receipt.inventoryInstanceId.trim()
  ) {
    errors.push(makeError(
      'INVENTORY_INSTANCE_REQUIRED',
      'inventoryInstanceId',
      'inventoryInstanceId must be a non-empty string.',
    ));
  }

  if (
    !BRIDGE_CONTRACT_V1.environments.recognized.includes(receipt.environment)
    || receipt.environment === 'UNKNOWN'
    || BRIDGE_CONTRACT_V1.environments.blockedRuntime.includes(receipt.environment)
  ) {
    errors.push(makeError(
      'ENVIRONMENT_INVALID',
      'environment',
      'Receipt environment is unknown or blocked.',
    ));
  }

  if (!BRIDGE_CONTRACT_V1.operationTypes.includes(receipt.operationType)) {
    errors.push(makeError(
      'UNSUPPORTED_OPERATION',
      'operationType',
      'Receipt operationType is not canonical.',
    ));
  }

  if (!Array.isArray(receipt.errors)) {
    errors.push(makeError(
      'PAYLOAD_INVALID',
      'errors',
      'Receipt errors must be an array.',
    ));
  } else {
    receipt.errors.forEach((entry, index) => {
      if (!isPlainObject(entry)) {
        errors.push(makeError(
          'PAYLOAD_INVALID',
          `errors[${index}]`,
          'Each receipt error must be a plain object.',
        ));
        return;
      }

      for (const field of BRIDGE_CONTRACT_V1.errorObject.requiredFields) {
        if (
          !Object.prototype.hasOwnProperty.call(entry, field)
          || entry[field] === null
          || entry[field] === ''
        ) {
          errors.push(makeError(
            'PAYLOAD_INVALID',
            `errors[${index}].${field}`,
            `Receipt error missing ${field}.`,
          ));
        }
      }

      if (
        entry.code
        && !BRIDGE_CONTRACT_V1.errorObject.coreRegistry.includes(entry.code)
      ) {
        errors.push(makeError(
          'PAYLOAD_INVALID',
          `errors[${index}].code`,
          'Receipt error code is not canonical.',
        ));
      }

      if (
        Object.prototype.hasOwnProperty.call(entry, 'retryable')
        && typeof entry.retryable !== 'boolean'
      ) {
        errors.push(makeError(
          'PAYLOAD_INVALID',
          `errors[${index}].retryable`,
          'retryable must be boolean.',
        ));
      }
    });
  }

  if (!Array.isArray(receipt.warnings)) {
    errors.push(makeError(
      'PAYLOAD_INVALID',
      'warnings',
      'Receipt warnings must be an array.',
    ));
  }

  let correlated = true;
  const correlations = [
    ['envelopeId', 'DUPLICATE_ENVELOPE'],
    ['idempotencyKey', 'DUPLICATE_ENVELOPE'],
    ['traceId', 'PAYLOAD_INVALID'],
    ['operationType', 'UNSUPPORTED_OPERATION'],
    ['environment', 'ENVIRONMENT_INVALID'],
  ];

  for (const [field, code] of correlations) {
    if (receipt[field] !== envelope[field]) {
      errors.push(makeError(
        code,
        field,
        `Receipt ${field} does not match sent envelope.`,
      ));
      correlated = false;
    }
  }

  if (receipt.inventoryInstanceId !== envelope.target.inventoryInstanceId) {
    errors.push(makeError(
      'INVENTORY_INSTANCE_REQUIRED',
      'inventoryInstanceId',
      'Receipt inventoryInstanceId does not match envelope target.',
    ));
    correlated = false;
  }

  const healthAccepted = admission === ADMISSION_ACCEPTED
    && receipt.operationType === HEALTH_OPERATION;
  const businessAccepted = admission === ADMISSION_ACCEPTED
    && receipt.operationType !== HEALTH_OPERATION;

  if (healthAccepted && application !== APPLICATION_NOT_APPLICABLE) {
    errors.push(makeError(
      'PAYLOAD_INVALID',
      'applicationStatus',
      'Accepted health receipts must be NOT_APPLICABLE.',
    ));
  }

  if (businessAccepted && application === APPLICATION_NOT_APPLICABLE) {
    errors.push(makeError(
      'PAYLOAD_INVALID',
      'applicationStatus',
      'Accepted business receipts may not be NOT_APPLICABLE.',
    ));
  }

  const activeApplicationStatuses = new Set([
    APPLICATION_STAGED,
    APPLICATION_NEEDS_REVIEW,
    APPLICATION_APPROVED,
    APPLICATION_APPLYING,
    APPLICATION_APPLIED,
    APPLICATION_FAILED,
    APPLICATION_DEAD_LETTER,
  ]);

  if (
    admission !== ADMISSION_ACCEPTED
    && activeApplicationStatuses.has(application)
  ) {
    errors.push(makeError(
      'PAYLOAD_INVALID',
      'applicationStatus',
      'A non-accepted receipt may not claim active or completed application state.',
    ));
  }

  const passiveStatuses = new Set([
    APPLICATION_NOT_APPLICABLE,
    APPLICATION_VALIDATION_FAILED,
    APPLICATION_CANCELLED,
  ]);

  if (
    admission !== ADMISSION_ACCEPTED
    && BRIDGE_CONTRACT_V1.receipt.applicationStatuses.includes(application)
    && !passiveStatuses.has(application)
  ) {
    errors.push(makeError(
      'PAYLOAD_INVALID',
      'applicationStatus',
      'Invalid admission/application status combination.',
    ));
  }

  const normalizedReceipt = deepCloneFreeze({
    contractId: receipt.contractId,
    schemaVersion: receipt.schemaVersion,
    receiptId: receipt.receiptId,
    envelopeId: receipt.envelopeId,
    idempotencyKey: receipt.idempotencyKey,
    traceId: receipt.traceId,
    admissionStatus: receipt.admissionStatus,
    applicationStatus: receipt.applicationStatus,
    receivedAt: receipt.receivedAt,
    processedAt: receipt.processedAt,
    inventoryInstanceId: receipt.inventoryInstanceId,
    environment: receipt.environment,
    operationType: receipt.operationType,
    message: receipt.message,
    errors: Array.isArray(receipt.errors) ? receipt.errors : [],
    warnings: Array.isArray(receipt.warnings) ? receipt.warnings : [],
  });

  return freezeResult({
    valid: errors.length === 0,
    correlated,
    admissionStatus: admission ?? null,
    applicationStatus: application ?? null,
    normalizedReceipt,
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings),
  });
}
