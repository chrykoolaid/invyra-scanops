import { P25_SCAN, P25_SCAN_FIELDS, P25_SCAN_FIXTURES, P25_SCAN_STATUS, P25_SCAN_STEPS } from './p25Fixtures.js';

const OK_ENVS = Object.freeze(['TRAINING', 'TEST']);
const NO_ENVS = Object.freeze(['LIVE', 'PRODUCTION']);

function normalizeEnvironment(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : 'UNKNOWN';
}

function fieldsPresent(descriptor) {
  return P25_SCAN_FIELDS.every((field) => {
    const value = descriptor[field];
    return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
  });
}

function parseSteps(value) {
  return typeof value === 'string' ? value.split('|').map((item) => item.trim()).filter(Boolean) : [];
}

function expectedOrder(steps) {
  return steps.length === P25_SCAN_STEPS.length && steps.every((step, index) => step === P25_SCAN_STEPS[index]);
}

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function buildP25ScanFlow(input = {}) {
  const descriptor = Object.freeze({ ...(input.descriptor || input) });
  const environment = normalizeEnvironment(descriptor.environment);
  const hasFields = fieldsPresent(descriptor);
  const readOnly = descriptor.visibility_mode === 'READ_ONLY';
  const steps = Object.freeze(parseSteps(descriptor.step_order));
  const orderOk = expectedOrder(steps);
  const flowCandidate = OK_ENVS.includes(environment) && hasFields && readOnly && orderOk;

  return Object.freeze({
    phase: P25_SCAN,
    flow_id: descriptor.flow_id || 'scan-p25-unidentified',
    environment,
    status: flowCandidate ? P25_SCAN_STATUS.CANDIDATE : P25_SCAN_STATUS.BLOCKED,
    flow_candidate: flowCandidate,
    fields_present: hasFields,
    read_only: readOnly,
    order_ok: orderOk,
    steps,
    live_blocked: NO_ENVS.includes(environment),
    flow_candidate_only: true,
    capture_only: true,
    stock_out_candidate: flowCandidate,
    stocktake_candidate: flowCandidate,
    receiving_candidate: flowCandidate,
    transfer_candidate: flowCandidate,
    stock_mutation_allowed: false,
    workflow_write_allowed: false,
    stock_out_posted: false,
    stocktake_reconciled: false,
    receiving_posted: false,
    transfer_posted: false,
    completed: false,
    persisted: false,
    write_attempted: false,
    mutation_attempted: false,
    descriptor,
  });
}

export function projectP25ScanFlowResult(fixture) {
  const flow = buildP25ScanFlow({ descriptor: fixture.descriptor });
  const checks = Object.freeze([
    check('environment', flow.environment === fixture.expected.environment),
    check('status', flow.status === fixture.expected.status),
    check('flow_candidate', flow.flow_candidate === fixture.expected.flow_candidate),
    check('fields_present', flow.fields_present === fixture.expected.fields_present),
    check('candidate_only', flow.flow_candidate_only === true),
    check('read_only', flow.read_only === true || flow.flow_candidate === false),
    check('order_ok', flow.order_ok === true || flow.flow_candidate === false),
    check('capture_only', flow.capture_only === true),
    check('candidate_flags', flow.stock_out_candidate === flow.flow_candidate && flow.stocktake_candidate === flow.flow_candidate && flow.receiving_candidate === flow.flow_candidate && flow.transfer_candidate === flow.flow_candidate),
    check('no_operation_change', flow.stock_mutation_allowed === false && flow.workflow_write_allowed === false),
    check('no_execution', flow.stock_out_posted === false && flow.stocktake_reconciled === false && flow.receiving_posted === false && flow.transfer_posted === false),
    check('no_effects', flow.completed === false && flow.persisted === false && flow.write_attempted === false && flow.mutation_attempted === false),
  ]);

  return Object.freeze({ fixture_id: fixture.fixture_id, flow, passed: checks.every((item) => item.passed), checks });
}

export function getP25ScanFlowResults(fixtures = P25_SCAN_FIXTURES) {
  return Object.freeze(fixtures.map(projectP25ScanFlowResult));
}
