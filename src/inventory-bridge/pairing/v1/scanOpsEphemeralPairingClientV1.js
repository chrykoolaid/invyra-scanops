import {
  createHash,
  createPublicKey,
  generateKeyPairSync,
  sign as signPayload,
} from 'node:crypto';

export const SCANOPS_EPHEMERAL_PAIRING_V1_PHASE = '36-A';
export const SCANOPS_EPHEMERAL_PAIRING_V1_COMPONENT = 'scanops_ephemeral_pairing_client_v1';
export const SCANOPS_EPHEMERAL_PAIRING_V1_VERSION = 'scanops-ephemeral-pairing.v1.0.0';
export const SCANOPS_EPHEMERAL_PAIRING_V1_SCHEME = 'invyra-pairing-v1:';
export const SCANOPS_EPHEMERAL_PAIRING_V1_CONFIRMATION_PATH = '/api/bridge/v1/pairing/confirmations';

const ALLOWED_ENVIRONMENTS = Object.freeze(['TEST', 'TRAINING']);
const DEFAULT_TIMEOUT_MS = 2_000;
const PLACEHOLDER_IDS = new Set([
  'scanops-device-local',
  'device-local',
  'store-local',
  'session-local',
  'inventory-desktop-local',
  'unknown',
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}


function isAllowedLocalHost(value) {
  const host = asTrimmedString(value).toLowerCase();
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

export function buildPairingProofV1(input = {}) {
  return [
    'INVYRA_PAIRING_PROOF_V1',
    asTrimmedString(input.offerId),
    asTrimmedString(input.challenge),
    asTrimmedString(input.deviceId),
    asTrimmedString(input.sessionId),
    asTrimmedString(input.storeId),
    asTrimmedString(input.inventoryInstanceId),
    asTrimmedString(input.environment).toUpperCase(),
  ].join('\n');
}

function fingerprintPublicKey(publicKeyPem) {
  const key = createPublicKey(publicKeyPem);
  const der = key.export({ type: 'spki', format: 'der' });
  return createHash('sha256').update(der).digest('hex');
}

function normalizeConfiguration(options = {}) {
  const configuration = options.configuration || {};
  return Object.freeze({
    bridgeEnabled: configuration.bridge_enabled === true,
    transportEnabled: configuration.transport_enabled === true,
    pairingEnabled: configuration.pairing_enabled === true,
    environment: asTrimmedString(options.environment || configuration.environment).toUpperCase(),
    timeoutMs: asPositiveInteger(options.timeoutMs ?? configuration.request_timeout_ms, DEFAULT_TIMEOUT_MS),
  });
}

function evaluateRuntimeGate(configuration) {
  const blockers = [];
  if (!configuration.bridgeEnabled) blockers.push('BRIDGE_DISABLED');
  if (!configuration.transportEnabled) blockers.push('TRANSPORT_DISABLED');
  if (!configuration.pairingEnabled) blockers.push('PAIRING_DISABLED');
  if (!ALLOWED_ENVIRONMENTS.includes(configuration.environment)) blockers.push('ENVIRONMENT_BLOCKED');
  return Object.freeze({ allowed: blockers.length === 0, blockers: Object.freeze(blockers) });
}

function decodeOffer(qrPayload) {
  const normalized = asTrimmedString(qrPayload);
  if (!normalized.startsWith(SCANOPS_EPHEMERAL_PAIRING_V1_SCHEME)) {
    return Object.freeze({ ok: false, reason: 'PAIRING_SCHEME_INVALID', offer: null });
  }
  const encoded = normalized.slice(SCANOPS_EPHEMERAL_PAIRING_V1_SCHEME.length);
  if (!encoded) return Object.freeze({ ok: false, reason: 'PAIRING_PAYLOAD_EMPTY', offer: null });
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return Object.freeze({ ok: isPlainObject(parsed), reason: isPlainObject(parsed) ? null : 'PAIRING_PAYLOAD_INVALID', offer: parsed });
  } catch {
    return Object.freeze({ ok: false, reason: 'PAIRING_PAYLOAD_INVALID', offer: null });
  }
}

function validateOfferShape(offer, configuration, nowMs) {
  const blockers = [];
  if (!isPlainObject(offer)) blockers.push('PAIRING_OFFER_REQUIRED');
  if (offer?.format !== 'INVYRA_PAIRING_OFFER_V1') blockers.push('PAIRING_FORMAT_INVALID');
  if (offer?.version !== '1.0.0') blockers.push('PAIRING_VERSION_INVALID');
  if (!asTrimmedString(offer?.offerId)) blockers.push('PAIRING_OFFER_ID_REQUIRED');
  if (!asTrimmedString(offer?.challenge)) blockers.push('PAIRING_CHALLENGE_REQUIRED');
  if (!asTrimmedString(offer?.token)) blockers.push('PAIRING_TOKEN_REQUIRED');
  if (asTrimmedString(offer?.environment).toUpperCase() !== configuration.environment) blockers.push('ENVIRONMENT_MISMATCH');
  if (!asTrimmedString(offer?.storeId) || PLACEHOLDER_IDS.has(asTrimmedString(offer?.storeId))) blockers.push('STORE_ID_INVALID');
  if (!asTrimmedString(offer?.inventoryInstanceId) || PLACEHOLDER_IDS.has(asTrimmedString(offer?.inventoryInstanceId))) blockers.push('INVENTORY_INSTANCE_INVALID');

  const expiresAtMs = Date.parse(asTrimmedString(offer?.expiresAt));
  if (Number.isNaN(expiresAtMs)) blockers.push('PAIRING_EXPIRY_INVALID');
  else if (expiresAtMs <= nowMs) blockers.push('PAIRING_OFFER_EXPIRED');

  const endpoint = offer?.pairingEndpoint;
  if (!isPlainObject(endpoint)) blockers.push('PAIRING_ENDPOINT_REQUIRED');
  const protocol = asTrimmedString(endpoint?.protocol).toLowerCase();
  if (!['http', 'https'].includes(protocol)) blockers.push('PAIRING_PROTOCOL_INVALID');
  if (!asTrimmedString(endpoint?.host)) blockers.push('PAIRING_HOST_REQUIRED');
  else if (!isAllowedLocalHost(endpoint.host)) blockers.push('PAIRING_HOST_NOT_LOCAL');
  const port = Number(endpoint?.port);
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) blockers.push('PAIRING_PORT_INVALID');
  if (asTrimmedString(endpoint?.path) !== SCANOPS_EPHEMERAL_PAIRING_V1_CONFIRMATION_PATH) blockers.push('PAIRING_PATH_INVALID');

  return Object.freeze({
    valid: blockers.length === 0,
    blockers: Object.freeze(blockers),
    expiresAtMs,
    endpoint: blockers.length === 0
      ? `${protocol}://${asTrimmedString(endpoint.host)}:${port}${SCANOPS_EPHEMERAL_PAIRING_V1_CONFIRMATION_PATH}`
      : null,
  });
}

async function parseResponseJson(response) {
  if (!response || typeof response.text !== 'function') throw new Error('Inventory pairing response body is unavailable.');
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Inventory pairing response is not valid JSON.');
  }
}

function blockedResult(status, reason, extra = {}) {
  return cloneFreeze({
    ok: false,
    status,
    reason,
    paired: false,
    dispatchAttempted: false,
    timeoutTriggered: false,
    persistenceAttempted: false,
    credentialsPersisted: false,
    queueWriteAttempted: false,
    retryScheduled: false,
    replayAttempted: false,
    businessOperationAttempted: false,
    inventoryMutationAttempted: false,
    scanOpsMutationAttempted: false,
    ...extra,
  });
}

export function createScanOpsEphemeralPairingClientV1(options = {}) {
  const configuration = normalizeConfiguration(options);
  const fetchAdapter = options.fetchAdapter || globalThis.fetch;
  const now = typeof options.now === 'function' ? options.now : () => new Date().toISOString();
  const keyPairFactory = typeof options.keyPairFactory === 'function'
    ? options.keyPairFactory
    : () => generateKeyPairSync('ed25519');

  let keyPair = null;
  let pairedProfile = null;
  const consumedOfferIds = new Set();
  const metrics = {
    parseAttempts: 0,
    pairAttempts: 0,
    successfulPairings: 0,
    blockedAttempts: 0,
    transportErrors: 0,
    timeoutErrors: 0,
    invalidResponses: 0,
    localClears: 0,
  };

  function currentTimeMs() {
    const parsed = Date.parse(now());
    return Number.isNaN(parsed) ? Date.now() : parsed;
  }

  function ensureIdentity() {
    if (!keyPair) keyPair = keyPairFactory();
    const publicKeyPem = keyPair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    return Object.freeze({
      publicKeyPem,
      publicKeyFingerprint: fingerprintPublicKey(publicKeyPem),
    });
  }

  function parsePairingOffer(qrPayload) {
    metrics.parseAttempts += 1;
    const gate = evaluateRuntimeGate(configuration);
    if (!gate.allowed) {
      metrics.blockedAttempts += 1;
      return Object.freeze({ ok: false, gate, reason: 'RUNTIME_GATE_BLOCKED', offer: null, endpoint: null });
    }
    const decoded = decodeOffer(qrPayload);
    if (!decoded.ok) {
      metrics.blockedAttempts += 1;
      return Object.freeze({ ok: false, gate, reason: decoded.reason, offer: null, endpoint: null });
    }
    const validation = validateOfferShape(decoded.offer, configuration, currentTimeMs());
    if (!validation.valid) {
      metrics.blockedAttempts += 1;
      return Object.freeze({ ok: false, gate, reason: 'PAIRING_OFFER_INVALID', offer: cloneFreeze(decoded.offer), endpoint: null, validation });
    }
    if (consumedOfferIds.has(decoded.offer.offerId)) {
      metrics.blockedAttempts += 1;
      return Object.freeze({ ok: false, gate, reason: 'PAIRING_OFFER_ALREADY_USED_LOCALLY', offer: cloneFreeze(decoded.offer), endpoint: validation.endpoint, validation });
    }
    return Object.freeze({ ok: true, gate, reason: null, offer: cloneFreeze(decoded.offer), endpoint: validation.endpoint, validation });
  }

  async function pair(qrPayload, input = {}) {
    const parsed = parsePairingOffer(qrPayload);
    if (!parsed.ok) return blockedResult('BLOCKED', parsed.reason, { gate: parsed.gate, validation: parsed.validation });

    const deviceId = asTrimmedString(input.deviceId);
    const sessionId = asTrimmedString(input.sessionId);
    if (!deviceId || PLACEHOLDER_IDS.has(deviceId)) return blockedResult('IDENTITY_INVALID', 'DEVICE_ID_INVALID');
    if (!sessionId || PLACEHOLDER_IDS.has(sessionId)) return blockedResult('IDENTITY_INVALID', 'SESSION_ID_INVALID');
    if (typeof fetchAdapter !== 'function') return blockedResult('BLOCKED', 'FETCH_ADAPTER_REQUIRED');

    const identity = ensureIdentity();
    const proof = buildPairingProofV1({
      offerId: parsed.offer.offerId,
      challenge: parsed.offer.challenge,
      deviceId,
      sessionId,
      storeId: parsed.offer.storeId,
      inventoryInstanceId: parsed.offer.inventoryInstanceId,
      environment: parsed.offer.environment,
    });
    const signature = signPayload(null, Buffer.from(proof, 'utf8'), keyPair.privateKey).toString('base64');
    const requestBody = cloneFreeze({
      offerId: parsed.offer.offerId,
      token: parsed.offer.token,
      deviceId,
      sessionId,
      storeId: parsed.offer.storeId,
      inventoryInstanceId: parsed.offer.inventoryInstanceId,
      environment: parsed.offer.environment,
      publicKeyPem: identity.publicKeyPem,
      signature,
    });

    metrics.pairAttempts += 1;
    const controller = new AbortController();
    let timeoutTriggered = false;
    const timeout = setTimeout(() => {
      timeoutTriggered = true;
      controller.abort();
    }, configuration.timeoutMs);

    try {
      const response = await fetchAdapter(parsed.endpoint, {
        method: 'POST',
        headers: Object.freeze({
          'Content-Type': 'application/json',
          'X-Invyra-Bridge-Client': SCANOPS_EPHEMERAL_PAIRING_V1_COMPONENT,
          'X-Invyra-Bridge-Phase': SCANOPS_EPHEMERAL_PAIRING_V1_PHASE,
        }),
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      const payload = await parseResponseJson(response);
      if (!response.ok) {
        return cloneFreeze({
          ...blockedResult('PAIRING_REJECTED', payload?.reason || 'PAIRING_REJECTED'),
          dispatchAttempted: true,
          httpStatus: response.status,
          response: payload,
        });
      }

      const pairedAtMs = Date.parse(asTrimmedString(payload?.pairedAt));
      const trustExpiresAtMs = Date.parse(asTrimmedString(payload?.trustExpiresAt));
      const trustReference = asTrimmedString(payload?.trustReference);
      const responseValid = isPlainObject(payload)
        && payload.ok === true
        && payload.status === 'PAIRED'
        && payload.deviceId === deviceId
        && payload.storeId === parsed.offer.storeId
        && payload.inventoryInstanceId === parsed.offer.inventoryInstanceId
        && payload.environment === parsed.offer.environment
        && payload.publicKeyFingerprint === identity.publicKeyFingerprint
        && /^[a-f0-9]{64}$/i.test(trustReference)
        && !Number.isNaN(pairedAtMs)
        && !Number.isNaN(trustExpiresAtMs)
        && trustExpiresAtMs > currentTimeMs()
        && payload.persisted === false
        && payload.credentialsPersisted === false;
      if (!responseValid) {
        metrics.invalidResponses += 1;
        return cloneFreeze({
          ...blockedResult('PAIRING_RESPONSE_INVALID', 'PAIRING_RESPONSE_INVALID'),
          dispatchAttempted: true,
          httpStatus: response.status,
          response: payload,
        });
      }

      pairedProfile = cloneFreeze({
        deviceId,
        sessionId,
        storeId: parsed.offer.storeId,
        inventoryInstanceId: parsed.offer.inventoryInstanceId,
        environment: parsed.offer.environment,
        pairingHost: parsed.offer.pairingEndpoint.host,
        pairingPort: parsed.offer.pairingEndpoint.port,
        trustReference: payload.trustReference,
        publicKeyFingerprint: payload.publicKeyFingerprint,
        pairedAt: payload.pairedAt,
        trustExpiresAt: payload.trustExpiresAt,
      });
      consumedOfferIds.add(parsed.offer.offerId);
      metrics.successfulPairings += 1;

      return cloneFreeze({
        ok: true,
        status: 'PAIRED',
        paired: true,
        dispatchAttempted: true,
        httpStatus: response.status,
        timeoutTriggered: false,
        profile: pairedProfile,
        persistenceAttempted: false,
        credentialsPersisted: false,
        queueWriteAttempted: false,
        retryScheduled: false,
        replayAttempted: false,
        businessOperationAttempted: false,
        inventoryMutationAttempted: false,
        scanOpsMutationAttempted: false,
      });
    } catch (error) {
      const timedOut = timeoutTriggered || error?.name === 'AbortError';
      metrics.transportErrors += 1;
      if (timedOut) metrics.timeoutErrors += 1;
      return cloneFreeze({
        ...blockedResult(timedOut ? 'TIMEOUT' : 'TRANSPORT_ERROR', timedOut ? 'PAIRING_TIMEOUT' : 'PAIRING_TRANSPORT_ERROR'),
        dispatchAttempted: true,
        timeoutTriggered: timedOut,
        error: error?.message || 'Pairing request failed.',
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  function getPairedProfile() {
    return pairedProfile;
  }

  function getHealthTransportOptions(overrides = {}) {
    if (!pairedProfile) return Object.freeze({ ok: false, reason: 'DEVICE_NOT_PAIRED', options: null });
    const trustExpiresAtMs = Date.parse(asTrimmedString(pairedProfile.trustExpiresAt));
    if (Number.isNaN(trustExpiresAtMs) || trustExpiresAtMs <= currentTimeMs()) {
      return Object.freeze({ ok: false, reason: 'PAIRING_TRUST_EXPIRED', options: null });
    }
    const inventoryHost = asTrimmedString(overrides.inventoryHost || pairedProfile.pairingHost);
    const inventoryPort = Number(overrides.inventoryPort);
    const protocol = asTrimmedString(overrides.protocol || 'http').toLowerCase();
    if (
      !isAllowedLocalHost(inventoryHost)
      || !['http', 'https'].includes(protocol)
      || !Number.isInteger(inventoryPort)
      || inventoryPort <= 0
      || inventoryPort > 65_535
    ) {
      return Object.freeze({ ok: false, reason: 'TRANSPORT_ENDPOINT_INVALID', options: null });
    }
    return Object.freeze({
      ok: true,
      reason: null,
      options: cloneFreeze({
        configuration: { bridge_enabled: true, transport_enabled: true },
        environment: pairedProfile.environment,
        inventoryHost,
        inventoryPort,
        protocol,
        pairedIdentity: {
          deviceId: pairedProfile.deviceId,
          sessionId: pairedProfile.sessionId,
          storeId: pairedProfile.storeId,
          inventoryInstanceId: pairedProfile.inventoryInstanceId,
          trustReference: pairedProfile.trustReference,
        },
      }),
    });
  }

  function clearPairing() {
    const hadPairing = Boolean(pairedProfile || keyPair || consumedOfferIds.size > 0);
    pairedProfile = null;
    keyPair = null;
    consumedOfferIds.clear();
    if (hadPairing) metrics.localClears += 1;
    return cloneFreeze({ cleared: hadPairing, persistenceAttempted: false, credentialsPersisted: false });
  }

  function getDiagnostics() {
    return cloneFreeze({
      component: SCANOPS_EPHEMERAL_PAIRING_V1_COMPONENT,
      version: SCANOPS_EPHEMERAL_PAIRING_V1_VERSION,
      phase: SCANOPS_EPHEMERAL_PAIRING_V1_PHASE,
      gate: evaluateRuntimeGate(configuration),
      metrics,
      paired: Boolean(pairedProfile),
      pairingAttempted: metrics.pairAttempts > 0,
      trustStateCreated: Boolean(pairedProfile),
      privateKeyHeldInMemory: Boolean(keyPair),
      credentialsPersisted: false,
      discoveryAttempted: false,
      websocketStarted: false,
      queueWriteAttempted: false,
      persistenceAttempted: false,
      automaticRetryScheduled: false,
      replayAttempted: false,
      businessOperationAttempted: false,
      inventoryMutationAttempted: false,
      scanOpsMutationAttempted: false,
    });
  }

  return Object.freeze({
    component: SCANOPS_EPHEMERAL_PAIRING_V1_COMPONENT,
    version: SCANOPS_EPHEMERAL_PAIRING_V1_VERSION,
    configuration,
    parsePairingOffer,
    pair,
    getPairedProfile,
    getHealthTransportOptions,
    clearPairing,
    getDiagnostics,
  });
}
