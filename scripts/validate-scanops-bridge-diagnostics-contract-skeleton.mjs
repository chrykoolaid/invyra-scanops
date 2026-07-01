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

const contractTypes = read('src/bridge/diagnostics/bridgeDiagnosticsContractTypes.ts');
const contract = read('src/bridge/diagnostics/bridgeDiagnosticsContract.ts');
const capabilityGuard = read('src/bridge/runtime/bridgeRuntimeCapabilityGuard.ts');
const safetyReport = read('src/bridge/runtime/bridgeRuntimeSafetyReport.ts');
const acknowledgementContract = read('src/bridge/acknowledgements/bridgeAcknowledgementContract.ts');
const receiptContract = read('src/bridge/receipts/bridgeReceiptContract.ts');

assertIncludes(contractTypes, 'export type BridgeDiagnosticsContractPhase = "32.B9";', 'diagnostics contract must identify Phase 32 B9');
assertIncludes(contractTypes, 'enabled: false;', 'diagnostics contract must type enabled as false');
assertIncludes(contractTypes, 'executionAllowed: false;', 'diagnostics contract must type executionAllowed as false');
assertIncludes(contractTypes, 'diagnosticsActive: false;', 'diagnostics contract must type diagnosticsActive as false');
assertIncludes(contractTypes, 'evaluationAllowed: false;', 'diagnostics contract must block evaluation');
assertIncludes(contractTypes, 'eventEmissionAllowed: false;', 'diagnostics contract must block event emission');
assertIncludes(contractTypes, 'persistenceAllowed: false;', 'diagnostics contract must block persistence');
assertIncludes(contractTypes, 'exportAllowed: false;', 'diagnostics contract must block export');
assertIncludes(contractTypes, 'transportAllowed: false;', 'diagnostics contract must block transport');
assertIncludes(contractTypes, 'recoveryTriggerAllowed: false;', 'diagnostics contract must block recovery trigger');
assertIncludes(contractTypes, 'queueProcessingAllowed: false;', 'diagnostics contract must block queue processing');
assertIncludes(contractTypes, 'inboxProcessingAllowed: false;', 'diagnostics contract must block inbox processing');
assertIncludes(contractTypes, 'receiptProcessingAllowed: false;', 'diagnostics contract must block receipt processing');
assertIncludes(contractTypes, 'acknowledgementProcessingAllowed: false;', 'diagnostics contract must block acknowledgement processing');
assertIncludes(contractTypes, 'mutationAllowed: false;', 'diagnostics contract must block mutation');
assertIncludes(contractTypes, 'inventoryMutationAllowed: false;', 'diagnostics contract must block Inventory mutation');
assertIncludes(contractTypes, 'scanOpsMutationAllowed: false;', 'diagnostics contract must block ScanOps mutation');

assertIncludes(contract, 'createDisabledBridgeDiagnosticsCheckContract', 'disabled diagnostics check factory must exist');
assertIncludes(contract, 'createBridgeDiagnosticsContractSnapshot', 'diagnostics contract snapshot factory must exist');
assertIncludes(contract, 'assertBridgeRuntimeCapabilityBlocked(', 'diagnostics contract must use runtime capability guard');
assertIncludes(contract, 'createBridgeRuntimeSafetyReport()', 'diagnostics contract must use runtime safety report');
assertIncludes(contract, '"diagnostics"', 'diagnostics contract must guard diagnostics capability');
assertIncludes(contract, 'enabled: false,', 'diagnostics snapshot must return enabled=false');
assertIncludes(contract, 'executionAllowed: false,', 'diagnostics snapshot must return executionAllowed=false');
assertIncludes(contract, 'diagnosticsActive: false,', 'diagnostics snapshot must return diagnosticsActive=false');
assertIncludes(contract, 'evaluationAllowed: false,', 'diagnostics snapshot must return evaluationAllowed=false');
assertIncludes(contract, 'eventEmissionAllowed: false,', 'diagnostics snapshot must return eventEmissionAllowed=false');
assertIncludes(contract, 'persistenceAllowed: false,', 'diagnostics snapshot must return persistenceAllowed=false');
assertIncludes(contract, 'exportAllowed: false,', 'diagnostics snapshot must return exportAllowed=false');
assertIncludes(contract, 'transportAllowed: false,', 'diagnostics snapshot must return transportAllowed=false');
assertIncludes(contract, 'recoveryTriggerAllowed: false,', 'diagnostics snapshot must return recoveryTriggerAllowed=false');
assertIncludes(contract, 'queueProcessingAllowed: false,', 'diagnostics snapshot must return queueProcessingAllowed=false');
assertIncludes(contract, 'inboxProcessingAllowed: false,', 'diagnostics snapshot must return inboxProcessingAllowed=false');
assertIncludes(contract, 'receiptProcessingAllowed: false,', 'diagnostics snapshot must return receiptProcessingAllowed=false');
assertIncludes(contract, 'acknowledgementProcessingAllowed: false,', 'diagnostics snapshot must return acknowledgementProcessingAllowed=false');
assertIncludes(contract, 'mutationAllowed: false,', 'diagnostics snapshot must return mutationAllowed=false');
assertIncludes(contract, 'inventoryMutationAllowed: false,', 'diagnostics snapshot must return inventoryMutationAllowed=false');
assertIncludes(contract, 'scanOpsMutationAllowed: false,', 'diagnostics snapshot must return scanOpsMutationAllowed=false');
assertIncludes(contract, 'checks: [],', 'diagnostics snapshot must not include active checks');
assertIncludes(contract, 'performs no diagnostics execution', 'diagnostics reason must state no execution');

assertIncludes(capabilityGuard, 'diagnostics: "diagnostics"', 'runtime capability guard must map diagnostics to diagnostics gate');
assertIncludes(safetyReport, 'safeToRunOperationalBridge: false;', 'runtime safety report must keep operational bridge unsafe');
assertIncludes(acknowledgementContract, 'acknowledgementsActive: false,', 'acknowledgement contract must stay inactive');
assertIncludes(receiptContract, 'receiptsActive: false,', 'receipt contract must stay inactive');

for (const forbidden of [
  'enabled: true',
  'executionAllowed: true',
  'diagnosticsActive: true',
  'evaluationAllowed: true',
  'eventEmissionAllowed: true',
  'persistenceAllowed: true',
  'exportAllowed: true',
  'transportAllowed: true',
  'recoveryTriggerAllowed: true',
  'queueProcessingAllowed: true',
  'inboxProcessingAllowed: true',
  'receiptProcessingAllowed: true',
  'acknowledgementProcessingAllowed: true',
  'mutationAllowed: true',
  'inventoryMutationAllowed: true',
  'scanOpsMutationAllowed: true',
  'evaluated: true',
  'emitted: true',
  'persisted: true',
  'exported: true',
  'transportReady: true',
  'mutationReady: true',
  'operationalCapability: true',
  'fetch(',
  'WebSocket',
  'localStorage.',
  'sessionStorage.',
  'indexedDB',
]) {
  assertNotIncludes(contractTypes, forbidden, `diagnostics contract types must not contain ${forbidden}`);
  assertNotIncludes(contract, forbidden, `diagnostics contract implementation must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 32 B9 validates the diagnostics contract skeleton remains disabled and non-executing.');
