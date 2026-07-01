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

const baselineTypes = read('src/bridge/phase33/bridgePhase33GateBaselineTypes.ts');
const baseline = read('src/bridge/phase33/bridgePhase33GateBaseline.ts');
const cleanupReport = read('src/bridge/contracts/bridgePhase32CleanupReport.ts');

assertIncludes(baselineTypes, 'export type BridgePhase33GateBaselinePhase = "33.A1";', 'baseline must identify Phase 33 A1');
assertIncludes(baselineTypes, 'baseline-established-no-activation', 'baseline status must establish without activation');
assertIncludes(baselineTypes, 'readonly mergedExternalSurfaceCount: 5;', 'baseline totals must preserve five external surfaces');
assertIncludes(baselineTypes, 'readonly phase32CleanupComplete: true;', 'baseline must require Phase 32 cleanup complete');
assertIncludes(baselineTypes, 'readonly activationStepsAllowed: 0;', 'baseline must allow zero activation steps');
assertIncludes(baselineTypes, 'readonly phase33OperationalActivationAllowed: false;', 'baseline must disallow operational activation');
assertIncludes(baselineTypes, 'readonly bridgeActivationAllowed: false;', 'baseline must disallow bridge activation');
assertIncludes(baselineTypes, 'readonly safeToRunOperationalBridge: false;', 'baseline must mark operational bridge unsafe');
assertIncludes(baselineTypes, 'readonly discoveryActivationAllowed: false;', 'baseline must disallow discovery activation');
assertIncludes(baselineTypes, 'readonly pairingActivationAllowed: false;', 'baseline must disallow pairing activation');
assertIncludes(baselineTypes, 'readonly transportActivationAllowed: false;', 'baseline must disallow transport activation');
assertIncludes(baselineTypes, 'readonly queueExecutionAllowed: false;', 'baseline must disallow queue execution');
assertIncludes(baselineTypes, 'readonly inboxExecutionAllowed: false;', 'baseline must disallow inbox execution');
assertIncludes(baselineTypes, 'readonly persistenceAllowed: false;', 'baseline must disallow persistence');
assertIncludes(baselineTypes, 'readonly inventoryMutationAllowed: false;', 'baseline must disallow Inventory mutation');
assertIncludes(baselineTypes, 'readonly scanOpsMutationAllowed: false;', 'baseline must disallow ScanOps mutation');
assertIncludes(baselineTypes, 'readonly nextAllowedStep: "phase-33-a2-scope-map";', 'baseline must point to A2 scope map');

assertIncludes(baseline, 'createBridgePhase33GateBaseline', 'baseline factory must exist');
assertIncludes(baseline, 'createBridgePhase32CleanupReport()', 'baseline must build on Phase 32 cleanup report');
assertIncludes(baseline, 'phase: "33.A1"', 'baseline must return Phase 33 A1');
assertIncludes(baseline, 'status: "baseline-established-no-activation"', 'baseline must return no-activation status');
assertIncludes(baseline, 'phase33GateOpened: true', 'baseline must open Phase 33 gate');
assertIncludes(baseline, 'phase33OperationalActivationAllowed: false', 'baseline must disallow operational activation');
assertIncludes(baseline, 'activationStepsAllowed: 0', 'baseline must allow zero activation steps');
assertIncludes(baseline, 'nextAllowedStep: "phase-33-a2-scope-map"', 'baseline must point to A2 scope map');
assertIncludes(baseline, 'does not allow operational bridge activation', 'baseline reason must state no activation');

assertIncludes(cleanupReport, 'phase: "32.CLEANUP"', 'baseline must build on Phase 32 cleanup');
assertIncludes(cleanupReport, 'phase32Closed: true', 'cleanup report must keep Phase 32 closed');
assertIncludes(cleanupReport, 'safeToRunOperationalBridge: false', 'cleanup report must keep operational bridge unsafe');

for (const forbidden of [
  'phase33OperationalActivationAllowed: true',
  'bridgeActivationAllowed: true',
  'safeToRunOperationalBridge: true',
  'discoveryActivationAllowed: true',
  'pairingActivationAllowed: true',
  'transportActivationAllowed: true',
  'queueExecutionAllowed: true',
  'inboxExecutionAllowed: true',
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

console.log('ScanOps bridge Phase 33 A1 validates gate baseline is planning-only and keeps bridge activation blocked.');
