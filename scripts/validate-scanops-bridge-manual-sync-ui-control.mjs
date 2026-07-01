import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const errors = [];
const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function assertIncludes(content, expected, message) {
  assert(content.includes(expected), message);
}

function assertNotIncludes(content, forbidden, message) {
  assert(!content.includes(forbidden), message);
}

const page = read('src/pages/ManualSyncControl.jsx');
const app = read('src/App.jsx');
const more = read('src/pages/More.jsx');
const pkg = read('package.json');

assertIncludes(page, 'buildScanOpsManualSyncExecutionPlan(', 'manual sync UI must plan through the Phase 8 execution layer');
assertIncludes(page, 'runScanOpsManualSyncExecution(', 'manual sync UI must execute through the Phase 8 execution layer');
assertIncludes(page, 'createScanOpsBridgeHttpDispatchAdapter', 'manual sync UI must use the governed transport dispatch adapter');
assertIncludes(page, 'Sync Now', 'manual sync UI must expose a clear operator Sync Now action');
assertIncludes(page, 'onClick={handleSyncNow}', 'manual sync must only run from the explicit button handler');
assertIncludes(page, 'manualRequestFromSession', 'manual sync UI must build an explicit manual request context');
assertIncludes(page, 'userInitiated: true', 'manual sync request must be user initiated');
assertIncludes(page, 'queueWriteApplied: false', 'manual sync UI must not apply queue writes itself');
assertIncludes(page, 'Inventory Desktop validates receipts and remains the system of record', 'manual sync UI must show system-of-record guardrail copy');
assertIncludes(page, 'projectedQueuePatches', 'manual sync UI must display projected status only');

assertIncludes(app, "import ManualSyncControl from './pages/ManualSyncControl';", 'App must import the manual sync control page');
assertIncludes(app, '<Route path="/sync-control" element={<ManualSyncControl />} />', 'App must route the manual sync control page');
assertIncludes(more, 'to: "/sync-control"', 'Tools page must expose the manual sync control route');
assertIncludes(more, 'Manual handoff', 'Tools tile must describe manual handoff');
assertIncludes(pkg, 'validate:scanops-bridge-manual-sync-ui-control', 'package scripts must register Phase 9 validation');

const forbiddenContentPatterns = [
  { pattern: /autoSyncEnabled\s*:\s*true/i, label: 'automatic sync enablement' },
  { pattern: /backgroundReplayEnabled\s*:\s*true/i, label: 'background replay enablement' },
  { pattern: /setInterval\s*\(/, label: 'interval background execution' },
  { pattern: /setTimeout\s*\(/, label: 'timer background execution' },
  { pattern: /useEffect\s*\(/, label: 'effect-driven execution on page load' },
  { pattern: /postInventoryMovement/i, label: 'Inventory movement posting' },
  { pattern: /StockMovement/i, label: 'StockMovement write path' },
  { pattern: /createPurchaseOrder/i, label: 'purchase order creation' },
  { pattern: /markSyncSucceeded\s*\(/, label: 'direct sync success queue mutation' },
  { pattern: /saveSyncQueue\s*\(/, label: 'direct queue persistence mutation' },
  { pattern: /approve.*markdown/i, label: 'markdown approval mutation' },
  { pattern: /approve.*waste/i, label: 'waste approval mutation' },
  { pattern: /Phase 32/i, label: 'Phase 32 scaffold reference' },
];

for (const forbidden of forbiddenContentPatterns) {
  assert(!forbidden.pattern.test(page), `ManualSyncControl.jsx must not contain ${forbidden.label}`);
}

assertNotIncludes(page, 'retryAllSyncEvents', 'manual sync UI must not reuse retry-all legacy queue mutation');
assertNotIncludes(page, 'window.addEventListener', 'manual sync UI must not bind background/global execution listeners');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 9 manual sync UI control validates an explicit operator Sync Now surface, Phase 8 execution usage, route/tool exposure, no auto/background replay, no direct queue persistence, no Inventory/stock/price/approval mutation, and no Phase 32 scaffold expansion.');
