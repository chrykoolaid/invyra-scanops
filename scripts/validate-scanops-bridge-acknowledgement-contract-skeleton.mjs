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

const contractTypes = read('src/bridge/acknowledgements/bridgeAcknowledgementContractTypes.ts');
const contract = read('src/bridge/acknowledgements/bridgeAcknowledgementContract.ts');
const capabilityGuard = read('src/bridge/runtime/bridgeRuntimeCapabilityGuard.ts');
const safetyReport = read('src/bridge/runtime/bridgeRuntimeSafetyReport.ts');
const receiptContract = read('src/bridge/receipts/bridgeReceiptContract.ts');

assertIncludes(contractTypes, 'export type BridgeAcknowledgementContractPhase = "32.B8";', 'acknowledgement contract must identify Phase 32 B8');
assertIncludes(contractTypes, 'enabled: false;', 'acknowledgement contract must type enabled as false');
assertIncludes(contractTypes, 'executionAllowed: false;', 'acknowledgement contract must type executionAllowed as false');
assertIncludes(contractTypes, 'acknowledgementsActive: false;', 'acknowledgement contract must type acknowledgementsActive as false');
assertIncludes(contractTypes, 'preparationAllowed: false;', 'acknowledgement contract must block preparation');
assertIncludes(contractTypes, 'correlationAllowed: false;', 'acknowledgement contract must block correlation');
assertIncludes(contractTypes, 'sendAllowed: false;', 'acknowledgement contract must block sending');
assertIncludes(contractTypes, 'retryAllowed: false;', 'acknowledgement contract must block retry');
assertIncludes(contractTypes, 'persistenceAllowed: false;', 'acknowledgement contract must block persistence');
assertIncludes(contractTypes, 'receiptMutationAllowed: false;', 'acknowledgement contract must block receipt mutation');
assertIncludes(contractTypes, 'outboundQueueUpdateAllowed: false;', 'acknowledgement contract must block outbound queue update');
assertIncludes(contractTypes, 'inboxUpdateAllowed: false;', 'acknowledgement contract must block inbox update');
assertIncludes(contractTypes, 'transportAllowed: false;', 'acknowledgement contract must block transport');
assertIncludes(contractTypes, 'mutationAllowed: false;', 'acknowledgement contract must block mutation');
assertIncludes(contractTypes, 'inventoryMutationAllowed: false;', 'acknowledgement contract must block Inventory mutation');
assertIncludes(contractTypes, 'scanOpsMutationAllowed: false;', 'acknowledgement contract must block ScanOps mutation');

assertIncludes(contract, 'createDisabledBridgeAcknowledgementRecordContract', 'disabled acknowledgement record factory must exist');
assertIncludes(contract, 'createBridgeAcknowledgementContractSnapshot', 'acknowledgement contract snapshot factory must exist');
assertIncludes(contract, 'assertBridgeRuntimeCapabilityBlocked(', 'acknowledgement contract must use runtime capability guard');
assertIncludes(contract, 'createBridgeRuntimeSafetyReport()', 'acknowledgement contract must use runtime safety report');
assertIncludes(contract, '"acknowledgements"', 'acknowledgement contract must guard acknowledgements capability');
assertIncludes(contract, 'enabled: false,', 'acknowledgement snapshot must return enabled=false');
assertIncludes(contract, 'executionAllowed: false,', 'acknowledgement snapshot must return executionAllowed=false');
assertIncludes(contract, 'acknowledgementsActive: false,', 'acknowledgement snapshot must return acknowledgementsActive=false');
assertIncludes(contract, 'preparationAllowed: false,', 'acknowledgement snapshot must return preparationAllowed=false');
assertIncludes(contract, 'correlationAllowed: false,', 'acknowledgement snapshot must return correlationAllowed=false');
assertIncludes(contract, 'sendAllowed: false,', 'acknowledgement snapshot must return sendAllowed=false');
assertIncludes(contract, 'retryAllowed: false,', 'acknowledgement snapshot must return retryAllowed=false');
assertIncludes(contract, 'persistenceAllowed: false,', 'acknowledgement snapshot must return persistenceAllowed=false');
assertIncludes(contract, 'receiptMutationAllowed: false,', 'acknowledgement snapshot must return receiptMutationAllowed=false');
assertIncludes(contract, 'outboundQueueUpdateAllowed: false,', 'acknowledgement snapshot must return outboundQueueUpdateAllowed=false');
assertIncludes(contract, 'inboxUpdateAllowed: false,', 'acknowledgement snapshot must return inboxUpdateAllowed=false');
assertIncludes(contract, 'transportAllowed: false,', 'acknowledgement snapshot must return transportAllowed=false');
assertIncludes(contract, 'mutationAllowed: false,', 'acknowledgement snapshot must return mutationAllowed=false');
assertIncludes(contract, 'inventoryMutationAllowed: false,', 'acknowledgement snapshot must return inventoryMutationAllowed=false');
assertIncludes(contract, 'scanOpsMutationAllowed: false,', 'acknowledgement snapshot must return scanOpsMutationAllowed=false');
assertIncludes(contract, 'records: [],', 'acknowledgement snapshot must not include active records');
assertIncludes(contract, 'performs no acknowledgement handling', 'acknowledgement reason must state no handling');

assertIncludes(capabilityGuard, 'acknowledgements: "acknowledgements"', 'runtime capability guard must map acknowledgements to acknowledgements gate');
assertIncludes(safetyReport, 'safeToRunOperationalBridge: false;', 'runtime safety report must keep operational bridge unsafe');
assertIncludes(receiptContract, 'acknowledgementAllowed: false,', 'receipt contract must continue to block acknowledgement readiness');
assertIncludes(receiptContract, 'acknowledgementProcessingAllowed: false,', 'receipt contract must continue to block acknowledgement processing');

for (const forbidden of [
  'enabled: true',
  'executionAllowed: true',
  'acknowledgementsActive: true',
  'preparationAllowed: true',
  'correlationAllowed: true',
  'sendAllowed: true',
  'retryAllowed: true',
  'persistenceAllowed: true',
  'receiptMutationAllowed: true',
  'outboundQueueUpdateAllowed: true',
  'inboxUpdateAllowed: true',
  'transportAllowed: true',
  'mutationAllowed: true',
  'inventoryMutationAllowed: true',
  'scanOpsMutationAllowed: true',
  'prepared: true',
  'correlated: true',
  'sent: true',
  'persisted: true',
  'retried: true',
  'transportReady: true',
  'queueUpdateReady: true',
  'mutationReady: true',
  'operationalCapability: true',
  'fetch(',
  'WebSocket',
  'localStorage.',
  'sessionStorage.',
  'indexedDB',
]) {
  assertNotIncludes(contractTypes, forbidden, `acknowledgement contract types must not contain ${forbidden}`);
  assertNotIncludes(contract, forbidden, `acknowledgement contract implementation must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 32 B8 validates the acknowledgement contract skeleton remains disabled and non-executing.');
