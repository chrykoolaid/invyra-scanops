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

const cleanupTypes = read('src/bridge/contracts/bridgePhase32CleanupReportTypes.ts');
const cleanupReport = read('src/bridge/contracts/bridgePhase32CleanupReport.ts');
const gateDecision = read('src/bridge/contracts/bridgePhase32NextGateDecision.ts');
const contractsIndex = read('src/bridge/contracts/index.ts');
const packageJson = read('package.json');

assertIncludes(cleanupTypes, 'export type BridgePhase32CleanupReportPhase = "32.CLEANUP";', 'cleanup report must identify Phase 32 cleanup');
assertIncludes(cleanupTypes, 'complete-no-activation', 'cleanup status must complete without activation');
assertIncludes(cleanupTypes, 'readonly mergedExternalSurfaceCount: 5;', 'cleanup totals must acknowledge five merged external surfaces');
assertIncludes(cleanupTypes, 'readonly pendingExternalDraftSurfaceCount: 0;', 'cleanup totals must keep pending draft count at zero');
assertIncludes(cleanupTypes, 'readonly packageRegistrationChangesApplied: true;', 'cleanup totals must mark package registration applied');
assertIncludes(cleanupTypes, 'readonly openPullRequestsAtCleanup: 0;', 'cleanup totals must record zero open pull requests');
assertIncludes(cleanupTypes, 'readonly phase32ExportsConsistent: true;', 'cleanup report must type exports consistent');
assertIncludes(cleanupTypes, 'readonly packageValidationScriptsRegistered: true;', 'cleanup report must type validation scripts registered');
assertIncludes(cleanupTypes, 'readonly phase32Closed: true;', 'cleanup report must type Phase 32 closed');
assertIncludes(cleanupTypes, 'readonly phase32RuntimeStillInactive: true;', 'cleanup report must keep Phase 32 runtime inactive');
assertIncludes(cleanupTypes, 'readonly phase32ReadyForActivation: false;', 'cleanup report must keep Phase 32 not ready for activation');
assertIncludes(cleanupTypes, 'readonly bridgeActivationAllowed: false;', 'cleanup report must keep bridge activation disallowed');
assertIncludes(cleanupTypes, 'readonly safeToRunOperationalBridge: false;', 'cleanup report must keep operational bridge unsafe');
assertIncludes(cleanupTypes, 'readonly phase33GateRequiresSeparateDecision: true;', 'cleanup report must require separate Phase 33 decision');

assertIncludes(cleanupReport, 'createBridgePhase32CleanupReport', 'cleanup report factory must exist');
assertIncludes(cleanupReport, 'createBridgePhase32NextGateDecision()', 'cleanup report must build on C10 next gate decision');
assertIncludes(cleanupReport, 'phase: "32.CLEANUP"', 'cleanup report must return cleanup phase');
assertIncludes(cleanupReport, 'status: "complete-no-activation"', 'cleanup report must return no-activation status');
assertIncludes(cleanupReport, 'packageRegistrationChangesApplied: true', 'cleanup report must mark package registration applied');
assertIncludes(cleanupReport, 'openPullRequestsAtCleanup: 0', 'cleanup report must record zero open pull requests');
assertIncludes(cleanupReport, 'phase32ExportsConsistent: true', 'cleanup report must mark exports consistent');
assertIncludes(cleanupReport, 'packageValidationScriptsRegistered: true', 'cleanup report must mark validation scripts registered');
assertIncludes(cleanupReport, 'phase32Closed: true', 'cleanup report must keep Phase 32 closed');
assertIncludes(cleanupReport, 'phase32RuntimeStillInactive: true', 'cleanup report must keep runtime inactive');
assertIncludes(cleanupReport, 'phase32ReadyForActivation: false', 'cleanup report must keep Phase 32 not ready for activation');
assertIncludes(cleanupReport, 'bridgeActivationAllowed: false', 'cleanup report must keep bridge activation disallowed');
assertIncludes(cleanupReport, 'safeToRunOperationalBridge: false', 'cleanup report must keep operational bridge unsafe');
assertIncludes(cleanupReport, 'phase33GateRequiresSeparateDecision: true', 'cleanup report must require a separate Phase 33 gate');

for (const expectedExport of [
  'createBridgePhase32ValidationManifest',
  'createBridgePhase32ClosureSnapshot',
  'createBridgePhase32NextGateDecision',
  'createBridgePhase32CleanupReport',
  'BridgePhase32ValidationManifest',
  'BridgePhase32ClosureSnapshot',
  'BridgePhase32NextGateDecision',
  'BridgePhase32CleanupReport',
]) {
  assertIncludes(contractsIndex, expectedExport, `contracts index must export ${expectedExport}`);
}

for (const expectedScript of [
  'validate:scanops-bridge-runtime-gate-snapshot',
  'validate:scanops-bridge-feature-gate-accessors',
  'validate:scanops-bridge-runtime-capability-guard',
  'validate:scanops-bridge-runtime-safety-report',
  'validate:scanops-bridge-discovery-contract-skeleton',
  'validate:scanops-bridge-qr-pairing-contract-skeleton',
  'validate:scanops-bridge-trusted-device-registry-contract',
  'validate:scanops-bridge-transport-contract-skeleton',
  'validate:scanops-bridge-outbound-queue-contract-skeleton',
  'validate:scanops-bridge-inbound-inbox-contract-skeleton',
  'validate:scanops-bridge-receipt-contract-skeleton',
  'validate:scanops-bridge-acknowledgement-contract-skeleton',
  'validate:scanops-bridge-diagnostics-contract-skeleton',
  'validate:scanops-bridge-recovery-contract-skeleton',
  'validate:scanops-bridge-contract-registry-snapshot',
  'validate:scanops-bridge-contract-registry-accessors',
  'validate:scanops-bridge-contract-registry-index',
  'validate:scanops-bridge-contract-registry-readiness-report',
  'validate:scanops-bridge-contract-registry-readiness-index',
  'validate:scanops-bridge-manual-sync-boundary-report',
  'validate:scanops-bridge-boundary-index',
  'validate:scanops-bridge-phase-32-validation-manifest',
  'validate:scanops-bridge-phase-32-closure-snapshot',
  'validate:scanops-bridge-phase-32-next-gate-decision',
  'validate:scanops-bridge-phase-32-cleanup-report',
]) {
  assertIncludes(packageJson, expectedScript, `package.json must register ${expectedScript}`);
}

assertIncludes(gateDecision, 'phase: "32.C10"', 'cleanup must build on C10 gate decision');
assertIncludes(gateDecision, 'phase32Closed: true', 'C10 gate decision must keep Phase 32 closed');
assertIncludes(gateDecision, 'bridgeActivationAllowed: false', 'C10 gate decision must keep bridge activation disallowed');
assertIncludes(gateDecision, 'safeToRunOperationalBridge: false', 'C10 gate decision must keep operational bridge unsafe');

for (const forbidden of [
  'phase32ReadyForActivation: true',
  'bridgeActivationAllowed: true',
  'safeToRunOperationalBridge: true',
  'phase33GateRequiresSeparateDecision: false',
]) {
  assertNotIncludes(cleanupTypes, forbidden, `cleanup report types must not contain ${forbidden}`);
  assertNotIncludes(cleanupReport, forbidden, `cleanup report implementation must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 32 cleanup validates exports and validation scripts are aligned while bridge activation remains blocked.');
