import {
  SCANOPS_PHASE18,
  SCANOPS_PHASE18_COMPONENT,
  SCANOPS_PHASE18_FIXTURES,
  SCANOPS_PHASE18_REQUIRED_FIELDS,
  SCANOPS_PHASE18_STATUS,
} from './phase18Fixtures.js';

const CANDIDATE_ENVS = Object.freeze(['TRAINING', 'TEST']);
const BLOCKED_ENVS = Object.freeze(['LIVE', 'PRODUCTION']);

function normalizeEnvironment(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : 'UNKNOWN';
}

function requiredFieldsPresent(descriptor) {
  return SCANOPS_PHASE18_REQUIRED_FIELDS.every((field) => {
    const value = descriptor[field];
    return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
  });
}

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function buildScanOpsPhase18Acceptance(input = {}) {
  const descriptor = Object.freeze({ ...(input.descriptor || input) });
  const environment = normalizeEnvironment(descriptor.environment);
  const fieldsPresent = requiredFieldsPresent(descriptor);
  const acceptanceCandidate = CANDIDATE_ENVS.includes(environment) && fieldsPresent;

  return Object.freeze({
    component: SCANOPS_PHASE18_COMPONENT,
    phase: SCANOPS_PHASE18,
    acceptance_id: descriptor.acceptance_id || 'scanops-phase18-unidentified',
    event_id: descriptor.event_id || 'scanops-phase14-unidentified',
    environment,
    status: acceptanceCandidate ? SCANOPS_PHASE18_STATUS.CANDIDATE : SCANOPS_PHASE18_STATUS.BLOCKED,
    acceptance_candidate: acceptanceCandidate,
    fields_present: fieldsPresent,
    live_blocked: BLOCKED_ENVS.includes(environment),
    acceptance_candidate_only: true,
    capture_only: true,
    accepted: false,
    activated: false,
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

export function projectScanOpsPhase18AcceptanceResult(fixture) {
  const acceptance = buildScanOpsPhase18Acceptance({ descriptor: fixture.descriptor });
  const checks = Object.freeze([
    check('environment', acceptance.environment === fixture.expected.environment),
    check('status', acceptance.status === fixture.expected.status),
    check('acceptance_candidate', acceptance.acceptance_candidate === fixture.expected.acceptance_candidate),
    check('fields_present', acceptance.fields_present === fixture.expected.fields_present),
    check('live_blocked', acceptance.live_blocked === fixture.expected.live_blocked),
    check('candidate_only', acceptance.acceptance_candidate_only === true),
    check('capture_only', acceptance.capture_only === true),
    check('not_accepted_or_activated', acceptance.accepted === false && acceptance.activated === false),
    check('no_execution_or_dispatch', acceptance.sync_executed === false && acceptance.dispatched === false && acceptance.received === false),
    check('no_effects', acceptance.completed === false && acceptance.persisted === false && acceptance.write_attempted === false && acceptance.mutation_attempted === false),
    check('no_receipts_or_acknowledgements', acceptance.receipt_emitted === false && acceptance.acknowledgement_emitted === false),
  ]);

  return Object.freeze({ fixture_id: fixture.fixture_id, acceptance, passed: checks.every((item) => item.passed), checks });
}

export function getScanOpsPhase18AcceptanceResults(fixtures = SCANOPS_PHASE18_FIXTURES) {
  return Object.freeze(fixtures.map(projectScanOpsPhase18AcceptanceResult));
}
