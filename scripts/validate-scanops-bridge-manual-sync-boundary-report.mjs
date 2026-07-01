import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const errors = [];
const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function assertIncludes(content, expected, message) {
  if (!content.includes(expected)) {
    errors.push(message);
  }
}

function assertNotIncludes(content, forbidden, message) {
  if (content.includes(forbidden)) {
    errors.push(message);
  }
}

const boundaryTypes = read('src/bridge/contracts/bridgeManualSyncBoundaryReportTypes.ts');
const boundaryReport = read('src/bridge/contracts/bridgeManualSyncBoundaryReport.ts');
const readinessReport = read('src/bridge/contracts/bridgeContractRegistryReadinessReport.ts');
const manualSyncIndex = read('src/inventory-bridge/manualSync/index.js');

assertIncludes(boundaryTypes, 'export type BridgeManualSyncBoundaryReportPhase = "32.C6";', 'boundary report must identify Phase 32 C6');
assertIncludes(boundaryTypes, 'readonly phase32Owned: false;', 'manual sync layer must be outside Phase 32 ownership');
assertIncludes(boundaryTypes, 'readonly manualOnly: true;', 'manual sync layer must be manual-only');
assertIncludes(boundaryTypes, 'readonly automaticSyncAllowed: false;', 'automatic sync must remain disallowed');
assertIncludes(boundaryTypes, 'readonly backgroundReplayAllowed: false;', 'background replay must remain disallowed');
assertIncludes(boundaryTypes, 'readonly directInventoryMutationAllowed: false;', 'Inventory mutation must remain disallowed');
assertIncludes(boundaryTypes, 'readonly directScanOpsMutationAllowed: false;', 'ScanOps mutation must remain disallowed');
assertIncludes(boundaryTypes, 'readonly phase32RuntimeActivationAllowed: false;', 'Phase 32 runtime activation must remain disallowed');
assertIncludes(boundaryTypes, 'readonly bridgeActivationAllowed: false;', 'bridge activation must remain disallowed');
assertIncludes(boundaryTypes, 'readonly safeToRunOperationalBridge: false;', 'operational bridge must remain unsafe to run');
assertIncludes(boundaryTypes, 'readonly externalManualSyncLayerPresent: true;', 'boundary report must acknowledge external manual sync layer');
assertIncludes(boundaryTypes, 'readonly phase32BoundaryAcknowledged: true;', 'boundary report must acknowledge Phase 32 boundary');

assertIncludes(boundaryReport, 'createBridgeManualSyncBoundaryReport', 'boundary report factory must exist');
assertIncludes(boundaryReport, 'createBridgeContractRegistryReadinessReport()', 'boundary report must use readiness report');
assertIncludes(boundaryReport, 'phase: "32.C6"', 'boundary report must return Phase 32 C6');
assertIncludes(boundaryReport, 'componentPath: "src/inventory-bridge/manualSync"', 'boundary report must name the manual sync component path');
assertIncludes(boundaryReport, 'phase32Owned: false', 'boundary report must keep manual sync outside Phase 32 ownership');
assertIncludes(boundaryReport, 'manualOnly: true', 'boundary report must acknowledge manual-only mode');
assertIncludes(boundaryReport, 'automaticSyncAllowed: false', 'boundary report must keep automatic sync disallowed');
assertIncludes(boundaryReport, 'backgroundReplayAllowed: false', 'boundary report must keep background replay disallowed');
assertIncludes(boundaryReport, 'directInventoryMutationAllowed: false', 'boundary report must keep Inventory mutation disallowed');
assertIncludes(boundaryReport, 'directScanOpsMutationAllowed: false', 'boundary report must keep ScanOps mutation disallowed');
assertIncludes(boundaryReport, 'phase32RuntimeActivationAllowed: false', 'boundary report must keep Phase 32 runtime activation disallowed');
assertIncludes(boundaryReport, 'bridgeActivationAllowed: false', 'boundary report must keep bridge activation disallowed');
assertIncludes(boundaryReport, 'safeToRunOperationalBridge: false', 'boundary report must keep operational bridge unsafe');
assertIncludes(boundaryReport, 'externalManualSyncLayerPresent: true', 'boundary report must acknowledge external manual sync presence');
assertIncludes(boundaryReport, 'phase32BoundaryAcknowledged: true', 'boundary report must acknowledge the Phase 32 boundary');
assertIncludes(readinessReport, 'phase: "32.C4"', 'boundary report must build on C4 readiness report');
assertIncludes(readinessReport, 'readyForActivation: false', 'C4 readiness report must remain not ready for activation');
assertIncludes(manualSyncIndex, 'SCANOPS_BRIDGE_MANUAL_SYNC_PHASE', 'manual sync layer must expose its phase marker');
assertIncludes(manualSyncIndex, 'validateScanOpsManualSyncRequest', 'manual sync layer must expose request validation');

for (const forbidden of [
  'automaticSyncAllowed: true',
  'backgroundReplayAllowed: true',
  'directInventoryMutationAllowed: true',
  'directScanOpsMutationAllowed: true',
  'phase32RuntimeActivationAllowed: true',
  'phase32ReadyForActivation: true',
  'bridgeActivationAllowed: true',
  'safeToRunOperationalBridge: true',
]) {
  assertNotIncludes(boundaryTypes, forbidden, `manual sync boundary types must not contain ${forbidden}`);
  assertNotIncludes(boundaryReport, forbidden, `manual sync boundary report must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 32 C6 validates the manual sync boundary report keeps Phase 32 inactive while acknowledging the external manual sync layer.');
