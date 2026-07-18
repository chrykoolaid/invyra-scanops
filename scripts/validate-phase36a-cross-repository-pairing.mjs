#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  canonicalizeBridgeContractV1,
  computeBridgeContractV1SemanticHash,
} from '../src/inventory-bridge/canonicalContract/v1/canonicalizeBridgeContractV1.js';
import { BRIDGE_CONTRACT_V1 as SCANOPS_CONTRACT } from '../src/inventory-bridge/canonicalContract/v1/bridgeContractV1.js';
import { createScanOpsEphemeralPairingClientV1 } from '../src/inventory-bridge/pairing/v1/index.js';
import { createScanOpsTestTransportClientV1 } from '../src/inventory-bridge/testTransport/v1/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const inventoryRoot = process.env.INVENTORY_REPO_PATH
  ? join(root, process.env.INVENTORY_REPO_PATH)
  : join(root, 'inventory-repo');
const inventoryPairing = await import(pathToFileURL(join(
  inventoryRoot, 'src/inventory-bridge/pairing/v1/index.js',
)).href);
const inventoryTransport = await import(pathToFileURL(join(
  inventoryRoot, 'src/inventory-bridge/testTransport/v1/index.js',
)).href);
const inventoryContract = await import(pathToFileURL(join(
  inventoryRoot, 'src/inventory-bridge/canonicalContract/v1/index.js',
)).href);

const EXPECTED_CONTRACT_HASH = '9a7718a37f66236d0c0e9873cade6745c83f3a56cf41d969edf8ef9359eee5f5';
const checks = [];
function check(name, condition, detail = '') {
  checks.push({ name, passed: condition === true, detail });
}
function hash(value) {
  return createHash('sha256')
    .update(canonicalizeBridgeContractV1(value), 'utf8')
    .digest('hex');
}

check('scanops_contract_hash_locked', computeBridgeContractV1SemanticHash() === EXPECTED_CONTRACT_HASH);
check('inventory_contract_hash_locked', hash(inventoryContract.BRIDGE_CONTRACT_V1) === EXPECTED_CONTRACT_HASH);
check('contracts_identical', hash(SCANOPS_CONTRACT) === hash(inventoryContract.BRIDGE_CONTRACT_V1));

const storeId = 'store-036a-cross';
const inventoryInstanceId = 'inventory-instance-036a-cross';
const deviceId = 'scanops-device-036a-cross';
const sessionId = 'session-036a-cross';
const pairingNow = () => '2026-07-18T12:00:00.000Z';
const envelopeNow = () => '2026-07-18T12:00:02.000Z';
const receiptNow = () => '2026-07-18T12:00:03.000Z';

const authority = inventoryPairing.createInventoryEphemeralPairingAuthorityV1({
  configuration: { bridge_enabled: true, transport_enabled: true, pairing_enabled: true },
  environment: 'TEST',
  bindHost: '127.0.0.1',
  advertisedHost: '127.0.0.1',
  port: 0,
  allowEphemeralPortForTest: true,
  inventoryInstanceId,
  storeId,
  now: pairingNow,
  offerIdFactory: () => 'pair:phase36a:cross',
  challengeFactory: () => 'challenge-phase36a-cross',
  tokenFactory: () => 'token-phase36a-cross',
});

let pairingStart;
let transportServer;
let transportStart;
let pairingResult;
let untrustedResult;
let pairedHealthResult;
let transportStopped;
let authorityStopped;

try {
  pairingStart = await authority.start();
  check('pairing_authority_started', pairingStart.started === true, pairingStart);
  check('pairing_authority_loopback', pairingStart.boundAddress?.address === '127.0.0.1', pairingStart.boundAddress);

  const offer = authority.createPairingOffer();
  check('short_lived_offer_created', offer.ok === true && offer.persisted === false, offer);

  const pairingClient = createScanOpsEphemeralPairingClientV1({
    configuration: { bridge_enabled: true, transport_enabled: true, pairing_enabled: true },
    environment: 'TEST',
    timeoutMs: 1_000,
    now: pairingNow,
  });
  pairingResult = await pairingClient.pair(offer.qrPayload, { deviceId, sessionId });
  check('real_pairing_http_exchange', pairingResult.ok === true && pairingResult.status === 'PAIRED', pairingResult);
  check('inventory_trust_contains_device', authority.getTrustedDeviceIds().length === 1 && authority.getTrustedDeviceIds()[0] === deviceId, authority.getTrustedDeviceIds());
  check('scanops_profile_is_ephemeral', pairingClient.getPairedProfile()?.deviceId === deviceId && pairingResult.credentialsPersisted === false, pairingResult);

  const admission = authority.getAdmissionConfiguration();
  transportServer = inventoryTransport.createInventoryTestHttpServerV1({
    configuration: {
      bridge_enabled: true,
      transport_enabled: true,
      ...admission,
    },
    environment: 'TEST',
    bindHost: '127.0.0.1',
    port: 0,
    allowEphemeralPortForTest: true,
    requestTimeoutMs: 1_000,
    now: receiptNow,
  });
  transportStart = await transportServer.start();
  check('health_transport_started_from_trust_policy', transportStart.started === true, transportStart);

  const untrustedClient = createScanOpsTestTransportClientV1({
    configuration: { bridge_enabled: true, transport_enabled: true },
    environment: 'TEST',
    inventoryHost: '127.0.0.1',
    inventoryPort: transportStart.boundAddress.port,
    timeoutMs: 1_000,
    now: envelopeNow,
  });
  untrustedResult = await untrustedClient.sendHealthPing({
    envelopeId: 'env:phase36a:untrusted',
    idempotencyKey: 'idem:phase36a:untrusted',
    traceId: 'trace:phase36a:untrusted',
    deviceId: 'scanops-device-untrusted-036a',
    storeId,
    sessionId: 'session-untrusted-036a',
    inventoryInstanceId,
    payload: { requestType: 'BRIDGE_HEALTH', clientTime: envelopeNow() },
  });
  check('untrusted_device_rejected', untrustedResult.ok === false && untrustedResult.httpStatus === 422, untrustedResult);

  const healthOptions = pairingClient.getHealthTransportOptions({
    inventoryHost: '127.0.0.1',
    inventoryPort: transportStart.boundAddress.port,
  });
  check('paired_health_options_created', healthOptions.ok === true, healthOptions);
  const pairedHealthClient = createScanOpsTestTransportClientV1({
    ...healthOptions.options,
    timeoutMs: 1_000,
    now: envelopeNow,
  });
  pairedHealthResult = await pairedHealthClient.sendHealthPing({
    envelopeId: 'env:phase36a:paired',
    idempotencyKey: 'idem:phase36a:paired',
    traceId: 'trace:phase36a:paired',
    deviceId,
    storeId,
    sessionId,
    inventoryInstanceId,
    payload: { requestType: 'BRIDGE_HEALTH', clientTime: envelopeNow() },
  });
  check('paired_health_accepted', pairedHealthResult.ok === true && pairedHealthResult.httpStatus === 200, pairedHealthResult);
  check('paired_receipt_correlated', pairedHealthResult.receiptValid === true && pairedHealthResult.correlated === true, pairedHealthResult);

  const businessAttempt = await pairedHealthClient.sendEnvelope({
    operationType: 'COUNT_SUBMISSION',
    envelopeId: 'env:phase36a:business-blocked',
  });
  check('business_operation_blocked_before_dispatch', businessAttempt.status === 'BLOCKED' && businessAttempt.dispatchAttempted === false, businessAttempt);

  const pairingDiagnostics = authority.getDiagnostics();
  const scanOpsDiagnostics = pairingClient.getDiagnostics();
  const inventoryDiagnostics = transportServer.getDiagnostics();
  check('no_persistence_or_credentials', pairingDiagnostics.persistenceAttempted === false && pairingDiagnostics.credentialsPersisted === false && scanOpsDiagnostics.persistenceAttempted === false && scanOpsDiagnostics.credentialsPersisted === false);
  check('no_queue_retry_replay_or_discovery', pairingDiagnostics.queueWriteAttempted === false && pairingDiagnostics.retryScheduled === false && pairingDiagnostics.discoveryAttempted === false && scanOpsDiagnostics.queueWriteAttempted === false && scanOpsDiagnostics.automaticRetryScheduled === false && scanOpsDiagnostics.discoveryAttempted === false);
  check('no_business_or_entity_mutation', pairingDiagnostics.businessOperationAttempted === false && pairingDiagnostics.inventoryMutationAttempted === false && pairingDiagnostics.scanOpsMutationAttempted === false && inventoryDiagnostics.inventoryMutationAttempted === false && inventoryDiagnostics.scanOpsMutationAttempted === false && inventoryDiagnostics.stockMutationAttempted === false && inventoryDiagnostics.ledgerMutationAttempted === false);

  transportStopped = await transportServer.stop();
  check('health_transport_stopped', transportStopped.stopped === true, transportStopped);
  check('manual_revoke_removes_trust', authority.revokeDevice(deviceId).revoked === true && authority.getTrustedDeviceIds().length === 0);

  const revokedServer = inventoryTransport.createInventoryTestHttpServerV1({
    configuration: {
      bridge_enabled: true,
      transport_enabled: true,
      ...authority.getAdmissionConfiguration(),
    },
    environment: 'TEST',
    bindHost: '127.0.0.1',
    port: 0,
    allowEphemeralPortForTest: true,
  });
  const revokedStart = await revokedServer.start();
  check('empty_trust_policy_fails_closed', revokedStart.started === false && revokedStart.reason === 'RUNTIME_GATE_BLOCKED', revokedStart);
} finally {
  if (!transportStopped && transportStart?.started && transportServer) {
    transportStopped = await transportServer.stop();
  }
  authorityStopped = await authority.stop();
  check('pairing_authority_stopped', authorityStopped.stopped === true, authorityStopped);
  check('authority_stop_clears_ephemeral_state', authorityStopped.diagnostics.activeOffers === 0 && authorityStopped.diagnostics.activeTrustRecords === 0, authorityStopped);
}

const failures = checks.filter((entry) => !entry.passed);
const report = {
  phase: '36-A',
  repositories: ['chrykoolaid/invyra-scanops', 'chrykoolaid/invyra-base44'],
  passed: failures.length === 0,
  totalChecks: checks.length,
  passedChecks: checks.length - failures.length,
  failedChecks: failures.length,
  pairingStatus: pairingResult?.status || null,
  untrustedHealthHttpStatus: untrustedResult?.httpStatus || null,
  pairedHealthHttpStatus: pairedHealthResult?.httpStatus || null,
  pairedReceiptCorrelated: pairedHealthResult?.correlated === true,
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
