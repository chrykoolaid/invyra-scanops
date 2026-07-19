#!/usr/bin/env node
import { createHash, createPublicKey, verify as verifySignature } from 'node:crypto';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { BRIDGE_CONTRACT_V1 } from '../src/inventory-bridge/canonicalContract/v1/index.js';

const checks = [];
function check(name, condition, detail = '') {
  checks.push({ name, passed: condition === true, detail });
}

const storage = new Map();
const sessionStorage = {
  getItem: (key) => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};
globalThis.window = {
  location: { protocol: 'http:', hostname: '127.0.0.1' },
  sessionStorage,
  localStorage: sessionStorage,
  setTimeout,
  clearTimeout,
};

const now = () => new Date().toISOString();
const setupCode = '390039';
const offerId = 'pair:phase39-0b:scanops-validator';
const challenge = 'phase39-0b-browser-challenge';
const token = 'phase39-0b-browser-token';
const storeId = 'store-0390b';
const inventoryInstanceId = 'inventory-0390b';
const environment = 'TRAINING';
let pairedDeviceId = null;
let trustReference = null;
let publicPort = null;

function pairingProof(input = {}) {
  return [
    'INVYRA_PAIRING_PROOF_V1', input.offerId, input.challenge, input.deviceId,
    input.sessionId, input.storeId, input.inventoryInstanceId, input.environment,
  ].join('\n');
}

function writeJson(response, statusCode, body) {
  const text = JSON.stringify(body);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(text),
    'Access-Control-Allow-Origin': '*',
  });
  response.end(text);
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', 'http://inventory.local');
  if (request.method === 'GET' && requestUrl.pathname === `/api/bridge/v1/pairing/offers/${setupCode}`) {
    const offer = {
      format: 'INVYRA_PAIRING_OFFER_V1',
      version: '1.0.0',
      offerId,
      challenge,
      token,
      environment,
      storeId,
      inventoryInstanceId,
      createdAt: now(),
      expiresAt: new Date(Date.now() + 120_000).toISOString(),
      pairingEndpoint: {
        protocol: 'http', host: '127.0.0.1', port: publicPort,
        path: '/api/bridge/v1/pairing/confirmations',
      },
    };
    writeJson(response, 200, {
      ok: true,
      qrPayload: `invyra-pairing-v1:${Buffer.from(JSON.stringify(offer)).toString('base64url')}`,
      expiresAt: offer.expiresAt,
    });
    return;
  }
  if (request.method === 'POST' && requestUrl.pathname === '/api/bridge/v1/pairing/confirmations') {
    const body = await readBody(request);
    const proof = pairingProof({
      offerId: body.offerId,
      challenge,
      deviceId: body.deviceId,
      sessionId: body.sessionId,
      storeId: body.storeId,
      inventoryInstanceId: body.inventoryInstanceId,
      environment: body.environment,
    });
    const signatureValid = verifySignature(
      null,
      Buffer.from(proof),
      createPublicKey(body.publicKeyPem),
      Buffer.from(body.signature, 'base64'),
    );
    if (!signatureValid || body.token !== token) {
      writeJson(response, 422, { ok: false, status: 'REJECTED', reason: 'DEVICE_PROOF_INVALID' });
      return;
    }
    const der = createPublicKey(body.publicKeyPem).export({ type: 'spki', format: 'der' });
    const fingerprint = createHash('sha256').update(der).digest('hex');
    pairedDeviceId = body.deviceId;
    trustReference = createHash('sha256').update(`${body.deviceId}\n${fingerprint}\n${Date.now()}`).digest('hex');
    const pairedAt = now();
    writeJson(response, 200, {
      ok: true,
      status: 'PAIRED',
      phase: '39-0B',
      deviceId: body.deviceId,
      storeId,
      inventoryInstanceId,
      environment,
      publicKeyFingerprint: fingerprint,
      trustReference,
      pairedAt,
      trustExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      persisted: false,
      credentialsPersisted: false,
      businessOperationAttempted: false,
      inventoryMutationAttempted: false,
      scanOpsMutationAttempted: false,
    });
    return;
  }
  if (request.method === 'POST' && requestUrl.pathname === '/api/bridge/v1/handoffs') {
    const envelope = await readBody(request);
    if (envelope.source?.deviceId !== pairedDeviceId || envelope.payload?.trustReference !== trustReference) {
      writeJson(response, 422, {
        contractId: BRIDGE_CONTRACT_V1.contractId,
        schemaVersion: BRIDGE_CONTRACT_V1.schemaVersion,
        receiptId: 'receipt:rejected:trust',
        envelopeId: envelope.envelopeId,
        idempotencyKey: envelope.idempotencyKey,
        traceId: envelope.traceId,
        admissionStatus: 'REJECTED',
        applicationStatus: 'NOT_APPLICABLE',
        receivedAt: now(),
        processedAt: now(),
        inventoryInstanceId,
        environment,
        operationType: envelope.operationType,
        message: 'Trust rejected.',
        errors: [{ code: 'DEVICE_NOT_TRUSTED', message: 'Trust rejected.', field: 'payload.trustReference', retryable: false }],
        warnings: [],
      });
      return;
    }
    writeJson(response, 200, {
      contractId: BRIDGE_CONTRACT_V1.contractId,
      schemaVersion: BRIDGE_CONTRACT_V1.schemaVersion,
      receiptId: `receipt:health:${envelope.envelopeId}`,
      envelopeId: envelope.envelopeId,
      idempotencyKey: envelope.idempotencyKey,
      traceId: envelope.traceId,
      admissionStatus: 'ACCEPTED',
      applicationStatus: 'NOT_APPLICABLE',
      receivedAt: now(),
      processedAt: now(),
      inventoryInstanceId,
      environment,
      operationType: envelope.operationType,
      message: 'Trusted health request accepted. No business operation was applied.',
      errors: [],
      warnings: [],
    });
    return;
  }
  writeJson(response, 404, { ok: false, reason: 'NOT_FOUND' });
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
publicPort = server.address().port;

const {
  clearLiveConnection,
  getLiveConnectionProfile,
  pairInventoryDesktop,
  runLiveBridgeHealthTest,
} = await import('../src/lib/scanOpsLiveConnectivity.js');

const session = {
  deviceId: 'SCANOPS-HH-0390B',
  sessionId: 'SESSION-0390B',
  storeId,
};

const invalidCode = await pairInventoryDesktop({
  host: '127.0.0.1', port: publicPort, setupCode: '123', session,
});
check('short_invalid_code_blocked_before_dispatch', invalidCode.ok === false && invalidCode.reason === 'PAIRING_CODE_INVALID', invalidCode);

const pairing = await pairInventoryDesktop({
  host: '127.0.0.1', port: publicPort, setupCode, session,
});
check('browser_pairing_succeeds', pairing.ok === true && pairing.status === 'PAIRED', pairing);
const profile = getLiveConnectionProfile();
check('paired_profile_available', profile?.deviceId === session.deviceId && profile?.inventoryPort === publicPort, profile);
check('trust_is_session_scoped', sessionStorage.getItem('invyra_scanops_phase39_0b_paired_profile_v1') !== null, storage);
check('private_key_not_persisted', !String(sessionStorage.getItem('invyra_scanops_phase39_0b_paired_profile_v1')).includes('PRIVATE KEY'), sessionStorage.getItem('invyra_scanops_phase39_0b_paired_profile_v1'));

const health = await runLiveBridgeHealthTest(session);
check('real_health_test_connected', health.ok === true && health.status === 'CONNECTED', health);
check('health_receipt_admission_accepted', health.admissionStatus === 'ACCEPTED', health);
check('health_application_not_applied', health.applicationStatus === 'NOT_APPLICABLE', health);
check('health_receipt_correlated', typeof health.receiptId === 'string' && health.receiptId.startsWith('receipt:health:'), health);
check('no_mutation_flags', health.inventoryMutationAttempted === false && health.scanOpsMutationAttempted === false, health);

const wrongDevice = await runLiveBridgeHealthTest({ ...session, deviceId: 'OTHER-DEVICE' });
check('device_identity_change_requires_repairing', wrongDevice.ok === false && wrongDevice.reason === 'DEVICE_ID_CHANGED', wrongDevice);

const ui = readFileSync(new URL('../src/pages/SyncHandoff.jsx', import.meta.url), 'utf8');
const service = readFileSync(new URL('../src/lib/scanOpsLiveConnectivity.js', import.meta.url), 'utf8');
const browserPairing = readFileSync(new URL('../src/inventory-bridge/pairing/browser/v1/scanOpsBrowserPairingClientV1.js', import.meta.url), 'utf8');
check('sync_ui_calls_real_pairing_service', ui.includes('pairInventoryDesktop') && ui.includes('six-digit pairing code'), 'SyncHandoff pairing wiring');
check('sync_ui_calls_real_health_service', ui.includes('runLiveBridgeHealthTest') && ui.includes('Run Connection Test'), 'SyncHandoff health wiring');
check('fake_profile_ready_result_removed', !ui.includes('Profile ready') && !ui.includes('future bridge handoff'), 'no fake success');
check('health_service_uses_certified_transport_client', service.includes('createScanOpsTestTransportClientV1') && service.includes('sendHealthPing'), 'transport client wiring');
check('browser_pairing_uses_web_crypto', browserPairing.includes("generateKey({ name: 'Ed25519' }") && browserPairing.includes("subtle.sign"), 'Web Crypto proof');
check('browser_pairing_blocks_hosted_mixed_content', browserPairing.includes('MIXED_CONTENT_BLOCKED'), 'mixed-content guard');

clearLiveConnection();
check('temporary_pairing_can_be_cleared', getLiveConnectionProfile() === null, getLiveConnectionProfile());

await new Promise((resolve) => server.close(resolve));

const failures = checks.filter((entry) => !entry.passed);
const report = {
  phase: '39-0B',
  repository: 'chrykoolaid/invyra-scanops',
  passed: failures.length === 0,
  totalChecks: checks.length,
  passedChecks: checks.length - failures.length,
  failedChecks: failures.length,
  connectionReadiness: failures.length === 0 ? 'SCANOPS_SIDE_READY' : 'FAIL',
  receivingIntegrationAuthorized: false,
  tests: checks,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
