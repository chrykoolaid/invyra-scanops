/**
 * pairingContract.js — ScanOps Phase 1D-D-H
 *
 * ScanOps-side pairing request contract mirror for the ScanOps ↔ Inventory
 * Bridge v1 pairing flow.
 *
 * Scope for this phase:
 * - Local contract helpers only.
 * - Builds and validates ScanOps pairing request shapes that Inventory can
 *   understand later.
 * - Does not send pairing requests, create device approvals, enforce relay
 *   trust, write entities, sync events, build UI, or mutate Inventory state.
 *
 * Hard guardrails:
 * - Transport trust does not equal ingestion trust.
 * - Pairing only controls future bridge transport eligibility.
 * - Every ScanOps event must still pass Inventory ingestion validation later.
 * - Base44 prototype transport remains a cloud relay, not a local LAN bridge.
 */

export const SCANOPS_INVENTORY_BRIDGE_PAIRING_PHASE = '1D-D-H';
export const SCANOPS_INVENTORY_BRIDGE_PAIRING_CONTRACT_VERSION = '1.0.0';
export const SCANOPS_INVENTORY_BRIDGE_PROTOCOL_VERSION = '1.0.0';
export const SCANOPS_INVENTORY_BRIDGE_SOURCE_SYSTEM = 'scanops';

export const SCANOPS_INVENTORY_BRIDGE_ENVIRONMENT = Object.freeze({
  LIVE: 'LIVE',
  TRAINING: 'TRAINING',
  TEST: 'TEST',
});

export const SCANOPS_INVENTORY_BRIDGE_PAIRING_METHOD = Object.freeze({
  QR_CODE: 'QR_CODE',
  MANUAL_IP: 'MANUAL_IP',
  ADMIN_PROVISIONED: 'ADMIN_PROVISIONED',
});

export const SCANOPS_INVENTORY_BRIDGE_DEVICE_TYPE = Object.freeze({
  HANDHELD_SCANNER: 'HANDHELD_SCANNER',
  TABLET: 'TABLET',
  DESKTOP: 'DESKTOP',
  UNKNOWN: 'UNKNOWN',
});

export const SCANOPS_INVENTORY_BRIDGE_PAIRING_RESULT_CODE = Object.freeze({
  PAIRING_REQUEST_VALID: 'PAIRING_REQUEST_VALID',
  PAIRING_REQUEST_INVALID: 'PAIRING_REQUEST_INVALID',
  PAIRING_PROTOCOL_MISMATCH: 'PAIRING_PROTOCOL_MISMATCH',
  PAIRING_ENVIRONMENT_MISMATCH: 'PAIRING_ENVIRONMENT_MISMATCH',
});

export const SCANOPS_INVENTORY_BRIDGE_PAIRING_REQUIRED_FIELDS = Object.freeze([
  'bridge_protocol_version',
  'pairing_contract_version',
  'source_system',
  'source_device_id',
  'device_name',
  'device_type',
  'environment',
  'requested_at',
  'pairing_method',
]);

function nowIso() {
  return new Date().toISOString();
}

function parseDateMs(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function isKnown(value, enumObject) {
  return Object.values(enumObject).includes(value);
}

function normalizeEnvironment(environment) {
  const value = String(environment || SCANOPS_INVENTORY_BRIDGE_ENVIRONMENT.LIVE).toUpperCase();
  return isKnown(value, SCANOPS_INVENTORY_BRIDGE_ENVIRONMENT)
    ? value
    : SCANOPS_INVENTORY_BRIDGE_ENVIRONMENT.LIVE;
}

function normalizePairingMethod(pairingMethod) {
  const value = String(pairingMethod || SCANOPS_INVENTORY_BRIDGE_PAIRING_METHOD.QR_CODE).toUpperCase();
  return isKnown(value, SCANOPS_INVENTORY_BRIDGE_PAIRING_METHOD)
    ? value
    : SCANOPS_INVENTORY_BRIDGE_PAIRING_METHOD.QR_CODE;
}

function normalizeDeviceType(deviceType) {
  const value = String(deviceType || SCANOPS_INVENTORY_BRIDGE_DEVICE_TYPE.HANDHELD_SCANNER).toUpperCase();
  return isKnown(value, SCANOPS_INVENTORY_BRIDGE_DEVICE_TYPE)
    ? value
    : SCANOPS_INVENTORY_BRIDGE_DEVICE_TYPE.UNKNOWN;
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

function redact(value) {
  if (!value) return null;
  const text = String(value);
  if (text.length <= 8) return '••••';
  return `${text.slice(0, 4)}••••${text.slice(-4)}`;
}

function classifyPairingValidationCode(errors) {
  if (!errors.length) return SCANOPS_INVENTORY_BRIDGE_PAIRING_RESULT_CODE.PAIRING_REQUEST_VALID;
  if (errors.some((error) => error.includes('Environment mismatch'))) {
    return SCANOPS_INVENTORY_BRIDGE_PAIRING_RESULT_CODE.PAIRING_ENVIRONMENT_MISMATCH;
  }
  if (errors.some((error) => error.includes('protocol mismatch') || error.includes('contract mismatch'))) {
    return SCANOPS_INVENTORY_BRIDGE_PAIRING_RESULT_CODE.PAIRING_PROTOCOL_MISMATCH;
  }
  return SCANOPS_INVENTORY_BRIDGE_PAIRING_RESULT_CODE.PAIRING_REQUEST_INVALID;
}

export function buildScanOpsInventoryBridgePairingRequest(overrides = {}) {
  return {
    bridge_protocol_version: overrides.bridge_protocol_version || SCANOPS_INVENTORY_BRIDGE_PROTOCOL_VERSION,
    pairing_contract_version: overrides.pairing_contract_version || SCANOPS_INVENTORY_BRIDGE_PAIRING_CONTRACT_VERSION,
    source_system: SCANOPS_INVENTORY_BRIDGE_SOURCE_SYSTEM,
    source_device_id: overrides.source_device_id || null,
    device_name: overrides.device_name || null,
    device_type: normalizeDeviceType(overrides.device_type),
    source_user_id: overrides.source_user_id || null,
    source_user_role: overrides.source_user_role || null,
    store_id: overrides.store_id || null,
    inventory_instance_id: overrides.inventory_instance_id || null,
    environment: normalizeEnvironment(overrides.environment),
    requested_at: overrides.requested_at || nowIso(),
    pairing_method: normalizePairingMethod(overrides.pairing_method),
    pairing_ref: overrides.pairing_ref || null,
    challenge_ref: overrides.challenge_ref || null,
    prototype_transport: true,
    transport_note: 'Base44 prototype cloud relay — not a local LAN bridge.',
  };
}

export function validateScanOpsInventoryBridgePairingRequest(input, expected = {}) {
  const request = parseJsonMaybe(input);
  const errors = [];

  if (!request) {
    return {
      ok: false,
      code: SCANOPS_INVENTORY_BRIDGE_PAIRING_RESULT_CODE.PAIRING_REQUEST_INVALID,
      errors: ['Pairing request must be an object or JSON string.'],
      request: null,
    };
  }

  for (const field of SCANOPS_INVENTORY_BRIDGE_PAIRING_REQUIRED_FIELDS) {
    if (!request[field]) errors.push(`Missing ${field}.`);
  }

  if (request.source_system && request.source_system !== SCANOPS_INVENTORY_BRIDGE_SOURCE_SYSTEM) {
    errors.push('source_system must be scanops.');
  }

  if (
    request.bridge_protocol_version &&
    request.bridge_protocol_version !== SCANOPS_INVENTORY_BRIDGE_PROTOCOL_VERSION
  ) {
    errors.push(`Bridge protocol mismatch. Expected ${SCANOPS_INVENTORY_BRIDGE_PROTOCOL_VERSION}.`);
  }

  if (
    request.pairing_contract_version &&
    request.pairing_contract_version !== SCANOPS_INVENTORY_BRIDGE_PAIRING_CONTRACT_VERSION
  ) {
    errors.push(`Pairing contract mismatch. Expected ${SCANOPS_INVENTORY_BRIDGE_PAIRING_CONTRACT_VERSION}.`);
  }

  if (request.device_type && !isKnown(request.device_type, SCANOPS_INVENTORY_BRIDGE_DEVICE_TYPE)) {
    errors.push(`Unsupported device type: ${request.device_type}.`);
  }

  if (request.pairing_method && !isKnown(request.pairing_method, SCANOPS_INVENTORY_BRIDGE_PAIRING_METHOD)) {
    errors.push(`Unsupported pairing method: ${request.pairing_method}.`);
  }

  if (request.environment && !isKnown(request.environment, SCANOPS_INVENTORY_BRIDGE_ENVIRONMENT)) {
    errors.push(`Unsupported bridge environment: ${request.environment}.`);
  }

  const expectedEnvironment = expected.environment
    ? normalizeEnvironment(expected.environment)
    : null;
  if (expectedEnvironment && request.environment && request.environment !== expectedEnvironment) {
    errors.push(`Environment mismatch. Pairing request is ${request.environment}; expected ${expectedEnvironment}.`);
  }

  if (request.requested_at && !parseDateMs(request.requested_at)) {
    errors.push('requested_at must be a valid ISO date.');
  }

  return {
    ok: errors.length === 0,
    code: classifyPairingValidationCode(errors),
    errors,
    request,
  };
}

export function getScanOpsInventoryBridgePairingRequestSafeSummary(input = {}) {
  const request = parseJsonMaybe(input) || {};
  return {
    bridge_protocol_version: request.bridge_protocol_version || null,
    pairing_contract_version: request.pairing_contract_version || null,
    source_system: request.source_system || null,
    source_device_id: request.source_device_id || null,
    device_name: request.device_name || null,
    device_type: request.device_type || null,
    source_user_id: request.source_user_id || null,
    source_user_role: request.source_user_role || null,
    store_id: request.store_id || null,
    inventory_instance_id: request.inventory_instance_id || null,
    environment: request.environment || null,
    requested_at: request.requested_at || null,
    pairing_method: request.pairing_method || null,
    pairing_ref: redact(request.pairing_ref),
    challenge_ref: redact(request.challenge_ref),
    prototype_transport: request.prototype_transport ?? null,
    transport_note: request.transport_note || null,
  };
}

export function assertNoScanOpsInventoryBridgePairingOperationalMutation() {
  return {
    ok: true,
    phase: SCANOPS_INVENTORY_BRIDGE_PAIRING_PHASE,
    scanops_side_contract_only: true,
    no_live_pairing: true,
    no_qr_ui: true,
    no_manual_ip_ui: true,
    no_device_registry_ui: true,
    no_device_approval_workflow: true,
    no_inventory_writes: true,
    no_entity_writes: true,
    no_event_sync: true,
    no_scanops_sync_mutation: true,
    no_relay_enforcement: true,
    no_ui: true,
    no_stock_mutation: true,
    no_price_mutation: true,
    no_pos_order_forecast_mutation: true,
    no_item_master_mutation: true,
    ingestion_validation_still_required_per_event: true,
    base44_cloud_relay_not_lan_bridge: true,
  };
}
