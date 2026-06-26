import {
  SCANOPS_PHASE15,
  SCANOPS_PHASE15_COMPONENT,
  SCANOPS_PHASE15_FIXTURES,
  SCANOPS_PHASE15_REQUIRED_FIELDS,
  SCANOPS_PHASE15_STATUS,
} from './phase15Fixtures.js';

const CANDIDATE_ENVS = Object.freeze(['TRAINING', 'TEST']);
const BLOCKED_ENVS = Object.freeze(['LIVE', 'PRODUCTION']);

function normalizeEnvironment(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : 'UNKNOWN';
}

function requiredFieldsPresent(descriptor) {
  return SCANOPS_PHASE15_REQUIRED_FIELDS.every((field) => {
    const value = descriptor[field];
    return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
  });
}

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function buildScanOpsPhase15Review(input = {}) {
  const descriptor = Object.freeze({ ...(input.descriptor || input) });
  const environment = normalizeEnvironment(descriptor.environment);
  const fieldsPresent = requiredFieldsPresent(descriptor);
  const reviewCandidate = CANDIDATE_ENVS.includes(environment) && fieldsPresent;

  return Object.freeze({
    component: SCANOPS_PHASE15_COMPONENT,
    phase: SCANOPS_PHASE15,
    review_id: descriptor.review_id || 'scanops-phase15-unidentified',
    event_id: descriptor.event_id || 'scanops-phase14-unidentified',
    environment,
    status: reviewCandidate ? SCANOPS_PHASE15_STATUS.CANDIDATE : SCANOPS_PHASE15_STATUS.BLOCKED,
    review_candidate: reviewCandidate,
    fields_present: fieldsPresent,
    live_blocked: BLOCKED_ENVS.includes(environment),
    source_review_candidate_only: true,
    capture_only: true,
    sent: false,
    inventory_called: false,
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

export function projectScanOpsPhase15ReviewResult(fixture) {
  const review = buildScanOpsPhase15Review({ descriptor: fixture.descriptor });
  const checks = Object.freeze([
    check('environment', review.environment === fixture.expected.environment),
    check('status', review.status === fixture.expected.status),
    check('review_candidate', review.review_candidate === fixture.expected.review_candidate),
    check('fields_present', review.fields_present === fixture.expected.fields_present),
    check('live_blocked', review.live_blocked === fixture.expected.live_blocked),
    check('candidate_only', review.source_review_candidate_only === true),
    check('capture_only', review.capture_only === true),
    check('not_sent_or_called', review.sent === false && review.inventory_called === false),
    check('not_accepted_or_applied', review.accepted === false && review.applied === false),
    check('no_effects', review.completed === false && review.persisted === false && review.write_attempted === false && review.mutation_attempted === false),
    check('no_receipts_or_acknowledgements', review.receipt_emitted === false && review.acknowledgement_emitted === false),
  ]);

  return Object.freeze({
    fixture_id: fixture.fixture_id,
    review,
    passed: checks.every((item) => item.passed),
    checks,
  });
}

export function getScanOpsPhase15ReviewResults(fixtures = SCANOPS_PHASE15_FIXTURES) {
  return Object.freeze(fixtures.map(projectScanOpsPhase15ReviewResult));
}
