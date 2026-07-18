import { createHash } from 'node:crypto';
import { canonicalizeBridgeContractV1 } from '../../canonicalContract/v1/canonicalizeBridgeContractV1.js';

export const SCANOPS_RELIABLE_DELIVERY_V1_PHASE = '37-A';
export const SCANOPS_RELIABLE_DELIVERY_V1_COMPONENT = 'scanops_reliable_delivery_queue_v1';
export const SCANOPS_RELIABLE_DELIVERY_V1_VERSION = 'scanops-reliable-delivery.v1.0.0';
export const SCANOPS_RELIABLE_DELIVERY_V1_PATH = '/api/bridge/v1/reliable-delivery/handoffs';

const HEALTH_OPERATION = 'DEVICE_HEALTH_PING';
const ALLOWED_ENVIRONMENTS = Object.freeze(['TEST', 'TRAINING']);
const DEFAULT_TIMEOUT_MS = 2_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAYS_MS = Object.freeze([1_000, 5_000, 15_000]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function cloneFreeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(cloneFreeze));
  if (isPlainObject(value)) {
    const copy = {};
    for (const [key, item] of Object.entries(value)) copy[key] = cloneFreeze(item);
    return Object.freeze(copy);
  }
  return value;
}

function asPositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function hashCanonical(value) {
  return createHash('sha256').update(canonicalizeBridgeContractV1(value), 'utf8').digest('hex');
}

export function initialState() {
  return {
    format: 'INVYRA_SCANOPS_RELIABLE_DELIVERY_V1',
    version: '1.0.0',
    sequence: 0,
    queueById: {},
    queueOrder: [],
    receiptsByQueueId: {},
    deadLetterByQueueId: {},
    replayByOriginalQueueId: {},
    metrics: {
      enqueued: 0,
      deduplicated: 0,
      conflicts: 0,
      dispatchAttempts: 0,
      acknowledged: 0,
      retries: 0,
      deadLettered: 0,
      manualReplays: 0,
      recoveredInFlight: 0,
    },
  };
}

export function normalizeConfiguration(options = {}) {
  const configuration = options.configuration || {};
  const environment = asString(options.environment || configuration.environment).toUpperCase();
  const protocol = asString(options.protocol || configuration.protocol || 'http').toLowerCase();
  const host = asString(options.inventoryHost || configuration.explicit_inventory_host);
  const port = Number(options.inventoryPort ?? configuration.inventory_port);
  const pairedProfile = isPlainObject(options.pairedProfile) ? options.pairedProfile : {};
  const retryDelays = Array.isArray(options.retryDelaysMs) && options.retryDelaysMs.length > 0
    ? options.retryDelaysMs.map((value) => asPositiveInteger(value, 1_000))
    : [...DEFAULT_RETRY_DELAYS_MS];

  return Object.freeze({
    bridgeEnabled: configuration.bridge_enabled === true,
    transportEnabled: configuration.transport_enabled === true,
    reliableDeliveryEnabled: configuration.reliable_delivery_enabled === true,
    persistenceEnabled: configuration.persistence_enabled === true,
    environment,
    protocol,
    host,
    port: Number.isInteger(port) && port > 0 && port <= 65_535 ? port : null,
    persistenceDirectory: asString(options.persistenceDirectory || configuration.persistence_directory),
    timeoutMs: asPositiveInteger(options.timeoutMs, DEFAULT_TIMEOUT_MS),
    maxAttempts: asPositiveInteger(options.maxAttempts, DEFAULT_MAX_ATTEMPTS),
    retryDelaysMs: Object.freeze(retryDelays),
    pairedProfile: cloneFreeze(pairedProfile),
  });
}

function isLocalHost(host) {
  const value = asString(host).toLowerCase();
  if (value === 'localhost' || value === '[::1]') return true;
  if (/^127\.(?:\d{1,3}\.){2}\d{1,3}$/.test(value)) return true;
  if (/^10\.(?:\d{1,3}\.){2}\d{1,3}$/.test(value)) return true;
  if (/^192\.168\.(?:\d{1,3}\.)\d{1,3}$/.test(value)) return true;
  const private172 = value.match(/^172\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) return true;
  return /^[a-z0-9-]+(?:\.local)?$/i.test(value);
}

export function evaluateGate(configuration, nowMs) {
  const blockers = [];
  const profile = configuration.pairedProfile;
  if (!configuration.bridgeEnabled) blockers.push('BRIDGE_DISABLED');
  if (!configuration.transportEnabled) blockers.push('TRANSPORT_DISABLED');
  if (!configuration.reliableDeliveryEnabled) blockers.push('RELIABLE_DELIVERY_DISABLED');
  if (!configuration.persistenceEnabled) blockers.push('PERSISTENCE_DISABLED');
  if (!ALLOWED_ENVIRONMENTS.includes(configuration.environment)) blockers.push('ENVIRONMENT_BLOCKED');
  if (!['http', 'https'].includes(configuration.protocol)) blockers.push('PROTOCOL_INVALID');
  if (!configuration.host || !isLocalHost(configuration.host)) blockers.push('LOCAL_INVENTORY_HOST_REQUIRED');
  if (configuration.port === null) blockers.push('INVENTORY_PORT_REQUIRED');
  if (!configuration.persistenceDirectory) blockers.push('PERSISTENCE_DIRECTORY_REQUIRED');
  if (profile.status !== 'PAIRED') blockers.push('PAIRED_PROFILE_REQUIRED');
  if (asString(profile.environment).toUpperCase() !== configuration.environment) blockers.push('PAIRED_PROFILE_ENVIRONMENT_MISMATCH');
  if (!asString(profile.deviceId)) blockers.push('PAIRED_DEVICE_ID_REQUIRED');
  if (!asString(profile.storeId)) blockers.push('PAIRED_STORE_ID_REQUIRED');
  if (!asString(profile.inventoryInstanceId)) blockers.push('PAIRED_INVENTORY_INSTANCE_REQUIRED');
  if (!/^[a-f0-9]{64}$/i.test(asString(profile.trustReference))) blockers.push('TRUST_REFERENCE_INVALID');
  const expiresAtMs = Date.parse(asString(profile.trustExpiresAt));
  if (Number.isNaN(expiresAtMs) || expiresAtMs <= nowMs) blockers.push('PAIRED_TRUST_EXPIRED');
  return Object.freeze({ allowed: blockers.length === 0, blockers: Object.freeze(blockers) });
}

export function retryDelay(configuration, attemptNumber) {
  const index = Math.min(Math.max(attemptNumber - 1, 0), configuration.retryDelaysMs.length - 1);
  return configuration.retryDelaysMs[index];
}

export function queueIdFor(sequence, envelopeHash) {
  return `queue:${String(sequence).padStart(8, '0')}:${envelopeHash.slice(0, 24)}`;
}

export function normalizeHealthInput(input, configuration, nowIso) {
  const profile = configuration.pairedProfile;
  return Object.freeze({
    envelopeId: asString(input.envelopeId),
    idempotencyKey: asString(input.idempotencyKey),
    traceId: asString(input.traceId),
    operationType: HEALTH_OPERATION,
    occurredAt: asString(input.occurredAt) || nowIso,
    environment: configuration.environment,
    source: Object.freeze({
      deviceId: asString(profile.deviceId),
      storeId: asString(profile.storeId),
      sessionId: asString(input.sessionId || profile.sessionId),
    }),
    target: Object.freeze({ inventoryInstanceId: asString(profile.inventoryInstanceId) }),
    payload: cloneFreeze(isPlainObject(input.payload)
      ? input.payload
      : { requestType: 'BRIDGE_HEALTH', clientTime: nowIso }),
  });
}

export async function parseJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw Object.assign(new Error('Inventory response is not valid JSON.'), { code: 'INVALID_JSON_RESPONSE' });
  }
}
