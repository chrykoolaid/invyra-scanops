import {
  SCANOPS_PHASE10,
  SCANOPS_PHASE10_COMPONENT,
  SCANOPS_PHASE10_FIXTURES,
  SCANOPS_PHASE10_REQUIRED_FIELDS,
  SCANOPS_PHASE10_STATUS,
} from './phase10Fixtures.js';

const READY_ENVS = Object.freeze(['TRAINING', 'TEST']);
const LIVE_ENVS = Object.freeze(['LIVE', 'PRODUCTION']);

function normalizeEnvironment(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : 'UNKNOWN';
}

function requiredFieldsPresent(descriptor) {
  return SCANOPS_PHASE10_REQUIRED_FIELDS.every((field) => {
    const value = descriptor[field];
    return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
  });
}

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function buildScanOpsPhase10Review(input = {}) {
  const descriptor = Object.freeze({ ...(input.descriptor || input) });
  const environment = normalizeEnvironment(descriptor.environment);
  const fieldsPresent = requiredFieldsPresent(descriptor);
  const ready = READY_ENVS.includes(environment) && fieldsPresent;

  return Object.freeze({
    component: SCANOPS_PHASE10_COMPONENT,
    phase: SCANOPS_PHASE10,
    review_id: descriptor.review_id || 'scanops-phase10-unidentified',
    environment,
    status: ready ? SCANOPS_PHASE10_STATUS.READY : SCANOPS_PHASE10_STATUS.BLOCKED,
    ready,
    fields_present: fieldsPresent,
    live_blocked: LIVE_ENVS.includes(environment),
    review_only: true,
    capture_only: true,
    dispatched: false,
    inventory_called: false,
    completed: false,
    persisted: false,
    receipt_emitted: false,
    acknowledgement_emitted: false,
    write_attempted: false,
    mutation_attempted: false,
    descriptor,
  });
}

export function projectScanOpsPhase10ReviewResult(fixture) {
  const review = buildScanOpsPhase10Review({ descriptor: fixture.descriptor });
  const checks = Object.freeze([
    check('environment', review.environment === fixture.expected.environment),
    check('status', review.status === fixture.expected.status),
    check('ready', review.ready === fixture.expected.ready),
    check('fields_present', review.fields_present === fixture.expected.fields_present),
    check('live_blocked', review.live_blocked === fixture.expected.live_blocked),
    check('review_only', review.review_only === true),
    check('capture_only', review.capture_only === true),
    check('no_effects', review.dispatched === false && review.inventory_called === false && review.completed === false && review.persisted === false && review.write_attempted === false && review.mutation_attempted === false),
  ]);

  return Object.freeze({
    fixture_id: fixture.fixture_id,
    review,
    passed: checks.every((item) => item.passed),
    checks,
  });
}

export function getScanOpsPhase10ReviewResults(fixtures = SCANOPS_PHASE10_FIXTURES) {
  return Object.freeze(fixtures.map(projectScanOpsPhase10ReviewResult));
}
