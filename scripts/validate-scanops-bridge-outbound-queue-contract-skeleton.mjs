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

const contractTypes = read('src/bridge/queue/bridgeOutboundQueueContractTypes.ts');
const contract = read('src/bridge/queue/bridgeOutboundQueueContract.ts');
const capabilityGuard = read('src/bridge/runtime/bridgeRuntimeCapabilityGuard.ts');
const safetyReport = read('src/bridge/runtime/bridgeRuntimeSafetyReport.ts');

assertIncludes(contractTypes, 'export type BridgeOutboundQueueContractPhase = "32.B5";', 'outbound queue contract must identify Phase 32 B5');
assertIncludes(contractTypes, 'enabled: false;', 'outbound queue contract must type enabled as false');
assertIncludes(contractTypes, 'executionAllowed: false;', 'outbound queue contract must type executionAllowed as false');
assertIncludes(contractTypes, 'outboundQueueActive: false;', 'outbound queue contract must type outboundQueueActive as false');
assertIncludes(contractTypes, 'enqueueAllowed: false;', 'outbound queue contract must block enqueue');
assertIncludes(contractTypes, 'validationAllowed: false;', 'outbound queue contract must block validation');
assertIncludes(contractTypes, 'persistenceAllowed: false;', 'outbound queue contract must block persistence');
assertIncludes(contractTypes, 'dequeueAllowed: false;', 'outbound queue contract must block dequeue');
assertIncludes(contractTypes, 'replayAllowed: false;', 'outbound queue contract must block replay');
assertIncludes(contractTypes, 'dispatchAllowed: false;', 'outbound queue contract must block dispatch');
assertIncludes(contractTypes, 'transportAllowed: false;', 'outbound queue contract must block transport');
assertIncludes(contractTypes, 'receiptProcessingAllowed: false;', 'outbound queue contract must block receipt processing');
assertIncludes(contractTypes, 'acknowledgementProcessingAllowed: false;', 'outbound queue contract must block acknowledgement processing');
assertIncludes(contractTypes, 'inboxProcessingAllowed: false;', 'outbound queue contract must block inbox processing');
assertIncludes(contractTypes, 'mutationAllowed: false;', 'outbound queue contract must block mutation');
assertIncludes(contractTypes, 'inventoryMutationAllowed: false;', 'outbound queue contract must block Inventory mutation');
assertIncludes(contractTypes, 'scanOpsMutationAllowed: false;', 'outbound queue contract must block ScanOps mutation');

assertIncludes(contract, 'createDisabledBridgeOutboundQueueEntryContract', 'disabled outbound queue entry factory must exist');
assertIncludes(contract, 'createBridgeOutboundQueueContractSnapshot', 'outbound queue contract snapshot factory must exist');
assertIncludes(contract, 'assertBridgeRuntimeCapabilityBlocked(', 'outbound queue contract must use runtime capability guard');
assertIncludes(contract, 'createBridgeRuntimeSafetyReport()', 'outbound queue contract must use runtime safety report');
assertIncludes(contract, '"outboundQueue"', 'outbound queue contract must guard outboundQueue capability');
assertIncludes(contract, 'enabled: false,', 'outbound queue snapshot must return enabled=false');
assertIncludes(contract, 'executionAllowed: false,', 'outbound queue snapshot must return executionAllowed=false');
assertIncludes(contract, 'outboundQueueActive: false,', 'outbound queue snapshot must return outboundQueueActive=false');
assertIncludes(contract, 'enqueueAllowed: false,', 'outbound queue snapshot must return enqueueAllowed=false');
assertIncludes(contract, 'validationAllowed: false,', 'outbound queue snapshot must return validationAllowed=false');
assertIncludes(contract, 'persistenceAllowed: false,', 'outbound queue snapshot must return persistenceAllowed=false');
assertIncludes(contract, 'dequeueAllowed: false,', 'outbound queue snapshot must return dequeueAllowed=false');
assertIncludes(contract, 'replayAllowed: false,', 'outbound queue snapshot must return replayAllowed=false');
assertIncludes(contract, 'dispatchAllowed: false,', 'outbound queue snapshot must return dispatchAllowed=false');
assertIncludes(contract, 'transportAllowed: false,', 'outbound queue snapshot must return transportAllowed=false');
assertIncludes(contract, 'receiptProcessingAllowed: false,', 'outbound queue snapshot must return receiptProcessingAllowed=false');
assertIncludes(contract, 'acknowledgementProcessingAllowed: false,', 'outbound queue snapshot must return acknowledgementProcessingAllowed=false');
assertIncludes(contract, 'inboxProcessingAllowed: false,', 'outbound queue snapshot must return inboxProcessingAllowed=false');
assertIncludes(contract, 'mutationAllowed: false,', 'outbound queue snapshot must return mutationAllowed=false');
assertIncludes(contract, 'inventoryMutationAllowed: false,', 'outbound queue snapshot must return inventoryMutationAllowed=false');
assertIncludes(contract, 'scanOpsMutationAllowed: false,', 'outbound queue snapshot must return scanOpsMutationAllowed=false');
assertIncludes(contract, 'entries: [],', 'outbound queue snapshot must not include active entries');
assertIncludes(contract, 'performs no outbound queue execution', 'outbound queue reason must state no execution');

assertIncludes(capabilityGuard, 'outboundQueue: "outboundQueue"', 'runtime capability guard must map outboundQueue to outboundQueue gate');
assertIncludes(safetyReport, 'safeToRunOperationalBridge: false;', 'runtime safety report must keep operational bridge unsafe');

for (const forbidden of [
  'enabled: true',
  'executionAllowed: true',
  'outboundQueueActive: true',
  'enqueueAllowed: true',
  'validationAllowed: true',
  'persistenceAllowed: true',
  'dequeueAllowed: true',
  'replayAllowed: true',
  'dispatchAllowed: true',
  'transportAllowed: true',
  'receiptProcessingAllowed: true',
  'acknowledgementProcessingAllowed: true',
  'inboxProcessingAllowed: true',
  'mutationAllowed: true',
  'inventoryMutationAllowed: true',
  'scanOpsMutationAllowed: true',
  'queued: true',
  'validated: true',
  'persisted: true',
  'dispatchReady: true',
  'replayReady: true',
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
  assertNotIncludes(contractTypes, forbidden, `outbound queue contract types must not contain ${forbidden}`);
  assertNotIncludes(contract, forbidden, `outbound queue contract implementation must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 32 B5 validates the outbound queue contract skeleton remains disabled and non-executing.');
