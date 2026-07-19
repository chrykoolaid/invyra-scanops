#!/usr/bin/env node
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import {
  BRIDGE_CONTRACT_V1, createScanOpsCountSubmissionQueueV1, advanceClock, check, checks, createQueue,
  expectedContractHash, hash, input, join, jsonResponse, profile, rejectedReceipt, root, stagedReceipt,
} from './phase38a/scanops-count-handoff-context.mjs';

try {
  check('canonical_contract_hash_locked', hash(BRIDGE_CONTRACT_V1) === expectedContractHash, hash(BRIDGE_CONTRACT_V1));

  const disabled = createScanOpsCountSubmissionQueueV1({ configuration: {}, environment: 'TEST' });
  const disabledOpen = disabled.open();
  check('disabled_by_default', disabledOpen.opened === false && disabledOpen.gate.blockers.includes('BUSINESS_HANDOFF_DISABLED'), disabledOpen);

  const live = createQueue(join(root, 'live'), () => {}, { environment: 'LIVE' });
  check('live_blocked', live.open().gate.blockers.includes('ENVIRONMENT_BLOCKED'));

  const remote = createQueue(join(root, 'remote'), () => {}, { inventoryHost: 'example.com' });
  check('remote_host_blocked', remote.open().gate.blockers.includes('INVENTORY_HOST_NOT_LOCAL'));

  const expired = createQueue(join(root, 'expired'), () => {}, {
    pairedProfile: { ...profile, trustExpiresAt: '2026-07-17T00:00:00.000Z' },
  });
  check('expired_trust_blocked', expired.open().gate.blockers.includes('PAIRED_PROFILE_INVALID'));

  let capturedEnvelope = null;
  const queue = createQueue(join(root, 'success'), async (_url, options) => {
    capturedEnvelope = JSON.parse(options.body);
    return jsonResponse(200, stagedReceipt(capturedEnvelope));
  });
  check('queue_opened_explicitly', queue.open().opened === true, queue.getDiagnostics());
  check('no_automatic_dispatch', queue.getDiagnostics().automaticDispatch === false, queue.getDiagnostics());

  const invalid = queue.enqueueCountSubmission(input('invalid', { payload: { physicalCount: -1 } }));
  check('invalid_count_blocked_before_queue', invalid.status === 'INVALID', invalid);
  check('invalid_count_not_persisted', queue.getDiagnostics().totalQueueRecords === 0, queue.getDiagnostics());

  const missingOperator = queue.enqueueCountSubmission(input('missing-operator', { operatorId: '' }));
  check('operator_required_by_canonical_builder', missingOperator.status === 'INVALID' && missingOperator.errors.some((error) => error.code === 'SOURCE_OPERATOR_REQUIRED'), missingOperator);

  const enqueued = queue.enqueueCountSubmission(input());
  check('count_enqueued', enqueued.status === 'ENQUEUED', enqueued);
  check('canonical_operation_type', enqueued.record.envelope.operationType === 'COUNT_SUBMISSION', enqueued.record.envelope);
  check('operator_identity_embedded', enqueued.record.envelope.source.operatorId === 'operator-001', enqueued.record.envelope.source);
  check('count_payload_embedded', enqueued.record.envelope.payload.itemReference === 'SKU-001' && enqueued.record.envelope.payload.physicalCount === 12, enqueued.record.envelope.payload);

  const duplicate = queue.enqueueCountSubmission(input());
  check('exact_duplicate_is_idempotent', duplicate.status === 'DUPLICATE', duplicate);
  check('duplicate_does_not_create_second_record', queue.getDiagnostics().totalQueueRecords === 1, queue.getDiagnostics());

  const conflict = queue.enqueueCountSubmission(input('conflict', {
    envelopeId: 'env:test:count:conflict',
    idempotencyKey: 'idem:test:count:001',
    traceId: 'trace:test:count:conflict',
  }));
  check('local_idempotency_conflict_blocked', conflict.status === 'CONFLICT', conflict);

  const delivered = await queue.dispatchNext();
  check('count_dispatch_acknowledged', delivered.ok === true && delivered.status === 'ACKNOWLEDGED', delivered);
  check('staged_receipt_valid', delivered.receiptValid === true && delivered.correlated === true, delivered);
  check('staged_receipt_persisted', queue.getDiagnostics().persistedReceipts === 1, queue.getDiagnostics());
  check('record_acknowledged', queue.getRecord('idem:test:count:001')?.status === 'ACKNOWLEDGED', queue.getRecord('idem:test:count:001'));
  check('no_inventory_apply_claim', delivered.receipt.applicationStatus === 'STAGED', delivered.receipt);
  check('no_mutation_flags', queue.getDiagnostics().stockMutationAttempted === false && queue.getDiagnostics().ledgerMutationAttempted === false, queue.getDiagnostics());
  queue.close();

  const rejectionQueue = createQueue(join(root, 'rejected'), async (_url, options) => {
    const envelope = JSON.parse(options.body);
    return jsonResponse(422, rejectedReceipt(envelope));
  });
  rejectionQueue.open();
  rejectionQueue.enqueueCountSubmission(input('rejected'));
  const rejected = await rejectionQueue.dispatchNext();
  check('canonical_rejection_terminal', rejected.status === 'REJECTED' && rejected.retryScheduled === false, rejected);
  check('rejection_receipt_persisted', rejectionQueue.getDiagnostics().persistedReceipts === 1, rejectionQueue.getDiagnostics());
  rejectionQueue.close();

  const outageQueue = createQueue(join(root, 'outage'), async () => { throw new Error('offline'); });
  outageQueue.open();
  outageQueue.enqueueCountSubmission(input('outage'));
  const retry = await outageQueue.dispatchNext();
  check('transport_failure_schedules_retry', retry.status === 'RETRY_WAIT', retry);
  advanceClock(10);
  const dead = await outageQueue.dispatchNext();
  check('retry_exhaustion_dead_letters', dead.status === 'DEAD_LETTER', dead);
  check('dead_letter_persisted', outageQueue.getDiagnostics().persistedDeadLetters === 1, outageQueue.getDiagnostics());
  const replay = outageQueue.manualReplay('idem:test:count:outage', 'Supervisor confirmed Inventory is available.');
  check('reasoned_manual_replay_created', replay.status === 'REPLAY_QUEUED', replay);
  check('manual_replay_has_new_idempotency_key', replay.record.idempotencyKey !== 'idem:test:count:outage', replay.record);
  const secondReplay = outageQueue.manualReplay('idem:test:count:outage', 'Again');
  check('manual_replay_single_use', secondReplay.reason === 'MANUAL_REPLAY_ALREADY_USED', secondReplay);
  outageQueue.close();

  const crashDirectory = join(root, 'crash');
  const crashQueue = createQueue(crashDirectory, async () => jsonResponse(200, {}));
  crashQueue.open();
  crashQueue.enqueueCountSubmission(input('crash'));
  crashQueue.close();
  const crashFile = join(crashDirectory, 'scanops-count-handoff-v1.json');
  const persisted = JSON.parse(readFileSync(crashFile, 'utf8'));
  persisted.queueByIdempotencyKey['idem:test:count:crash'].status = 'IN_FLIGHT';
  writeFileSync(crashFile, `${JSON.stringify(persisted, null, 2)}\n`);
  const recoveredQueue = createQueue(crashDirectory, async (_url, options) => {
    const envelope = JSON.parse(options.body);
    return jsonResponse(200, stagedReceipt(envelope));
  });
  const recoveredOpen = recoveredQueue.open();
  check('crash_stranded_inflight_recovered', recoveredQueue.getRecord('idem:test:count:crash')?.status === 'RETRY_WAIT', recoveredQueue.getRecord('idem:test:count:crash'));
  check('crash_recovery_metric_incremented', recoveredOpen.diagnostics.persistedMetrics.recoveredInflight === 1, recoveredOpen.diagnostics);
  advanceClock(10);
  const recoveredDelivery = await recoveredQueue.dispatchNext();
  check('recovered_record_delivers', recoveredDelivery.status === 'ACKNOWLEDGED', recoveredDelivery);
  recoveredQueue.close();

  const diagnostics = recoveredQueue.getDiagnostics();
  check('no_background_worker', diagnostics.backgroundWorkerStarted === false, diagnostics);
  check('no_automatic_replay', diagnostics.automaticReplay === false, diagnostics);
  check('no_business_application', diagnostics.businessOperationApplied === false, diagnostics);
  check('no_scanops_stock_or_ledger_mutation', diagnostics.scanOpsMutationAttempted === false && diagnostics.stockMutationAttempted === false && diagnostics.ledgerMutationAttempted === false, diagnostics);
} finally {
  rmSync(root, { recursive: true, force: true });
}

const failed = checks.filter((entry) => !entry.passed);
const report = {
  phase: '38-A',
  component: 'scanops_count_submission_queue_v1',
  passed: failed.length === 0,
  totalChecks: checks.length,
  passedChecks: checks.length - failed.length,
  failedChecks: failed.length,
  checks,
};
console.log(JSON.stringify(report, null, 2));
if (failed.length > 0) process.exitCode = 1;
