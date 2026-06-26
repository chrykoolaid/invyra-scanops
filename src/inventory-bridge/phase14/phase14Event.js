import {
  SCANOPS_PHASE14,
  SCANOPS_PHASE14_COMPONENT,
  SCANOPS_PHASE14_FIXTURES,
  SCANOPS_PHASE14_REQUIRED_FIELDS,
  SCANOPS_PHASE14_STATUS,
} from './phase14Fixtures.js';

const CANDIDATE_ENVS = Object.freeze(['TRAINING', 'TEST']);
const BLOCKED_ENVS = Object.freeze(['LIVE', 'PRODUCTION']);

function normalizeEnvironment(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : 'UNKNOWN';
}

function requiredFieldsPresent(descriptor) {
  return SCANOPS_PHASE14_REQUIRED_FIELDS.every((field) => {
    const value = descriptor[field];
    return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
  });
}

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function buildScanOpsPhase14Event(input = {}) {
  const descriptor = Object.freeze({ ...(input.descriptor || input) });
  const environment = normalizeEnvironment(descriptor.environment);
  const fieldsPresent = requiredFieldsPresent(descriptor);
  const eventCandidate = CANDIDATE_ENVS.includes(environment) && fieldsPresent;

  return Object.freeze({
    component: SCANOPS_PHASE14_COMPONENT,
    phase: SCANOPS_PHASE14,
    event_id: descriptor.event_id || 'scanops-phase14-unidentified',
    environment,
    status: eventCandidate ? SCANOPS_PHASE14_STATUS.CANDIDATE : SCANOPS_PHASE14_STATUS.BLOCKED,
    event_candidate: eventCandidate,
    fields_present: fieldsPresent,
    live_blocked: BLOCKED_ENVS.includes(environment),
    event_candidate_only: true,
    capture_only: true,
    output_attempted: false,
    inventory_call_attempted: false,
    processed: false,
    completed: false,
    persisted: false,
    receipt_emitted: false,
    acknowledgement_emitted: false,
    write_attempted: false,
    mutation_attempted: false,
    descriptor,
  });
}

export function projectScanOpsPhase14EventResult(fixture) {
  const event = buildScanOpsPhase14Event({ descriptor: fixture.descriptor });
  const checks = Object.freeze([
    check('environment', event.environment === fixture.expected.environment),
    check('status', event.status === fixture.expected.status),
    check('event_candidate', event.event_candidate === fixture.expected.event_candidate),
    check('fields_present', event.fields_present === fixture.expected.fields_present),
    check('live_blocked', event.live_blocked === fixture.expected.live_blocked),
    check('candidate_only', event.event_candidate_only === true),
    check('capture_only', event.capture_only === true),
    check('no_output', event.output_attempted === false && event.inventory_call_attempted === false),
    check('no_processing', event.processed === false),
    check('no_effects', event.completed === false && event.persisted === false && event.write_attempted === false && event.mutation_attempted === false),
    check('no_receipts_or_acknowledgements', event.receipt_emitted === false && event.acknowledgement_emitted === false),
  ]);

  return Object.freeze({
    fixture_id: fixture.fixture_id,
    event,
    passed: checks.every((item) => item.passed),
    checks,
  });
}

export function getScanOpsPhase14EventResults(fixtures = SCANOPS_PHASE14_FIXTURES) {
  return Object.freeze(fixtures.map(projectScanOpsPhase14EventResult));
}
