/**
 * bridgeTransportConfig.js — ScanOps Phase 1D-C
 *
 * Client-side bridge configuration for the ScanOps ↔ Inventory Bridge v1.
 *
 * Phase 1D-C deliberately stores non-secret transport config only.
 * Device pairing credentials are Phase 1D-D and are not implemented here.
 *
 * Base44 prototype transport is a cloud relay, NOT a local Wi-Fi/IP LAN bridge.
 * Production Wi-Fi/IP support requires a desktop/local bridge service.
 */

import {
  BRIDGE_ENVIRONMENTS,
  BRIDGE_PAIRING_METHOD,
  BRIDGE_PROTOCOL_VERSION,
} from "./bridgeTransportConstants";

const DB_NAME = "scanops_bridge_transport_db";
const DB_VERSION = 1;
const STORE_NAME = "bridge_config";
const CURRENT_CONFIG_KEY = "current";

export const BRIDGE_TRANSPORT_MODE = Object.freeze({
  PROTOTYPE_CLOUD_RELAY: "PROTOTYPE_CLOUD_RELAY",
  PRODUCTION_LAN_SPEC_ONLY: "PRODUCTION_LAN_SPEC_ONLY",
});

export const DEFAULT_BRIDGE_CONFIG = Object.freeze({
  key: CURRENT_CONFIG_KEY,
  enabled: false,
  transport_mode: BRIDGE_TRANSPORT_MODE.PROTOTYPE_CLOUD_RELAY,
  bridge_protocol_version: BRIDGE_PROTOCOL_VERSION,
  environment: BRIDGE_ENVIRONMENTS.LIVE,
  pairing_method: BRIDGE_PAIRING_METHOD.MANUAL_IP,
  relay_function_name: "inventoryBridgeRelay",
  health_function_name: "inventoryBridgeHealth",
  capabilities_function_name: "inventoryBridgeHealth",
  bridge_host: null,
  bridge_port: null,
  bridge_base_url: null,
  store_id: null,
  device_id: null,
  device_name: null,
  last_health_at: null,
  last_capabilities_at: null,
  saved_at: null,
  updated_at: null,
  prototype_transport: true,
  transport_note: "Base44 prototype cloud relay — not a local LAN bridge.",
});

let _db = null;

function hasIndexedDB() {
  return typeof indexedDB !== "undefined";
}

function nowIso() {
  return new Date().toISOString();
}

function openDB() {
  if (!hasIndexedDB()) {
    return Promise.reject(new Error("IndexedDB is not available in this environment."));
  }
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    req.onsuccess = (event) => {
      _db = event.target.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getStore(mode = "readonly") {
  const db = await openDB();
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
}

function normalizeEnvironment(environment) {
  const value = String(environment || DEFAULT_BRIDGE_CONFIG.environment).toUpperCase();
  return Object.values(BRIDGE_ENVIRONMENTS).includes(value) ? value : BRIDGE_ENVIRONMENTS.LIVE;
}

export function normalizeBridgeConfig(config = {}) {
  const now = nowIso();
  return {
    ...DEFAULT_BRIDGE_CONFIG,
    ...config,
    key: CURRENT_CONFIG_KEY,
    transport_mode: Object.values(BRIDGE_TRANSPORT_MODE).includes(config.transport_mode)
      ? config.transport_mode
      : DEFAULT_BRIDGE_CONFIG.transport_mode,
    bridge_protocol_version: config.bridge_protocol_version || BRIDGE_PROTOCOL_VERSION,
    environment: normalizeEnvironment(config.environment),
    pairing_method: Object.values(BRIDGE_PAIRING_METHOD).includes(config.pairing_method)
      ? config.pairing_method
      : DEFAULT_BRIDGE_CONFIG.pairing_method,
    prototype_transport: config.transport_mode === BRIDGE_TRANSPORT_MODE.PRODUCTION_LAN_SPEC_ONLY ? false : true,
    saved_at: config.saved_at || now,
    updated_at: now,
  };
}

export async function getBridgeConfig() {
  if (!hasIndexedDB()) return { ...DEFAULT_BRIDGE_CONFIG };
  const store = await getStore("readonly");
  const existing = await promisify(store.get(CURRENT_CONFIG_KEY));
  return normalizeBridgeConfig(existing || DEFAULT_BRIDGE_CONFIG);
}

export async function saveBridgeConfig(config = {}) {
  const existing = await getBridgeConfig();
  const next = normalizeBridgeConfig({
    ...existing,
    ...config,
    saved_at: existing.saved_at || nowIso(),
  });
  const store = await getStore("readwrite");
  await promisify(store.put(next));
  return next;
}

export async function clearBridgeConfig() {
  if (!hasIndexedDB()) return false;
  const store = await getStore("readwrite");
  await promisify(store.delete(CURRENT_CONFIG_KEY));
  return true;
}

export function isBridgeConfigEnabled(config = {}) {
  return normalizeBridgeConfig(config).enabled === true;
}

export function isPrototypeCloudRelayConfig(config = {}) {
  return normalizeBridgeConfig(config).transport_mode === BRIDGE_TRANSPORT_MODE.PROTOTYPE_CLOUD_RELAY;
}

export function isProductionLanSpecConfig(config = {}) {
  return normalizeBridgeConfig(config).transport_mode === BRIDGE_TRANSPORT_MODE.PRODUCTION_LAN_SPEC_ONLY;
}

export function validateBridgeConfig(config = {}) {
  const normalized = normalizeBridgeConfig(config);
  const errors = [];

  if (!normalized.bridge_protocol_version) errors.push("bridge_protocol_version is required.");
  if (!normalized.environment) errors.push("environment is required.");

  if (normalized.transport_mode === BRIDGE_TRANSPORT_MODE.PROTOTYPE_CLOUD_RELAY) {
    if (!normalized.relay_function_name) errors.push("relay_function_name is required for prototype cloud relay mode.");
    if (!normalized.health_function_name) errors.push("health_function_name is required for prototype cloud relay mode.");
  }

  if (normalized.transport_mode === BRIDGE_TRANSPORT_MODE.PRODUCTION_LAN_SPEC_ONLY) {
    if (!normalized.bridge_base_url && (!normalized.bridge_host || !normalized.bridge_port)) {
      errors.push("bridge_base_url or bridge_host + bridge_port is required for production LAN spec mode.");
    }
  }

  return { ok: errors.length === 0, errors, config: normalized };
}

export async function stampBridgeHealthResult(result = {}) {
  const existing = await getBridgeConfig();
  return saveBridgeConfig({
    ...existing,
    last_health_at: nowIso(),
    last_health_status: result.status || result.error || "unknown",
  });
}

export async function stampBridgeCapabilitiesResult(result = {}) {
  const existing = await getBridgeConfig();
  return saveBridgeConfig({
    ...existing,
    last_capabilities_at: nowIso(),
    last_capabilities_status: result.error ? "error" : "ok",
  });
}

export function getBridgeConfigSafeSummary(config = {}) {
  const normalized = normalizeBridgeConfig(config);
  return {
    enabled: normalized.enabled,
    transport_mode: normalized.transport_mode,
    bridge_protocol_version: normalized.bridge_protocol_version,
    environment: normalized.environment,
    pairing_method: normalized.pairing_method,
    relay_function_name: normalized.relay_function_name,
    health_function_name: normalized.health_function_name,
    bridge_host: normalized.bridge_host,
    bridge_port: normalized.bridge_port,
    bridge_base_url: normalized.bridge_base_url,
    store_id: normalized.store_id,
    device_id: normalized.device_id,
    device_name: normalized.device_name,
    prototype_transport: normalized.prototype_transport,
    transport_note: normalized.transport_note,
    last_health_at: normalized.last_health_at,
    last_capabilities_at: normalized.last_capabilities_at,
  };
}
