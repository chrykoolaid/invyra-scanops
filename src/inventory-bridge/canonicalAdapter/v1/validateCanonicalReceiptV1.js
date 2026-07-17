/**
 * validateCanonicalReceiptV1.js — Phase 34-E-S
 *
 * Pure canonical Bridge Contract v1 receipt validator.
 *
 * Validates receipt shape, canonical fields, status vocabularies,
 * correlation to a sent envelope, and the semantic rule that a business
 * operation may not be admitted as ACCEPTED + NOT_APPLICABLE. Never persists,
 * applies, dispatches, queues, or mutates.
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

function makeError(code, field, message, retryable = false) {
  return Object.freeze({ code, field, message, retryable });
}

/**
 * Validate a canonical receipt and correlate it to a sent envelope.
 *
 * @param {object} receipt - Receipt candidate (plain object).
 * @param {object} envelope - The envelope that was sent (for correlation).
 * @returns {object} Frozen validation result.
 */
export function validateCanonicalReceiptV1(receipt, envelope) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(receipt)) {
    errors.push(makeError('PAYLOAD_INVALID', 'receipt', 'Receipt must be a plain object.'));
    return freezeResult({
      valid: false,
      correlated: false,
      admissionStatus: null,
      applicationStatus: null,
      normalizedReceipt: null,
      errors,
      warnings,
    });
  }

  if (!isPlainObject(envelope)) {
    errors.push(makeError('PAYLOAD_INVALID', 'envelope', 'Envelope must be a plain object for correlation.'));
    return freezeResult({
      valid: false,
      correlated: false,
      admissionStatus: receipt.admissionStatus ?? null,
      applicationStatus: receipt.applicationStatus ?? null,
      normalizedReceipt: receipt,
      errors,
      warnings,
    });
  }

  // Contract ID
  if (receipt.contractId !== BRIDGE_CONTRACT_V1.contractId) {
    errors.push(makeError('CONTRACT_ID_INVALID', 'contractId', 'Receipt contractId does not match canonical contract.'));
  }

  // Schema version (major must match)
  if (typeof receipt.schemaVersion !== 'string') {
    errors.push(makeError('SCHEMA_VERSION_INVALID', 'schemaVersion', 'Receipt schemaVersion must be a string.'));
  } else {
    const receiptMajor = receipt.schemaVersion.split('.')[0];
    const contractMajor = BRIDGE_CONTRACT_V1.schemaVersion.split('.')[0];
    if (receiptMajor !== contractMajor) {
      errors.push(makeError('SCHEMA_VERSION_INVALID', 'schemaVersion', `Receipt schema major version mismatch: ${receipt.schemaVersion}`));
    }
  }

  // Required fields
  for (const field of BRIDGE_CONTRACT_V1.receipt.requiredFields) {
    if (receipt[field] === undefined || receipt[field] === null || receipt[field] === '') {
      errors.push(makeError('PAYLOAD_INVALID', field, `Receipt field ${field} is required.`));
    }
  }

  // Receipt ID
  if (!receipt.receiptId || typeof receipt.receiptId !== 'string') {
    errors.push(makeError('PAYLOAD_INVALID', 'receiptId', 'Receipt ID must be a non-empty string.'));
  }

  // Admission status
  const admission = receipt.admissionStatus;
  if (!BRIDGE_CONTRACT_V1.receipt.admissionStatuses.includes(admission)) {
    errors.push(makeError('PAYLOAD_INVALID', 'admissionStatus', `Unknown admission status: ${String(admission)}`));
  }

  // Application status
  const application = receipt.applicationStatus;
  if (!BRIDGE_CONTRACT_V1.receipt.applicationStatuses.includes(application)) {
    errors.push(makeError('PAYLOAD_INVALID', 'applicationStatus', `Unknown application status: ${String(application)}`));
  }

  // ISO timestamps
  if (typeof receipt.receivedAt !== 'string' || !ISO_8601_REGEX.test(receipt.receivedAt)) {
    errors.push(makeError('TIMESTAMP_INVALID', 'receivedAt', 'receivedAt must be an ISO-8601 string.'));
  }
  if (typeof receipt.processedAt !== 'string' || !ISO_8601_REGEX.test(receipt.processedAt)) {
    errors.push(makeError('TIMESTAMP_INVALID', 'processedAt', 'processedAt must be an ISO-8601 string.'));
  }

  // Inventory instance
  if (!receipt.inventoryInstanceId || typeof receipt.inventoryInstanceId !== 'string') {
    errors.push(makeError('INVENTORY_INSTANCE_REQUIRED', 'inventoryInstanceId', 'Receipt inventoryInstanceId must be a non-empty string.'));
  }

  // Environment
  if (receipt.environment === 'UNKNOWN') {
    errors.push(makeError('ENVIRONMENT_INVALID', 'environment', 'UNKNOWN environment is invalid.'));
  }
  if (!BRIDGE_CONTRACT_V1.environments.recognized.includes(receipt.environment)) {
    errors.push(makeError('ENVIRONMENT_INVALID', 'environment', `Unrecognized environment: ${String(receipt.environment)}`));
  }
  if (BRIDGE_CONTRACT_V1.environments.blockedRuntime.includes(receipt.environment)) {
    errors.push(makeError('ENVIRONMENT_INVALID', 'environment', `Environment blocked at runtime: ${String(receipt.environment)}`));
  }

  // Operation type
  if (!BRIDGE_CONTRACT_V1.operationTypes.includes(receipt.operationType)) {
    errors.push(makeError('UNSUPPORTED_OPERATION', 'operationType', `Unsupported operation type: ${String(receipt.operationType)}`));
  }

  // Errors array
  if (!Array.isArray(receipt.errors)) {
    errors.push(makeError('PAYLOAD_INVALID', 'errors', 'Receipt errors must be an array.'));
  } else {
    receipt.errors.forEach((entry, idx) => {
      if (!isPlainObject(entry)) {
        errors.push(makeError('PAYLOAD_INVALID', `errors[${idx}]`, 'Each receipt error must be a plain object.'));
        return;
      }
      for (const ef of BRIDGE_CONTRACT_V1.errorObject.requiredFields) {
        if (entry[ef] === undefined || entry[ef] === null || entry[ef] === '') {
          errors.push(makeError('PAYLOAD_INVALID', `errors[${idx}].${ef}`, `Receipt error missing field: ${ef}`));
        }
      }
      if (entry.code && !BRIDGE_CONTRACT_V1.errorObject.coreRegistry.includes(entry.code)) {
        errors.push(makeError('PAYLOAD_INVALID', `errors[${idx}].code`, `Receipt error code not in registry: ${String(entry.code)}`));
      }
      if (entry.retryable !== undefined && typeof entry.retryable !== 'boolean') {
        errors.push(makeError('PAYLOAD_INVALID', `errors[${idx}].retryable`, 'Receipt error retryable must be boolean.'));
      }
    });
  }

  // Warnings array
  if (!Array.isArray(receipt.warnings)) {
    errors.push(makeError('PAYLOAD_INVALID', 'warnings', 'Receipt warnings must be an array.'));
  }

  // Correlation
  let correlated = true;
  if (receipt.envelopeId !== envelope.envelopeId) {
    errors.push(makeError('DUPLICATE_ENVELOPE', 'envelopeId', 'Receipt envelopeId does not match sent envelope.'));
    correlated = false;
  }
  if (receipt.idempotencyKey !== envelope.idempotencyKey) {
    errors.push(makeError('DUPLICATE_ENVELOPE', 'idempotencyKey', 'Receipt idempotencyKey does not match sent envelope.'));
    correlated = false;
  }
  if (receipt.traceId !== envelope.traceId) {
    errors.push(makeError('PAYLOAD_INVALID', 'traceId', 'Receipt traceId does not match sent envelope.'));
    correlated = false;
  }
  if (receipt.operationType !== envelope.operationType) {
    errors.push(makeError('UNSUPPORTED_OPERATION', 'operationType', 'Receipt operationType does not match sent envelope.'));
    correlated = false;
  }
  if (receipt.environment !== envelope.environment) {
    errors.push(makeError('ENVIRONMENT_INVALID', 'environment', 'Receipt environment does not match sent envelope.'));
    correlated = false;
  }
  if (receipt.inventoryInstanceId !== envelope.target.inventoryInstanceId) {
    errors.push(makeError('INVENTORY_INSTANCE_REQUIRED', 'inventoryInstanceId', 'Receipt inventoryInstanceId does not match envelope target.'));
    correlated = false;
  }

  // Semantic rule: ACCEPTED + NOT_APPLICABLE only valid for DEVICE_HEALTH_PING
  if (admission === 'ACCEPTED' && application === 'NOT_APPLICABLE') {
    if (receipt.operationType !== 'DEVICE_HEALTH_PING') {
      errors.push(makeError('PAYLOAD_INVALID', 'applicationStatus', 'Business operation may not be ACCEPTED + NOT_APPLICABLE.'));
    }
  }

  const valid = errors.length === 0;

  const normalizedReceipt = Object.freeze({
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
    errors: Array.isArray(receipt.errors) ? Object.freeze([...receipt.errors]) : [],
    warnings: Array.isArray(receipt.warnings) ? Object.freeze([...receipt.warnings]) : [],
  });

  return freezeResult({
    valid,
    correlated,
    admissionStatus: admission ?? null,
    applicationStatus: application ?? null,
    normalizedReceipt,
    errors,
    warnings,
  });
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