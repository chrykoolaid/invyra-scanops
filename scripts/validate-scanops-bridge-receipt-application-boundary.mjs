import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCANOPS_BRIDGE_RECEIPT_APPLICATION_STATUSES,
  SCANOPS_BRIDGE_RECEIPT_DISPLAY_STATUSES,
  buildScanOpsReceiptApplicationBoundary,
} from '../src/inventory-bridge/receiptApplication/index.js';

const errors = [];
const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), '..');

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

const stableNow = () => '2026-07-01T00:00:00.000Z';
const manualSyncResult = Object.freeze({
  status: 'MANUAL_SYNC_PARTIAL',
  projectedQueuePatches: Object.freeze([
    Object.freeze({ id: 'queue-001', status: 'SYNCED', bridgeEnvelopeId: 'env-001', bridgeReceiptId: 'receipt-001', bridgeReceiptStatus: 'ACCEPTED' }),
    Object.freeze({ id: 'queue-002', status: 'SERVICE_UNAVAILABLE', bridgeEnvelopeId: 'env-002', bridgeReceiptId: 'receipt-002', bridgeReceiptStatus: 'SERVICE_UNAVAILABLE' }),
    Object.freeze({ id: 'queue-003', status: 'DUPLICATE', bridgeEnvelopeId: 'env-003', bridgeReceiptId: 'receipt-003', bridgeReceiptStatus: 'DUPLICATE' }),
  ]),
  syncResults: Object.freeze([
    Object.freeze({ queueItemId: 'queue-001', operationType: 'STOCK_COUNT_EVIDENCE', status: 'SYNCED', receiptProjection: Object.freeze({ previousQueueStatus: 'sync_pending', operationType: 'STOCK_COUNT_EVIDENCE' }) }),
    Object.freeze({ queueItemId: 'queue-002', operationType: 'RECEIVING_EVIDENCE', status: 'SERVICE_UNAVAILABLE', receiptProjection: Object.freeze({ previousQueueStatus: 'sync_pending', operationType: 'RECEIVING_EVIDENCE' }) }),
    Object.freeze({ queueItemId: 'queue-003', operationType: 'REPLENISHMENT_EVIDENCE', status: 'DUPLICATE', receiptProjection: Object.freeze({ previousQueueStatus: 'sync_pending', operationType: 'REPLENISHMENT_EVIDENCE' }) }),
  ]),
});

const staged = buildScanOpsReceiptApplicationBoundary(manualSyncResult, { now: stableNow });
assert(staged.status === SCANOPS_BRIDGE_RECEIPT_APPLICATION_STATUSES.STAGED, 'receipt boundary must stage projected receipt descriptors');
assert(staged.stagedReceiptCount === 3, 'receipt boundary must preserve staged receipt count');
assert(staged.displayOnlyCount === 3, 'all receipt boundary items must be display-only');
assert(staged.reviewRequiredCount === 2, 'duplicate and retry receipt outcomes must require review/attention');
assert(staged.retryRequiredCount === 1, 'service unavailable receipt must map to retry required display');
assert(staged.queueWriteAllowed === false, 'receipt boundary must not allow queue writes');
assert(staged.queueWriteApplied === false, 'receipt boundary must not apply queue writes');
assert(staged.inventoryMutationAttempted === false, 'receipt boundary must not attempt Inventory mutation');
assert(staged.stockMutationAttempted === false, 'receipt boundary must not attempt stock mutation');
assert(staged.priceMutationAttempted === false, 'receipt boundary must not attempt price mutation');
assert(staged.approvalMutationAttempted === false, 'receipt boundary must not attempt approval mutation');
assert(staged.stagedReceiptApplications[0].displayStatus === SCANOPS_BRIDGE_RECEIPT_DISPLAY_STATUSES.DISPLAY_SYNCED, 'accepted receipt must display as synced');
assert(staged.stagedReceiptApplications[1].displayStatus === SCANOPS_BRIDGE_RECEIPT_DISPLAY_STATUSES.DISPLAY_RETRY_REQUIRED, 'service unavailable receipt must display as retry required');
assert(staged.stagedReceiptApplications[2].displayStatus === SCANOPS_BRIDGE_RECEIPT_DISPLAY_STATUSES.DISPLAY_DUPLICATE, 'duplicate receipt must display as duplicate');
assert(staged.stagedReceiptApplications.every((item) => item.queueWriteApplied === false && item.displayOnly === true), 'staged receipt items must remain display-only and write-free');

const empty = buildScanOpsReceiptApplicationBoundary({ projectedQueuePatches: [], syncResults: [] }, { now: stableNow });
assert(empty.status === SCANOPS_BRIDGE_RECEIPT_APPLICATION_STATUSES.EMPTY, 'receipt boundary must report empty when no projected patches exist');

const blockedAuto = buildScanOpsReceiptApplicationBoundary(manualSyncResult, { autoApplicationEnabled: true, now: stableNow });
assert(blockedAuto.status === SCANOPS_BRIDGE_RECEIPT_APPLICATION_STATUSES.BLOCKED, 'receipt boundary must block automatic receipt application');

const blockedQueueWrite = buildScanOpsReceiptApplicationBoundary(manualSyncResult, { applyQueueWrites: true, now: stableNow });
assert(blockedQueueWrite.status === SCANOPS_BRIDGE_RECEIPT_APPLICATION_STATUSES.BLOCKED, 'receipt boundary must block queue write application');

const blockedInventoryWrite = buildScanOpsReceiptApplicationBoundary(manualSyncResult, { inventoryMutationAllowed: true, now: stableNow });
assert(blockedInventoryWrite.status === SCANOPS_BRIDGE_RECEIPT_APPLICATION_STATUSES.BLOCKED, 'receipt boundary must block Inventory write application');

const moduleFile = read('src/inventory-bridge/receiptApplication/index.js');
const pageFile = read('src/pages/ManualSyncControl.jsx');
const packageFile = read('package.json');

assert(pageFile.includes('buildScanOpsReceiptApplicationBoundary'), 'manual sync UI must use the Phase 10 receipt boundary');
assert(pageFile.includes('Receipt boundary'), 'manual sync UI must expose receipt boundary status');
assert(pageFile.includes('Display staging only'), 'manual sync UI must label receipt status as display staging only');
assert(packageFile.includes('validate:scanops-bridge-receipt-application-boundary'), 'package scripts must register Phase 10 validation');

const forbiddenModulePatterns = [
  { pattern: /localStorage\./, label: 'localStorage persistence' },
  { pattern: /sessionStorage\./, label: 'sessionStorage persistence' },
  { pattern: /indexedDB/i, label: 'indexedDB access' },
  { pattern: /saveSyncQueue\s*\(/, label: 'queue persistence helper' },
  { pattern: /markSyncSucceeded\s*\(/, label: 'direct queue success mutation' },
  { pattern: /markSyncFailed\s*\(/, label: 'direct queue failure mutation' },
  { pattern: /postInventoryMovement/i, label: 'Inventory movement posting' },
  { pattern: /createPurchaseOrder/i, label: 'purchase order creation' },
  { pattern: /setInterval\s*\(/, label: 'background interval' },
  { pattern: /setTimeout\s*\(/, label: 'background timer' },
  { pattern: /Phase 32/i, label: 'Phase 32 scaffold reference' },
];

for (const forbidden of forbiddenModulePatterns) {
  assert(!forbidden.pattern.test(moduleFile), `receipt application boundary must not contain ${forbidden.label}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 10 receipt application boundary validates display-only receipt staging, accepted/duplicate/retry display mapping, no automatic/background application, no direct queue persistence, no Inventory/stock/price/approval mutation, and no Phase 32 scaffold expansion.');
