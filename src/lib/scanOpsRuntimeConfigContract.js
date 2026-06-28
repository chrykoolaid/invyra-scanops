export const P30C_PHASE = '30C-SCANOPS-RUNTIME-CONFIG-CONTRACT';

export const P30C_STATUS = Object.freeze({
  READY: 'RUNTIME_CONFIG_CONTRACT_READY',
  BLOCKED: 'RUNTIME_CONFIG_CONTRACT_BLOCKED',
});

export const P30C_ENVIRONMENTS = Object.freeze({
  TRAINING: 'TRAINING',
  TEST: 'TEST',
  LIVE: 'LIVE',
  PRODUCTION: 'PRODUCTION',
  UNKNOWN: 'UNKNOWN',
});

const SAFE_ENVIRONMENTS = Object.freeze([
  P30C_ENVIRONMENTS.TRAINING,
  P30C_ENVIRONMENTS.TEST,
]);

function normalizeEnvironment(environment) {
  return typeof environment === 'string' ? environment.trim().toUpperCase() : P30C_ENVIRONMENTS.UNKNOWN;
}

function canExposeContract(environment) {
  return SAFE_ENVIRONMENTS.includes(environment);
}

export function buildScanOpsRuntimeConfigContract(environment = P30C_ENVIRONMENTS.TRAINING) {
  const normalizedEnvironment = normalizeEnvironment(environment);
  const ready = canExposeContract(normalizedEnvironment);

  return Object.freeze({
    phase: P30C_PHASE,
    environment: normalizedEnvironment,
    status: ready ? P30C_STATUS.READY : P30C_STATUS.BLOCKED,
    config_contract_ready: ready,
    inactive_contract_only: true,
    hard_disabled: true,
    review_only: true,
    config_only: true,
    candidate_only: true,
    preview_only: true,
    dependencies_required: Object.freeze({
      scanops_30a_runtime_scaffold: true,
      inventory_30b_runtime_scaffold: true,
    }),
    config_shape: Object.freeze({
      environment_required: true,
      device_id_required: true,
      session_id_required: true,
      inventory_endpoint_candidate_allowed: true,
      pairing_token_candidate_allowed: true,
      offline_queue_policy_candidate_allowed: true,
      retry_policy_candidate_allowed: true,
    }),
    disabled_config_operations: Object.freeze({
      save_config: false,
      load_persisted_config: false,
      pair_device: false,
      validate_endpoint_live: false,
      open_transport: false,
      start_runtime: false,
    }),
    config_persisted: false,
    config_loaded_from_storage: false,
    pairing_token_generated: false,
    endpoint_validated: false,
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
