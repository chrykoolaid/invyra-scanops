export const P28E_ACK_PHASE = '28E-SCANOPS-ACK';

export const P28E_ACK_STATUS = Object.freeze({
  ACKNOWLEDGED: 'INVENTORY_ACCEPTANCE_ACKNOWLEDGED',
  BLOCKED: 'INVENTORY_ACCEPTANCE_ACK_BLOCKED',
});

export const P28E_ACK_ENVIRONMENTS = Object.freeze({
  TRAINING: 'TRAINING',
  TEST: 'TEST',
  LIVE: 'LIVE',
  PRODUCTION: 'PRODUCTION',
  UNKNOWN: 'UNKNOWN',
});

const SAFE_ENVIRONMENTS = Object.freeze([
  P28E_ACK_ENVIRONMENTS.TRAINING,
  P28E_ACK_ENVIRONMENTS.TEST,
]);

function normalizeEnvironment(environment) {
  return typeof environment === 'string'
    ? environment.trim().toUpperCase()
    : P28E_ACK_ENVIRONMENTS.UNKNOWN;
}

function canAcknowledge(environment) {
  return SAFE_ENVIRONMENTS.includes(environment);
}

function buildInventoryAcceptanceReference(environment, acknowledged) {
  return Object.freeze({
    accepted_phase: '28D-INVENTORY-ACCEPTANCE',
    environment,
    inventory_system_of_record: true,
    candidate_alignment_accepted: acknowledged,
    acceptance_preview_only: true,
    listener_active: false,
    ingestion_engine_active: false,
    inbound_persisted: false,
    receipt_emitted: false,
    inventory_write_allowed: false,
    stock_mutation_allowed: false,
    workflow_mutation_allowed: false,
  });
}

function buildScanOpsAcknowledgement(environment, acknowledged) {
  return Object.freeze({
    acknowledgement_phase: P28E_ACK_PHASE,
    environment,
    inventory_acceptance_acknowledged: acknowledged,
    acknowledgement_preview_only: true,
    acknowledgement_emitted: false,
    acknowledgement_persisted: false,
    desktop_call_attempted: false,
    transport_active: false,
    event_sent: false,
    write_attempted: false,
    mutation_attempted: false,
  });
}

export function buildScanOpsInventoryAcceptanceAck(environment = P28E_ACK_ENVIRONMENTS.TRAINING) {
  const normalizedEnvironment = normalizeEnvironment(environment);
  const acknowledged = canAcknowledge(normalizedEnvironment);
  const inventoryAcceptance = buildInventoryAcceptanceReference(normalizedEnvironment, acknowledged);
  const scanopsAcknowledgement = buildScanOpsAcknowledgement(normalizedEnvironment, acknowledged);

  return Object.freeze({
    phase: P28E_ACK_PHASE,
    environment: normalizedEnvironment,
    status: acknowledged ? P28E_ACK_STATUS.ACKNOWLEDGED : P28E_ACK_STATUS.BLOCKED,
    inventory_acceptance_acknowledged: acknowledged,
    candidate_only: true,
    preview_only: true,
    inventoryAcceptance,
    scanopsAcknowledgement,
    transport_active: false,
    listener_active: false,
    desktop_call_attempted: false,
    event_sent: false,
    acknowledgement_emitted: false,
    acknowledgement_persisted: false,
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
    persisted: false,
    write_attempted: false,
    mutation_attempted: false,
  });
}
