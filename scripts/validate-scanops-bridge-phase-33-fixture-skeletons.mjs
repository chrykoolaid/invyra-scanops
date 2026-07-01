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

const skeletonTypes = read('src/bridge/phase33/bridgePhase33ValidationFixtureSkeletonTypes.ts');
const skeletons = read('src/bridge/phase33/bridgePhase33ValidationFixtureSkeletons.ts');
const fixturePlan = read('src/bridge/phase33/bridgePhase33CrossRepoValidationFixturePlan.ts');

assertIncludes(skeletonTypes, 'export type BridgePhase33ValidationFixtureSkeletonPhase = "33.A10";', 'skeleton report must identify Phase 33 A10');
assertIncludes(skeletonTypes, 'fixture-skeletons-defined-read-only', 'skeleton status must remain read-only');
assertIncludes(skeletonTypes, 'readonly skeletons: 8;', 'skeleton totals must type eight skeletons');
assertIncludes(skeletonTypes, 'readonly scanOpsFixtureKeys: 8;', 'skeleton totals must type eight ScanOps keys');
assertIncludes(skeletonTypes, 'readonly inventoryFixtureKeys: 8;', 'skeleton totals must type eight Inventory keys');
assertIncludes(skeletonTypes, 'readonly assertionKeys: 8;', 'skeleton totals must type eight assertion keys');
assertIncludes(skeletonTypes, 'readonly activeSkeletons: 0;', 'skeleton totals must type zero active skeletons');
assertIncludes(skeletonTypes, 'readonly activationStepsAllowed: 0;', 'skeleton totals must allow zero activation steps');
assertIncludes(skeletonTypes, 'readonly skeletonsDefined: true;', 'skeleton report must define skeletons');
assertIncludes(skeletonTypes, 'readonly fixturePlanActive: false;', 'fixture plan must remain inactive');
assertIncludes(skeletonTypes, 'readonly crossRepoValidationConfirmed: false;', 'cross-repo validation must remain false');
assertIncludes(skeletonTypes, 'readonly bridgeActivationAllowed: false;', 'bridge activation must remain disallowed');
assertIncludes(skeletonTypes, 'readonly safeToRunOperationalBridge: false;', 'operational bridge must remain unsafe');
assertIncludes(skeletonTypes, 'readonly persistenceAllowed: false;', 'persistence must remain disallowed');
assertIncludes(skeletonTypes, 'readonly inventoryMutationAllowed: false;', 'Inventory mutation must remain disallowed');
assertIncludes(skeletonTypes, 'readonly scanOpsMutationAllowed: false;', 'ScanOps mutation must remain disallowed');
assertIncludes(skeletonTypes, 'readonly nextAllowedStep: "phase-33-a11-fixture-skeleton-index";', 'skeleton report must route to A11 index');

assertIncludes(skeletons, 'createBridgePhase33ValidationFixtureSkeletonReport', 'skeleton report factory must exist');
assertIncludes(skeletons, 'createBridgePhase33CrossRepoValidationFixturePlan()', 'skeleton report must build on A9 fixture plan');
assertIncludes(skeletons, 'phase: "33.A10"', 'skeleton report must return Phase 33 A10');
assertIncludes(skeletons, 'status: "fixture-skeletons-defined-read-only"', 'skeleton report must return read-only status');
assertIncludes(skeletons, 'skeletons: 8', 'skeleton report must return eight skeletons');
assertIncludes(skeletons, 'scanOpsFixtureKeys: 8', 'skeleton report must return eight ScanOps keys');
assertIncludes(skeletons, 'inventoryFixtureKeys: 8', 'skeleton report must return eight Inventory keys');
assertIncludes(skeletons, 'assertionKeys: 8', 'skeleton report must return eight assertion keys');
assertIncludes(skeletons, 'activeSkeletons: 0', 'skeleton report must return zero active skeletons');
assertIncludes(skeletons, 'activationStepsAllowed: 0', 'skeleton report must allow zero activation steps');
assertIncludes(skeletons, 'skeletonsDefined: true', 'skeleton report must define skeletons');
assertIncludes(skeletons, 'fixturePlanActive: false', 'skeleton report must keep fixture plan inactive');
assertIncludes(skeletons, 'crossRepoValidationConfirmed: false', 'skeleton report must keep cross-repo validation false');
assertIncludes(skeletons, 'bridgeActivationAllowed: false', 'skeleton report must keep bridge activation disallowed');
assertIncludes(skeletons, 'safeToRunOperationalBridge: false', 'skeleton report must keep operational bridge unsafe');
assertIncludes(skeletons, 'persistenceAllowed: false', 'skeleton report must keep persistence disallowed');
assertIncludes(skeletons, 'inventoryMutationAllowed: false', 'skeleton report must keep Inventory mutation disallowed');
assertIncludes(skeletons, 'scanOpsMutationAllowed: false', 'skeleton report must keep ScanOps mutation disallowed');
assertIncludes(skeletons, 'nextAllowedStep: "phase-33-a11-fixture-skeleton-index"', 'skeleton report must route to A11 index');

for (const expected of [
  'scanops.bridge.availability.descriptor',
  'inventory.bridge.availability.descriptor',
  'bridge.availability.descriptor.alignment',
  'scanops.bridge.pairing.request',
  'inventory.bridge.pairing.offer',
  'scanops.bridge.transport.envelope',
  'inventory.bridge.receive.endpoint',
  'inventory.bridge.recovery.audit.policy',
]) {
  assertIncludes(skeletons, expected, `skeleton report must include ${expected}`);
}

assertIncludes(fixturePlan, 'phase: "33.A9"', 'skeleton report must build on A9 fixture plan');
assertIncludes(fixturePlan, 'fixturePlanDefined: true', 'A9 fixture plan must remain defined');
assertIncludes(fixturePlan, 'fixturePlanActive: false', 'A9 fixture plan must remain inactive');

for (const forbidden of [
  'active: true',
  'activeSkeletons: 1',
  'fixturePlanActive: true',
  'crossRepoValidationConfirmed: true',
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
  assertNotIncludes(skeletonTypes, forbidden, `skeleton types must not contain ${forbidden}`);
  assertNotIncludes(skeletons, forbidden, `skeleton implementation must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 33 A10 validates fixture skeleton keys are defined while all activation remains blocked.');
