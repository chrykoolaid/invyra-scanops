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

const report = read('src/bridge/runtime/bridgeRuntimeSafetyReport.ts');
const capabilityGuard = read('src/bridge/runtime/bridgeRuntimeCapabilityGuard.ts');
const runtime = read('src/bridge/runtime/bridgeRuntime.ts');
const runtimeReadiness = read('src/bridge/runtime/bridgeRuntimeReadiness.ts');
const gates = read('src/bridge/runtime/bridgeFeatureGates.ts');

assertIncludes(report, 'export interface BridgeRuntimeSafetyReport', 'runtime safety report contract must be exported');
assertIncludes(report, 'phase: "32.A8";', 'runtime safety report must identify Phase 32 A8');
assertIncludes(report, 'systemOfRecord: "Inventory Desktop";', 'runtime safety report must preserve Inventory Desktop system of record');
assertIncludes(report, 'operationalLayer: "ScanOps";', 'runtime safety report must preserve ScanOps operational layer');
assertIncludes(report, 'runtimeSnapshot: BridgeRuntimeSnapshot;', 'runtime safety report must include runtime snapshot');
assertIncludes(report, 'capabilityDecisions: readonly BridgeRuntimeCapabilityDecision[];', 'runtime safety report must include capability decisions');
assertIncludes(report, 'allowedCapabilities: 0;', 'runtime safety report totals must keep allowed capabilities at zero');
assertIncludes(report, 'activeCommunicationCapabilities: 0;', 'runtime safety report totals must keep active communication at zero');
assertIncludes(report, 'activePersistenceCapabilities: 0;', 'runtime safety report totals must keep active persistence at zero');
assertIncludes(report, 'activeMutationCapabilities: 0;', 'runtime safety report totals must keep active mutation at zero');
assertIncludes(report, 'activeOperationalCapabilities: 0;', 'runtime safety report totals must keep active operational capabilities at zero');
assertIncludes(report, 'communicationActive: false;', 'runtime safety report must type communication inactive');
assertIncludes(report, 'persistenceActive: false;', 'runtime safety report must type persistence inactive');
assertIncludes(report, 'mutationActive: false;', 'runtime safety report must type mutation inactive');
assertIncludes(report, 'operationalCapabilityActive: false;', 'runtime safety report must type operational capability inactive');
assertIncludes(report, 'safeToRunOperationalBridge: false;', 'runtime safety report must never mark operational bridge safe to run');
assertIncludes(report, 'createBridgeRuntime({ environment })', 'runtime safety report must create a runtime snapshot');
assertIncludes(report, 'evaluateAllBridgeRuntimeCapabilities(', 'runtime safety report must evaluate all blocked capabilities');
assertIncludes(report, 'unexpected operational capability', 'runtime safety report must reject operational drift');
assertIncludes(report, 'read-only', 'runtime safety report reason must identify read-only behavior');
assertIncludes(report, 'All capabilities remain blocked', 'runtime safety report reason must preserve blocked state');

assertIncludes(capabilityGuard, 'allowed: false;', 'capability decision must type allowed as false');
assertIncludes(capabilityGuard, 'blocked: true;', 'capability decision must type blocked as true');
assertIncludes(capabilityGuard, 'communicationActive: false;', 'capability decision must keep communication inactive');
assertIncludes(capabilityGuard, 'persistenceActive: false;', 'capability decision must keep persistence inactive');
assertIncludes(capabilityGuard, 'mutationActive: false;', 'capability decision must keep mutation inactive');
assertIncludes(capabilityGuard, 'operationalCapabilityActive: false;', 'capability decision must keep operational capability inactive');
assertIncludes(runtime, 'createBridgeFeatureGateRegistry()', 'runtime must still use disabled feature gate registry');
assertIncludes(runtimeReadiness, 'operationalCapabilityActive: false,', 'runtime readiness must keep operational capability inactive');

assertNotIncludes(report, 'safeToRunOperationalBridge: true', 'runtime safety report must not allow operational bridge');
assertNotIncludes(report, 'communicationActive: true', 'runtime safety report must not activate communication');
assertNotIncludes(report, 'persistenceActive: true', 'runtime safety report must not activate persistence');
assertNotIncludes(report, 'mutationActive: true', 'runtime safety report must not activate mutation');
assertNotIncludes(report, 'operationalCapabilityActive: true', 'runtime safety report must not activate operational capability');
assertNotIncludes(report, 'fetch(', 'runtime safety report must not perform transport calls');
assertNotIncludes(report, 'localStorage.', 'runtime safety report must not persist to localStorage');
assertNotIncludes(report, 'sessionStorage.', 'runtime safety report must not persist to sessionStorage');
assertNotIncludes(report, 'indexedDB', 'runtime safety report must not use indexedDB');
assertNotIncludes(report, 'writeFile', 'runtime safety report must not write files');
assertNotIncludes(report, 'appendFile', 'runtime safety report must not append files');

const enabledMatches = gates.match(/enabled:\s*true/g) ?? [];
const operationalMatches = gates.match(/operationalCapability:\s*true/g) ?? [];

if (enabledMatches.length > 0) {
  errors.push('default gates must not contain enabled: true');
}

if (operationalMatches.length > 0) {
  errors.push('default gates must not contain operationalCapability: true');
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 32 A8 validates the runtime safety report remains read-only, blocked, and non-operational.');
