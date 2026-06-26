import { P24_SCAN, P24_SCAN_FIELDS, P24_SCAN_FIXTURES, P24_SCAN_STATUS, P24_SCAN_STEPS } from './p24Fixtures.js';

const OK_ENVS = Object.freeze(['TRAINING', 'TEST']);
const NO_ENVS = Object.freeze(['LIVE', 'PRODUCTION']);

function normalizeEnvironment(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : 'UNKNOWN';
}

function fieldsPresent(descriptor) {
  return P24_SCAN_FIELDS.every((field) => {
    const value = descriptor[field];
    return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
  });
}

function parseSteps(value) {
  return typeof value === 'string' ? value.split('|').map((item) => item.trim()).filter(Boolean) : [];
}

function expectedOrder(steps) {
  return steps.length === P24_SCAN_STEPS.length && steps.every((step, index) => step === P24_SCAN_STEPS[index]);
}

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function buildP24ScanFlow(input = {}) {
  const descriptor = Object.freeze({ ...(input.descriptor || input) });
  const environment = normalizeEnvironment(descriptor.environment);
  const hasFields = fieldsPresent(descriptor);
  const readOnly = descriptor.visibility_mode === 'READ_ONLY';
  const steps = Object.freeze(parseSteps(descriptor.step_order));
  const orderOk = expectedOrder(steps);
  const flowCandidate = OK_ENVS.includes(environment) && hasFields && readOnly && orderOk;

  return Object.freeze({
    phase: P24_SCAN,
    flow_id: descriptor.flow_id || 'scan-p24-unidentified',
    environment,
    status: flowCandidate ? P24_SCAN_STATUS.CANDIDATE : P24_SCAN_STATUS.BLOCKED,
    flow_candidate: flowCandidate,
    fields_present: hasFields,
    read_only: readOnly,
    order_ok: orderOk,
    steps,
    live_blocked: NO_ENVS.includes(environment),
    flow_candidate_only: true,
    capture_only: true,
    dashboard_notice_candidate: flowCandidate,
    gap_scan_candidate: flowCandidate,
    scanner_intake_candidate: flowCandidate,
    item_details_candidate: flowCandidate,
    stock_mutation_allowed: false,
    workflow_write_allowed: false,
    notification_sent: false,
    gap_scan_run: false,
    intake_posted: false,
    item_updated: false,
    completed: false,
    persisted: false,
    write_attempted: false,
    mutation_attempted: false,
    descriptor,
  });
}

export function projectP24ScanFlowResult(fixture) {
  const flow = buildP24ScanFlow({ descriptor: fixture.descriptor });
  const checks = Object.freeze([
    check('environment', flow.environment === fixture.expected.environment),
    check('status', flow.status === fixture.expected.status),
    check('flow_candidate', flow.flow_candidate === fixture.expected.flow_candidate),
    check('fields_present', flow.fields_present === fixture.expected.fields_present),
    check('candidate_only', flow.flow_candidate_only === true),
    check('read_only', flow.read_only === true || flow.flow_candidate === false),
    check('order_ok', flow.order_ok === true || flow.flow_candidate === false),
    check('capture_only', flow.capture_only === true),
    check('candidate_flags', flow.dashboard_notice_candidate === flow.flow_candidate && flow.gap_scan_candidate === flow.flow_candidate && flow.scanner_intake_candidate === flow.flow_candidate && flow.item_details_candidate === flow.flow_candidate),
    check('no_operation_change', flow.stock_mutation_allowed === false && flow.workflow_write_allowed === false),
    check('no_execution', flow.notification_sent === false && flow.gap_scan_run === false && flow.intake_posted === false && flow.item_updated === false),
    check('no_effects', flow.completed === false && flow.persisted === false && flow.write_attempted === false && flow.mutation_attempted === false),
  ]);

  return Object.freeze({ fixture_id: fixture.fixture_id, flow, passed: checks.every((item) => item.passed), checks });
}

export function getP24ScanFlowResults(fixtures = P24_SCAN_FIXTURES) {
  return Object.freeze(fixtures.map(projectP24ScanFlowResult));
}
