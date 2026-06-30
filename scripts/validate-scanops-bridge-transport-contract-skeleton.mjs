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

const contractTypes = read('src/bridge/transport/bridgeTransportContractTypes.ts');
const contract = read('src/bridge/transport/bridgeTransportContract.ts');
const capabilityGuard = read('src/bridge/runtime/bridgeRuntimeCapabilityGuard.ts');
const safetyReport = read('src/bridge/runtime/bridgeRuntimeSafetyReport.ts');

assertIncludes(contractTypes, 'export type BridgeTransportContractPhase = "32.B4";', 'transport contract must identify Phase 32 B4');
assertIncludes(contractTypes, 'enabled: false;', 'transport contract must type enabled as false');
assertIncludes(contractTypes, 'executionAllowed: false;', 'transport contract must type executionAllowed as false');
assertIncludes(contractTypes, 'transportActive: false;', 'transport contract must type transportActive as false');
assertIncludes(contractTypes, 'endpointResolutionAllowed: false;', 'transport contract must block endpoint resolution');
assertIncludes(contractTypes, 'networkDispatchAllowed: false;', 'transport contract must block network dispatch');
assertIncludes(contractTypes, 'networkReceiveAllowed: false;', 'transport contract must block network receive');
assertIncludes(contractTypes, 'requestSendAllowed: false;', 'transport contract must block request send');
assertIncludes(contractTypes, 'responseReceiveAllowed: false;', 'transport contract must block response receive');
assertIncludes(contractTypes, 'retryAllowed: false;', 'transport contract must block retry');
assertIncludes(contractTypes, 'queueProcessingAllowed: false;', 'transport contract must block queue processing');
assertIncludes(contractTypes, 'inboxProcessingAllowed: false;', 'transport contract must block inbox processing');
assertIncludes(contractTypes, 'receiptProcessingAllowed: false;', 'transport contract must block receipt processing');
assertIncludes(contractTypes, 'acknowledgementProcessingAllowed: false;', 'transport contract must block acknowledgement processing');
assertIncludes(contractTypes, 'persistenceAllowed: false;', 'transport contract must block persistence');
assertIncludes(contractTypes, 'mutationAllowed: false;', 'transport contract must block mutation');
assertIncludes(contractTypes, 'inventoryMutationAllowed: false;', 'transport contract must block Inventory mutation');
assertIncludes(contractTypes, 'scanOpsMutationAllowed: false;', 'transport contract must block ScanOps mutation');

assertIncludes(contract, 'createDisabledBridgeTransportEndpointContract', 'disabled transport endpoint factory must exist');
assertIncludes(contract, 'createBridgeTransportContractSnapshot', 'transport contract snapshot factory must exist');
assertIncludes(contract, 'assertBridgeRuntimeCapabilityBlocked(', 'transport contract must use runtime capability guard');
assertIncludes(contract, 'createBridgeRuntimeSafetyReport()', 'transport contract must use runtime safety report');
assertIncludes(contract, '"transport"', 'transport contract must guard transport capability');
assertIncludes(contract, 'enabled: false,', 'transport snapshot must return enabled=false');
assertIncludes(contract, 'executionAllowed: false,', 'transport snapshot must return executionAllowed=false');
assertIncludes(contract, 'transportActive: false,', 'transport snapshot must return transportActive=false');
assertIncludes(contract, 'endpointResolutionAllowed: false,', 'transport snapshot must return endpointResolutionAllowed=false');
assertIncludes(contract, 'networkDispatchAllowed: false,', 'transport snapshot must return networkDispatchAllowed=false');
assertIncludes(contract, 'networkReceiveAllowed: false,', 'transport snapshot must return networkReceiveAllowed=false');
assertIncludes(contract, 'requestSendAllowed: false,', 'transport snapshot must return requestSendAllowed=false');
assertIncludes(contract, 'responseReceiveAllowed: false,', 'transport snapshot must return responseReceiveAllowed=false');
assertIncludes(contract, 'retryAllowed: false,', 'transport snapshot must return retryAllowed=false');
assertIncludes(contract, 'queueProcessingAllowed: false,', 'transport snapshot must return queueProcessingAllowed=false');
assertIncludes(contract, 'inboxProcessingAllowed: false,', 'transport snapshot must return inboxProcessingAllowed=false');
assertIncludes(contract, 'receiptProcessingAllowed: false,', 'transport snapshot must return receiptProcessingAllowed=false');
assertIncludes(contract, 'acknowledgementProcessingAllowed: false,', 'transport snapshot must return acknowledgementProcessingAllowed=false');
assertIncludes(contract, 'persistenceAllowed: false,', 'transport snapshot must return persistenceAllowed=false');
assertIncludes(contract, 'mutationAllowed: false,', 'transport snapshot must return mutationAllowed=false');
assertIncludes(contract, 'inventoryMutationAllowed: false,', 'transport snapshot must return inventoryMutationAllowed=false');
assertIncludes(contract, 'scanOpsMutationAllowed: false,', 'transport snapshot must return scanOpsMutationAllowed=false');
assertIncludes(contract, 'endpoints: [],', 'transport snapshot must not include active endpoints');
assertIncludes(contract, 'performs no transport execution', 'transport reason must state no execution');

assertIncludes(capabilityGuard, 'transport: "transport"', 'runtime capability guard must map transport to transport gate');
assertIncludes(safetyReport, 'safeToRunOperationalBridge: false;', 'runtime safety report must keep operational bridge unsafe');

for (const forbidden of [
  'fetch(',
  'XMLHttpRequest',
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
  'dispatch(',
  'send(',
  'receive(',
  'retry(',
  'connect(',
  'writeFile',
  'appendFile',
]) {
  assertNotIncludes(contract, forbidden, `transport contract must not contain ${forbidden}`);
}

for (const forbidden of [
  'enabled: true',
  'executionAllowed: true',
  'transportActive: true',
  'endpointResolutionAllowed: true',
  'networkDispatchAllowed: true',
  'networkReceiveAllowed: true',
  'requestSendAllowed: true',
  'responseReceiveAllowed: true',
  'retryAllowed: true',
  'queueProcessingAllowed: true',
  'inboxProcessingAllowed: true',
  'receiptProcessingAllowed: true',
  'acknowledgementProcessingAllowed: true',
  'persistenceAllowed: true',
  'mutationAllowed: true',
  'inventoryMutationAllowed: true',
  'scanOpsMutationAllowed: true',
  'resolved: true',
  'reachable: true',
  'authenticated: true',
  'dispatchReady: true',
  'receiveReady: true',
  'retryReady: true',
  'persistenceReady: true',
  'mutationReady: true',
  'operationalCapability: true',
]) {
  assertNotIncludes(contractTypes, forbidden, `transport contract types must not contain ${forbidden}`);
  assertNotIncludes(contract, forbidden, `transport contract implementation must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 32 B4 validates the transport contract skeleton remains disabled and non-executing.');
