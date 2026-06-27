import {
  P28C_ALIGNMENT_ENVIRONMENTS,
  P28C_ALIGNMENT_STATUS,
  buildP28CCandidateAlignment,
} from '../src/lib/scanOpsInventoryCandidateAlignment.js';

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

function check(result, label, ready) {
  assert(Object.isFrozen(result), `${label} result frozen`);
  assert(Object.isFrozen(result.scanops), `${label} scanops frozen`);
  assert(Object.isFrozen(result.inventory), `${label} inventory frozen`);
  assert(Object.isFrozen(result.aligned_sequence), `${label} sequence frozen`);
  assert(result.candidate_alignment_ready === ready, `${label} alignment ready`);
  assert(result.status === (ready ? P28C_ALIGNMENT_STATUS.READY : P28C_ALIGNMENT_STATUS.BLOCKED), `${label} status`);
  assert(result.candidate_only === true, `${label} candidate only`);
  assert(result.preview_only === true, `${label} preview only`);
  assert(result.scanops.phase === '28A-SCANOPS', `${label} ScanOps phase`);
  assert(result.inventory.phase === '28B-INVENTORY', `${label} Inventory phase`);
  assert(result.scanops.environment === result.environment, `${label} ScanOps environment`);
  assert(result.inventory.environment === result.environment, `${label} Inventory environment`);
  assert(result.scanops.local_queue_candidate_ready === ready, `${label} local queue candidate state`);
  assert(result.scanops.inventory_inbox_envelope_preview_ready === ready, `${label} inbox envelope preview state`);
  assert(result.scanops.receipt_candidate_preview_ready === ready, `${label} ScanOps receipt preview state`);
  assert(result.inventory.inbox_candidate_ready === ready, `${label} Inventory inbox state`);
  assert(result.inventory.validation_candidate_ready === ready, `${label} Inventory validation state`);
  assert(result.inventory.receipt_candidate_ready === ready, `${label} Inventory receipt state`);
  assert(result.aligned_sequence.length === 5, `${label} sequence length`);
  assert(result.transport_active === false, `${label} transport off`);
  assert(result.listener_active === false, `${label} listener off`);
  assert(result.desktop_call_attempted === false, `${label} desktop call off`);
  assert(result.event_sent === false, `${label} event send off`);
  assert(result.inbound_persisted === false, `${label} inbound not persisted`);
  assert(result.receipt_emitted === false, `${label} receipt not emitted`);
  assert(result.receipt_persisted === false, `${label} receipt not persisted`);
  assert(result.inventory_write_allowed === false, `${label} inventory write off`);
  assert(result.stock_mutation_allowed === false, `${label} stock mutation off`);
  assert(result.workflow_mutation_allowed === false, `${label} workflow mutation off`);
  assert(result.price_mutation_allowed === false, `${label} price mutation off`);
  assert(result.accounting_mutation_allowed === false, `${label} accounting mutation off`);
  assert(result.purchase_order_write_allowed === false, `${label} PO write off`);
  assert(result.forecast_write_allowed === false, `${label} forecast write off`);
  assert(result.write_attempted === false, `${label} no write attempted`);
  assert(result.mutation_attempted === false, `${label} no mutation attempted`);
}

for (const env of [P28C_ALIGNMENT_ENVIRONMENTS.TRAINING, P28C_ALIGNMENT_ENVIRONMENTS.TEST]) {
  check(buildP28CCandidateAlignment(env), env, true);
}

for (const env of [P28C_ALIGNMENT_ENVIRONMENTS.LIVE, P28C_ALIGNMENT_ENVIRONMENTS.PRODUCTION, P28C_ALIGNMENT_ENVIRONMENTS.UNKNOWN]) {
  check(buildP28CCandidateAlignment(env), env, false);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('P28-C ScanOps/Inventory candidate alignment remains preview-only and non-operational.');
