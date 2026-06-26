import { P20_SCANOPS, P20_SCANOPS_FIELDS, P20_SCANOPS_FIXTURES, P20_SCANOPS_STATUS } from './p20Fixtures.js';

const OK_ENVS = Object.freeze(['TRAINING', 'TEST']);
const NO_ENVS = Object.freeze(['LIVE', 'PRODUCTION']);

function normalizeEnvironment(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : 'UNKNOWN';
}

function fieldsPresent(descriptor) {
  return P20_SCANOPS_FIELDS.every((field) => {
    const value = descriptor[field];
    return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
  });
}

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function buildP20ScanOpsPlan(input = {}) {
  const descriptor = Object.freeze({ ...(input.descriptor || input) });
  const environment = normalizeEnvironment(descriptor.environment);
  const hasFields = fieldsPresent(descriptor);
  const planCandidate = OK_ENVS.includes(environment) && hasFields;

  return Object.freeze({
    phase: P20_SCANOPS,
    plan_id: descriptor.plan_id || 'scanops-p20-unidentified',
    environment,
    status: planCandidate ? P20_SCANOPS_STATUS.CANDIDATE : P20_SCANOPS_STATUS.BLOCKED,
    plan_candidate: planCandidate,
    fields_present: hasFields,
    live_blocked: NO_ENVS.includes(environment),
    plan_candidate_only: true,
    capture_only: true,
    live_enabled: false,
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

export function projectP20ScanOpsPlanResult(fixture) {
  const plan = buildP20ScanOpsPlan({ descriptor: fixture.descriptor });
  const checks = Object.freeze([
    check('environment', plan.environment === fixture.expected.environment),
    check('status', plan.status === fixture.expected.status),
    check('plan_candidate', plan.plan_candidate === fixture.expected.plan_candidate),
    check('fields_present', plan.fields_present === fixture.expected.fields_present),
    check('candidate_only', plan.plan_candidate_only === true),
    check('capture_only', plan.capture_only === true),
    check('not_live', plan.live_enabled === false),
    check('not_approved', plan.approval_granted === false),
    check('not_run', plan.run_allowed === false && plan.run_attempted === false),
    check('no_effects', plan.completed === false && plan.persisted === false && plan.write_attempted === false && plan.mutation_attempted === false),
    check('no_response_output', plan.receipt_emitted === false && plan.acknowledgement_emitted === false),
  ]);

  return Object.freeze({ fixture_id: fixture.fixture_id, plan, passed: checks.every((item) => item.passed), checks });
}

export function getP20ScanOpsPlanResults(fixtures = P20_SCANOPS_FIXTURES) {
  return Object.freeze(fixtures.map(projectP20ScanOpsPlanResult));
}
