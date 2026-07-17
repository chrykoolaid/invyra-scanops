import { SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS } from '../../config/bridgeConfigurationDefaults.js';
import {
  buildCanonicalEnvelopeV1,
  validateCanonicalReceiptV1,
} from '../../canonicalAdapter/v1/index.js';

export const SCANOPS_TEST_TRANSPORT_CLIENT_V1_PHASE = '35-A';
export const SCANOPS_TEST_TRANSPORT_CLIENT_V1_COMPONENT = 'scanops_test_transport_client_v1';
export const SCANOPS_TEST_TRANSPORT_CLIENT_V1_VERSION = 'scanops-test-transport-client.v1.0.0';
export const SCANOPS_TEST_TRANSPORT_CLIENT_V1_PATH = '/api/bridge/v1/handoffs';

const HEALTH_OPERATION = 'DEVICE_HEALTH_PING';
const ALLOWED_ENVIRONMENTS = Object.freeze(['TEST', 'TRAINING']);
const DEFAULT_TIMEOUT_MS = 2_000;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function asPositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function cloneFreeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(cloneFreeze));
  if (isPlainObject(value)) {
    const clone = {};
    for (const [key, item] of Object.entries(value)) clone[key] = cloneFreeze(item);
    return Object.freeze(clone);
  }
  return value;
}

function normalizeConfiguration(options = {}) {
  const configuration = {
    ...SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS,
    ...(options.configuration || {}),
  };
  const environment = asTrimmedString(options.environment || configuration.environment).toUpperCase();
  const host = asTrimmedString(
    options.inventoryHost
      || options.explicitInventoryHost
      || configuration.explicit_inventory_host,
  );
  const port = Number(options.inventoryPort ?? configuration.inventory_port);
  const protocol = asTrimmedString(options.protocol || configuration.protocol).toLowerCase() === 'https'
    ? 'https'
    : 'http';

  return Object.freeze({
    bridgeEnabled: configuration.bridge_enabled === true,
    transportEnabled: configuration.transport_enabled === true,
    environment,
    host,
    port: Number.isInteger(port) && port > 0 && port <= 65_535 ? port : null,
    protocol,
    timeoutMs: asPositiveInteger(
      options.timeoutMs ?? configuration.request_timeout_ms,
      DEFAULT_TIMEOUT_MS,
    ),
  });
}

function evaluateRuntimeGate(configuration, operationType) {
  const blockers = [];
  if (!configuration.bridgeEnabled) blockers.push('BRIDGE_DISABLED');
  if (!configuration.transportEnabled) blockers.push('TRANSPORT_DISABLED');
  if (!ALLOWED_ENVIRONMENTS.includes(configuration.environment)) blockers.push('ENVIRONMENT_BLOCKED');
  if (!configuration.host) blockers.push('EXPLICIT_INVENTORY_HOST_REQUIRED');
  if (configuration.port === null) blockers.push('INVENTORY_PORT_REQUIRED');
  if (operationType !== HEALTH_OPERATION) blockers.push('OPERATION_NOT_ALLOWED');

  return Object.freeze({
    allowed: blockers.length === 0,
    blockers: Object.freeze(blockers),
  });
}

function buildBlockedResult(configuration, gate, envelope = null) {
  return cloneFreeze({
    ok: false,
    status: 'BLOCKED',
    gate,
    endpoint: configuration.host && configuration.port
      ? `${configuration.protocol}://${configuration.host}:${configuration.port}${SCANOPS_TEST_TRANSPORT_CLIENT_V1_PATH}`
      : null,
    envelopeId: envelope?.envelopeId || null,
    operationType: envelope?.operationType || null,
    httpStatus: null,
    dispatchAttempted: false,
    receiptReceived: false,
    receiptValid: false,
    correlated: false,
    timeoutTriggered: false,
    retryScheduled: false,
    replayAttempted: false,
    queueWriteAttempted: false,
    persistenceAttempted: false,
    inventoryMutationAttempted: false,
    scanOpsMutationAttempted: false,
  });
}

function normalizeHealthInput(input = {}, environment, now) {
  const timestamp = asTrimmedString(input.occurredAt) || now();
  return Object.freeze({
    envelopeId: asTrimmedString(input.envelopeId),
    idempotencyKey: asTrimmedString(input.idempotencyKey),
    traceId: asTrimmedString(input.traceId),
    operationType: HEALTH_OPERATION,
    occurredAt: timestamp,
    environment,
    source: Object.freeze({
      deviceId: asTrimmedString(input.deviceId || input.source?.deviceId),
      storeId: asTrimmedString(input.storeId || input.source?.storeId),
      sessionId: asTrimmedString(input.sessionId || input.source?.sessionId),
    }),
    target: Object.freeze({
      inventoryInstanceId: asTrimmedString(
        input.inventoryInstanceId || input.target?.inventoryInstanceId,
      ),
    }),
    payload: cloneFreeze(isPlainObject(input.payload)
      ? input.payload
      : { requestType: 'BRIDGE_HEALTH', clientTime: timestamp }),
  });
}

async function parseResponseJson(response) {
  if (!response || typeof response.text !== 'function') {
    throw Object.assign(new Error('Inventory response body is unavailable.'), { code: 'INVALID_RESPONSE' });
  }
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw Object.assign(new Error('Inventory response is not valid JSON.'), { code: 'INVALID_JSON_RESPONSE' });
  }
}

export function createScanOpsTestTransportClientV1(options = {}) {
  const configuration = normalizeConfiguration(options);
  const fetchAdapter = options.fetchAdapter || globalThis.fetch;
  const now = typeof options.now === 'function' ? options.now : () => new Date().toISOString();
  const endpoint = configuration.host && configuration.port
    ? `${configuration.protocol}://${configuration.host}:${configuration.port}${SCANOPS_TEST_TRANSPORT_CLIENT_V1_PATH}`
    : null;
  const metrics = {
    sendAttempts: 0,
    successfulCorrelations: 0,
    blockedAttempts: 0,
    transportErrors: 0,
    timeoutErrors: 0,
    invalidReceipts: 0,
  };

  function getDiagnostics() {
    const gate = evaluateRuntimeGate(configuration, HEALTH_OPERATION);
    return cloneFreeze({
      component: SCANOPS_TEST_TRANSPORT_CLIENT_V1_COMPONENT,
      version: SCANOPS_TEST_TRANSPORT_CLIENT_V1_VERSION,
      phase: SCANOPS_TEST_TRANSPORT_CLIENT_V1_PHASE,
      endpoint,
      gate,
      metrics,
      runtimeDefaultsRemainDisabled:
        SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS.bridge_enabled === false
        && SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS.transport_enabled === false,
      discoveryAttempted: false,
      pairingAttempted: false,
      authenticationStateCreated: false,
      queueWriteAttempted: false,
      persistenceAttempted: false,
      automaticRetryScheduled: false,
      replayAttempted: false,
      inventoryMutationAttempted: false,
      scanOpsMutationAttempted: false,
    });
  }

  function buildHealthEnvelope(input = {}) {
    const gate = evaluateRuntimeGate(configuration, HEALTH_OPERATION);
    if (!gate.allowed) {
      metrics.blockedAttempts += 1;
      return Object.freeze({ ok: false, gate, buildResult: null });
    }
    const buildResult = buildCanonicalEnvelopeV1(normalizeHealthInput(input, configuration.environment, now));
    return Object.freeze({ ok: buildResult.ok === true, gate, buildResult });
  }

  async function sendEnvelope(envelope) {
    const operationType = asTrimmedString(envelope?.operationType).toUpperCase();
    const gate = evaluateRuntimeGate(configuration, operationType);
    if (!gate.allowed) {
      metrics.blockedAttempts += 1;
      return buildBlockedResult(configuration, gate, envelope);
    }
    if (typeof fetchAdapter !== 'function') {
      metrics.blockedAttempts += 1;
      return buildBlockedResult(
        configuration,
        Object.freeze({ allowed: false, blockers: Object.freeze(['FETCH_ADAPTER_REQUIRED']) }),
        envelope,
      );
    }

    metrics.sendAttempts += 1;
    const controller = new AbortController();
    let timeoutTriggered = false;
    const timeout = setTimeout(() => {
      timeoutTriggered = true;
      controller.abort();
    }, configuration.timeoutMs);

    try {
      const response = await fetchAdapter(endpoint, {
        method: 'POST',
        headers: Object.freeze({
          'Content-Type': 'application/json',
          'X-Invyra-Bridge-Client': SCANOPS_TEST_TRANSPORT_CLIENT_V1_COMPONENT,
          'X-Invyra-Bridge-Phase': SCANOPS_TEST_TRANSPORT_CLIENT_V1_PHASE,
        }),
        body: JSON.stringify(envelope),
        signal: controller.signal,
      });
      const payload = await parseResponseJson(response);

      if (!response.ok) {
        return cloneFreeze({
          ok: false,
          status: 'HTTP_ERROR',
          gate,
          endpoint,
          envelopeId: envelope.envelopeId,
          operationType,
          httpStatus: response.status,
          dispatchAttempted: true,
          receiptReceived: true,
          receiptValid: false,
          correlated: false,
          timeoutTriggered: false,
          response: payload,
          retryScheduled: false,
          replayAttempted: false,
          queueWriteAttempted: false,
          persistenceAttempted: false,
          inventoryMutationAttempted: false,
          scanOpsMutationAttempted: false,
        });
      }

      const receiptValidation = validateCanonicalReceiptV1(payload, envelope);
      if (receiptValidation.valid !== true || receiptValidation.correlated !== true) {
        metrics.invalidReceipts += 1;
        return cloneFreeze({
          ok: false,
          status: 'RECEIPT_INVALID',
          gate,
          endpoint,
          envelopeId: envelope.envelopeId,
          operationType,
          httpStatus: response.status,
          dispatchAttempted: true,
          receiptReceived: true,
          receiptValid: receiptValidation.valid === true,
          correlated: receiptValidation.correlated === true,
          timeoutTriggered: false,
          receipt: payload,
          receiptValidation,
          retryScheduled: false,
          replayAttempted: false,
          queueWriteAttempted: false,
          persistenceAttempted: false,
          inventoryMutationAttempted: false,
          scanOpsMutationAttempted: false,
        });
      }

      metrics.successfulCorrelations += 1;
      return cloneFreeze({
        ok: true,
        status: 'CORRELATED',
        gate,
        endpoint,
        envelopeId: envelope.envelopeId,
        operationType,
        httpStatus: response.status,
        dispatchAttempted: true,
        receiptReceived: true,
        receiptValid: true,
        correlated: true,
        timeoutTriggered: false,
        admissionStatus: receiptValidation.admissionStatus,
        applicationStatus: receiptValidation.applicationStatus,
        receipt: receiptValidation.normalizedReceipt,
        retryScheduled: false,
        replayAttempted: false,
        queueWriteAttempted: false,
        persistenceAttempted: false,
        inventoryMutationAttempted: false,
        scanOpsMutationAttempted: false,
      });
    } catch (error) {
      const timedOut = timeoutTriggered || error?.name === 'AbortError';
      metrics.transportErrors += 1;
      if (timedOut) metrics.timeoutErrors += 1;
      return cloneFreeze({
        ok: false,
        status: timedOut ? 'TIMEOUT' : 'TRANSPORT_ERROR',
        gate,
        endpoint,
        envelopeId: envelope?.envelopeId || null,
        operationType,
        httpStatus: null,
        dispatchAttempted: true,
        receiptReceived: false,
        receiptValid: false,
        correlated: false,
        timeoutTriggered: timedOut,
        error: error?.message || 'Transport request failed.',
        retryScheduled: false,
        replayAttempted: false,
        queueWriteAttempted: false,
        persistenceAttempted: false,
        inventoryMutationAttempted: false,
        scanOpsMutationAttempted: false,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  async function sendHealthPing(input = {}) {
    const built = buildHealthEnvelope(input);
    if (!built.ok) {
      if (built.buildResult) {
        return cloneFreeze({
          ...buildBlockedResult(configuration, built.gate),
          status: 'ENVELOPE_INVALID',
          envelopeErrors: built.buildResult.errors,
        });
      }
      return buildBlockedResult(configuration, built.gate);
    }
    return sendEnvelope(built.buildResult.envelope);
  }

  return Object.freeze({
    component: SCANOPS_TEST_TRANSPORT_CLIENT_V1_COMPONENT,
    version: SCANOPS_TEST_TRANSPORT_CLIENT_V1_VERSION,
    configuration,
    endpoint,
    buildHealthEnvelope,
    sendEnvelope,
    sendHealthPing,
    getDiagnostics,
  });
}
