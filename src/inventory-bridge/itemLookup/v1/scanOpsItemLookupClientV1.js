import { SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS } from '../../config/bridgeConfigurationDefaults.js';
import { buildCanonicalEnvelopeV1 } from '../../canonicalAdapter/v1/index.js';
import {
  LOOKUP_OPERATION,
  validateScanOpsItemLookupReceiptV1,
} from './validateScanOpsItemLookupReceiptV1.js';

export const SCANOPS_ITEM_LOOKUP_CLIENT_V1_PHASE = '39-0D';
export const SCANOPS_ITEM_LOOKUP_CLIENT_V1_VERSION = 'scanops-item-lookup-client.v1.0.0';
export const SCANOPS_ITEM_LOOKUP_CLIENT_V1_PATH = '/api/bridge/v1/handoffs';

const ALLOWED_ENVIRONMENTS = Object.freeze(['TEST', 'TRAINING']);
const DEFAULT_TIMEOUT_MS = 4_000;

function asText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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
  if (configuration.port === null) blockers.push('INVENTORY_PORT_REQUIRED');
  return Object.freeze({ allowed: blockers.length === 0, blockers: Object.freeze(blockers) });
}

function blockedResult(configuration, blockers, envelope = null) {
  return cloneFreeze({
    ok: false,
    status: 'BLOCKED',
    reason: blockers[0] || 'LOOKUP_BLOCKED',
    blockers,
    endpoint: configuration.host && configuration.port
      ? `${configuration.protocol}://${configuration.host}:${configuration.port}${SCANOPS_ITEM_LOOKUP_CLIENT_V1_PATH}`
      : null,
    envelopeId: envelope?.envelopeId || null,
    operationType: LOOKUP_OPERATION,
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
    blockedAttempts: 0,
    rejectedAttempts: 0,
    unavailableAttempts: 0,
    timeoutErrors: 0,
  };

  function buildLookupEnvelope(input = {}) {
    const gate = evaluateGate(configuration);
    if (!gate.allowed) {
      metrics.blockedAttempts += 1;
      return Object.freeze({ ok: false, gate, buildResult: null });
    }
    const lookupType = asText(input.lookupType || input.lookup_type).toUpperCase();
    const lookupValue = asText(input.lookupValue || input.lookup_value);
    const blockers = [];
    if (!['BARCODE', 'SKU'].includes(lookupType)) blockers.push('LOOKUP_TYPE_INVALID');
    if (!lookupValue) blockers.push('LOOKUP_VALUE_REQUIRED');
    if (lookupValue.length > 128) blockers.push('LOOKUP_VALUE_TOO_LONG');
    if (!asText(input.operatorId || input.source?.operatorId)) blockers.push('SOURCE_OPERATOR_REQUIRED');
    if (!asText(input.trustReference || input.payload?.trustReference)) blockers.push('TRUST_REFERENCE_REQUIRED');
    if (blockers.length) {
      metrics.blockedAttempts += 1;
      return Object.freeze({
        ok: false,
        gate: Object.freeze({ allowed: false, blockers: Object.freeze(blockers) }),
        buildResult: null,
      });
    }
    const occurredAt = asText(input.occurredAt) || new Date().toISOString();
    const buildResult = buildCanonicalEnvelopeV1({
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
      payload: {
        lookupType,
        lookupValue,
        trustReference: asText(input.trustReference || input.payload?.trustReference),
      },
    });
    return Object.freeze({ ok: buildResult.ok === true, gate, buildResult });
  }

  async function sendItemLookup(input = {}) {
    const built = buildLookupEnvelope(input);
    if (!built.ok) {
      const blockers = built.buildResult?.errors?.map((entry) => entry.code)
        || built.gate?.blockers
        || ['LOOKUP_BLOCKED'];
      return blockedResult(configuration, blockers);
    }
    const envelope = built.buildResult.envelope;
    if (typeof fetchAdapter !== 'function') {
      metrics.blockedAttempts += 1;
      return blockedResult(configuration, ['FETCH_ADAPTER_REQUIRED'], envelope);
    }

    metrics.lookupAttempts += 1;
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
          'X-Invyra-Bridge-Client': 'scanops-item-lookup-client-v1',
          'X-Invyra-Bridge-Phase': SCANOPS_ITEM_LOOKUP_CLIENT_V1_PHASE,
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
        metrics.lookupCorrelations += 1;
        if (validation.normalizedReceipt.result?.found !== true) metrics.lookupNotFound += 1;
        return cloneFreeze({
          ok: true,
          status: validation.normalizedReceipt.result?.found === true ? 'FOUND' : 'ITEM_NOT_FOUND',
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
        status: validation.admissionStatus === 'SERVICE_UNAVAILABLE'
          ? 'AUTHORIZATION_UNAVAILABLE'
          : 'REJECTED',
        reason: validation.normalizedReceipt?.result?.code
          || validation.errors?.[0]?.code
          || receipt?.errors?.[0]?.code
          || 'LOOKUP_REJECTED',
        message: receipt?.message || 'Inventory rejected the read-only item lookup.',
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
        status: timedOut ? 'TIMEOUT' : 'TRANSPORT_ERROR',
        reason: timedOut ? 'LOOKUP_TIMEOUT' : error?.code || 'LOOKUP_TRANSPORT_ERROR',
        message: timedOut
          ? 'Inventory did not answer the item lookup in time.'
          : error?.message || 'Inventory lookup transport failed.',
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
    version: SCANOPS_ITEM_LOOKUP_CLIENT_V1_VERSION,
    endpoint,
    configuration,
    buildLookupEnvelope,
    sendItemLookup,
    getDiagnostics: () => cloneFreeze({
      gate: evaluateGate(configuration),
      metrics,
      receivingIntegrationAuthorized: false,
      inventoryMutationAttempted: false,
      scanOpsMutationAttempted: false,
    }),
  });
}
