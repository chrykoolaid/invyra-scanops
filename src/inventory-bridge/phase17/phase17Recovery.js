import {
  SCANOPS_PHASE17,
  SCANOPS_PHASE17_COMPONENT,
  SCANOPS_PHASE17_FIXTURES,
  SCANOPS_PHASE17_REQUIRED_FIELDS,
  SCANOPS_PHASE17_STATUS,
} from './phase17Fixtures.js';

const CANDIDATE_ENVS = Object.freeze(['TRAINING', 'TEST']);
const BLOCKED_ENVS = Object.freeze(['LIVE', 'PRODUCTION']);

function normalizeEnvironment(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : 'UNKNOWN';
}

function requiredFieldsPresent(descriptor) {
  return SCANOPS_PHASE17_REQUIRED_FIELDS.every((field) => {
    const value = descriptor[field];
    return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
  });
}

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function buildScanOpsPhase17Recovery(input = {}) {
  const descriptor = Object.freeze({ ...(input.descriptor || input) });
  const environment = normalizeEnvironment(descriptor.environment);
  const fieldsPresent = requiredFieldsPresent(descriptor);
  const recoveryCandidate = CANDIDATE_ENVS.includes(environment) && fieldsPresent;

  return Object.freeze({
    component: SCANOPS_PHASE17_COMPONENT,
    phase: SCANOPS_PHASE17,
    recovery_id: descriptor.recovery_id || 'scanops-phase17-unidentified',
    event_id: descriptor.event_id || 'scanops-phase14-unidentified',
    environment,
    status: recoveryCandidate ? SCANOPS_PHASE17_STATUS.CANDIDATE : SCANOPS_PHASE17_STATUS.BLOCKED,
    recovery_candidate: recoveryCandidate,
    fields_present: fieldsPresent,
    live_blocked: BLOCKED_ENVS.includes(environment),
    recovery_candidate_only: true,
    capture_only: true,
    replay_attempted: false,
    retry_attempted: false,
    dispatched: false,
    emitted: false,
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

export function projectScanOpsPhase17RecoveryResult(fixture) {
  const recovery = buildScanOpsPhase17Recovery({ descriptor: fixture.descriptor });
  const checks = Object.freeze([
    check('environment', recovery.environment === fixture.expected.environment),
    check('status', recovery.status === fixture.expected.status),
    check('recovery_candidate', recovery.recovery_candidate === fixture.expected.recovery_candidate),
    check('fields_present', recovery.fields_present === fixture.expected.fields_present),
    check('live_blocked', recovery.live_blocked === fixture.expected.live_blocked),
    check('candidate_only', recovery.recovery_candidate_only === true),
    check('capture_only', recovery.capture_only === true),
    check('no_replay_or_retry', recovery.replay_attempted === false && recovery.retry_attempted === false),
    check('no_dispatch_emit_receive', recovery.dispatched === false && recovery.emitted === false && recovery.received === false),
    check('no_effects', recovery.completed === false && recovery.persisted === false && recovery.write_attempted === false && recovery.mutation_attempted === false),
    check('no_receipts_or_acknowledgements', recovery.receipt_emitted === false && recovery.acknowledgement_emitted === false),
  ]);

  return Object.freeze({ fixture_id: fixture.fixture_id, recovery, passed: checks.every((item) => item.passed), checks });
}

export function getScanOpsPhase17RecoveryResults(fixtures = SCANOPS_PHASE17_FIXTURES) {
  return Object.freeze(fixtures.map(projectScanOpsPhase17RecoveryResult));
}
