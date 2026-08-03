import { BRIDGE_CONTRACT_V1 } from '../../canonicalContract/v1/bridgeContractV1.js';
import { validateCanonicalReceiptV1 } from '../../canonicalAdapter/v1/validateCanonicalReceiptV1.js';

const LOOKUP_OPERATION = 'LOOKUP_REQUEST';
const HEALTH_OPERATION = 'DEVICE_HEALTH_PING';
export const ITEM_SEARCH_OPERATION = 'ITEM_SEARCH_REQUEST';
export const ITEM_VIEW_OPERATION = 'ITEM_VIEW_REQUEST';
export const EXACT_LOOKUP_TYPES = Object.freeze(['BARCODE', 'SKU', 'CANONICAL_ID']);
const ZERO_MUTATION_KEYS = Object.freeze([
  'inventory', 'stock', 'ledger', 'item_master', 'pricing', 'purchase_order', 'receiving',
]);
const ZERO_MUTATION_KEY_SET = new Set(ZERO_MUTATION_KEYS);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
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

function requestedOperation(envelope) {
  return asText(envelope?.payload?.operation).toUpperCase();
}

function validateMutationCounts(result, errors) {
  if (!isPlainObject(result?.mutationCounts)) {
    errors.push(makeError('Item read mutation evidence is required.', 'result.mutationCounts'));
    return;
  }
  const suppliedKeys = Object.keys(result.mutationCounts);
  for (const key of ZERO_MUTATION_KEYS) {
    if (result.mutationCounts[key] !== 0) {
      errors.push(makeError(`Item read mutation count ${key} must be the number zero.`, `result.mutationCounts.${key}`));
    }
  }
  for (const key of suppliedKeys) {
    if (!ZERO_MUTATION_KEY_SET.has(key)) {
      errors.push(makeError(`Unexpected item read mutation counter ${key} is not allowed.`, `result.mutationCounts.${key}`));
    }
  }
  if (suppliedKeys.length !== ZERO_MUTATION_KEYS.length) {
    errors.push(makeError('Item read mutation evidence must contain exactly the approved counters.', 'result.mutationCounts'));
  }
}

function validateExactLookupResult(result, envelope, errors) {
  if (typeof result.found !== 'boolean') {
    errors.push(makeError('Lookup result found must be boolean.', 'result.found'));
  }
  const expectedType = asText(envelope?.payload?.lookupType || envelope?.payload?.lookup_type).toUpperCase();
  const expectedValue = asText(envelope?.payload?.lookupValue || envelope?.payload?.lookup_value);
  if (!EXACT_LOOKUP_TYPES.includes(result.lookupType)) {
    errors.push(makeError('Lookup result type must be BARCODE, SKU, or CANONICAL_ID.', 'result.lookupType'));
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
}

function validateSearchCandidate(candidate, index, errors) {
  if (!isPlainObject(candidate)) {
    errors.push(makeError('Every item-search candidate must be a plain object.', `result.results.${index}`));
    return;
  }
  if (!asText(candidate.canonicalItemId)) {
    errors.push(makeError('Every item-search candidate requires canonicalItemId.', `result.results.${index}.canonicalItemId`));
  }
  if (!asText(candidate.itemName)) {
    errors.push(makeError('Every item-search candidate requires itemName.', `result.results.${index}.itemName`));
  }
}

function validateItemSearchResult(result, envelope, errors, accepted) {
  const request = envelope?.payload?.payload;
  const expectedQuery = asText(request?.query);
  if (result.operation !== ITEM_SEARCH_OPERATION) {
    errors.push(makeError('Item-search result operation is invalid.', 'result.operation'));
  }
  if (typeof result.found !== 'boolean') {
    errors.push(makeError('Item-search result found must be boolean.', 'result.found'));
  }
  if (result.searchType !== 'NAME') {
    errors.push(makeError('Item-search result searchType must be NAME.', 'result.searchType'));
  }
  if (asText(result.query) !== expectedQuery) {
    errors.push(makeError('Item-search result query does not match the request.', 'result.query'));
  }
  if (!Array.isArray(result.results)) {
    errors.push(makeError('Item-search result candidates must be an array.', 'result.results'));
  } else {
    result.results.forEach((candidate, index) => validateSearchCandidate(candidate, index, errors));
  }

  if (!accepted) {
    if (Array.isArray(result.results) && result.results.length !== 0) {
      errors.push(makeError('Unavailable item-search results must be empty.', 'result.results'));
    }
    return;
  }

  if (result.catalogueEnvironment !== 'LIVE') {
    errors.push(makeError('Item-search catalogueEnvironment must be LIVE.', 'result.catalogueEnvironment'));
  }
  if (result.autoSelected !== false) {
    errors.push(makeError('Item-search must never auto-select a candidate.', 'result.autoSelected'));
  }
  if (!Number.isInteger(result.matchCount) || result.matchCount < 0) {
    errors.push(makeError('Item-search matchCount must be a non-negative integer.', 'result.matchCount'));
  }
  const resultLimit = positiveInteger(result.resultLimit);
  if (resultLimit === null || resultLimit > 20) {
    errors.push(makeError('Item-search resultLimit must be between 1 and 20.', 'result.resultLimit'));
  }
  if (positiveInteger(result.page) === null) {
    errors.push(makeError('Item-search page must be a positive integer.', 'result.page'));
  }
  if (positiveInteger(result.totalPages) === null) {
    errors.push(makeError('Item-search totalPages must be a positive integer.', 'result.totalPages'));
  }
}

function validateItemViewResult(result, envelope, errors, accepted) {
  const expectedItemId = asText(
    envelope?.payload?.payload?.canonical_item_id
    || envelope?.payload?.payload?.canonicalItemId,
  );
  if (result.operation !== ITEM_VIEW_OPERATION) {
    errors.push(makeError('Item-view result operation is invalid.', 'result.operation'));
  }
  if (typeof result.found !== 'boolean') {
    errors.push(makeError('Item-view result found must be boolean.', 'result.found'));
  }
  if (asText(result.canonicalItemId) !== expectedItemId) {
    errors.push(makeError('Item-view canonicalItemId does not match the request.', 'result.canonicalItemId'));
  }
  if (result.found === true) {
    if (!isPlainObject(result.item)) {
      errors.push(makeError('A found item view must include an item projection.', 'result.item'));
    } else {
      if (asText(result.item.canonicalItemId) !== expectedItemId) {
        errors.push(makeError('Item-view projection identity does not match the request.', 'result.item.canonicalItemId'));
      }
      if (!asText(result.item.itemName)) {
        errors.push(makeError('Item-view projection requires itemName.', 'result.item.itemName'));
      }
    }
  } else if (result.item !== null) {
    errors.push(makeError('A not-found item view must return item as null.', 'result.item'));
  }
  if (accepted && result.catalogueEnvironment !== 'LIVE') {
    errors.push(makeError('Item-view catalogueEnvironment must be LIVE.', 'result.catalogueEnvironment'));
  }
}

function validateResult(result, envelope, errors, accepted) {
  if (!isPlainObject(result)) {
    errors.push(makeError('Lookup receipt result must be a plain object.'));
    return;
  }

  const operation = requestedOperation(envelope);
  if (operation === ITEM_SEARCH_OPERATION) {
    validateItemSearchResult(result, envelope, errors, accepted);
  } else if (operation === ITEM_VIEW_OPERATION) {
    validateItemViewResult(result, envelope, errors, accepted);
  } else {
    validateExactLookupResult(result, envelope, errors);
  }
  validateMutationCounts(result, errors);
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

  const accepted = isPlainObject(receipt) && receipt.admissionStatus === 'ACCEPTED';
  if (accepted) {
    if (receipt.applicationStatus !== 'NOT_APPLICABLE') {
      errors.push(makeError('Read-only lookup application status must be NOT_APPLICABLE.', 'applicationStatus'));
    }
    validateResult(receipt.result, envelope, errors, true);
  } else if (isPlainObject(receipt) && receipt.result !== undefined) {
    validateResult(receipt.result, envelope, errors, false);
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
