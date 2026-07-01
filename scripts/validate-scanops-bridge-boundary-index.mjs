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

const indexFile = read('src/bridge/contracts/index.ts');
const boundaryReport = read('src/bridge/contracts/bridgeManualSyncBoundaryReport.ts');
const boundaryTypes = read('src/bridge/contracts/bridgeManualSyncBoundaryReportTypes.ts');
const readinessReport = read('src/bridge/contracts/bridgeContractRegistryReadinessReport.ts');

for (const expected of [
  'createBridgeManualSyncBoundaryReport',
  'BridgeManualSyncBoundaryLayer',
  'BridgeManualSyncBoundaryReport',
  'BridgeManualSyncBoundaryReportPhase',
]) {
  assertIncludes(indexFile, expected, `contracts index must export ${expected}`);
}

assertIncludes(indexFile, 'from "./bridgeManualSyncBoundaryReport"', 'contracts index must export boundary report factory from report module');
assertIncludes(indexFile, 'from "./bridgeManualSyncBoundaryReportTypes"', 'contracts index must export boundary report types from types module');
assertIncludes(boundaryReport, 'phase: "32.C6"', 'boundary report must remain Phase 32 C6');
assertIncludes(boundaryReport, 'phase32RuntimeStillInactive: true', 'boundary report must keep Phase 32 runtime inactive');
assertIncludes(boundaryReport, 'phase32ReadyForActivation: false', 'boundary report must keep Phase 32 not ready for activation');
assertIncludes(boundaryReport, 'bridgeActivationAllowed: false', 'boundary report must keep bridge activation disallowed');
assertIncludes(boundaryReport, 'safeToRunOperationalBridge: false', 'boundary report must keep operational bridge unsafe');
assertIncludes(boundaryTypes, 'readonly phase32BoundaryAcknowledged: true;', 'boundary types must keep Phase 32 boundary acknowledged');
assertIncludes(boundaryTypes, 'readonly externalManualSyncLayerPresent: true;', 'boundary types must keep external layer acknowledged');
assertIncludes(readinessReport, 'phase: "32.C4"', 'boundary index must continue to build on C4 readiness report');

for (const forbidden of [
  'phase32ReadyForActivation: true',
  'bridgeActivationAllowed: true',
  'safeToRunOperationalBridge: true',
  'automaticSyncAllowed: true',
  'backgroundReplayAllowed: true',
]) {
  assertNotIncludes(indexFile, forbidden, `contracts index must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 32 C7 validates boundary report exports remain index-only and inactive.');
