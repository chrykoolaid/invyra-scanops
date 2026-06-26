import { buildP27BModelBundle, HANDOFF_ENVIRONMENTS } from './scanOpsHandoffModel.js';

export const P27E_SCANOPS_ALIGNMENT_PHASE = '27E-SCANOPS';
export const P27E_ALIGNMENT_TARGET = 'INVENTORY_27C_INBOX_MODEL';

export const P27E_SCANOPS_TO_INVENTORY_FIELDS = Object.freeze([
  Object.freeze({ scanops: 'queueItem.queue_id', inventory: 'inboundEvent.inbound_id', rule: 'identity_reference' }),
  Object.freeze({ scanops: 'queueItem.environment', inventory: 'inboundEvent.environment', rule: 'same_environment' }),
  Object.freeze({ scanops: 'queueItem.event_id', inventory: 'inboundEvent.event_id', rule: 'same_event' }),
  Object.freeze({ scanops: 'queueItem.event_key', inventory: 'inboundEvent.event_key', rule: 'same_event_key' }),
  Object.freeze({ scanops: 'queueItem.duplicate_key', inventory: 'inboundEvent.duplicate_key', rule: 'same_duplicate_key' }),
  Object.freeze({ scanops: 'queueItem.source_system', inventory: 'inboundEvent.source_system', rule: 'SCANOPS_source' }),
  Object.freeze({ scanops: 'queueItem.source_device_id', inventory: 'inboundEvent.source_device_id', rule: 'same_device' }),
  Object.freeze({ scanops: 'queueItem.source_store_id', inventory: 'inboundEvent.source_store_id', rule: 'same_store' }),
  Object.freeze({ scanops: 'queueItem.source_workflow', inventory: 'inboundEvent.source_workflow', rule: 'same_workflow' }),
  Object.freeze({ scanops: 'contract.contract_version', inventory: 'validationResult.contract_version', rule: 'same_contract_version' }),
  Object.freeze({ scanops: 'receipt.event_id', inventory: 'receipt.event_id', rule: 'same_receipt_event' }),
  Object.freeze({ scanops: 'duplicateKey.duplicate_key', inventory: 'duplicateKey.duplicate_key', rule: 'same_duplicate_record' }),
  Object.freeze({ scanops: 'auditEvent.event_id', inventory: 'auditEvent.event_id', rule: 'same_audit_event' }),
]);

export const P27E_SCANOPS_ALIGNMENT_GUARDS = Object.freeze({
  transport_active: false,
  desktop_call_allowed: false,
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

function resolvePath(root, path) {
  return path.split('.').reduce((value, key) => (value && value[key] !== undefined ? value[key] : undefined), root);
}

function buildInventoryCandidateFromScanOps(bundle) {
  return Object.freeze({
    inboundEvent: Object.freeze({
      inbound_id: bundle.queueItem.queue_id,
      environment: bundle.queueItem.environment,
      event_id: bundle.queueItem.event_id,
      event_key: bundle.queueItem.event_key,
      duplicate_key: bundle.queueItem.duplicate_key,
      source_system: bundle.queueItem.source_system,
      source_device_id: bundle.queueItem.source_device_id,
      source_store_id: bundle.queueItem.source_store_id,
      source_workflow: bundle.queueItem.source_workflow,
      target_system: 'INVENTORY',
    }),
    validationResult: Object.freeze({
      environment: bundle.contract.environment,
      event_id: bundle.queueItem.event_id,
      contract_version: bundle.contract.contract_version,
      validation_status: 'CANDIDATE_ONLY',
      event_accepted_for_processing: false,
    }),
    receipt: Object.freeze({
      environment: bundle.receipt.environment,
      event_id: bundle.receipt.event_id,
      receipt_status: 'CANDIDATE_ONLY',
      receipt_emitted: false,
    }),
    duplicateKey: Object.freeze({
      environment: bundle.duplicateKey.environment,
      event_id: bundle.duplicateKey.event_id,
      duplicate_key: bundle.duplicateKey.duplicate_key,
      duplicate_blocked: bundle.duplicateKey.duplicate_blocked,
    }),
    auditEvent: Object.freeze({
      environment: bundle.auditEvent.environment,
      event_id: bundle.auditEvent.event_id,
      action: 'P27E_ALIGNMENT_PREVIEW',
      audit_candidate_only: bundle.auditEvent.audit_candidate_only,
    }),
  });
}

function check(name, passed) {
  return Object.freeze({ name, passed: passed === true });
}

export function buildP27EScanOpsAlignment(environment = HANDOFF_ENVIRONMENTS.TRAINING) {
  const scanops = buildP27BModelBundle(environment);
  const inventoryCandidate = buildInventoryCandidateFromScanOps(scanops);
  const fieldChecks = Object.freeze(P27E_SCANOPS_TO_INVENTORY_FIELDS.map((field) => check(field.rule, resolvePath(scanops, field.scanops) === resolvePath(inventoryCandidate, field.inventory))));
  const safeEnvironment = ['TRAINING', 'TEST'].includes(scanops.queueItem.environment);
  const guardChecks = Object.freeze(Object.entries(P27E_SCANOPS_ALIGNMENT_GUARDS).map(([name, expected]) => check(name, expected === false)));

  return Object.freeze({
    phase: P27E_SCANOPS_ALIGNMENT_PHASE,
    target: P27E_ALIGNMENT_TARGET,
    environment: scanops.queueItem.environment,
    safe_environment: safeEnvironment,
    candidate_only: safeEnvironment,
    blocked: !safeEnvironment,
    field_count: P27E_SCANOPS_TO_INVENTORY_FIELDS.length,
    fields: P27E_SCANOPS_TO_INVENTORY_FIELDS,
    fieldChecks,
    guards: P27E_SCANOPS_ALIGNMENT_GUARDS,
    guardChecks,
    passed: fieldChecks.every((item) => item.passed) && guardChecks.every((item) => item.passed),
    scanops,
    inventoryCandidate,
  });
}
