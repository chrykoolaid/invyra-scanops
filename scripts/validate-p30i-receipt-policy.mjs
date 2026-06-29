import { buildScanOpsReceiptPolicyContract } from '../src/lib/scanOpsReceiptPolicyContract.js';

const training = buildScanOpsReceiptPolicyContract('TRAINING');
const test = buildScanOpsReceiptPolicyContract('TEST');
const live = buildScanOpsReceiptPolicyContract('LIVE');
const production = buildScanOpsReceiptPolicyContract('PRODUCTION');
const unknown = buildScanOpsReceiptPolicyContract('UNKNOWN');

const checks = [
  Object.isFrozen(training),
  training.receipt_policy_contract_ready === true,
  test.receipt_policy_contract_ready === true,
  live.receipt_policy_contract_ready === false,
  production.receipt_policy_contract_ready === false,
  unknown.receipt_policy_contract_ready === false,
  training.inactive_contract_only === true,
  training.hard_disabled === true,
  training.candidate_only === true,
  training.preview_only === true,
  training.receipt_received === false,
  training.receipt_persisted === false,
  training.queue_item_marked_done === false,
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
  throw new Error('P30-I validation failed');
}

console.log('P30-I ScanOps receipt policy contract passed.');
