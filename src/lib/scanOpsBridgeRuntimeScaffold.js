export const P30A_PHASE = '30A-SCANOPS-RUNTIME-SCAFFOLD-INACTIVE';

export const P30A_STATUS = Object.freeze({
  INACTIVE: 'RUNTIME_SCAFFOLD_INACTIVE',
  BLOCKED: 'RUNTIME_SCAFFOLD_BLOCKED',
});

export const P30A_ENVIRONMENTS = Object.freeze({
  TRAINING: 'TRAINING',
  TEST: 'TEST',
  LIVE: 'LIVE',
  PRODUCTION: 'PRODUCTION',
  UNKNOWN: 'UNKNOWN',
});

const SAFE_ENVIRONMENTS = Object.freeze([
  P30A_ENVIRONMENTS.TRAINING,
  P30A_ENVIRONMENTS.TEST,
]);

function normalizeEnvironment(environment) {
  return typeof environment === 'string' ? environment.trim().toUpperCase() : P30A_ENVIRONMENTS.UNKNOWN;
}

function canExposeScaffold(environment) {
  return SAFE_ENVIRONMENTS.includes(environment);
}

export function createScanOpsBridgeRuntimeScaffold(environment = P30A_ENVIRONMENTS.TRAINING) {
  const normalizedEnvironment = normalizeEnvironment(environment);
  const safe = canExposeScaffold(normalizedEnvironment);

  return Object.freeze({
    phase: P30A_PHASE,
    environment: normalizedEnvironment,
    status: safe ? P30A_STATUS.INACTIVE : P30A_STATUS.BLOCKED,
    scaffold_available: safe,
    inactive_runtime_scaffold: true,
    hard_disabled: true,
    review_only: true,
    scaffold_only: true,
    candidate_only: true,
    preview_only: true,
    dependencies_required: Object.freeze({
      scanops_29d_architecture_foundation: true,
      inventory_29e_architecture_foundation: true,
      phase_28_candidate_chain_closed: true,
    }),
    runtime_slots: Object.freeze({
      config_slot_defined: true,
      device_identity_slot_defined: true,
      session_slot_defined: true,
      outbound_candidate_slot_defined: true,
      receipt_candidate_slot_defined: true,
      activation_slot_defined: false,
    }),
    disabled_operations: Object.freeze({
      start_runtime: false,
      stop_runtime: false,
      pair_device: false,
      open_transport: false,
      send_event: false,
      persist_queue: false,
      persist_receipt: false,
      mutate_inventory: false,
      mutate_scanops: false,
    }),
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
