export const HANDOFF_MODEL_PHASE = '27B';

export const HANDOFF_ENVIRONMENTS = Object.freeze({
  TEST: 'TEST',
  TRAINING: 'TRAINING',
  LIVE: 'LIVE',
  PRODUCTION: 'PRODUCTION',
  UNKNOWN: 'UNKNOWN',
});

export const HANDOFF_STATES = Object.freeze({
  DRAFT: 'DRAFT',
  QUEUED: 'QUEUED',
  READY_FOR_REVIEW: 'READY_FOR_REVIEW',
  RECEIPT_CANDIDATE: 'RECEIPT_CANDIDATE',
  RETRY_CANDIDATE: 'RETRY_CANDIDATE',
  DUPLICATE_BLOCKED: 'DUPLICATE_BLOCKED',
  BLOCKED: 'BLOCKED',
});

export const HANDOFF_MODE = Object.freeze({
  CANDIDATE_ONLY: 'CANDIDATE_ONLY',
  BLOCKED: 'BLOCKED',
});

export const REQUIRED_QUEUE_FIELDS = Object.freeze([
  'queue_id',
  'environment',
  'event_id',
  'event_key',
  'source_system',
  'source_device_id',
  'source_store_id',
  'source_workflow',
  'payload_contract_id',
  'created_at',
]);

export const REQUIRED_CONFIG_FIELDS = Object.freeze([
  'config_id',
  'environment',
  'store_id',
  'desktop_ip',
  'port',
  'endpoint_path',
  'enabled',
]);

export const REQUIRED_CONTRACT_FIELDS = Object.freeze([
  'contract_id',
  'environment',
  'contract_version',
  'event_type',
  'source_workflow',
  'target_system',
  'mutation_allowed',
]);

export const REQUIRED_RECEIPT_FIELDS = Object.freeze([
  'receipt_id',
  'environment',
  'queue_id',
  'event_id',
  'receipt_status',
  'desktop_response_candidate',
]);

export const REQUIRED_RETRY_FIELDS = Object.freeze([
  'retry_id',
  'environment',
  'queue_id',
  'event_id',
  'attempt_count',
  'max_attempts',
  'next_state',
]);

export const REQUIRED_DUPLICATE_FIELDS = Object.freeze([
  'duplicate_key',
  'environment',
  'event_id',
  'source_device_id',
  'source_store_id',
  'source_workflow',
]);

export const REQUIRED_AUDIT_FIELDS = Object.freeze([
  'audit_id',
  'environment',
  'event_id',
  'actor_id',
  'actor_role',
  'action',
  'created_at',
]);

function normalizeEnvironment(value) {
  const environment = typeof value === 'string' ? value.trim().toUpperCase() : HANDOFF_ENVIRONMENTS.UNKNOWN;
  return Object.values(HANDOFF_ENVIRONMENTS).includes(environment) ? environment : HANDOFF_ENVIRONMENTS.UNKNOWN;
}

function hasRequiredFields(input = {}, fields = []) {
  return fields.every((field) => {
    const value = input[field];
    if (typeof value === 'string') return value.trim().length > 0;
    return value !== undefined && value !== null;
  });
}

function isSafeEnvironment(environment) {
  return [HANDOFF_ENVIRONMENTS.TEST, HANDOFF_ENVIRONMENTS.TRAINING].includes(environment);
}

function baseGuard(environment, fieldsPresent) {
  const safe = isSafeEnvironment(environment);
  return Object.freeze({
    phase: HANDOFF_MODEL_PHASE,
    environment,
    fields_present: fieldsPresent,
    mode: safe && fieldsPresent ? HANDOFF_MODE.CANDIDATE_ONLY : HANDOFF_MODE.BLOCKED,
    candidate_allowed: safe && fieldsPresent,
    live_blocked: [HANDOFF_ENVIRONMENTS.LIVE, HANDOFF_ENVIRONMENTS.PRODUCTION].includes(environment),
    transport_active: false,
    desktop_call_allowed: false,
    inventory_write_allowed: false,
    stock_mutation_allowed: false,
    workflow_mutation_allowed: false,
    price_mutation_allowed: false,
    accounting_mutation_allowed: false,
    persisted: false,
    write_attempted: false,
    mutation_attempted: false,
  });
}

export function buildScanOpsLocalQueueItem(input = {}) {
  const environment = normalizeEnvironment(input.environment);
  const fieldsPresent = hasRequiredFields(input, REQUIRED_QUEUE_FIELDS);
  const guard = baseGuard(environment, fieldsPresent);
  const duplicateKey = input.duplicate_key || [input.source_store_id, input.source_device_id, input.source_workflow, input.event_key].filter(Boolean).join('|').toLowerCase();

  return Object.freeze({
    model: 'ScanOpsLocalQueueItem',
    queue_id: input.queue_id || null,
    event_id: input.event_id || null,
    event_key: input.event_key || null,
    duplicate_key: duplicateKey || null,
    source_system: input.source_system || 'SCANOPS',
    source_device_id: input.source_device_id || null,
    source_store_id: input.source_store_id || null,
    source_workflow: input.source_workflow || null,
    payload_contract_id: input.payload_contract_id || null,
    status: guard.candidate_allowed ? HANDOFF_STATES.QUEUED : HANDOFF_STATES.BLOCKED,
    payload_preview_only: true,
    ...guard,
  });
}

export function buildScanOpsHandoffConfig(input = {}) {
  const environment = normalizeEnvironment(input.environment);
  const fieldsPresent = hasRequiredFields(input, REQUIRED_CONFIG_FIELDS);
  const guard = baseGuard(environment, fieldsPresent);
  return Object.freeze({
    model: 'ScanOpsHandoffConfig',
    config_id: input.config_id || null,
    store_id: input.store_id || null,
    desktop_ip: input.desktop_ip || null,
    port: input.port || null,
    endpoint_path: input.endpoint_path || '/',
    enabled: Boolean(input.enabled) && guard.candidate_allowed,
    status: guard.candidate_allowed ? HANDOFF_STATES.DRAFT : HANDOFF_STATES.BLOCKED,
    ...guard,
    transport_active: false,
  });
}

export function buildScanOpsPayloadContract(input = {}) {
  const environment = normalizeEnvironment(input.environment);
  const fieldsPresent = hasRequiredFields(input, REQUIRED_CONTRACT_FIELDS);
  const guard = baseGuard(environment, fieldsPresent);
  return Object.freeze({
    model: 'ScanOpsPayloadContract',
    contract_id: input.contract_id || null,
    contract_version: input.contract_version || null,
    event_type: input.event_type || null,
    source_workflow: input.source_workflow || null,
    target_system: input.target_system || 'INVENTORY',
    mutation_allowed: false,
    status: guard.candidate_allowed ? HANDOFF_STATES.READY_FOR_REVIEW : HANDOFF_STATES.BLOCKED,
    ...guard,
  });
}

export function buildScanOpsHandoffReceipt(input = {}) {
  const environment = normalizeEnvironment(input.environment);
  const fieldsPresent = hasRequiredFields(input, REQUIRED_RECEIPT_FIELDS);
  const guard = baseGuard(environment, fieldsPresent);
  return Object.freeze({
    model: 'ScanOpsHandoffReceipt',
    receipt_id: input.receipt_id || null,
    queue_id: input.queue_id || null,
    event_id: input.event_id || null,
    receipt_status: input.receipt_status || null,
    desktop_response_candidate: Boolean(input.desktop_response_candidate) && guard.candidate_allowed,
    status: guard.candidate_allowed ? HANDOFF_STATES.RECEIPT_CANDIDATE : HANDOFF_STATES.BLOCKED,
    ...guard,
  });
}

export function buildScanOpsRetryState(input = {}) {
  const environment = normalizeEnvironment(input.environment);
  const fieldsPresent = hasRequiredFields(input, REQUIRED_RETRY_FIELDS);
  const guard = baseGuard(environment, fieldsPresent);
  const attemptCount = Number(input.attempt_count || 0);
  const maxAttempts = Number(input.max_attempts || 0);
  return Object.freeze({
    model: 'ScanOpsRetryState',
    retry_id: input.retry_id || null,
    queue_id: input.queue_id || null,
    event_id: input.event_id || null,
    attempt_count: attemptCount,
    max_attempts: maxAttempts,
    next_state: input.next_state || null,
    retry_allowed: guard.candidate_allowed && attemptCount < maxAttempts,
    status: guard.candidate_allowed ? HANDOFF_STATES.RETRY_CANDIDATE : HANDOFF_STATES.BLOCKED,
    ...guard,
  });
}

export function buildScanOpsDuplicateKey(input = {}) {
  const environment = normalizeEnvironment(input.environment);
  const fieldsPresent = hasRequiredFields(input, REQUIRED_DUPLICATE_FIELDS);
  const guard = baseGuard(environment, fieldsPresent);
  return Object.freeze({
    model: 'ScanOpsDuplicateKey',
    duplicate_key: input.duplicate_key || null,
    event_id: input.event_id || null,
    source_device_id: input.source_device_id || null,
    source_store_id: input.source_store_id || null,
    source_workflow: input.source_workflow || null,
    duplicate_blocked: guard.candidate_allowed,
    status: guard.candidate_allowed ? HANDOFF_STATES.DUPLICATE_BLOCKED : HANDOFF_STATES.BLOCKED,
    ...guard,
  });
}

export function buildScanOpsAuditEvent(input = {}) {
  const environment = normalizeEnvironment(input.environment);
  const fieldsPresent = hasRequiredFields(input, REQUIRED_AUDIT_FIELDS);
  const guard = baseGuard(environment, fieldsPresent);
  return Object.freeze({
    model: 'ScanOpsAuditEvent',
    audit_id: input.audit_id || null,
    event_id: input.event_id || null,
    actor_id: input.actor_id || null,
    actor_role: input.actor_role || null,
    action: input.action || null,
    created_at: input.created_at || null,
    audit_candidate_only: guard.candidate_allowed,
    status: guard.candidate_allowed ? HANDOFF_STATES.READY_FOR_REVIEW : HANDOFF_STATES.BLOCKED,
    ...guard,
  });
}

export function buildP27BModelBundle(environment = HANDOFF_ENVIRONMENTS.TRAINING) {
  const base = {
    environment,
    event_id: 'evt-p27b-001',
    event_key: 'store-01|scanner-01|p27b|evt-p27b-001',
    source_system: 'SCANOPS',
    source_device_id: 'scanner-01',
    source_store_id: 'store-01',
    source_workflow: 'sync_handoff_foundation',
    payload_contract_id: 'contract-p27b-001',
    created_at: '2026-06-26T00:00:00.000Z',
  };

  return Object.freeze({
    queueItem: buildScanOpsLocalQueueItem({ ...base, queue_id: 'queue-p27b-001' }),
    config: buildScanOpsHandoffConfig({ config_id: 'config-p27b-001', environment, store_id: 'store-01', desktop_ip: '192.168.1.50', port: '8080', endpoint_path: '/scanops/handoff', enabled: true }),
    contract: buildScanOpsPayloadContract({ contract_id: 'contract-p27b-001', environment, contract_version: 'SCANOPS_HANDOFF_MODEL_P27B', event_type: 'SYNC_HANDOFF_FOUNDATION', source_workflow: 'sync_handoff_foundation', target_system: 'INVENTORY', mutation_allowed: false }),
    receipt: buildScanOpsHandoffReceipt({ receipt_id: 'receipt-p27b-001', environment, queue_id: 'queue-p27b-001', event_id: base.event_id, receipt_status: 'CANDIDATE_ONLY', desktop_response_candidate: true }),
    retry: buildScanOpsRetryState({ retry_id: 'retry-p27b-001', environment, queue_id: 'queue-p27b-001', event_id: base.event_id, attempt_count: 0, max_attempts: 3, next_state: HANDOFF_STATES.RETRY_CANDIDATE }),
    duplicateKey: buildScanOpsDuplicateKey({ duplicate_key: base.event_key, environment, event_id: base.event_id, source_device_id: base.source_device_id, source_store_id: base.source_store_id, source_workflow: base.source_workflow }),
    auditEvent: buildScanOpsAuditEvent({ audit_id: 'audit-p27b-001', environment, event_id: base.event_id, actor_id: 'admin-01', actor_role: 'Admin', action: 'P27B_MODEL_PREVIEW', created_at: base.created_at }),
  });
}
