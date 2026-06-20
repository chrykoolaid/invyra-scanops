/**
 * bridgeGateAcceptance.js — ScanOps Phase 1D-D-AC
 *
 * ScanOps-side acceptance contract for Inventory Phase 1D-D-AB bridge gate
 * projections.
 *
 * Scope for this phase:
 * - Projection-only and validator-only.
 * - Accepts Inventory's locked bridge gate as local, non-persistent evidence
 *   that operational bridge activation remains blocked.
 * - Does not enforce relay trust, start relay transport, enable event transport,
 *   sync events, write event_outbox, write localStorage, call Inventory ingestion,
 *   build UI, or mutate Inventory/POS/order/forecasting state.
 */

export const SCANOPS_INVENTORY_BRIDGE_GATE_ACCEPTANCE_PHASE = '1D-D-AC';
export const SCANOPS_INVENTORY_BRIDGE_GATE_SOURCE_PHASE = '1D-D-AB';
export const SCANOPS_INVENTORY_BRIDGE_GATE_SCHEMA_VERSION = '1.0.0';
export const SCANOPS_INVENTORY_BRIDGE_GATE_CONTRACT_VERSION = '1.0.0';
export const SCANOPS_INVENTORY_BRIDGE_GATE_PROTOCOL_VERSION = '1.0.0';

export const SCANOPS_BRIDGE_GATE_LOCAL_STATE = Object.freeze({
  ACCEPTED_LOCKED_PENDING_EXPLICIT_ENFORCEMENT: 'BRIDGE_GATE_ACCEPTED_LOCKED_PENDING_EXPLICIT_ENFORCEMENT',
  REJECTED: 'BRIDGE_GATE_REJECTED',
});

export const SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE = Object.freeze({
  ACCEPTED: 'SCANOPS_BRIDGE_GATE_ACCEPTED',
  INVALID: 'BRIDGE_GATE_INVALID',
  STATUS_INVALID: 'BRIDGE_GATE_STATUS_INVALID',
  PHASE_MISMATCH: 'BRIDGE_GATE_PHASE_MISMATCH',
  DEVICE_MISMATCH: 'BRIDGE_GATE_DEVICE_MISMATCH',
  ENVIRONMENT_MISMATCH: 'BRIDGE_GATE_ENVIRONMENT_MISMATCH',
  STORE_MISMATCH: 'BRIDGE_GATE_STORE_MISMATCH',
  INSTANCE_MISMATCH: 'BRIDGE_GATE_INSTANCE_MISMATCH',
  GATE_NOT_LOCKED: 'BRIDGE_GATE_NOT_LOCKED',
  ENFORCEMENT_NOT_REQUIRED: 'EXPLICIT_ENFORCEMENT_PHASE_NOT_REQUIRED',
  RELAY_ENFORCEMENT_ALREADY_ALLOWED: 'RELAY_ENFORCEMENT_ALREADY_ALLOWED',
  RELAY_TRANSPORT_ALREADY_ALLOWED: 'RELAY_TRANSPORT_ALREADY_ALLOWED',
  EVENT_TRANSPORT_ALREADY_ALLOWED: 'EVENT_TRANSPORT_ALREADY_ALLOWED',
  EVENT_SYNC_ALREADY_ALLOWED: 'EVENT_SYNC_ALREADY_ALLOWED',
  INGESTION_ALREADY_ALLOWED: 'EVENT_INGESTION_ALREADY_ALLOWED',
  INVENTORY_MUTATION_ALREADY_ALLOWED: 'INVENTORY_MUTATION_ALREADY_ALLOWED',
});

export const SCANOPS_BRIDGE_GATE_REQUIRED_FIELDS = Object.freeze([
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
  'handshake_evidence_closed',
  'bridge_gate_locked',
  'explicit_future_enforcement_phase_required',
  'relay_enforcement_allowed',
  'relay_transport_allowed',
  'event_transport_allowed',
  'event_sync_allowed',
  'event_ingestion_allowed',
  'inventory_mutation_allowed',
  'ingestion_validation_still_required_per_event',
  'evidence_projection_only',
  'projected_at',
]);

export const SCANOPS_BRIDGE_GATE_ACCEPTANCE_GUARDRAILS = Object.freeze({
  scanops_bridge_gate_acceptance_projection_only: true,
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
  explicit_future_enforcement_phase_required: true,
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
    SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.PHASE_MISMATCH,
    SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.DEVICE_MISMATCH,
    SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.ENVIRONMENT_MISMATCH,
    SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.STORE_MISMATCH,
    SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.INSTANCE_MISMATCH,
    SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.STATUS_INVALID,
    SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.GATE_NOT_LOCKED,
    SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.ENFORCEMENT_NOT_REQUIRED,
    SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.RELAY_ENFORCEMENT_ALREADY_ALLOWED,
    SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.RELAY_TRANSPORT_ALREADY_ALLOWED,
    SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.EVENT_TRANSPORT_ALREADY_ALLOWED,
    SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.EVENT_SYNC_ALREADY_ALLOWED,
    SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.INGESTION_ALREADY_ALLOWED,
    SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.INVENTORY_MUTATION_ALREADY_ALLOWED,
  ];

  return priority.find((code) => errors.includes(code)) || SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.INVALID;
}

export function validateScanOpsBridgeGate(input = {}, localScopeInput = {}) {
  const gate = parseJsonMaybe(input);
  const localScope = normalizeLocalScope(localScopeInput);
  const errors = [];

  if (!gate || typeof gate !== 'object' || Array.isArray(gate)) {
    return {
      ok: false,
      code: SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.INVALID,
      errors: ['Bridge gate must be an object or JSON string.'],
      gate: null,
      local_scope: localScope,
    };
  }

  for (const field of SCANOPS_BRIDGE_GATE_REQUIRED_FIELDS) {
    if (gate[field] === null || gate[field] === undefined || gate[field] === '') {
      errors.push(`Missing ${field}.`);
    }
  }

  if (gate.schema_version !== SCANOPS_INVENTORY_BRIDGE_GATE_SCHEMA_VERSION) {
    errors.push('schema_version mismatch.');
  }

  if (gate.phase !== SCANOPS_INVENTORY_BRIDGE_GATE_SOURCE_PHASE) {
    errors.push(SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.PHASE_MISMATCH);
  }

  if (gate.contract_version !== SCANOPS_INVENTORY_BRIDGE_GATE_CONTRACT_VERSION) {
    errors.push(SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.PHASE_MISMATCH);
  }

  if (gate.bridge_protocol_version !== SCANOPS_INVENTORY_BRIDGE_GATE_PROTOCOL_VERSION) {
    errors.push(SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.PHASE_MISMATCH);
  }

  if (localScope.source_device_id && gate.source_device_id !== localScope.source_device_id) {
    errors.push(SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.DEVICE_MISMATCH);
  }

  if (localScope.environment && gate.environment !== localScope.environment) {
    errors.push(SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.ENVIRONMENT_MISMATCH);
  }

  if (localScope.store_id && gate.store_id !== localScope.store_id) {
    errors.push(SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.STORE_MISMATCH);
  }

  if (localScope.inventory_instance_id && gate.inventory_instance_id !== localScope.inventory_instance_id) {
    errors.push(SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.INSTANCE_MISMATCH);
  }

  if (gate.code !== 'INVENTORY_BRIDGE_GATE_PROJECTED') {
    errors.push(SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.STATUS_INVALID);
  }

  if (gate.status !== 'BRIDGE_GATE_LOCKED_PENDING_EXPLICIT_ENFORCEMENT') {
    errors.push(SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.STATUS_INVALID);
  }

  if (gate.bridge_gate_locked !== true) {
    errors.push(SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.GATE_NOT_LOCKED);
  }

  if (gate.explicit_future_enforcement_phase_required !== true) {
    errors.push(SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.ENFORCEMENT_NOT_REQUIRED);
  }

  if (gate.relay_enforcement_allowed !== false) {
    errors.push(SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.RELAY_ENFORCEMENT_ALREADY_ALLOWED);
  }

  if (gate.relay_transport_allowed !== false) {
    errors.push(SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.RELAY_TRANSPORT_ALREADY_ALLOWED);
  }

  if (gate.event_transport_allowed !== false) {
    errors.push(SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.EVENT_TRANSPORT_ALREADY_ALLOWED);
  }

  if (gate.event_sync_allowed !== false) {
    errors.push(SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.EVENT_SYNC_ALREADY_ALLOWED);
  }

  if (gate.event_ingestion_allowed !== false) {
    errors.push(SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.INGESTION_ALREADY_ALLOWED);
  }

  if (gate.inventory_mutation_allowed !== false) {
    errors.push(SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.INVENTORY_MUTATION_ALREADY_ALLOWED);
  }

  if (gate.ingestion_validation_still_required_per_event !== true) {
    errors.push('ingestion validation must remain required per future event.');
  }

  if (gate.evidence_projection_only !== true) {
    errors.push('bridge gate must remain projection-only.');
  }

  return {
    ok: errors.length === 0,
    code: errors.length === 0 ? 'BRIDGE_GATE_VALID' : errorCode(errors),
    errors,
    gate,
    local_scope: localScope,
  };
}

export function acceptScanOpsBridgeGate(input = {}, localScopeInput = {}, options = {}) {
  const validation = validateScanOpsBridgeGate(input, localScopeInput);
  const acceptedAt = options.accepted_at || nowIso();

  if (!validation.ok) {
    return {
      ok: false,
      code: validation.code,
      validation,
      local_state: {
        status: SCANOPS_BRIDGE_GATE_LOCAL_STATE.REJECTED,
        bridge_gate_locked: true,
        relay_enforcement_allowed: false,
        relay_transport_allowed: false,
        event_transport_allowed: false,
        event_sync_allowed: false,
        event_ingestion_allowed: false,
      },
      guardrails: SCANOPS_BRIDGE_GATE_ACCEPTANCE_GUARDRAILS,
    };
  }

  const gate = validation.gate;
  const localState = {
    status: SCANOPS_BRIDGE_GATE_LOCAL_STATE.ACCEPTED_LOCKED_PENDING_EXPLICIT_ENFORCEMENT,
    source_device_id: gate.source_device_id,
    environment: gate.environment,
    store_id: gate.store_id,
    inventory_instance_id: gate.inventory_instance_id,
    relay_instance_ref: gate.relay_instance_ref || validation.local_scope.relay_instance_ref || null,
    inventory_gate_phase: gate.phase,
    inventory_gate_status: gate.status,
    bridge_gate_locked: true,
    explicit_future_enforcement_phase_required: true,
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
    ingestion_validation_still_required_per_event: true,
    evidence_projection_only: true,
    accepted_at: acceptedAt,
  };

  return {
    ok: true,
    code: SCANOPS_BRIDGE_GATE_ACCEPTANCE_CODE.ACCEPTED,
    validation,
    local_state: localState,
    guardrails: SCANOPS_BRIDGE_GATE_ACCEPTANCE_GUARDRAILS,
  };
}

export function getScanOpsBridgeGateAcceptanceSafeSummary(input = {}) {
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
    inventory_gate_status: localState.inventory_gate_status || null,
    bridge_gate_locked: localState.bridge_gate_locked ?? null,
    explicit_future_enforcement_phase_required: localState.explicit_future_enforcement_phase_required ?? null,
    relay_enforcement_allowed: localState.relay_enforcement_allowed ?? null,
    relay_transport_allowed: localState.relay_transport_allowed ?? null,
    event_transport_allowed: localState.event_transport_allowed ?? null,
    event_sync_allowed: localState.event_sync_allowed ?? null,
    event_ingestion_allowed: localState.event_ingestion_allowed ?? null,
    ingestion_validation_still_required_per_event: localState.ingestion_validation_still_required_per_event ?? null,
    evidence_projection_only: localState.evidence_projection_only ?? null,
    accepted_at: localState.accepted_at || null,
  };
}

export function assertNoScanOpsBridgeGateAcceptanceOperationalMutation() {
  return SCANOPS_BRIDGE_GATE_ACCEPTANCE_GUARDRAILS;
}
