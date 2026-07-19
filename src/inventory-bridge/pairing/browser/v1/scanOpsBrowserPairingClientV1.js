export const SCANOPS_BROWSER_PAIRING_V1_PHASE = '39-0B';
export const SCANOPS_BROWSER_PAIRING_V1_VERSION = 'scanops-browser-pairing.v1.0.0';
export const SCANOPS_BROWSER_PAIRING_PROFILE_KEY = 'invyra_scanops_phase39_0b_paired_profile_v1';

const PAIRING_SCHEME = 'invyra-pairing-v1:';
const PAIRING_CONFIRMATION_PATH = '/api/bridge/v1/pairing/confirmations';
const ALLOWED_ENVIRONMENTS = Object.freeze(['TEST', 'TRAINING']);
let ephemeralPrivateKey = null;

function asText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isAllowedLocalHost(value) {
  const host = asText(value).toLowerCase();
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

function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64UrlToText(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return decodeURIComponent(Array.from(atob(padded), (character) => (
    `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`
  )).join(''));
}

function spkiToPem(spki) {
  const base64 = bytesToBase64(spki);
  const lines = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----\n`;
}

async function sha256Hex(bytes) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function buildPairingProof(input = {}) {
  return [
    'INVYRA_PAIRING_PROOF_V1',
    asText(input.offerId),
    asText(input.challenge),
    asText(input.deviceId),
    asText(input.sessionId),
    asText(input.storeId),
    asText(input.inventoryInstanceId),
    asText(input.environment).toUpperCase(),
  ].join('\n');
}

function safeSessionRead() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SCANOPS_BROWSER_PAIRING_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function safeSessionWrite(profile) {
  if (typeof window === 'undefined') return profile;
  try {
    window.sessionStorage.setItem(SCANOPS_BROWSER_PAIRING_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Pairing remains available in memory for the current page even when storage is unavailable.
  }
  return profile;
}

function blocked(reason, message, details = {}) {
  return {
    ok: false,
    status: 'BLOCKED',
    reason,
    message,
    paired: false,
    dispatchAttempted: false,
    credentialsPersisted: false,
    inventoryMutationAttempted: false,
    scanOpsMutationAttempted: false,
    ...details,
  };
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs || 4000);
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    return { response, payload };
  } finally {
    window.clearTimeout(timeout);
  }
}

function decodePairingPayload(qrPayload) {
  const normalized = asText(qrPayload);
  if (!normalized.startsWith(PAIRING_SCHEME)) return blocked('PAIRING_SCHEME_INVALID', 'Inventory returned an unsupported pairing format.');
  try {
    const offer = JSON.parse(base64UrlToText(normalized.slice(PAIRING_SCHEME.length)));
    return { ok: true, offer };
  } catch {
    return blocked('PAIRING_PAYLOAD_INVALID', 'Inventory returned an invalid pairing payload.');
  }
}

function validateOffer(offer, requestedHost, requestedPort) {
  const blockers = [];
  if (!isPlainObject(offer)) blockers.push('PAIRING_OFFER_REQUIRED');
  if (offer?.format !== 'INVYRA_PAIRING_OFFER_V1') blockers.push('PAIRING_FORMAT_INVALID');
  if (offer?.version !== '1.0.0') blockers.push('PAIRING_VERSION_INVALID');
  if (!ALLOWED_ENVIRONMENTS.includes(asText(offer?.environment).toUpperCase())) blockers.push('ENVIRONMENT_BLOCKED');
  if (!asText(offer?.offerId) || !asText(offer?.challenge) || !asText(offer?.token)) blockers.push('PAIRING_OFFER_INCOMPLETE');
  if (!asText(offer?.storeId) || !asText(offer?.inventoryInstanceId)) blockers.push('PAIRING_SCOPE_INVALID');
  if (Date.parse(asText(offer?.expiresAt)) <= Date.now()) blockers.push('PAIRING_OFFER_EXPIRED');
  const endpoint = offer?.pairingEndpoint;
  if (!isPlainObject(endpoint)) blockers.push('PAIRING_ENDPOINT_REQUIRED');
  if (asText(endpoint?.protocol).toLowerCase() !== 'http') blockers.push('PAIRING_PROTOCOL_INVALID');
  if (!isAllowedLocalHost(endpoint?.host)) blockers.push('PAIRING_HOST_NOT_LOCAL');
  if (asText(endpoint?.host).toLowerCase() !== asText(requestedHost).toLowerCase()) blockers.push('PAIRING_HOST_MISMATCH');
  if (Number(endpoint?.port) !== Number(requestedPort)) blockers.push('PAIRING_PORT_MISMATCH');
  if (asText(endpoint?.path) !== PAIRING_CONFIRMATION_PATH) blockers.push('PAIRING_PATH_INVALID');
  return { valid: blockers.length === 0, blockers };
}

export function getBrowserPairedProfile() {
  const profile = safeSessionRead();
  if (!profile) return null;
  if (Date.parse(asText(profile.trustExpiresAt)) <= Date.now()) {
    clearBrowserPairing();
    return null;
  }
  return profile;
}

export function clearBrowserPairing() {
  ephemeralPrivateKey = null;
  if (typeof window !== 'undefined') {
    try { window.sessionStorage.removeItem(SCANOPS_BROWSER_PAIRING_PROFILE_KEY); } catch {}
  }
  return { cleared: true, credentialsPersisted: false };
}

export async function pairWithInventorySetupCode(input = {}) {
  if (!globalThis.crypto?.subtle) return blocked('WEB_CRYPTO_UNAVAILABLE', 'This device browser does not support secure pairing.');
  const host = asText(input.host);
  const port = Number(input.port);
  const setupCode = asText(input.setupCode);
  const deviceId = asText(input.deviceId);
  const sessionId = asText(input.sessionId);

  if (!isAllowedLocalHost(host)) return blocked('INVENTORY_HOST_INVALID', 'Enter a private local Inventory IP address or hostname.');
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) return blocked('INVENTORY_PORT_INVALID', 'Enter a valid Inventory bridge port.');
  if (!/^\d{6}$/.test(setupCode)) return blocked('PAIRING_CODE_INVALID', 'Enter the six-digit code shown by Inventory.');
  if (!deviceId || !sessionId) return blocked('SCANOPS_IDENTITY_REQUIRED', 'Device and session identity are required.');
  if (window.location.protocol === 'https:') {
    return blocked('MIXED_CONTENT_BLOCKED', 'Open ScanOps from the controlled local HTTP pilot address. Hosted HTTPS ScanOps cannot call a private HTTP bridge.');
  }

  const baseUrl = `http://${host}:${port}`;
  let offerResponse;
  try {
    offerResponse = await fetchJson(`${baseUrl}/api/bridge/v1/pairing/offers/${setupCode}`);
  } catch (error) {
    return blocked(error?.name === 'AbortError' ? 'PAIRING_TIMEOUT' : 'PAIRING_TRANSPORT_ERROR', 'Could not reach the Inventory pairing service.', { dispatchAttempted: true });
  }
  if (!offerResponse.response.ok || !offerResponse.payload?.qrPayload) {
    return blocked(offerResponse.payload?.reason || 'PAIRING_CODE_REJECTED', 'Inventory rejected or could not find the pairing code.', {
      dispatchAttempted: true,
      httpStatus: offerResponse.response.status,
    });
  }

  const decoded = decodePairingPayload(offerResponse.payload.qrPayload);
  if (!decoded.ok) return decoded;
  const validation = validateOffer(decoded.offer, host, port);
  if (!validation.valid) return blocked('PAIRING_OFFER_INVALID', validation.blockers.join(' · '), { validation });

  let keyPair;
  try {
    keyPair = await globalThis.crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  } catch {
    return blocked('ED25519_UNAVAILABLE', 'This browser cannot create the required secure device proof. Update the device browser.');
  }
  ephemeralPrivateKey = keyPair.privateKey;
  const spki = await globalThis.crypto.subtle.exportKey('spki', keyPair.publicKey);
  const publicKeyPem = spkiToPem(spki);
  const publicKeyFingerprint = await sha256Hex(spki);
  const proof = buildPairingProof({
    offerId: decoded.offer.offerId,
    challenge: decoded.offer.challenge,
    deviceId,
    sessionId,
    storeId: decoded.offer.storeId,
    inventoryInstanceId: decoded.offer.inventoryInstanceId,
    environment: decoded.offer.environment,
  });
  const signatureBytes = await globalThis.crypto.subtle.sign(
    { name: 'Ed25519' },
    ephemeralPrivateKey,
    new TextEncoder().encode(proof),
  );
  const confirmation = {
    offerId: decoded.offer.offerId,
    token: decoded.offer.token,
    deviceId,
    sessionId,
    storeId: decoded.offer.storeId,
    inventoryInstanceId: decoded.offer.inventoryInstanceId,
    environment: decoded.offer.environment,
    publicKeyPem,
    signature: bytesToBase64(signatureBytes),
  };

  let confirmationResponse;
  try {
    confirmationResponse = await fetchJson(`${baseUrl}${PAIRING_CONFIRMATION_PATH}`, {
      method: 'POST',
      body: confirmation,
    });
  } catch (error) {
    return blocked(error?.name === 'AbortError' ? 'PAIRING_TIMEOUT' : 'PAIRING_TRANSPORT_ERROR', 'Inventory did not complete the pairing confirmation.', { dispatchAttempted: true });
  }
  const payload = confirmationResponse.payload;
  const responseValid = confirmationResponse.response.ok
    && payload?.ok === true
    && payload?.status === 'PAIRED'
    && payload?.deviceId === deviceId
    && payload?.storeId === decoded.offer.storeId
    && payload?.inventoryInstanceId === decoded.offer.inventoryInstanceId
    && payload?.environment === decoded.offer.environment
    && payload?.publicKeyFingerprint === publicKeyFingerprint
    && /^[a-f0-9]{64}$/i.test(asText(payload?.trustReference))
    && Date.parse(asText(payload?.trustExpiresAt)) > Date.now()
    && payload?.persisted === false
    && payload?.credentialsPersisted === false;
  if (!responseValid) {
    return blocked(payload?.reason || 'PAIRING_RESPONSE_INVALID', payload?.message || 'Inventory returned an invalid pairing response.', {
      dispatchAttempted: true,
      httpStatus: confirmationResponse.response.status,
    });
  }

  const profile = safeSessionWrite({
    status: 'PAIRED',
    phase: SCANOPS_BROWSER_PAIRING_V1_PHASE,
    deviceId,
    sessionId,
    storeId: payload.storeId,
    inventoryInstanceId: payload.inventoryInstanceId,
    environment: payload.environment,
    inventoryHost: host,
    inventoryPort: port,
    trustReference: payload.trustReference,
    publicKeyFingerprint: payload.publicKeyFingerprint,
    pairedAt: payload.pairedAt,
    trustExpiresAt: payload.trustExpiresAt,
  });

  return {
    ok: true,
    status: 'PAIRED',
    paired: true,
    dispatchAttempted: true,
    httpStatus: confirmationResponse.response.status,
    profile,
    credentialsPersisted: false,
    inventoryMutationAttempted: false,
    scanOpsMutationAttempted: false,
  };
}
