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

const contractTypes = read('src/bridge/pairing/bridgeQrPairingContractTypes.ts');
const contract = read('src/bridge/pairing/bridgeQrPairingContract.ts');
const capabilityGuard = read('src/bridge/runtime/bridgeRuntimeCapabilityGuard.ts');
const safetyReport = read('src/bridge/runtime/bridgeRuntimeSafetyReport.ts');

assertIncludes(contractTypes, 'export type BridgeQrPairingContractPhase = "32.B2";', 'QR pairing contract must identify Phase 32 B2');
assertIncludes(contractTypes, 'enabled: false;', 'QR pairing contract must type enabled as false');
assertIncludes(contractTypes, 'executionAllowed: false;', 'QR pairing contract must type executionAllowed as false');
assertIncludes(contractTypes, 'qrPairingActive: false;', 'QR pairing contract must type qrPairingActive as false');
assertIncludes(contractTypes, 'qrParsingAllowed: false;', 'QR pairing contract must block QR parsing');
assertIncludes(contractTypes, 'qrCaptureAllowed: false;', 'QR pairing contract must block QR capture');
assertIncludes(contractTypes, 'pairingAcceptanceAllowed: false;', 'QR pairing contract must block pairing acceptance');
assertIncludes(contractTypes, 'trustedDevicePersistenceAllowed: false;', 'QR pairing contract must block trusted device persistence');
assertIncludes(contractTypes, 'endpointResolutionAllowed: false;', 'QR pairing contract must block endpoint resolution');
assertIncludes(contractTypes, 'transportAllowed: false;', 'QR pairing contract must block transport');
assertIncludes(contractTypes, 'queueProcessingAllowed: false;', 'QR pairing contract must block queue processing');
assertIncludes(contractTypes, 'inboxProcessingAllowed: false;', 'QR pairing contract must block inbox processing');
assertIncludes(contractTypes, 'persistenceAllowed: false;', 'QR pairing contract must block persistence');
assertIncludes(contractTypes, 'mutationAllowed: false;', 'QR pairing contract must block mutation');
assertIncludes(contractTypes, 'inventoryMutationAllowed: false;', 'QR pairing contract must block Inventory mutation');
assertIncludes(contractTypes, 'scanOpsMutationAllowed: false;', 'QR pairing contract must block ScanOps mutation');

assertIncludes(contract, 'createDisabledBridgeQrPairingOfferContract', 'disabled QR pairing offer factory must exist');
assertIncludes(contract, 'createBridgeQrPairingContractSnapshot', 'QR pairing contract snapshot factory must exist');
assertIncludes(contract, 'assertBridgeRuntimeCapabilityBlocked(', 'QR pairing contract must use runtime capability guard');
assertIncludes(contract, 'createBridgeRuntimeSafetyReport()', 'QR pairing contract must use runtime safety report');
assertIncludes(contract, '"qrPairing"', 'QR pairing contract must guard qrPairing capability');
assertIncludes(contract, 'enabled: false,', 'QR pairing snapshot must return enabled=false');
assertIncludes(contract, 'executionAllowed: false,', 'QR pairing snapshot must return executionAllowed=false');
assertIncludes(contract, 'qrPairingActive: false,', 'QR pairing snapshot must return qrPairingActive=false');
assertIncludes(contract, 'qrParsingAllowed: false,', 'QR pairing snapshot must return qrParsingAllowed=false');
assertIncludes(contract, 'qrCaptureAllowed: false,', 'QR pairing snapshot must return qrCaptureAllowed=false');
assertIncludes(contract, 'pairingAcceptanceAllowed: false,', 'QR pairing snapshot must return pairingAcceptanceAllowed=false');
assertIncludes(contract, 'trustedDevicePersistenceAllowed: false,', 'QR pairing snapshot must return trustedDevicePersistenceAllowed=false');
assertIncludes(contract, 'endpointResolutionAllowed: false,', 'QR pairing snapshot must return endpointResolutionAllowed=false');
assertIncludes(contract, 'transportAllowed: false,', 'QR pairing snapshot must return transportAllowed=false');
assertIncludes(contract, 'queueProcessingAllowed: false,', 'QR pairing snapshot must return queueProcessingAllowed=false');
assertIncludes(contract, 'inboxProcessingAllowed: false,', 'QR pairing snapshot must return inboxProcessingAllowed=false');
assertIncludes(contract, 'persistenceAllowed: false,', 'QR pairing snapshot must return persistenceAllowed=false');
assertIncludes(contract, 'mutationAllowed: false,', 'QR pairing snapshot must return mutationAllowed=false');
assertIncludes(contract, 'inventoryMutationAllowed: false,', 'QR pairing snapshot must return inventoryMutationAllowed=false');
assertIncludes(contract, 'scanOpsMutationAllowed: false,', 'QR pairing snapshot must return scanOpsMutationAllowed=false');
assertIncludes(contract, 'offers: [],', 'QR pairing snapshot must not include active offers');
assertIncludes(contract, 'performs no pairing execution', 'QR pairing reason must state no execution');

assertIncludes(capabilityGuard, 'qrPairing: "qrPairing"', 'runtime capability guard must map qrPairing to qrPairing gate');
assertIncludes(safetyReport, 'safeToRunOperationalBridge: false;', 'runtime safety report must keep operational bridge unsafe');

for (const forbidden of [
  'fetch(',
  'WebSocket',
  'RTCPeerConnection',
  'navigator.',
  'BarcodeDetector',
  'MediaStream',
  'getUserMedia',
  'BroadcastChannel',
  'localStorage.',
  'sessionStorage.',
  'indexedDB',
  'bonjour',
  'udp',
  'socket',
  'parseQr',
  'scanQr',
  'acceptPairing',
  'pairDevice',
  'connect(',
  'writeFile',
  'appendFile',
]) {
  assertNotIncludes(contract, forbidden, `QR pairing contract must not contain ${forbidden}`);
}

for (const forbidden of [
  'enabled: true',
  'executionAllowed: true',
  'qrPairingActive: true',
  'qrParsingAllowed: true',
  'qrCaptureAllowed: true',
  'pairingAcceptanceAllowed: true',
  'trustedDevicePersistenceAllowed: true',
  'endpointResolutionAllowed: true',
  'transportAllowed: true',
  'queueProcessingAllowed: true',
  'inboxProcessingAllowed: true',
  'persistenceAllowed: true',
  'mutationAllowed: true',
  'inventoryMutationAllowed: true',
  'scanOpsMutationAllowed: true',
  'parsed: true',
  'verified: true',
  'pairingAccepted: true',
  'deviceTrusted: true',
  'endpointResolved: true',
  'transportReady: true',
  'persistenceReady: true',
  'mutationReady: true',
  'operationalCapability: true',
]) {
  assertNotIncludes(contractTypes, forbidden, `QR pairing contract types must not contain ${forbidden}`);
  assertNotIncludes(contract, forbidden, `QR pairing contract implementation must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 32 B2 validates the QR pairing contract skeleton remains disabled and non-executing.');
