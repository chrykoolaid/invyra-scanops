import { createHash } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BRIDGE_CONTRACT_V1, canonicalizeBridgeContractV1 } from '../../src/inventory-bridge/canonicalContract/v1/index.js';
import { createScanOpsCountSubmissionQueueV1 } from '../../src/inventory-bridge/countHandoff/v1/index.js';

export const checks = [];
export const root = mkdtempSync(join(tmpdir(), 'invyra-p38-scanops-'));
let clockMs = Date.parse('2026-07-18T12:00:00.000Z');
export const now = () => new Date(clockMs).toISOString();
export const advanceClock = (ms) => { clockMs += ms; return now(); };
export const expectedContractHash = '9a7718a37f66236d0c0e9873cade6745c83f3a56cf41d969edf8ef9359eee5f5';
export const profile = Object.freeze({
  status: 'PAIRED', environment: 'TEST', deviceId: 'scanops-device-001', sessionId: 'scan-session-001',
  storeId: 'store-001', inventoryInstanceId: 'inventory-instance-001', trustReference: 'a'.repeat(64),
  trustExpiresAt: '2026-07-20T00:00:00.000Z',
});
export const configuration = {
  bridge_enabled: true, transport_enabled: true, reliable_delivery_enabled: true, persistence_enabled: true,
  business_handoff_enabled: true, count_submission_enabled: true,
};
export function check(name, condition, detail = '') { checks.push({ name, passed: condition === true, detail }); }
export function hash(value) { return createHash('sha256').update(canonicalizeBridgeContractV1(value), 'utf8').digest('hex'); }
export function jsonResponse(status, body) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}
export function input(suffix = '001', overrides = {}) {
  return {
    envelopeId: `env:test:count:${suffix}`, idempotencyKey: `idem:test:count:${suffix}`,
    traceId: `trace:test:count:${suffix}`, occurredAt: now(), sessionId: 'scan-session-001', operatorId: 'operator-001',
    payload: {
      countSessionReference: 'stocktake-session-001', itemReferenceType: 'SKU', itemReference: `SKU-${suffix}`,
      physicalCount: 12, countedAt: now(), locationId: 'location-001', ...overrides.payload,
    },
    ...overrides,
  };
}
export function stagedReceipt(envelope) {
  return {
    contractId: BRIDGE_CONTRACT_V1.contractId, schemaVersion: BRIDGE_CONTRACT_V1.schemaVersion,
    receiptId: envelope.envelopeId.replace(/^env:/, 'receipt:'), envelopeId: envelope.envelopeId,
    idempotencyKey: envelope.idempotencyKey, traceId: envelope.traceId, admissionStatus: 'ACCEPTED',
    applicationStatus: 'STAGED', receivedAt: now(), processedAt: now(),
    inventoryInstanceId: envelope.target.inventoryInstanceId, environment: envelope.environment,
    operationType: envelope.operationType,
    message: 'Count evidence staged for Inventory review. No stock movement was created.', errors: [], warnings: [],
  };
}
export function rejectedReceipt(envelope) {
  return { ...stagedReceipt(envelope), admissionStatus: 'REJECTED', applicationStatus: 'VALIDATION_FAILED',
    message: 'Count submission rejected.',
    errors: [{ code: 'PAYLOAD_INVALID', message: 'Invalid count.', field: 'payload.physicalCount', retryable: false }],
  };
}
export function createQueue(directory, fetchAdapter, extras = {}) {
  return createScanOpsCountSubmissionQueueV1({
    configuration, environment: extras.environment || 'TEST', protocol: extras.protocol || 'http',
    inventoryHost: extras.inventoryHost || '127.0.0.1', inventoryPort: extras.inventoryPort || 43110,
    persistenceDirectory: directory, pairedProfile: extras.pairedProfile || profile, now, timeoutMs: 100,
    retryDelaysMs: [1, 1], maxAttempts: extras.maxAttempts || 2, fetchAdapter,
  });
}
export { BRIDGE_CONTRACT_V1, createScanOpsCountSubmissionQueueV1, join };
