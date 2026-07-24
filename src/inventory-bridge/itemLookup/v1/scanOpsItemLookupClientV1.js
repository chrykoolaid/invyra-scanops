import { SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS } from '../../config/bridgeConfigurationDefaults.js';
import { buildCanonicalEnvelopeV1 } from '../../canonicalAdapter/v1/index.js';
import { isAllowedLocalInventoryHost } from '../../pairing/browser/v1/scanOpsBrowserPairingClientV1.js';
import {
  ITEM_SEARCH_OPERATION,
  ITEM_VIEW_OPERATION,
  LOOKUP_OPERATION,
  validateScanOpsItemLookupReceiptV1,
} from './validateScanOpsItemLookupReceiptV1.js';

export const SCANOPS_ITEM_LOOKUP_CLIENT_V1_PHASE = '39-0D';
export const SCANOPS_ITEM_LOOKUP_CLIENT_V1_VERSION = 'scanops-item-lookup-client.v1.1.0';
export const SCANOPS_ITEM_READ_CLIENT_V1_PHASE = '39-0F5';
export const SCANOPS_ITEM_LOOKUP_CLIENT_V1_PATH = '/api/bridge/v1/handoffs';

const ALLOWED_ENVIRONMENTS = Object.freeze(['TEST', 'TRAINING']);
const ALLOWED_ITEM_READ_ROLES = Object.freeze(['staff', 'supervisor', 'manager', 'admin', 'owner']);
const DEFAULT_TIMEOUT_MS = 4_000;

function asText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function positiveInteger(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(maximum, parsed) : fallback;
}

function cloneFreeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(cloneFreeze));
  if (isPlainObject(value)) {
    return Object.freeze(Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneFreeze(item)]),
    ));
  }
  return value;
}

function normalizeConfiguration(options = {}) {
  const configuration = {
    ...SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS,
    ...(options.configuration || {}),
  };
  const environment = asText(options.environment || configuration.environment).toUpperCase();
  const host = asText(options.inventoryHost || configuration.explicit_inventory_host);
  const port = Number(options.inventoryPort ?? configuration.inventory_port);
  const protocol = asText(options.protocol || configuration.protocol).toLowerCase() === 'https'
    ? 'https'
    : 'http';
  const timeout = Number(options.timeoutMs ?? configuration.request_timeout_ms);
  return Object.freeze({
    bridgeEnabled: configuration.bridge_enabled === true,
    transportEnabled: configuration.transport_enabled === true,
    environment,
    host,
    port: Number.isInteger(port) && port > 0 && port <= 65_535 ? port : null,
    protocol,
    timeoutMs: Number.isInteger(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS,
  });
}

function evaluateGate(configuration) {
  const blockers = [];
  if (!configuration.bridgeEnabled) blockers.push('BRIDGE_DISABLED');
  if (!configuration.transportEnabled) blockers.push('TRANSPORT_DISABLED');
  if (!ALLOWED_ENVIRONMENTS.includes(configuration.environment)) blockers.push('ENVIRONMENT_BLOCKED');
  if (!configuration.host) blockers.push('EXPLICIT_INVENTORY_HOST_REQUIRED');
  else if (!isAllowedLocalInventoryHost(configuration.host)) blockers.push('INVENTORY_HOST_NOT_LOCAL');
  if (configuration.protocol !== 'http') blockers.push('LOOKUP_PROTOCOL_NOT_LOCAL_HTTP');
  if (configuration.port === null) blockers.push('INVENTORY_PORT_REQUIRED');
  return Object.freeze({ allowed: blockers.length === 0, blockers: Object.freeze(blockers) });
}

function blockedResult(configuration, blockers, envelope = null, operation = null) {
  return cloneFreeze({
    ok: false,
    kind: operation || 'ITEM_LOOKUP',
    status: 'BLOCKED',
    reason: blockers[0] || 'LOOKUP_BLOCKED',
    blockers,
    endpoint: configuration.host && configuration.port
      ? `${configuration.protocol}://${configuration.host}:${configuration.port}${SCANOPS_ITEM_LOOKUP_CLIENT_V1_PATH}`
      : null,
    envelopeId: envelope?.envelopeId || null,
    operationType: LOOKUP_OPERATION,
    itemReadOperation: operation,
    dispatchAttempted: false,
    receiptReceived: false,
    receiptValid: false,
    correlated: false,
    timeoutTriggered: false,
    persistenceAttempted: false,
    queueWriteAttempted: false,
    inventoryMutationAttempted: false,
    scanOpsMutationAttempted: false,
  });
}

async function parseResponse(response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch {
    throw Object.assign(new Error('Inventory lookup response is not valid JSON.'), {
      code: 'INVALID_JSON_RESPONSE',
    });
  }
}

function commonInputBlockers(input) {
  const blockers = [];
  if (!asText(input.operatorId || input.source?.operatorId)) blockers.push('SOURCE_OPERATOR_REQUIRED');
  if (!asText(input.trustReference || input.payload?.trustReference)) blockers.push('TRUST_REFERENCE_REQUIRED');
  return blockers;
}

export function createScanOpsItemLookupClientV1(options = {}) {
  const configuration = normalizeConfiguration(options);
  const fetchAdapter = options.fetchAdapter || globalThis.fetch;
  const endpoint = configuration.host && configuration.port
    ? `${configuration.protocol}://${configuration.host}:${configuration.port}${SCANOPS_ITEM_LOOKUP_CLIENT_V1_PATH}`
    : null;
  const metrics = {
    lookupAttempts: 0,
    lookupCorrelations: 0,
    lookupNotFound: 0,
    searchAttempts: 0,
    searchCorrelations: 0,
    searchNoResults: 0,
    viewAttempts: 0,
    viewCorrelations: 0,
    viewNotFound: 0,
    blockedAttempts: 0,
    rejectedAttempts: 0,
    unavailableAttempts: 0,
    timeoutErrors: 0,
  };

  function buildEnvelope(input, payload, phase) {
    const occurredAt = asText(input.occurredAt) || new Date().toISOString();
    return buildCanonicalEnvelopeV1({
      envelopeId: asText(input.envelopeId),
      idempotencyKey: asText(input.idempotencyKey),
      traceId: asText(input.traceId),
      operationType: LOOKUP_OPERATION,
      occurredAt,
      environment: configuration.environment,
      source: {
        deviceId: asText(input.deviceId || input.source?.deviceId),
        storeId: asText(input.storeId || input.source?.storeId),
        sessionId: asText(input.sessionId || input.source?.sessionId),
        operatorId: asText(input.operatorId || input.source?.operatorId),
      },
      target: {
        inventoryInstanceId: asText(input.inventoryInstanceId || input.target?.inventoryInstanceId),
      },
      payload,
      metadata: { clientPhase: phase },
    });
  }

  function guardedBuild(input, payload, blockers, phase, operation = null) {
    const gate = evaluateGate(configuration);
    if (!gate.allowed) {
      metrics.blockedAttempts += 1;
      return Object.freeze({ ok: false, gate, buildResult: null, operation });
    }
    if (blockers.length) {
      metrics.blockedAttempts += 1;
      return Object.freeze({
        ok: false,
        gate: Object.freeze({ allowed: false, blockers: Object.freeze(blockers) }),
        buildResult: null,
        operation,
      });
    }
    const buildResult = buildEnvelope(input, payload, phase);
    return Object.freeze({ ok: buildResult.ok === true, gate, buildResult, operation });
  }

  function buildLookupEnvelope(input = {}) {
    const lookupType = asText(input.lookupType || input.lookup_type).toUpperCase();
    const lookupValue = asText(input.lookupValue || input.lookup_value);
    const blockers = commonInputBlockers(input);
    if (!['BARCODE', 'SKU'].includes(lookupType)) blockers.push('LOOKUP_TYPE_INVALID');
    if (!lookupValue) blockers.push('LOOKUP_VALUE_REQUIRED');
    if (lookupValue.length > 128) blockers.push('LOOKUP_VALUE_TOO_LONG');
    return guardedBuild(input, {
      lookupType,
      lookupValue,
      trustReference: asText(input.trustReference || input.payload?.trustReference),
    }, blockers, SCANOPS_ITEM_LOOKUP_CLIENT_V1_PHASE, null);
  }

  function buildItemSearchEnvelope(input = {}) {
    const query = asText(input.query);
    const operatorRole = asText(input.operatorRole || input.operator_role).toLowerCase();
    const blockers = commonInputBlockers(input);
    if (!ALLOWED_ITEM_READ_ROLES.includes(operatorRole)) blockers.push('ITEM_READ_ROLE_BLOCKED');
    if (!query) blockers.push('ITEM_SEARCH_QUERY_REQUIRED');
    if (query.length > 128) blockers.push('ITEM_SEARCH_QUERY_TOO_LONG');
    if (/[\x00-\x1F\x7F]/.test(query)) blockers.push('ITEM_SEARCH_QUERY_INVALID');
    const page = positiveInteger(input.page, 1);
    const limit = positiveInteger(input.limit || input.resultLimit || input.result_limit, 20, 20);
    return guardedBuild(input, {
      trustReference: asText(input.trustReference || input.payload?.trustReference),
      operation: ITEM_SEARCH_OPERATION,
      operator_role: operatorRole,
      payload: {
        search_type: 'NAME',
        query,
        page,
        limit,
      },
    }, blockers, SCANOPS_ITEM_READ_CLIENT_V1_PHASE, ITEM_SEARCH_OPERATION);
  }

  function buildItemViewEnvelope(input = {}) {
    const canonicalItemId = asText(input.canonicalItemId || input.canonical_item_id);
    const operatorRole = asText(input.operatorRole || input.operator_role).toLowerCase();
    const blockers = commonInputBlockers(input);
    if (!ALLOWED_ITEM_READ_ROLES.includes(operatorRole)) blockers.push('ITEM_READ_ROLE_BLOCKED');
    if (!canonicalItemId) blockers.push('ITEM_VIEW_ID_REQUIRED');
    if (canonicalItemId.length > 128) blockers.push('ITEM_VIEW_ID_TOO_LONG');
    return guardedBuild(input, {
      trustReference: asText(input.trustReference || input.payload?.trustReference),
      operation: ITEM_VIEW_OPERATION,
      operator_role: operatorRole,
      payload: {
        canonical_item_id: canonicalItemId,
      },
    }, blockers, SCANOPS_ITEM_READ_CLIENT_V1_PHASE, ITEM_VIEW_OPERATION);
  }

  function acceptedStatus(operation, result) {
    if (operation === ITEM_SEARCH_OPERATION) {
      return result?.found === true ? 'SEARCH_RESULTS' : 'NO_RESULTS';
    }
    if (operation === ITEM_VIEW_OPERATION) {
      return result?.found === true ? 'ITEM_VIEW_READY' : 'ITEM_NOT_FOUND';
    }
    return result?.found === true ? 'FOUND' : 'ITEM_NOT_FOUND';
  }

  function metricPrefix(operation) {
    if (operation === ITEM_SEARCH_OPERATION) return 'search';
    if (operation === ITEM_VIEW_OPERATION) return 'view';
    return 'lookup';
  }

  async function sendBuilt(built) {
    if (!built.ok) {
      const blockers = built.buildResult?.errors?.map((entry) => entry.code)
        || built.gate?.blockers
        || ['LOOKUP_BLOCKED'];
      return blockedResult(configuration, blockers, null, built.operation);
    }
    const envelope = built.buildResult.envelope;
    if (typeof fetchAdapter !== 'function') {
      metrics.blockedAttempts += 1;
      return blockedResult(configuration, ['FETCH_ADAPTER_REQUIRED'], envelope, built.operation);
    }

    const prefix = metricPrefix(built.operation);
    metrics[`${prefix}Attempts`] += 1;
    const controller = new AbortController();
    let timeoutTriggered = false;
    const timer = setTimeout(() => {
      timeoutTriggered = true;
      controller.abort();
    }, configuration.timeoutMs);

    try {
      const response = await fetchAdapter(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Invyra-Bridge-Client': built.operation
            ? 'scanops-item-read-client-v1'
            : 'scanops-item-lookup-client-v1',
          'X-Invyra-Bridge-Phase': built.operation
            ? SCANOPS_ITEM_READ_CLIENT_V1_PHASE
            : SCANOPS_ITEM_LOOKUP_CLIENT_V1_PHASE,
        },
        body: JSON.stringify(envelope),
        signal: controller.signal,
      });
      const receipt = await parseResponse(response);
      const validation = validateScanOpsItemLookupReceiptV1(receipt, envelope);
      const accepted = response.ok
        && validation.valid === true
        && validation.correlated === true
        && validation.admissionStatus === 'ACCEPTED';

      if (accepted) {
        metrics[`${prefix}Correlations`] += 1;
        if (validation.normalizedReceipt.result?.found !== true) {
          if (prefix === 'search') metrics.searchNoResults += 1;
          else metrics[`${prefix}NotFound`] += 1;
        }
        return cloneFreeze({
          ok: true,
          kind: built.operation || 'ITEM_LOOKUP',
          status: acceptedStatus(built.operation, validation.normalizedReceipt.result),
          endpoint,
          envelopeId: envelope.envelopeId,
          httpStatus: response.status,
          dispatchAttempted: true,
          receiptReceived: true,
          receiptValid: true,
          correlated: true,
          admissionStatus: validation.admissionStatus,
          applicationStatus: validation.applicationStatus,
          receipt: validation.normalizedReceipt,
          result: validation.normalizedReceipt.result,
          timeoutTriggered: false,
          persistenceAttempted: false,
          queueWriteAttempted: false,
          inventoryMutationAttempted: false,
          scanOpsMutationAttempted: false,
        });
      }

      if (validation.admissionStatus === 'SERVICE_UNAVAILABLE' || response.status === 503) {
        metrics.unavailableAttempts += 1;
      } else {
        metrics.rejectedAttempts += 1;
      }
      return cloneFreeze({
        ok: false,
        kind: built.operation || 'ITEM_LOOKUP',
        status: validation.admissionStatus === 'SERVICE_UNAVAILABLE'
          ? 'AUTHORIZATION_UNAVAILABLE'
          : 'REJECTED',
        reason: validation.normalizedReceipt?.result?.code
          || validation.errors?.[0]?.code
          || receipt?.errors?.[0]?.code
          || 'LOOKUP_REJECTED',
        message: receipt?.message || 'Inventory rejected the read-only item request.',
        endpoint,
        envelopeId: envelope.envelopeId,
        httpStatus: response.status,
        dispatchAttempted: true,
        receiptReceived: true,
        receiptValid: validation.valid === true,
        correlated: validation.correlated === true,
        admissionStatus: validation.admissionStatus,
        applicationStatus: validation.applicationStatus,
        receipt: validation.normalizedReceipt,
        result: validation.normalizedReceipt?.result || null,
        validationErrors: validation.errors,
        timeoutTriggered: false,
        persistenceAttempted: false,
        queueWriteAttempted: false,
        inventoryMutationAttempted: false,
        scanOpsMutationAttempted: false,
      });
    } catch (error) {
      const timedOut = timeoutTriggered || error?.name === 'AbortError';
      if (timedOut) metrics.timeoutErrors += 1;
      return cloneFreeze({
        ok: false,
        kind: built.operation || 'ITEM_LOOKUP',
        status: timedOut ? 'TIMEOUT' : 'TRANSPORT_ERROR',
        reason: timedOut ? 'LOOKUP_TIMEOUT' : error?.code || 'LOOKUP_TRANSPORT_ERROR',
        message: timedOut
          ? 'Inventory did not answer the item request in time.'
          : error?.message || 'Inventory item-read transport failed.',
        endpoint,
        envelopeId: envelope.envelopeId,
        httpStatus: null,
        dispatchAttempted: true,
        receiptReceived: false,
        receiptValid: false,
        correlated: false,
        timeoutTriggered: timedOut,
        persistenceAttempted: false,
        queueWriteAttempted: false,
        inventoryMutationAttempted: false,
        scanOpsMutationAttempted: false,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  return Object.freeze({
    phase: SCANOPS_ITEM_LOOKUP_CLIENT_V1_PHASE,
    itemReadPhase: SCANOPS_ITEM_READ_CLIENT_V1_PHASE,
    version: SCANOPS_ITEM_LOOKUP_CLIENT_V1_VERSION,
    endpoint,
    configuration,
    buildLookupEnvelope,
    buildItemSearchEnvelope,
    buildItemViewEnvelope,
    sendItemLookup: (input = {}) => sendBuilt(buildLookupEnvelope(input)),
    sendItemSearch: (input = {}) => sendBuilt(buildItemSearchEnvelope(input)),
    sendItemView: (input = {}) => sendBuilt(buildItemViewEnvelope(input)),
    getDiagnostics: () => cloneFreeze({
      gate: evaluateGate(configuration),
      metrics,
      receivingIntegrationAuthorized: false,
      inventoryMutationAttempted: false,
      scanOpsMutationAttempted: false,
    }),
  });
}
