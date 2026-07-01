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

const gateTypes = read('src/bridge/contracts/bridgePhase32NextGateDecisionTypes.ts');
const gateDecision = read('src/bridge/contracts/bridgePhase32NextGateDecision.ts');
const closureSnapshot = read('src/bridge/contracts/bridgePhase32ClosureSnapshot.ts');

assertIncludes(gateTypes, 'export type BridgePhase32NextGateDecisionPhase = "32.C10";', 'gate decision must identify Phase 32 C10');
assertIncludes(gateTypes, 'phase-32-cleanup-pass', 'gate decision must route next step to cleanup pass');
assertIncludes(gateTypes, 'closed-cleanup-required-no-activation', 'gate decision outcome must close without activation');
assertIncludes(gateTypes, 'readonly mergedExternalSurfaceCount: 4;', 'gate totals must preserve merged external surface count');
assertIncludes(gateTypes, 'readonly pendingExternalDraftSurfaceCount: 1;', 'gate totals must acknowledge one pending draft surface');
assertIncludes(gateTypes, 'readonly packageRegistrationChangesApplied: false;', 'gate decision must keep package registration unchanged');
assertIncludes(gateTypes, 'readonly phase32Closed: true;', 'gate decision must type Phase 32 closed');
assertIncludes(gateTypes, 'readonly phase32RuntimeStillInactive: true;', 'gate decision must type Phase 32 runtime inactive');
assertIncludes(gateTypes, 'readonly phase32ReadyForActivation: false;', 'gate decision must type Phase 32 not ready for activation');
assertIncludes(gateTypes, 'readonly bridgeActivationAllowed: false;', 'gate decision must type bridge activation disallowed');
assertIncludes(gateTypes, 'readonly safeToRunOperationalBridge: false;', 'gate decision must type operational bridge unsafe');
assertIncludes(gateTypes, 'readonly cleanupPassRequired: true;', 'gate decision must require cleanup pass');
assertIncludes(gateTypes, 'readonly phase33GateBlockedUntilCleanup: true;', 'gate decision must block Phase 33 until cleanup');

assertIncludes(gateDecision, 'createBridgePhase32NextGateDecision', 'gate decision factory must exist');
assertIncludes(gateDecision, 'createBridgePhase32ClosureSnapshot()', 'gate decision must build on C9 closure snapshot');
assertIncludes(gateDecision, 'phase: "32.C10"', 'gate decision must return Phase 32 C10');
assertIncludes(gateDecision, 'outcome: "closed-cleanup-required-no-activation"', 'gate decision outcome must close without activation');
assertIncludes(gateDecision, 'nextAllowedStep: "phase-32-cleanup-pass"', 'gate decision must route next step to cleanup pass');
assertIncludes(gateDecision, 'pullRequest: 199', 'gate decision must acknowledge pending PR 199');
assertIncludes(gateDecision, 'draft: true', 'gate decision must mark pending PR as draft');
assertIncludes(gateDecision, 'merged: false', 'gate decision must mark pending PR as not merged');
assertIncludes(gateDecision, 'mergedExternalSurfaceCount: 4', 'gate decision must preserve merged external surface count');
assertIncludes(gateDecision, 'pendingExternalDraftSurfaceCount: 1', 'gate decision must acknowledge pending draft surface count');
assertIncludes(gateDecision, 'packageRegistrationChangesApplied: false', 'gate decision must keep package registration unchanged');
assertIncludes(gateDecision, 'phase32Closed: true', 'gate decision must close Phase 32');
assertIncludes(gateDecision, 'phase32RuntimeStillInactive: true', 'gate decision must keep Phase 32 runtime inactive');
assertIncludes(gateDecision, 'phase32ReadyForActivation: false', 'gate decision must keep Phase 32 not ready for activation');
assertIncludes(gateDecision, 'bridgeActivationAllowed: false', 'gate decision must keep bridge activation disallowed');
assertIncludes(gateDecision, 'safeToRunOperationalBridge: false', 'gate decision must keep operational bridge unsafe');
assertIncludes(gateDecision, 'cleanupPassRequired: true', 'gate decision must require cleanup pass');
assertIncludes(gateDecision, 'phase33GateBlockedUntilCleanup: true', 'gate decision must block Phase 33 until cleanup');
assertIncludes(gateDecision, 'blocked until the cleanup pass is completed and reviewed', 'gate reason must require cleanup review');

assertIncludes(closureSnapshot, 'phase: "32.C9"', 'gate decision must build on C9 closure snapshot');
assertIncludes(closureSnapshot, 'closureAccepted: true', 'C9 closure snapshot must remain accepted');
assertIncludes(closureSnapshot, 'c10GateReviewRequired: true', 'C9 closure snapshot must require C10 gate review');

for (const forbidden of [
  'packageRegistrationChangesApplied: true',
  'phase32ReadyForActivation: true',
  'bridgeActivationAllowed: true',
  'safeToRunOperationalBridge: true',
  'cleanupPassRequired: false',
  'phase33GateBlockedUntilCleanup: false',
  'merged: true',
]) {
  assertNotIncludes(gateTypes, forbidden, `gate decision types must not contain ${forbidden}`);
  assertNotIncludes(gateDecision, forbidden, `gate decision implementation must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 32 C10 validates next gate decision closes Phase 32 for cleanup only and keeps bridge activation blocked.');
