export const P29C_PHASE = '29C-SCANOPS-TRANSPORT-DESIGN-READINESS';

export const P29C_STATUS = Object.freeze({
  READY: 'TRANSPORT_DESIGN_READY',
  BLOCKED: 'TRANSPORT_DESIGN_BLOCKED',
});

export const P29C_ENVIRONMENTS = Object.freeze({
  TRAINING: 'TRAINING',
  TEST: 'TEST',
  LIVE: 'LIVE',
  PRODUCTION: 'PRODUCTION',
  UNKNOWN: 'UNKNOWN',
});

const SAFE_ENVIRONMENTS = Object.freeze([
  P29C_ENVIRONMENTS.TRAINING,
  P29C_ENVIRONMENTS.TEST,
]);

function normalizeEnvironment(environment) {
  return typeof environment === 'string' ? environment.trim().toUpperCase() : P29C_ENVIRONMENTS.UNKNOWN;
}

function canDesign(environment) {
  return SAFE_ENVIRONMENTS.includes(environment);
}

export function buildScanOpsTransportDesignReadiness(environment = P29C_ENVIRONMENTS.TRAINING) {
  const normalizedEnvironment = normalizeEnvironment(environment);
  const ready = canDesign(normalizedEnvironment);

  return Object.freeze({
    phase: P29C_PHASE,
    environment: normalizedEnvironment,
    status: ready ? P29C_STATUS.READY : P29C_STATUS.BLOCKED,
    transport_design_ready: ready,
    scanops_phase_29a_boundary_required: true,
    inventory_phase_29b_boundary_required: true,
    review_only: true,
    design_only: true,
    candidate_only: true,
    preview_only: true,
    allowed_future_design_topics: Object.freeze([
      'local_ip_pairing_model',
      'handheld_to_desktop_network_shape',
      'test_training_transport_fixture_shape',
      'offline_retry_contract_shape',
      'device_identity_contract_shape',
    ]),
    disallowed_now: Object.freeze([
      'socket_open',
      'http_call',
      'desktop_call',
      'event_send',
      'queue_persistence',
      'receipt_emission',
      'inventory_write',
      'stock_mutation',
      'workflow_mutation',
    ]),
    transport_active: false,
    socket_opened: false,
    http_call_attempted: false,
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
