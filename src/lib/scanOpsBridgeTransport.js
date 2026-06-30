const TRANSPORT_HISTORY_KEY = "invyra_scanops_bridge_transport_history_v1";

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function readKey(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeKey(key, value) {
  if (typeof window === "undefined") return value;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
  return value;
}

export const BRIDGE_TRANSPORT_STATUSES = {
  READY: "ready",
  BLOCKED: "blocked",
  SIMULATED: "simulated",
  FAILED: "failed",
};

export const BRIDGE_TRANSPORT_VERSION = "scanops-bridge-transport-v1";

export function buildBridgeTransportEnvelope({ queueItem, desktopProfile, session, mode = "simulation" } = {}) {
  return {
    envelope_id: makeId("bridge_env"),
    contract_version: BRIDGE_TRANSPORT_VERSION,
    mode,
    created_at: nowIso(),
    source: {
      application: "Invyra ScanOps",
      device_id: session?.deviceId || session?.scannerId || "SCANOPS-DEVICE",
      actor_role: session?.actorRole || "Staff",
      store_id: session?.storeId || session?.locationId || desktopProfile?.site_id || "Current site",
    },
    destination: {
      bridge_id: desktopProfile?.bridge_id || desktopProfile?.id || null,
      bridge_name: desktopProfile?.name || "Inventory Desktop",
      host: desktopProfile?.host || "Not paired",
      port: desktopProfile?.port || null,
    },
    payload: {
      queue_id: queueItem?.id || queueItem?.queueId || null,
      event_type: queueItem?.eventType || queueItem?.type || queueItem?.sourceWorkflow || "UNKNOWN_EVENT",
      status: queueItem?.status || "queued",
      summary: queueItem?.summary || queueItem?.title || "ScanOps queue item",
      raw: queueItem || null,
    },
    guardrails: {
      inventory_write: false,
      ledger_mutation: false,
      stock_mutation: false,
      price_mutation: false,
      sync_contract_change: false,
    },
  };
}

export function validateBridgeTransportEnvelope(envelope) {
  const errors = [];
  if (!envelope?.envelope_id) errors.push("Missing envelope_id");
  if (envelope?.contract_version !== BRIDGE_TRANSPORT_VERSION) errors.push("Unsupported contract version");
  if (!envelope?.payload?.queue_id) errors.push("Missing payload queue_id");
  if (!envelope?.destination?.bridge_id && envelope?.destination?.host === "Not paired") errors.push("Desktop bridge not paired");
  const guardrails = envelope?.guardrails || {};
  if (guardrails.inventory_write || guardrails.ledger_mutation || guardrails.stock_mutation || guardrails.price_mutation) {
    errors.push("Blocked mutation guardrail detected");
  }
  return {
    ok: errors.length === 0,
    errors,
    checked_at: nowIso(),
  };
}

export function simulateBridgeQueueHandoff({ queueItem, desktopProfile, session } = {}) {
  const envelope = buildBridgeTransportEnvelope({ queueItem, desktopProfile, session, mode: "simulation" });
  const validation = validateBridgeTransportEnvelope(envelope);
  const result = {
    transport_id: makeId("bridge_transport"),
    envelope_id: envelope.envelope_id,
    status: validation.ok ? BRIDGE_TRANSPORT_STATUSES.SIMULATED : BRIDGE_TRANSPORT_STATUSES.BLOCKED,
    result_label: validation.ok ? "Simulation ready" : "Blocked",
    validation,
    created_at: nowIso(),
    guardrails: envelope.guardrails,
  };
  const history = readKey(TRANSPORT_HISTORY_KEY, []);
  writeKey(TRANSPORT_HISTORY_KEY, [result, ...history].slice(0, 100));
  return { envelope, result };
}

export function getBridgeTransportHistory() {
  const history = readKey(TRANSPORT_HISTORY_KEY, []);
  return Array.isArray(history) ? history : [];
}
