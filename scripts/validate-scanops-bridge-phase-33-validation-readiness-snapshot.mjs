import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const errors = [];

function has(source, value, message) {
  if (!source.includes(value)) errors.push(message);
}

const types = read('src/bridge/phase33/bridgePhase33ValidationReadinessSnapshotTypes.ts');
const snapshot = read('src/bridge/phase33/bridgePhase33ValidationReadinessSnapshot.ts');
const index = read('src/bridge/phase33/bridgePhase33FixtureSkeletonIndex.ts');

has(types, '"33.A12"', 'A12 phase marker missing');
has(types, 'ready-for-fixture-implementation-not-execution', 'A12 status missing');
has(types, 'readonly readinessChecks: 8;', 'A12 readiness count missing');
has(types, 'readonly readyChecks: 5;', 'A12 ready count missing');
has(types, 'readonly blockingChecks: 3;', 'A12 blocking count missing');
has(types, 'readonly activationStepsAllowed: 0;', 'A12 activation step lock missing');
has(types, 'readonly readyForFixtureImplementation: true;', 'A12 implementation planning readiness missing');
has(types, 'readonly readyForFixtureExecution: false;', 'A12 execution lock missing');
has(types, 'phase-33-a13-fixture-implementation-plan', 'A12 next step missing');

has(snapshot, 'createBridgePhase33ValidationReadinessSnapshot', 'A12 factory missing');
has(snapshot, 'createBridgePhase33FixtureSkeletonIndexReport()', 'A12 must build on A11');
has(snapshot, 'phase: "33.A12"', 'A12 return marker missing');
has(snapshot, 'readyChecks: 5', 'A12 ready return count missing');
has(snapshot, 'blockingChecks: 3', 'A12 blocking return count missing');
has(snapshot, 'activationStepsAllowed: 0', 'A12 activation return lock missing');
has(snapshot, 'readyForFixtureImplementation: true', 'A12 implementation readiness return missing');
has(snapshot, 'readyForFixtureExecution: false', 'A12 execution lock return missing');
has(snapshot, 'crossRepoValidationConfirmed: false', 'A12 validation confirmation lock missing');
has(snapshot, 'bridgeActivationAllowed: false', 'A12 bridge activation lock missing');
has(snapshot, 'safeToRunOperationalBridge: false', 'A12 bridge safety lock missing');
has(snapshot, 'persistenceAllowed: false', 'A12 persistence lock missing');
has(snapshot, 'inventoryMutationAllowed: false', 'A12 Inventory mutation lock missing');
has(snapshot, 'scanOpsMutationAllowed: false', 'A12 ScanOps mutation lock missing');

has(index, 'phase: "33.A11"', 'A12 must build on A11 index');
has(index, 'indexDefined: true', 'A11 index definition missing');
has(index, 'activeEntries: 0', 'A11 active entry lock missing');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 33 A12 validation readiness snapshot passed.');
