import {
  P28E_ACK_ENVIRONMENTS,
  P28E_ACK_STATUS,
  buildScanOpsInventoryAcceptanceAck,
} from '../src/lib/scanOpsInventoryAcceptanceAck.js';

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

function check(result, label, acknowledged) {
  assert(Object.isFrozen(result), `${label} result frozen`);
  assert(Object.isFrozen(result.inventoryAcceptance), `${label} inventory acceptance frozen`);
  assert(Object.isFrozen(result.scanopsAcknowledgement), `${label} scanops acknowledgement frozen`);
  assert(result.inventory_acceptance_acknowledged === acknowledged, `${label} acknowledged state`);
  assert(result.status === (acknowledged ? P28E_ACK_STATUS.ACKNOWLEDGED : P28E_ACK_STATUS.BLOCKED), `${label} status`);
  assert(result.candidate_only === true, `${label} candidate only`);
  assert(result.preview_only === true, `${label} preview only`);
  assert(result.inventoryAcceptance.accepted_phase === '28D-INVENTORY-ACCEPTANCE', `${label} accepted phase`);
  assert(result.inventoryAcceptance.inventory_system_of_record === true, `${label} Inventory system of record`);
  assert(result.inventoryAcceptance.candidate_alignment_accepted === acknowledged, `${label} Inventory acceptance state`);
  assert(result.scanopsAcknowledgement.inventory_acceptance_acknowledged === acknowledged, `${label} ScanOps ack state`);
  assert(result.scanopsAcknowledgement.acknowledgement_preview_only === true, `${label} ack preview only`);
  assert(result.transport_active === false, `${label} transport off`);
  assert(result.listener_active === false, `${label} listener off`);
  assert(result.desktop_call_attempted === false, `${label} desktop call off`);
  assert(result.event_sent === false, `${label} event send off`);
  assert(result.acknowledgement_emitted === false, `${label} ack not emitted`);
  assert(result.acknowledgement_persisted === false, `${label} ack not persisted`);
  assert(result.inbound_persisted === false, `${label} inbound not persisted`);
  assert(result.receipt_emitted === false, `${label} receipt not emitted`);
  assert(result.receipt_persisted === false, `${label} receipt not persisted`);
  assert(result.inventory_write_allowed === false, `${label} Inventory write blocked`);
  assert(result.stock_mutation_allowed === false, `${label} stock mutation blocked`);
  assert(result.workflow_mutation_allowed === false, `${label} workflow mutation blocked`);
  assert(result.price_mutation_allowed === false, `${label} price mutation blocked`);
  assert(result.accounting_mutation_allowed === false, `${label} accounting mutation blocked`);
  assert(result.purchase_order_write_allowed === false, `${label} PO write blocked`);
  assert(result.forecast_write_allowed === false, `${label} forecast write blocked`);
  assert(result.persisted === false, `${label} not persisted`);
  assert(result.write_attempted === false, `${label} no write attempted`);
  assert(result.mutation_attempted === false, `${label} no mutation attempted`);
}

for (const env of [P28E_ACK_ENVIRONMENTS.TRAINING, P28E_ACK_ENVIRONMENTS.TEST]) {
  check(buildScanOpsInventoryAcceptanceAck(env), env, true);
}

for (const env of [P28E_ACK_ENVIRONMENTS.LIVE, P28E_ACK_ENVIRONMENTS.PRODUCTION, P28E_ACK_ENVIRONMENTS.UNKNOWN]) {
  check(buildScanOpsInventoryAcceptanceAck(env), env, false);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('P28-E ScanOps Inventory acceptance acknowledgement remains preview-only, non-emitting, non-persistent, non-writable, and non-mutating.');
