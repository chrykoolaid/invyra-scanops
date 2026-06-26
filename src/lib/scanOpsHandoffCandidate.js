import {
  HANDOFF_ENVIRONMENTS,
  buildP27BModelBundle,
  buildScanOpsHandoffReceipt,
} from './scanOpsHandoffModel.js';

export const P28_SCAN_PHASE = '28A-SCANOPS';
export const P28_SCAN_STATUS = Object.freeze({
  CANDIDATE: 'HANDOFF_CANDIDATE_ONLY',
  BLOCKED: 'BLOCKED',
});

function safeEnvironment(environment) {
  return [HANDOFF_ENVIRONMENTS.TEST, HANDOFF_ENVIRONMENTS.TRAINING].includes(environment);
}

function buildInboxEnvelope(bundle) {
  return Object.freeze({
    inbound_id: bundle.queueItem.queue_id,
    environment: bundle.queueItem.environment,
    event_id: bundle.queueItem.event_id,
    event_key: bundle.queueItem.event_key,
    duplicate_key: bundle.queueItem.duplicate_key,
    source_system: bundle.queueItem.source_system,
    source_device_id: bundle.queueItem.source_device_id,
    source_store_id: bundle.queueItem.source_store_id,
    source_workflow: bundle.queueItem.source_workflow,
    target_system: bundle.contract.target_system,
    contract_version: bundle.contract.contract_version,
    payload_preview_only: true,
    received_at_candidate: null,
  });
}

function buildReceiptCandidate(bundle, candidate) {
  return buildScanOpsHandoffReceipt({
    receipt_id: `receipt-${bundle.queueItem.queue_id}`,
    environment: bundle.queueItem.environment,
    queue_id: bundle.queueItem.queue_id,
    event_id: bundle.queueItem.event_id,
    receipt_status: candidate ? 'CANDIDATE_READY' : 'BLOCKED',
    desktop_response_candidate: candidate,
  });
}

export function buildScanOpsHandoffCandidate(environment = HANDOFF_ENVIRONMENTS.TRAINING) {
  const bundle = buildP27BModelBundle(environment);
  const candidate = safeEnvironment(bundle.queueItem.environment) && bundle.queueItem.candidate_allowed === true;
  const inboxEnvelope = buildInboxEnvelope(bundle);
  const receiptCandidate = buildReceiptCandidate(bundle, candidate);

  return Object.freeze({
    phase: P28_SCAN_PHASE,
    environment: bundle.queueItem.environment,
    status: candidate ? P28_SCAN_STATUS.CANDIDATE : P28_SCAN_STATUS.BLOCKED,
    candidate,
    candidate_only: true,
    inboxEnvelope,
    receiptCandidate,
    local_queue_ready: candidate,
    outbound_payload_shaped: candidate,
    validation_preview_ready: candidate,
    receipt_preview_ready: candidate,
    transport_active: false,
    desktop_call_attempted: false,
    desktop_call_allowed: false,
    event_sent: false,
    inbox_write_attempted: false,
    receipt_received: false,
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
    bundle,
  });
}
