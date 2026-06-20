/**
 * relayEnforcementCandidateAcceptance.js — ScanOps Phase 1D-D-Y
 *
 * ScanOps-side acceptance contract for Inventory Phase 1D-D-X relay enforcement
 * candidate projections.
 *
 * Scope for this phase:
 * - Projection-only and validator-only.
 * - Accepts an Inventory relay enforcement candidate as evidence that Inventory
 *   has recognized ScanOps readiness for a future relay enforcement phase.
 * - Does not enforce relay trust, start relay transport, enable event transport,
 *   sync events, write event_outbox, write localStorage, call Inventory ingestion,
 *   build UI, or mutate Inventory/POS/order/forecasting state.
 */

export const SCANOPS_INVENTORY_BRIDGE_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_PHASE = '1D-D-Y';
export const SCANOPS_INVENTORY_BRIDGE_RELAY_ENFORCEMENT_CANDIDATE_SOURCE_STATUS = 'RELAY_ENFORCEMENT_CANDIDATE_PROJECTED_PENDING_ENFORCEMENT';
export const SCANOPS_INVENTORY_BRIDGE_RELAY_ENFORCEMENT_CANDIDATE_SCHEMA_VERSION = '1.0.0';
export const SCANOPS_INVENTORY_BRIDGE_RELAY_ENFORCEMENT_CANDIDATE_CONTRACT_VERSION = '1.0.0';
export const SCANOPS_INVENTORY_BRIDGE_RELAY_ENFORCEMENT_CANDIDATE_PROTOCOL_VERSION = '1.0.0';

export const SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_LOCAL_STATE = Object.freeze({
  ACCEPTED_PENDING_FUTURE_RELAY_ENFORCEMENT: 'RELAY_ENFORCEMENT_CANDIDATE_ACCEPTED_PENDING_FUTURE_RELAY_ENFORCEMENT',
  REJECTED: 'RELAY_ENFORCEMENT_CANDIDATE_REJECTED',
});

export const SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE = Object.freeze({
  ACCEPTED: 'SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTED',
  INVALID: 'RELAY_ENFORCEMENT_CANDIDATE_INVALID',
  STATUS_INVALID: 'RELAY_ENFORCEMENT_CANDIDATE_STATUS_INVALID',
  DEVICE_MISMATCH: 'RELAY_ENFORCEMENT_CANDIDATE_DEVICE_MISMATCH',
  ENVIRONMENT_MISMATCH: 'RELAY_ENFORCEMENT_CANDIDATE_ENVIRONMENT_MISMATCH',
  STORE_MISMATCH: 'RELAY_ENFORCEMENT_CANDIDATE_STORE_MISMATCH',
  INSTANCE_MISMATCH: 'RELAY_ENFORCEMENT_CANDIDATE_INSTANCE_MISMATCH',
  PHASE_MISMATCH: 'RELAY_ENFORCEMENT_CANDIDATE_PHASE_MISMATCH',
  ENFORCEMENT_ALREADY_ALLOWED: 'RELAY_ENFORCEMENT_ALREADY_ALLOWED',
  RELAY_TRANSPORT_ALREADY_ALLOWED: 'RELAY_TRANSPORT_ALREADY_ALLOWED',
  EVENT_TRANSPORT_ALREADY_ALLOWED: 'EVENT_TRANSPORT_ALREADY_ALLOWED',
  EVENT_SYNC_ALREADY_ALLOWED: 'EVENT_SYNC_ALREADY_ALLOWED',
  INGESTION_ALREADY_ALLOWED: 'EVENT_INGESTION_ALREADY_ALLOWED',
  INVENTORY_MUTATION_ALREADY_ALLOWED: 'INVENTORY_MUTATION_ALREADY_ALLOWED',
});

export const SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_REQUIRED_FIELDS = Object.freeze([
  'status',
  'source_device_id',
  'environment',
  'store_id',
  'inventory_instance_id',
  'scanops_preflight_phase',
  'relay_readiness_preflight_accepted',
  'relay_enforcement_allowed',
  'relay_transport_allowed',
  'event_transport_allowed',
  'event_sync_allowed',
  'event_ingestion_allowed',
  'inventory_mutation_allowed',
  'relay_enforcement_still_required',
  'ingestion_validation_still_required_per_event',
  'evidence_projection_only',
  'accepted_at',
]);

export const SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_GUARDRAILS = Object.freeze({
  scanops_relay_enforcement_candidate_acceptance_projection_only: true,
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
    SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.PHASE_MISMATCH,
    SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.DEVICE_MISMATCH,
    SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.ENVIRONMENT_MISMATCH,
    SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.STORE_MISMATCH,
    SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.INSTANCE_MISMATCH,
    SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.STATUS_INVALID,
    SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.ENFORCEMENT_ALREADY_ALLOWED,
    SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.RELAY_TRANSPORT_ALREADY_ALLOWED,
    SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.EVENT_TRANSPORT_ALREADY_ALLOWED,
    SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.EVENT_SYNC_ALREADY_ALLOWED,
    SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.INGESTION_ALREADY_ALLOWED,
    SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.INVENTORY_MUTATION_ALREADY_ALLOWED,
  ];

  return priority.find((code) => errors.includes(code))
    || SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.INVALID;
}

export function validateScanOpsRelayEnforcementCandidate(input = {}, localScopeInput = {}) {
  const candidate = parseJsonMaybe(input);
  const localScope = normalizeLocalScope(localScopeInput);
  const errors = [];

  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return {
      ok: false,
      code: SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.INVALID,
      errors: ['Relay enforcement candidate must be an object or JSON string.'],
      candidate: null,
      local_scope: localScope,
    };
  }

  for (const field of SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_REQUIRED_FIELDS) {
    if (candidate[field] === null || candidate[field] === undefined || candidate[field] === '') {
      errors.push(`Missing ${field}.`);
    }
  }

  if (candidate.status !== SCANOPS_INVENTORY_BRIDGE_RELAY_ENFORCEMENT_CANDIDATE_SOURCE_STATUS) {
    errors.push(SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.STATUS_INVALID);
  }

  if (candidate.scanops_preflight_phase !== '1D-D-W') {
    errors.push(SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.PHASE_MISMATCH);
  }

  if (localScope.source_device_id && candidate.source_device_id !== localScope.source_device_id) {
    errors.push(SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.DEVICE_MISMATCH);
  }

  if (localScope.environment && candidate.environment !== localScope.environment) {
    errors.push(SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.ENVIRONMENT_MISMATCH);
  }

  if (localScope.store_id && candidate.store_id !== localScope.store_id) {
    errors.push(SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.STORE_MISMATCH);
  }

  if (localScope.inventory_instance_id && candidate.inventory_instance_id !== localScope.inventory_instance_id) {
    errors.push(SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.INSTANCE_MISMATCH);
  }

  if (candidate.relay_readiness_preflight_accepted !== true) {
    errors.push(SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.STATUS_INVALID);
  }

  if (candidate.relay_enforcement_allowed !== false || candidate.relay_enforcement_still_required !== true) {
    errors.push(SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.ENFORCEMENT_ALREADY_ALLOWED);
  }

  if (candidate.relay_transport_allowed !== false) {
    errors.push(SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.RELAY_TRANSPORT_ALREADY_ALLOWED);
  }

  if (candidate.event_transport_allowed !== false) {
    errors.push(SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.EVENT_TRANSPORT_ALREADY_ALLOWED);
  }

  if (candidate.event_sync_allowed !== false) {
    errors.push(SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.EVENT_SYNC_ALREADY_ALLOWED);
  }

  if (candidate.event_ingestion_allowed !== false) {
    errors.push(SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.INGESTION_ALREADY_ALLOWED);
  }

  if (candidate.inventory_mutation_allowed !== false) {
    errors.push(SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.INVENTORY_MUTATION_ALREADY_ALLOWED);
  }

  if (candidate.ingestion_validation_still_required_per_event !== true) {
    errors.push('ingestion validation must remain required per future event.');
  }

  if (candidate.evidence_projection_only !== true) {
    errors.push('relay enforcement candidate must remain projection-only.');
  }

  return {
    ok: errors.length === 0,
    code: errors.length === 0
      ? 'RELAY_ENFORCEMENT_CANDIDATE_VALID'
      : errorCode(errors),
    errors,
    candidate,
    local_scope: localScope,
  };
}

export function acceptScanOpsRelayEnforcementCandidate(input = {}, localScopeInput = {}, options = {}) {
  const validation = validateScanOpsRelayEnforcementCandidate(input, localScopeInput);
  const acceptedAt = options.accepted_at || nowIso();

  if (!validation.ok) {
    return {
      ok: false,
      code: validation.code,
      validation,
      local_state: {
        status: SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_LOCAL_STATE.REJECTED,
        relay_enforcement_allowed: false,
        relay_transport_allowed: false,
        event_transport_allowed: false,
        event_sync_allowed: false,
        event_ingestion_allowed: false,
      },
      guardrails: SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_GUARDRAILS,
    };
  }

  const candidate = validation.candidate;
  const localState = {
    status: SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_LOCAL_STATE.ACCEPTED_PENDING_FUTURE_RELAY_ENFORCEMENT,
    source_device_id: candidate.source_device_id,
    environment: candidate.environment,
    store_id: candidate.store_id,
    inventory_instance_id: candidate.inventory_instance_id,
    relay_instance_ref: candidate.relay_instance_ref || validation.local_scope.relay_instance_ref || null,
    inventory_candidate_status: candidate.status,
    scanops_preflight_phase: candidate.scanops_preflight_phase,
    relay_readiness_preflight_accepted: true,
    relay_enforcement_candidate_accepted: true,
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
    code: SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_CODE.ACCEPTED,
    validation,
    local_state: localState,
    guardrails: SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_GUARDRAILS,
  };
}

export function getScanOpsRelayEnforcementCandidateAcceptanceSafeSummary(input = {}) {
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
    inventory_candidate_status: localState.inventory_candidate_status || null,
    scanops_preflight_phase: localState.scanops_preflight_phase || null,
    relay_readiness_preflight_accepted: localState.relay_readiness_preflight_accepted ?? null,
    relay_enforcement_candidate_accepted: localState.relay_enforcement_candidate_accepted ?? null,
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

export function assertNoScanOpsRelayEnforcementCandidateAcceptanceOperationalMutation() {
  return SCANOPS_RELAY_ENFORCEMENT_CANDIDATE_ACCEPTANCE_GUARDRAILS;
}
