export const P30E_PHASE = '30E-SCANOPS-DEVICE-SESSION-CONTRACT';

export const P30E_STATUS = Object.freeze({
  READY: 'DEVICE_SESSION_CONTRACT_READY',
  BLOCKED: 'DEVICE_SESSION_CONTRACT_BLOCKED',
});

export const P30E_ENVIRONMENTS = Object.freeze({
  TRAINING: 'TRAINING',
  TEST: 'TEST',
  LIVE: 'LIVE',
  PRODUCTION: 'PRODUCTION',
  UNKNOWN: 'UNKNOWN',
});

const SAFE_ENVIRONMENTS = Object.freeze([
  P30E_ENVIRONMENTS.TRAINING,
  P30E_ENVIRONMENTS.TEST,
]);

function normalizeEnvironment(environment) {
  return typeof environment === 'string' ? environment.trim().toUpperCase() : P30E_ENVIRONMENTS.UNKNOWN;
}

function canExposeContract(environment) {
  return SAFE_ENVIRONMENTS.includes(environment);
}

export function buildScanOpsDeviceSessionContract(environment = P30E_ENVIRONMENTS.TRAINING) {
  const normalizedEnvironment = normalizeEnvironment(environment);
  const ready = canExposeContract(normalizedEnvironment);

  return Object.freeze({
    phase: P30E_PHASE,
    environment: normalizedEnvironment,
    status: ready ? P30E_STATUS.READY : P30E_STATUS.BLOCKED,
    device_session_contract_ready: ready,
    inactive_contract_only: true,
    hard_disabled: true,
    review_only: true,
    device_session_only: true,
    candidate_only: true,
    preview_only: true,
    dependencies_required: Object.freeze({
      scanops_30a_runtime_scaffold: true,
      scanops_30c_runtime_config_contract: true,
      inventory_30d_runtime_config_contract: true,
    }),
    device_identity_shape: Object.freeze({
      device_id_required: true,
      device_label_required: true,
      device_role_candidate: 'HANDHELD_SCANNER',
      environment_required: true,
      operator_context_required: true,
      registered: false,
      persisted: false,
    }),
    session_shape: Object.freeze({
      session_id_required: true,
      device_id_reference_required: true,
      operator_context_required: true,
      started_at_candidate_allowed: true,
      ended_at_candidate_allowed: true,
      active: false,
      persisted: false,
    }),
    disabled_device_session_operations: Object.freeze({
      register_device: false,
      persist_device: false,
      start_session: false,
      persist_session: false,
      pair_device: false,
      open_transport: false,
      send_event: false,
    }),
    device_registered: false,
    device_persisted: false,
    session_started: false,
    session_persisted: false,
    pairing_active: false,
    transport_active: false,
    listener_active: false,
    network_call_attempted: false,
    desktop_call_attempted: false,
    event_sent: false,
    outbound_queue_persisted: false,
    receipt_emitted: false,
    receipt_persisted: false,
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
