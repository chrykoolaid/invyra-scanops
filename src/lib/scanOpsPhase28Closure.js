export const P28I_PHASE = '28I-SCANOPS-PHASE28-CLOSURE';

export const P28I_STATUS = Object.freeze({
  CLOSED: 'PHASE28_CANDIDATE_CHAIN_CLOSED',
  BLOCKED: 'PHASE28_CANDIDATE_CHAIN_BLOCKED',
});

export const P28I_ENVIRONMENTS = Object.freeze({
  TRAINING: 'TRAINING',
  TEST: 'TEST',
  LIVE: 'LIVE',
  PRODUCTION: 'PRODUCTION',
  UNKNOWN: 'UNKNOWN',
});

const SAFE_ENVIRONMENTS = Object.freeze([
  P28I_ENVIRONMENTS.TRAINING,
  P28I_ENVIRONMENTS.TEST,
]);

function normalizeEnvironment(environment) {
  return typeof environment === 'string' ? environment.trim().toUpperCase() : P28I_ENVIRONMENTS.UNKNOWN;
}

function canClose(environment) {
  return SAFE_ENVIRONMENTS.includes(environment);
}

function buildClosedPhaseList(closed) {
  return Object.freeze({
    phase_28a_scanops_candidate: closed,
    phase_28b_inventory_inbox_candidate: closed,
    phase_28c_scanops_alignment: closed,
    phase_28d_inventory_acceptance: closed,
    phase_28e_scanops_acknowledgement: closed,
    phase_28f_inventory_ack_acceptance: closed,
    phase_28g_scanops_roundtrip_closure: closed,
    phase_28h_inventory_roundtrip_recognition: closed,
  });
}

export function buildScanOpsPhase28Closure(environment = P28I_ENVIRONMENTS.TRAINING) {
  const normalizedEnvironment = normalizeEnvironment(environment);
  const closed = canClose(normalizedEnvironment);

  return Object.freeze({
    phase: P28I_PHASE,
    environment: normalizedEnvironment,
    status: closed ? P28I_STATUS.CLOSED : P28I_STATUS.BLOCKED,
    phase_28_candidate_chain_closed: closed,
    candidate_only: true,
    preview_only: true,
    closedPhases: buildClosedPhaseList(closed),
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
