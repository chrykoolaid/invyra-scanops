import { HANDOFF_ENVIRONMENTS } from '../src/lib/scanOpsHandoffModel.js';
import { P28_SCAN_STATUS, buildScanOpsHandoffCandidate } from '../src/lib/scanOpsHandoffCandidate.js';

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

function check(result, label, ok) {
  assert(Object.isFrozen(result), `${label} frozen`);
  assert(result.candidate === ok, `${label} candidate`);
  assert(result.candidate_only === true, `${label} only`);
  assert(result.status === (ok ? P28_SCAN_STATUS.CANDIDATE : P28_SCAN_STATUS.BLOCKED), `${label} status`);
  assert(result.transport_active === false, `${label} transport off`);
  assert(result.desktop_call_attempted === false, `${label} call off`);
  assert(result.desktop_call_allowed === false, `${label} call blocked`);
  assert(result.event_sent === false, `${label} send off`);
  assert(result.inbox_write_attempted === false, `${label} inbox off`);
  assert(result.receipt_received === false, `${label} receipt in off`);
  assert(result.receipt_persisted === false, `${label} receipt save off`);
  assert(result.inventory_write_allowed === false, `${label} inv write off`);
  assert(result.stock_mutation_allowed === false, `${label} stock off`);
  assert(result.workflow_mutation_allowed === false, `${label} workflow off`);
  assert(result.persisted === false, `${label} save off`);
  assert(result.write_attempted === false, `${label} write off`);
  assert(result.mutation_attempted === false, `${label} mutate off`);
  assert(result.inboxEnvelope.target_system === 'INVENTORY', `${label} target`);
  assert(result.inboxEnvelope.payload_preview_only === true, `${label} preview`);
}

for (const env of [HANDOFF_ENVIRONMENTS.TRAINING, HANDOFF_ENVIRONMENTS.TEST]) {
  const result = buildScanOpsHandoffCandidate(env);
  check(result, env, true);
  assert(result.local_queue_ready === true, `${env} local ready`);
  assert(result.outbound_payload_shaped === true, `${env} payload shaped`);
  assert(result.validation_preview_ready === true, `${env} validation preview`);
  assert(result.receipt_preview_ready === true, `${env} receipt preview`);
}

for (const env of [HANDOFF_ENVIRONMENTS.LIVE, HANDOFF_ENVIRONMENTS.PRODUCTION, HANDOFF_ENVIRONMENTS.UNKNOWN]) {
  const result = buildScanOpsHandoffCandidate(env);
  check(result, env, false);
  assert(result.local_queue_ready === false, `${env} local blocked`);
  assert(result.outbound_payload_shaped === false, `${env} payload blocked`);
  assert(result.validation_preview_ready === false, `${env} validation blocked`);
  assert(result.receipt_preview_ready === false, `${env} receipt blocked`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('P28 ScanOps candidate passed.');
