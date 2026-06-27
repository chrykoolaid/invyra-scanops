import { buildScanOpsPhase28Closure } from '../src/lib/scanOpsPhase28Closure.js';

const training = buildScanOpsPhase28Closure('TRAINING');
const test = buildScanOpsPhase28Closure('TEST');
const live = buildScanOpsPhase28Closure('LIVE');
const production = buildScanOpsPhase28Closure('PRODUCTION');
const unknown = buildScanOpsPhase28Closure('UNKNOWN');

const checks = [
  Object.isFrozen(training),
  Object.isFrozen(training.closedPhases),
  training.phase_28_candidate_chain_closed === true,
  test.phase_28_candidate_chain_closed === true,
  live.phase_28_candidate_chain_closed === false,
  production.phase_28_candidate_chain_closed === false,
  unknown.phase_28_candidate_chain_closed === false,
  training.closedPhases.phase_28a_scanops_candidate === true,
  training.closedPhases.phase_28h_inventory_roundtrip_recognition === true,
  training.candidate_only === true,
  training.preview_only === true,
  training.transport_active === false,
  training.listener_active === false,
  training.desktop_call_attempted === false,
  training.event_sent === false,
  training.persisted === false,
  training.write_attempted === false,
  training.mutation_attempted === false,
  training.inventory_write_allowed === false,
  training.stock_mutation_allowed === false,
  training.workflow_mutation_allowed === false,
];

if (!checks.every(Boolean)) {
  throw new Error('P28-I validation failed');
}

console.log('P28-I ScanOps Phase 28 closure passed.');
