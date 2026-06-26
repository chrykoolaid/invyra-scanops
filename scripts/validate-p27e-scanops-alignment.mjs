import { HANDOFF_ENVIRONMENTS } from '../src/lib/scanOpsHandoffModel.js';
import { P27E_SCANOPS_TO_INVENTORY_FIELDS, buildP27EScanOpsAlignment } from '../src/lib/scanOpsSyncModelAlignment.js';

const errors = [];
function assert(condition, message) { if (!condition) errors.push(message); }

assert(Object.isFrozen(P27E_SCANOPS_TO_INVENTORY_FIELDS), 'field map must be frozen');
assert(P27E_SCANOPS_TO_INVENTORY_FIELDS.length >= 10, 'field map must cover core handoff fields');

for (const env of [HANDOFF_ENVIRONMENTS.TRAINING, HANDOFF_ENVIRONMENTS.TEST]) {
  const result = buildP27EScanOpsAlignment(env);
  assert(Object.isFrozen(result), `${env} result frozen`);
  assert(result.passed === true, `${env} alignment passed`);
  assert(result.safe_environment === true, `${env} safe env`);
  assert(result.candidate_only === true, `${env} candidate only`);
  assert(result.blocked === false, `${env} not blocked`);
  assert(result.scanops.queueItem.candidate_allowed === true, `${env} scanops queue candidate`);
  assert(result.inventoryCandidate.inboundEvent.target_system === 'INVENTORY', `${env} inventory target`);
  assert(result.inventoryCandidate.validationResult.event_accepted_for_processing === false, `${env} no processing`);
  assert(result.inventoryCandidate.receipt.receipt_emitted === false, `${env} no receipt output`);
  assert(result.guards.transport_active === false, `${env} no transport`);
  assert(result.guards.desktop_call_allowed === false, `${env} no desktop call`);
  assert(result.guards.inventory_write_allowed === false, `${env} no inventory write`);
  assert(result.guards.stock_mutation_allowed === false, `${env} no stock change`);
  assert(result.guards.workflow_mutation_allowed === false, `${env} no workflow change`);
  assert(result.guards.price_mutation_allowed === false, `${env} no price change`);
  assert(result.guards.accounting_mutation_allowed === false, `${env} no accounting change`);
  assert(result.guards.purchase_order_write_allowed === false, `${env} no PO write`);
  assert(result.guards.forecast_write_allowed === false, `${env} no forecast write`);
  assert(result.guards.persisted === false, `${env} no save`);
  assert(result.guards.write_attempted === false, `${env} no write`);
  assert(result.guards.mutation_attempted === false, `${env} no mutate`);
}

for (const env of [HANDOFF_ENVIRONMENTS.LIVE, HANDOFF_ENVIRONMENTS.PRODUCTION, HANDOFF_ENVIRONMENTS.UNKNOWN]) {
  const result = buildP27EScanOpsAlignment(env);
  assert(result.passed === true, `${env} structural alignment still passed`);
  assert(result.safe_environment === false, `${env} unsafe env`);
  assert(result.candidate_only === false, `${env} not candidate`);
  assert(result.blocked === true, `${env} blocked`);
  assert(result.scanops.queueItem.candidate_allowed === false, `${env} scanops queue blocked`);
  assert(result.guards.transport_active === false, `${env} no transport`);
  assert(result.guards.inventory_write_allowed === false, `${env} no inventory write`);
  assert(result.guards.stock_mutation_allowed === false, `${env} no stock change`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('P27E ScanOps alignment passed: 27B outbound model maps to expected Inventory 27C inbox fields, TEST/TRAINING candidate-only, LIVE/PRODUCTION blocked, no transport, no desktop call, no writes, no mutation.');
