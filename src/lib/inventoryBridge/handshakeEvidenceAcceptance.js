/**
 * handshakeEvidenceAcceptance.js — ScanOps Phase 1D-D-AA
 *
 * ScanOps-side acceptance contract for Inventory Phase 1D-D-Z relay handshake
 * evidence projections.
 *
 * Scope for this phase:
 * - Projection-only and validator-only.
 * - Accepts Inventory's final handshake evidence as a local, non-persistent
 *   acknowledgement that the current contract evidence chain is closed.
 * - Does not enforce relay trust, start relay transport, enable event transport,
 *   sync events, write event_outbox, write localStorage, call Inventory ingestion,
 *   build UI, or mutate Inventory/POS/order/forecasting state.
 */

export const SCANOPS_INVENTORY_BRIDGE_HANDSHAKE_EVIDENCE_ACCEPTANCE_PHASE = '1D-D-AA';
export const SCANOPS_INVENTORY_BRIDGE_HANDSHAKE_EVIDENCE_SOURCE_PHASE = '1D-D-Z';
export const SCANOPS_INVENTORY_BRIDGE_HANDSHAKE_EVIDENCE_SCHEMA_VERSION = '1.0.0';
export const SCANOPS_INVENTORY_BRIDGE_HANDSHAKE_EVIDENCE_CONTRACT_VERSION = '1.0.0';
export const SCANOPS_INVENTORY_BRIDGE_HANDSHAKE_EVIDENCE_PROTOCOL_VERSION = '1.0.0';

export const SCANOPS_HANDSHAKE_EVIDENCE_LOCAL_STATE = Object.freeze({
  ACCEPTED_PENDING_FUTURE_RELAY_ENFORCEMENT: 'HANDSHAKE_EVIDENCE_ACCEPTED_PENDING_FUTURE_RELAY_ENFORCEMENT',
  REJECTED: 'HANDSHAKE_EVIDENCE_REJECTED',
});

export const SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE = Object.freeze({
  ACCEPTED: 'SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTED',
  INVALID: 'HANDSHAKE_EVIDENCE_INVALID',
  STATUS_INVALID: 'HANDSHAKE_EVIDENCE_STATUS_INVALID',
  PHASE_MISMATCH: 'HANDSHAKE_EVIDENCE_PHASE_MISMATCH',
  DEVICE_MISMATCH: 'HANDSHAKE_EVIDENCE_DEVICE_MISMATCH',
  ENVIRONMENT_MISMATCH: 'HANDSHAKE_EVIDENCE_ENVIRONMENT_MISMATCH',
  STORE_MISMATCH: 'HANDSHAKE_EVIDENCE_STORE_MISMATCH',
  INSTANCE_MISMATCH: 'HANDSHAKE_EVIDENCE_INSTANCE_MISMATCH',
  HANDSHAKE_NOT_CLOSED: 'HANDSHAKE_EVIDENCE_NOT_CLOSED',
  ENFORCEMENT_ALREADY_ALLOWED: 'RELAY_ENFORCEMENT_ALREADY_ALLOWED',
  RELAY_TRANSPORT_ALREADY_ALLOWED: 'RELAY_TRANSPORT_ALREADY_ALLOWED',
  EVENT_TRANSPORT_ALREADY_ALLOWED: 'EVENT_TRANSPORT_ALREADY_ALLOWED',
  EVENT_SYNC_ALREADY_ALLOWED: 'EVENT_SYNC_ALREADY_ALLOWED',
  INGESTION_ALREADY_ALLOWED: 'EVENT_INGESTION_ALREADY_ALLOWED',
  INVENTORY_MUTATION_ALREADY_ALLOWED: 'INVENTORY_MUTATION_ALREADY_ALLOWED',
});

export const SCANOPS_HANDSHAKE_EVIDENCE_REQUIRED_FIELDS = Object.freeze([
  'schema_version',
  'phase',
  'contract_version',
  'bridge_protocol_version',
  'code',
  'status',
  'source_device_id',
  'environment',
  'store_id',
  'inventory_instance_id',
  'inventory_candidate_status',
  'scanops_preflight_phase',
  'scanops_candidate_acceptance_status',
  'relay_readiness_preflight_accepted',
  'relay_enforcement_candidate_accepted',
  'handshake_evidence_closed',
  'relay_enforcement_allowed',
  'relay_transport_allowed',
  'event_transport_allowed',
  'event_sync_allowed',
  'event_ingestion_allowed',
  'inventory_mutation_allowed',
  'relay_enforcement_still_required',
  'ingestion_validation_still_required_per_event',
  'evidence_projection_only',
  'projected_at',
]);

export const SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_GUARDRAILS = Object.freeze({
  scanops_handshake_evidence_acceptance_projection_only: true,
  local_validator_only: true,
  no_local_storage_write: true,
  no_event_outbox_write: true,
  no_event_sync: true,
  no_event_transport: true,
  no_relay_enforcement: true,
  no_relay_transport: true,
  no_inventory_writes: true,
  no_entity_writes: true,
  no_scanops_sync_mutation: true,
  no_ui: true,
  no_qr_ui: true,
  no_manual_ip_ui: true,
  no_device_registry_ui: true,
  no_stock_mutation: true,
  no_price_mutation: true,
  no_pos_order_forecast_mutation: true,
  no_item_master_mutation: true,
  relay_enforcement_still_required: true,
  ingestion_validation_still_required_per_event: true,
  base44_cloud_relay_not_lan_bridge: true,
});

function nowIso() {
  return new Date().toISOString();
}

function parseJsonMaybe(input) {
  if (!input) return null;
  if (typeof input === 'object' && !Array.isArray(input)) return input;
  if (typeof input !== 'string') return null;

  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function normalizeLocalScope(input = {}) {
  const scope = parseJsonMaybe(input) || {};
  return {
    source_device_id: scope.source_device_id || scope.device_id || null,
    environment: scope.environment || null,
    store_id: scope.store_id || null,
    inventory_instance_id: scope.inventory_instance_id || null,
    relay_instance_ref: scope.relay_instance_ref || null,
  };
}

function errorCode(errors = []) {
  const priority = [
    SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.PHASE_MISMATCH,
    SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.DEVICE_MISMATCH,
    SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.ENVIRONMENT_MISMATCH,
    SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.STORE_MISMATCH,
    SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.INSTANCE_MISMATCH,
    SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.STATUS_INVALID,
    SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.HANDSHAKE_NOT_CLOSED,
    SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.ENFORCEMENT_ALREADY_ALLOWED,
    SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.RELAY_TRANSPORT_ALREADY_ALLOWED,
    SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.EVENT_TRANSPORT_ALREADY_ALLOWED,
    SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.EVENT_SYNC_ALREADY_ALLOWED,
    SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.INGESTION_ALREADY_ALLOWED,
    SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.INVENTORY_MUTATION_ALREADY_ALLOWED,
  ];

  return priority.find((code) => errors.includes(code))
    || SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.INVALID;
}

export function validateScanOpsHandshakeEvidence(input = {}, localScopeInput = {}) {
  const evidence = parseJsonMaybe(input);
  const localScope = normalizeLocalScope(localScopeInput);
  const errors = [];

  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    return {
      ok: false,
      code: SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.INVALID,
      errors: ['Handshake evidence must be an object or JSON string.'],
      evidence: null,
      local_scope: localScope,
    };
  }

  for (const field of SCANOPS_HANDSHAKE_EVIDENCE_REQUIRED_FIELDS) {
    if (evidence[field] === null || evidence[field] === undefined || evidence[field] === '') {
      errors.push(`Missing ${field}.`);
    }
  }

  if (evidence.schema_version !== SCANOPS_INVENTORY_BRIDGE_HANDSHAKE_EVIDENCE_SCHEMA_VERSION) {
    errors.push('schema_version mismatch.');
  }

  if (evidence.phase !== SCANOPS_INVENTORY_BRIDGE_HANDSHAKE_EVIDENCE_SOURCE_PHASE) {
    errors.push(SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.PHASE_MISMATCH);
  }

  if (evidence.contract_version !== SCANOPS_INVENTORY_BRIDGE_HANDSHAKE_EVIDENCE_CONTRACT_VERSION) {
    errors.push(SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.PHASE_MISMATCH);
  }

  if (evidence.bridge_protocol_version !== SCANOPS_INVENTORY_BRIDGE_HANDSHAKE_EVIDENCE_PROTOCOL_VERSION) {
    errors.push(SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.PHASE_MISMATCH);
  }

  if (localScope.source_device_id && evidence.source_device_id !== localScope.source_device_id) {
    errors.push(SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.DEVICE_MISMATCH);
  }

  if (localScope.environment && evidence.environment !== localScope.environment) {
    errors.push(SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.ENVIRONMENT_MISMATCH);
  }

  if (localScope.store_id && evidence.store_id !== localScope.store_id) {
    errors.push(SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.STORE_MISMATCH);
  }

  if (localScope.inventory_instance_id && evidence.inventory_instance_id !== localScope.inventory_instance_id) {
    errors.push(SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.INSTANCE_MISMATCH);
  }

  if (evidence.code !== 'INVENTORY_RELAY_HANDSHAKE_EVIDENCE_PROJECTED') {
    errors.push(SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.STATUS_INVALID);
  }

  if (evidence.status !== 'RELAY_HANDSHAKE_EVIDENCE_CLOSED_PENDING_FUTURE_ENFORCEMENT') {
    errors.push(SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.STATUS_INVALID);
  }

  if (evidence.handshake_evidence_closed !== true) {
    errors.push(SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.HANDSHAKE_NOT_CLOSED);
  }

  if (evidence.relay_enforcement_allowed !== false || evidence.relay_enforcement_still_required !== true) {
    errors.push(SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.ENFORCEMENT_ALREADY_ALLOWED);
  }

  if (evidence.relay_transport_allowed !== false) {
    errors.push(SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.RELAY_TRANSPORT_ALREADY_ALLOWED);
  }

  if (evidence.event_transport_allowed !== false) {
    errors.push(SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.EVENT_TRANSPORT_ALREADY_ALLOWED);
  }

  if (evidence.event_sync_allowed !== false) {
    errors.push(SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.EVENT_SYNC_ALREADY_ALLOWED);
  }

  if (evidence.event_ingestion_allowed !== false) {
    errors.push(SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.INGESTION_ALREADY_ALLOWED);
  }

  if (evidence.inventory_mutation_allowed !== false) {
    errors.push(SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.INVENTORY_MUTATION_ALREADY_ALLOWED);
  }

  if (evidence.ingestion_validation_still_required_per_event !== true) {
    errors.push('ingestion validation must remain required per future event.');
  }

  if (evidence.evidence_projection_only !== true) {
    errors.push('handshake evidence must remain projection-only.');
  }

  return {
    ok: errors.length === 0,
    code: errors.length === 0
      ? 'HANDSHAKE_EVIDENCE_VALID'
      : errorCode(errors),
    errors,
    evidence,
    local_scope: localScope,
  };
}

export function acceptScanOpsHandshakeEvidence(input = {}, localScopeInput = {}, options = {}) {
  const validation = validateScanOpsHandshakeEvidence(input, localScopeInput);
  const acceptedAt = options.accepted_at || nowIso();

  if (!validation.ok) {
    return {
      ok: false,
      code: validation.code,
      validation,
      local_state: {
        status: SCANOPS_HANDSHAKE_EVIDENCE_LOCAL_STATE.REJECTED,
        relay_enforcement_allowed: false,
        relay_transport_allowed: false,
        event_transport_allowed: false,
        event_sync_allowed: false,
        event_ingestion_allowed: false,
      },
      guardrails: SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_GUARDRAILS,
    };
  }

  const evidence = validation.evidence;
  const localState = {
    status: SCANOPS_HANDSHAKE_EVIDENCE_LOCAL_STATE.ACCEPTED_PENDING_FUTURE_RELAY_ENFORCEMENT,
    source_device_id: evidence.source_device_id,
    environment: evidence.environment,
    store_id: evidence.store_id,
    inventory_instance_id: evidence.inventory_instance_id,
    relay_instance_ref: evidence.relay_instance_ref || validation.local_scope.relay_instance_ref || null,
    inventory_handshake_status: evidence.status,
    inventory_handshake_phase: evidence.phase,
    scanops_preflight_phase: evidence.scanops_preflight_phase,
    scanops_candidate_acceptance_status: evidence.scanops_candidate_acceptance_status,
    handshake_evidence_closed: true,
    relay_enforcement_allowed: false,
    relay_transport_allowed: false,
    event_transport_allowed: false,
    event_sync_allowed: false,
    event_ingestion_allowed: false,
    can_sync_events: false,
    can_start_relay_transport: false,
    can_enable_event_transport: false,
    can_call_inventory_ingestion: false,
    can_write_event_outbox: false,
    can_write_local_storage: false,
    relay_enforcement_still_required: true,
    ingestion_validation_still_required_per_event: true,
    evidence_projection_only: true,
    accepted_at: acceptedAt,
  };

  return {
    ok: true,
    code: SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_CODE.ACCEPTED,
    validation,
    local_state: localState,
    guardrails: SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_GUARDRAILS,
  };
}

export function getScanOpsHandshakeEvidenceAcceptanceSafeSummary(input = {}) {
  const acceptance = parseJsonMaybe(input) || {};
  const localState = acceptance.local_state || {};
  return {
    ok: acceptance.ok ?? null,
    code: acceptance.code || null,
    local_status: localState.status || null,
    source_device_id: localState.source_device_id || null,
    environment: localState.environment || null,
    store_id: localState.store_id || null,
    inventory_instance_id: localState.inventory_instance_id || null,
    relay_instance_ref: localState.relay_instance_ref || null,
    inventory_handshake_status: localState.inventory_handshake_status || null,
    inventory_handshake_phase: localState.inventory_handshake_phase || null,
    handshake_evidence_closed: localState.handshake_evidence_closed ?? null,
    relay_enforcement_allowed: localState.relay_enforcement_allowed ?? null,
    relay_transport_allowed: localState.relay_transport_allowed ?? null,
    event_transport_allowed: localState.event_transport_allowed ?? null,
    event_sync_allowed: localState.event_sync_allowed ?? null,
    event_ingestion_allowed: localState.event_ingestion_allowed ?? null,
    relay_enforcement_still_required: localState.relay_enforcement_still_required ?? null,
    ingestion_validation_still_required_per_event: localState.ingestion_validation_still_required_per_event ?? null,
    evidence_projection_only: localState.evidence_projection_only ?? null,
    accepted_at: localState.accepted_at || null,
  };
}

export function assertNoScanOpsHandshakeEvidenceAcceptanceOperationalMutation() {
  return SCANOPS_HANDSHAKE_EVIDENCE_ACCEPTANCE_GUARDRAILS;
}
