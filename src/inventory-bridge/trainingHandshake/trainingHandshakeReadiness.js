import {
  SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS,
  SCANOPS_BRIDGE_TRAINING_HANDSHAKE_COMPONENT,
  SCANOPS_BRIDGE_TRAINING_HANDSHAKE_FIXTURES,
  SCANOPS_BRIDGE_TRAINING_HANDSHAKE_PHASE,
  SCANOPS_BRIDGE_TRAINING_HANDSHAKE_STATUSES,
} from './trainingHandshakeFixtures.js';

const TRAINING_ENVIRONMENTS = Object.freeze(['TRAINING', 'TEST']);
const LIVE_ENVIRONMENTS = Object.freeze(['LIVE', 'PRODUCTION']);

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
  if (environment === 'LIVE') return [SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.LIVE_BLOCKED];
  if (environment === 'PRODUCTION') return [SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.PRODUCTION_BLOCKED];
  if (!TRAINING_ENVIRONMENTS.includes(environment)) return [SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.UNKNOWN_ENVIRONMENT];
  return [];
}

export function buildScanOpsBridgeTrainingHandshakeReadiness(input = {}) {
  const descriptor = Object.freeze({ ...(input.handshake_descriptor || input.handshakeDescriptor || input) });
  const environment = normalizeEnvironment(descriptor.environment);
  const preparationAllowed = TRAINING_ENVIRONMENTS.includes(environment);
  const liveBlocked = LIVE_ENVIRONMENTS.includes(environment);

  const blockedReasons = uniqueReasons([
    ...environmentBlockers(environment),
    SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.PRODUCTION_ACTIVATION_BLOCKED,
    SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.DISPATCH_BLOCKED,
    SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.INVENTORY_CALL_BLOCKED,
    SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.OUTBOX_BLOCKED,
    SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.RECEIPT_BLOCKED,
    SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.ACKNOWLEDGEMENT_BLOCKED,
    SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.WRITE_BLOCKED,
    SCANOPS_BRIDGE_TRAINING_HANDSHAKE_BLOCKERS.MUTATION_BLOCKED,
  ]);

  return Object.freeze({
    component: SCANOPS_BRIDGE_TRAINING_HANDSHAKE_COMPONENT,
    phase: SCANOPS_BRIDGE_TRAINING_HANDSHAKE_PHASE,
    handshake_id: descriptor.handshake_id || 'scanops-handshake-preparation-unidentified',
    handshake_mode: descriptor.handshake_mode || 'TEST_TRAINING_PREPARATION_ONLY',
    environment,
    source_system: descriptor.source_system || 'SCANOPS',
    target_system: descriptor.target_system || 'INVENTORY',
    source_device_id: descriptor.source_device_id || null,
    source_store_id: descriptor.source_store_id || null,
    requested_capability: descriptor.requested_capability || 'HANDSHAKE_READINESS_ONLY',
    handshake_preparation_status: preparationAllowed
      ? SCANOPS_BRIDGE_TRAINING_HANDSHAKE_STATUSES.PREPARATION_ALLOWED
      : SCANOPS_BRIDGE_TRAINING_HANDSHAKE_STATUSES.BLOCKED,
    diagnostics_status: SCANOPS_BRIDGE_TRAINING_HANDSHAKE_STATUSES.READ_ONLY,
    capture_only: true,
    non_production_only: true,
    live_blocked: liveBlocked,
    can_prepare_handshake: preparationAllowed,
    can_dispatch: false,
    can_call_inventory: false,
    can_process_outbox: false,
    can_replay: false,
    can_emit_receipt: false,
    can_emit_acknowledgement: false,
    can_write: false,
    can_mutate: false,
    dispatch_attempted: false,
    inventory_call_attempted: false,
    outbox_processing_attempted: false,
    replay_attempted: false,
    receipt_emitted: false,
    acknowledgement_emitted: false,
    write_attempted: false,
    mutation_attempted: false,
    blocked_reasons: blockedReasons,
    handshake_descriptor: descriptor,
  });
}

export function projectScanOpsBridgeTrainingHandshakeReadinessResult(fixture) {
  const readiness = buildScanOpsBridgeTrainingHandshakeReadiness({
    handshake_descriptor: fixture.handshake_descriptor,
  });

  const checks = Object.freeze([
    check('environment', readiness.environment === fixture.expected.environment),
    check('status', readiness.handshake_preparation_status === fixture.expected.handshake_preparation_status),
    check('live_blocked', readiness.live_blocked === fixture.expected.live_blocked),
    check('can_prepare_handshake', readiness.can_prepare_handshake === fixture.expected.can_prepare_handshake),
    check('capture_only', readiness.capture_only === true),
    check('non_production_only', readiness.non_production_only === true),
    check('blocked_reasons', fixture.expected.blocked_reasons.every((reason) => readiness.blocked_reasons.includes(reason))),
    check('no_dispatch', readiness.can_dispatch === false && readiness.dispatch_attempted === false),
    check('no_inventory_call', readiness.can_call_inventory === false && readiness.inventory_call_attempted === false),
    check('no_outbox_processing', readiness.can_process_outbox === false && readiness.outbox_processing_attempted === false),
    check('no_replay', readiness.can_replay === false && readiness.replay_attempted === false),
    check('no_receipt', readiness.can_emit_receipt === false && readiness.receipt_emitted === false),
    check('no_acknowledgement', readiness.can_emit_acknowledgement === false && readiness.acknowledgement_emitted === false),
    check('no_write', readiness.can_write === false && readiness.write_attempted === false),
    check('no_mutation', readiness.can_mutate === false && readiness.mutation_attempted === false),
  ]);

  return Object.freeze({
    fixture_id: fixture.fixture_id,
    description: fixture.description,
    expected: fixture.expected,
    readiness,
    passed: checks.every((item) => item.passed),
    checks,
  });
}

export function getScanOpsBridgeTrainingHandshakeReadinessResults(fixtures = SCANOPS_BRIDGE_TRAINING_HANDSHAKE_FIXTURES) {
  return Object.freeze(fixtures.map(projectScanOpsBridgeTrainingHandshakeReadinessResult));
}
