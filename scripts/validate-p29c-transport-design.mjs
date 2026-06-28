import { buildScanOpsTransportDesignReadiness } from '../src/lib/scanOpsTransportDesignReadiness.js';

const training = buildScanOpsTransportDesignReadiness('TRAINING');
const test = buildScanOpsTransportDesignReadiness('TEST');
const live = buildScanOpsTransportDesignReadiness('LIVE');
const production = buildScanOpsTransportDesignReadiness('PRODUCTION');
const unknown = buildScanOpsTransportDesignReadiness('UNKNOWN');

const checks = [
  Object.isFrozen(training),
  Object.isFrozen(training.allowed_future_design_topics),
  Object.isFrozen(training.disallowed_now),
  training.transport_design_ready === true,
  test.transport_design_ready === true,
  live.transport_design_ready === false,
  production.transport_design_ready === false,
  unknown.transport_design_ready === false,
  training.review_only === true,
  training.design_only === true,
  training.candidate_only === true,
  training.preview_only === true,
  training.transport_active === false,
  training.socket_opened === false,
  training.http_call_attempted === false,
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
  throw new Error('P29-C validation failed');
}

console.log('P29-C ScanOps transport design readiness passed.');
