import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_BLOCKERS,
  SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_DESCRIPTORS,
  SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_STATUSES,
  buildScanOpsRetryResultAcknowledgementBoundary,
} from '../src/inventory-bridge/retryResultAcknowledgement/index.js';

const errors = [];
const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), '..');
const fixedNow = '2026-07-01T00:00:00.000Z';

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

const retryResultReceiptReviewBoundary = Object.freeze({
  phase: '15',
  component: 'scanops_bridge_retry_result_receipt_review_boundary',
  status: 'RETRY_RESULT_RECEIPT_REVIEW_READY',
  retryResultItems: Object.freeze([
    Object.freeze({
      retryResultReviewId: 'retry-result-review:item-1:receipt-1',
      queueItemId: 'item-1',
      bridgeReceiptId: 'receipt-1',
      classification: 'RETRY_ACCEPTED',
      outcomeLabel: 'Retry accepted',
      instruction: 'Display confirmation only.',
      displayOnly: true,
      queueWriteApplied: false,
      secondRetryApplied: false,
    }),
    Object.freeze({
      retryResultReviewId: 'retry-result-review:item-2:receipt-2',
      queueItemId: 'item-2',
      bridgeReceiptId: 'receipt-2',
      classification: 'RETRY_SERVICE_UNAVAILABLE',
      outcomeLabel: 'Retry service unavailable',
      instruction: 'No automatic second retry is allowed.',
      displayOnly: true,
      queueWriteApplied: false,
      secondRetryApplied: false,
    }),
  ]),
});

const boundary = buildScanOpsRetryResultAcknowledgementBoundary(retryResultReceiptReviewBoundary, {
  selectedAcknowledgementsByRetryResultReviewId: Object.freeze({
    'retry-result-review:item-1:receipt-1': Object.freeze({
      descriptor: SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_DESCRIPTORS.ACKNOWLEDGE_RETRY_RESULT,
      selectedAt: fixedNow,
      selectedBy: 'operator',
    }),
    'retry-result-review:item-2:receipt-2': Object.freeze({
      descriptor: SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_DESCRIPTORS.KEEP_VISIBLE,
      selectedAt: fixedNow,
      selectedBy: 'operator',
    }),
  }),
  now: () => fixedNow,
});

assert(boundary.phase === '16', 'Phase 16 acknowledgement boundary must declare phase 16');
assert(boundary.component === 'scanops_bridge_retry_result_acknowledgement_boundary', 'Phase 16 acknowledgement boundary must expose the expected component id');
assert(boundary.status === SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_STATUSES.READY, 'Phase 16 acknowledgement boundary must be ready for retry result items');
assert(boundary.consumesPhase15RetryResultReviewBoundary === true, 'Phase 16 must consume the Phase 15 retry result receipt review boundary');
assert(boundary.acknowledgementMode === 'LOCAL_OPERATOR_ACKNOWLEDGEMENT_INTENT_ONLY', 'Phase 16 acknowledgement must be local operator intent only');
assert(boundary.localIntentOnly === true && boundary.descriptorOnly === true, 'Phase 16 acknowledgement must be descriptor-only local intent');
assert(boundary.acknowledgementPersistenceAllowed === false && boundary.acknowledgementPersistenceApplied === false, 'Phase 16 must not persist acknowledgement intent');
assert(boundary.queueWriteAllowed === false && boundary.queueWriteApplied === false, 'Phase 16 must not write queue state');
assert(boundary.retryApplied === false && boundary.secondRetryApplied === false && boundary.automaticSecondRetryEnabled === false, 'Phase 16 must not apply retry or second retry');
assert(boundary.backgroundRetryEnabled === false, 'Phase 16 must not enable background retry');
assert(boundary.inventoryMutationAttempted === false, 'Phase 16 must not mutate Inventory truth');
assert(boundary.stockMutationAttempted === false && boundary.priceMutationAttempted === false && boundary.ledgerMutationAttempted === false && boundary.approvalMutationAttempted === false, 'Phase 16 must not mutate stock, price, ledger, or approvals');
assert(boundary.acknowledgementItemCount === 2, 'Phase 16 must expose retry result acknowledgement items');
assert(boundary.selectedAcknowledgementCount === 2, 'Phase 16 must count selected acknowledgement descriptors');
assert(boundary.acknowledgeRetryResultCount === 1, 'Phase 16 must count acknowledgement selections');
assert(boundary.keepVisibleCount === 1, 'Phase 16 must count keep-visible selections');
assert(boundary.descriptorOnlyCount === 2, 'Phase 16 acknowledgement items must remain descriptor-only');
assert(Object.isFrozen(boundary.acknowledgementItems), 'Phase 16 acknowledgement items array must be immutable');

const emptyBoundary = buildScanOpsRetryResultAcknowledgementBoundary({ retryResultItems: [] }, { now: () => fixedNow });
assert(emptyBoundary.status === SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_STATUSES.EMPTY, 'Phase 16 must expose empty status when there are no retry result items');

const blockedSecondRetry = buildScanOpsRetryResultAcknowledgementBoundary(retryResultReceiptReviewBoundary, { executeRetry: true, now: () => fixedNow });
assert(blockedSecondRetry.status === SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_STATUSES.BLOCKED, 'Phase 16 must block retry execution options');
assert(blockedSecondRetry.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_BLOCKERS.SECOND_RETRY_BLOCKED), 'Phase 16 must report the second retry blocker');

const blockedPersistence = buildScanOpsRetryResultAcknowledgementBoundary(retryResultReceiptReviewBoundary, { persistAcknowledgement: true, now: () => fixedNow });
assert(blockedPersistence.status === SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_STATUSES.BLOCKED, 'Phase 16 must block acknowledgement persistence');
assert(blockedPersistence.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_BLOCKERS.PERSISTENCE_BLOCKED), 'Phase 16 must report the acknowledgement persistence blocker');

const blockedQueueWrite = buildScanOpsRetryResultAcknowledgementBoundary(retryResultReceiptReviewBoundary, { applyQueueWrites: true, now: () => fixedNow });
assert(blockedQueueWrite.errors.some((error) => error.code === SCANOPS_BRIDGE_RETRY_RESULT_ACKNOWLEDGEMENT_BLOCKERS.QUEUE_WRITE_BLOCKED), 'Phase 16 must block queue writes');

const componentFile = read('src/components/scanner/ReceiptDecisionIntentSurface.jsx');
const packageFile = read('package.json');
const moduleFile = read('src/inventory-bridge/retryResultAcknowledgement/index.js');

assert(componentFile.includes('buildScanOpsRetryResultAcknowledgementBoundary'), 'Manual retry UI must build the Phase 16 retry result acknowledgement boundary');
assert(componentFile.includes('selectedRetryResultAcknowledgementsById'), 'Manual retry UI must keep Phase 16 acknowledgements local to component state');
assert(componentFile.includes('Retry Result Acknowledgement Boundary'), 'Manual retry UI must expose Phase 16 acknowledgement copy');
assert(componentFile.includes('Acknowledge retry result'), 'Manual retry UI must expose the acknowledgement descriptor');
assert(componentFile.includes('Keep visible'), 'Manual retry UI must expose the keep-visible descriptor');
assert(componentFile.includes('Review later'), 'Manual retry UI must expose the review-later descriptor');
assert(componentFile.includes('Local acknowledgement intent only'), 'Manual retry UI must state acknowledgement is local intent only');
assert(componentFile.includes('No queue write, persistence, second retry, or Inventory mutation is allowed.'), 'Manual retry UI must state Phase 16 guardrails');
assert(packageFile.includes('validate:scanops-bridge-retry-result-acknowledgement-boundary'), 'package scripts must register Phase 16 validation');

const forbiddenModulePatterns = [
  { pattern: /setInterval\s*\(/, label: 'background interval' },
  { pattern: /setTimeout\s*\(/, label: 'background timer' },
  { pattern: /retryAll/i, label: 'retry-all behavior' },
  { pattern: /localStorage\./, label: 'localStorage persistence' },
  { pattern: /sessionStorage\./, label: 'sessionStorage persistence' },
  { pattern: /indexedDB/i, label: 'indexedDB persistence' },
  { pattern: /saveSyncQueue\s*\(/, label: 'queue persistence helper' },
  { pattern: /markSyncSucceeded\s*\(/, label: 'direct queue success mutation' },
  { pattern: /markSyncFailed\s*\(/, label: 'direct queue failure mutation' },
  { pattern: /postInventoryMovement/i, label: 'Inventory movement posting' },
  { pattern: /StockMovement/i, label: 'StockMovement write path' },
  { pattern: /createPurchaseOrder/i, label: 'purchase order creation' },
  { pattern: /approve.*markdown/i, label: 'markdown approval mutation' },
  { pattern: /approve.*waste/i, label: 'waste approval mutation' },
];

for (const forbidden of forbiddenModulePatterns) {
  assert(!forbidden.pattern.test(moduleFile), `Phase 16 acknowledgement boundary must not contain ${forbidden.label}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 16 retry result acknowledgement boundary validates local operator acknowledgement intent, display-only descriptors, no persistence, no queue writes, no second retry/background replay, and no Inventory/stock/price/ledger/approval mutation.');
