import { buildScanOpsDeviceSessionContract } from '../src/lib/scanOpsDeviceSessionContract.js';

const training = buildScanOpsDeviceSessionContract('TRAINING');
const test = buildScanOpsDeviceSessionContract('TEST');
const live = buildScanOpsDeviceSessionContract('LIVE');
const production = buildScanOpsDeviceSessionContract('PRODUCTION');
const unknown = buildScanOpsDeviceSessionContract('UNKNOWN');

const checks = [
  Object.isFrozen(training),
  Object.isFrozen(training.dependencies_required),
  Object.isFrozen(training.device_identity_shape),
  Object.isFrozen(training.session_shape),
  Object.isFrozen(training.disabled_device_session_operations),
  training.device_session_contract_ready === true,
  test.device_session_contract_ready === true,
  live.device_session_contract_ready === false,
  production.device_session_contract_ready === false,
  unknown.device_session_contract_ready === false,
  training.inactive_contract_only === true,
  training.hard_disabled === true,
  training.device_session_only === true,
  training.candidate_only === true,
  training.preview_only === true,
  training.device_identity_shape.registered === false,
  training.device_identity_shape.persisted === false,
  training.session_shape.active === false,
  training.session_shape.persisted === false,
  training.disabled_device_session_operations.register_device === false,
  training.disabled_device_session_operations.start_session === false,
  training.disabled_device_session_operations.open_transport === false,
  training.device_registered === false,
  training.session_started === false,
  training.pairing_active === false,
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
  throw new Error('P30-E validation failed');
}

console.log('P30-E ScanOps device/session contract passed.');
