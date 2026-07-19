import {
  clearBrowserPairing,
  getBrowserPairedProfile,
  pairWithInventorySetupCode,
} from '../inventory-bridge/pairing/browser/v1/scanOpsBrowserPairingClientV1';
import { createScanOpsTestTransportClientV1 } from '../inventory-bridge/testTransport/v1';

export const LIVE_CONNECTION_RESULT_KEY = 'invyra_scanops_phase39_0b_connection_result_v1';

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
  };
}

function writeLastResult(result) {
  if (typeof window !== 'undefined') {
    try { window.sessionStorage.setItem(LIVE_CONNECTION_RESULT_KEY, JSON.stringify(result)); } catch {}
  }
  return result;
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
  if (!profile) {
    return writeLastResult({
      kind: 'HEALTH_TEST',
      ok: false,
      status: 'NOT_PAIRED',
      reason: 'PAIRING_REQUIRED',
      message: 'Pair this ScanOps device with Inventory before running the connection test.',
      checkedAt: new Date().toISOString(),
    });
  }
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return writeLastResult({
      kind: 'HEALTH_TEST',
      ok: false,
      status: 'BLOCKED',
      reason: 'MIXED_CONTENT_BLOCKED',
      message: 'Open ScanOps from the controlled local HTTP pilot address. Hosted HTTPS ScanOps cannot call the private HTTP bridge.',
      checkedAt: new Date().toISOString(),
    });
  }

  const identity = sessionIdentity(session);
  if (identity.deviceId !== profile.deviceId) {
    return writeLastResult({
      kind: 'HEALTH_TEST',
      ok: false,
      status: 'IDENTITY_MISMATCH',
      reason: 'DEVICE_ID_CHANGED',
      message: 'The current device identity does not match the paired device. Pair again.',
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
