/**
 * relayReadinessPreflightProjection.js — ScanOps Phase 1D-D-W
 *
 * Builds a local, non-persistent preflight projection after ScanOps has accepted
 * Inventory Phase 1D-D-U relay admission evidence in Phase 1D-D-V.
 *
 * Scope for this phase:
 * - Projection-only and validator-only.
 * - Summarizes whether ScanOps has the minimum contract evidence required to be
 *   ready for a future relay enforcement phase.
 * - Does not start a relay, enforce trust, sync events, write event_outbox,
 *   write localStorage, call Inventory ingestion, write entities, or mutate any
 *   Inventory/POS/order/forecasting state.
 */

import {
  acceptScanOpsInventoryBridgeRelayAdmissionEvidence,
  SCANOPS_RELAY_ADMISSION_LOCAL_STATE,
} from './relayAdmissionEvidenceContract.js';

export const SCANOPS_INVENTORY_BRIDGE_RELAY_READINESS_PREFLIGHT_PHASE = '1D-D-W';
export const SCANOPS_INVENTORY_BRIDGE_RELAY_READINESS_PREFLIGHT_SCHEMA_VERSION = '1.0.0';
export const SCANOPS_INVENTORY_BRIDGE_RELAY_READINESS_PREFLIGHT_CONTRACT_VERSION = '1.0.0';
export const SCANOPS_INVENTORY_BRIDGE_RELAY_READINESS_PREFLIGHT_PROTOCOL_VERSION = '1.0.0';

export const SCANOPS_RELAY_READINESS_PREFLIGHT_STATUS = Object.freeze({
  READY_PENDING_RELAY_ENFORCEMENT: 'READY_PENDING_RELAY_ENFORCEMENT',
  BLOCKED: 'BLOCKED',
});

export const SCANOPS_RELAY_READINESS_PREFLIGHT_CODE = Object.freeze({
  PROJECTED: 'SCANOPS_RELAY_READINESS_PREFLIGHT_PROJECTED',
  BLOCKED: 'SCANOPS_RELAY_READINESS_PREFLIGHT_BLOCKED',
  LOCAL_TRUSTED_STATE_REQUIRED: 'LOCAL_TRUSTED_DEVICE_STATE_REQUIRED',
  RELAY_ADMISSION_EVIDENCE_REQUIRED: 'RELAY_ADMISSION_EVIDENCE_REQUIRED',
  RELAY_ADMISSION_NOT_ACCEPTED: 'RELAY_ADMISSION_EVIDENCE_NOT_ACCEPTED',
  RELAY_ENFORCEMENT_ALREADY_APPLIED: 'RELAY_ENFORCEMENT_ALREADY_APPLIED',
  RELAY_TRANSPORT_ALREADY_STARTED: 'RELAY_TRANSPORT_ALREADY_STARTED',
  EVENT_TRANSPORT_ALREADY_ENABLED: 'EVENT_TRANSPORT_ALREADY_ENABLED',
  EVENT_SYNC_ALREADY_ENABLED: 'EVENT_SYNC_ALREADY_ENABLED',
  EVENT_INGESTION_ALREADY_ALLOWED: 'EVENT_INGESTION_ALREADY_ALLOWED',
});

export const SCANOPS_RELAY_READINESS_PREFLIGHT_GUARDRAILS = Object.freeze({
  scanops_relay_readiness_preflight_projection_only: true,
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

function normalizeLocalTrustedState(input = {}) {
  const state = parseJsonMaybe(input) || {};
  return {
    source_system: state.source_system || 'scanops',
    source_device_id: state.source_device_id || null,
    device_name: state.device_name || null,
    device_type: state.device_type || null,
    app_instance_id: state.app_instance_id || null,
    environment: state.environment || null,
    store_id: state.store_id || null,
    inventory_instance_id: state.inventory_instance_id || null,
    inventory_device_ref: state.inventory_device_ref || null,
    pairing_receipt_id: state.pairing_receipt_id || null,
    local_pairing_state: state.local_pairing_state || null,
    trusted_receipt_present: state.trusted_receipt_present ?? null,
    trusted_for_transport_contract: state.trusted_for_transport_contract ?? null,
    relay_admission_evidence_present: state.relay_admission_evidence_present ?? null,
    relay_admission_state: state.relay_admission_state || null,
    can_sync_events: state.can_sync_events ?? false,
    relay_transport_started: state.relay_transport_started ?? false,
    event_transport_enabled: state.event_transport_enabled ?? false,
    event_ingestion_allowed: state.event_ingestion_allowed ?? false,
  };
}

function blockingCode(blockers = []) {
  const priority = [
    SCANOPS_RELAY_READINESS_PREFLIGHT_CODE.LOCAL_TRUSTED_STATE_REQUIRED,
    SCANOPS_RELAY_READINESS_PREFLIGHT_CODE.RELAY_ADMISSION_EVIDENCE_REQUIRED,
    SCANOPS_RELAY_READINESS_PREFLIGHT_CODE.RELAY_ADMISSION_NOT_ACCEPTED,
    SCANOPS_RELAY_READINESS_PREFLIGHT_CODE.RELAY_ENFORCEMENT_ALREADY_APPLIED,
    SCANOPS_RELAY_READINESS_PREFLIGHT_CODE.RELAY_TRANSPORT_ALREADY_STARTED,
    SCANOPS_RELAY_READINESS_PREFLIGHT_CODE.EVENT_TRANSPORT_ALREADY_ENABLED,
    SCANOPS_RELAY_READINESS_PREFLIGHT_CODE.EVENT_SYNC_ALREADY_ENABLED,
    SCANOPS_RELAY_READINESS_PREFLIGHT_CODE.EVENT_INGESTION_ALREADY_ALLOWED,
  ];

  return priority.find((code) => blockers.some((blocker) => blocker.code === code))
    || SCANOPS_RELAY_READINESS_PREFLIGHT_CODE.BLOCKED;
}

function buildBlockedProjection({ localTrustedState, evidenceAcceptance, blockers, projectedAt }) {
  return {
    ok: false,
    schema_version: SCANOPS_INVENTORY_BRIDGE_RELAY_READINESS_PREFLIGHT_SCHEMA_VERSION,
    phase: SCANOPS_INVENTORY_BRIDGE_RELAY_READINESS_PREFLIGHT_PHASE,
    contract_version: SCANOPS_INVENTORY_BRIDGE_RELAY_READINESS_PREFLIGHT_CONTRACT_VERSION,
    bridge_protocol_version: SCANOPS_INVENTORY_BRIDGE_RELAY_READINESS_PREFLIGHT_PROTOCOL_VERSION,
    code: blockingCode(blockers),
    status: SCANOPS_RELAY_READINESS_PREFLIGHT_STATUS.BLOCKED,
    blockers,
    source_device_id: localTrustedState?.source_device_id || null,
    environment: localTrustedState?.environment || null,
    store_id: localTrustedState?.store_id || null,
    inventory_instance_id: localTrustedState?.inventory_instance_id || null,
    local_trusted_state_present: Boolean(localTrustedState),
    relay_admission_evidence_accepted: Boolean(evidenceAcceptance?.ok),
    relay_enforcement_still_required: true,
    can_start_relay_transport: false,
    can_enable_event_transport: false,
    can_sync_events: false,
    can_call_inventory_ingestion: false,
    event_ingestion_allowed: false,
    ingestion_validation_still_required_per_event: true,
    evidence_projection_only: true,
    projected_at: projectedAt,
    guardrails: SCANOPS_RELAY_READINESS_PREFLIGHT_GUARDRAILS,
  };
}

export function projectScanOpsInventoryBridgeRelayReadinessPreflight(input = {}, options = {}) {
  const localTrustedState = normalizeLocalTrustedState(input.local_trusted_state);
  const projectedAt = options.projected_at || nowIso();
  const blockers = [];

  if (!localTrustedState.source_device_id || !localTrustedState.environment || !localTrustedState.store_id || !localTrustedState.inventory_instance_id) {
    blockers.push({
      code: SCANOPS_RELAY_READINESS_PREFLIGHT_CODE.LOCAL_TRUSTED_STATE_REQUIRED,
      message: 'Local trusted device state is incomplete.',
    });
  }

  if (!input.relay_admission_evidence) {
    blockers.push({
      code: SCANOPS_RELAY_READINESS_PREFLIGHT_CODE.RELAY_ADMISSION_EVIDENCE_REQUIRED,
      message: 'Relay admission evidence is required before readiness preflight can be projected.',
    });
  }

  const evidenceAcceptance = input.relay_admission_evidence
    ? acceptScanOpsInventoryBridgeRelayAdmissionEvidence(input.relay_admission_evidence, localTrustedState, {
        accepted_at: projectedAt,
      })
    : null;

  if (evidenceAcceptance && evidenceAcceptance.ok !== true) {
    blockers.push({
      code: SCANOPS_RELAY_READINESS_PREFLIGHT_CODE.RELAY_ADMISSION_NOT_ACCEPTED,
      message: 'Relay admission evidence was not accepted by the ScanOps Phase 1D-D-V contract.',
      detail_code: evidenceAcceptance.code,
    });
  }

  const acceptedLocalState = evidenceAcceptance?.local_state || null;

  if (acceptedLocalState?.relay_admission_state !== SCANOPS_RELAY_ADMISSION_LOCAL_STATE.ACCEPTED_PENDING_ENFORCEMENT) {
    if (evidenceAcceptance?.ok === true) {
      blockers.push({
        code: SCANOPS_RELAY_READINESS_PREFLIGHT_CODE.RELAY_ADMISSION_NOT_ACCEPTED,
        message: 'Relay admission evidence did not project the expected pending-enforcement state.',
      });
    }
  }

  if (input.relay_enforcement_applied === true || acceptedLocalState?.relay_enforcement_applied === true) {
    blockers.push({
      code: SCANOPS_RELAY_READINESS_PREFLIGHT_CODE.RELAY_ENFORCEMENT_ALREADY_APPLIED,
      message: 'Relay enforcement is outside Phase 1D-D-W scope.',
    });
  }

  if (localTrustedState.relay_transport_started === true || acceptedLocalState?.relay_transport_started === true) {
    blockers.push({
      code: SCANOPS_RELAY_READINESS_PREFLIGHT_CODE.RELAY_TRANSPORT_ALREADY_STARTED,
      message: 'Relay transport must remain stopped in Phase 1D-D-W.',
    });
  }

  if (localTrustedState.event_transport_enabled === true || acceptedLocalState?.event_transport_enabled === true) {
    blockers.push({
      code: SCANOPS_RELAY_READINESS_PREFLIGHT_CODE.EVENT_TRANSPORT_ALREADY_ENABLED,
      message: 'Event transport must remain disabled in Phase 1D-D-W.',
    });
  }

  if (localTrustedState.can_sync_events === true || acceptedLocalState?.can_sync_events === true) {
    blockers.push({
      code: SCANOPS_RELAY_READINESS_PREFLIGHT_CODE.EVENT_SYNC_ALREADY_ENABLED,
      message: 'Event sync must remain disabled in Phase 1D-D-W.',
    });
  }

  if (localTrustedState.event_ingestion_allowed === true || acceptedLocalState?.event_ingestion_allowed === true) {
    blockers.push({
      code: SCANOPS_RELAY_READINESS_PREFLIGHT_CODE.EVENT_INGESTION_ALREADY_ALLOWED,
      message: 'Inventory ingestion must remain disallowed in Phase 1D-D-W.',
    });
  }

  if (blockers.length > 0) {
    return buildBlockedProjection({ localTrustedState, evidenceAcceptance, blockers, projectedAt });
  }

  return {
    ok: true,
    schema_version: SCANOPS_INVENTORY_BRIDGE_RELAY_READINESS_PREFLIGHT_SCHEMA_VERSION,
    phase: SCANOPS_INVENTORY_BRIDGE_RELAY_READINESS_PREFLIGHT_PHASE,
    contract_version: SCANOPS_INVENTORY_BRIDGE_RELAY_READINESS_PREFLIGHT_CONTRACT_VERSION,
    bridge_protocol_version: SCANOPS_INVENTORY_BRIDGE_RELAY_READINESS_PREFLIGHT_PROTOCOL_VERSION,
    code: SCANOPS_RELAY_READINESS_PREFLIGHT_CODE.PROJECTED,
    status: SCANOPS_RELAY_READINESS_PREFLIGHT_STATUS.READY_PENDING_RELAY_ENFORCEMENT,
    blockers: [],
    source_system: localTrustedState.source_system,
    source_device_id: localTrustedState.source_device_id,
    device_name: localTrustedState.device_name,
    device_type: localTrustedState.device_type,
    app_instance_id: localTrustedState.app_instance_id,
    environment: localTrustedState.environment,
    store_id: localTrustedState.store_id,
    inventory_instance_id: localTrustedState.inventory_instance_id,
    inventory_device_ref: localTrustedState.inventory_device_ref,
    pairing_receipt_id: localTrustedState.pairing_receipt_id,
    relay_instance_ref: acceptedLocalState.relay_instance_ref,
    local_trusted_state_present: true,
    trusted_receipt_present: true,
    relay_admission_evidence_present: true,
    relay_admission_evidence_accepted: true,
    relay_admission_state: SCANOPS_RELAY_ADMISSION_LOCAL_STATE.ACCEPTED_PENDING_ENFORCEMENT,
    local_pairing_state: 'READY_FOR_BRIDGE_TRANSPORT_PENDING_RELAY',
    trusted_for_transport_contract: true,
    can_start_relay_transport: false,
    can_enable_event_transport: false,
    can_sync_events: false,
    can_call_inventory_ingestion: false,
    can_write_event_outbox: false,
    can_write_local_storage: false,
    can_mutate_inventory: false,
    can_mutate_stock: false,
    can_mutate_prices: false,
    can_mutate_pos_orders_forecast: false,
    can_mutate_item_master: false,
    relay_enforcement_still_required: true,
    relay_transport_started: false,
    event_transport_enabled: false,
    event_ingestion_allowed: false,
    ingestion_validation_still_required_per_event: true,
    evidence_projection_only: true,
    projected_at: projectedAt,
    guardrails: SCANOPS_RELAY_READINESS_PREFLIGHT_GUARDRAILS,
  };
}

export function getScanOpsInventoryBridgeRelayReadinessPreflightSafeSummary(input = {}) {
  const projection = parseJsonMaybe(input) || {};
  return {
    schema_version: projection.schema_version || null,
    phase: projection.phase || null,
    code: projection.code || null,
    status: projection.status || null,
    source_device_id: projection.source_device_id || null,
    environment: projection.environment || null,
    store_id: projection.store_id || null,
    inventory_instance_id: projection.inventory_instance_id || null,
    relay_instance_ref: projection.relay_instance_ref || null,
    local_trusted_state_present: projection.local_trusted_state_present ?? null,
    relay_admission_evidence_present: projection.relay_admission_evidence_present ?? null,
    relay_admission_evidence_accepted: projection.relay_admission_evidence_accepted ?? null,
    relay_enforcement_still_required: projection.relay_enforcement_still_required ?? null,
    can_start_relay_transport: projection.can_start_relay_transport ?? null,
    can_enable_event_transport: projection.can_enable_event_transport ?? null,
    can_sync_events: projection.can_sync_events ?? null,
    can_call_inventory_ingestion: projection.can_call_inventory_ingestion ?? null,
    event_ingestion_allowed: projection.event_ingestion_allowed ?? null,
    ingestion_validation_still_required_per_event: projection.ingestion_validation_still_required_per_event ?? null,
    evidence_projection_only: projection.evidence_projection_only ?? null,
    blocker_count: Array.isArray(projection.blockers) ? projection.blockers.length : null,
    projected_at: projection.projected_at || null,
  };
}

export function assertNoScanOpsInventoryBridgeRelayReadinessPreflightOperationalMutation() {
  return SCANOPS_RELAY_READINESS_PREFLIGHT_GUARDRAILS;
}
