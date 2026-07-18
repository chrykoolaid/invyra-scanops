#!/usr/bin/env node
import { createHash, createPublicKey, verify as verifySignature } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildPairingProofV1,
  createScanOpsEphemeralPairingClientV1,
  SCANOPS_EPHEMERAL_PAIRING_V1_SCHEME,
} from '../src/inventory-bridge/pairing/v1/index.js';
import {
  BRIDGE_CONTRACT_V1,
  canonicalizeBridgeContractV1,
} from '../src/inventory-bridge/canonicalContract/v1/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const goldenEnvelope = JSON.parse(readFileSync(join(
  root,
  'src/inventory-bridge/canonicalAdapter/v1/fixtures/healthEnvelopeV1.json',
), 'utf8'));
const goldenReceipt = JSON.parse(readFileSync(join(
  root,
  'src/inventory-bridge/canonicalAdapter/v1/fixtures/healthReceiptV1.json',
), 'utf8'));
const EXPECTED = Object.freeze({
  contract: '9a7718a37f66236d0c0e9873cade6745c83f3a56cf41d969edf8ef9359eee5f5',
  envelope: '50c8098e8ec84b63b49e307c648e691c2b3aba41f015614edd3a5f4c9a0f4a81',
  receipt: 'c5fdfbe7f0b990e9b312ba669a35fab411539c6cdafd8bd808bc0a7be906d192',
});

const checks = [];
function check(name, condition, detail = '') {
  checks.push({ name, passed: condition === true, detail });
}
function hash(value) {
  return createHash('sha256')
    .update(canonicalizeBridgeContractV1(value), 'utf8')
    .digest('hex');
}
function qr(offer) {
  return `${SCANOPS_EPHEMERAL_PAIRING_V1_SCHEME}${Buffer.from(JSON.stringify(offer), 'utf8').toString('base64url')}`;
}
function makeOffer(overrides = {}) {
  return {
    format: 'INVYRA_PAIRING_OFFER_V1',
    version: '1.0.0',
    offerId: 'pair:phase36a:scanops',
    challenge: 'challenge-scanops',
    token: 'token-scanops',
    environment: 'TEST',
    storeId: 'store-036a',
    inventoryInstanceId: 'inventory-instance-036a',
    createdAt: '2026-07-18T12:00:00.000Z',
    expiresAt: '2026-07-18T12:02:00.000Z',
    pairingEndpoint: {
      protocol: 'http',
      host: '127.0.0.1',
      port: 8790,
      path: '/api/bridge/v1/pairing/confirmations',
    },
    ...overrides,
  };
}
function jsonResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() { return JSON.stringify(payload); },
  };
}

check('contract_hash_locked', hash(BRIDGE_CONTRACT_V1) === EXPECTED.contract, hash(BRIDGE_CONTRACT_V1));
check('golden_envelope_hash_locked', hash(goldenEnvelope) === EXPECTED.envelope, hash(goldenEnvelope));
check('golden_receipt_hash_locked', hash(goldenReceipt) === EXPECTED.receipt, hash(goldenReceipt));

const defaultClient = createScanOpsEphemeralPairingClientV1();
const defaultParse = defaultClient.parsePairingOffer(qr(makeOffer()));
check('defaults_fail_closed', defaultParse.ok === false && defaultParse.reason === 'RUNTIME_GATE_BLOCKED', defaultParse);

const liveClient = createScanOpsEphemeralPairingClientV1({
  configuration: { bridge_enabled: true, transport_enabled: true, pairing_enabled: true },
  environment: 'LIVE',
  now: () => '2026-07-18T12:00:30.000Z',
});
check('live_environment_blocked', liveClient.parsePairingOffer(qr(makeOffer({ environment: 'LIVE' }))).ok === false);

const validationClient = createScanOpsEphemeralPairingClientV1({
  configuration: { bridge_enabled: true, transport_enabled: true, pairing_enabled: true },
  environment: 'TEST',
  now: () => '2026-07-18T12:00:30.000Z',
});
check('invalid_scheme_rejected', validationClient.parsePairingOffer('https://example.test/pair').reason === 'PAIRING_SCHEME_INVALID');
check('invalid_base64_rejected', validationClient.parsePairingOffer(`${SCANOPS_EPHEMERAL_PAIRING_V1_SCHEME}%%%`).ok === false);
check('expired_offer_rejected', validationClient.parsePairingOffer(qr(makeOffer({ expiresAt: '2026-07-18T11:59:00.000Z' }))).validation.blockers.includes('PAIRING_OFFER_EXPIRED'));
check('wrong_environment_rejected', validationClient.parsePairingOffer(qr(makeOffer({ environment: 'TRAINING' }))).validation.blockers.includes('ENVIRONMENT_MISMATCH'));
check('placeholder_store_rejected', validationClient.parsePairingOffer(qr(makeOffer({ storeId: 'store-local' }))).validation.blockers.includes('STORE_ID_INVALID'));
check('wrong_confirmation_path_rejected', validationClient.parsePairingOffer(qr(makeOffer({ pairingEndpoint: { ...makeOffer().pairingEndpoint, path: '/wrong' } }))).validation.blockers.includes('PAIRING_PATH_INVALID'));

let capturedRequest = null;
let successfulNow = '2026-07-18T12:00:30.000Z';
const successfulClient = createScanOpsEphemeralPairingClientV1({
  configuration: { bridge_enabled: true, transport_enabled: true, pairing_enabled: true },
  environment: 'TEST',
  now: () => successfulNow,
  fetchAdapter: async (url, options) => {
    capturedRequest = { url, options, body: JSON.parse(options.body) };
    const body = capturedRequest.body;
    const proof = buildPairingProofV1({
      offerId: body.offerId,
      challenge: 'challenge-scanops',
      deviceId: body.deviceId,
      sessionId: body.sessionId,
      storeId: body.storeId,
      inventoryInstanceId: body.inventoryInstanceId,
      environment: body.environment,
    });
    const signatureValid = verifySignature(
      null,
      Buffer.from(proof, 'utf8'),
      createPublicKey(body.publicKeyPem),
      Buffer.from(body.signature, 'base64'),
    );
    check('device_signature_valid', signatureValid, body);
    const der = createPublicKey(body.publicKeyPem).export({ type: 'spki', format: 'der' });
    const fingerprint = createHash('sha256').update(der).digest('hex');
    return jsonResponse(200, {
      ok: true,
      status: 'PAIRED',
      deviceId: body.deviceId,
      storeId: body.storeId,
      inventoryInstanceId: body.inventoryInstanceId,
      environment: body.environment,
      publicKeyFingerprint: fingerprint,
      trustReference: 'a'.repeat(64),
      pairedAt: '2026-07-18T12:00:31.000Z',
      trustExpiresAt: '2026-07-18T12:15:31.000Z',
      persisted: false,
      credentialsPersisted: false,
    });
  },
});

const paired = await successfulClient.pair(qr(makeOffer()), {
  deviceId: 'scanops-device-036a',
  sessionId: 'session-036a',
});
check('valid_pairing_succeeds', paired.ok === true && paired.status === 'PAIRED', paired);
check('pairing_posts_expected_endpoint', capturedRequest.url === 'http://127.0.0.1:8790/api/bridge/v1/pairing/confirmations', capturedRequest);
check('pairing_uses_json_post', capturedRequest.options.method === 'POST' && capturedRequest.options.headers['Content-Type'] === 'application/json', capturedRequest.options);
check('paired_profile_is_ephemeral', successfulClient.getPairedProfile()?.deviceId === 'scanops-device-036a' && paired.credentialsPersisted === false, paired);

const replay = await successfulClient.pair(qr(makeOffer()), {
  deviceId: 'scanops-device-036a',
  sessionId: 'session-036a',
});
check('local_offer_replay_blocked', replay.ok === false && replay.reason === 'PAIRING_OFFER_ALREADY_USED_LOCALLY', replay);

const healthOptions = successfulClient.getHealthTransportOptions({
  inventoryHost: '127.0.0.1',
  inventoryPort: 8791,
});
check('paired_health_options_created', healthOptions.ok === true && healthOptions.options.pairedIdentity.deviceId === 'scanops-device-036a', healthOptions);
check('health_options_preserve_inventory_identity', healthOptions.options.pairedIdentity.storeId === 'store-036a' && healthOptions.options.pairedIdentity.inventoryInstanceId === 'inventory-instance-036a', healthOptions);
check('remote_health_override_blocked', successfulClient.getHealthTransportOptions({ inventoryHost: 'example.com', inventoryPort: 8791 }).reason === 'TRANSPORT_ENDPOINT_INVALID');
check('invalid_health_protocol_blocked', successfulClient.getHealthTransportOptions({ inventoryHost: '127.0.0.1', inventoryPort: 8791, protocol: 'ftp' }).reason === 'TRANSPORT_ENDPOINT_INVALID');
successfulNow = '2026-07-18T12:16:00.000Z';
check('expired_trust_blocks_health_options', successfulClient.getHealthTransportOptions({ inventoryHost: '127.0.0.1', inventoryPort: 8791 }).reason === 'PAIRING_TRUST_EXPIRED');
successfulNow = '2026-07-18T12:00:30.000Z';

const rejectionClient = createScanOpsEphemeralPairingClientV1({
  configuration: { bridge_enabled: true, transport_enabled: true, pairing_enabled: true },
  environment: 'TEST',
  now: () => '2026-07-18T12:00:30.000Z',
  fetchAdapter: async () => jsonResponse(422, { ok: false, status: 'REJECTED', reason: 'PAIRING_TOKEN_INVALID' }),
});
const rejected = await rejectionClient.pair(qr(makeOffer({ offerId: 'pair:rejected' })), {
  deviceId: 'scanops-device-rejected', sessionId: 'session-rejected',
});
check('non_2xx_pairing_rejection_safe', rejected.status === 'PAIRING_REJECTED' && rejected.httpStatus === 422, rejected);

const malformedClient = createScanOpsEphemeralPairingClientV1({
  configuration: { bridge_enabled: true, transport_enabled: true, pairing_enabled: true },
  environment: 'TEST',
  now: () => '2026-07-18T12:00:30.000Z',
  fetchAdapter: async () => jsonResponse(200, { ok: true, status: 'PAIRED', deviceId: 'wrong-device' }),
});
const malformed = await malformedClient.pair(qr(makeOffer({ offerId: 'pair:malformed' })), {
  deviceId: 'scanops-device-malformed', sessionId: 'session-malformed',
});
check('malformed_success_response_rejected', malformed.status === 'PAIRING_RESPONSE_INVALID', malformed);

const timeoutClient = createScanOpsEphemeralPairingClientV1({
  configuration: { bridge_enabled: true, transport_enabled: true, pairing_enabled: true },
  environment: 'TEST',
  timeoutMs: 20,
  now: () => '2026-07-18T12:00:30.000Z',
  fetchAdapter: async (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
  }),
});
const timeoutResult = await timeoutClient.pair(qr(makeOffer({ offerId: 'pair:timeout' })), {
  deviceId: 'scanops-device-timeout', sessionId: 'session-timeout',
});
check('pairing_timeout_fails_safely', timeoutResult.status === 'TIMEOUT' && timeoutResult.timeoutTriggered === true, timeoutResult);
check('timeout_does_not_retry', timeoutResult.retryScheduled === false && timeoutResult.replayAttempted === false, timeoutResult);

const diagnostics = successfulClient.getDiagnostics();
check('pairing_diagnostics_record_success', diagnostics.metrics.successfulPairings === 1 && diagnostics.paired === true, diagnostics);
check('private_key_memory_only', diagnostics.privateKeyHeldInMemory === true && diagnostics.credentialsPersisted === false, diagnostics);
check('no_discovery_websocket_queue_or_persistence', diagnostics.discoveryAttempted === false && diagnostics.websocketStarted === false && diagnostics.queueWriteAttempted === false && diagnostics.persistenceAttempted === false, diagnostics);
check('no_business_or_entity_mutation', diagnostics.businessOperationAttempted === false && diagnostics.inventoryMutationAttempted === false && diagnostics.scanOpsMutationAttempted === false, diagnostics);

const cleared = successfulClient.clearPairing();
check('manual_clear_removes_ephemeral_pairing', cleared.cleared === true && successfulClient.getPairedProfile() === null, cleared);
check('health_options_blocked_after_clear', successfulClient.getHealthTransportOptions({ inventoryPort: 8791 }).reason === 'DEVICE_NOT_PAIRED');

const failures = checks.filter((entry) => !entry.passed);
const report = {
  phase: '36-A',
  repository: 'chrykoolaid/invyra-scanops',
  passed: failures.length === 0,
  totalChecks: checks.length,
  passedChecks: checks.length - failures.length,
  failedChecks: failures.length,
  pairingStatus: paired.status,
  persistenceAttempted: false,
  credentialsPersisted: false,
  queueWriteAttempted: false,
  businessOperationAttempted: false,
  inventoryMutationAttempted: false,
  scanOpsMutationAttempted: false,
  checks,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exit(1);
