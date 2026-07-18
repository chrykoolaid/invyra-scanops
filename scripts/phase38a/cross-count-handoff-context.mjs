import { createHash } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BRIDGE_CONTRACT_V1, canonicalizeBridgeContractV1 } from '../../src/inventory-bridge/canonicalContract/v1/index.js';
import { createScanOpsCountSubmissionQueueV1 } from '../../src/inventory-bridge/countHandoff/v1/index.js';

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const inventoryRoot = process.env.INVENTORY_REPO_PATH ? join(repositoryRoot, process.env.INVENTORY_REPO_PATH) : join(repositoryRoot, 'inventory-repo');
const inventoryModule = await import(pathToFileURL(join(inventoryRoot, 'src/inventory-bridge/countIntake/v1/index.js')).href);
export const { createInventoryCountIntakeServerV1, INVENTORY_COUNT_INTAKE_V1_PATHS } = inventoryModule;
export const checks = [];
export const tempRoot = mkdtempSync(join(tmpdir(), 'invyra-p38-cross-'));
export const inventoryPersistence = join(tempRoot, 'inventory');
export const scanPersistence = join(tempRoot, 'scanops');
let clockMs = Date.parse('2026-07-18T12:00:00.000Z');
export const now = () => new Date(clockMs).toISOString();
export const advanceClock = (ms) => { clockMs += ms; return now(); };
export const expectedContractHash = '9a7718a37f66236d0c0e9873cade6745c83f3a56cf41d969edf8ef9359eee5f5';
export const pairedProfile = Object.freeze({
  status: 'PAIRED', environment: 'TEST', deviceId: 'scanops-device-001', sessionId: 'scan-session-001',
  storeId: 'store-001', inventoryInstanceId: 'inventory-instance-001', trustReference: 'b'.repeat(64),
  trustExpiresAt: '2026-07-20T00:00:00.000Z',
});
export const inventoryConfiguration = {
  bridge_enabled: true, transport_enabled: true, reliable_delivery_enabled: true, persistence_enabled: true,
  business_handoff_enabled: true, count_submission_enabled: true, trusted_device_ids: [pairedProfile.deviceId],
  allowed_store_ids: [pairedProfile.storeId], allowed_inventory_instance_ids: [pairedProfile.inventoryInstanceId],
};
export const scanConfiguration = {
  bridge_enabled: true, transport_enabled: true, reliable_delivery_enabled: true, persistence_enabled: true,
  business_handoff_enabled: true, count_submission_enabled: true,
};
export function check(name, condition, detail = '') { checks.push({ name, passed: condition === true, detail }); }
export function hash(value) { return createHash('sha256').update(canonicalizeBridgeContractV1(value), 'utf8').digest('hex'); }
export async function requestJson(url, options = {}) {
  const response = await fetch(url, options); const text = await response.text(); let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: response.status, headers: Object.fromEntries(response.headers.entries()), body };
}
export function createInventory(port) {
  return createInventoryCountIntakeServerV1({ configuration: inventoryConfiguration, environment: 'TEST',
    bindHost: '127.0.0.1', port, allowEphemeralPortForTest: port === 0, persistenceDirectory: inventoryPersistence, now });
}
export function createQueue(port, directory = scanPersistence) {
  return createScanOpsCountSubmissionQueueV1({ configuration: scanConfiguration, environment: 'TEST', protocol: 'http',
    inventoryHost: '127.0.0.1', inventoryPort: port, persistenceDirectory: directory, pairedProfile, now,
    timeoutMs: 200, retryDelaysMs: [1, 1], maxAttempts: 2 });
}
export function countInput(suffix, physicalCount = 12) {
  return {
    envelopeId: `env:test:count:${suffix}`, idempotencyKey: `idem:test:count:${suffix}`,
    traceId: `trace:test:count:${suffix}`, occurredAt: now(), sessionId: pairedProfile.sessionId, operatorId: 'operator-001',
    payload: { countSessionReference: 'stocktake-session-001', itemReferenceType: 'SKU', itemReference: `SKU-${suffix}`,
      physicalCount, countedAt: now(), locationId: 'location-001', storageAreaId: 'storage-001',
      evidenceNote: 'Cross-repository count evidence.' },
  };
}
export { BRIDGE_CONTRACT_V1 };
