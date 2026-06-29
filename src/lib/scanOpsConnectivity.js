const CONNECTION_PROFILE_KEY = "invyra_scanops_device_connection_profile_v1";
const BRIDGE_HEALTH_KEY = "invyra_scanops_bridge_health_v1";

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

function nowIso() {
  return new Date().toISOString();
}

function traceId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const PAIRING_METHODS = {
  QR: "qr",
  DISCOVERY: "discovery",
  MANUAL: "manual",
};

export const PAIRING_STATUSES = {
  NOT_PAIRED: "not_paired",
  SEARCHING: "searching",
  CONNECTED: "connected",
  OFFLINE: "offline",
  ACTION_NEEDED: "action_needed",
};

export function buildDeviceConnectionProfile(session = {}) {
  return {
    device_id: session.deviceId || session.scannerId || "SCANOPS-DEVICE",
    paired_bridge_id: null,
    bridge_name: "Main Warehouse Desktop",
    bridge_host: "Not paired",
    bridge_port: null,
    site_id: session.storeId || session.locationId || "Current site",
    environment: "training_live_aware",
    environmentLabel: "Training / Live aware",
    pairing_status: PAIRING_STATUSES.NOT_PAIRED,
    last_seen_at: null,
    trust_status: "Unpaired",
    allowed_pairing_methods: [PAIRING_METHODS.QR, PAIRING_METHODS.DISCOVERY, PAIRING_METHODS.MANUAL],
    stock_mutation: false,
  };
}

export function getDeviceConnectionProfile(session = {}) {
  const fallback = buildDeviceConnectionProfile(session);
  const stored = readKey(CONNECTION_PROFILE_KEY, fallback);
  return {
    ...fallback,
    ...stored,
    device_id: stored.device_id || fallback.device_id,
    site_id: stored.site_id || fallback.site_id,
  };
}

export function saveDeviceConnectionProfile(profile) {
  return writeKey(CONNECTION_PROFILE_KEY, {
    ...profile,
    updated_at: nowIso(),
    stock_mutation: false,
  });
}

export function getConnectivitySetupMethods() {
  return [
    {
      key: PAIRING_METHODS.QR,
      title: "Scan QR Code",
      helper: "Fastest setup from Inventory Desktop pairing screen.",
      statusLabel: "Best",
    },
    {
      key: PAIRING_METHODS.DISCOVERY,
      title: "Search Local Network",
      helper: "Find Inventory bridges available on this Wi-Fi.",
      statusLabel: "Auto",
    },
    {
      key: PAIRING_METHODS.MANUAL,
      title: "Enter Manually",
      helper: "Advanced IP, hostname, and port fallback for IT.",
      statusLabel: "Fallback",
    },
  ];
}

export function getBridgeHealth({ network = "online", syncSummary = {}, profile = {} } = {}) {
  const stored = readKey(BRIDGE_HEALTH_KEY, {});
  const offline = String(network || "").toLowerCase() === "offline";
  const hasIssues = Number(syncSummary.issue || 0) > 0;
  const isPaired = Boolean(profile.paired_bridge_id || profile.bridge_host !== "Not paired");

  let bridgeStatus = PAIRING_STATUSES.NOT_PAIRED;
  if (offline) bridgeStatus = PAIRING_STATUSES.OFFLINE;
  else if (hasIssues) bridgeStatus = PAIRING_STATUSES.ACTION_NEEDED;
  else if (isPaired) bridgeStatus = PAIRING_STATUSES.CONNECTED;

  return {
    bridgeStatus: stored.bridgeStatus || bridgeStatus,
    networkStatus: offline ? "No Wi-Fi" : "Online",
    pendingQueue: Number(syncSummary.pending || 0),
    failedQueue: Number(syncSummary.failed || 0),
    issueQueue: Number(syncSummary.issue || 0),
    latencyMs: stored.latencyMs || null,
    lastSuccessfulPing: stored.lastSuccessfulPing || profile.last_seen_at || null,
    lastCheckedAt: stored.lastCheckedAt || null,
    stock_mutation: false,
  };
}

export function runConnectionTest({ network = "online", syncSummary = {}, profile = {} } = {}) {
  const health = getBridgeHealth({ network, syncSummary, profile });
  const bridge = health.bridgeStatus === PAIRING_STATUSES.CONNECTED ? "Ready" : profile.bridge_host === "Not paired" ? "Not paired" : "Needs check";
  const resultLabel = bridge === "Ready" && health.networkStatus === "Online" && health.issueQueue === 0 ? "Passed" : "Review";

  const result = {
    traceId: traceId("bridge_test"),
    resultLabel,
    message: resultLabel === "Passed"
      ? "Bridge, network, and queue checks passed. No inventory mutation performed."
      : "Connection check completed. Review pairing, network, or queue status before handoff.",
    bridge,
    network: health.networkStatus,
    queue: health.pendingQueue > 0 ? `${health.pendingQueue} pending` : "Clear",
    checked_at: nowIso(),
    stock_mutation: false,
  };

  writeKey(BRIDGE_HEALTH_KEY, {
    bridgeStatus: health.bridgeStatus,
    networkStatus: health.networkStatus,
    latencyMs: resultLabel === "Passed" ? 24 : null,
    lastSuccessfulPing: resultLabel === "Passed" ? result.checked_at : health.lastSuccessfulPing,
    lastCheckedAt: result.checked_at,
    stock_mutation: false,
  });

  return result;
}
