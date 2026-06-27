export const P29A_PHASE = '29A-SCANOPS-PREACTIVATION-BOUNDARY';

export const P29A_STATUS = Object.freeze({
  READY: 'PREACTIVATION_BOUNDARY_READY',
  BLOCKED: 'PREACTIVATION_BOUNDARY_BLOCKED',
});

export const P29A_ENVIRONMENTS = Object.freeze({
  TRAINING: 'TRAINING',
  TEST: 'TEST',
  LIVE: 'LIVE',
  PRODUCTION: 'PRODUCTION',
  UNKNOWN: 'UNKNOWN',
});

const SAFE_ENVIRONMENTS = Object.freeze([
  P29A_ENVIRONMENTS.TRAINING,
  P29A_ENVIRONMENTS.TEST,
]);

function normalizeEnvironment(environment) {
  return typeof environment === 'string' ? environment.trim().toUpperCase() : P29A_ENVIRONMENTS.UNKNOWN;
}

function canReview(environment) {
  return SAFE_ENVIRONMENTS.includes(environment);
}

export function buildScanOpsPreactivationBoundary(environment = P29A_ENVIRONMENTS.TRAINING) {
  const normalizedEnvironment = normalizeEnvironment(environment);
  const ready = canReview(normalizedEnvironment);

  return Object.freeze({
    phase: P29A_PHASE,
    environment: normalizedEnvironment,
    status: ready ? P29A_STATUS.READY : P29A_STATUS.BLOCKED,
    preactivation_boundary_ready: ready,
    phase_28_candidate_chain_closed_required: true,
    phase_28_candidate_chain_closed_assumed: ready,
    review_only: true,
    candidate_only: true,
    preview_only: true,
    transport_may_be_designed_later: true,
    transport_active: false,
    listener_active: false,
    desktop_call_attempted: false,
    event_sent: false,
    outbound_queue_persisted: false,
    inbound_persisted: false,
    receipt_emitted: false,
    receipt_persisted: false,
    acknowledgement_emitted: false,
    acknowledgement_persisted: false,
    inventory_write_allowed: false,
    scanops_write_allowed: false,
    stock_mutation_allowed: false,
    workflow_mutation_allowed: false,
    price_mutation_allowed: false,
    accounting_mutation_allowed: false,
    purchase_order_write_allowed: false,
    forecast_write_allowed: false,
    runtime_activation_allowed: false,
    persisted: false,
    write_attempted: false,
    mutation_attempted: false,
  });
}
