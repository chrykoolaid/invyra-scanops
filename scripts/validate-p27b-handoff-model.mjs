import {
  HANDOFF_ENVIRONMENTS,
  HANDOFF_MODE,
  HANDOFF_MODEL_PHASE,
  HANDOFF_STATES,
  buildP27BModelBundle,
  buildScanOpsAuditEvent,
  buildScanOpsDuplicateKey,
  buildScanOpsHandoffConfig,
  buildScanOpsHandoffReceipt,
  buildScanOpsLocalQueueItem,
  buildScanOpsPayloadContract,
  buildScanOpsRetryState,
} from '../src/lib/scanOpsHandoffModel.js';

const errors = [];
function assert(condition, message) { if (!condition) errors.push(message); }

function assertGuard(model, label, shouldCandidate) {
  assert(Object.isFrozen(model), `${label} must be frozen`);
  assert(model.phase === HANDOFF_MODEL_PHASE, `${label} phase must be ${HANDOFF_MODEL_PHASE}`);
  assert(model.transport_active === false, `${label} must not activate transport`);
  assert(model.desktop_call_allowed === false, `${label} must not call desktop`);
  assert(model.inventory_write_allowed === false, `${label} must not write inventory`);
  assert(model.stock_mutation_allowed === false, `${label} must not mutate stock`);
  assert(model.workflow_mutation_allowed === false, `${label} must not mutate workflows`);
  assert(model.price_mutation_allowed === false, `${label} must not mutate prices`);
  assert(model.accounting_mutation_allowed === false, `${label} must not mutate accounting`);
  assert(model.persisted === false, `${label} must not persist`);
  assert(model.write_attempted === false, `${label} must not write`);
  assert(model.mutation_attempted === false, `${label} must not mutate`);

  if (shouldCandidate) {
    assert(model.mode === HANDOFF_MODE.CANDIDATE_ONLY, `${label} must be candidate only`);
    assert(model.candidate_allowed === true, `${label} candidate must be allowed`);
  } else {
    assert(model.mode === HANDOFF_MODE.BLOCKED, `${label} must be blocked`);
    assert(model.candidate_allowed === false, `${label} candidate must be blocked`);
  }
}

assert(HANDOFF_MODEL_PHASE === '27B', 'phase marker must remain 27B');

for (const environment of [HANDOFF_ENVIRONMENTS.TRAINING, HANDOFF_ENVIRONMENTS.TEST]) {
  const bundle = buildP27BModelBundle(environment);
  assert(Object.isFrozen(bundle), `${environment} bundle must be frozen`);
  assertGuard(bundle.queueItem, `${environment} queue`, true);
  assertGuard(bundle.config, `${environment} config`, true);
  assertGuard(bundle.contract, `${environment} contract`, true);
  assertGuard(bundle.receipt, `${environment} receipt`, true);
  assertGuard(bundle.retry, `${environment} retry`, true);
  assertGuard(bundle.duplicateKey, `${environment} duplicate`, true);
  assertGuard(bundle.auditEvent, `${environment} audit`, true);

  assert(bundle.queueItem.status === HANDOFF_STATES.QUEUED, `${environment} queue status must be queued candidate`);
  assert(bundle.config.enabled === true, `${environment} config may be locally enabled only as candidate`);
  assert(bundle.contract.mutation_allowed === false, `${environment} contract mutation must be false`);
  assert(bundle.receipt.desktop_response_candidate === true, `${environment} receipt may be response candidate only`);
  assert(bundle.retry.retry_allowed === true, `${environment} retry may be candidate only`);
  assert(bundle.duplicateKey.duplicate_blocked === true, `${environment} duplicate key must block duplicate`);
  assert(bundle.auditEvent.audit_candidate_only === true, `${environment} audit must be candidate-only`);
}

for (const environment of [HANDOFF_ENVIRONMENTS.LIVE, HANDOFF_ENVIRONMENTS.PRODUCTION, HANDOFF_ENVIRONMENTS.UNKNOWN]) {
  const bundle = buildP27BModelBundle(environment);
  assertGuard(bundle.queueItem, `${environment} queue`, false);
  assertGuard(bundle.config, `${environment} config`, false);
  assertGuard(bundle.contract, `${environment} contract`, false);
  assertGuard(bundle.receipt, `${environment} receipt`, false);
  assertGuard(bundle.retry, `${environment} retry`, false);
  assertGuard(bundle.duplicateKey, `${environment} duplicate`, false);
  assertGuard(bundle.auditEvent, `${environment} audit`, false);

  assert(bundle.config.enabled === false, `${environment} config must not enable`);
  assert(bundle.receipt.desktop_response_candidate === false, `${environment} receipt must not candidate`);
  assert(bundle.retry.retry_allowed === false, `${environment} retry must not candidate`);
}

const missingQueue = buildScanOpsLocalQueueItem({ environment: 'TRAINING' });
assertGuard(missingQueue, 'missing queue', false);
assert(missingQueue.fields_present === false, 'missing queue fields must be detected');

const missingConfig = buildScanOpsHandoffConfig({ environment: 'TRAINING' });
assertGuard(missingConfig, 'missing config', false);
assert(missingConfig.enabled === false, 'missing config must not enable');

const missingContract = buildScanOpsPayloadContract({ environment: 'TRAINING', mutation_allowed: true });
assertGuard(missingContract, 'missing contract', false);
assert(missingContract.mutation_allowed === false, 'contract mutation must remain false');

const missingReceipt = buildScanOpsHandoffReceipt({ environment: 'TRAINING', desktop_response_candidate: true });
assertGuard(missingReceipt, 'missing receipt', false);
assert(missingReceipt.desktop_response_candidate === false, 'missing receipt candidate must be false');

const missingRetry = buildScanOpsRetryState({ environment: 'TRAINING', attempt_count: 1, max_attempts: 3 });
assertGuard(missingRetry, 'missing retry', false);
assert(missingRetry.retry_allowed === false, 'missing retry candidate must be false');

const missingDuplicate = buildScanOpsDuplicateKey({ environment: 'TRAINING' });
assertGuard(missingDuplicate, 'missing duplicate', false);
assert(missingDuplicate.duplicate_blocked === false, 'missing duplicate must not block as valid candidate');

const missingAudit = buildScanOpsAuditEvent({ environment: 'TRAINING' });
assertGuard(missingAudit, 'missing audit', false);
assert(missingAudit.audit_candidate_only === false, 'missing audit candidate must be false');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('P27B ScanOps handoff data model remains TEST/TRAINING candidate-only, LIVE/PRODUCTION blocked, no desktop call, no transport activation, no Inventory write, no stock/workflow/price/accounting mutation, not persisted, non-writable, and non-mutating.');
