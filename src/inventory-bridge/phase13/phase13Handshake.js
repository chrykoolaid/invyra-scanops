import {
  SCANOPS_PHASE13,
  SCANOPS_PHASE13_COMPONENT,
  SCANOPS_PHASE13_FIXTURES,
  SCANOPS_PHASE13_REQUIRED_FIELDS,
  SCANOPS_PHASE13_STATUS,
} from './phase13Fixtures.js';

const CANDIDATE_ENVS = Object.freeze(['TRAINING', 'TEST']);
const LIVE_ENVS = Object.freeze(['LIVE', 'PRODUCTION']);

function normalizeEnvironment(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : 'UNKNOWN';
}

function requiredFieldsPresent(descriptor) {
  return SCANOPS_PHASE13_REQUIRED_FIELDS.every((field) => {
    const value = descriptor[field];
    return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
  });
}

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function buildScanOpsPhase13Handshake(input = {}) {
  const descriptor = Object.freeze({ ...(input.descriptor || input) });
  const environment = normalizeEnvironment(descriptor.environment);
  const fieldsPresent = requiredFieldsPresent(descriptor);
  const handshakeCandidate = CANDIDATE_ENVS.includes(environment) && fieldsPresent;

  return Object.freeze({
    component: SCANOPS_PHASE13_COMPONENT,
    phase: SCANOPS_PHASE13,
    handshake_id: descriptor.handshake_id || 'scanops-phase13-unidentified',
    runner_id: descriptor.runner_id || 'scanops-phase12-unidentified',
    environment,
    status: handshakeCandidate ? SCANOPS_PHASE13_STATUS.CANDIDATE : SCANOPS_PHASE13_STATUS.BLOCKED,
    handshake_candidate: handshakeCandidate,
    fields_present: fieldsPresent,
    live_blocked: LIVE_ENVS.includes(environment),
    local_handshake_candidate_only: true,
    capture_only: true,
    local_attempted: false,
    inventory_call_attempted: false,
    dispatch_attempted: false,
    executed: false,
    completed: false,
    persisted: false,
    receipt_emitted: false,
    acknowledgement_emitted: false,
    write_attempted: false,
    mutation_attempted: false,
    descriptor,
  });
}

export function projectScanOpsPhase13HandshakeResult(fixture) {
  const handshake = buildScanOpsPhase13Handshake({ descriptor: fixture.descriptor });
  const checks = Object.freeze([
    check('environment', handshake.environment === fixture.expected.environment),
    check('status', handshake.status === fixture.expected.status),
    check('handshake_candidate', handshake.handshake_candidate === fixture.expected.handshake_candidate),
    check('fields_present', handshake.fields_present === fixture.expected.fields_present),
    check('live_blocked', handshake.live_blocked === fixture.expected.live_blocked),
    check('candidate_only', handshake.local_handshake_candidate_only === true),
    check('capture_only', handshake.capture_only === true),
    check('no_local_attempt', handshake.local_attempted === false),
    check('no_inventory_call_or_dispatch', handshake.inventory_call_attempted === false && handshake.dispatch_attempted === false),
    check('no_execution', handshake.executed === false),
    check('no_effects', handshake.completed === false && handshake.persisted === false && handshake.write_attempted === false && handshake.mutation_attempted === false),
    check('no_receipts_or_acknowledgements', handshake.receipt_emitted === false && handshake.acknowledgement_emitted === false),
  ]);

  return Object.freeze({
    fixture_id: fixture.fixture_id,
    handshake,
    passed: checks.every((item) => item.passed),
    checks,
  });
}

export function getScanOpsPhase13HandshakeResults(fixtures = SCANOPS_PHASE13_FIXTURES) {
  return Object.freeze(fixtures.map(projectScanOpsPhase13HandshakeResult));
}
