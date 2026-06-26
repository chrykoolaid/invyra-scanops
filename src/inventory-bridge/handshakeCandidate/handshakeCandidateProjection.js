import {
  SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS,
  SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_COMPONENT,
  SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_FIXTURES,
  SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_PHASE,
  SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_STATUSES,
} from './handshakeCandidateFixtures.js';

const READY_ENVIRONMENTS = Object.freeze(['TRAINING', 'TEST']);
const BLOCKED_LIVE_ENVIRONMENTS = Object.freeze(['LIVE', 'PRODUCTION']);

function normalizeEnvironment(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : 'UNKNOWN';
}

function freezeArray(values) {
  return Object.freeze([...(values || [])]);
}

function uniqueReasons(reasons) {
  return freezeArray([...new Set(reasons.filter(Boolean))]);
}

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

function environmentBlockers(environment) {
  if (environment === 'LIVE') return [SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.LIVE_BLOCKED];
  if (environment === 'PRODUCTION') return [SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.PRODUCTION_BLOCKED];
  if (!READY_ENVIRONMENTS.includes(environment)) return [SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.UNKNOWN_ENVIRONMENT];
  return [];
}

export function buildScanOpsBridgeHandshakeCandidate(input = {}) {
  const descriptor = Object.freeze({ ...(input.candidate_descriptor || input.candidateDescriptor || input) });
  const environment = normalizeEnvironment(descriptor.environment);
  const candidateReady = READY_ENVIRONMENTS.includes(environment);
  const liveBlocked = BLOCKED_LIVE_ENVIRONMENTS.includes(environment);

  const blockedReasons = uniqueReasons([
    ...environmentBlockers(environment),
    SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.DISPATCH_BLOCKED,
    SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.INVENTORY_CALL_BLOCKED,
    SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.PERSIST_BLOCKED,
    SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.WRITE_BLOCKED,
    SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_BLOCKERS.MUTATION_BLOCKED,
  ]);

  return Object.freeze({
    component: SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_COMPONENT,
    phase: SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_PHASE,
    candidate_id: descriptor.candidate_id || 'scanops-handshake-candidate-unidentified',
    environment,
    source_system: descriptor.source_system || 'SCANOPS',
    target_system: descriptor.target_system || 'INVENTORY',
    candidate_status: candidateReady
      ? SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_STATUSES.CANDIDATE_READY
      : SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_STATUSES.BLOCKED,
    status_mode: SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_STATUSES.READ_ONLY,
    evidence_only: true,
    capture_only: true,
    live_blocked: liveBlocked,
    can_generate_candidate: candidateReady,
    can_dispatch: false,
    can_call_inventory: false,
    can_persist: false,
    can_write: false,
    can_mutate: false,
    dispatched: false,
    inventory_called: false,
    persisted: false,
    receipt_emitted: false,
    acknowledgement_emitted: false,
    write_attempted: false,
    mutation_attempted: false,
    blocked_reasons: blockedReasons,
    candidate_descriptor: descriptor,
  });
}

export function projectScanOpsBridgeHandshakeCandidateResult(fixture) {
  const candidate = buildScanOpsBridgeHandshakeCandidate({
    candidate_descriptor: fixture.candidate_descriptor,
  });

  const checks = Object.freeze([
    check('environment', candidate.environment === fixture.expected.environment),
    check('status', candidate.candidate_status === fixture.expected.candidate_status),
    check('live_blocked', candidate.live_blocked === fixture.expected.live_blocked),
    check('candidate_generation', candidate.can_generate_candidate === fixture.expected.can_generate_candidate),
    check('evidence_only', candidate.evidence_only === true),
    check('capture_only', candidate.capture_only === true),
    check('blocked_reasons', fixture.expected.blocked_reasons.every((reason) => candidate.blocked_reasons.includes(reason))),
    check('not_dispatched', candidate.can_dispatch === false && candidate.dispatched === false),
    check('no_inventory_call', candidate.can_call_inventory === false && candidate.inventory_called === false),
    check('not_persisted', candidate.can_persist === false && candidate.persisted === false),
    check('no_receipt', candidate.receipt_emitted === false),
    check('no_acknowledgement', candidate.acknowledgement_emitted === false),
    check('no_write', candidate.can_write === false && candidate.write_attempted === false),
    check('no_mutation', candidate.can_mutate === false && candidate.mutation_attempted === false),
  ]);

  return Object.freeze({
    fixture_id: fixture.fixture_id,
    description: fixture.description,
    expected: fixture.expected,
    candidate,
    passed: checks.every((item) => item.passed),
    checks,
  });
}

export function getScanOpsBridgeHandshakeCandidateResults(fixtures = SCANOPS_BRIDGE_HANDSHAKE_CANDIDATE_FIXTURES) {
  return Object.freeze(fixtures.map(projectScanOpsBridgeHandshakeCandidateResult));
}
