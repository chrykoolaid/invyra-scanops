import { P22_SCAN, P22_SCAN_FIELDS, P22_SCAN_FIXTURES, P22_SCAN_STATUS } from './p22Fixtures.js';

const OK_ENVS = Object.freeze(['TRAINING', 'TEST']);
const NO_ENVS = Object.freeze(['LIVE', 'PRODUCTION']);

function normalizeEnvironment(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : 'UNKNOWN';
}

function fieldsPresent(descriptor) {
  return P22_SCAN_FIELDS.every((field) => {
    const value = descriptor[field];
    return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
  });
}

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function buildP22ScanLink(input = {}) {
  const descriptor = Object.freeze({ ...(input.descriptor || input) });
  const environment = normalizeEnvironment(descriptor.environment);
  const hasFields = fieldsPresent(descriptor);
  const readOnly = descriptor.visibility_mode === 'READ_ONLY';
  const linkCandidate = OK_ENVS.includes(environment) && hasFields && readOnly;

  return Object.freeze({
    phase: P22_SCAN,
    link_id: descriptor.link_id || 'scan-p22-unidentified',
    environment,
    status: linkCandidate ? P22_SCAN_STATUS.CANDIDATE : P22_SCAN_STATUS.BLOCKED,
    link_candidate: linkCandidate,
    fields_present: hasFields,
    read_only: readOnly,
    live_blocked: NO_ENVS.includes(environment),
    link_candidate_only: true,
    capture_only: true,
    pairing_established: false,
    connection_established: false,
    network_call_attempted: false,
    event_sent: false,
    event_received: false,
    ack_emitted: false,
    retry_attempted: false,
    duplicate_written: false,
    completed: false,
    persisted: false,
    write_attempted: false,
    mutation_attempted: false,
    descriptor,
  });
}

export function projectP22ScanLinkResult(fixture) {
  const link = buildP22ScanLink({ descriptor: fixture.descriptor });
  const checks = Object.freeze([
    check('environment', link.environment === fixture.expected.environment),
    check('status', link.status === fixture.expected.status),
    check('link_candidate', link.link_candidate === fixture.expected.link_candidate),
    check('fields_present', link.fields_present === fixture.expected.fields_present),
    check('candidate_only', link.link_candidate_only === true),
    check('read_only', link.read_only === true || link.link_candidate === false),
    check('capture_only', link.capture_only === true),
    check('not_connected', link.pairing_established === false && link.connection_established === false && link.network_call_attempted === false),
    check('no_events', link.event_sent === false && link.event_received === false && link.ack_emitted === false),
    check('no_retry_or_duplicate_write', link.retry_attempted === false && link.duplicate_written === false),
    check('no_effects', link.completed === false && link.persisted === false && link.write_attempted === false && link.mutation_attempted === false),
  ]);

  return Object.freeze({ fixture_id: fixture.fixture_id, link, passed: checks.every((item) => item.passed), checks });
}

export function getP22ScanLinkResults(fixtures = P22_SCAN_FIXTURES) {
  return Object.freeze(fixtures.map(projectP22ScanLinkResult));
}
