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

const contractTypes = read('src/bridge/devices/bridgeTrustedDeviceRegistryContractTypes.ts');
const contract = read('src/bridge/devices/bridgeTrustedDeviceRegistryContract.ts');
const capabilityGuard = read('src/bridge/runtime/bridgeRuntimeCapabilityGuard.ts');
const safetyReport = read('src/bridge/runtime/bridgeRuntimeSafetyReport.ts');

assertIncludes(contractTypes, 'export type BridgeTrustedDeviceRegistryContractPhase = "32.B3";', 'trusted device registry contract must identify Phase 32 B3');
assertIncludes(contractTypes, 'enabled: false;', 'trusted device registry contract must type enabled as false');
assertIncludes(contractTypes, 'executionAllowed: false;', 'trusted device registry contract must type executionAllowed as false');
assertIncludes(contractTypes, 'registryActive: false;', 'trusted device registry contract must type registryActive as false');
assertIncludes(contractTypes, 'deviceRegistrationAllowed: false;', 'trusted device registry contract must block device registration');
assertIncludes(contractTypes, 'trustEvaluationAllowed: false;', 'trusted device registry contract must block trust evaluation');
assertIncludes(contractTypes, 'deviceVerificationAllowed: false;', 'trusted device registry contract must block device verification');
assertIncludes(contractTypes, 'reconnectAllowed: false;', 'trusted device registry contract must block reconnect');
assertIncludes(contractTypes, 'endpointResolutionAllowed: false;', 'trusted device registry contract must block endpoint resolution');
assertIncludes(contractTypes, 'trustedDevicePersistenceAllowed: false;', 'trusted device registry contract must block trusted device persistence');
assertIncludes(contractTypes, 'transportAllowed: false;', 'trusted device registry contract must block transport');
assertIncludes(contractTypes, 'queueProcessingAllowed: false;', 'trusted device registry contract must block queue processing');
assertIncludes(contractTypes, 'inboxProcessingAllowed: false;', 'trusted device registry contract must block inbox processing');
assertIncludes(contractTypes, 'persistenceAllowed: false;', 'trusted device registry contract must block persistence');
assertIncludes(contractTypes, 'mutationAllowed: false;', 'trusted device registry contract must block mutation');
assertIncludes(contractTypes, 'inventoryMutationAllowed: false;', 'trusted device registry contract must block Inventory mutation');
assertIncludes(contractTypes, 'scanOpsMutationAllowed: false;', 'trusted device registry contract must block ScanOps mutation');

assertIncludes(contract, 'createDisabledBridgeTrustedDeviceRecordContract', 'disabled trusted device record factory must exist');
assertIncludes(contract, 'createBridgeTrustedDeviceRegistryContractSnapshot', 'trusted device registry contract snapshot factory must exist');
assertIncludes(contract, 'assertBridgeRuntimeCapabilityBlocked(', 'trusted device registry contract must use runtime capability guard');
assertIncludes(contract, 'createBridgeRuntimeSafetyReport()', 'trusted device registry contract must use runtime safety report');
assertIncludes(contract, '"trustedDeviceRegistry"', 'trusted device registry contract must guard trustedDeviceRegistry capability');
assertIncludes(contract, 'enabled: false,', 'trusted device registry snapshot must return enabled=false');
assertIncludes(contract, 'executionAllowed: false,', 'trusted device registry snapshot must return executionAllowed=false');
assertIncludes(contract, 'registryActive: false,', 'trusted device registry snapshot must return registryActive=false');
assertIncludes(contract, 'deviceRegistrationAllowed: false,', 'trusted device registry snapshot must return deviceRegistrationAllowed=false');
assertIncludes(contract, 'trustEvaluationAllowed: false,', 'trusted device registry snapshot must return trustEvaluationAllowed=false');
assertIncludes(contract, 'deviceVerificationAllowed: false,', 'trusted device registry snapshot must return deviceVerificationAllowed=false');
assertIncludes(contract, 'reconnectAllowed: false,', 'trusted device registry snapshot must return reconnectAllowed=false');
assertIncludes(contract, 'endpointResolutionAllowed: false,', 'trusted device registry snapshot must return endpointResolutionAllowed=false');
assertIncludes(contract, 'trustedDevicePersistenceAllowed: false,', 'trusted device registry snapshot must return trustedDevicePersistenceAllowed=false');
assertIncludes(contract, 'transportAllowed: false,', 'trusted device registry snapshot must return transportAllowed=false');
assertIncludes(contract, 'queueProcessingAllowed: false,', 'trusted device registry snapshot must return queueProcessingAllowed=false');
assertIncludes(contract, 'inboxProcessingAllowed: false,', 'trusted device registry snapshot must return inboxProcessingAllowed=false');
assertIncludes(contract, 'persistenceAllowed: false,', 'trusted device registry snapshot must return persistenceAllowed=false');
assertIncludes(contract, 'mutationAllowed: false,', 'trusted device registry snapshot must return mutationAllowed=false');
assertIncludes(contract, 'inventoryMutationAllowed: false,', 'trusted device registry snapshot must return inventoryMutationAllowed=false');
assertIncludes(contract, 'scanOpsMutationAllowed: false,', 'trusted device registry snapshot must return scanOpsMutationAllowed=false');
assertIncludes(contract, 'records: [],', 'trusted device registry snapshot must not include active records');
assertIncludes(contract, 'performs no registry execution', 'trusted device registry reason must state no execution');

assertIncludes(capabilityGuard, 'trustedDeviceRegistry: "trustedDeviceRegistry"', 'runtime capability guard must map trustedDeviceRegistry to trustedDeviceRegistry gate');
assertIncludes(safetyReport, 'safeToRunOperationalBridge: false;', 'runtime safety report must keep operational bridge unsafe');

for (const forbidden of [
  'fetch(',
  'WebSocket',
  'RTCPeerConnection',
  'navigator.',
  'BroadcastChannel',
  'localStorage.',
  'sessionStorage.',
  'indexedDB',
  'bonjour',
  'udp',
  'socket',
  'registerDevice',
  'trustDevice',
  'verifyDevice',
  'saveDevice',
  'persistDevice',
  'reconnectDevice',
  'connect(',
  'writeFile',
  'appendFile',
]) {
  assertNotIncludes(contract, forbidden, `trusted device registry contract must not contain ${forbidden}`);
}

for (const forbidden of [
  'enabled: true',
  'executionAllowed: true',
  'registryActive: true',
  'deviceRegistrationAllowed: true',
  'trustEvaluationAllowed: true',
  'deviceVerificationAllowed: true',
  'reconnectAllowed: true',
  'endpointResolutionAllowed: true',
  'trustedDevicePersistenceAllowed: true',
  'transportAllowed: true',
  'queueProcessingAllowed: true',
  'inboxProcessingAllowed: true',
  'persistenceAllowed: true',
  'mutationAllowed: true',
  'inventoryMutationAllowed: true',
  'scanOpsMutationAllowed: true',
  'registered: true',
  'trusted: true',
  'verified: true',
  'endpointResolved: true',
  'transportReady: true',
  'persistenceReady: true',
  'mutationReady: true',
  'operationalCapability: true',
]) {
  assertNotIncludes(contractTypes, forbidden, `trusted device registry contract types must not contain ${forbidden}`);
  assertNotIncludes(contract, forbidden, `trusted device registry contract implementation must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 32 B3 validates the trusted device registry contract skeleton remains disabled and non-executing.');
