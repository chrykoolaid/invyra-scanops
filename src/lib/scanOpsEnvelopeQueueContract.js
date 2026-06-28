export const P30G_PHASE = '30G-SCANOPS-ENVELOPE-QUEUE-CONTRACT';

export const P30G_STATUS = Object.freeze({
  READY: 'ENVELOPE_QUEUE_CONTRACT_READY',
  BLOCKED: 'ENVELOPE_QUEUE_CONTRACT_BLOCKED',
});

export const P30G_ENVIRONMENTS = Object.freeze({
  TRAINING: 'TRAINING',
  TEST: 'TEST',
  LIVE: 'LIVE',
  PRODUCTION: 'PRODUCTION',
  UNKNOWN: 'UNKNOWN',
});

const SAFE_ENVIRONMENTS = Object.freeze([
  P30G_ENVIRONMENTS.TRAINING,
  P30G_ENVIRONMENTS.TEST,
]);

function normalizeEnvironment(environment) {
  return typeof environment === 'string' ? environment.trim().toUpperCase() : P30G_ENVIRONMENTS.UNKNOWN;
}

function canExposeContract(environment) {
  return SAFE_ENVIRONMENTS.includes(environment);
}

export function buildScanOpsEnvelopeQueueContract(environment = P30G_ENVIRONMENTS.TRAINING) {
  const normalizedEnvironment = normalizeEnvironment(environment);
  const ready = canExposeContract(normalizedEnvironment);

  return Object.freeze({
    phase: P30G_PHASE,
    environment: normalizedEnvironment,
    status: ready ? P30G_STATUS.READY : P30G_STATUS.BLOCKED,
    envelope_queue_contract_ready: ready,
    inactive_contract_only: true,
    hard_disabled: true,
    review_only: true,
    envelope_queue_only: true,
    candidate_only: true,
    preview_only: true,
    dependencies_required: Object.freeze({
      scanops_30e_device_session_contract: true,
      inventory_30f_device_session_contract: true,
      scanops_30c_runtime_config_contract: true,
    }),
    envelope_shape: Object.freeze({
      envelope_version_required: true,
      candidate_id_required: true,
      environment_required: true,
      source_system: 'SCANOPS',
      target_system: 'INVENTORY',
      device_id_reference_required: true,
      session_id_reference_required: true,
      payload_preview_allowed: true,
      emitted: false,
      persisted: false,
    }),
    queue_shape: Object.freeze({
      queue_id_candidate_required: true,
      deterministic_order_required: true,
      duplicate_guard_required: true,
      retry_policy_reference_required: true,
      persisted: false,
      replay_allowed: false,
    }),
    disabled_envelope_queue_operations: Object.freeze({
      create_runtime_envelope: false,
      persist_queue_item: false,
      replay_queue: false,
      open_transport: false,
      send_event: false,
      persist_receipt: false,
    }),
    envelope_created: false,
    envelope_emitted: false,
    envelope_persisted: false,
    queue_item_persisted: false,
    queue_replayed: false,
    duplicate_guard_executed: false,
    retry_attempted: false,
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
