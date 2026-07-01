import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildScanOpsReceiptApplicationBoundary } from '../src/inventory-bridge/receiptApplication/index.js';
import {
  SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS,
  SCANOPS_BRIDGE_RECEIPT_REVIEW_STATUSES,
  buildScanOpsReceiptReviewDecisionSurface,
} from '../src/inventory-bridge/receiptReview/index.js';

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
    Object.freeze({ id: 'queue-accepted', status: 'SYNCED', bridgeEnvelopeId: 'env-accepted', bridgeReceiptId: 'receipt-accepted', bridgeReceiptStatus: 'ACCEPTED' }),
    Object.freeze({ id: 'queue-duplicate', status: 'DUPLICATE', bridgeEnvelopeId: 'env-duplicate', bridgeReceiptId: 'receipt-duplicate', bridgeReceiptStatus: 'DUPLICATE' }),
    Object.freeze({ id: 'queue-service', status: 'SERVICE_UNAVAILABLE', bridgeEnvelopeId: 'env-service', bridgeReceiptId: 'receipt-service', bridgeReceiptStatus: 'SERVICE_UNAVAILABLE' }),
    Object.freeze({ id: 'queue-transport', status: 'TRANSPORT_ERROR', bridgeEnvelopeId: 'env-transport', bridgeReceiptId: 'receipt-transport', bridgeReceiptStatus: 'TRANSPORT_ERROR' }),
    Object.freeze({ id: 'queue-rejected', status: 'REJECTED', bridgeEnvelopeId: 'env-rejected', bridgeReceiptId: 'receipt-rejected', bridgeReceiptStatus: 'REJECTED' }),
    Object.freeze({ id: 'queue-blocked', status: 'BLOCKED', bridgeEnvelopeId: 'env-blocked', bridgeReceiptId: 'receipt-blocked', bridgeReceiptStatus: 'BLOCKED' }),
  ]),
  syncResults: Object.freeze([
    Object.freeze({ queueItemId: 'queue-accepted', operationType: 'STOCK_COUNT_EVIDENCE', status: 'SYNCED' }),
    Object.freeze({ queueItemId: 'queue-duplicate', operationType: 'REPLENISHMENT_EVIDENCE', status: 'DUPLICATE' }),
    Object.freeze({ queueItemId: 'queue-service', operationType: 'RECEIVING_EVIDENCE', status: 'SERVICE_UNAVAILABLE' }),
    Object.freeze({ queueItemId: 'queue-transport', operationType: 'RECEIVING_EVIDENCE', status: 'TRANSPORT_ERROR' }),
    Object.freeze({ queueItemId: 'queue-rejected', operationType: 'WASTAGE_EVIDENCE', status: 'REJECTED' }),
    Object.freeze({ queueItemId: 'queue-blocked', operationType: 'ADJUSTMENT_EVIDENCE', status: 'BLOCKED' }),
  ]),
});

const boundary = buildScanOpsReceiptApplicationBoundary(manualSyncResult, { now: stableNow });
const surface = buildScanOpsReceiptReviewDecisionSurface(boundary, { now: stableNow });

assert(surface.status === SCANOPS_BRIDGE_RECEIPT_REVIEW_STATUSES.READY, 'Phase 11 receipt review surface must be ready when Phase 10 descriptors exist');
assert(surface.decisionMode === 'OPERATOR_DECISION_DESCRIPTORS_ONLY', 'receipt review surface must expose decision descriptors only');
assert(surface.decisionItemCount === 6, 'receipt review surface must preserve staged receipt count');
assert(surface.acceptedCount === 1, 'accepted receipt must classify as synced / accepted');
assert(surface.duplicateCount === 1, 'duplicate receipt must classify as duplicate');
assert(surface.retryRequiredCount === 2, 'service unavailable and transport error must classify as retry required');
assert(surface.reviewRequiredCount === 1, 'rejected receipt must classify as review required');
assert(surface.blockedCount === 1, 'blocked receipt must classify as blocked');
assert(surface.descriptorOnlyCount === 6, 'all receipt review items must be descriptor-only');
assert(surface.queueWriteAllowed === false, 'receipt review surface must not allow queue writes');
assert(surface.queueWriteApplied === false, 'receipt review surface must not apply queue writes');
assert(surface.retryApplied === false, 'receipt review surface must not apply retry');
assert(surface.inventoryMutationAttempted === false, 'receipt review surface must not mutate Inventory');
assert(surface.stockMutationAttempted === false, 'receipt review surface must not mutate stock');
assert(surface.priceMutationAttempted === false, 'receipt review surface must not mutate price');
assert(surface.approvalMutationAttempted === false, 'receipt review surface must not mutate approvals');

const retryItems = surface.decisionItems.filter((item) => item.classification === SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.RETRY_REQUIRED);
assert(retryItems.length === 2, 'retry required decision items must be visible');
assert(retryItems.every((item) => item.decisionDescriptors.includes('Retry manually')), 'retry required items must expose Retry manually descriptor');
assert(retryItems.every((item) => item.retryDecisionAvailable === true && item.retryApplied === false), 'manual retry must be available as descriptor but not applied');

const duplicateItem = surface.decisionItems.find((item) => item.classification === SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.DUPLICATE);
assert(duplicateItem?.decisionDescriptors.includes('Acknowledge duplicate'), 'duplicate items must expose Acknowledge duplicate descriptor');
assert(duplicateItem?.decisionDescriptors.includes('Keep queued'), 'duplicate items must preserve Keep queued descriptor');
assert(duplicateItem?.duplicateAcknowledgementAvailable === true, 'duplicate acknowledgement must be a visible descriptor');

const reviewItem = surface.decisionItems.find((item) => item.bridgeReceiptStatus === 'REJECTED');
assert(reviewItem?.classification === SCANOPS_BRIDGE_RECEIPT_REVIEW_CLASSIFICATIONS.REVIEW_REQUIRED, 'rejected receipt must remain review required');
assert(reviewItem?.instruction.includes('must not override validation'), 'rejected receipt instruction must preserve Inventory Desktop validation boundary');

const empty = buildScanOpsReceiptReviewDecisionSurface({ stagedReceiptApplications: [] }, { now: stableNow });
assert(empty.status === SCANOPS_BRIDGE_RECEIPT_REVIEW_STATUSES.EMPTY, 'receipt review surface must report empty when no staged descriptors exist');

const blockedAuto = buildScanOpsReceiptReviewDecisionSurface(boundary, { autoRetryEnabled: true, now: stableNow });
assert(blockedAuto.status === SCANOPS_BRIDGE_RECEIPT_REVIEW_STATUSES.BLOCKED, 'receipt review surface must block automatic retry');

const blockedBackground = buildScanOpsReceiptReviewDecisionSurface(boundary, { backgroundRetryEnabled: true, now: stableNow });
assert(blockedBackground.status === SCANOPS_BRIDGE_RECEIPT_REVIEW_STATUSES.BLOCKED, 'receipt review surface must block background retry loops');

const blockedQueueWrite = buildScanOpsReceiptReviewDecisionSurface(boundary, { applyQueueWrites: true, now: stableNow });
assert(blockedQueueWrite.status === SCANOPS_BRIDGE_RECEIPT_REVIEW_STATUSES.BLOCKED, 'receipt review surface must block queue writes');

const blockedDecisionApply = buildScanOpsReceiptReviewDecisionSurface(boundary, { applyRetryDecision: true, now: stableNow });
assert(blockedDecisionApply.status === SCANOPS_BRIDGE_RECEIPT_REVIEW_STATUSES.BLOCKED, 'receipt review surface must block decision application in Phase 11');

const moduleFile = read('src/inventory-bridge/receiptReview/index.js');
const pageFile = read('src/pages/ManualSyncControl.jsx');
const packageFile = read('package.json');

assert(pageFile.includes('buildScanOpsReceiptReviewDecisionSurface'), 'manual sync UI must consume the Phase 11 receipt review decision surface');
assert(pageFile.includes('Receipt Review / Retry Decision Surface'), 'manual sync UI must expose the Phase 11 review surface title');
assert(pageFile.includes('Operator decision descriptors only'), 'manual sync UI must label decisions as descriptor-only');
assert(pageFile.includes('Retry manually'), 'manual sync UI must expose manual retry descriptor copy');
assert(pageFile.includes('Acknowledge duplicate'), 'manual sync UI must expose duplicate acknowledgement descriptor copy');
assert(pageFile.includes('Keep queued'), 'manual sync UI must expose keep queued descriptor copy');
assert(packageFile.includes('validate:scanops-bridge-receipt-review-decision-surface'), 'package scripts must register Phase 11 validation');

const forbiddenModulePatterns = [
  { pattern: /localStorage\./, label: 'localStorage persistence' },
  { pattern: /sessionStorage\./, label: 'sessionStorage persistence' },
  { pattern: /indexedDB/i, label: 'indexedDB access' },
  { pattern: /saveSyncQueue\s*\(/, label: 'queue persistence helper' },
  { pattern: /markSyncSucceeded\s*\(/, label: 'direct queue success mutation' },
  { pattern: /markSyncFailed\s*\(/, label: 'direct queue failure mutation' },
  { pattern: /retryAllSyncEvents/i, label: 'legacy retry-all queue mutation' },
  { pattern: /postInventoryMovement/i, label: 'Inventory movement posting' },
  { pattern: /StockMovement/i, label: 'StockMovement write path' },
  { pattern: /createPurchaseOrder/i, label: 'purchase order creation' },
  { pattern: /approve.*markdown/i, label: 'markdown approval mutation' },
  { pattern: /approve.*waste/i, label: 'waste approval mutation' },
  { pattern: /setInterval\s*\(/, label: 'background interval' },
  { pattern: /setTimeout\s*\(/, label: 'background timer' },
  { pattern: /Phase 32/i, label: 'Phase 32 scaffold reference' },
];

for (const forbidden of forbiddenModulePatterns) {
  assert(!forbidden.pattern.test(moduleFile), `receipt review module must not contain ${forbidden.label}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 11 receipt review / retry decision surface validates accepted, duplicate, retry-required, review-required, and blocked receipt outcomes as operator decision descriptors only, with no automatic replay, no background retry loop, no queue writes, no Inventory/stock/price/approval mutation, and no Phase 32 scaffold expansion.');
