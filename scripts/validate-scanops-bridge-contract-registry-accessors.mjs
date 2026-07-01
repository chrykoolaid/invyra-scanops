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

const accessors = read('src/bridge/contracts/bridgeContractRegistryAccessors.ts');
const registry = read('src/bridge/contracts/bridgeContractRegistry.ts');
const registryTypes = read('src/bridge/contracts/bridgeContractRegistryTypes.ts');

assertIncludes(accessors, 'BridgeContractRegistryAccessResult', 'contract registry access result type must exist');
assertIncludes(accessors, 'createBridgeContractRegistrySnapshot()', 'accessors must use registry snapshot factory');
assertIncludes(accessors, 'assertRegistryRemainsDisabled', 'accessors must assert registry disabled state');
assertIncludes(accessors, 'assertEntryRemainsDisabled', 'accessors must assert entry disabled state');
assertIncludes(accessors, 'getBridgeContractRegistrySnapshot', 'registry snapshot accessor must exist');
assertIncludes(accessors, 'getAllBridgeContractRegistryEntries', 'all entries accessor must exist');
assertIncludes(accessors, 'getBridgeContractRegistryEntry', 'single entry accessor must exist');
assertIncludes(accessors, 'isBridgeContractRegistryEntryEnabled', 'enabled check accessor must exist');
assertIncludes(accessors, 'getBridgeContractRegistryAccessResult', 'single access result helper must exist');
assertIncludes(accessors, 'getAllBridgeContractRegistryAccessResults', 'all access results helper must exist');
assertIncludes(accessors, 'readonly enabled: false;', 'access result must type enabled as false');
assertIncludes(accessors, 'readonly executionAllowed: false;', 'access result must type executionAllowed as false');
assertIncludes(accessors, 'readonly operationalCapabilityActive: false;', 'access result must type operationalCapabilityActive as false');
assertIncludes(accessors, 'readonly blocked: true;', 'access result must type blocked as true');
assertIncludes(accessors, 'return false;', 'enabled accessor must always return false');
assertIncludes(accessors, 'registry.enabled !== false', 'accessors must reject registry enabled drift');
assertIncludes(accessors, 'registry.executionAllowed !== false', 'accessors must reject registry execution drift');
assertIncludes(accessors, 'registry.registryActive !== false', 'accessors must reject active registry drift');
assertIncludes(accessors, 'registry.activeContracts !== 0', 'accessors must reject active contract count drift');
assertIncludes(accessors, 'registry.safeToRunOperationalBridge !== false', 'accessors must reject safe-to-run drift');
assertIncludes(accessors, 'entry.enabled !== false', 'accessors must reject enabled entry drift');
assertIncludes(accessors, 'entry.executionAllowed !== false', 'accessors must reject executable entry drift');
assertIncludes(accessors, 'entry.operationalCapabilityActive !== false', 'accessors must reject operational entry drift');
assertIncludes(accessors, 'entry.snapshot.enabled !== false', 'accessors must reject snapshot enabled drift');
assertIncludes(accessors, 'entry.snapshot.executionAllowed !== false', 'accessors must reject snapshot execution drift');
assertIncludes(accessors, 'blocked: true', 'access result must return blocked=true');
assertIncludes(accessors, 'disabled and blocked in Phase 32 C2', 'access result reason must identify Phase 32 C2');

assertIncludes(registry, 'phase: "32.C1"', 'C2 must build on C1 registry snapshot');
assertIncludes(registry, 'activeContracts: 0', 'C1 registry must keep activeContracts=0');
assertIncludes(registry, 'safeToRunOperationalBridge: false', 'C1 registry must keep safeToRunOperationalBridge=false');
assertIncludes(registryTypes, 'export type BridgeContractRegistryPhase = "32.C1";', 'registry type must remain Phase 32 C1');

for (const forbidden of [
  'enabled: true',
  'executionAllowed: true',
  'registryActive: true',
  'operationalCapabilityActive: true',
  'safeToRunOperationalBridge: true',
  'blocked: false',
  'fetch(',
  'WebSocket',
  'localStorage.',
  'sessionStorage.',
  'indexedDB',
]) {
  assertNotIncludes(accessors, forbidden, `contract registry accessors must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 32 C2 validates contract registry accessors remain read-only and blocked.');
