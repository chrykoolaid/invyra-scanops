import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const errors = [];

function has(source, value, message) {
  if (!source.includes(value)) errors.push(message);
}

const types = read('src/bridge/phase33/bridgePhase33FixtureImplementationPlanTypes.ts');
const plan = read('src/bridge/phase33/bridgePhase33FixtureImplementationPlan.ts');
const readiness = read('src/bridge/phase33/bridgePhase33ValidationReadinessSnapshot.ts');

has(types, '"33.A13"', 'A13 phase marker missing');
has(types, 'fixture-implementation-plan-defined-read-only', 'A13 status missing');
has(types, 'readonly plannedSteps: 8;', 'A13 planned count missing');
has(types, 'readonly activeSteps: 0;', 'A13 active step lock missing');
has(types, 'readonly activationStepsAllowed: 0;', 'A13 activation step lock missing');
has(types, 'readonly readyForFixtureImplementation: true;', 'A13 implementation readiness missing');
has(types, 'readonly readyForFixtureExecution: false;', 'A13 execution lock missing');
has(types, 'phase-33-a14-fixture-implementation-skeletons', 'A13 next step missing');

has(plan, 'createBridgePhase33FixtureImplementationPlan', 'A13 factory missing');
has(plan, 'createBridgePhase33ValidationReadinessSnapshot()', 'A13 must build on A12');
has(plan, 'phase: "33.A13"', 'A13 return marker missing');
has(plan, 'plannedSteps: 8', 'A13 planned return count missing');
has(plan, 'activeSteps: 0', 'A13 active return lock missing');
has(plan, 'activationStepsAllowed: 0', 'A13 activation return lock missing');
has(plan, 'readyForFixtureImplementation: true', 'A13 implementation readiness return missing');
has(plan, 'readyForFixtureExecution: false', 'A13 execution lock return missing');
has(plan, 'crossRepoValidationConfirmed: false', 'A13 validation confirmation lock missing');
has(plan, 'bridgeActivationAllowed: false', 'A13 bridge activation lock missing');
has(plan, 'safeToRunOperationalBridge: false', 'A13 bridge safety lock missing');
has(plan, 'persistenceAllowed: false', 'A13 persistence lock missing');
has(plan, 'inventoryMutationAllowed: false', 'A13 Inventory mutation lock missing');
has(plan, 'scanOpsMutationAllowed: false', 'A13 ScanOps mutation lock missing');

has(readiness, 'phase: "33.A12"', 'A13 must build on A12 readiness snapshot');
has(readiness, 'readyForFixtureImplementation: true', 'A12 implementation readiness missing');
has(readiness, 'readyForFixtureExecution: false', 'A12 execution lock missing');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 33 A13 fixture implementation plan validation passed.');
