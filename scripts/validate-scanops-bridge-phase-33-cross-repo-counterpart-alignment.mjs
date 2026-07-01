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

const alignmentTypes = read('src/bridge/phase33/bridgePhase33CrossRepoCounterpartAlignmentTypes.ts');
const alignment = read('src/bridge/phase33/bridgePhase33CrossRepoCounterpartAlignment.ts');
const scanOpsBaseline = read('src/bridge/phase33/bridgePhase33InventoryCounterpartBaseline.ts');

assertIncludes(alignmentTypes, 'export type BridgePhase33CrossRepoCounterpartAlignmentPhase = "33.A8";', 'alignment must identify Phase 33 A8');
assertIncludes(alignmentTypes, 'counterparts-aligned-no-activation', 'alignment status must remain no-activation');
assertIncludes(alignmentTypes, 'readonly repository: "chrykoolaid/invyra-base44";', 'alignment evidence must identify Inventory repository');
assertIncludes(alignmentTypes, 'readonly pullRequest: 152;', 'alignment evidence must identify Inventory PR 152');
assertIncludes(alignmentTypes, 'readonly mergeCommit: "26433a7fd6edec84a2ff8ff7f0c3c5636371c236";', 'alignment evidence must identify Inventory merge commit');
assertIncludes(alignmentTypes, 'readonly counterpartCount: 8;', 'alignment evidence must identify eight Inventory counterparts');
assertIncludes(alignmentTypes, 'readonly confirmedInInventoryRepo: true;', 'alignment evidence must confirm Inventory repo baseline');
assertIncludes(alignmentTypes, 'readonly scanOpsCounterparts: 8;', 'alignment totals must type eight ScanOps counterparts');
assertIncludes(alignmentTypes, 'readonly inventoryCounterparts: 8;', 'alignment totals must type eight Inventory counterparts');
assertIncludes(alignmentTypes, 'readonly alignedCounterparts: 8;', 'alignment totals must type eight aligned counterparts');
assertIncludes(alignmentTypes, 'readonly activationStepsAllowed: 0;', 'alignment totals must allow zero activation steps');
assertIncludes(alignmentTypes, 'readonly crossRepoCounterpartAlignmentConfirmed: true;', 'counterpart alignment must be confirmed');
assertIncludes(alignmentTypes, 'readonly crossRepoValidationConfirmed: false;', 'cross-repo validation must remain false');
assertIncludes(alignmentTypes, 'readonly activationGateApproved: false;', 'activation gate must remain unapproved');
assertIncludes(alignmentTypes, 'readonly bridgeActivationAllowed: false;', 'bridge activation must remain disallowed');
assertIncludes(alignmentTypes, 'readonly safeToRunOperationalBridge: false;', 'operational bridge must remain unsafe');
assertIncludes(alignmentTypes, 'readonly executionAllowed: false;', 'execution must remain disallowed');
assertIncludes(alignmentTypes, 'readonly persistenceAllowed: false;', 'persistence must remain disallowed');
assertIncludes(alignmentTypes, 'readonly inventoryMutationAllowed: false;', 'Inventory mutation must remain disallowed');
assertIncludes(alignmentTypes, 'readonly scanOpsMutationAllowed: false;', 'ScanOps mutation must remain disallowed');
assertIncludes(alignmentTypes, 'readonly nextAllowedStep: "phase-33-a9-cross-repo-validation-fixture-plan";', 'alignment must route to A9 validation fixture plan');

assertIncludes(alignment, 'createBridgePhase33CrossRepoCounterpartAlignmentReview', 'alignment factory must exist');
assertIncludes(alignment, 'createBridgePhase33InventoryCounterpartBaseline()', 'alignment must build on ScanOps A7 baseline');
assertIncludes(alignment, 'phase: "33.A8"', 'alignment must return Phase 33 A8');
assertIncludes(alignment, 'status: "counterparts-aligned-no-activation"', 'alignment must return no-activation status');
assertIncludes(alignment, 'repository: "chrykoolaid/invyra-base44"', 'alignment must reference Inventory repo');
assertIncludes(alignment, 'pullRequest: 152', 'alignment must reference Inventory PR 152');
assertIncludes(alignment, 'mergeCommit: "26433a7fd6edec84a2ff8ff7f0c3c5636371c236"', 'alignment must reference Inventory merge commit');
assertIncludes(alignment, 'scanOpsCounterparts: 8', 'alignment must return eight ScanOps counterparts');
assertIncludes(alignment, 'inventoryCounterparts: 8', 'alignment must return eight Inventory counterparts');
assertIncludes(alignment, 'alignedCounterparts: 8', 'alignment must return eight aligned counterparts');
assertIncludes(alignment, 'activationStepsAllowed: 0', 'alignment must allow zero activation steps');
assertIncludes(alignment, 'crossRepoCounterpartAlignmentConfirmed: true', 'alignment must confirm counterpart alignment');
assertIncludes(alignment, 'crossRepoValidationConfirmed: false', 'alignment must keep cross-repo validation false');
assertIncludes(alignment, 'activationGateApproved: false', 'alignment must keep activation gate unapproved');
assertIncludes(alignment, 'bridgeActivationAllowed: false', 'alignment must keep bridge activation disallowed');
assertIncludes(alignment, 'safeToRunOperationalBridge: false', 'alignment must keep operational bridge unsafe');
assertIncludes(alignment, 'executionAllowed: false', 'alignment must keep execution disallowed');
assertIncludes(alignment, 'persistenceAllowed: false', 'alignment must keep persistence disallowed');
assertIncludes(alignment, 'inventoryMutationAllowed: false', 'alignment must keep Inventory mutation disallowed');
assertIncludes(alignment, 'scanOpsMutationAllowed: false', 'alignment must keep ScanOps mutation disallowed');
assertIncludes(alignment, 'nextAllowedStep: "phase-33-a9-cross-repo-validation-fixture-plan"', 'alignment must route to A9 validation fixture plan');

assertIncludes(scanOpsBaseline, 'phase: "33.A7"', 'alignment must build on A7 ScanOps baseline');
assertIncludes(scanOpsBaseline, 'inventoryCounterpartConfirmedInScanOps: true', 'A7 baseline must keep ScanOps counterpart confirmation true');
assertIncludes(scanOpsBaseline, 'inventoryCounterpartConfirmedInInventoryRepo: false', 'A7 baseline must stay ScanOps-side only');

for (const forbidden of [
  'crossRepoValidationConfirmed: true',
  'activationGateApproved: true',
  'bridgeActivationAllowed: true',
  'safeToRunOperationalBridge: true',
  'executionAllowed: true',
  'persistenceAllowed: true',
  'inventoryMutationAllowed: true',
  'scanOpsMutationAllowed: true',
  'activationStepsAllowed: 1',
]) {
  assertNotIncludes(alignmentTypes, forbidden, `alignment types must not contain ${forbidden}`);
  assertNotIncludes(alignment, forbidden, `alignment implementation must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 33 A8 validates cross-repo counterpart alignment is confirmed while validation and activation remain blocked.');
