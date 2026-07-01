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

const contractTypes = read('src/bridge/inbox/bridgeInboundInboxContractTypes.ts');
const contract = read('src/bridge/inbox/bridgeInboundInboxContract.ts');
const capabilityGuard = read('src/bridge/runtime/bridgeRuntimeCapabilityGuard.ts');
const safetyReport = read('src/bridge/runtime/bridgeRuntimeSafetyReport.ts');

assertIncludes(contractTypes, 'export type BridgeInboundInboxContractPhase = "32.B6";', 'inbound inbox contract must identify Phase 32 B6');
assertIncludes(contractTypes, 'enabled: false;', 'inbound inbox contract must type enabled as false');
assertIncludes(contractTypes, 'executionAllowed: false;', 'inbound inbox contract must type executionAllowed as false');
assertIncludes(contractTypes, 'inboundInboxActive: false;', 'inbound inbox contract must type inboundInboxActive as false');
assertIncludes(contractTypes, 'receiveAllowed: false;', 'inbound inbox contract must block receive');
assertIncludes(contractTypes, 'validationAllowed: false;', 'inbound inbox contract must block validation');
assertIncludes(contractTypes, 'persistenceAllowed: false;', 'inbound inbox contract must block persistence');
assertIncludes(contractTypes, 'applyAllowed: false;', 'inbound inbox contract must block apply');
assertIncludes(contractTypes, 'receiptProcessingAllowed: false;', 'inbound inbox contract must block receipt processing');
assertIncludes(contractTypes, 'acknowledgementProcessingAllowed: false;', 'inbound inbox contract must block acknowledgement processing');
assertIncludes(contractTypes, 'queueProcessingAllowed: false;', 'inbound inbox contract must block queue processing');
assertIncludes(contractTypes, 'transportAllowed: false;', 'inbound inbox contract must block transport');
assertIncludes(contractTypes, 'mutationAllowed: false;', 'inbound inbox contract must block mutation');
assertIncludes(contractTypes, 'inventoryMutationAllowed: false;', 'inbound inbox contract must block Inventory mutation');
assertIncludes(contractTypes, 'scanOpsMutationAllowed: false;', 'inbound inbox contract must block ScanOps mutation');

assertIncludes(contract, 'createDisabledBridgeInboundInboxEntryContract', 'disabled inbound inbox entry factory must exist');
assertIncludes(contract, 'createBridgeInboundInboxContractSnapshot', 'inbound inbox contract snapshot factory must exist');
assertIncludes(contract, 'assertBridgeRuntimeCapabilityBlocked(', 'inbound inbox contract must use runtime capability guard');
assertIncludes(contract, 'createBridgeRuntimeSafetyReport()', 'inbound inbox contract must use runtime safety report');
assertIncludes(contract, '"inboundInbox"', 'inbound inbox contract must guard inboundInbox capability');
assertIncludes(contract, 'enabled: false,', 'inbound inbox snapshot must return enabled=false');
assertIncludes(contract, 'executionAllowed: false,', 'inbound inbox snapshot must return executionAllowed=false');
assertIncludes(contract, 'inboundInboxActive: false,', 'inbound inbox snapshot must return inboundInboxActive=false');
assertIncludes(contract, 'receiveAllowed: false,', 'inbound inbox snapshot must return receiveAllowed=false');
assertIncludes(contract, 'validationAllowed: false,', 'inbound inbox snapshot must return validationAllowed=false');
assertIncludes(contract, 'persistenceAllowed: false,', 'inbound inbox snapshot must return persistenceAllowed=false');
assertIncludes(contract, 'applyAllowed: false,', 'inbound inbox snapshot must return applyAllowed=false');
assertIncludes(contract, 'receiptProcessingAllowed: false,', 'inbound inbox snapshot must return receiptProcessingAllowed=false');
assertIncludes(contract, 'acknowledgementProcessingAllowed: false,', 'inbound inbox snapshot must return acknowledgementProcessingAllowed=false');
assertIncludes(contract, 'queueProcessingAllowed: false,', 'inbound inbox snapshot must return queueProcessingAllowed=false');
assertIncludes(contract, 'transportAllowed: false,', 'inbound inbox snapshot must return transportAllowed=false');
assertIncludes(contract, 'mutationAllowed: false,', 'inbound inbox snapshot must return mutationAllowed=false');
assertIncludes(contract, 'inventoryMutationAllowed: false,', 'inbound inbox snapshot must return inventoryMutationAllowed=false');
assertIncludes(contract, 'scanOpsMutationAllowed: false,', 'inbound inbox snapshot must return scanOpsMutationAllowed=false');
assertIncludes(contract, 'entries: [],', 'inbound inbox snapshot must not include active entries');
assertIncludes(contract, 'performs no inbound inbox execution', 'inbound inbox reason must state no execution');

assertIncludes(capabilityGuard, 'inboundInbox: "inboundInbox"', 'runtime capability guard must map inboundInbox to inboundInbox gate');
assertIncludes(safetyReport, 'safeToRunOperationalBridge: false;', 'runtime safety report must keep operational bridge unsafe');

for (const forbidden of [
  'enabled: true',
  'executionAllowed: true',
  'inboundInboxActive: true',
  'receiveAllowed: true',
  'validationAllowed: true',
  'persistenceAllowed: true',
  'applyAllowed: true',
  'receiptProcessingAllowed: true',
  'acknowledgementProcessingAllowed: true',
  'queueProcessingAllowed: true',
  'transportAllowed: true',
  'mutationAllowed: true',
  'inventoryMutationAllowed: true',
  'scanOpsMutationAllowed: true',
  'received: true',
  'validated: true',
  'persisted: true',
  'applied: true',
  'receiptReady: true',
  'acknowledgementReady: true',
  'mutationReady: true',
  'operationalCapability: true',
  'fetch(',
  'WebSocket',
  'localStorage.',
  'sessionStorage.',
  'indexedDB',
]) {
  assertNotIncludes(contractTypes, forbidden, `inbound inbox contract types must not contain ${forbidden}`);
  assertNotIncludes(contract, forbidden, `inbound inbox contract implementation must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 32 B6 validates the inbound inbox contract skeleton remains disabled and non-executing.');
