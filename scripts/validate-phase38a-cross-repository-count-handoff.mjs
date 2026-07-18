#!/usr/bin/env node
import { rmSync } from 'node:fs';
import {
  BRIDGE_CONTRACT_V1, INVENTORY_COUNT_INTAKE_V1_PATHS, advanceClock, check, checks, countInput,
  createInventory, createQueue, expectedContractHash, hash, requestJson, tempRoot,
} from './phase38a/cross-count-handoff-context.mjs';

let inventory = null;
let queue = null;
try {
  check('canonical_contract_hash_locked', hash(BRIDGE_CONTRACT_V1) === expectedContractHash, hash(BRIDGE_CONTRACT_V1));

  inventory = createInventory(0);
  const inventoryStart = await inventory.start();
  check('inventory_server_started', inventoryStart.started === true, inventoryStart);
  check('inventory_server_loopback', inventoryStart.boundAddress?.address === '127.0.0.1', inventoryStart.boundAddress);
  const port = inventoryStart.boundAddress.port;

  queue = createQueue(port);
  check('scanops_queue_opened', queue.open().opened === true, queue.getDiagnostics());
  const enqueued = queue.enqueueCountSubmission(countInput('000001'));
  check('count_submission_enqueued', enqueued.status === 'ENQUEUED', enqueued);
  check('canonical_count_operation', enqueued.record.envelope.operationType === 'COUNT_SUBMISSION', enqueued.record.envelope);
  check('operator_identity_transmitted', enqueued.record.envelope.source.operatorId === 'operator-001', enqueued.record.envelope.source);

  const delivered = await queue.dispatchNext();
  check('actual_http_delivery_acknowledged', delivered.ok === true && delivered.status === 'ACKNOWLEDGED', delivered);
  check('actual_http_status_200', delivered.httpStatus === 200, delivered);
  check('actual_receipt_valid', delivered.receiptValid === true, delivered);
  check('actual_receipt_correlated', delivered.correlated === true, delivered);
  check('actual_admission_accepted', delivered.receipt?.admissionStatus === 'ACCEPTED', delivered.receipt);
  check('actual_application_staged', delivered.receipt?.applicationStatus === 'STAGED', delivered.receipt);

  const intake = inventory.getIntakeByIdempotencyKey('idem:test:count:000001');
  check('inventory_intake_persisted', intake?.status === 'AWAITING_REVIEW', intake);
  check('inventory_count_evidence_preserved', intake?.evidence?.physicalCount === 12 && intake?.evidence?.itemReference === 'SKU-000001', intake);
  check('inventory_operator_evidence_preserved', intake?.source?.operatorId === 'operator-001', intake);
  check('inventory_no_review_decision', intake?.reviewDecision === null, intake);
  check('inventory_no_stock_movement', intake?.stockMovementId === null, intake);
  check('inventory_no_stock_or_ledger_mutation', intake?.stockMutationAttempted === false && intake?.ledgerMutationAttempted === false, intake);
  check('scanops_receipt_persisted', queue.getDiagnostics().persistedReceipts === 1, queue.getDiagnostics());

  const status = await requestJson(`http://127.0.0.1:${port}${INVENTORY_COUNT_INTAKE_V1_PATHS.intakePrefix}${encodeURIComponent('idem:test:count:000001')}`);
  check('inventory_read_model_available', status.status === 200 && status.body.intake.status === 'AWAITING_REVIEW', status);
  check('inventory_read_model_is_read_only', status.body.inventoryMutationAttempted === false, status.body);

  const duplicate = await requestJson(`http://127.0.0.1:${port}${INVENTORY_COUNT_INTAKE_V1_PATHS.handoffs}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(enqueued.record.envelope),
  });
  check('inventory_exact_duplicate_idempotent', duplicate.status === 200 && duplicate.body.receiptId === delivered.receipt.receiptId, duplicate);
  check('inventory_duplicate_does_not_stage_twice', inventory.getDiagnostics().persistedCountIntakes === 1, inventory.getDiagnostics());

  const conflictingEnvelope = JSON.parse(JSON.stringify(enqueued.record.envelope));
  conflictingEnvelope.payload.physicalCount = 13;
  const conflict = await requestJson(`http://127.0.0.1:${port}${INVENTORY_COUNT_INTAKE_V1_PATHS.handoffs}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(conflictingEnvelope),
  });
  check('inventory_conflicting_idempotency_rejected', conflict.status === 409, conflict);
  check('inventory_conflict_is_canonical_receipt', conflict.body.admissionStatus === 'REJECTED' && conflict.body.errors?.[0]?.code === 'DUPLICATE_ENVELOPE', conflict.body);

  queue.close();
  await inventory.stop();

  inventory = createInventory(port);
  check('inventory_restart_succeeds', (await inventory.start()).started === true, inventory.getDiagnostics());
  queue = createQueue(port);
  const reopened = queue.open();
  check('scanops_restart_succeeds', reopened.opened === true, reopened);
  check('scanops_acknowledgement_survives_restart', queue.getRecord('idem:test:count:000001')?.status === 'ACKNOWLEDGED', queue.getRecord('idem:test:count:000001'));
  check('inventory_intake_survives_restart', inventory.getIntakeByIdempotencyKey('idem:test:count:000001')?.status === 'AWAITING_REVIEW');

  queue.enqueueCountSubmission(countInput('outage'));
  await inventory.stop();
  const firstFailure = await queue.dispatchNext();
  check('outage_schedules_retry', firstFailure.status === 'RETRY_WAIT', firstFailure);
  advanceClock(10);
  const secondFailure = await queue.dispatchNext();
  check('retry_exhaustion_dead_letters', secondFailure.status === 'DEAD_LETTER', secondFailure);
  check('dead_letter_persisted', queue.getDiagnostics().persistedDeadLetters === 1, queue.getDiagnostics());
  const replay = queue.manualReplay('idem:test:count:outage', 'Inventory restarted after controlled outage.');
  check('manual_replay_queued', replay.status === 'REPLAY_QUEUED', replay);

  inventory = createInventory(port);
  check('inventory_restart_after_outage', (await inventory.start()).started === true, inventory.getDiagnostics());
  advanceClock(10);
  const replayDelivered = await queue.dispatchNext();
  check('manual_replay_delivered', replayDelivered.status === 'ACKNOWLEDGED', replayDelivered);
  check('manual_replay_staged_as_new_intake', inventory.getIntakeByIdempotencyKey(replay.record.idempotencyKey)?.status === 'AWAITING_REVIEW', inventory.getSnapshot());

  const inventoryDiagnostics = inventory.getDiagnostics();
  const scanDiagnostics = queue.getDiagnostics();
  check('inventory_no_background_worker', inventoryDiagnostics.backgroundWorkerStarted === false, inventoryDiagnostics);
  check('scanops_no_background_worker', scanDiagnostics.backgroundWorkerStarted === false, scanDiagnostics);
  check('scanops_no_automatic_dispatch', scanDiagnostics.automaticDispatch === false, scanDiagnostics);
  check('scanops_no_automatic_replay', scanDiagnostics.automaticReplay === false, scanDiagnostics);
  check('no_inventory_domain_apply', inventoryDiagnostics.reviewDecisionAttempted === false && inventoryDiagnostics.stockMovementAttempted === false, inventoryDiagnostics);
  check('no_inventory_mutation', inventoryDiagnostics.inventoryMutationAttempted === false && inventoryDiagnostics.stockMutationAttempted === false && inventoryDiagnostics.ledgerMutationAttempted === false, inventoryDiagnostics);
  check('no_scanops_mutation', scanDiagnostics.scanOpsMutationAttempted === false && scanDiagnostics.stockMutationAttempted === false && scanDiagnostics.ledgerMutationAttempted === false, scanDiagnostics);
} finally {
  try { queue?.close(); } catch {}
  try { await inventory?.stop(); } catch {}
  rmSync(tempRoot, { recursive: true, force: true });
}

const failed = checks.filter((entry) => !entry.passed);
const report = {
  phase: '38-A',
  component: 'cross_repository_count_handoff',
  passed: failed.length === 0,
  totalChecks: checks.length,
  passedChecks: checks.length - failed.length,
  failedChecks: failed.length,
  checks,
};
console.log(JSON.stringify(report, null, 2));
if (failed.length > 0) process.exitCode = 1;
