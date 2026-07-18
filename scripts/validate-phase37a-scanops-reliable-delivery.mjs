#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalizeBridgeContractV1 } from '../src/inventory-bridge/canonicalContract/v1/canonicalizeBridgeContractV1.js';
import { createScanOpsReliableDeliveryQueueV1 } from '../src/inventory-bridge/reliableDelivery/v1/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const goldenEnvelope = JSON.parse(readFileSync(join(root, 'src/inventory-bridge/canonicalAdapter/v1/fixtures/healthEnvelopeV1.json'), 'utf8'));
const goldenReceipt = JSON.parse(readFileSync(join(root, 'src/inventory-bridge/canonicalAdapter/v1/fixtures/healthReceiptV1.json'), 'utf8'));
const expected = Object.freeze({
  envelope: '50c8098e8ec84b63b49e307c648e691c2b3aba41f015614edd3a5f4c9a0f4a81',
  receipt: 'c5fdfbe7f0b990e9b312ba669a35fab411539c6cdafd8bd808bc0a7be906d192',
});
const checks = [];
let clockMs = Date.parse(goldenEnvelope.occurredAt);
const now = () => new Date(clockMs).toISOString();
const persistenceRoot = mkdtempSync(join(tmpdir(), 'invyra-p37-scanops-'));
const pairedProfile = Object.freeze({
  status: 'PAIRED',
  environment: goldenEnvelope.environment,
  deviceId: goldenEnvelope.source.deviceId,
  sessionId: goldenEnvelope.source.sessionId,
  storeId: goldenEnvelope.source.storeId,
  inventoryInstanceId: goldenEnvelope.target.inventoryInstanceId,
  trustReference: 'a'.repeat(64),
  trustExpiresAt: '2026-07-20T00:00:00.000Z',
});

function hash(value) {
  return createHash('sha256').update(canonicalizeBridgeContractV1(value), 'utf8').digest('hex');
}
function check(name, condition, detail = '') { checks.push({ name, passed: condition === true, detail }); }
function response(status, body) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) };
}
function receiptFor(envelope) {
  return {
    ...goldenReceipt,
    receiptId: envelope.envelopeId === goldenEnvelope.envelopeId ? goldenReceipt.receiptId : `receipt:${envelope.envelopeId.replace(/^env:/, '')}`,
    envelopeId: envelope.envelopeId,
    idempotencyKey: envelope.idempotencyKey,
    traceId: envelope.traceId,
    operationType: envelope.operationType,
    environment: envelope.environment,
  };
}

check('golden_envelope_hash_locked', hash(goldenEnvelope) === expected.envelope, hash(goldenEnvelope));
check('golden_receipt_hash_locked', hash(goldenReceipt) === expected.receipt, hash(goldenReceipt));

const enabled = {
  configuration: { bridge_enabled: true, transport_enabled: true, reliable_delivery_enabled: true, persistence_enabled: true },
  environment: goldenEnvelope.environment,
  protocol: 'http',
  inventoryHost: '127.0.0.1',
  inventoryPort: 8787,
  persistenceDirectory: persistenceRoot,
  pairedProfile,
  now,
  retryDelaysMs: [1, 1, 1],
  maxAttempts: 3,
};

for (const [name, overrides] of Object.entries({
  default_disabled: {},
  reliability_disabled: { ...enabled, configuration: { ...enabled.configuration, reliable_delivery_enabled: false } },
  persistence_disabled: { ...enabled, configuration: { ...enabled.configuration, persistence_enabled: false } },
  live_blocked: { ...enabled, environment: 'LIVE', pairedProfile: { ...pairedProfile, environment: 'LIVE' } },
  production_blocked: { ...enabled, environment: 'PRODUCTION', pairedProfile: { ...pairedProfile, environment: 'PRODUCTION' } },
  remote_host_blocked: { ...enabled, inventoryHost: 'example.com' },
  expired_trust_blocked: { ...enabled, pairedProfile: { ...pairedProfile, trustExpiresAt: '2026-07-17T00:00:00.000Z' } },
  missing_directory: { ...enabled, persistenceDirectory: '' },
})) {
  const queue = createScanOpsReliableDeliveryQueueV1(overrides);
  const result = queue.open();
  check(`${name}_fails_closed`, result.opened === false && result.reason === 'RUNTIME_GATE_BLOCKED', result);
  check(`${name}_does_not_open`, queue.getDiagnostics().opened === false, queue.getDiagnostics());
}

let sentBodies = [];
const successFetch = async (_url, request) => {
  const envelope = JSON.parse(request.body);
  sentBodies.push(envelope);
  return response(200, receiptFor(envelope));
};
let queue = createScanOpsReliableDeliveryQueueV1({ ...enabled, fetchAdapter: successFetch });
check('queue_opens_explicitly', queue.open().opened === true, queue.getDiagnostics());
check('no_automatic_dispatch_on_open', queue.getDiagnostics().metrics.dispatchAttempts === 0, queue.getDiagnostics());
const first = queue.enqueueHealthPing({
  envelopeId: goldenEnvelope.envelopeId,
  idempotencyKey: goldenEnvelope.idempotencyKey,
  traceId: goldenEnvelope.traceId,
  occurredAt: goldenEnvelope.occurredAt,
  sessionId: goldenEnvelope.source.sessionId,
  payload: goldenEnvelope.payload,
});
check('health_enqueued', first.ok === true && first.status === 'ENQUEUED', first);
check('enqueued_envelope_hash_locked', hash(first.record.envelope) === expected.envelope, hash(first.record.envelope));
check('queue_record_persisted_pending', queue.getPersistedState().queueById[first.queueId].state === 'PENDING', queue.getPersistedState());
const duplicate = queue.enqueueHealthPing({
  envelopeId: goldenEnvelope.envelopeId,
  idempotencyKey: goldenEnvelope.idempotencyKey,
  traceId: goldenEnvelope.traceId,
  occurredAt: goldenEnvelope.occurredAt,
  sessionId: goldenEnvelope.source.sessionId,
  payload: goldenEnvelope.payload,
});
check('duplicate_enqueue_deduplicated', duplicate.status === 'DEDUPLICATED' && duplicate.queueId === first.queueId, duplicate);
check('duplicate_does_not_add_record', Object.keys(queue.getPersistedState().queueById).length === 1, queue.getPersistedState());
const conflict = queue.enqueueHealthPing({
  envelopeId: goldenEnvelope.envelopeId,
  idempotencyKey: goldenEnvelope.idempotencyKey,
  traceId: goldenEnvelope.traceId,
  occurredAt: goldenEnvelope.occurredAt,
  sessionId: goldenEnvelope.source.sessionId,
  payload: { ...goldenEnvelope.payload, clientTime: '2026-07-17T12:00:09.000Z' },
});
check('idempotency_conflict_rejected', conflict.status === 'IDEMPOTENCY_CONFLICT', conflict);
const dispatched = await queue.dispatchNext();
check('dispatch_acknowledged', dispatched.ok === true && dispatched.status === 'ACKNOWLEDGED', dispatched);
check('receipt_valid_and_correlated', dispatched.receiptValid === true && dispatched.correlated === true, dispatched);
check('golden_receipt_persisted', hash(dispatched.receipt) === expected.receipt, hash(dispatched.receipt));
check('queue_state_acknowledged', queue.getPersistedState().queueById[first.queueId].state === 'ACKNOWLEDGED', queue.getPersistedState());
check('receipt_record_persisted', Object.keys(queue.getPersistedState().receiptsByQueueId).length === 1, queue.getPersistedState());
check('only_one_network_send', sentBodies.length === 1, sentBodies);
const mode = statSync(queue.getDiagnostics().storeFile).mode & 0o777;
check('store_file_private_mode', mode === 0o600, mode.toString(8));
queue.close();

queue = createScanOpsReliableDeliveryQueueV1({ ...enabled, fetchAdapter: successFetch });
check('queue_reopens_from_persistence', queue.open().opened === true, queue.getDiagnostics());
check('restart_recovers_acknowledged_record', queue.getDiagnostics().counts.ACKNOWLEDGED === 1, queue.getDiagnostics());
check('restart_recovers_receipt', queue.getDiagnostics().persistedReceipts === 1, queue.getDiagnostics());
queue.close();


const crashRoot = mkdtempSync(join(tmpdir(), 'invyra-p37-scanops-crash-'));
const hangingFetch = async () => new Promise(() => {});
let crashQueue = createScanOpsReliableDeliveryQueueV1({
  ...enabled,
  persistenceDirectory: crashRoot,
  fetchAdapter: hangingFetch,
  timeoutMs: 1,
});
crashQueue.open();
const crashEnqueue = crashQueue.enqueueHealthPing({
  envelopeId: 'env:phase37-crash', idempotencyKey: 'idem:phase37-crash', traceId: 'trace:phase37-crash',
  occurredAt: now(), sessionId: goldenEnvelope.source.sessionId,
  payload: { requestType: 'BRIDGE_HEALTH', clientTime: now() },
});
const abandonedDispatch = crashQueue.dispatchNext();
check('crash_simulation_persists_in_flight', crashQueue.getPersistedState().queueById[crashEnqueue.queueId].state === 'IN_FLIGHT', crashQueue.getPersistedState());
crashQueue.close();
clockMs += 10;
crashQueue = createScanOpsReliableDeliveryQueueV1({
  ...enabled,
  persistenceDirectory: crashRoot,
  fetchAdapter: successFetch,
});
const recoveredOpen = crashQueue.open();
check('restart_recovers_interrupted_in_flight', recoveredOpen.recovery?.recoveredToRetryWait === 1, recoveredOpen);
check('recovered_record_is_retry_wait', crashQueue.getPersistedState().queueById[crashEnqueue.queueId].state === 'RETRY_WAIT', crashQueue.getPersistedState());
const recoveredDispatch = await crashQueue.dispatchNext();
check('recovered_delivery_acknowledged', recoveredDispatch.ok === true && recoveredDispatch.status === 'ACKNOWLEDGED', recoveredDispatch);
check('recovery_metric_persisted', crashQueue.getDiagnostics().metrics.recoveredInFlight === 1, crashQueue.getDiagnostics());
crashQueue.close();
void abandonedDispatch;

let failureCalls = 0;
const failureThenSuccessFetch = async (_url, request) => {
  const envelope = JSON.parse(request.body);
  failureCalls += 1;
  if (failureCalls <= 3) return response(503, { error: { code: 'SERVICE_UNAVAILABLE' } });
  return response(200, receiptFor(envelope));
};
const retryRoot = mkdtempSync(join(tmpdir(), 'invyra-p37-scanops-retry-'));
queue = createScanOpsReliableDeliveryQueueV1({ ...enabled, persistenceDirectory: retryRoot, fetchAdapter: failureThenSuccessFetch });
queue.open();
const retryEnvelope = {
  envelopeId: 'env:phase37-retry', idempotencyKey: 'idem:phase37-retry', traceId: 'trace:phase37-retry',
  occurredAt: now(), sessionId: goldenEnvelope.source.sessionId, payload: { requestType: 'BRIDGE_HEALTH', clientTime: now() },
};
const retryEnqueue = queue.enqueueHealthPing(retryEnvelope);
check('retry_record_enqueued', retryEnqueue.status === 'ENQUEUED', retryEnqueue);
const attempt1 = await queue.dispatchNext();
check('attempt1_enters_retry_wait', attempt1.status === 'RETRY_WAIT' && attempt1.attemptCount === 1, attempt1);
check('retry_not_automatic', failureCalls === 1, failureCalls);
clockMs += 10;
const attempt2 = await queue.dispatchNext();
check('attempt2_enters_retry_wait', attempt2.status === 'RETRY_WAIT' && attempt2.attemptCount === 2, attempt2);
clockMs += 10;
const attempt3 = await queue.dispatchNext();
check('attempt3_dead_letters', attempt3.status === 'DEAD_LETTER' && attempt3.attemptCount === 3, attempt3);
check('dead_letter_persisted', queue.getPersistedState().deadLetterByQueueId[retryEnqueue.queueId]?.reason === 'HTTP_503', queue.getPersistedState());
check('short_replay_reason_rejected', queue.replayDeadLetter(retryEnqueue.queueId, 'retry').status === 'REPLAY_REASON_REQUIRED');
const replay = queue.replayDeadLetter(retryEnqueue.queueId, 'Inventory service restored after controlled outage');
check('manual_replay_enqueued', replay.ok === true && replay.status === 'REPLAY_ENQUEUED', replay);
check('second_replay_blocked', queue.replayDeadLetter(retryEnqueue.queueId, 'Another controlled replay reason').status === 'REPLAY_ALREADY_USED');
clockMs += 10;
const replayDispatch = await queue.dispatchNext();
check('manual_replay_acknowledged', replayDispatch.ok === true && replayDispatch.status === 'ACKNOWLEDGED', replayDispatch);
check('manual_replay_receipt_persisted', queue.getPersistedState().receiptsByQueueId[replay.queueId]?.envelopeId === retryEnvelope.envelopeId, queue.getPersistedState());
const diagnostics = queue.getDiagnostics();
check('no_background_or_automatic_replay', diagnostics.backgroundWorkerStarted === false && diagnostics.automaticDispatch === false && diagnostics.automaticReplay === false, diagnostics);
check('no_domain_mutations', diagnostics.inventoryMutationAttempted === false && diagnostics.scanOpsMutationAttempted === false && diagnostics.stockMutationAttempted === false && diagnostics.ledgerMutationAttempted === false && diagnostics.orderMutationAttempted === false && diagnostics.itemMasterMutationAttempted === false, diagnostics);
queue.close();

const failures = checks.filter((entry) => !entry.passed);
const report = {
  phase: '37-A', repository: 'chrykoolaid/invyra-scanops', passed: failures.length === 0,
  totalChecks: checks.length, passedChecks: checks.length - failures.length, failedChecks: failures.length,
  explicitDispatchOnly: true, manualReplayOnly: true, businessOperationsBlocked: true, checks,
};
console.log(JSON.stringify(report, null, 2));
rmSync(persistenceRoot, { recursive: true, force: true });
rmSync(retryRoot, { recursive: true, force: true });
rmSync(crashRoot, { recursive: true, force: true });
if (failures.length > 0) process.exit(1);
