import { createHash } from 'node:crypto';
import { canonicalizeBridgeContractV1 } from '../../canonicalContract/v1/index.js';

export const SCANOPS_COUNT_HANDOFF_V1_PHASE = '38-A';
export const SCANOPS_COUNT_HANDOFF_V1_COMPONENT = 'scanops_count_submission_queue_v1';
export const SCANOPS_COUNT_HANDOFF_V1_VERSION = 'scanops-count-handoff.v1.0.0';
export const SCANOPS_COUNT_HANDOFF_V1_PATH = '/api/bridge/v1/count-intake/handoffs';

export const COUNT_OPERATION = 'COUNT_SUBMISSION';
const ALLOWED_ENVIRONMENTS = Object.freeze(['TEST', 'TRAINING']);
const DEFAULT_TIMEOUT_MS = 2_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAYS_MS = Object.freeze([250, 1_000, 3_000]);
const PLACEHOLDER_IDS = new Set([
  'scanops-device-local',
  'device-local',
  'store-local',
  'session-local',
  'inventory-desktop-local',
  'unknown',
]);

export function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

export function asPositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function isValidIsoTimestamp(value) {
  const normalized = asString(value);
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return false;
  return !Number.isNaN(Date.parse(normalized));
}

export function isAllowedLocalHost(value) {
  const host = asString(value).toLowerCase();
  if (!host || /[\s/?#]/.test(host)) return false;
  if (host === 'localhost' || host === '[::1]') return true;
  if (/^127\.(?:\d{1,3}\.){2}\d{1,3}$/.test(host)) return true;
  if (/^10\.(?:\d{1,3}\.){2}\d{1,3}$/.test(host)) return true;
  if (/^192\.168\.(?:\d{1,3}\.)\d{1,3}$/.test(host)) return true;
  const private172 = host.match(/^172\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) return true;
  if (/^169\.254\.(?:\d{1,3}\.)\d{1,3}$/.test(host)) return true;
  return /^[a-z0-9-]+(?:\.local)?$/i.test(host);
}

export function hashCanonical(value) {
  return createHash('sha256').update(canonicalizeBridgeContractV1(value), 'utf8').digest('hex');
}

export function initialState() {
  return {
    format: 'INVYRA_SCANOPS_COUNT_HANDOFF_V1',
    version: '1.0.0',
    queueByIdempotencyKey: {},
    receiptByIdempotencyKey: {},
    deadLetterByIdempotencyKey: {},
    metrics: {
      enqueued: 0,
      acknowledged: 0,
      rejected: 0,
      retryScheduled: 0,
      deadLettered: 0,
      duplicates: 0,
      recoveredInflight: 0,
      manualReplays: 0,
    },
  };
}

export function normalizeConfiguration(options = {}) {
  const configuration = options.configuration || {};
  const environment = asString(options.environment || configuration.environment).toUpperCase();
  const protocol = asString(options.protocol || configuration.protocol || 'http').toLowerCase();
  const inventoryHost = asString(options.inventoryHost || configuration.inventory_host);
  const inventoryPort = Number(options.inventoryPort ?? configuration.inventory_port);
  const pairedProfile = options.pairedProfile || null;
  const retryDelaysMs = Array.isArray(options.retryDelaysMs)
    ? options.retryDelaysMs.map((item) => asPositiveInteger(item, 1))
    : [...DEFAULT_RETRY_DELAYS_MS];

  return Object.freeze({
    bridgeEnabled: configuration.bridge_enabled === true,
    transportEnabled: configuration.transport_enabled === true,
    reliableDeliveryEnabled: configuration.reliable_delivery_enabled === true,
    persistenceEnabled: configuration.persistence_enabled === true,
    businessHandoffEnabled: configuration.business_handoff_enabled === true,
    countSubmissionEnabled: configuration.count_submission_enabled === true,
    environment,
    protocol,
    inventoryHost,
    inventoryPort: Number.isInteger(inventoryPort) && inventoryPort > 0 && inventoryPort <= 65_535 ? inventoryPort : null,
    persistenceDirectory: asString(options.persistenceDirectory || configuration.persistence_directory),
    timeoutMs: asPositiveInteger(options.timeoutMs ?? configuration.request_timeout_ms, DEFAULT_TIMEOUT_MS),
    maxAttempts: asPositiveInteger(options.maxAttempts, DEFAULT_MAX_ATTEMPTS),
    retryDelaysMs: Object.freeze(retryDelaysMs),
    pairedProfile: isPlainObject(pairedProfile) ? cloneFreeze(pairedProfile) : null,
  });
}

export function pairedProfileValid(configuration, nowMs) {
  const profile = configuration.pairedProfile;
  if (!profile || profile.status !== 'PAIRED') return false;
  if (asString(profile.environment).toUpperCase() !== configuration.environment) return false;
  if (!asString(profile.deviceId) || PLACEHOLDER_IDS.has(asString(profile.deviceId))) return false;
  if (!asString(profile.sessionId) || PLACEHOLDER_IDS.has(asString(profile.sessionId))) return false;
  if (!asString(profile.storeId) || PLACEHOLDER_IDS.has(asString(profile.storeId))) return false;
  if (!asString(profile.inventoryInstanceId) || PLACEHOLDER_IDS.has(asString(profile.inventoryInstanceId))) return false;
  if (!/^[a-f0-9]{64}$/i.test(asString(profile.trustReference))) return false;
  const expiresAtMs = Date.parse(asString(profile.trustExpiresAt));
  return !Number.isNaN(expiresAtMs) && expiresAtMs > nowMs;
}

export function evaluateGate(configuration, nowMs = Date.now()) {
  const blockers = [];
  if (!configuration.bridgeEnabled) blockers.push('BRIDGE_DISABLED');
  if (!configuration.transportEnabled) blockers.push('TRANSPORT_DISABLED');
  if (!configuration.reliableDeliveryEnabled) blockers.push('RELIABLE_DELIVERY_DISABLED');
  if (!configuration.persistenceEnabled) blockers.push('PERSISTENCE_DISABLED');
  if (!configuration.businessHandoffEnabled) blockers.push('BUSINESS_HANDOFF_DISABLED');
  if (!configuration.countSubmissionEnabled) blockers.push('COUNT_SUBMISSION_DISABLED');
  if (!ALLOWED_ENVIRONMENTS.includes(configuration.environment)) blockers.push('ENVIRONMENT_BLOCKED');
  if (!['http', 'https'].includes(configuration.protocol)) blockers.push('PROTOCOL_INVALID');
  if (!isAllowedLocalHost(configuration.inventoryHost)) blockers.push('INVENTORY_HOST_NOT_LOCAL');
  if (configuration.inventoryPort === null) blockers.push('INVENTORY_PORT_INVALID');
  if (!configuration.persistenceDirectory) blockers.push('PERSISTENCE_DIRECTORY_REQUIRED');
  if (!pairedProfileValid(configuration, nowMs)) blockers.push('PAIRED_PROFILE_INVALID');
  return Object.freeze({ allowed: blockers.length === 0, blockers: Object.freeze(blockers) });
}

export function validatePayload(input) {
  const errors = [];
  if (!isPlainObject(input)) return Object.freeze({ valid: false, errors: Object.freeze(['COUNT_INPUT_REQUIRED']) });
  const countSessionReference = asString(input.countSessionReference);
  const itemReference = asString(input.itemReference);
  const itemReferenceType = asString(input.itemReferenceType || 'SKU').toUpperCase();
  const locationId = asString(input.locationId);
  const storageAreaId = asString(input.storageAreaId);
  const evidenceNote = asString(input.evidenceNote);
  const physicalCount = Number(input.physicalCount);
  if (!countSessionReference) errors.push('COUNT_SESSION_REFERENCE_REQUIRED');
  if (!itemReference) errors.push('ITEM_REFERENCE_REQUIRED');
  if (itemReferenceType !== 'SKU') errors.push('ITEM_REFERENCE_TYPE_UNSUPPORTED');
  if (!Number.isFinite(physicalCount) || physicalCount < 0 || physicalCount > 1_000_000_000) errors.push('PHYSICAL_COUNT_INVALID');
  if (!isValidIsoTimestamp(input.countedAt)) errors.push('COUNTED_AT_INVALID');
  if (Object.prototype.hasOwnProperty.call(input, 'locationId') && !locationId) errors.push('LOCATION_ID_INVALID');
  if (Object.prototype.hasOwnProperty.call(input, 'storageAreaId') && !storageAreaId) errors.push('STORAGE_AREA_ID_INVALID');
  if (evidenceNote.length > 500) errors.push('EVIDENCE_NOTE_TOO_LONG');
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    normalized: errors.length === 0 ? cloneFreeze({
      countSessionReference,
      itemReferenceType,
      itemReference,
      physicalCount,
      countedAt: asString(input.countedAt),
      locationId: locationId || null,
      storageAreaId: storageAreaId || null,
      evidenceNote: evidenceNote || null,
    }) : null,
  });
}

export function buildEndpoint(configuration) {
  return `${configuration.protocol}://${configuration.inventoryHost}:${configuration.inventoryPort}${SCANOPS_COUNT_HANDOFF_V1_PATH}`;
}

export function retryDelay(configuration, attempt) {
  const index = Math.max(0, Math.min(attempt - 1, configuration.retryDelaysMs.length - 1));
  return configuration.retryDelaysMs[index] || 1;
}

export function parseResponseJson(response) {
  return response.text().then((text) => {
    try { return JSON.parse(text); }
    catch { throw new Error('Inventory count-intake response is not valid JSON.'); }
  });
}

