import {
  SCANOPS_PHASE16,
  SCANOPS_PHASE16_COMPONENT,
  SCANOPS_PHASE16_FIXTURES,
  SCANOPS_PHASE16_REQUIRED_FIELDS,
  SCANOPS_PHASE16_STATUS,
} from './phase16Fixtures.js';

const CANDIDATE_ENVS = Object.freeze(['TRAINING', 'TEST']);
const BLOCKED_ENVS = Object.freeze(['LIVE', 'PRODUCTION']);

function normalizeEnvironment(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : 'UNKNOWN';
}

function requiredFieldsPresent(descriptor) {
  return SCANOPS_PHASE16_REQUIRED_FIELDS.every((field) => {
    const value = descriptor[field];
    return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
  });
}

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function buildScanOpsPhase16Response(input = {}) {
  const descriptor = Object.freeze({ ...(input.descriptor || input) });
  const environment = normalizeEnvironment(descriptor.environment);
  const fieldsPresent = requiredFieldsPresent(descriptor);
  const responseCandidate = CANDIDATE_ENVS.includes(environment) && fieldsPresent;

  return Object.freeze({
    component: SCANOPS_PHASE16_COMPONENT,
    phase: SCANOPS_PHASE16,
    response_id: descriptor.response_id || 'scanops-phase16-unidentified',
    review_id: descriptor.review_id || 'scanops-phase15-unidentified',
    environment,
    status: responseCandidate ? SCANOPS_PHASE16_STATUS.CANDIDATE : SCANOPS_PHASE16_STATUS.BLOCKED,
    response_candidate: responseCandidate,
    fields_present: fieldsPresent,
    live_blocked: BLOCKED_ENVS.includes(environment),
    response_candidate_only: true,
    capture_only: true,
    received: false,
    emitted: false,
    sent: false,
    accepted: false,
    applied: false,
    completed: false,
    persisted: false,
    receipt_emitted: false,
    acknowledgement_emitted: false,
    write_attempted: false,
    mutation_attempted: false,
    descriptor,
  });
}

export function projectScanOpsPhase16ResponseResult(fixture) {
  const response = buildScanOpsPhase16Response({ descriptor: fixture.descriptor });
  const checks = Object.freeze([
    check('environment', response.environment === fixture.expected.environment),
    check('status', response.status === fixture.expected.status),
    check('response_candidate', response.response_candidate === fixture.expected.response_candidate),
    check('fields_present', response.fields_present === fixture.expected.fields_present),
    check('live_blocked', response.live_blocked === fixture.expected.live_blocked),
    check('candidate_only', response.response_candidate_only === true),
    check('capture_only', response.capture_only === true),
    check('no_receive_emit_send', response.received === false && response.emitted === false && response.sent === false),
    check('no_receipt_or_ack', response.receipt_emitted === false && response.acknowledgement_emitted === false),
    check('not_accepted_or_applied', response.accepted === false && response.applied === false),
    check('no_effects', response.completed === false && response.persisted === false && response.write_attempted === false && response.mutation_attempted === false),
  ]);

  return Object.freeze({ fixture_id: fixture.fixture_id, response, passed: checks.every((item) => item.passed), checks });
}

export function getScanOpsPhase16ResponseResults(fixtures = SCANOPS_PHASE16_FIXTURES) {
  return Object.freeze(fixtures.map(projectScanOpsPhase16ResponseResult));
}
