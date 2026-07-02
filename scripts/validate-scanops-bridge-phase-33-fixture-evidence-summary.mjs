import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const errors = [];

function has(source, value, message) {
  if (!source.includes(value)) errors.push(message);
}

const types = read('src/bridge/phase33/bridgePhase33FixtureEvidenceSummaryTypes.ts');
const summary = read('src/bridge/phase33/bridgePhase33FixtureEvidenceSummary.ts');
const index = read('src/bridge/phase33/bridgePhase33FixtureImplementationIndex.ts');

has(types, '"33.A16"', 'A16 phase marker missing');
has(types, 'fixture-summary-defined-read-only', 'A16 status missing');
has(types, 'readonly summaryEntries: 8;', 'A16 summary entry count missing');
has(types, 'readonly descriptorOnlyEntries: 8;', 'A16 descriptor count missing');
has(types, 'readonly activeEntries: 0;', 'A16 active entry lock missing');
has(types, 'readonly activationStepsAllowed: 0;', 'A16 activation lock missing');
has(types, 'phase-33-a17-fixture-evidence-readiness-review', 'A16 next step missing');

has(summary, 'createBridgePhase33FixtureEvidenceSummaryReport', 'A16 factory missing');
has(summary, 'createBridgePhase33FixtureImplementationIndexReport()', 'A16 must build on A15');
has(summary, 'phase: "33.A16"', 'A16 return marker missing');
has(summary, 'summaryEntries: 8', 'A16 summary return count missing');
has(summary, 'descriptorOnlyEntries: 8', 'A16 descriptor return count missing');
has(summary, 'activeEntries: 0', 'A16 active return lock missing');
has(summary, 'activationStepsAllowed: 0', 'A16 activation return lock missing');
has(summary, 'readyForFixtureExecution: false', 'A16 execution lock missing');
has(summary, 'crossRepoValidationConfirmed: false', 'A16 validation confirmation lock missing');
has(summary, 'bridgeActivationAllowed: false', 'A16 bridge activation lock missing');
has(summary, 'safeToRunOperationalBridge: false', 'A16 bridge safety lock missing');
has(summary, 'persistenceAllowed: false', 'A16 persistence lock missing');
has(summary, 'inventoryMutationAllowed: false', 'A16 Inventory mutation lock missing');
has(summary, 'scanOpsMutationAllowed: false', 'A16 ScanOps mutation lock missing');

has(index, 'phase: "33.A15"', 'A16 must build on A15 implementation index');
has(index, 'implementationIndexDefined: true', 'A15 index definition missing');
has(index, 'activeEntries: 0', 'A15 active entry lock missing');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 33 A16 fixture evidence summary validation passed.');
