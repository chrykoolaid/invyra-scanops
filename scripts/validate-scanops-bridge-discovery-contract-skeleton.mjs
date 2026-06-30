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

const contractTypes = read('src/bridge/discovery/bridgeDiscoveryContractTypes.ts');
const contract = read('src/bridge/discovery/bridgeDiscoveryContract.ts');
const capabilityGuard = read('src/bridge/runtime/bridgeRuntimeCapabilityGuard.ts');
const safetyReport = read('src/bridge/runtime/bridgeRuntimeSafetyReport.ts');

assertIncludes(contractTypes, 'export type BridgeDiscoveryContractPhase = "32.B1";', 'discovery contract must identify Phase 32 B1');
assertIncludes(contractTypes, 'enabled: false;', 'discovery contract must type enabled as false');
assertIncludes(contractTypes, 'executionAllowed: false;', 'discovery contract must type executionAllowed as false');
assertIncludes(contractTypes, 'discoveryActive: false;', 'discovery contract must type discoveryActive as false');
assertIncludes(contractTypes, 'networkScanAllowed: false;', 'discovery contract must block network scanning');
assertIncludes(contractTypes, 'mdnsAllowed: false;', 'discovery contract must block mDNS');
assertIncludes(contractTypes, 'ipScanAllowed: false;', 'discovery contract must block IP scanning');
assertIncludes(contractTypes, 'qrPairingAllowed: false;', 'discovery contract must block QR pairing');
assertIncludes(contractTypes, 'manualConnectAllowed: false;', 'discovery contract must block manual connect');
assertIncludes(contractTypes, 'trustedDevicePersistenceAllowed: false;', 'discovery contract must block trusted device persistence');
assertIncludes(contractTypes, 'transportAllowed: false;', 'discovery contract must block transport');
assertIncludes(contractTypes, 'queueProcessingAllowed: false;', 'discovery contract must block queue processing');
assertIncludes(contractTypes, 'inboxProcessingAllowed: false;', 'discovery contract must block inbox processing');
assertIncludes(contractTypes, 'persistenceAllowed: false;', 'discovery contract must block persistence');
assertIncludes(contractTypes, 'mutationAllowed: false;', 'discovery contract must block mutation');
assertIncludes(contractTypes, 'inventoryMutationAllowed: false;', 'discovery contract must block Inventory mutation');
assertIncludes(contractTypes, 'scanOpsMutationAllowed: false;', 'discovery contract must block ScanOps mutation');

assertIncludes(contract, 'createDisabledBridgeDiscoveryCandidateContract', 'disabled candidate factory must exist');
assertIncludes(contract, 'createBridgeDiscoveryContractSnapshot', 'discovery contract snapshot factory must exist');
assertIncludes(contract, 'assertBridgeRuntimeCapabilityBlocked(', 'discovery contract must use runtime capability guard');
assertIncludes(contract, 'createBridgeRuntimeSafetyReport()', 'discovery contract must use runtime safety report');
assertIncludes(contract, 'enabled: false,', 'discovery snapshot must return enabled=false');
assertIncludes(contract, 'executionAllowed: false,', 'discovery snapshot must return executionAllowed=false');
assertIncludes(contract, 'discoveryActive: false,', 'discovery snapshot must return discoveryActive=false');
assertIncludes(contract, 'networkScanAllowed: false,', 'discovery snapshot must return networkScanAllowed=false');
assertIncludes(contract, 'mdnsAllowed: false,', 'discovery snapshot must return mdnsAllowed=false');
assertIncludes(contract, 'ipScanAllowed: false,', 'discovery snapshot must return ipScanAllowed=false');
assertIncludes(contract, 'qrPairingAllowed: false,', 'discovery snapshot must return qrPairingAllowed=false');
assertIncludes(contract, 'manualConnectAllowed: false,', 'discovery snapshot must return manualConnectAllowed=false');
assertIncludes(contract, 'trustedDevicePersistenceAllowed: false,', 'discovery snapshot must return trustedDevicePersistenceAllowed=false');
assertIncludes(contract, 'transportAllowed: false,', 'discovery snapshot must return transportAllowed=false');
assertIncludes(contract, 'queueProcessingAllowed: false,', 'discovery snapshot must return queueProcessingAllowed=false');
assertIncludes(contract, 'inboxProcessingAllowed: false,', 'discovery snapshot must return inboxProcessingAllowed=false');
assertIncludes(contract, 'persistenceAllowed: false,', 'discovery snapshot must return persistenceAllowed=false');
assertIncludes(contract, 'mutationAllowed: false,', 'discovery snapshot must return mutationAllowed=false');
assertIncludes(contract, 'inventoryMutationAllowed: false,', 'discovery snapshot must return inventoryMutationAllowed=false');
assertIncludes(contract, 'scanOpsMutationAllowed: false,', 'discovery snapshot must return scanOpsMutationAllowed=false');
assertIncludes(contract, 'candidates: [],', 'discovery snapshot must not include active candidates');
assertIncludes(contract, 'performs no discovery execution', 'discovery reason must state no execution');

assertIncludes(capabilityGuard, 'discovery: "discovery"', 'runtime capability guard must map discovery to discovery gate');
assertIncludes(safetyReport, 'safeToRunOperationalBridge: false;', 'runtime safety report must keep operational bridge unsafe');

for (const forbidden of [
  'fetch(',
  'WebSocket',
  'RTCPeerConnection',
  'navigator.',
  'NetworkInformation',
  'BroadcastChannel',
  'localStorage.',
  'sessionStorage.',
  'indexedDB',
  'bonjour',
  'udp',
  'socket',
  'scanNetwork',
  'discoverDevices',
  'pairDevice',
  'connect(',
  'writeFile',
  'appendFile',
]) {
  assertNotIncludes(contract, forbidden, `discovery contract must not contain ${forbidden}`);
}

for (const forbidden of [
  'enabled: true',
  'executionAllowed: true',
  'discoveryActive: true',
  'networkScanAllowed: true',
  'mdnsAllowed: true',
  'ipScanAllowed: true',
  'qrPairingAllowed: true',
  'manualConnectAllowed: true',
  'trustedDevicePersistenceAllowed: true',
  'transportAllowed: true',
  'queueProcessingAllowed: true',
  'inboxProcessingAllowed: true',
  'persistenceAllowed: true',
  'mutationAllowed: true',
  'inventoryMutationAllowed: true',
  'scanOpsMutationAllowed: true',
  'endpointResolved: true',
  'networkReachable: true',
  'paired: true',
  'trusted: true',
  'transportReady: true',
  'persistenceReady: true',
  'mutationReady: true',
  'operationalCapability: true',
]) {
  assertNotIncludes(contractTypes, forbidden, `discovery contract types must not contain ${forbidden}`);
  assertNotIncludes(contract, forbidden, `discovery contract implementation must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 32 B1 validates the discovery contract skeleton remains disabled and non-executing.');
