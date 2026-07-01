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

const planTypes = read('src/bridge/phase33/bridgePhase33CrossRepoValidationFixturePlanTypes.ts');
const plan = read('src/bridge/phase33/bridgePhase33CrossRepoValidationFixturePlan.ts');
const alignment = read('src/bridge/phase33/bridgePhase33CrossRepoCounterpartAlignment.ts');

assertIncludes(planTypes, 'export type BridgePhase33CrossRepoValidationFixturePlanPhase = "33.A9";', 'fixture plan must identify Phase 33 A9');
assertIncludes(planTypes, 'fixture-plan-defined-read-only', 'fixture plan status must remain read-only');
assertIncludes(planTypes, 'readonly plannedFixtureGroups: 8;', 'fixture plan totals must type eight planned groups');
assertIncludes(planTypes, 'readonly scanOpsFixturesRequired: 8;', 'fixture plan totals must type eight ScanOps fixtures');
assertIncludes(planTypes, 'readonly inventoryFixturesRequired: 8;', 'fixture plan totals must type eight Inventory fixtures');
assertIncludes(planTypes, 'readonly activeFixtures: 0;', 'fixture plan totals must type zero active fixtures');
assertIncludes(planTypes, 'readonly activationStepsAllowed: 0;', 'fixture plan totals must allow zero activation steps');
assertIncludes(planTypes, 'readonly fixturePlanDefined: true;', 'fixture plan must be defined');
assertIncludes(planTypes, 'readonly crossRepoCounterpartAlignmentConfirmed: true;', 'fixture plan must build on confirmed counterpart alignment');
assertIncludes(planTypes, 'readonly crossRepoValidationConfirmed: false;', 'cross-repo validation must remain false');
assertIncludes(planTypes, 'readonly fixturePlanActive: false;', 'fixture plan must remain inactive');
assertIncludes(planTypes, 'readonly bridgeActivationAllowed: false;', 'bridge activation must remain disallowed');
assertIncludes(planTypes, 'readonly safeToRunOperationalBridge: false;', 'operational bridge must remain unsafe');
assertIncludes(planTypes, 'readonly persistenceAllowed: false;', 'persistence must remain disallowed');
assertIncludes(planTypes, 'readonly inventoryMutationAllowed: false;', 'Inventory mutation must remain disallowed');
assertIncludes(planTypes, 'readonly scanOpsMutationAllowed: false;', 'ScanOps mutation must remain disallowed');
assertIncludes(planTypes, 'readonly nextAllowedStep: "phase-33-a10-cross-repo-validation-fixture-skeletons";', 'fixture plan must route to A10 fixture skeletons');

assertIncludes(plan, 'createBridgePhase33CrossRepoValidationFixturePlan', 'fixture plan factory must exist');
assertIncludes(plan, 'createBridgePhase33CrossRepoCounterpartAlignmentReview()', 'fixture plan must build on A8 alignment');
assertIncludes(plan, 'phase: "33.A9"', 'fixture plan must return Phase 33 A9');
assertIncludes(plan, 'status: "fixture-plan-defined-read-only"', 'fixture plan must return read-only status');
assertIncludes(plan, 'plannedFixtureGroups: 8', 'fixture plan must return eight planned groups');
assertIncludes(plan, 'scanOpsFixturesRequired: 8', 'fixture plan must return eight ScanOps fixture requirements');
assertIncludes(plan, 'inventoryFixturesRequired: 8', 'fixture plan must return eight Inventory fixture requirements');
assertIncludes(plan, 'activeFixtures: 0', 'fixture plan must return zero active fixtures');
assertIncludes(plan, 'activationStepsAllowed: 0', 'fixture plan must allow zero activation steps');
assertIncludes(plan, 'fixturePlanDefined: true', 'fixture plan must be defined');
assertIncludes(plan, 'crossRepoValidationConfirmed: false', 'fixture plan must keep cross-repo validation false');
assertIncludes(plan, 'fixturePlanActive: false', 'fixture plan must remain inactive');
assertIncludes(plan, 'bridgeActivationAllowed: false', 'fixture plan must keep bridge activation disallowed');
assertIncludes(plan, 'safeToRunOperationalBridge: false', 'fixture plan must keep operational bridge unsafe');
assertIncludes(plan, 'persistenceAllowed: false', 'fixture plan must keep persistence disallowed');
assertIncludes(plan, 'inventoryMutationAllowed: false', 'fixture plan must keep Inventory mutation disallowed');
assertIncludes(plan, 'scanOpsMutationAllowed: false', 'fixture plan must keep ScanOps mutation disallowed');
assertIncludes(plan, 'nextAllowedStep: "phase-33-a10-cross-repo-validation-fixture-skeletons"', 'fixture plan must route to A10 fixture skeletons');

for (const expected of [
  'Bridge availability descriptor alignment',
  'Pairing offer and request alignment',
  'Trusted device registry alignment',
  'Bridge receive endpoint envelope alignment',
  'Inbox admission policy alignment',
  'Receipt review boundary alignment',
  'Acknowledgement contract alignment',
  'Recovery and audit policy alignment',
]) {
  assertIncludes(plan, expected, `fixture plan must include ${expected}`);
}

assertIncludes(alignment, 'phase: "33.A8"', 'fixture plan must build on A8 counterpart alignment');
assertIncludes(alignment, 'crossRepoCounterpartAlignmentConfirmed: true', 'A8 alignment must remain confirmed');
assertIncludes(alignment, 'crossRepoValidationConfirmed: false', 'A8 alignment must keep validation unconfirmed');

for (const forbidden of [
  'active: true',
  'activeFixtures: 1',
  'crossRepoValidationConfirmed: true',
  'fixturePlanActive: true',
  'bridgeActivationAllowed: true',
  'safeToRunOperationalBridge: true',
  'persistenceAllowed: true',
  'inventoryMutationAllowed: true',
  'scanOpsMutationAllowed: true',
  'activationStepsAllowed: 1',
  'fetch(',
  'WebSocket',
  'localStorage.',
  'sessionStorage.',
  'indexedDB',
]) {
  assertNotIncludes(planTypes, forbidden, `fixture plan types must not contain ${forbidden}`);
  assertNotIncludes(plan, forbidden, `fixture plan implementation must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 33 A9 validates the cross-repo validation fixture plan is read-only and inactive.');
