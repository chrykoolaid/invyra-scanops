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

const contractTypes = read('src/bridge/recovery/bridgeRecoveryContractTypes.ts');
const contract = read('src/bridge/recovery/bridgeRecoveryContract.ts');
const capabilityGuard = read('src/bridge/runtime/bridgeRuntimeCapabilityGuard.ts');
const safetyReport = read('src/bridge/runtime/bridgeRuntimeSafetyReport.ts');

assertIncludes(contractTypes, 'export type BridgeRecoveryContractPhase = "32.B10";', 'recovery contract must identify Phase 32 B10');
assertIncludes(contractTypes, 'enabled: false;', 'recovery contract must type enabled as false');
assertIncludes(contractTypes, 'executionAllowed: false;', 'recovery contract must type executionAllowed as false');
assertIncludes(contractTypes, 'recoveryActive: false;', 'recovery contract must type recoveryActive as false');
assertIncludes(contractTypes, 'evaluationAllowed: false;', 'recovery contract must block evaluation');
assertIncludes(contractTypes, 'schedulingAllowed: false;', 'recovery contract must block scheduling');
assertIncludes(contractTypes, 'retryAllowed: false;', 'recovery contract must block retry');
assertIncludes(contractTypes, 'rollbackAllowed: false;', 'recovery contract must block rollback');
assertIncludes(contractTypes, 'queueProcessingAllowed: false;', 'recovery contract must block queue processing');
assertIncludes(contractTypes, 'inboxProcessingAllowed: false;', 'recovery contract must block inbox processing');
assertIncludes(contractTypes, 'receiptProcessingAllowed: false;', 'recovery contract must block receipt processing');
assertIncludes(contractTypes, 'acknowledgementProcessingAllowed: false;', 'recovery contract must block acknowledgement processing');
assertIncludes(contractTypes, 'diagnosticsExecutionAllowed: false;', 'recovery contract must block diagnostics execution');
assertIncludes(contractTypes, 'transportAllowed: false;', 'recovery contract must block transport');
assertIncludes(contractTypes, 'persistenceAllowed: false;', 'recovery contract must block persistence');
assertIncludes(contractTypes, 'mutationAllowed: false;', 'recovery contract must block mutation');
assertIncludes(contractTypes, 'inventoryMutationAllowed: false;', 'recovery contract must block Inventory mutation');
assertIncludes(contractTypes, 'scanOpsMutationAllowed: false;', 'recovery contract must block ScanOps mutation');

assertIncludes(contract, 'createDisabledBridgeRecoveryActionContract', 'disabled recovery action factory must exist');
assertIncludes(contract, 'createBridgeRecoveryContractSnapshot', 'recovery contract snapshot factory must exist');
assertIncludes(contract, 'assertBridgeRuntimeCapabilityBlocked(', 'recovery contract must use runtime capability guard');
assertIncludes(contract, 'createBridgeRuntimeSafetyReport()', 'recovery contract must use runtime safety report');
assertIncludes(contract, '"recovery"', 'recovery contract must guard recovery capability');
assertIncludes(contract, 'enabled: false,', 'recovery snapshot must return enabled=false');
assertIncludes(contract, 'executionAllowed: false,', 'recovery snapshot must return executionAllowed=false');
assertIncludes(contract, 'recoveryActive: false,', 'recovery snapshot must return recoveryActive=false');
assertIncludes(contract, 'evaluationAllowed: false,', 'recovery snapshot must return evaluationAllowed=false');
assertIncludes(contract, 'schedulingAllowed: false,', 'recovery snapshot must return schedulingAllowed=false');
assertIncludes(contract, 'retryAllowed: false,', 'recovery snapshot must return retryAllowed=false');
assertIncludes(contract, 'rollbackAllowed: false,', 'recovery snapshot must return rollbackAllowed=false');
assertIncludes(contract, 'queueProcessingAllowed: false,', 'recovery snapshot must return queueProcessingAllowed=false');
assertIncludes(contract, 'inboxProcessingAllowed: false,', 'recovery snapshot must return inboxProcessingAllowed=false');
assertIncludes(contract, 'receiptProcessingAllowed: false,', 'recovery snapshot must return receiptProcessingAllowed=false');
assertIncludes(contract, 'acknowledgementProcessingAllowed: false,', 'recovery snapshot must return acknowledgementProcessingAllowed=false');
assertIncludes(contract, 'diagnosticsExecutionAllowed: false,', 'recovery snapshot must return diagnosticsExecutionAllowed=false');
assertIncludes(contract, 'transportAllowed: false,', 'recovery snapshot must return transportAllowed=false');
assertIncludes(contract, 'persistenceAllowed: false,', 'recovery snapshot must return persistenceAllowed=false');
assertIncludes(contract, 'mutationAllowed: false,', 'recovery snapshot must return mutationAllowed=false');
assertIncludes(contract, 'inventoryMutationAllowed: false,', 'recovery snapshot must return inventoryMutationAllowed=false');
assertIncludes(contract, 'scanOpsMutationAllowed: false,', 'recovery snapshot must return scanOpsMutationAllowed=false');
assertIncludes(contract, 'actions: [],', 'recovery snapshot must not include active actions');
assertIncludes(contract, 'performs no recovery execution', 'recovery reason must state no execution');

assertIncludes(capabilityGuard, 'recovery: "recovery"', 'runtime capability guard must map recovery to recovery gate');
assertIncludes(safetyReport, 'safeToRunOperationalBridge: false;', 'runtime safety report must keep operational bridge unsafe');

for (const forbidden of [
  'enabled: true',
  'executionAllowed: true',
  'recoveryActive: true',
  'evaluationAllowed: true',
  'schedulingAllowed: true',
  'retryAllowed: true',
  'rollbackAllowed: true',
  'queueProcessingAllowed: true',
  'inboxProcessingAllowed: true',
  'receiptProcessingAllowed: true',
  'acknowledgementProcessingAllowed: true',
  'diagnosticsExecutionAllowed: true',
  'transportAllowed: true',
  'persistenceAllowed: true',
  'mutationAllowed: true',
  'inventoryMutationAllowed: true',
  'scanOpsMutationAllowed: true',
  'evaluated: true',
  'scheduled: true',
  'retryReady: true',
  'rollbackReady: true',
  'queueReady: true',
  'inboxReady: true',
  'persistenceReady: true',
  'mutationReady: true',
  'operationalCapability: true',
  'fetch(',
  'WebSocket',
  'localStorage.',
  'sessionStorage.',
  'indexedDB',
]) {
  assertNotIncludes(contractTypes, forbidden, `recovery contract types must not contain ${forbidden}`);
  assertNotIncludes(contract, forbidden, `recovery contract implementation must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 32 B10 validates the recovery contract skeleton remains disabled and non-executing.');
