import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCANOPS_BRIDGE_MANUAL_SYNC_BLOCKERS,
  SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES,
  buildScanOpsManualSyncExecutionPlan,
  runScanOpsManualSyncExecution,
  validateScanOpsManualSyncRequest,
} from '../src/inventory-bridge/manualSync/index.js';

const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const stableNow = () => '2026-07-01T00:00:00.000Z';
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
const manualRequest = Object.freeze({
  trigger: 'manual',
  userInitiated: true,
  requestedBy: 'operator-001',
  requestedAt: stableNow(),
  reason: 'Operator tapped Sync Now.',
});
const queueItems = Object.freeze([
  Object.freeze({
    id: 'queue-count-001',
    eventType: 'STOCK_COUNT_LINE_SAVED',
    status: 'queued',
    sourceWorkflow: 'count',
    title: 'Count item evidence',
    payload: Object.freeze({ itemId: 'item-001', countedQuantity: 3, evidenceOnly: true }),
  }),
  Object.freeze({
    id: 'queue-receiving-001',
    eventType: 'RECEIVING_LINE_SAVED',
    status: 'queued',
    sourceWorkflow: 'receiving',
    title: 'Receiving line evidence',
    payload: Object.freeze({ itemId: 'item-002', receivedQuantity: 2, evidenceOnly: true }),
  }),
]);

const missingManual = validateScanOpsManualSyncRequest(queueItems, { endpoint, deviceIdentity, now: stableNow });
assert(missingManual.valid === false, 'manual sync request validation must block missing user/operator request');
assert(missingManual.errors.some((error) => error.code === SCANOPS_BRIDGE_MANUAL_SYNC_BLOCKERS.MANUAL_REQUEST_REQUIRED), 'missing manual request must carry manual request blocker');

const autoSyncBlocked = buildScanOpsManualSyncExecutionPlan(queueItems, { endpoint, deviceIdentity, manualRequest, autoSyncEnabled: true, now: stableNow });
assert(autoSyncBlocked.status === SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.BLOCKED, 'manual sync plan must block automatic sync mode');
assert(autoSyncBlocked.autoSyncEnabled === false, 'manual sync plan must keep auto sync disabled even when requested');

const backgroundReplayBlocked = buildScanOpsManualSyncExecutionPlan(queueItems, { endpoint, deviceIdentity, manualRequest, backgroundReplayEnabled: true, now: stableNow });
assert(backgroundReplayBlocked.status === SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.BLOCKED, 'manual sync plan must block background replay mode');
assert(backgroundReplayBlocked.backgroundReplayEnabled === false, 'manual sync plan must keep background replay disabled even when requested');

const emptyPlan = buildScanOpsManualSyncExecutionPlan([], { endpoint, deviceIdentity, manualRequest, now: stableNow });
assert(emptyPlan.status === SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.EMPTY, 'manual sync plan must report empty queue without dispatch');
assert(emptyPlan.queueItemCount === 0, 'empty manual sync plan must preserve zero queue item count');

const plan = buildScanOpsManualSyncExecutionPlan(queueItems, { endpoint, deviceIdentity, manualRequest, now: stableNow });
assert(plan.status === SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.READY, 'manual sync plan must be ready when manual request and valid queue items are present');
assert(plan.executionMode === 'MANUAL_ONLY', 'manual sync plan must be manual-only');
assert(plan.readyQueueItemCount === 2, 'manual sync plan must identify ready queue items');
assert(plan.blockedQueueItemCount === 0, 'manual sync plan must not block valid queue items');
assert(plan.userInitiatedOnly === true, 'manual sync plan must be user-initiated only');
assert(plan.projectionOnly === true, 'manual sync plan must be projection-only');
assert(plan.queueWriteApplied === false, 'manual sync plan must not apply queue writes');

const mixedPlan = buildScanOpsManualSyncExecutionPlan([
  ...queueItems,
  Object.freeze({ id: 'queue-direct-mutation-001', eventType: 'DIRECT_STOCK_MUTATION', status: 'queued', payload: Object.freeze({ inventoryDirectWrite: true }) }),
], { endpoint, deviceIdentity, manualRequest, now: stableNow });
assert(mixedPlan.status === SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.READY, 'manual sync plan may continue when some queue items are ready and unsafe items are blocked');
assert(mixedPlan.readyQueueItemCount === 2, 'manual sync plan must keep ready count limited to valid items');
assert(mixedPlan.blockedQueueItemCount === 1, 'manual sync plan must block unsafe mutation-intent queue items');

const noDispatch = await runScanOpsManualSyncExecution(queueItems, { endpoint, deviceIdentity, manualRequest, now: stableNow });
assert(noDispatch.status === SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.BLOCKED, 'manual sync execution must require explicit dispatch surface');
assert(noDispatch.dispatchAttempted === false, 'manual sync execution must not dispatch without adapter');
assert(noDispatch.errors.some((error) => error.code === SCANOPS_BRIDGE_MANUAL_SYNC_BLOCKERS.DISPATCH_REQUIRED), 'missing dispatch must carry dispatch blocker');

const dispatchCalls = [];
const completed = await runScanOpsManualSyncExecution(queueItems, {
  endpoint,
  deviceIdentity,
  manualRequest,
  now: stableNow,
  dispatch: async ({ endpoint: submittedEndpoint, envelope }) => {
    dispatchCalls.push(Object.freeze({ endpoint: submittedEndpoint, envelope }));
    const status = envelope.payload.queueItemId === 'queue-receiving-001' ? 'DUPLICATE' : 'ACCEPTED';
    return Object.freeze({
      receiptId: `receipt:${status.toLowerCase()}:${envelope.envelopeId}`,
      envelopeId: envelope.envelopeId,
      status,
      receivedAt: stableNow(),
      processedAt: stableNow(),
      desktopId: submittedEndpoint.desktopId,
      environment: submittedEndpoint.environment,
      operationType: envelope.operationType,
      message: `${status} by Inventory Desktop bridge.`,
      errors: [],
      warnings: [],
    });
  },
});
assert(completed.status === SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.COMPLETED, 'accepted and duplicate receipts must complete manual sync execution');
assert(completed.dispatchAttempted === true, 'manual sync execution must dispatch only after explicit manual request and adapter');
assert(dispatchCalls.length === 2, 'manual sync execution must dispatch each ready queue item once');
assert(completed.syncResults.length === 2, 'manual sync execution must return per-item sync results');
assert(completed.projectedQueuePatches.length === 2, 'manual sync execution must return projected queue patches');
assert(completed.projectedQueuePatches.every((patch) => patch.localProjectionOnly === true && patch.queueWriteApplied === false), 'projected queue patches must remain local projection descriptors only');
assert(queueItems.every((item) => item.status === 'queued'), 'manual sync execution must not mutate source queue item status');

const partial = await runScanOpsManualSyncExecution(queueItems, {
  endpoint,
  deviceIdentity,
  manualRequest,
  now: stableNow,
  dispatch: async ({ endpoint: submittedEndpoint, envelope }) => Object.freeze({
    receiptId: `receipt:${envelope.payload.queueItemId}`,
    envelopeId: envelope.envelopeId,
    status: envelope.payload.queueItemId === 'queue-count-001' ? 'ACCEPTED' : 'REJECTED',
    receivedAt: stableNow(),
    processedAt: stableNow(),
    desktopId: submittedEndpoint.desktopId,
    environment: submittedEndpoint.environment,
    operationType: envelope.operationType,
    message: 'Mixed manual sync receipt.',
    errors: [],
    warnings: [],
  }),
});
assert(partial.status === SCANOPS_BRIDGE_MANUAL_SYNC_STATUSES.PARTIAL, 'mixed accepted/rejected receipts must project partial manual sync execution');

for (const result of [autoSyncBlocked, backgroundReplayBlocked, emptyPlan, plan, mixedPlan, noDispatch, completed, partial]) {
  assert(result.inventoryMutationAttempted === false, `${result.status} must not attempt Inventory mutation`);
  assert(result.scanOpsMutationAttempted === false, `${result.status} must not apply ScanOps mutation`);
  assert(result.stockMutationAttempted === false, `${result.status} must not attempt stock mutation`);
  assert(result.priceMutationAttempted === false, `${result.status} must not attempt price mutation`);
  assert(result.approvalMutationAttempted === false, `${result.status} must not attempt approval mutation`);
  assert(result.autoSyncEnabled === false, `${result.status} must not enable automatic sync`);
  assert(result.backgroundReplayEnabled === false, `${result.status} must not enable background replay`);
  assert(result.projectionOnly === true, `${result.status} must remain projection-only`);
  assert(result.queueWriteApplied === false, `${result.status} must not apply queue writes`);
}

for (const result of [...completed.syncResults, ...partial.syncResults]) {
  assert(result.inventoryMutationAttempted === false, `${result.queueItemId} sync result must not attempt Inventory mutation`);
  assert(result.scanOpsMutationAttempted === false, `${result.queueItemId} sync result must not apply ScanOps mutation`);
  assert(result.stockMutationAttempted === false, `${result.queueItemId} sync result must not attempt stock mutation`);
  assert(result.priceMutationAttempted === false, `${result.queueItemId} sync result must not attempt price mutation`);
  assert(result.queueWriteApplied === false, `${result.queueItemId} sync result must not apply queue writes`);
}

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), '..');
const scannedFiles = Object.freeze([
  'src/inventory-bridge/manualSync/manualSyncTypes.js',
  'src/inventory-bridge/manualSync/manualSyncUtils.js',
  'src/inventory-bridge/manualSync/scanOpsManualSyncExecution.js',
  'src/inventory-bridge/manualSync/index.js',
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
  { pattern: /Phase 32/i, label: 'Phase 32 scaffold reference' },
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

console.log('ScanOps bridge Phase 8 controlled manual sync execution validates explicit user/operator initiation, ready/blocked queue planning, sequential manual dispatch, receipt-based local projected status patches, no automatic/background replay, no direct Inventory/ScanOps/stock/price/approval mutation, and no Phase 32 scaffold expansion.');
