import { BRIDGE_CONTRACT_V1 } from '../../canonicalContract/v1/bridgeContractV1.js';
import { validateCanonicalReceiptV1 } from '../../canonicalAdapter/v1/validateCanonicalReceiptV1.js';

const LOOKUP_OPERATION = 'LOOKUP_REQUEST';
const HEALTH_OPERATION = 'DEVICE_HEALTH_PING';
const ZERO_MUTATION_KEYS = Object.freeze([
  'inventory', 'stock', 'ledger', 'item_master', 'pricing', 'purchase_order', 'receiving',
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function deepCloneFreeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(deepCloneFreeze));
  if (isPlainObject(value)) {
    return Object.freeze(Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, deepCloneFreeze(item)]),
    ));
  }
  return value;
}

function makeError(message, field = 'result') {
  return Object.freeze({
    code: 'PAYLOAD_INVALID',
    message,
    field,
    retryable: false,
  });
}

function validateResult(result, envelope, errors) {
  if (!isPlainObject(result)) {
    errors.push(makeError('Lookup receipt result must be a plain object.'));
    return;
  }
  if (typeof result.found !== 'boolean') {
    errors.push(makeError('Lookup result found must be boolean.', 'result.found'));
  }
  const expectedType = asText(envelope?.payload?.lookupType || envelope?.payload?.lookup_type).toUpperCase();
  const expectedValue = asText(envelope?.payload?.lookupValue || envelope?.payload?.lookup_value);
  if (!['BARCODE', 'SKU'].includes(result.lookupType)) {
    errors.push(makeError('Lookup result type must be BARCODE or SKU.', 'result.lookupType'));
  } else if (result.lookupType !== expectedType) {
    errors.push(makeError('Lookup result type does not match the request.', 'result.lookupType'));
  }
  if (asText(result.lookupValue) !== expectedValue) {
    errors.push(makeError('Lookup result value does not match the request.', 'result.lookupValue'));
  }
  if (result.found === true && !isPlainObject(result.item)) {
    errors.push(makeError('A found lookup must include an item projection.', 'result.item'));
  }
  if (result.found === false && result.item !== null) {
    errors.push(makeError('A not-found lookup must return item as null.', 'result.item'));
  }
  if (!isPlainObject(result.mutationCounts)) {
    errors.push(makeError('Lookup mutation evidence is required.', 'result.mutationCounts'));
  } else {
    for (const key of ZERO_MUTATION_KEYS) {
      if (Number(result.mutationCounts[key]) !== 0) {
        errors.push(makeError(`Lookup mutation count ${key} must remain zero.`, `result.mutationCounts.${key}`));
      }
    }
  }
}

export function validateScanOpsItemLookupReceiptV1(receipt, envelope) {
  const errors = [];
  if (!isPlainObject(envelope) || envelope.operationType !== LOOKUP_OPERATION) {
    errors.push(makeError('A LOOKUP_REQUEST envelope is required.', 'envelope.operationType'));
  }
  if (!isPlainObject(receipt) || receipt.operationType !== LOOKUP_OPERATION) {
    errors.push(makeError('A LOOKUP_REQUEST receipt is required.', 'operationType'));
  }

  const mappedEnvelope = isPlainObject(envelope)
    ? { ...envelope, operationType: HEALTH_OPERATION }
    : envelope;
  const mappedReceipt = isPlainObject(receipt)
    ? { ...receipt, operationType: HEALTH_OPERATION, applicationStatus: 'NOT_APPLICABLE' }
    : receipt;
  const core = validateCanonicalReceiptV1(mappedReceipt, mappedEnvelope);
  errors.push(...core.errors);

  if (isPlainObject(receipt) && receipt.admissionStatus === 'ACCEPTED') {
    if (receipt.applicationStatus !== 'NOT_APPLICABLE') {
      errors.push(makeError('Read-only lookup application status must be NOT_APPLICABLE.', 'applicationStatus'));
    }
    validateResult(receipt.result, envelope, errors);
  } else if (isPlainObject(receipt) && receipt.result !== undefined) {
    validateResult(receipt.result, envelope, errors);
  }

  const normalizedReceipt = core.normalizedReceipt && isPlainObject(receipt)
    ? deepCloneFreeze({
      ...core.normalizedReceipt,
      operationType: LOOKUP_OPERATION,
      applicationStatus: receipt.applicationStatus,
      result: receipt.result,
    })
    : null;

  return Object.freeze({
    valid: errors.length === 0,
    correlated: core.correlated === true,
    admissionStatus: receipt?.admissionStatus || null,
    applicationStatus: receipt?.applicationStatus || null,
    normalizedReceipt,
    errors: Object.freeze(errors),
    warnings: Object.freeze(core.warnings || []),
    inventoryMutationAttempted: false,
    scanOpsMutationAttempted: false,
    persistenceAttempted: false,
    queueWriteAttempted: false,
  });
}

export { LOOKUP_OPERATION, BRIDGE_CONTRACT_V1 };
