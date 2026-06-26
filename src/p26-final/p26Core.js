import { P26_SCAN, P26_SCAN_FIELDS, P26_SCAN_FIXTURES, P26_SCAN_STATUS, P26_SCAN_STEPS } from './p26Fixtures.js';

const OK = Object.freeze(['TRAINING', 'TEST']);
const NO = Object.freeze(['LIVE', 'PRODUCTION']);

function env(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : 'UNKNOWN';
}

function hasFields(descriptor) {
  return P26_SCAN_FIELDS.every((field) => {
    const value = descriptor[field];
    return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
  });
}

function stepsOf(value) {
  return typeof value === 'string' ? value.split('|').map((item) => item.trim()).filter(Boolean) : [];
}

function ordered(steps) {
  return steps.length === P26_SCAN_STEPS.length && steps.every((step, index) => step === P26_SCAN_STEPS[index]);
}

function ok(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function buildP26Scan(input = {}) {
  const descriptor = Object.freeze({ ...(input.descriptor || input) });
  const environment = env(descriptor.environment);
  const fields = hasFields(descriptor);
  const readonly = descriptor.visibility_mode === 'READ_ONLY';
  const steps = Object.freeze(stepsOf(descriptor.step_order));
  const orderOk = ordered(steps);
  const hybrid = descriptor.compatibility_mode === 'HYBRID_FUTURE_MODEL';
  const candidate = OK.includes(environment) && fields && readonly && orderOk && hybrid;

  return Object.freeze({
    phase: P26_SCAN,
    id: descriptor.flow_id || 'scan-p26-unidentified',
    environment,
    status: candidate ? P26_SCAN_STATUS.CANDIDATE : P26_SCAN_STATUS.BLOCKED,
    candidate,
    fields_present: fields,
    read_only: readonly,
    order_ok: orderOk,
    hybrid_future: hybrid,
    steps,
    live_blocked: NO.includes(environment),
    candidate_only: true,
    capture_only: true,
    reorder_candidate: candidate,
    forecast_candidate: candidate,
    rfid_candidate: candidate,
    stock_change: false,
    workflow_change: false,
    po_write: false,
    forecast_write: false,
    rfid_write: false,
    reorder_done: false,
    forecast_done: false,
    rfid_done: false,
    baseline_ready: candidate,
    completed: false,
    saved: false,
    wrote: false,
    mutated: false,
    descriptor,
  });
}

export function projectP26ScanResult(fixture) {
  const item = buildP26Scan({ descriptor: fixture.descriptor });
  const checks = Object.freeze([
    ok('environment', item.environment === fixture.expected.environment),
    ok('status', item.status === fixture.expected.status),
    ok('candidate', item.candidate === fixture.expected.final_candidate),
    ok('fields_present', item.fields_present === fixture.expected.fields_present),
    ok('candidate_only', item.candidate_only === true),
    ok('read_only', item.read_only === true || item.candidate === false),
    ok('order_ok', item.order_ok === true || item.candidate === false),
    ok('hybrid_future', item.hybrid_future === true || item.candidate === false),
    ok('capture_only', item.capture_only === true),
    ok('candidate_flags', item.reorder_candidate === item.candidate && item.forecast_candidate === item.candidate && item.rfid_candidate === item.candidate),
    ok('no_write_permissions', item.stock_change === false && item.workflow_change === false && item.po_write === false && item.forecast_write === false && item.rfid_write === false),
    ok('no_execution', item.reorder_done === false && item.forecast_done === false && item.rfid_done === false),
    ok('no_effects', item.completed === false && item.saved === false && item.wrote === false && item.mutated === false),
  ]);

  return Object.freeze({ fixture_id: fixture.fixture_id, item, passed: checks.every((entry) => entry.passed), checks });
}

export function getP26ScanResults(fixtures = P26_SCAN_FIXTURES) {
  return Object.freeze(fixtures.map(projectP26ScanResult));
}
