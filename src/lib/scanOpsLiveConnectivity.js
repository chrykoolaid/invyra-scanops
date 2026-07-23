import {
  clearBrowserPairing,
  getBrowserPairedProfile,
  pairWithInventorySetupCode,
} from '../inventory-bridge/pairing/browser/v1/scanOpsBrowserPairingClientV1.js';
import { createScanOpsTestTransportClientV1 } from '../inventory-bridge/testTransport/v1/index.js';
import { createScanOpsItemLookupClientV1 } from '../inventory-bridge/itemLookup/v1/index.js';

export const LIVE_CONNECTION_RESULT_KEY = 'invyra_scanops_phase39_0b_connection_result_v1';

const ALLOWED_OPERATIONAL_ENVIRONMENTS = Object.freeze(['TEST', 'TRAINING']);

function asText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function makeId(prefix) {
  const uuid = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${uuid}`;
}

function sessionIdentity(session = {}) {
  return {
    deviceId: asText(session.deviceId || session.scannerId),
    sessionId: asText(session.sessionId || session.shiftId || `session-${session.deviceId || 'scanops'}`),
    operatorId: asText(session.actorUserId || session.userId || session.operatorId),
  };
}

function writeLastResult(result) {
  if (typeof window !== 'undefined') {
    try { window.sessionStorage.setItem(LIVE_CONNECTION_RESULT_KEY, JSON.stringify(result)); } catch {}
  }
  return result;
}

function mixedContentBlocked() {
  return typeof window !== 'undefined' && window.location.protocol === 'https:';
}

function validationFailure(status, reason, message) {
  return {
    ok: false,
    status,
    reason,
    message,
    dispatchAttempted: false,
  };
}

function validatePairedIdentity(profile, session = {}) {
  if (!profile) {
    return validationFailure(
      'NOT_PAIRED',
      'PAIRING_REQUIRED',
      'Pair this ScanOps device with Inventory before continuing.',
    );
  }
  if (mixedContentBlocked()) {
    return validationFailure(
      'BLOCKED',
      'MIXED_CONTENT_BLOCKED',
      'Open ScanOps from the controlled local HTTP pilot address. Hosted HTTPS ScanOps cannot call the private HTTP bridge.',
    );
  }
  const identity = sessionIdentity(session);
  if (identity.deviceId !== profile.deviceId) {
    return validationFailure(
      'IDENTITY_MISMATCH',
      'DEVICE_ID_CHANGED',
      'The current device identity does not match the paired device. Pair again.',
    );
  }
  return { ok: true, identity };
}

function validateItemLookupIdentity(profile, session = {}, nowMs = Date.now()) {
  const paired = validatePairedIdentity(profile, session);
  if (!paired.ok) return paired;

  const profileEnvironment = asText(profile.environment).toUpperCase();
  const sessionEnvironment = asText(session.environment).toUpperCase();
  const profileStoreId = asText(profile.storeId);
  const sessionStoreId = asText(session.storeId);
  const profileSessionId = asText(profile.sessionId);
  const trustExpiresAtMs = Date.parse(asText(profile.trustExpiresAt));

  if (!ALLOWED_OPERATIONAL_ENVIRONMENTS.includes(profileEnvironment)) {
    return validationFailure(
      'BLOCKED',
      'ENVIRONMENT_BLOCKED',
      'Operational item lookup is available only in TEST or TRAINING.',
    );
  }
  if (!sessionEnvironment || sessionEnvironment !== profileEnvironment) {
    return validationFailure(
      'SCOPE_MISMATCH',
      'ENVIRONMENT_SCOPE_MISMATCH',
      'The ScanOps environment no longer matches the paired Inventory environment. Pair again.',
    );
  }
  if (!sessionStoreId || sessionStoreId !== profileStoreId) {
    return validationFailure(
      'SCOPE_MISMATCH',
      'STORE_SCOPE_MISMATCH',
      'The ScanOps store no longer matches the paired Inventory store. Pair again.',
    );
  }
  if (!paired.identity.sessionId || paired.identity.sessionId !== profileSessionId) {
    return validationFailure(
      'SCOPE_MISMATCH',
      'SESSION_SCOPE_MISMATCH',
      'The ScanOps session no longer matches the paired Inventory session. Pair again.',
    );
  }
  if (!asText(profile.inventoryInstanceId)) {
    return validationFailure(
      'SCOPE_MISMATCH',
      'INVENTORY_INSTANCE_SCOPE_REQUIRED',
      'The paired Inventory instance is missing. Pair again.',
    );
  }
  if (!asText(profile.trustReference)) {
    return validationFailure(
      'TRUST_REJECTED',
      'TRUST_REFERENCE_REQUIRED',
      'The paired-device trust reference is unavailable. Pair again.',
    );
  }
  if (!Number.isFinite(trustExpiresAtMs) || trustExpiresAtMs <= nowMs) {
    return validationFailure(
      'TRUST_EXPIRED',
      'DEVICE_TRUST_EXPIRED',
      'The paired-device trust has expired. Open Sync & Connectivity and pair again.',
    );
  }
  if (!paired.identity.operatorId) {
    return validationFailure(
      'INVALID',
      'SOURCE_OPERATOR_REQUIRED',
      'A signed-in ScanOps operator is required for item lookup.',
    );
  }

  return { ok: true, identity: paired.identity };
}

export function getLastLiveConnectionResult() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(LIVE_CONNECTION_RESULT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getLiveConnectionProfile() {
  return getBrowserPairedProfile();
}

export function resolveLiveItemLookupAvailability({
  profile,
  connectionResult,
  session = {},
  nowMs = Date.now(),
} = {}) {
  const validated = validateItemLookupIdentity(profile, session, nowMs);
  if (!validated.ok) {
    return {
      connected: false,
      ...validated,
      profile: profile || null,
      connectionResult: connectionResult || null,
    };
  }

  const connected = connectionResult?.kind === 'HEALTH_TEST'
    && connectionResult?.ok === true
    && connectionResult?.status === 'CONNECTED';

  if (!connected) {
    return {
      connected: false,
      ok: false,
      status: 'NOT_VERIFIED',
      reason: 'INVENTORY_CONNECTION_NOT_VERIFIED',
      message: 'Inventory is paired but the trusted connection has not been verified.',
      dispatchAttempted: false,
      profile,
      connectionResult: connectionResult || null,
    };
  }

  return {
    connected: true,
    ok: true,
    status: 'CONNECTED',
    reason: null,
    message: 'Connected to Inventory.',
    dispatchAttempted: false,
    profile,
    connectionResult,
    identity: validated.identity,
  };
}

export function getLiveItemLookupAvailability(session = {}) {
  return resolveLiveItemLookupAvailability({
    profile: getBrowserPairedProfile(),
    connectionResult: getLastLiveConnectionResult(),
    session,
  });
}

export function clearLiveConnection() {
  clearBrowserPairing();
  if (typeof window !== 'undefined') {
    try { window.sessionStorage.removeItem(LIVE_CONNECTION_RESULT_KEY); } catch {}
  }
  return { cleared: true };
}

export async function pairInventoryDesktop({ host, port, setupCode, session } = {}) {
  const identity = sessionIdentity(session);
  const result = await pairWithInventorySetupCode({
    host,
    port,
    setupCode,
    deviceId: identity.deviceId,
    sessionId: identity.sessionId,
  });
  return writeLastResult({
    kind: 'PAIRING',
    ok: result.ok === true,
    status: result.status,
    reason: result.reason || null,
    message: result.ok
      ? 'ScanOps is temporarily paired. Run the connection test now.'
      : result.message || 'Pairing failed.',
    checkedAt: new Date().toISOString(),
    profile: result.profile || null,
  });
}

export async function runLiveBridgeHealthTest(session = {}) {
  const profile = getBrowserPairedProfile();
  const paired = validatePairedIdentity(profile, session);
  if (!paired.ok) {
    return writeLastResult({
      kind: 'HEALTH_TEST',
      ...paired,
      checkedAt: new Date().toISOString(),
    });
  }

  const client = createScanOpsTestTransportClientV1({
    configuration: { bridge_enabled: true, transport_enabled: true },
    environment: profile.environment,
    inventoryHost: profile.inventoryHost,
    inventoryPort: profile.inventoryPort,
    timeoutMs: 4000,
  });
  const occurredAt = new Date().toISOString();
  const result = await client.sendHealthPing({
    envelopeId: makeId(`env:${profile.environment.toLowerCase()}:health`),
    idempotencyKey: makeId(`idem:${profile.environment.toLowerCase()}:health`),
    traceId: makeId(`trace:${profile.environment.toLowerCase()}:health`),
    occurredAt,
    deviceId: profile.deviceId,
    storeId: profile.storeId,
    sessionId: profile.sessionId,
    inventoryInstanceId: profile.inventoryInstanceId,
    payload: {
      requestType: 'BRIDGE_HEALTH',
      clientTime: occurredAt,
      trustReference: profile.trustReference,
    },
  });

  const connected = result.ok === true
    && result.status === 'CORRELATED'
    && result.receiptValid === true
    && result.correlated === true
    && result.admissionStatus === 'ACCEPTED'
    && result.applicationStatus === 'NOT_APPLICABLE';

  return writeLastResult({
    kind: 'HEALTH_TEST',
    ok: connected,
    status: connected ? 'CONNECTED' : result.status || 'FAILED',
    reason: connected ? null : result.error || result.response?.error?.code || result.gate?.blockers?.join(' · ') || 'CONNECTION_FAILED',
    message: connected
      ? 'Inventory accepted and correlated the trusted health request. No business operation was applied.'
      : 'Inventory connection test failed. Check the bridge, pairing trust, endpoint and local network.',
    checkedAt: new Date().toISOString(),
    endpoint: result.endpoint || `http://${profile.inventoryHost}:${profile.inventoryPort}`,
    traceId: result.receipt?.traceId || result.envelopeId || null,
    admissionStatus: result.admissionStatus || result.response?.admissionStatus || null,
    applicationStatus: result.applicationStatus || result.response?.applicationStatus || null,
    receiptId: result.receipt?.receiptId || null,
    inventoryMutationAttempted: false,
    scanOpsMutationAttempted: false,
  });
}

export async function runLiveItemLookup({ lookupType, lookupValue, session } = {}) {
  const availability = getLiveItemLookupAvailability(session);
  if (!availability.connected) {
    return {
      kind: 'ITEM_LOOKUP',
      ok: false,
      status: availability.status,
      reason: availability.reason,
      message: availability.message,
      checkedAt: new Date().toISOString(),
      dispatchAttempted: false,
      inventoryMutationAttempted: false,
      scanOpsMutationAttempted: false,
    };
  }

  const { profile, identity } = availability;
  const normalizedType = asText(lookupType).toUpperCase();
  const normalizedValue = asText(lookupValue);
  if (!['BARCODE', 'SKU'].includes(normalizedType) || !normalizedValue || normalizedValue.length > 128) {
    return {
      kind: 'ITEM_LOOKUP',
      ok: false,
      status: 'INVALID',
      reason: 'ITEM_LOOKUP_INPUT_INVALID',
      message: 'Scan a barcode or enter an exact SKU.',
      checkedAt: new Date().toISOString(),
      dispatchAttempted: false,
      inventoryMutationAttempted: false,
      scanOpsMutationAttempted: false,
    };
  }

  const client = createScanOpsItemLookupClientV1({
    configuration: { bridge_enabled: true, transport_enabled: true },
    environment: profile.environment,
    inventoryHost: profile.inventoryHost,
    inventoryPort: profile.inventoryPort,
    timeoutMs: 4000,
  });
  const occurredAt = new Date().toISOString();
  const result = await client.sendItemLookup({
    envelopeId: makeId(`env:${profile.environment.toLowerCase()}:lookup`),
    idempotencyKey: makeId(`idem:${profile.environment.toLowerCase()}:lookup`),
    traceId: makeId(`trace:${profile.environment.toLowerCase()}:lookup`),
    occurredAt,
    deviceId: profile.deviceId,
    storeId: profile.storeId,
    sessionId: profile.sessionId,
    operatorId: identity.operatorId,
    inventoryInstanceId: profile.inventoryInstanceId,
    trustReference: profile.trustReference,
    lookupType: normalizedType,
    lookupValue: normalizedValue,
  });

  const authorizationUnavailable = result.status === 'AUTHORIZATION_UNAVAILABLE';
  const trustRejected = result.reason === 'DEVICE_NOT_TRUSTED'
    || result.reason === 'TRUST_REFERENCE_INVALID'
    || result.reason === 'TRUST_REFERENCE_EXPIRED';

  return {
    kind: 'ITEM_LOOKUP',
    ok: result.ok === true,
    status: result.status,
    reason: result.reason || null,
    message: authorizationUnavailable
      ? 'Inventory read authorisation unavailable. Inventory Desktop must be reauthorised.'
      : trustRejected
        ? 'The Inventory connection is no longer trusted. Open Sync & Connectivity and pair again.'
        : result.ok
          ? result.status === 'FOUND'
            ? 'Inventory returned the authoritative item details.'
            : 'Inventory completed the read and returned ITEM_NOT_FOUND.'
          : result.message || 'The Inventory item lookup could not be completed.',
    checkedAt: new Date().toISOString(),
    endpoint: result.endpoint || `http://${profile.inventoryHost}:${profile.inventoryPort}`,
    traceId: result.receipt?.traceId || result.envelopeId || null,
    receiptId: result.receipt?.receiptId || null,
    admissionStatus: result.admissionStatus || null,
    applicationStatus: result.applicationStatus || null,
    result: result.result || null,
    dispatchAttempted: result.dispatchAttempted === true,
    receiptValid: result.receiptValid === true,
    correlated: result.correlated === true,
    timeoutTriggered: result.timeoutTriggered === true,
    inventoryMutationAttempted: false,
    scanOpsMutationAttempted: false,
  };
}
