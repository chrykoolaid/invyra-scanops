import { P23_SCAN, P23_SCAN_FIELDS, P23_SCAN_FIXTURES, P23_SCAN_STATUS } from './p23Fixtures.js';

const OK = Object.freeze(['TRAINING', 'TEST']);
const NO = Object.freeze(['LIVE', 'PRODUCTION']);

function env(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : 'UNKNOWN';
}

function hasFields(descriptor) {
  return P23_SCAN_FIELDS.every((field) => {
    const value = descriptor[field];
    return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
  });
}

function ok(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function buildP23Scan(input = {}) {
  const descriptor = Object.freeze({ ...(input.descriptor || input) });
  const environment = env(descriptor.environment);
  const fields = hasFields(descriptor);
  const readonly = descriptor.visibility_mode === 'READ_ONLY';
  const candidate = OK.includes(environment) && fields && readonly;

  return Object.freeze({
    phase: P23_SCAN,
    id: descriptor.event_test_id || 'scan-p23-unidentified',
    environment,
    status: candidate ? P23_SCAN_STATUS.CANDIDATE : P23_SCAN_STATUS.BLOCKED,
    candidate,
    fields_present: fields,
    read_only: readonly,
    live_blocked: NO.includes(environment),
    candidate_only: true,
    capture_only: true,
    tx_candidate: candidate,
    ack_candidate: candidate,
    retry_candidate: candidate,
    duplicate_candidate: candidate,
    audit_candidate: candidate,
    stock_change: false,
    workflow_change: false,
    sent: false,
    ack_out: false,
    retry_done: false,
    replay_done: false,
    duplicate_saved: false,
    audit_saved: false,
    completed: false,
    saved: false,
    wrote: false,
    mutated: false,
    descriptor,
  });
}

export function projectP23ScanResult(fixture) {
  const item = buildP23Scan({ descriptor: fixture.descriptor });
  const checks = Object.freeze([
    ok('environment', item.environment === fixture.expected.environment),
    ok('status', item.status === fixture.expected.status),
    ok('candidate', item.candidate === fixture.expected.event_candidate),
    ok('fields_present', item.fields_present === fixture.expected.fields_present),
    ok('candidate_only', item.candidate_only === true),
    ok('read_only', item.read_only === true || item.candidate === false),
    ok('capture_only', item.capture_only === true),
    ok('candidate_flags', item.tx_candidate === item.candidate && item.ack_candidate === item.candidate && item.retry_candidate === item.candidate && item.duplicate_candidate === item.candidate && item.audit_candidate === item.candidate),
    ok('no_operation_change', item.stock_change === false && item.workflow_change === false),
    ok('no_execution', item.sent === false && item.ack_out === false && item.retry_done === false && item.replay_done === false),
    ok('no_effects', item.duplicate_saved === false && item.audit_saved === false && item.completed === false && item.saved === false && item.wrote === false && item.mutated === false),
  ]);

  return Object.freeze({ fixture_id: fixture.fixture_id, item, passed: checks.every((entry) => entry.passed), checks });
}

export function getP23ScanResults(fixtures = P23_SCAN_FIXTURES) {
  return Object.freeze(fixtures.map(projectP23ScanResult));
}
