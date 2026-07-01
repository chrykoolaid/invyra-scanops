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
const readinessReport = read('src/bridge/contracts/bridgeContractRegistryReadinessReport.ts');
const readinessTypes = read('src/bridge/contracts/bridgeContractRegistryReadinessReportTypes.ts');
const registry = read('src/bridge/contracts/bridgeContractRegistry.ts');
const accessors = read('src/bridge/contracts/bridgeContractRegistryAccessors.ts');

for (const expected of [
  'createBridgeContractRegistryReadinessReport',
  'BridgeContractRegistryReadinessReport',
  'BridgeContractRegistryReadinessReportPhase',
  'BridgeContractRegistryReadinessReportTotals',
]) {
  assertIncludes(indexFile, expected, `registry index must export ${expected}`);
}

assertIncludes(indexFile, 'from "./bridgeContractRegistryReadinessReport"', 'registry index must export readiness report factory from report module');
assertIncludes(indexFile, 'from "./bridgeContractRegistryReadinessReportTypes"', 'registry index must export readiness report types from types module');
assertIncludes(readinessReport, 'phase: "32.C4"', 'readiness report must remain Phase 32 C4');
assertIncludes(readinessReport, 'readyForActivation: false', 'readiness report must remain not ready for activation');
assertIncludes(readinessReport, 'safeToRunOperationalBridge: false', 'readiness report must remain unsafe to run operational bridge');
assertIncludes(readinessReport, 'activeContracts: 0', 'readiness report must keep activeContracts=0');
assertIncludes(readinessTypes, 'readonly readyForActivation: false;', 'readiness report type must keep readyForActivation=false');
assertIncludes(readinessTypes, 'readonly safeToRunOperationalBridge: false;', 'readiness report type must keep safeToRunOperationalBridge=false');
assertIncludes(registry, 'phase: "32.C1"', 'registry index must continue to expose C1 registry');
assertIncludes(accessors, 'return false;', 'registry index must continue to expose disabled accessors');

for (const forbidden of [
  'readyForActivation: true',
  'safeToRunOperationalBridge: true',
  'enabled: true',
  'executionAllowed: true',
  'registryActive: true',
  'operationalCapabilityActive: true',
  'fetch(',
  'WebSocket',
  'localStorage.',
  'sessionStorage.',
  'indexedDB',
]) {
  assertNotIncludes(indexFile, forbidden, `registry readiness index must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 32 C5 validates readiness report exports remain index-only and inactive.');
