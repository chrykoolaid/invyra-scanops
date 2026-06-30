import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES,
  SCANOPS_BRIDGE_TRANSPORT_OPERATION_TYPES,
  buildScanOpsBridgeTransportEnvelope,
  createScanOpsBridgeHttpDispatchAdapter,
  createScanOpsBridgeTransportClient,
  getScanOpsBridgeTransportClientDiagnostics,
} from '../src/inventory-bridge/transportClient/index.js';

const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const stableNow = () => '2026-06-30T00:00:00.000Z';
const endpoint = Object.freeze({
  host: '127.0.0.1',
  port: '8787',
  path: '/scanops/handoff',
  desktopId: 'desktop-001',
  desktopName: 'Inventory Desktop',
  environment: 'LIVE',
});
const deviceIdentity = Object.freeze({
  deviceId: 'scanops-device-001',
  storeId: 'store-001',
  sessionId: 'session-001',
  operatorId: 'operator-001',
});

assert(SCANOPS_BRIDGE_TRANSPORT_OPERATION_TYPES.includes('LOOKUP_REQUEST'), 'operation type list must include LOOKUP_REQUEST');
assert(SCANOPS_BRIDGE_TRANSPORT_OPERATION_TYPES.includes('COUNT_SUBMISSION'), 'operation type list must include COUNT_SUBMISSION');
assert(SCANOPS_BRIDGE_TRANSPORT_OPERATION_TYPES.includes('DEVICE_HEALTH_PING'), 'operation type list must include DEVICE_HEALTH_PING');

const envelope = buildScanOpsBridgeTransportEnvelope('COUNT_SUBMISSION', { evidenceOnly: true, itemId: 'item-001', countedQuantity: 1 }, {
  endpoint,
  deviceIdentity,
  envelopeId: 'scanops-env-phase6-validation-001',
  now: stableNow,
});

assert(Object.isFrozen(envelope), 'built envelope must be frozen');
assert(envelope.envelopeId === 'scanops-env-phase6-validation-001', 'envelope ID must be preserved');
assert(envelope.operationType === 'COUNT_SUBMISSION', 'operation type must be normalized');
assert(envelope.environment === 'LIVE', 'environment must be set from endpoint');
assert(envelope.source.deviceId === 'scanops-device-001', 'source device ID must be set');
assert(envelope.source.storeId === 'store-001', 'source store ID must be set');
assert(envelope.target.desktopId === 'desktop-001', 'target desktop ID must be set');
assert(envelope.transport.mutationIntent === false, 'transport envelope must not declare mutation intent');
assert(envelope.transport.inventoryDirectWrite === false, 'transport envelope must not declare direct Inventory write');

const blockedClient = createScanOpsBridgeTransportClient({ now: stableNow });
const blockedReadiness = blockedClient.getReadiness();
const blockedSend = await blockedClient.sendHandoff(envelope);

assert(blockedReadiness.ready === false, 'client without endpoint and dispatch must not be ready');
assert(blockedReadiness.autoSyncEnabled === false, 'auto sync must remain disabled');
assert(blockedReadiness.queueProcessingEnabled === false, 'queue processing must remain disabled');
assert(blockedReadiness.backgroundReplayEnabled === false, 'background replay must remain disabled');
assert(blockedReadiness.inventoryDirectMutationBlocked === true, 'direct Inventory mutation must be blocked');
assert(blockedSend.status === SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.BLOCKED, 'send without endpoint and dispatch must be blocked');
assert(blockedSend.dispatchAttempted === false, 'blocked send must not attempt dispatch');

let dispatchCalls = 0;
let duplicateSeen = false;
const client = createScanOpsBridgeTransportClient({
  endpoint,
  now: stableNow,
  dispatch: async ({ endpoint: submittedEndpoint, envelope: submittedEnvelope }) => {
    dispatchCalls += 1;
    const status = duplicateSeen ? 'DUPLICATE' : 'ACCEPTED';
    duplicateSeen = true;
    assert(submittedEndpoint.desktopId === 'desktop-001', 'dispatch receives endpoint context');
    assert(submittedEnvelope.envelopeId === envelope.envelopeId, 'dispatch receives submitted envelope');
    return Object.freeze({
      receiptId: `receipt:${status.toLowerCase()}:${submittedEnvelope.envelopeId}`,
      envelopeId: submittedEnvelope.envelopeId,
      status,
      receivedAt: stableNow(),
      processedAt: stableNow(),
      desktopId: submittedEndpoint.desktopId,
      environment: submittedEndpoint.environment,
      operationType: submittedEnvelope.operationType,
      message: status === 'ACCEPTED' ? 'Accepted by Inventory Desktop bridge.' : 'Duplicate envelope detected.',
      errors: [],
      warnings: [],
    });
  },
});

const readiness = client.getReadiness();
const accepted = await client.sendHandoff(envelope);
const duplicate = await client.sendHandoff(envelope);
const unsupported = await client.sendHandoff({ ...envelope, envelopeId: 'scanops-env-phase6-unsupported', operationType: 'DIRECT_STOCK_MUTATION' });
const missingPayload = await client.sendHandoff({ ...envelope, envelopeId: 'scanops-env-phase6-missing-payload', payload: null });
const errorClient = createScanOpsBridgeTransportClient({
  endpoint,
  now: stableNow,
  dispatch: async () => {
    throw new Error('simulated desktop bridge outage');
  },
});
const transportError = await errorClient.sendHandoff({ ...envelope, envelopeId: 'scanops-env-phase6-transport-error' });
const invalidReceiptClient = createScanOpsBridgeTransportClient({
  endpoint,
  now: stableNow,
  dispatch: async () => Object.freeze({ receiptId: '', envelopeId: 'wrong-envelope', status: 'ACCEPTED' }),
});
const invalidReceipt = await invalidReceiptClient.sendHandoff({ ...envelope, envelopeId: 'scanops-env-phase6-invalid-receipt' });
const httpEnvelope = { ...envelope, envelopeId: 'scanops-env-phase6-http-adapter' };
let httpAdapterCalled = false;
const httpAdapter = createScanOpsBridgeHttpDispatchAdapter(async (url, request) => {
  httpAdapterCalled = true;
  assert(url === 'http://127.0.0.1:8787/scanops/handoff', 'HTTP adapter must target endpoint URL');
  assert(request.method === 'POST', 'HTTP adapter must use POST');
  assert(request.headers['Content-Type'] === 'application/json', 'HTTP adapter must send JSON');
  const body = JSON.parse(request.body);
  assert(body.envelope.envelopeId === httpEnvelope.envelopeId, 'HTTP adapter body must include submitted envelope');
  return Object.freeze({
    ok: true,
    status: 200,
    json: async () => Object.freeze({
      receiptId: `receipt:http:${body.envelope.envelopeId}`,
      envelopeId: body.envelope.envelopeId,
      status: 'ACCEPTED',
      receivedAt: stableNow(),
      processedAt: stableNow(),
      desktopId: endpoint.desktopId,
      environment: endpoint.environment,
      operationType: body.envelope.operationType,
      message: 'Accepted by injected HTTP adapter.',
      errors: [],
      warnings: [],
    }),
  });
});
const httpClient = createScanOpsBridgeTransportClient({ endpoint, now: stableNow, dispatch: httpAdapter });
const httpAccepted = await httpClient.sendHandoff(httpEnvelope);

assert(readiness.ready === true, 'client with endpoint and dispatch must be ready');
assert(accepted.status === SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.RECEIPT_ACCEPTED, 'accepted desktop receipt must produce RECEIPT_ACCEPTED');
assert(duplicate.status === SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.RECEIPT_DUPLICATE, 'duplicate desktop receipt must produce RECEIPT_DUPLICATE');
assert(unsupported.status === SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.BLOCKED, 'unsupported operation must be blocked before dispatch');
assert(unsupported.dispatchAttempted === false, 'unsupported operation must not dispatch');
assert(missingPayload.status === SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.BLOCKED, 'missing payload must be blocked before dispatch');
assert(missingPayload.dispatchAttempted === false, 'missing payload must not dispatch');
assert(transportError.status === SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.TRANSPORT_ERROR, 'dispatch adapter errors must become transport errors');
assert(invalidReceipt.status === SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.RECEIPT_INVALID, 'invalid desktop receipt must be rejected');
assert(httpAdapterCalled === true, 'HTTP adapter must be invoked through transport client');
assert(httpAccepted.status === SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.RECEIPT_ACCEPTED, 'HTTP adapter receipt must be processed');
assert(dispatchCalls === 2, 'valid accepted and duplicate handoffs should dispatch exactly twice');

for (const result of [blockedSend, accepted, duplicate, unsupported, missingPayload, transportError, invalidReceipt, httpAccepted]) {
  assert(result.inventoryMutationAttempted === false, `${result.status} must not attempt Inventory mutation`);
  assert(result.scanOpsMutationAttempted === false, `${result.status} must not attempt ScanOps mutation`);
  assert(result.stockMutationAttempted === false, `${result.status} must not attempt stock mutation`);
}

const diagnostics = await getScanOpsBridgeTransportClientDiagnostics({ now: stableNow });
assert(diagnostics.passed === true, 'transport client diagnostics must pass');
for (const check of diagnostics.checks) {
  assert(check.passed === true, `diagnostic check failed: ${check.name}`);
}

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), '..');
const scannedFiles = Object.freeze([
  'src/inventory-bridge/transportClient/httpDispatchAdapter.js',
  'src/inventory-bridge/transportClient/scanOpsTransportClient.js',
  'src/inventory-bridge/transportClient/index.js',
]);
const forbiddenDirectMutationPatterns = Object.freeze([
  { pattern: /postInventoryMovement/i, label: 'Inventory movement posting' },
  { pattern: /StockMovement/i, label: 'StockMovement write path' },
  { pattern: /createPurchaseOrder/i, label: 'purchase order creation' },
  { pattern: /approve.*markdown/i, label: 'markdown approval' },
  { pattern: /approve.*waste/i, label: 'waste approval' },
  { pattern: /writeFile\s*\(/, label: 'file write' },
  { pattern: /appendFile\s*\(/, label: 'file append' },
  { pattern: /localStorage\./, label: 'localStorage write surface' },
  { pattern: /sessionStorage\./, label: 'sessionStorage write surface' },
  { pattern: /indexedDB/i, label: 'indexedDB access' },
]);

for (const relativePath of scannedFiles) {
  const filePath = path.join(repoRoot, relativePath);
  const content = fs.readFileSync(filePath, 'utf8');
  for (const forbidden of forbiddenDirectMutationPatterns) {
    assert(!forbidden.pattern.test(content), `${relativePath} must not contain ${forbidden.label}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 6 transport client foundation validates envelope building, guarded dispatch, injected HTTP dispatch, desktop receipt processing, transport errors, duplicate receipts, and no Inventory/ScanOps/stock mutation.');
