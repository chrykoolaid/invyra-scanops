import {
  SCANOPS_PHASE19,
  SCANOPS_PHASE19_COMPONENT,
  SCANOPS_PHASE19_FIXTURES,
  SCANOPS_PHASE19_REQUIRED_FIELDS,
  SCANOPS_PHASE19_STATUS,
} from './phase19Fixtures.js';

const CANDIDATE_ENVS = Object.freeze(['TRAINING', 'TEST']);
const BLOCKED_ENVS = Object.freeze(['LIVE', 'PRODUCTION']);

function normalizeEnvironment(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : 'UNKNOWN';
}

function requiredFieldsPresent(descriptor) {
  return SCANOPS_PHASE19_REQUIRED_FIELDS.every((field) => {
    const value = descriptor[field];
    return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
  });
}

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function buildScanOpsPhase19Gate(input = {}) {
  const descriptor = Object.freeze({ ...(input.descriptor || input) });
  const environment = normalizeEnvironment(descriptor.environment);
  const fieldsPresent = requiredFieldsPresent(descriptor);
  const readinessCandidate = CANDIDATE_ENVS.includes(environment) && fieldsPresent;

  return Object.freeze({
    component: SCANOPS_PHASE19_COMPONENT,
    phase: SCANOPS_PHASE19,
    gate_id: descriptor.gate_id || 'scanops-phase19-unidentified',
    environment,
    status: readinessCandidate ? SCANOPS_PHASE19_STATUS.CANDIDATE : SCANOPS_PHASE19_STATUS.BLOCKED,
    readiness_candidate: readinessCandidate,
    fields_present: fieldsPresent,
    live_blocked: BLOCKED_ENVS.includes(environment),
    readiness_gate_candidate_only: true,
    capture_only: true,
    live_enabled: false,
    activation_allowed: false,
    activation_attempted: false,
    sync_executed: false,
    dispatched: false,
    received: false,
    completed: false,
    persisted: false,
    receipt_emitted: false,
    acknowledgement_emitted: false,
    write_attempted: false,
    mutation_attempted: false,
    descriptor,
  });
}

export function projectScanOpsPhase19GateResult(fixture) {
  const gate = buildScanOpsPhase19Gate({ descriptor: fixture.descriptor });
  const checks = Object.freeze([
    check('environment', gate.environment === fixture.expected.environment),
    check('status', gate.status === fixture.expected.status),
    check('readiness_candidate', gate.readiness_candidate === fixture.expected.readiness_candidate),
    check('fields_present', gate.fields_present === fixture.expected.fields_present),
    check('live_blocked', gate.live_blocked === fixture.expected.live_blocked),
    check('candidate_only', gate.readiness_gate_candidate_only === true),
    check('capture_only', gate.capture_only === true),
    check('live_not_enabled', gate.live_enabled === false && gate.activation_allowed === false && gate.activation_attempted === false),
    check('no_execution_or_dispatch', gate.sync_executed === false && gate.dispatched === false && gate.received === false),
    check('no_effects', gate.completed === false && gate.persisted === false && gate.write_attempted === false && gate.mutation_attempted === false),
    check('no_receipts_or_acknowledgements', gate.receipt_emitted === false && gate.acknowledgement_emitted === false),
  ]);

  return Object.freeze({ fixture_id: fixture.fixture_id, gate, passed: checks.every((item) => item.passed), checks });
}

export function getScanOpsPhase19GateResults(fixtures = SCANOPS_PHASE19_FIXTURES) {
  return Object.freeze(fixtures.map(projectScanOpsPhase19GateResult));
}
