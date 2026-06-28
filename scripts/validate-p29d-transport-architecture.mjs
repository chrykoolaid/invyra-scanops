import { buildScanOpsTransportArchitectureFoundation } from '../src/lib/scanOpsTransportArchitectureFoundation.js';

const training = buildScanOpsTransportArchitectureFoundation('TRAINING');
const test = buildScanOpsTransportArchitectureFoundation('TEST');
const live = buildScanOpsTransportArchitectureFoundation('LIVE');
const production = buildScanOpsTransportArchitectureFoundation('PRODUCTION');
const unknown = buildScanOpsTransportArchitectureFoundation('UNKNOWN');

const checks = [
  Object.isFrozen(training),
  Object.isFrozen(training.architecture_sections),
  Object.isFrozen(training.phase_dependencies),
  Object.isFrozen(training.disallowed_runtime),
  training.foundation_ready === true,
  test.foundation_ready === true,
  live.foundation_ready === false,
  production.foundation_ready === false,
  unknown.foundation_ready === false,
  training.accelerated_milestone === true,
  training.review_only === true,
  training.design_only === true,
  training.candidate_only === true,
  training.preview_only === true,
  training.phase_dependencies.scanops_29c_required === true,
  training.phase_dependencies.inventory_29b_required === true,
  training.disallowed_runtime.transport_active === false,
  training.disallowed_runtime.listener_active === false,
  training.disallowed_runtime.network_call_attempted === false,
  training.disallowed_runtime.desktop_call_attempted === false,
  training.disallowed_runtime.event_sent === false,
  training.disallowed_runtime.queue_persisted === false,
  training.disallowed_runtime.inventory_write_allowed === false,
  training.disallowed_runtime.scanops_write_allowed === false,
  training.disallowed_runtime.mutation_allowed === false,
  training.runtime_activation_allowed === false,
  training.persisted === false,
  training.write_attempted === false,
  training.mutation_attempted === false,
];

if (!checks.every(Boolean)) {
  throw new Error('P29-D validation failed');
}

console.log('P29-D ScanOps transport architecture foundation passed.');
