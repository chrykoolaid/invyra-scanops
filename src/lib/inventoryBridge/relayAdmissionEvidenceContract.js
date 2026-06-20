/**
 * relayAdmissionEvidenceContract.js — ScanOps Phase 1D-D-V
 *
 * ScanOps-side acceptance contract for Inventory Phase 1D-D-U relay admission
 * evidence.
 *
 * Scope for this phase:
 * - Local validator/projection only.
 * - Accepts an Inventory relay admission evidence envelope into a non-persistent
 *   local readiness projection.
 * - Does not write localStorage, mutate event_outbox, sync events, enforce relay
 *   trust, start transport, call Inventory ingestion, build UI, or mutate
 *   Inventory state.
 *
 * Hard guardrails:
 * - Inventory relay admission evidence is not live relay access.
 * - Transport trust does not equal ingestion trust.
 * - Event ingestion validation remains required per future event.
 */

export const SCANOPS_INVENTORY_BRIDGE_RELAY_ADMISSION_ACCEPTANCE_PHASE = '1D-D-V';
export const SCANOPS_INVENTORY_BRIDGE_RELAY_ADMISSION_SOURCE_EVIDENCE_PHASE = '1D-D-U';
export const SCANOPS_INVENTORY_BRIDGE_RELAY_ADMISSION_SCHEMA_VERSION = '1.0.0';
export const SCANOPS_INVENTORY_BRIDGE_RELAY_ADMISSION_CONTRACT_VERSION = '1.0.0';
export const SCANOPS_INVENTORY_BRIDGE_RELAY_ADMISSION_PROTOCOL_VERSION = '1.0.0';

export const SCANOPS_RELAY_ADMISSION_LOCAL_STATE = Object.freeze({
  ACCEPTED_PENDING_ENFORCEMENT: 'RELAY_ADMISSION_EVIDENCE_ACCEPTED_PENDING_ENFORCEMENT',
  REJECTED: 'RELAY_ADMISSION_EVIDENCE_REJECTED',
});

export const SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE = Object.freeze({
  ACCEPTED: 'SCANOPS_RELAY_ADMISSION_EVIDENCE_ACCEPTED',
  INVALID: 'RELAY_ADMISSION_EVIDENCE_INVALID',
  NOT_ALLOWED: 'RELAY_ADMISSION_EVIDENCE_NOT_ALLOWED',
  DECISION_NOT_TRUSTED: 'RELAY_ADMISSION_DECISION_NOT_TRUSTED',
  PROTOCOL_MISMATCH: 'PAIRING_PROTOCOL_MISMATCH',
  DEVICE_MISMATCH: 'PAIRING_DEVICE_MISMATCH',
  ENVIRONMENT_MISMATCH: 'PAIRING_ENVIRONMENT_MISMATCH',
  STORE_MISMATCH: 'PAIRING_STORE_MISMATCH',
  INSTANCE_MISMATCH: 'PAIRING_INSTANCE_MISMATCH',
  ENFORCEMENT_ALREADY_APPLIED: 'RELAY_ENFORCEMENT_ALREADY_APPLIED',
  RELAY_TRANSPORT_ALREADY_STARTED: 'RELAY_TRANSPORT_ALREADY_STARTED',
  EVENT_TRANSPORT_ALREADY_ENABLED: 'EVENT_TRANSPORT_ALREADY_ENABLED',
  EVENT_INGESTION_ALREADY_ALLOWED: 'EVENT_INGESTION_ALREADY_ALLOWED',
});

export const SCANOPS_RELAY_ADMISSION_REQUIRED_EVIDENCE_FIELDS = Object.freeze([
  'schema_version',
  'phase',
  'bridge_protocol_version',
  'pairing_contract_version',
  'source_system',
  'source_device_id',
  'environment',
  'store_id',
  'inventory_instance_id',
  'relay_decision_code',
  'allowed_for_bridge_transport',
  'relay_enforcement_applied',
  'relay_transport_started',
  'event_transport_enabled',
  'event_ingestion_allowed',
  'ingestion_validation_still_required_per_event',
  'evidence_projection_only',
  'projected_at',
]);

export const SCANOPS_RELAY_ADMISSION_ACCEPTANCE_GUARDRAILS = Object.freeze({
  scanops_relay_admission_acceptance_projection_only: true,
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

function normalizeLocalProfile(input = {}) {
  const profile = parseJsonMaybe(input) || {};
  return {
    source_system: profile.source_system || 'scanops',
    source_device_id: profile.source_device_id || null,
    device_name: profile.device_name || null,
    device_type: profile.device_type || null,
    app_instance_id: profile.app_instance_id || null,
    environment: profile.environment || null,
    store_id: profile.store_id || null,
    inventory_instance_id: profile.inventory_instance_id || null,
    inventory_device_ref: profile.inventory_device_ref || null,
    pairing_receipt_id: profile.pairing_receipt_id || null,
    local_pairing_state: profile.local_pairing_state || null,
  };
}

function evidenceErrorCode(errors = []) {
  const priority = [
    SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE.PROTOCOL_MISMATCH,
    SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE.DEVICE_MISMATCH,
    SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE.ENVIRONMENT_MISMATCH,
    SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE.STORE_MISMATCH,
    SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE.INSTANCE_MISMATCH,
    SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE.ENFORCEMENT_ALREADY_APPLIED,
    SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE.RELAY_TRANSPORT_ALREADY_STARTED,
    SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE.EVENT_TRANSPORT_ALREADY_ENABLED,
    SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE.EVENT_INGESTION_ALREADY_ALLOWED,
    SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE.NOT_ALLOWED,
    SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE.DECISION_NOT_TRUSTED,
  ];

  return priority.find((code) => errors.includes(code)) || SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE.INVALID;
}

export function validateScanOpsInventoryBridgeRelayAdmissionEvidence(input = {}, localProfileInput = {}) {
  const evidence = parseJsonMaybe(input);
  const localProfile = normalizeLocalProfile(localProfileInput);
  const errors = [];

  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    return {
      ok: false,
      code: SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE.INVALID,
      errors: ['Evidence must be an object or JSON string.'],
      evidence: null,
      local_profile: localProfile,
    };
  }

  for (const field of SCANOPS_RELAY_ADMISSION_REQUIRED_EVIDENCE_FIELDS) {
    if (evidence[field] === null || evidence[field] === undefined || evidence[field] === '') {
      errors.push(`Missing ${field}.`);
    }
  }

  if (evidence.schema_version !== SCANOPS_INVENTORY_BRIDGE_RELAY_ADMISSION_SCHEMA_VERSION) {
    errors.push('schema_version mismatch.');
  }

  if (evidence.phase !== SCANOPS_INVENTORY_BRIDGE_RELAY_ADMISSION_SOURCE_EVIDENCE_PHASE) {
    errors.push('relay admission evidence phase mismatch.');
  }

  if (evidence.bridge_protocol_version !== SCANOPS_INVENTORY_BRIDGE_RELAY_ADMISSION_PROTOCOL_VERSION) {
    errors.push(SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE.PROTOCOL_MISMATCH);
  }

  if (evidence.pairing_contract_version !== SCANOPS_INVENTORY_BRIDGE_RELAY_ADMISSION_CONTRACT_VERSION) {
    errors.push(SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE.PROTOCOL_MISMATCH);
  }

  if (evidence.source_system !== 'scanops') {
    errors.push('source_system must be scanops.');
  }

  if (evidence.source_device_id !== localProfile.source_device_id) {
    errors.push(SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE.DEVICE_MISMATCH);
  }

  if (evidence.environment !== localProfile.environment) {
    errors.push(SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE.ENVIRONMENT_MISMATCH);
  }

  if (evidence.store_id !== localProfile.store_id) {
    errors.push(SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE.STORE_MISMATCH);
  }

  if (evidence.inventory_instance_id !== localProfile.inventory_instance_id) {
    errors.push(SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE.INSTANCE_MISMATCH);
  }

  if (evidence.relay_decision_code !== 'DEVICE_TRUSTED') {
    errors.push(SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE.DECISION_NOT_TRUSTED);
  }

  if (evidence.allowed_for_bridge_transport !== true) {
    errors.push(SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE.NOT_ALLOWED);
  }

  if (evidence.relay_enforcement_applied !== false) {
    errors.push(SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE.ENFORCEMENT_ALREADY_APPLIED);
  }

  if (evidence.relay_transport_started !== false) {
    errors.push(SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE.RELAY_TRANSPORT_ALREADY_STARTED);
  }

  if (evidence.event_transport_enabled !== false) {
    errors.push(SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE.EVENT_TRANSPORT_ALREADY_ENABLED);
  }

  if (evidence.event_ingestion_allowed !== false) {
    errors.push(SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE.EVENT_INGESTION_ALREADY_ALLOWED);
  }

  if (evidence.ingestion_validation_still_required_per_event !== true) {
    errors.push('ingestion validation must remain required per event.');
  }

  if (evidence.evidence_projection_only !== true) {
    errors.push('relay admission evidence must remain projection-only.');
  }

  return {
    ok: errors.length === 0,
    code: errors.length === 0
      ? 'RELAY_ADMISSION_EVIDENCE_VALID'
      : evidenceErrorCode(errors),
    errors,
    evidence,
    local_profile: localProfile,
  };
}

export function acceptScanOpsInventoryBridgeRelayAdmissionEvidence(input = {}, localProfileInput = {}, options = {}) {
  const validation = validateScanOpsInventoryBridgeRelayAdmissionEvidence(input, localProfileInput);
  if (!validation.ok) {
    return {
      ok: false,
      code: validation.code,
      validation,
      local_state: null,
      guardrails: SCANOPS_RELAY_ADMISSION_ACCEPTANCE_GUARDRAILS,
    };
  }

  const evidence = validation.evidence;
  const localProfile = validation.local_profile;
  const acceptedAt = options.accepted_at || nowIso();
  const localState = {
    source_system: localProfile.source_system,
    source_device_id: localProfile.source_device_id,
    device_name: localProfile.device_name,
    device_type: localProfile.device_type,
    app_instance_id: localProfile.app_instance_id,
    environment: localProfile.environment,
    store_id: localProfile.store_id,
    inventory_instance_id: localProfile.inventory_instance_id,
    inventory_device_ref: localProfile.inventory_device_ref,
    pairing_receipt_id: localProfile.pairing_receipt_id,
    relay_instance_ref: evidence.relay_instance_ref || null,
    relay_admission_evidence_phase: evidence.phase,
    relay_admission_evidence_projected_at: evidence.projected_at,
    relay_admission_state: SCANOPS_RELAY_ADMISSION_LOCAL_STATE.ACCEPTED_PENDING_ENFORCEMENT,
    local_pairing_state: 'READY_FOR_BRIDGE_TRANSPORT_PENDING_RELAY',
    trusted_receipt_present: true,
    relay_admission_evidence_present: true,
    trusted_for_transport_contract: true,
    can_sync_events: false,
    can_use_relay_as_trusted_device: false,
    relay_enforcement_still_required: true,
    relay_transport_started: false,
    event_transport_enabled: false,
    event_ingestion_allowed: false,
    ingestion_validation_still_required_per_event: true,
    no_local_storage_write: true,
    no_event_sync: true,
    no_event_transport: true,
    no_relay_enforcement: true,
    accepted_at: acceptedAt,
  };

  return {
    ok: true,
    code: SCANOPS_RELAY_ADMISSION_ACCEPTANCE_CODE.ACCEPTED,
    validation,
    local_state: localState,
    guardrails: SCANOPS_RELAY_ADMISSION_ACCEPTANCE_GUARDRAILS,
  };
}

export function getScanOpsInventoryBridgeRelayAdmissionEvidenceSafeSummary(input = {}) {
  const evidence = parseJsonMaybe(input) || {};
  return {
    schema_version: evidence.schema_version || null,
    phase: evidence.phase || null,
    bridge_protocol_version: evidence.bridge_protocol_version || null,
    pairing_contract_version: evidence.pairing_contract_version || null,
    source_system: evidence.source_system || null,
    source_device_id: evidence.source_device_id || null,
    environment: evidence.environment || null,
    store_id: evidence.store_id || null,
    inventory_instance_id: evidence.inventory_instance_id || null,
    relay_instance_ref: evidence.relay_instance_ref || null,
    relay_decision_code: evidence.relay_decision_code || null,
    allowed_for_bridge_transport: evidence.allowed_for_bridge_transport ?? null,
    relay_enforcement_applied: evidence.relay_enforcement_applied ?? null,
    relay_transport_started: evidence.relay_transport_started ?? null,
    event_transport_enabled: evidence.event_transport_enabled ?? null,
    event_ingestion_allowed: evidence.event_ingestion_allowed ?? null,
    ingestion_validation_still_required_per_event: evidence.ingestion_validation_still_required_per_event ?? null,
    evidence_projection_only: evidence.evidence_projection_only ?? null,
    projected_at: evidence.projected_at || null,
  };
}

export function assertNoScanOpsInventoryBridgeRelayAdmissionAcceptanceOperationalMutation() {
  return SCANOPS_RELAY_ADMISSION_ACCEPTANCE_GUARDRAILS;
}
