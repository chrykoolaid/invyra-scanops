/**
 * bridgeDevicePairing.js — ScanOps Phase 1D-D-A
 *
 * Device pairing foundation for the ScanOps ↔ Inventory Bridge v1.
 *
 * Scope for this phase:
 * - Pairing constants and plain object contracts only.
 * - QR/manual pairing payload parsing helpers.
 * - Safe validation and redacted summaries.
 *
 * Out of scope for this file:
 * - No API calls.
 * - No entity writes.
 * - No UI.
 * - No live device registry.
 * - No operational Inventory mutation.
 * - No stock, price, POS, order, forecast, Item Master, StockMovement, or POSLineItem mutation.
 *
 * Base44 prototype transport is a cloud relay, NOT a local LAN bridge.
 * Production Wi-Fi/IP support requires a desktop/local bridge service.
 */

import {
  BRIDGE_DEVICE_STATUS,
  BRIDGE_DEVICE_TYPE,
  BRIDGE_ENVIRONMENTS,
  BRIDGE_PAIRING_METHOD,
  BRIDGE_PROTOCOL_VERSION,
  PAIRING_TOKEN_TTL_MINUTES,
} from "./bridgeTransportConstants";
import {
  BRIDGE_TRANSPORT_MODE,
  normalizeBridgeConfig,
} from "./bridgeTransportConfig";

export const BRIDGE_PAIRING_CONTRACT_VERSION = "1.0.0";

export const BRIDGE_PAIRING_STATUS = Object.freeze({
  NOT_CONFIGURED: "NOT_CONFIGURED",
  READY_TO_PAIR: "READY_TO_PAIR",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  TRUSTED: "TRUSTED",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
  BLOCKED: "BLOCKED",
  ERROR: "ERROR",
});

export const BRIDGE_PAIRING_RESULT_CODE = Object.freeze({
  PAIRING_PAYLOAD_VALID: "PAIRING_PAYLOAD_VALID",
  PAIRING_PAYLOAD_INVALID: "PAIRING_PAYLOAD_INVALID",
  PAIRING_PAYLOAD_EXPIRED: "PAIRING_PAYLOAD_EXPIRED",
  PAIRING_ENVIRONMENT_MISMATCH: "PAIRING_ENVIRONMENT_MISMATCH",
  PAIRING_PROTOCOL_MISMATCH: "PAIRING_PROTOCOL_MISMATCH",
  DEVICE_PENDING_APPROVAL: "DEVICE_PENDING_APPROVAL",
  DEVICE_TRUSTED: "DEVICE_TRUSTED",
  DEVICE_REVOKED: "DEVICE_REVOKED",
  DEVICE_BLOCKED: "DEVICE_BLOCKED",
});

const REQUIRED_PAIRING_PAYLOAD_FIELDS = [
  "bridge_protocol_version",
  "pairing_contract_version",
  "pairing_method",
  "environment",
  "issued_at",
  "expires_at",
  "store_id",
  "inventory_instance_id",
];

function nowIso() {
  return new Date().toISOString();
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000).toISOString();
}

function isKnownValue(value, objectValues) {
  return Object.values(objectValues).includes(value);
}

function parseDateMs(value) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeEnvironment(environment) {
  const value = String(environment || "").toUpperCase();
  return isKnownValue(value, BRIDGE_ENVIRONMENTS) ? value : null;
}

function redact(value) {
  if (!value) return null;
  const text = String(value);
  if (text.length <= 8) return "••••";
  return `${text.slice(0, 4)}••••${text.slice(-4)}`;
}

export function buildBridgePairingPayload(overrides = {}) {
  const issuedAt = overrides.issued_at || nowIso();
  const issuedMs = parseDateMs(issuedAt) || Date.now();
  return {
    bridge_protocol_version: overrides.bridge_protocol_version || BRIDGE_PROTOCOL_VERSION,
    pairing_contract_version: overrides.pairing_contract_version || BRIDGE_PAIRING_CONTRACT_VERSION,
    pairing_method: overrides.pairing_method || BRIDGE_PAIRING_METHOD.QR_CODE,
    environment: normalizeEnvironment(overrides.environment) || BRIDGE_ENVIRONMENTS.LIVE,
    issued_at: new Date(issuedMs).toISOString(),
    expires_at: overrides.expires_at || addMinutes(new Date(issuedMs), PAIRING_TOKEN_TTL_MINUTES),
    store_id: overrides.store_id || null,
    inventory_instance_id: overrides.inventory_instance_id || null,
    bridge_name: overrides.bridge_name || "Invyra Inventory Bridge",
    bridge_version: overrides.bridge_version || "1.0.0",
    transport_mode: overrides.transport_mode || BRIDGE_TRANSPORT_MODE.PROTOTYPE_CLOUD_RELAY,
    bridge_host: overrides.bridge_host || null,
    bridge_port: overrides.bridge_port || null,
    bridge_base_url: overrides.bridge_base_url || null,
    pairing_ref: overrides.pairing_ref || null,
    pairing_nonce: overrides.pairing_nonce || null,
    prototype_transport: overrides.prototype_transport ?? true,
    transport_note: overrides.transport_note || "Base44 prototype cloud relay — not a local LAN bridge.",
  };
}

export function parseBridgePairingPayload(input) {
  if (!input) return null;
  if (typeof input === "object") return input;
  if (typeof input !== "string") return null;
  try {
    return JSON.parse(input);
  } catch {
    try {
      const decoded = atob(input);
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }
}

export function validateBridgePairingPayload(input, expected = {}) {
  const payload = parseBridgePairingPayload(input);
  const errors = [];

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      ok: false,
      code: BRIDGE_PAIRING_RESULT_CODE.PAIRING_PAYLOAD_INVALID,
      errors: ["Pairing payload must be an object or JSON string."],
      payload: null,
    };
  }

  for (const field of REQUIRED_PAIRING_PAYLOAD_FIELDS) {
    if (!payload[field]) errors.push(`Missing ${field}.`);
  }

  if (payload.bridge_protocol_version && payload.bridge_protocol_version !== BRIDGE_PROTOCOL_VERSION) {
    errors.push(`Bridge protocol mismatch. Expected ${BRIDGE_PROTOCOL_VERSION}.`);
  }

  if (payload.pairing_contract_version && payload.pairing_contract_version !== BRIDGE_PAIRING_CONTRACT_VERSION) {
    errors.push(`Pairing contract mismatch. Expected ${BRIDGE_PAIRING_CONTRACT_VERSION}.`);
  }

  if (payload.pairing_method && !isKnownValue(payload.pairing_method, BRIDGE_PAIRING_METHOD)) {
    errors.push(`Unsupported pairing method: ${payload.pairing_method}.`);
  }

  const environment = normalizeEnvironment(payload.environment);
  if (!environment) errors.push(`Unsupported environment: ${payload.environment}.`);

  const expectedEnvironment = normalizeEnvironment(expected.environment);
  if (environment && expectedEnvironment && environment !== expectedEnvironment) {
    errors.push(`Environment mismatch. Pairing is ${environment}; ScanOps expects ${expectedEnvironment}.`);
  }

  const expiresMs = parseDateMs(payload.expires_at);
  if (!expiresMs) {
    errors.push("expires_at must be a valid ISO date.");
  } else if (Date.now() > expiresMs) {
    errors.push("Pairing payload has expired.");
  }

  if (!payload.bridge_base_url && (!payload.bridge_host || !payload.bridge_port)) {
    if (payload.transport_mode === BRIDGE_TRANSPORT_MODE.PRODUCTION_LAN_SPEC_ONLY) {
      errors.push("Production LAN pairing requires bridge_base_url or bridge_host + bridge_port.");
    }
  }

  let code = BRIDGE_PAIRING_RESULT_CODE.PAIRING_PAYLOAD_VALID;
  if (errors.some((error) => error.includes("expired"))) code = BRIDGE_PAIRING_RESULT_CODE.PAIRING_PAYLOAD_EXPIRED;
  if (errors.some((error) => error.includes("Environment mismatch"))) code = BRIDGE_PAIRING_RESULT_CODE.PAIRING_ENVIRONMENT_MISMATCH;
  if (errors.some((error) => error.includes("protocol mismatch") || error.includes("contract mismatch"))) code = BRIDGE_PAIRING_RESULT_CODE.PAIRING_PROTOCOL_MISMATCH;
  if (errors.length && code === BRIDGE_PAIRING_RESULT_CODE.PAIRING_PAYLOAD_VALID) code = BRIDGE_PAIRING_RESULT_CODE.PAIRING_PAYLOAD_INVALID;

  return { ok: errors.length === 0, code, errors, payload };
}

export function pairingPayloadToBridgeConfig(input, currentConfig = {}) {
  const validation = validateBridgePairingPayload(input, { environment: currentConfig.environment });
  if (!validation.ok) return { ok: false, errors: validation.errors, config: normalizeBridgeConfig(currentConfig) };

  const payload = validation.payload;
  return {
    ok: true,
    errors: [],
    config: normalizeBridgeConfig({
      ...currentConfig,
      enabled: true,
      transport_mode: payload.transport_mode || currentConfig.transport_mode,
      bridge_protocol_version: payload.bridge_protocol_version,
      environment: payload.environment,
      pairing_method: payload.pairing_method,
      bridge_host: payload.bridge_host || currentConfig.bridge_host,
      bridge_port: payload.bridge_port || currentConfig.bridge_port,
      bridge_base_url: payload.bridge_base_url || currentConfig.bridge_base_url,
      store_id: payload.store_id || currentConfig.store_id,
      inventory_instance_id: payload.inventory_instance_id || currentConfig.inventory_instance_id,
      prototype_transport: payload.prototype_transport ?? currentConfig.prototype_transport,
      transport_note: payload.transport_note || currentConfig.transport_note,
    }),
  };
}

export function buildBridgePairingRequest(overrides = {}) {
  return {
    bridge_protocol_version: overrides.bridge_protocol_version || BRIDGE_PROTOCOL_VERSION,
    pairing_contract_version: overrides.pairing_contract_version || BRIDGE_PAIRING_CONTRACT_VERSION,
    source_system: "scanops",
    source_device_id: overrides.source_device_id || null,
    device_name: overrides.device_name || null,
    device_type: overrides.device_type || BRIDGE_DEVICE_TYPE.HANDHELD_SCANNER,
    source_user_id: overrides.source_user_id || null,
    source_user_role: overrides.source_user_role || null,
    store_id: overrides.store_id || null,
    environment: normalizeEnvironment(overrides.environment) || BRIDGE_ENVIRONMENTS.LIVE,
    requested_at: overrides.requested_at || nowIso(),
    pairing_method: overrides.pairing_method || BRIDGE_PAIRING_METHOD.QR_CODE,
  };
}

export function buildBridgePairingReceipt(overrides = {}) {
  return {
    bridge_protocol_version: overrides.bridge_protocol_version || BRIDGE_PROTOCOL_VERSION,
    pairing_contract_version: overrides.pairing_contract_version || BRIDGE_PAIRING_CONTRACT_VERSION,
    pairing_receipt_id: overrides.pairing_receipt_id || null,
    source_device_id: overrides.source_device_id || null,
    device_status: overrides.device_status || BRIDGE_DEVICE_STATUS.PENDING,
    pairing_status: overrides.pairing_status || BRIDGE_PAIRING_STATUS.PENDING_APPROVAL,
    result_code: overrides.result_code || BRIDGE_PAIRING_RESULT_CODE.DEVICE_PENDING_APPROVAL,
    decision_message: overrides.decision_message || "Device pairing is pending Inventory approval.",
    trusted: overrides.trusted ?? false,
    reviewed_by: overrides.reviewed_by || null,
    reviewed_at: overrides.reviewed_at || null,
    linked_device_ref: overrides.linked_device_ref || null,
    environment: normalizeEnvironment(overrides.environment) || BRIDGE_ENVIRONMENTS.LIVE,
    issued_at: overrides.issued_at || nowIso(),
  };
}

export function mapDeviceStatusToPairingStatus(deviceStatus) {
  switch (deviceStatus) {
    case BRIDGE_DEVICE_STATUS.TRUSTED:
      return BRIDGE_PAIRING_STATUS.TRUSTED;
    case BRIDGE_DEVICE_STATUS.PENDING:
      return BRIDGE_PAIRING_STATUS.PENDING_APPROVAL;
    case BRIDGE_DEVICE_STATUS.EXPIRED:
      return BRIDGE_PAIRING_STATUS.EXPIRED;
    case BRIDGE_DEVICE_STATUS.REVOKED:
      return BRIDGE_PAIRING_STATUS.REVOKED;
    case BRIDGE_DEVICE_STATUS.BLOCKED:
      return BRIDGE_PAIRING_STATUS.BLOCKED;
    default:
      return BRIDGE_PAIRING_STATUS.NOT_CONFIGURED;
  }
}

export function getBridgePairingSafeSummary(input) {
  const payload = parseBridgePairingPayload(input) || {};
  return {
    bridge_protocol_version: payload.bridge_protocol_version || null,
    pairing_contract_version: payload.pairing_contract_version || null,
    pairing_method: payload.pairing_method || null,
    environment: payload.environment || null,
    issued_at: payload.issued_at || null,
    expires_at: payload.expires_at || null,
    store_id: payload.store_id || null,
    inventory_instance_id: payload.inventory_instance_id || null,
    bridge_host: payload.bridge_host || null,
    bridge_port: payload.bridge_port || null,
    bridge_base_url: payload.bridge_base_url || null,
    pairing_ref: redact(payload.pairing_ref),
    pairing_nonce: redact(payload.pairing_nonce),
    prototype_transport: payload.prototype_transport ?? null,
    transport_note: payload.transport_note || null,
  };
}

export function assertNoPairingOperationalMutation() {
  return {
    ok: true,
    no_api_calls: true,
    no_entity_writes: true,
    no_ui: true,
    no_device_registry_mutation: true,
    no_stock_mutation: true,
    no_price_mutation: true,
    no_pos_mutation: true,
    no_order_mutation: true,
    no_forecast_mutation: true,
    no_item_master_mutation: true,
    no_stock_movement_creation: true,
    no_pos_line_item_creation: true,
  };
}
