export const P28G_ROUNDTRIP_PHASE = '28G-SCANOPS-ROUNDTRIP-CLOSURE';

export const P28G_ROUNDTRIP_STATUS = Object.freeze({
  CLOSED: 'CANDIDATE_ROUNDTRIP_CLOSED',
  BLOCKED: 'CANDIDATE_ROUNDTRIP_BLOCKED',
});

export const P28G_ROUNDTRIP_ENVIRONMENTS = Object.freeze({
  TRAINING: 'TRAINING',
  TEST: 'TEST',
  LIVE: 'LIVE',
  PRODUCTION: 'PRODUCTION',
  UNKNOWN: 'UNKNOWN',
});

const SAFE_ENVIRONMENTS = Object.freeze([
  P28G_ROUNDTRIP_ENVIRONMENTS.TRAINING,
  P28G_ROUNDTRIP_ENVIRONMENTS.TEST,
]);

function normalizeEnvironment(environment) {
  return typeof environment === 'string'
    ? environment.trim().toUpperCase()
    : P28G_ROUNDTRIP_ENVIRONMENTS.UNKNOWN;
}

function canClose(environment) {
  return SAFE_ENVIRONMENTS.includes(environment);
}

function buildRoundtripSequence(environment, closed) {
  return Object.freeze({
    environment,
    scanops_queue_candidate: closed,
    inventory_inbox_candidate: closed,
    inventory_alignment_acceptance: closed,
    scanops_acknowledgement_preview: closed,
    inventory_acknowledgement_acceptance: closed,
    sequence_preview_only: true,
    sequence_closed_persisted: false,
    sequence_event_emitted: false,
    sequence_write_attempted: false,
    sequence_mutation_attempted: false,
  });
}

function buildClosureGate(environment, closed) {
  return Object.freeze({
    environment,
    candidate_roundtrip_closed: closed,
    closure_preview_only: true,
    transport_active: false,
    desktop_call_attempted: false,
    event_sent: false,
    receipt_persisted: false,
    acknowledgement_emitted: false,
    acknowledgement_persisted: false,
    write_attempted: false,
    mutation_attempted: false,
  });
}

export function buildScanOpsCandidateRoundtripClosure(environment = P28G_ROUNDTRIP_ENVIRONMENTS.TRAINING) {
  const normalizedEnvironment = normalizeEnvironment(environment);
  const closed = canClose(normalizedEnvironment);
  const roundtripSequence = buildRoundtripSequence(normalizedEnvironment, closed);
  const closureGate = buildClosureGate(normalizedEnvironment, closed);

  return Object.freeze({
    phase: P28G_ROUNDTRIP_PHASE,
    environment: normalizedEnvironment,
    status: closed ? P28G_ROUNDTRIP_STATUS.CLOSED : P28G_ROUNDTRIP_STATUS.BLOCKED,
    candidate_roundtrip_closed: closed,
    candidate_only: true,
    preview_only: true,
    roundtripSequence,
    closureGate,
    transport_active: false,
    listener_active: false,
    desktop_call_attempted: false,
    event_sent: false,
    inbound_persisted: false,
    receipt_emitted: false,
    receipt_persisted: false,
    acknowledgement_emitted: false,
    acknowledgement_persisted: false,
    inventory_write_allowed: false,
    stock_mutation_allowed: false,
    workflow_mutation_allowed: false,
    price_mutation_allowed: false,
    accounting_mutation_allowed: false,
    purchase_order_write_allowed: false,
    forecast_write_allowed: false,
    persisted: false,
    write_attempted: false,
    mutation_attempted: false,
  });
}
