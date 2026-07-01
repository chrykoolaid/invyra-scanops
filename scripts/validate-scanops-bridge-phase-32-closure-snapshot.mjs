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

const closureTypes = read('src/bridge/contracts/bridgePhase32ClosureSnapshotTypes.ts');
const closureSnapshot = read('src/bridge/contracts/bridgePhase32ClosureSnapshot.ts');
const validationManifest = read('src/bridge/contracts/bridgePhase32ValidationManifest.ts');

assertIncludes(closureTypes, 'export type BridgePhase32ClosureSnapshotPhase = "32.C9";', 'closure snapshot must identify Phase 32 C9');
assertIncludes(closureTypes, 'accepted-for-c10-gate-review', 'closure status must route to C10 gate review');
assertIncludes(closureTypes, 'readonly manifestExternalSurfaceCount: 3;', 'closure totals must preserve C8 manifest external surface count');
assertIncludes(closureTypes, 'readonly currentExternalSurfaceCount: 4;', 'closure totals must acknowledge current external surface count');
assertIncludes(closureTypes, 'readonly packageRegistrationChangesApplied: false;', 'closure snapshot must keep package registration unchanged');
assertIncludes(closureTypes, 'readonly phase32RuntimeStillInactive: true;', 'closure snapshot must type Phase 32 runtime inactive');
assertIncludes(closureTypes, 'readonly phase32ReadyForActivation: false;', 'closure snapshot must type Phase 32 not ready for activation');
assertIncludes(closureTypes, 'readonly bridgeActivationAllowed: false;', 'closure snapshot must type bridge activation disallowed');
assertIncludes(closureTypes, 'readonly safeToRunOperationalBridge: false;', 'closure snapshot must type operational bridge unsafe');
assertIncludes(closureTypes, 'readonly c10GateReviewRequired: true;', 'closure snapshot must require C10 gate review');
assertIncludes(closureTypes, 'readonly cleanupPassDeferred: true;', 'closure snapshot must defer cleanup pass');
assertIncludes(closureTypes, 'readonly closureAccepted: true;', 'closure snapshot must mark closure accepted');

assertIncludes(closureSnapshot, 'createBridgePhase32ClosureSnapshot', 'closure snapshot factory must exist');
assertIncludes(closureSnapshot, 'createBridgePhase32ValidationManifest()', 'closure snapshot must build on C8 validation manifest');
assertIncludes(closureSnapshot, 'phase: "32.C9"', 'closure snapshot must return Phase 32 C9');
assertIncludes(closureSnapshot, 'status: "accepted-for-c10-gate-review"', 'closure snapshot status must route to C10 gate review');
assertIncludes(closureSnapshot, 'manifestExternalSurfaceCount: 3', 'closure snapshot must preserve C8 external surface count');
assertIncludes(closureSnapshot, 'currentExternalSurfaceCount: 4', 'closure snapshot must acknowledge Bridge Phase 11 as current external surface');
assertIncludes(closureSnapshot, 'packageRegistrationChangesApplied: false', 'closure snapshot must keep package registration unchanged');
assertIncludes(closureSnapshot, 'phase32RuntimeStillInactive: true', 'closure snapshot must keep Phase 32 runtime inactive');
assertIncludes(closureSnapshot, 'phase32ReadyForActivation: false', 'closure snapshot must keep Phase 32 not ready for activation');
assertIncludes(closureSnapshot, 'bridgeActivationAllowed: false', 'closure snapshot must keep bridge activation disallowed');
assertIncludes(closureSnapshot, 'safeToRunOperationalBridge: false', 'closure snapshot must keep operational bridge unsafe');
assertIncludes(closureSnapshot, 'c10GateReviewRequired: true', 'closure snapshot must require C10 gate review');
assertIncludes(closureSnapshot, 'cleanupPassDeferred: true', 'closure snapshot must defer cleanup pass');
assertIncludes(closureSnapshot, 'closureAccepted: true', 'closure snapshot must accept closure');

for (const expectedSurface of [
  'Manual sync execution layer',
  'Sync control surface',
  'Receipt application boundary',
  'Receipt review decision surface',
]) {
  assertIncludes(closureSnapshot, expectedSurface, `closure snapshot must acknowledge ${expectedSurface}`);
}

assertIncludes(validationManifest, 'phase: "32.C8"', 'closure snapshot must build on C8 validation manifest');
assertIncludes(validationManifest, 'cleanupPassDeferred: true', 'C8 validation manifest must keep cleanup deferred');
assertIncludes(validationManifest, 'packageRegistrationChangesApplied: false', 'C8 validation manifest must keep package registration unchanged');

for (const forbidden of [
  'packageRegistrationChangesApplied: true',
  'phase32ReadyForActivation: true',
  'bridgeActivationAllowed: true',
  'safeToRunOperationalBridge: true',
  'c10GateReviewRequired: false',
  'cleanupPassDeferred: false',
  'closureAccepted: false',
]) {
  assertNotIncludes(closureTypes, forbidden, `closure snapshot types must not contain ${forbidden}`);
  assertNotIncludes(closureSnapshot, forbidden, `closure snapshot implementation must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 32 C9 validates closure snapshot is accepted for C10 gate review while Phase 32 remains inactive.');
