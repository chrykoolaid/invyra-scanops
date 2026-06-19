/**
 * ScanOps Inventory Configuration
 * 
 * DATA_MODE controls which inventory provider is active:
 *   "mock"              — uses local dev/demo fixtures only. No real stock authority.
 *   "inventory_bridge"  — uses Inventory snapshots (IndexedDB cache). No mock fallback.
 * 
 * localStorage is used ONLY for this small config value.
 * Full item/stock snapshots are stored via StorageProvider (IndexedDB).
 */

const CONFIG_KEY = "scanops_data_mode_v1";

export const DATA_MODES = {
  MOCK: "mock",
  INVENTORY_BRIDGE: "inventory_bridge",
};

// Default: inventory_bridge (real data preferred). Change to "mock" for local dev/demo.
const DEFAULT_MODE = DATA_MODES.INVENTORY_BRIDGE;

export function getDataMode() {
  try {
    const stored = window.localStorage.getItem(CONFIG_KEY);
    if (stored === DATA_MODES.MOCK || stored === DATA_MODES.INVENTORY_BRIDGE) return stored;
  } catch {}
  return DEFAULT_MODE;
}

export function setDataMode(mode) {
  try {
    window.localStorage.setItem(CONFIG_KEY, mode);
  } catch {}
}

export function isMockMode() {
  return getDataMode() === DATA_MODES.MOCK;
}

export function isBridgeMode() {
  return getDataMode() === DATA_MODES.INVENTORY_BRIDGE;
}