export const P30I_PHASE = '30I-SCANOPS-RECEIPT-POLICY-CONTRACT';

export const P30I_STATUS = Object.freeze({
  READY: 'RECEIPT_POLICY_CONTRACT_READY',
  BLOCKED: 'RECEIPT_POLICY_CONTRACT_BLOCKED',
});

export const P30I_ENVIRONMENTS = Object.freeze({
  TRAINING: 'TRAINING',
  TEST: 'TEST',
  LIVE: 'LIVE',
  PRODUCTION: 'PRODUCTION',
  UNKNOWN: 'UNKNOWN',
});

const SAFE_ENVIRONMENTS = Object.freeze([
  P30I_ENVIRONMENTS.TRAINING,
  P30I_ENVIRONMENTS.TEST,
]);

function normalizeEnvironment(environment) {
  return typeof environment === 'string' ? environment.trim().toUpperCase() : P30I_ENVIRONMENTS.UNKNOWN;
}

function canExposeContract(environment) {
  return SAFE_ENVIRONMENTS.includes(environment);
}

export function buildScanOpsReceiptPolicyContract(environment = P30I_ENVIRONMENTS.TRAINING) {
  const normalizedEnvironment = normalizeEnvironment(environment);
  const ready = canExposeContract(normalizedEnvironment);

  return Object.freeze({
    phase: P30I_PHASE,
    environment: normalizedEnvironment,
    status: ready ? P30I_STATUS.READY : P30I_STATUS.BLOCKED,
    receipt_policy_contract_ready: ready,
    inactive_contract_only: true,
    hard_disabled: true,
    review_only: true,
    receipt_policy_only: true,
    candidate_only: true,
    preview_only: true,
    dependencies_required: Object.freeze({
      scanops_30g_envelope_queue_contract: true,
      inventory_30h_envelope_inbox_contract: true,
    }),
    receipt_shape: Object.freeze({
      receipt_id_candidate_required: true,
      candidate_id_reference_required: true,
      environment_required: true,
      status_candidate_allowed: true,
      validation_summary_candidate_allowed: true,
      emitted: false,
      persisted: false,
    }),
    queue_result_shape: Object.freeze({
      candidate_id_reference_required: true,
      final_state_candidate_allowed: true,
      completion_marker_candidate_allowed: true,
      marked_done: false,
      persisted: false,
    }),
    disabled_receipt_operations: Object.freeze({
      receive_receipt: false,
      persist_receipt: false,
      mark_queue_item_done: false,
      open_transport: false,
      send_event: false,
    }),
    receipt_received: false,
    receipt_persisted: false,
    queue_item_marked_done: false,
    transport_active: false,
    listener_active: false,
    network_call_attempted: false,
    desktop_call_attempted: false,
    event_sent: false,
    outbound_queue_persisted: false,
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
