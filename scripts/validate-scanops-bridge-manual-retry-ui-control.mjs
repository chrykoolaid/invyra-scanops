import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const errors = [];
const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), '..');

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

const manualSyncPage = read('src/pages/ManualSyncControl.jsx');
const retryControl = read('src/components/scanner/ReceiptDecisionIntentSurface.jsx');
const packageFile = read('package.json');

assert(manualSyncPage.includes('ReceiptDecisionIntentSurface'), 'Manual Sync page must render the Phase 14 manual retry UI surface');
assert(manualSyncPage.includes('receiptReviewSurface={lastResult.receiptReviewSurface}'), 'Manual Sync page must pass Phase 11 receipt review surface into the retry UI');
assert(manualSyncPage.includes('queueItems={manualQueue}'), 'Manual Sync page must pass eligible manual queue items into retry UI');
assert(manualSyncPage.includes('endpoint={endpoint}'), 'Manual Sync page must pass Inventory Desktop endpoint into retry UI');
assert(manualSyncPage.includes('deviceIdentity={deviceIdentity}'), 'Manual Sync page must pass device identity into retry UI');
assert(manualSyncPage.includes('Manual retry requires selecting Retry manually and then tapping Run Manual Retry.'), 'Manual Sync guardrails must state the explicit two-step manual retry rule');

assert(retryControl.includes('Manual Retry Control Surface'), 'Phase 14 component must expose Manual Retry Control Surface copy');
assert(retryControl.includes('Run Manual Retry'), 'Phase 14 component must expose an explicit Run Manual Retry action');
assert(retryControl.includes('handleManualRetryExecution'), 'Phase 14 component must use an explicit manual retry execution handler');
assert(retryControl.includes('runScanOpsManualRetryExecutionBoundary'), 'Phase 14 component must execute through the Phase 13 manual retry boundary');
assert(retryControl.includes('buildScanOpsManualRetryExecutionBoundary'), 'Phase 14 component must show boundary readiness before retry execution');
assert(retryControl.includes('buildScanOpsReceiptDecisionIntentSurface'), 'Phase 14 component must derive Phase 12 local intent before retry execution');
assert(retryControl.includes('createScanOpsBridgeHttpDispatchAdapter'), 'Phase 14 component must use the existing governed dispatch adapter');
assert(retryControl.includes('executeRetry: true'), 'Phase 14 component must explicitly set executeRetry true only inside manual retry flow');
assert(retryControl.includes('trigger: "manual_retry"'), 'Phase 14 component must mark retry as an explicit manual_retry request');
assert(retryControl.includes('manualRetryResult.queueWriteApplied ? "Applied" : "Blocked"'), 'Phase 14 component must expose queue writes as blocked in the result view');
assert(retryControl.includes('Queue status remains projected only'), 'Phase 14 component must state queue status is projected only');
assert(packageFile.includes('validate:scanops-bridge-manual-retry-ui-control'), 'package scripts must register Phase 14 validation');

const forbiddenPatterns = [
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

for (const forbidden of forbiddenPatterns) {
  assert(!forbidden.pattern.test(retryControl), `Phase 14 retry control must not contain ${forbidden.label}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 14 manual retry UI control validates explicit two-step operator retry, Phase 12 intent usage, Phase 13 boundary execution, no retry-all/background replay, no persistence, no queue writes, and no Inventory/stock/price/approval mutation.');
