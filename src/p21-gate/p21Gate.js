import { P21_SCAN, P21_SCAN_FIELDS, P21_SCAN_FIXTURES, P21_SCAN_ROLES, P21_SCAN_STATUS } from './p21Fixtures.js';

const OK_ENVS = Object.freeze(['TRAINING', 'TEST']);
const NO_ENVS = Object.freeze(['LIVE', 'PRODUCTION']);

function normalizeEnvironment(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : 'UNKNOWN';
}

function normalizeRole(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function fieldsPresent(descriptor) {
  return P21_SCAN_FIELDS.every((field) => {
    const value = descriptor[field];
    return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
  });
}

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function buildP21ScanGate(input = {}) {
  const descriptor = Object.freeze({ ...(input.descriptor || input) });
  const environment = normalizeEnvironment(descriptor.environment);
  const role = normalizeRole(descriptor.role);
  const hasFields = fieldsPresent(descriptor);
  const roleAllowed = P21_SCAN_ROLES.includes(role);
  const gateCandidate = OK_ENVS.includes(environment) && hasFields && roleAllowed;

  return Object.freeze({
    phase: P21_SCAN,
    gate_id: descriptor.gate_id || 'scan-p21-unidentified',
    environment,
    status: gateCandidate ? P21_SCAN_STATUS.CANDIDATE : P21_SCAN_STATUS.BLOCKED,
    gate_candidate: gateCandidate,
    fields_present: hasFields,
    role_allowed: roleAllowed,
    live_blocked: NO_ENVS.includes(environment),
    gate_candidate_only: true,
    capture_only: true,
    approval_granted: false,
    run_allowed: false,
    run_attempted: false,
    completed: false,
    persisted: false,
    receipt_emitted: false,
    acknowledgement_emitted: false,
    write_attempted: false,
    mutation_attempted: false,
    descriptor,
  });
}

export function projectP21ScanGateResult(fixture) {
  const gate = buildP21ScanGate({ descriptor: fixture.descriptor });
  const checks = Object.freeze([
    check('environment', gate.environment === fixture.expected.environment),
    check('status', gate.status === fixture.expected.status),
    check('gate_candidate', gate.gate_candidate === fixture.expected.gate_candidate),
    check('fields_present', gate.fields_present === fixture.expected.fields_present),
    check('role_allowed', gate.role_allowed === fixture.expected.role_allowed),
    check('candidate_only', gate.gate_candidate_only === true),
    check('capture_only', gate.capture_only === true),
    check('not_approved', gate.approval_granted === false),
    check('not_run', gate.run_allowed === false && gate.run_attempted === false),
    check('no_effects', gate.completed === false && gate.persisted === false && gate.write_attempted === false && gate.mutation_attempted === false),
    check('no_response_output', gate.receipt_emitted === false && gate.acknowledgement_emitted === false),
  ]);

  return Object.freeze({ fixture_id: fixture.fixture_id, gate, passed: checks.every((item) => item.passed), checks });
}

export function getP21ScanGateResults(fixtures = P21_SCAN_FIXTURES) {
  return Object.freeze(fixtures.map(projectP21ScanGateResult));
}
