import { buildScanOpsEnvelopeQueueContract } from '../src/lib/scanOpsEnvelopeQueueContract.js';

const training = buildScanOpsEnvelopeQueueContract('TRAINING');
const test = buildScanOpsEnvelopeQueueContract('TEST');
const live = buildScanOpsEnvelopeQueueContract('LIVE');
const production = buildScanOpsEnvelopeQueueContract('PRODUCTION');
const unknown = buildScanOpsEnvelopeQueueContract('UNKNOWN');

const checks = [
  Object.isFrozen(training),
  Object.isFrozen(training.dependencies_required),
  Object.isFrozen(training.envelope_shape),
  Object.isFrozen(training.queue_shape),
  Object.isFrozen(training.disabled_envelope_queue_operations),
  training.envelope_queue_contract_ready === true,
  test.envelope_queue_contract_ready === true,
  live.envelope_queue_contract_ready === false,
  production.envelope_queue_contract_ready === false,
  unknown.envelope_queue_contract_ready === false,
  training.inactive_contract_only === true,
  training.hard_disabled === true,
  training.envelope_queue_only === true,
  training.candidate_only === true,
  training.preview_only === true,
  training.envelope_shape.source_system === 'SCANOPS',
  training.envelope_shape.target_system === 'INVENTORY',
  training.envelope_shape.emitted === false,
  training.envelope_shape.persisted === false,
  training.queue_shape.persisted === false,
  training.queue_shape.replay_allowed === false,
  training.disabled_envelope_queue_operations.persist_queue_item === false,
  training.disabled_envelope_queue_operations.replay_queue === false,
  training.disabled_envelope_queue_operations.send_event === false,
  training.envelope_created === false,
  training.envelope_emitted === false,
  training.queue_item_persisted === false,
  training.queue_replayed === false,
  training.transport_active === false,
  training.network_call_attempted === false,
  training.desktop_call_attempted === false,
  training.event_sent === false,
  training.persisted === false,
  training.write_attempted === false,
  training.mutation_attempted === false,
  training.runtime_activation_allowed === false,
  training.inventory_write_allowed === false,
  training.scanops_write_allowed === false,
];

if (!checks.every(Boolean)) {
  throw new Error('P30-G validation failed');
}

console.log('P30-G ScanOps envelope/queue contract passed.');
