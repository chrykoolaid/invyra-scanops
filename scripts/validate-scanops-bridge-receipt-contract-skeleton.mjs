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

const contractTypes = read('src/bridge/receipts/bridgeReceiptContractTypes.ts');
const contract = read('src/bridge/receipts/bridgeReceiptContract.ts');
const capabilityGuard = read('src/bridge/runtime/bridgeRuntimeCapabilityGuard.ts');
const safetyReport = read('src/bridge/runtime/bridgeRuntimeSafetyReport.ts');

assertIncludes(contractTypes, 'export type BridgeReceiptContractPhase = "32.B7";', 'receipt contract must identify Phase 32 B7');
assertIncludes(contractTypes, 'enabled: false;', 'receipt contract must type enabled as false');
assertIncludes(contractTypes, 'executionAllowed: false;', 'receipt contract must type executionAllowed as false');
assertIncludes(contractTypes, 'receiptsActive: false;', 'receipt contract must type receiptsActive as false');
assertIncludes(contractTypes, 'acceptanceAllowed: false;', 'receipt contract must block acceptance');
assertIncludes(contractTypes, 'correlationAllowed: false;', 'receipt contract must block correlation');
assertIncludes(contractTypes, 'persistenceAllowed: false;', 'receipt contract must block persistence');
assertIncludes(contractTypes, 'applyAllowed: false;', 'receipt contract must block apply');
assertIncludes(contractTypes, 'outboundQueueUpdateAllowed: false;', 'receipt contract must block outbound queue update');
assertIncludes(contractTypes, 'acknowledgementAllowed: false;', 'receipt contract must block acknowledgement');
assertIncludes(contractTypes, 'acknowledgementProcessingAllowed: false;', 'receipt contract must block acknowledgement processing');
assertIncludes(contractTypes, 'queueProcessingAllowed: false;', 'receipt contract must block queue processing');
assertIncludes(contractTypes, 'inboxProcessingAllowed: false;', 'receipt contract must block inbox processing');
assertIncludes(contractTypes, 'transportAllowed: false;', 'receipt contract must block transport');
assertIncludes(contractTypes, 'mutationAllowed: false;', 'receipt contract must block mutation');
assertIncludes(contractTypes, 'inventoryMutationAllowed: false;', 'receipt contract must block Inventory mutation');
assertIncludes(contractTypes, 'scanOpsMutationAllowed: false;', 'receipt contract must block ScanOps mutation');

assertIncludes(contract, 'createDisabledBridgeReceiptRecordContract', 'disabled receipt record factory must exist');
assertIncludes(contract, 'createBridgeReceiptContractSnapshot', 'receipt contract snapshot factory must exist');
assertIncludes(contract, 'assertBridgeRuntimeCapabilityBlocked(', 'receipt contract must use runtime capability guard');
assertIncludes(contract, 'createBridgeRuntimeSafetyReport()', 'receipt contract must use runtime safety report');
assertIncludes(contract, '"receipts"', 'receipt contract must guard receipts capability');
assertIncludes(contract, 'enabled: false,', 'receipt snapshot must return enabled=false');
assertIncludes(contract, 'executionAllowed: false,', 'receipt snapshot must return executionAllowed=false');
assertIncludes(contract, 'receiptsActive: false,', 'receipt snapshot must return receiptsActive=false');
assertIncludes(contract, 'acceptanceAllowed: false,', 'receipt snapshot must return acceptanceAllowed=false');
assertIncludes(contract, 'correlationAllowed: false,', 'receipt snapshot must return correlationAllowed=false');
assertIncludes(contract, 'persistenceAllowed: false,', 'receipt snapshot must return persistenceAllowed=false');
assertIncludes(contract, 'applyAllowed: false,', 'receipt snapshot must return applyAllowed=false');
assertIncludes(contract, 'outboundQueueUpdateAllowed: false,', 'receipt snapshot must return outboundQueueUpdateAllowed=false');
assertIncludes(contract, 'acknowledgementAllowed: false,', 'receipt snapshot must return acknowledgementAllowed=false');
assertIncludes(contract, 'acknowledgementProcessingAllowed: false,', 'receipt snapshot must return acknowledgementProcessingAllowed=false');
assertIncludes(contract, 'queueProcessingAllowed: false,', 'receipt snapshot must return queueProcessingAllowed=false');
assertIncludes(contract, 'inboxProcessingAllowed: false,', 'receipt snapshot must return inboxProcessingAllowed=false');
assertIncludes(contract, 'transportAllowed: false,', 'receipt snapshot must return transportAllowed=false');
assertIncludes(contract, 'mutationAllowed: false,', 'receipt snapshot must return mutationAllowed=false');
assertIncludes(contract, 'inventoryMutationAllowed: false,', 'receipt snapshot must return inventoryMutationAllowed=false');
assertIncludes(contract, 'scanOpsMutationAllowed: false,', 'receipt snapshot must return scanOpsMutationAllowed=false');
assertIncludes(contract, 'records: [],', 'receipt snapshot must not include active records');
assertIncludes(contract, 'performs no receipt execution', 'receipt reason must state no execution');

assertIncludes(capabilityGuard, 'receipts: "receipts"', 'runtime capability guard must map receipts to receipts gate');
assertIncludes(safetyReport, 'safeToRunOperationalBridge: false;', 'runtime safety report must keep operational bridge unsafe');

for (const forbidden of [
  'enabled: true',
  'executionAllowed: true',
  'receiptsActive: true',
  'acceptanceAllowed: true',
  'correlationAllowed: true',
  'persistenceAllowed: true',
  'applyAllowed: true',
  'outboundQueueUpdateAllowed: true',
  'acknowledgementAllowed: true',
  'acknowledgementProcessingAllowed: true',
  'queueProcessingAllowed: true',
  'inboxProcessingAllowed: true',
  'transportAllowed: true',
  'mutationAllowed: true',
  'inventoryMutationAllowed: true',
  'scanOpsMutationAllowed: true',
  'accepted: true',
  'correlated: true',
  'persisted: true',
  'applied: true',
  'outboundQueueReady: true',
  'acknowledgementReady: true',
  'mutationReady: true',
  'operationalCapability: true',
  'fetch(',
  'WebSocket',
  'localStorage.',
  'sessionStorage.',
  'indexedDB',
]) {
  assertNotIncludes(contractTypes, forbidden, `receipt contract types must not contain ${forbidden}`);
  assertNotIncludes(contract, forbidden, `receipt contract implementation must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 32 B7 validates the receipt contract skeleton remains disabled and non-executing.');
