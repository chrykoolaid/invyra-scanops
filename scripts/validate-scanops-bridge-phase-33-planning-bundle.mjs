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

const bundleTypes = read('src/bridge/phase33/bridgePhase33PlanningBundleTypes.ts');
const bundle = read('src/bridge/phase33/bridgePhase33PlanningBundle.ts');
const baseline = read('src/bridge/phase33/bridgePhase33GateBaseline.ts');

assertIncludes(bundleTypes, 'export type BridgePhase33PlanningBundlePhase = "33.A2-A5";', 'planning bundle must identify accelerated A2-A5 phase');
assertIncludes(bundleTypes, 'planning-bundle-established-no-activation', 'planning bundle status must remain no-activation');
assertIncludes(bundleTypes, 'readonly planningScopeEntries: 4;', 'planning bundle must type four planning scope entries');
assertIncludes(bundleTypes, 'readonly dependencyMatrixEntries: 10;', 'planning bundle must type ten dependency entries');
assertIncludes(bundleTypes, 'readonly inventoryCounterpartEntries: 8;', 'planning bundle must type eight Inventory counterpart entries');
assertIncludes(bundleTypes, 'readonly endToEndPathSteps: 8;', 'planning bundle must type eight end-to-end path steps');
assertIncludes(bundleTypes, 'readonly mergedExternalSurfaceCount: 6;', 'planning bundle must acknowledge six merged external surfaces');
assertIncludes(bundleTypes, 'readonly activationStepsAllowed: 0;', 'planning bundle must allow zero activation steps');
assertIncludes(bundleTypes, 'readonly planningOnly: true;', 'planning bundle must be planning-only');
assertIncludes(bundleTypes, 'readonly phase33OperationalActivationAllowed: false;', 'planning bundle must disallow operational activation');
assertIncludes(bundleTypes, 'readonly bridgeActivationAllowed: false;', 'planning bundle must disallow bridge activation');
assertIncludes(bundleTypes, 'readonly safeToRunOperationalBridge: false;', 'planning bundle must mark operational bridge unsafe');
assertIncludes(bundleTypes, 'readonly executionAllowed: false;', 'planning bundle must disallow execution');
assertIncludes(bundleTypes, 'readonly persistenceAllowed: false;', 'planning bundle must disallow persistence');
assertIncludes(bundleTypes, 'readonly inventoryMutationAllowed: false;', 'planning bundle must disallow Inventory mutation');
assertIncludes(bundleTypes, 'readonly scanOpsMutationAllowed: false;', 'planning bundle must disallow ScanOps mutation');
assertIncludes(bundleTypes, 'readonly nextAllowedStep: "phase-33-a6-activation-readiness-review";', 'planning bundle must route next step to A6 readiness review');

assertIncludes(bundle, 'createBridgePhase33PlanningBundle', 'planning bundle factory must exist');
assertIncludes(bundle, 'createBridgePhase33GateBaseline()', 'planning bundle must build on Phase 33 A1 baseline');
assertIncludes(bundle, 'phase: "33.A2-A5"', 'planning bundle must return accelerated A2-A5 phase');
assertIncludes(bundle, 'status: "planning-bundle-established-no-activation"', 'planning bundle must return no-activation status');
assertIncludes(bundle, 'planningScopeEntries: 4', 'planning bundle must return four planning entries');
assertIncludes(bundle, 'dependencyMatrixEntries: 10', 'planning bundle must return ten dependencies');
assertIncludes(bundle, 'inventoryCounterpartEntries: 8', 'planning bundle must return eight counterpart entries');
assertIncludes(bundle, 'endToEndPathSteps: 8', 'planning bundle must return eight path steps');
assertIncludes(bundle, 'mergedExternalSurfaceCount: 6', 'planning bundle must acknowledge six external surfaces');
assertIncludes(bundle, 'activationStepsAllowed: 0', 'planning bundle must allow zero activation steps');
assertIncludes(bundle, 'planningOnly: true', 'planning bundle must remain planning-only');
assertIncludes(bundle, 'phase33OperationalActivationAllowed: false', 'planning bundle must keep operational activation disallowed');
assertIncludes(bundle, 'bridgeActivationAllowed: false', 'planning bundle must keep bridge activation disallowed');
assertIncludes(bundle, 'safeToRunOperationalBridge: false', 'planning bundle must keep operational bridge unsafe');
assertIncludes(bundle, 'executionAllowed: false', 'planning bundle must keep execution disallowed');
assertIncludes(bundle, 'persistenceAllowed: false', 'planning bundle must keep persistence disallowed');
assertIncludes(bundle, 'inventoryMutationAllowed: false', 'planning bundle must keep Inventory mutation disallowed');
assertIncludes(bundle, 'scanOpsMutationAllowed: false', 'planning bundle must keep ScanOps mutation disallowed');
assertIncludes(bundle, 'nextAllowedStep: "phase-33-a6-activation-readiness-review"', 'planning bundle must route to A6 readiness review');

for (const expected of [
  'Scope map',
  'Activation dependency matrix',
  'Inventory counterpart map',
  'End-to-end bridge path plan',
  'Manual retry execution boundary',
  'Inventory Desktop bridge receive endpoint',
  'Inventory Desktop receipt review and application boundary',
  'Prepare activation readiness review',
]) {
  assertIncludes(bundle, expected, `planning bundle must include ${expected}`);
}

assertIncludes(baseline, 'phase: "33.A1"', 'planning bundle must build on A1 baseline');
assertIncludes(baseline, 'phase33OperationalActivationAllowed: false', 'A1 baseline must keep operational activation disallowed');
assertIncludes(baseline, 'activationStepsAllowed: 0', 'A1 baseline must allow zero activation steps');

for (const forbidden of [
  'activationAllowed: true',
  'executionAllowed: true',
  'phase33OperationalActivationAllowed: true',
  'bridgeActivationAllowed: true',
  'safeToRunOperationalBridge: true',
  'persistenceAllowed: true',
  'inventoryMutationAllowed: true',
  'scanOpsMutationAllowed: true',
  'activationStepsAllowed: 1',
]) {
  assertNotIncludes(bundleTypes, forbidden, `planning bundle types must not contain ${forbidden}`);
  assertNotIncludes(bundle, forbidden, `planning bundle implementation must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 33 A2-A5 validates accelerated planning remains read-only with activation blocked.');
