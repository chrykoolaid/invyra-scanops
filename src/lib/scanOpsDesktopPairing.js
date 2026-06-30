const DESKTOP_PROFILES_KEY = "invyra_scanops_desktop_profiles_v1";
const DISCOVERY_RESULTS_KEY = "invyra_scanops_desktop_discovery_results_v1";

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

function cleanHost(value) {
  return String(value || "").trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function profileId(host, port) {
  return `desktop_${cleanHost(host || "unpaired").replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_${port || "default"}`;
}

export const DESKTOP_PAIRING_METHODS = {
  QR: "qr",
  DISCOVERY: "discovery",
  MANUAL: "manual",
};

export function buildDesktopPairingProfile({ name, host, port, siteId, bridgeId, method = DESKTOP_PAIRING_METHODS.MANUAL } = {}) {
  const nextHost = cleanHost(host);
  const nextPort = port ? String(port).trim() : "";
  const id = bridgeId || profileId(nextHost, nextPort);
  return {
    id,
    bridge_id: id,
    name: name || "Inventory Desktop",
    host: nextHost || "Not paired",
    port: nextPort || null,
    site_id: siteId || "Current site",
    method,
    trust_status: nextHost ? "Known" : "Unpaired",
    saved_at: nowIso(),
    last_seen_at: null,
    stock_mutation: false,
  };
}

export function getKnownDesktopPairingProfiles() {
  const profiles = readKey(DESKTOP_PROFILES_KEY, []);
  return Array.isArray(profiles) ? profiles : [];
}

export function saveKnownDesktopPairingProfile(profile) {
  const desktop = buildDesktopPairingProfile(profile);
  const current = getKnownDesktopPairingProfiles();
  const next = [desktop, ...current.filter((entry) => entry.id !== desktop.id)].slice(0, 8);
  writeKey(DESKTOP_PROFILES_KEY, next);
  return desktop;
}

export function buildManualDesktopPairingDraft({ host, port, name, siteId } = {}) {
  return buildDesktopPairingProfile({
    host,
    port,
    name: name || "Manual Inventory Desktop",
    siteId,
    method: DESKTOP_PAIRING_METHODS.MANUAL,
  });
}

export function parseDesktopPairingQr(value, session = {}) {
  try {
    const raw = String(value || "").trim();
    if (!raw) return { ok: false, reason: "QR code is empty", stock_mutation: false };
    const parsed = JSON.parse(raw);
    const profile = buildDesktopPairingProfile({
      name: parsed.name || parsed.desktopName || "Inventory Desktop",
      host: parsed.host || parsed.hostname || parsed.ipAddress,
      port: parsed.port,
      siteId: parsed.siteId || parsed.storeId || session.storeId,
      bridgeId: parsed.bridgeId || parsed.bridge_id,
      method: DESKTOP_PAIRING_METHODS.QR,
    });
    if (!profile.host || profile.host === "Not paired") return { ok: false, reason: "QR code does not include a desktop host", stock_mutation: false };
    return { ok: true, profile, stock_mutation: false };
  } catch {
    return { ok: false, reason: "QR code could not be read as a pairing profile", stock_mutation: false };
  }
}

export function discoverLocalDesktopPairingProfiles(session = {}) {
  const candidates = [
    buildDesktopPairingProfile({ name: "Inventory Desktop", host: "inventory-desktop.local", port: "8080", siteId: session.storeId, method: DESKTOP_PAIRING_METHODS.DISCOVERY }),
    buildDesktopPairingProfile({ name: "Back Office Inventory", host: "backoffice-inventory.local", port: "8080", siteId: session.storeId, method: DESKTOP_PAIRING_METHODS.DISCOVERY }),
  ].map((entry) => ({ ...entry, discovered_at: nowIso(), discovery_status: "candidate", stock_mutation: false }));
  writeKey(DISCOVERY_RESULTS_KEY, candidates);
  return candidates;
}

export function getLastDesktopDiscoveryResults() {
  const results = readKey(DISCOVERY_RESULTS_KEY, []);
  return Array.isArray(results) ? results : [];
}
