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

const baselineTypes = read('src/bridge/phase33/bridgePhase33InventoryCounterpartBaselineTypes.ts');
const baseline = read('src/bridge/phase33/bridgePhase33InventoryCounterpartBaseline.ts');
const readinessReview = read('src/bridge/phase33/bridgePhase33ActivationReadinessReview.ts');

assertIncludes(baselineTypes, 'export type BridgePhase33InventoryCounterpartBaselinePhase = "33.A7";', 'baseline must identify Phase 33 A7');
assertIncludes(baselineTypes, 'inventory-counterpart-baseline-required', 'baseline status must require Inventory counterpart work');
assertIncludes(baselineTypes, 'scanops-baseline-only-inventory-not-confirmed', 'baseline confirmation status must remain ScanOps-only');
assertIncludes(baselineTypes, 'readonly requiredCounterparts: 8;', 'baseline totals must type eight required counterparts');
assertIncludes(baselineTypes, 'readonly confirmedInScanOps: 8;', 'baseline totals must type eight ScanOps confirmations');
assertIncludes(baselineTypes, 'readonly confirmedInInventoryRepo: 0;', 'baseline totals must type zero Inventory repo confirmations');
assertIncludes(baselineTypes, 'readonly activationStepsAllowed: 0;', 'baseline totals must allow zero activation steps');
assertIncludes(baselineTypes, 'readonly inventoryCounterpartConfirmedInInventoryRepo: false;', 'Inventory repo confirmation must remain false');
assertIncludes(baselineTypes, 'readonly crossRepoValidationConfirmed: false;', 'cross-repo validation must remain false');
assertIncludes(baselineTypes, 'readonly bridgeActivationAllowed: false;', 'bridge activation must remain disallowed');
assertIncludes(baselineTypes, 'readonly safeToRunOperationalBridge: false;', 'operational bridge must remain unsafe');
assertIncludes(baselineTypes, 'readonly executionAllowed: false;', 'execution must remain disallowed');
assertIncludes(baselineTypes, 'readonly persistenceAllowed: false;', 'persistence must remain disallowed');
assertIncludes(baselineTypes, 'readonly inventoryMutationAllowed: false;', 'Inventory mutation must remain disallowed');
assertIncludes(baselineTypes, 'readonly scanOpsMutationAllowed: false;', 'ScanOps mutation must remain disallowed');
assertIncludes(baselineTypes, 'readonly nextAllowedStep: "inventory-repo-counterpart-phase";', 'baseline must route next work to Inventory repo counterpart phase');

assertIncludes(baseline, 'createBridgePhase33InventoryCounterpartBaseline', 'baseline factory must exist');
assertIncludes(baseline, 'createBridgePhase33ActivationReadinessReview()', 'baseline must build on A6 activation readiness review');
assertIncludes(baseline, 'phase: "33.A7"', 'baseline must return Phase 33 A7');
assertIncludes(baseline, 'status: "inventory-counterpart-baseline-required"', 'baseline must return required status');
assertIncludes(baseline, 'confirmationStatus: "scanops-baseline-only-inventory-not-confirmed"', 'baseline must return ScanOps-only confirmation status');
assertIncludes(baseline, 'requiredCounterparts: 8', 'baseline must return eight required counterparts');
assertIncludes(baseline, 'confirmedInScanOps: 8', 'baseline must return eight ScanOps confirmations');
assertIncludes(baseline, 'confirmedInInventoryRepo: 0', 'baseline must return zero Inventory repo confirmations');
assertIncludes(baseline, 'activationStepsAllowed: 0', 'baseline must allow zero activation steps');
assertIncludes(baseline, 'inventoryCounterpartConfirmedInInventoryRepo: false', 'baseline must keep Inventory repo confirmation false');
assertIncludes(baseline, 'crossRepoValidationConfirmed: false', 'baseline must keep cross-repo validation false');
assertIncludes(baseline, 'bridgeActivationAllowed: false', 'baseline must keep bridge activation disallowed');
assertIncludes(baseline, 'safeToRunOperationalBridge: false', 'baseline must keep operational bridge unsafe');
assertIncludes(baseline, 'executionAllowed: false', 'baseline must keep execution disallowed');
assertIncludes(baseline, 'persistenceAllowed: false', 'baseline must keep persistence disallowed');
assertIncludes(baseline, 'inventoryMutationAllowed: false', 'baseline must keep Inventory mutation disallowed');
assertIncludes(baseline, 'scanOpsMutationAllowed: false', 'baseline must keep ScanOps mutation disallowed');
assertIncludes(baseline, 'nextAllowedStep: "inventory-repo-counterpart-phase"', 'baseline must route to Inventory repo counterpart phase');

for (const expected of [
  'Inventory Desktop bridge availability descriptor',
  'Inventory Desktop pairing offer and approval policy',
  'Inventory Desktop device trust registry',
  'Inventory Desktop bridge receive endpoint',
  'Inventory Desktop bridge inbox admission policy',
  'Inventory Desktop receipt review and application boundary',
  'Inventory Desktop acknowledgement contract',
  'Inventory Desktop recovery and audit policy',
]) {
  assertIncludes(baseline, expected, `baseline must include ${expected}`);
}

assertIncludes(readinessReview, 'phase: "33.A6"', 'baseline must build on A6 readiness review');
assertIncludes(readinessReview, 'decision: "blocked"', 'A6 readiness review must remain blocked');
assertIncludes(readinessReview, 'inventoryCounterpartConfirmed: false', 'A6 readiness review must keep Inventory counterpart unconfirmed');

for (const forbidden of [
  'confirmedInInventoryRepo: true',
  'scanOpsCanMutateInventory: true',
  'inventoryCounterpartConfirmedInInventoryRepo: true',
  'crossRepoValidationConfirmed: true',
  'bridgeActivationAllowed: true',
  'safeToRunOperationalBridge: true',
  'executionAllowed: true',
  'persistenceAllowed: true',
  'inventoryMutationAllowed: true',
  'scanOpsMutationAllowed: true',
  'activationStepsAllowed: 1',
]) {
  assertNotIncludes(baselineTypes, forbidden, `baseline types must not contain ${forbidden}`);
  assertNotIncludes(baseline, forbidden, `baseline implementation must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 33 A7 validates Inventory counterpart baseline remains ScanOps-side only with activation blocked.');
