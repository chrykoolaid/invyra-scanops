#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { canonicalizeBridgeContractV1 } from '../src/inventory-bridge/canonicalContract/v1/canonicalizeBridgeContractV1.js';
import { createScanOpsReliableDeliveryQueueV1 } from '../src/inventory-bridge/reliableDelivery/v1/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const inventoryRoot = process.env.INVENTORY_REPO_PATH
  ? join(root, process.env.INVENTORY_REPO_PATH)
  : join(root, 'inventory-repo');
const inventoryModule = await import(pathToFileURL(join(
  inventoryRoot,
  'src/inventory-bridge/reliableDelivery/v1/index.js',
)).href);
const {
  createInventoryReliableDeliveryServerV1,
  INVENTORY_RELIABLE_DELIVERY_V1_PATHS,
} = inventoryModule;

const scanEnvelope = JSON.parse(readFileSync(join(root, 'src/inventory-bridge/canonicalAdapter/v1/fixtures/healthEnvelopeV1.json'), 'utf8'));
const scanReceipt = JSON.parse(readFileSync(join(root, 'src/inventory-bridge/canonicalAdapter/v1/fixtures/healthReceiptV1.json'), 'utf8'));
const inventoryEnvelope = JSON.parse(readFileSync(join(inventoryRoot, 'src/inventory-bridge/canonicalAdapter/v1/fixtures/healthEnvelopeV1.json'), 'utf8'));
const inventoryReceipt = JSON.parse(readFileSync(join(inventoryRoot, 'src/inventory-bridge/canonicalAdapter/v1/fixtures/healthReceiptV1.json'), 'utf8'));
const expected = Object.freeze({
  envelope: '50c8098e8ec84b63b49e307c648e691c2b3aba41f015614edd3a5f4c9a0f4a81',
  receipt: 'c5fdfbe7f0b990e9b312ba669a35fab411539c6cdafd8bd808bc0a7be906d192',
});
const checks = [];
const tempRoot = mkdtempSync(join(tmpdir(), 'invyra-p37-cross-'));
const inventoryPersistence = join(tempRoot, 'inventory');
const scanPersistence = join(tempRoot, 'scanops');
let scanClockMs = Date.parse(scanEnvelope.occurredAt);
let inventoryClockMs = Date.parse(scanReceipt.receivedAt);
const scanNow = () => new Date(scanClockMs).toISOString();
const inventoryNow = () => new Date(inventoryClockMs).toISOString();

function hash(value) {
  return createHash('sha256').update(canonicalizeBridgeContractV1(value), 'utf8').digest('hex');
}
function check(name, condition, detail = '') { checks.push({ name, passed: condition === true, detail }); }
async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: response.status, headers: Object.fromEntries(response.headers.entries()), body };
}

check('scanops_envelope_hash_locked', hash(scanEnvelope) === expected.envelope, hash(scanEnvelope));
check('inventory_envelope_hash_locked', hash(inventoryEnvelope) === expected.envelope, hash(inventoryEnvelope));
check('envelopes_identical', hash(scanEnvelope) === hash(inventoryEnvelope));
check('scanops_receipt_hash_locked', hash(scanReceipt) === expected.receipt, hash(scanReceipt));
check('inventory_receipt_hash_locked', hash(inventoryReceipt) === expected.receipt, hash(inventoryReceipt));
check('receipts_identical', hash(scanReceipt) === hash(inventoryReceipt));

const pairedProfile = Object.freeze({
  status: 'PAIRED',
  environment: scanEnvelope.environment,
  deviceId: scanEnvelope.source.deviceId,
  sessionId: scanEnvelope.source.sessionId,
  storeId: scanEnvelope.source.storeId,
  inventoryInstanceId: scanEnvelope.target.inventoryInstanceId,
  trustReference: 'b'.repeat(64),
  trustExpiresAt: '2026-07-20T00:00:00.000Z',
});
const inventoryConfiguration = {
  bridge_enabled: true,
  transport_enabled: true,
  reliable_delivery_enabled: true,
  persistence_enabled: true,
  trusted_device_ids: [pairedProfile.deviceId],
  allowed_store_ids: [pairedProfile.storeId],
  allowed_inventory_instance_ids: [pairedProfile.inventoryInstanceId],
};

function createInventory(port) {
  return createInventoryReliableDeliveryServerV1({
    configuration: inventoryConfiguration,
    environment: 'TEST',
    bindHost: '127.0.0.1',
    port,
    allowEphemeralPortForTest: port === 0,
    persistenceDirectory: inventoryPersistence,
    now: inventoryNow,
    receiptIdFactory: (envelope) => envelope.envelopeId === scanEnvelope.envelopeId
      ? scanReceipt.receiptId
      : `receipt:${envelope.envelopeId.replace(/^env:/, '')}`,
  });
}

let inventory = createInventory(0);
const started = await inventory.start();
check('inventory_server_started', started.started === true, started);
check('inventory_server_loopback', started.boundAddress?.address === '127.0.0.1', started.boundAddress);
const fixedPort = started.boundAddress.port;

let queue = createScanOpsReliableDeliveryQueueV1({
  configuration: { bridge_enabled: true, transport_enabled: true, reliable_delivery_enabled: true, persistence_enabled: true },
  environment: 'TEST',
  protocol: 'http',
  inventoryHost: '127.0.0.1',
  inventoryPort: fixedPort,
  persistenceDirectory: scanPersistence,
  pairedProfile,
  now: scanNow,
  retryDelaysMs: [1, 1, 1],
  maxAttempts: 3,
});
check('scanops_queue_opened', queue.open().opened === true, queue.getDiagnostics());
const enqueue = queue.enqueueHealthPing({
  envelopeId: scanEnvelope.envelopeId,
  idempotencyKey: scanEnvelope.idempotencyKey,
  traceId: scanEnvelope.traceId,
  occurredAt: scanEnvelope.occurredAt,
  sessionId: scanEnvelope.source.sessionId,
  payload: scanEnvelope.payload,
});
check('golden_health_enqueued', enqueue.status === 'ENQUEUED', enqueue);
check('actual_envelope_hash_locked', hash(enqueue.record.envelope) === expected.envelope, hash(enqueue.record.envelope));
const delivered = await queue.dispatchNext();
check('actual_delivery_acknowledged', delivered.ok === true && delivered.status === 'ACKNOWLEDGED', delivered);
check('actual_http_200', delivered.httpStatus === 200, delivered);
check('actual_receipt_correlated', delivered.receiptValid === true && delivered.correlated === true, delivered);
check('actual_receipt_hash_locked', hash(delivered.receipt) === expected.receipt, hash(delivered.receipt));
check('scanops_receipt_persisted', queue.getDiagnostics().persistedReceipts === 1, queue.getDiagnostics());
check('inventory_inbox_persisted', inventory.getDiagnostics().persistedInboxRecords === 1, inventory.getDiagnostics());
check('inventory_receipt_persisted', inventory.getDiagnostics().persistedReceipts === 1, inventory.getDiagnostics());

const baseUrl = `http://127.0.0.1:${fixedPort}`;
const duplicate = await requestJson(`${baseUrl}${INVENTORY_RELIABLE_DELIVERY_V1_PATHS.handoffs}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(scanEnvelope),
});
check('inventory_duplicate_returns_200', duplicate.status === 200, duplicate);
check('inventory_duplicate_header_true', duplicate.headers['x-invyra-delivery-duplicate'] === 'true', duplicate.headers);
check('inventory_duplicate_same_receipt', hash(duplicate.body) === expected.receipt, hash(duplicate.body));
const conflictEnvelope = { ...scanEnvelope, payload: { ...scanEnvelope.payload, clientTime: '2026-07-17T12:00:09.000Z' } };
const conflict = await requestJson(`${baseUrl}${INVENTORY_RELIABLE_DELIVERY_V1_PATHS.handoffs}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(conflictEnvelope),
});
check('inventory_idempotency_conflict_409', conflict.status === 409 && conflict.body.error?.code === 'DUPLICATE_ENVELOPE' && conflict.body.error?.conflictType === 'IDEMPOTENCY_CONFLICT', conflict);

await inventory.stop();
const outageEnvelope = {
  envelopeId: 'env:test:health:phase37-outage',
  idempotencyKey: 'idem:test:health:phase37-outage',
  traceId: 'trace:test:health:phase37-outage',
  occurredAt: scanNow(),
  sessionId: scanEnvelope.source.sessionId,
  payload: { requestType: 'BRIDGE_HEALTH', clientTime: scanNow() },
};
const outageQueued = queue.enqueueHealthPing(outageEnvelope);
check('outage_health_enqueued', outageQueued.status === 'ENQUEUED', outageQueued);
const fail1 = await queue.dispatchNext();
check('outage_attempt1_retry_wait', fail1.status === 'RETRY_WAIT', fail1);
check('no_automatic_second_attempt', queue.getPersistedState().queueById[outageQueued.queueId].attemptCount === 1, queue.getPersistedState());
scanClockMs += 10;
const fail2 = await queue.dispatchNext();
check('outage_attempt2_retry_wait', fail2.status === 'RETRY_WAIT', fail2);
scanClockMs += 10;
const fail3 = await queue.dispatchNext();
check('outage_attempt3_dead_letter', fail3.status === 'DEAD_LETTER', fail3);
check('dead_letter_persisted', Boolean(queue.getPersistedState().deadLetterByQueueId[outageQueued.queueId]), queue.getPersistedState());

inventoryClockMs = scanClockMs + 1_000;
inventory = createInventory(fixedPort);
const restarted = await inventory.start();
check('inventory_restarted_same_port', restarted.started === true && restarted.boundAddress.port === fixedPort, restarted);
check('inventory_restart_recovers_first_receipt', inventory.getDiagnostics().persistedReceipts === 1, inventory.getDiagnostics());
const replay = queue.replayDeadLetter(outageQueued.queueId, 'Inventory endpoint restored after controlled outage');
check('manual_replay_created', replay.ok === true && replay.status === 'REPLAY_ENQUEUED', replay);
scanClockMs += 10;
const replayDelivered = await queue.dispatchNext();
check('manual_replay_acknowledged', replayDelivered.ok === true && replayDelivered.status === 'ACKNOWLEDGED', replayDelivered);
check('manual_replay_correlated', replayDelivered.receiptValid === true && replayDelivered.correlated === true, replayDelivered);
check('inventory_now_has_two_inbox_records', inventory.getDiagnostics().persistedInboxRecords === 2, inventory.getDiagnostics());
check('inventory_now_has_two_receipts', inventory.getDiagnostics().persistedReceipts === 2, inventory.getDiagnostics());

const scanDiagnostics = queue.getDiagnostics();
const inventoryDiagnostics = inventory.getDiagnostics();
check('scanops_no_background_dispatch', scanDiagnostics.automaticDispatch === false && scanDiagnostics.backgroundWorkerStarted === false && scanDiagnostics.automaticReplay === false, scanDiagnostics);
check('scanops_no_domain_mutation', scanDiagnostics.inventoryMutationAttempted === false && scanDiagnostics.scanOpsMutationAttempted === false && scanDiagnostics.stockMutationAttempted === false && scanDiagnostics.ledgerMutationAttempted === false && scanDiagnostics.orderMutationAttempted === false && scanDiagnostics.itemMasterMutationAttempted === false, scanDiagnostics);
check('inventory_no_background_worker', inventoryDiagnostics.automaticStartup === false && inventoryDiagnostics.backgroundWorkerStarted === false, inventoryDiagnostics);
check('inventory_no_domain_mutation', inventoryDiagnostics.inventoryMutationAttempted === false && inventoryDiagnostics.scanOpsMutationAttempted === false && inventoryDiagnostics.stockMutationAttempted === false && inventoryDiagnostics.ledgerMutationAttempted === false && inventoryDiagnostics.orderMutationAttempted === false && inventoryDiagnostics.itemMasterMutationAttempted === false, inventoryDiagnostics);
check('business_operation_application_remains_disabled', inventoryDiagnostics.businessOperationAttempted === false && scanDiagnostics.businessOperationAttempted === false, { inventoryDiagnostics, scanDiagnostics });

queue.close();
queue = createScanOpsReliableDeliveryQueueV1({
  configuration: { bridge_enabled: true, transport_enabled: true, reliable_delivery_enabled: true, persistence_enabled: true },
  environment: 'TEST', protocol: 'http', inventoryHost: '127.0.0.1', inventoryPort: fixedPort,
  persistenceDirectory: scanPersistence, pairedProfile, now: scanNow,
});
check('scanops_restart_recovers_queue', queue.open().opened === true, queue.getDiagnostics());
check('scanops_restart_recovers_two_receipts', queue.getDiagnostics().persistedReceipts === 2, queue.getDiagnostics());
queue.close();
await inventory.stop();

const failures = checks.filter((entry) => !entry.passed);
const report = {
  phase: '37-A', repositories: ['chrykoolaid/invyra-scanops', 'chrykoolaid/invyra-base44'],
  passed: failures.length === 0, totalChecks: checks.length, passedChecks: checks.length - failures.length,
  failedChecks: failures.length, reliableHealthOnly: true, businessOperationsBlocked: true,
  durableQueue: true, durableInbox: true, persistedReceipts: true, explicitRetryOnly: true,
  manualReplayOnly: true, deadLetterEnabled: true, checks,
};
console.log(JSON.stringify(report, null, 2));
rmSync(tempRoot, { recursive: true, force: true });
if (failures.length > 0) process.exit(1);
