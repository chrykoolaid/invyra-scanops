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
const registry = read('src/bridge/contracts/bridgeContractRegistry.ts');
const accessors = read('src/bridge/contracts/bridgeContractRegistryAccessors.ts');
const registryTypes = read('src/bridge/contracts/bridgeContractRegistryTypes.ts');

for (const expected of [
  'createBridgeContractRegistrySnapshot',
  'getAllBridgeContractRegistryAccessResults',
  'getAllBridgeContractRegistryEntries',
  'getBridgeContractRegistryAccessResult',
  'getBridgeContractRegistryEntry',
  'getBridgeContractRegistrySnapshot',
  'isBridgeContractRegistryEntryEnabled',
  'BridgeContractRegistryEntry',
  'BridgeContractRegistryName',
  'BridgeContractRegistryPhase',
  'BridgeContractRegistrySnapshot',
  'BridgeContractRegistrySnapshotValue',
  'BridgeContractRegistryAccessResult',
]) {
  assertIncludes(indexFile, expected, `registry index must export ${expected}`);
}

assertIncludes(indexFile, 'from "./bridgeContractRegistry"', 'registry index must export registry snapshot factory from registry module');
assertIncludes(indexFile, 'from "./bridgeContractRegistryAccessors"', 'registry index must export accessors from accessor module');
assertIncludes(indexFile, 'from "./bridgeContractRegistryTypes"', 'registry index must export registry types from types module');
assertIncludes(registry, 'phase: "32.C1"', 'registry snapshot must remain Phase 32 C1');
assertIncludes(registry, 'enabled: false', 'registry snapshot must remain disabled');
assertIncludes(registry, 'executionAllowed: false', 'registry snapshot must remain non-executing');
assertIncludes(registry, 'activeContracts: 0', 'registry snapshot must keep activeContracts=0');
assertIncludes(registry, 'safeToRunOperationalBridge: false', 'registry snapshot must keep safeToRunOperationalBridge=false');
assertIncludes(accessors, 'return false;', 'registry accessors must keep enabled helper returning false');
assertIncludes(accessors, 'blocked: true', 'registry accessors must keep access results blocked');
assertIncludes(registryTypes, 'readonly enabled: false;', 'registry types must keep enabled typed false');
assertIncludes(registryTypes, 'readonly executionAllowed: false;', 'registry types must keep executionAllowed typed false');

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
  assertNotIncludes(indexFile, forbidden, `registry index must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 32 C3 validates the contract registry index remains export-only and disabled.');
