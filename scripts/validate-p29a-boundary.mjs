import { buildScanOpsPreactivationBoundary } from '../src/lib/scanOpsPreactivationBoundary.js';

const training = buildScanOpsPreactivationBoundary('TRAINING');
const test = buildScanOpsPreactivationBoundary('TEST');
const live = buildScanOpsPreactivationBoundary('LIVE');
const production = buildScanOpsPreactivationBoundary('PRODUCTION');
const unknown = buildScanOpsPreactivationBoundary('UNKNOWN');

const checks = [
  Object.isFrozen(training),
  training.preactivation_boundary_ready === true,
  test.preactivation_boundary_ready === true,
  live.preactivation_boundary_ready === false,
  production.preactivation_boundary_ready === false,
  unknown.preactivation_boundary_ready === false,
  training.review_only === true,
  training.candidate_only === true,
  training.preview_only === true,
  training.transport_active === false,
  training.listener_active === false,
  training.desktop_call_attempted === false,
  training.event_sent === false,
  training.runtime_activation_allowed === false,
  training.persisted === false,
  training.write_attempted === false,
  training.mutation_attempted === false,
  training.inventory_write_allowed === false,
  training.stock_mutation_allowed === false,
  training.workflow_mutation_allowed === false,
];

if (!checks.every(Boolean)) {
  throw new Error('P29-A validation failed');
}

console.log('P29-A ScanOps preactivation boundary passed.');
