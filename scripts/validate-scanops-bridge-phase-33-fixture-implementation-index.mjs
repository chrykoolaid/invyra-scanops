import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const errors = [];

function has(source, value, message) {
  if (!source.includes(value)) errors.push(message);
}

const types = read('src/bridge/phase33/bridgePhase33FixtureImplementationIndexTypes.ts');
const index = read('src/bridge/phase33/bridgePhase33FixtureImplementationIndex.ts');
const skeletons = read('src/bridge/phase33/bridgePhase33FixtureImplementationSkeletons.ts');

has(types, '"33.A15"', 'A15 phase marker missing');
has(types, 'fixture-implementation-index-defined-read-only', 'A15 status missing');
has(types, 'readonly indexedEntries: 8;', 'A15 indexed entry count missing');
has(types, 'readonly descriptorOnlyEntries: 8;', 'A15 descriptor count missing');
has(types, 'readonly activeEntries: 0;', 'A15 active entry lock missing');
has(types, 'readonly activationStepsAllowed: 0;', 'A15 activation lock missing');
has(types, 'phase-33-a16-fixture-evidence-summary', 'A15 next step missing');

has(index, 'createBridgePhase33FixtureImplementationIndexReport', 'A15 factory missing');
has(index, 'createBridgePhase33FixtureImplementationSkeletonReport()', 'A15 must build on A14');
has(index, 'phase: "33.A15"', 'A15 return marker missing');
has(index, 'indexedEntries: 8', 'A15 indexed return count missing');
has(index, 'descriptorOnlyEntries: 8', 'A15 descriptor return count missing');
has(index, 'activeEntries: 0', 'A15 active return lock missing');
has(index, 'activationStepsAllowed: 0', 'A15 activation return lock missing');
has(index, 'readyForFixtureExecution: false', 'A15 execution lock missing');
has(index, 'crossRepoValidationConfirmed: false', 'A15 validation confirmation lock missing');
has(index, 'bridgeActivationAllowed: false', 'A15 bridge activation lock missing');
has(index, 'safeToRunOperationalBridge: false', 'A15 bridge safety lock missing');
has(index, 'persistenceAllowed: false', 'A15 persistence lock missing');
has(index, 'inventoryMutationAllowed: false', 'A15 Inventory mutation lock missing');
has(index, 'scanOpsMutationAllowed: false', 'A15 ScanOps mutation lock missing');

has(skeletons, 'phase: "33.A14"', 'A15 must build on A14 skeleton report');
has(skeletons, 'implementationSkeletonsDefined: true', 'A14 skeleton definition missing');
has(skeletons, 'activeSkeletons: 0', 'A14 active skeleton lock missing');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 33 A15 fixture implementation index validation passed.');
