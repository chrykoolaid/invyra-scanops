#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  canonicalizeBridgeContractV1,
  computeBridgeContractV1SemanticHash,
} from '../src/inventory-bridge/canonicalContract/v1/canonicalizeBridgeContractV1.js';
import { BRIDGE_CONTRACT_V1 as SCANOPS_CONTRACT } from '../src/inventory-bridge/canonicalContract/v1/bridgeContractV1.js';
import { createScanOpsTestTransportClientV1 } from '../src/inventory-bridge/testTransport/v1/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const inventoryRoot = process.env.INVENTORY_REPO_PATH
  ? join(root, process.env.INVENTORY_REPO_PATH)
  : join(root, 'inventory-repo');
const inventoryTransportUrl = pathToFileURL(join(
  inventoryRoot,
  'src/inventory-bridge/testTransport/v1/index.js',
)).href;
const inventoryContractUrl = pathToFileURL(join(
  inventoryRoot,
  'src/inventory-bridge/canonicalContract/v1/index.js',
)).href;
const {
  createInventoryTestHttpServerV1,
  INVENTORY_TEST_HTTP_TRANSPORT_V1_PATHS,
} = await import(inventoryTransportUrl);
const { BRIDGE_CONTRACT_V1: INVENTORY_CONTRACT } = await import(inventoryContractUrl);

const scanOpsEnvelope = JSON.parse(readFileSync(join(
  root,
  'src/inventory-bridge/canonicalAdapter/v1/fixtures/healthEnvelopeV1.json',
), 'utf8'));
const scanOpsReceipt = JSON.parse(readFileSync(join(
  root,
  'src/inventory-bridge/canonicalAdapter/v1/fixtures/healthReceiptV1.json',
), 'utf8'));
const inventoryEnvelope = JSON.parse(readFileSync(join(
  inventoryRoot,
  'src/inventory-bridge/canonicalAdapter/v1/fixtures/healthEnvelopeV1.json',
), 'utf8'));
const inventoryReceipt = JSON.parse(readFileSync(join(
  inventoryRoot,
  'src/inventory-bridge/canonicalAdapter/v1/fixtures/healthReceiptV1.json',
), 'utf8'));

const EXPECTED = Object.freeze({
  contract: '9a7718a37f66236d0c0e9873cade6745c83f3a56cf41d969edf8ef9359eee5f5',
  envelope: '50c8098e8ec84b63b49e307c648e691c2b3aba41f015614edd3a5f4c9a0f4a81',
  receipt: 'c5fdfbe7f0b990e9b312ba669a35fab411539c6cdafd8bd808bc0a7be906d192',
});
const stableEnvelopeTime = () => '2026-07-17T12:00:00.000Z';
const stableReceiptTime = () => '2026-07-17T12:00:01.000Z';
const checks = [];

function hash(value) {
  return createHash('sha256')
    .update(canonicalizeBridgeContractV1(value), 'utf8')
    .digest('hex');
}

function check(name, condition, detail = '') {
  checks.push({ name, passed: condition === true, detail });
}

check('scanops_contract_hash_locked', computeBridgeContractV1SemanticHash() === EXPECTED.contract);
check('inventory_contract_hash_locked', hash(INVENTORY_CONTRACT) === EXPECTED.contract, hash(INVENTORY_CONTRACT));
check('contracts_semantically_identical', hash(SCANOPS_CONTRACT) === hash(INVENTORY_CONTRACT));
check('scanops_golden_envelope_locked', hash(scanOpsEnvelope) === EXPECTED.envelope);
check('inventory_golden_envelope_locked', hash(inventoryEnvelope) === EXPECTED.envelope);
check('golden_envelopes_identical', hash(scanOpsEnvelope) === hash(inventoryEnvelope));
check('scanops_golden_receipt_locked', hash(scanOpsReceipt) === EXPECTED.receipt);
check('inventory_golden_receipt_locked', hash(inventoryReceipt) === EXPECTED.receipt);
check('golden_receipts_identical', hash(scanOpsReceipt) === hash(inventoryReceipt));

const inventoryServer = createInventoryTestHttpServerV1({
  configuration: {
    bridge_enabled: true,
    transport_enabled: true,
    trusted_device_ids: [scanOpsEnvelope.source.deviceId],
    allowed_store_ids: [scanOpsEnvelope.source.storeId],
    allowed_inventory_instance_ids: [scanOpsEnvelope.target.inventoryInstanceId],
  },
  environment: 'TEST',
  bindHost: '127.0.0.1',
  port: 0,
  allowEphemeralPortForTest: true,
  requestTimeoutMs: 1_000,
  now: stableReceiptTime,
});

let started = null;
let stopped = null;
let client = null;
let built = null;
let result = null;

try {
  started = await inventoryServer.start();
  check('inventory_server_started_explicitly', started.started === true, started);
  check('inventory_server_bound_loopback', started.boundAddress?.address === '127.0.0.1', started.boundAddress);
  check('inventory_server_bound_ephemeral_port', Number.isInteger(started.boundAddress?.port) && started.boundAddress.port > 0, started.boundAddress);

  client = createScanOpsTestTransportClientV1({
    configuration: { bridge_enabled: true, transport_enabled: true },
    environment: 'TEST',
    inventoryHost: '127.0.0.1',
    inventoryPort: started.boundAddress.port,
    timeoutMs: 1_000,
    now: stableEnvelopeTime,
  });

  const input = Object.freeze({
    envelopeId: scanOpsEnvelope.envelopeId,
    idempotencyKey: scanOpsEnvelope.idempotencyKey,
    traceId: scanOpsEnvelope.traceId,
    occurredAt: scanOpsEnvelope.occurredAt,
    deviceId: scanOpsEnvelope.source.deviceId,
    storeId: scanOpsEnvelope.source.storeId,
    sessionId: scanOpsEnvelope.source.sessionId,
    inventoryInstanceId: scanOpsEnvelope.target.inventoryInstanceId,
    payload: scanOpsEnvelope.payload,
  });

  built = client.buildHealthEnvelope(input);
  check('scanops_actual_builder_succeeded', built.ok === true, built);
  check('actual_envelope_hash_locked', built.ok && hash(built.buildResult.envelope) === EXPECTED.envelope, built.ok ? hash(built.buildResult.envelope) : null);

  result = await client.sendHealthPing(input);
  check('real_http_status_200', result.httpStatus === 200, result);
  check('canonical_admission_accepted', result.admissionStatus === 'ACCEPTED', result);
  check('canonical_application_not_applicable', result.applicationStatus === 'NOT_APPLICABLE', result);
  check('scanops_receipt_validated', result.receiptValid === true, result);
  check('scanops_receipt_correlated', result.correlated === true && result.status === 'CORRELATED', result);
  check('actual_receipt_hash_locked', hash(result.receipt) === EXPECTED.receipt, hash(result.receipt));

  const inventoryDiagnostics = inventoryServer.getDiagnostics();
  const scanOpsDiagnostics = client.getDiagnostics();
  check('only_one_health_ping_accepted', inventoryDiagnostics.metrics.acceptedHealthPings === 1, inventoryDiagnostics.metrics);
  check('no_inventory_or_scanops_mutation',
    inventoryDiagnostics.inventoryMutationAttempted === false
    && inventoryDiagnostics.scanOpsMutationAttempted === false
    && scanOpsDiagnostics.inventoryMutationAttempted === false
    && scanOpsDiagnostics.scanOpsMutationAttempted === false,
  );
  check('no_stock_or_ledger_mutation',
    inventoryDiagnostics.stockMutationAttempted === false
    && inventoryDiagnostics.ledgerMutationAttempted === false,
  );
  check('no_persistence_or_queue',
    inventoryDiagnostics.persistenceAttempted === false
    && inventoryDiagnostics.queueProcessingAttempted === false
    && scanOpsDiagnostics.persistenceAttempted === false
    && scanOpsDiagnostics.queueWriteAttempted === false,
  );
  check('no_retry_or_replay',
    inventoryDiagnostics.retryScheduled === false
    && inventoryDiagnostics.replayAttempted === false
    && scanOpsDiagnostics.automaticRetryScheduled === false
    && scanOpsDiagnostics.replayAttempted === false,
  );
  check('no_discovery_pairing_auth_or_websocket',
    inventoryDiagnostics.websocketStarted === false
    && inventoryDiagnostics.discoveryAttempted === false
    && inventoryDiagnostics.pairingAttempted === false
    && inventoryDiagnostics.authenticationStateCreated === false
    && scanOpsDiagnostics.discoveryAttempted === false
    && scanOpsDiagnostics.pairingAttempted === false
    && scanOpsDiagnostics.authenticationStateCreated === false,
  );
  check('runtime_defaults_remain_disabled',
    inventoryDiagnostics.runtimeDefaultsRemainDisabled === true
    && scanOpsDiagnostics.runtimeDefaultsRemainDisabled === true,
  );
} finally {
  stopped = await inventoryServer.stop();
  check('inventory_server_stopped_explicitly', stopped.stopped === true, stopped);
}

const failures = checks.filter((entry) => !entry.passed);
const report = Object.freeze({
  phase: '35-A',
  repositories: Object.freeze([
    'chrykoolaid/invyra-scanops',
    'chrykoolaid/invyra-base44',
  ]),
  passed: failures.length === 0,
  totalChecks: checks.length,
  passedChecks: checks.length - failures.length,
  failedChecks: failures.length,
  inventoryBindAddress: started?.boundAddress || null,
  request: Object.freeze({
    method: 'POST',
    path: INVENTORY_TEST_HTTP_TRANSPORT_V1_PATHS.handoffs,
  }),
  httpStatus: result?.httpStatus || null,
  envelopeSemanticHash: built?.ok ? hash(built.buildResult.envelope) : null,
  receiptSemanticHash: result?.receipt ? hash(result.receipt) : null,
  admissionStatus: result?.admissionStatus || null,
  applicationStatus: result?.applicationStatus || null,
  correlated: result?.correlated === true,
  persistenceAttempted: false,
  queueProcessingAttempted: false,
  retryScheduled: false,
  replayAttempted: false,
  inventoryMutationAttempted: false,
  scanOpsMutationAttempted: false,
  serverStarted: started?.started === true,
  serverStopped: stopped?.stopped === true,
  checks,
});

console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exit(1);
