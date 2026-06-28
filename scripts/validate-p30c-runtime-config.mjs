import { buildScanOpsRuntimeConfigContract } from '../src/lib/scanOpsRuntimeConfigContract.js';

const training = buildScanOpsRuntimeConfigContract('TRAINING');
const test = buildScanOpsRuntimeConfigContract('TEST');
const live = buildScanOpsRuntimeConfigContract('LIVE');
const production = buildScanOpsRuntimeConfigContract('PRODUCTION');
const unknown = buildScanOpsRuntimeConfigContract('UNKNOWN');

const checks = [
  Object.isFrozen(training),
  Object.isFrozen(training.dependencies_required),
  Object.isFrozen(training.config_shape),
  Object.isFrozen(training.disabled_config_operations),
  training.config_contract_ready === true,
  test.config_contract_ready === true,
  live.config_contract_ready === false,
  production.config_contract_ready === false,
  unknown.config_contract_ready === false,
  training.inactive_contract_only === true,
  training.hard_disabled === true,
  training.config_only === true,
  training.candidate_only === true,
  training.preview_only === true,
  training.disabled_config_operations.save_config === false,
  training.disabled_config_operations.load_persisted_config === false,
  training.disabled_config_operations.pair_device === false,
  training.disabled_config_operations.open_transport === false,
  training.config_persisted === false,
  training.config_loaded_from_storage === false,
  training.pairing_token_generated === false,
  training.endpoint_validated === false,
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
  throw new Error('P30-C validation failed');
}

console.log('P30-C ScanOps runtime config contract passed.');
