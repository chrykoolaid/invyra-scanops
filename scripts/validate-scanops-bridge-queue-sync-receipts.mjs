import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES,
  buildScanOpsQueueSyncCandidate,
  mapScanOpsQueueEventToTransportOperation,
  mapScanOpsTransportResultToQueueStatus,
  projectScanOpsQueueReceiptStatus,
  runScanOpsQueueSyncHandoff,
  validateScanOpsQueueItemForBridgeSync,
} from '../src/inventory-bridge/queueSync/index.js';
import {
  SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES,
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
const countQueueItem = Object.freeze({
  id: 'queue-count-001',
  eventType: 'STOCK_COUNT_LINE_SAVED',
  status: 'queued',
  sourceWorkflow: 'count',
  title: 'Count item evidence',
  payload: Object.freeze({ itemId: 'item-001', countedQuantity: 3, evidenceOnly: true }),
});

assert(mapScanOpsQueueEventToTransportOperation(countQueueItem).operationType === 'COUNT_SUBMISSION', 'stock count queue events must map to COUNT_SUBMISSION');
assert(mapScanOpsQueueEventToTransportOperation({ id: 'q2', eventType: 'RECEIVING_LINE_SAVED', payload: {} }).operationType === 'RECEIVING_SUBMISSION', 'receiving queue events must map to RECEIVING_SUBMISSION');
assert(mapScanOpsQueueEventToTransportOperation({ id: 'q3', eventType: 'ITEM_LOOKUP_REQUEST', payload: {} }).operationType === 'LOOKUP_REQUEST', 'lookup queue events must map to LOOKUP_REQUEST');
assert(mapScanOpsQueueEventToTransportOperation({ id: 'q4', eventType: 'DEVICE_HEALTH', payload: {} }).operationType === 'DEVICE_HEALTH_PING', 'device health queue events must map to DEVICE_HEALTH_PING');

const validation = validateScanOpsQueueItemForBridgeSync(countQueueItem);
assert(validation.valid === true, 'valid count queue item must pass queue sync validation');
assert(validation.queueItemId === 'queue-count-001', 'queue sync validation must preserve queue item ID');

const candidate = buildScanOpsQueueSyncCandidate(countQueueItem, {
  endpoint,
  deviceIdentity,
  envelopeId: 'scanops-env-phase7-validation-001',
  now: stableNow,
});
assert(candidate.status === SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.READY, 'valid queue item must become a ready queue sync candidate');
assert(candidate.envelope.envelopeId === 'scanops-env-phase7-validation-001', 'queue sync candidate must preserve supplied envelope ID');
assert(candidate.envelope.operationType === 'COUNT_SUBMISSION', 'queue sync candidate must build a transport envelope with mapped operation type');
assert(candidate.envelope.payload.queueItemId === 'queue-count-001', 'queue sync envelope payload must include queue item ID');
assert(candidate.envelope.payload.mutationIntent === false, 'queue sync envelope payload must block mutation intent');
assert(candidate.envelope.payload.inventoryDirectWrite === false, 'queue sync envelope payload must block direct Inventory writes');
assert(candidate.autoSyncEnabled === false, 'queue sync candidate must not enable auto sync');
assert(candidate.backgroundReplayEnabled === false, 'queue sync candidate must not enable background replay');
assert(candidate.projectionOnly === true, 'queue sync candidate must be projection-only');

const unsupportedCandidate = buildScanOpsQueueSyncCandidate({
  id: 'queue-bad-operation',
  eventType: 'DIRECT_STOCK_MUTATION',
  status: 'queued',
  payload: {},
}, { endpoint, deviceIdentity, now: stableNow });
assert(unsupportedCandidate.status === SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.BLOCKED, 'unsupported direct mutation event must be blocked');
assert(unsupportedCandidate.envelope === null, 'blocked queue sync candidate must not create an envelope');

const missingPayloadCandidate = buildScanOpsQueueSyncCandidate({
  id: 'queue-missing-payload',
  eventType: 'STOCK_COUNT_LINE_SAVED',
  status: 'queued',
}, { endpoint, deviceIdentity, now: stableNow });
assert(missingPayloadCandidate.status === SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.BLOCKED, 'queue item without payload must be blocked');

const mutationIntentCandidate = buildScanOpsQueueSyncCandidate({
  id: 'queue-mutation-intent',
  eventType: 'STOCK_COUNT_LINE_SAVED',
  status: 'queued',
  payload: { itemId: 'item-001', inventoryDirectWrite: true },
}, { endpoint, deviceIdentity, now: stableNow });
assert(mutationIntentCandidate.status === SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.BLOCKED, 'queue item carrying direct Inventory write intent must be blocked');

const acceptedResult = await runScanOpsQueueSyncHandoff(countQueueItem, {
  endpoint,
  deviceIdentity,
  envelopeId: 'scanops-env-phase7-accepted',
  now: stableNow,
  dispatch: async ({ endpoint: submittedEndpoint, envelope }) => {
    assert(submittedEndpoint.desktopId === 'desktop-001', 'queue sync dispatch must receive endpoint context');
    assert(envelope.payload.queueItemId === 'queue-count-001', 'queue sync dispatch must receive queue item payload');
    return Object.freeze({
      receiptId: `receipt:accepted:${envelope.envelopeId}`,
      envelopeId: envelope.envelopeId,
      status: 'ACCEPTED',
      receivedAt: stableNow(),
      processedAt: stableNow(),
      desktopId: submittedEndpoint.desktopId,
      environment: submittedEndpoint.environment,
      operationType: envelope.operationType,
      message: 'Accepted by Inventory Desktop bridge.',
      errors: [],
      warnings: [],
    });
  },
});
assert(acceptedResult.status === SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.SYNCED, 'accepted receipt must project queue status to SYNCED');
assert(acceptedResult.dispatchAttempted === true, 'accepted queue handoff must attempt explicit dispatch');
assert(acceptedResult.receiptProjection.projectedQueuePatch.status === SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.SYNCED, 'accepted receipt must produce a projected queue patch');
assert(acceptedResult.receiptProjection.queueWriteApplied === false, 'receipt projection must not apply queue writes itself');
assert(countQueueItem.status === 'queued', 'queue sync handoff must not mutate the original queue item');

const duplicateProjection = projectScanOpsQueueReceiptStatus({
  queueItem: countQueueItem,
  now: stableNow,
  transportResult: Object.freeze({
    status: SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.RECEIPT_DUPLICATE,
    envelopeId: 'scanops-env-phase7-duplicate',
    operationType: 'COUNT_SUBMISSION',
    receiptReceived: true,
    errors: [],
    receipt: Object.freeze({ receiptId: 'receipt-duplicate', envelopeId: 'scanops-env-phase7-duplicate', status: 'DUPLICATE' }),
  }),
});
assert(duplicateProjection.nextQueueStatus === SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.DUPLICATE, 'duplicate receipt must project queue status to DUPLICATE');

assert(mapScanOpsTransportResultToQueueStatus({ status: SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.RECEIPT_REJECTED }) === SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.REJECTED, 'rejected receipt must map to REJECTED');
assert(mapScanOpsTransportResultToQueueStatus({ status: SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.RECEIPT_UNSUPPORTED }) === SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.NEEDS_REVIEW, 'unsupported receipt must map to NEEDS_REVIEW');
assert(mapScanOpsTransportResultToQueueStatus({ status: SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.RECEIPT_SERVICE_UNAVAILABLE }) === SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.SERVICE_UNAVAILABLE, 'service unavailable receipt must map to SERVICE_UNAVAILABLE');
assert(mapScanOpsTransportResultToQueueStatus({ status: SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.RECEIPT_INVALID }) === SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.NEEDS_REVIEW, 'invalid receipt must map to NEEDS_REVIEW');
assert(mapScanOpsTransportResultToQueueStatus({ status: SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.TRANSPORT_ERROR }) === SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.TRANSPORT_ERROR, 'transport errors must map to TRANSPORT_ERROR');
assert(mapScanOpsTransportResultToQueueStatus({ status: SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.BLOCKED }) === SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.BLOCKED, 'blocked transport result must map to QUEUE_ENVELOPE_BLOCKED');

const blockedByTransport = await runScanOpsQueueSyncHandoff(countQueueItem, {
  endpoint,
  deviceIdentity,
  envelopeId: 'scanops-env-phase7-no-dispatch',
  now: stableNow,
});
assert(blockedByTransport.status === SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.BLOCKED, 'explicit handoff without dispatch adapter must project blocked queue status');
assert(blockedByTransport.dispatchAttempted === false, 'blocked transport handoff must not attempt dispatch');

const transportErrorResult = await runScanOpsQueueSyncHandoff(countQueueItem, {
  endpoint,
  deviceIdentity,
  envelopeId: 'scanops-env-phase7-transport-error',
  now: stableNow,
  dispatch: async () => {
    throw new Error('simulated desktop bridge outage');
  },
});
assert(transportErrorResult.status === SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.TRANSPORT_ERROR, 'transport adapter errors must project queue status to TRANSPORT_ERROR');

for (const result of [candidate, unsupportedCandidate, missingPayloadCandidate, mutationIntentCandidate, acceptedResult, blockedByTransport, transportErrorResult]) {
  assert(result.inventoryMutationAttempted === false, `${result.status} must not attempt Inventory mutation`);
  assert(result.scanOpsMutationAttempted === false, `${result.status} must not apply ScanOps queue mutation`);
  assert(result.stockMutationAttempted === false, `${result.status} must not attempt stock mutation`);
  assert(result.priceMutationAttempted === false, `${result.status} must not attempt price mutation`);
  assert(result.backgroundReplayEnabled === false, `${result.status} must not enable background replay`);
}

for (const projection of [acceptedResult.receiptProjection, duplicateProjection, transportErrorResult.receiptProjection]) {
  assert(projection.inventoryMutationAttempted === false, `${projection.nextQueueStatus} projection must not attempt Inventory mutation`);
  assert(projection.scanOpsMutationAttempted === false, `${projection.nextQueueStatus} projection must not apply ScanOps queue mutation`);
  assert(projection.stockMutationAttempted === false, `${projection.nextQueueStatus} projection must not attempt stock mutation`);
  assert(projection.priceMutationAttempted === false, `${projection.nextQueueStatus} projection must not attempt price mutation`);
  assert(projection.projectionOnly === true, `${projection.nextQueueStatus} projection must remain projection-only`);
}

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), '..');
const scannedFiles = Object.freeze([
  'src/inventory-bridge/queueSync/queueSyncTypes.js',
  'src/inventory-bridge/queueSync/queueSyncUtils.js',
  'src/inventory-bridge/queueSync/scanOpsQueueSync.js',
  'src/inventory-bridge/queueSync/index.js',
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

console.log('ScanOps bridge Phase 7 queue sync receipt processing validates queue item mapping, guarded transport envelope creation, explicit handoff receipt projection, blocked unsupported events, duplicate/rejected/unavailable/error receipt status mapping, no background replay, and no Inventory/ScanOps/stock/price mutation.');
