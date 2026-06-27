export const P28C_ALIGNMENT_PHASE = '28C-SCANOPS-ALIGNMENT';

export const P28C_ALIGNMENT_STATUS = Object.freeze({
  READY: 'CANDIDATE_ALIGNMENT_READY',
  BLOCKED: 'CANDIDATE_ALIGNMENT_BLOCKED',
});

export const P28C_ALIGNMENT_ENVIRONMENTS = Object.freeze({
  TRAINING: 'TRAINING',
  TEST: 'TEST',
  LIVE: 'LIVE',
  PRODUCTION: 'PRODUCTION',
  UNKNOWN: 'UNKNOWN',
});

const SAFE_ENVIRONMENTS = Object.freeze([
  P28C_ALIGNMENT_ENVIRONMENTS.TRAINING,
  P28C_ALIGNMENT_ENVIRONMENTS.TEST,
]);

function normalizeEnvironment(environment) {
  return typeof environment === 'string'
    ? environment.trim().toUpperCase()
    : P28C_ALIGNMENT_ENVIRONMENTS.UNKNOWN;
}

function canPreview(environment) {
  return SAFE_ENVIRONMENTS.includes(environment);
}

function buildScanOpsSide(environment, ready) {
  return Object.freeze({
    phase: '28A-SCANOPS',
    environment,
    local_queue_candidate_ready: ready,
    inventory_inbox_envelope_preview_ready: ready,
    receipt_candidate_preview_ready: ready,
    outbound_payload_preview_only: true,
    transport_active: false,
    desktop_call_attempted: false,
    event_sent: false,
    receipt_persisted: false,
    write_attempted: false,
    mutation_attempted: false,
  });
}

function buildInventorySide(environment, ready) {
  return Object.freeze({
    phase: '28B-INVENTORY',
    environment,
    inbox_candidate_ready: ready,
    validation_candidate_ready: ready,
    receipt_candidate_ready: ready,
    payload_preview_only: true,
    listener_active: false,
    ingestion_engine_active: false,
    inbound_persisted: false,
    receipt_emitted: false,
    receipt_persisted: false,
    inventory_write_allowed: false,
    stock_mutation_allowed: false,
    workflow_mutation_allowed: false,
    write_attempted: false,
    mutation_attempted: false,
  });
}

export function buildP28CCandidateAlignment(environment = P28C_ALIGNMENT_ENVIRONMENTS.TRAINING) {
  const normalizedEnvironment = normalizeEnvironment(environment);
  const ready = canPreview(normalizedEnvironment);
  const scanops = buildScanOpsSide(normalizedEnvironment, ready);
  const inventory = buildInventorySide(normalizedEnvironment, ready);

  return Object.freeze({
    phase: P28C_ALIGNMENT_PHASE,
    environment: normalizedEnvironment,
    status: ready ? P28C_ALIGNMENT_STATUS.READY : P28C_ALIGNMENT_STATUS.BLOCKED,
    candidate_alignment_ready: ready,
    candidate_only: true,
    preview_only: true,
    scanops,
    inventory,
    aligned_sequence: Object.freeze([
      'scanops_local_queue_candidate',
      'inventory_inbox_candidate',
      'inventory_validation_candidate',
      'inventory_receipt_candidate',
      'scanops_receipt_candidate_preview',
    ]),
    transport_active: false,
    listener_active: false,
    desktop_call_attempted: false,
    event_sent: false,
    inbound_persisted: false,
    receipt_emitted: false,
    receipt_persisted: false,
    inventory_write_allowed: false,
    stock_mutation_allowed: false,
    workflow_mutation_allowed: false,
    price_mutation_allowed: false,
    accounting_mutation_allowed: false,
    purchase_order_write_allowed: false,
    forecast_write_allowed: false,
    write_attempted: false,
    mutation_attempted: false,
  });
}
