import { createScanOpsBridgeRuntimeScaffold } from '../src/lib/scanOpsBridgeRuntimeScaffold.js';

const training = createScanOpsBridgeRuntimeScaffold('TRAINING');
const test = createScanOpsBridgeRuntimeScaffold('TEST');
const live = createScanOpsBridgeRuntimeScaffold('LIVE');
const production = createScanOpsBridgeRuntimeScaffold('PRODUCTION');
const unknown = createScanOpsBridgeRuntimeScaffold('UNKNOWN');

const checks = [
  Object.isFrozen(training),
  Object.isFrozen(training.dependencies_required),
  Object.isFrozen(training.runtime_slots),
  Object.isFrozen(training.disabled_operations),
  training.scaffold_available === true,
  test.scaffold_available === true,
  live.scaffold_available === false,
  production.scaffold_available === false,
  unknown.scaffold_available === false,
  training.inactive_runtime_scaffold === true,
  training.hard_disabled === true,
  training.scaffold_only === true,
  training.candidate_only === true,
  training.preview_only === true,
  training.disabled_operations.start_runtime === false,
  training.disabled_operations.open_transport === false,
  training.disabled_operations.send_event === false,
  training.disabled_operations.persist_queue === false,
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
  training.stock_mutation_allowed === false,
  training.workflow_mutation_allowed === false,
];

if (!checks.every(Boolean)) {
  throw new Error('P30-A validation failed');
}

console.log('P30-A ScanOps inactive runtime scaffold passed.');
