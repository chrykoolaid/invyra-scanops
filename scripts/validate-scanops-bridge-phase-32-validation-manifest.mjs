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

const manifestTypes = read('src/bridge/contracts/bridgePhase32ValidationManifestTypes.ts');
const manifest = read('src/bridge/contracts/bridgePhase32ValidationManifest.ts');
const boundaryReport = read('src/bridge/contracts/bridgeManualSyncBoundaryReport.ts');

assertIncludes(manifestTypes, 'export type BridgePhase32ValidationManifestPhase = "32.C8";', 'manifest must identify Phase 32 C8');
assertIncludes(manifestTypes, 'readonly externalSurfaceCount: 3;', 'manifest totals must type three external bridge surfaces');
assertIncludes(manifestTypes, 'readonly packageRegistrationChangesApplied: false;', 'manifest must defer package registration changes');
assertIncludes(manifestTypes, 'readonly phase32RuntimeStillInactive: true;', 'manifest must type Phase 32 runtime inactive');
assertIncludes(manifestTypes, 'readonly phase32ReadyForActivation: false;', 'manifest must type Phase 32 not ready for activation');
assertIncludes(manifestTypes, 'readonly bridgeActivationAllowed: false;', 'manifest must type bridge activation disallowed');
assertIncludes(manifestTypes, 'readonly safeToRunOperationalBridge: false;', 'manifest must type operational bridge unsafe');
assertIncludes(manifestTypes, 'readonly cleanupPassDeferred: true;', 'manifest must defer cleanup pass');

assertIncludes(manifest, 'createBridgePhase32ValidationManifest', 'manifest factory must exist');
assertIncludes(manifest, 'createBridgeManualSyncBoundaryReport()', 'manifest must build on C6 boundary report');
assertIncludes(manifest, 'phase: "32.C8"', 'manifest must return Phase 32 C8');
assertIncludes(manifest, 'validationCount: BRIDGE_PHASE_32_VALIDATION_ENTRIES.length', 'manifest must count validation entries');
assertIncludes(manifest, 'externalSurfaceCount: 3', 'manifest must return three external surfaces');
assertIncludes(manifest, 'packageRegistrationChangesApplied: false', 'manifest must defer package registration changes');
assertIncludes(manifest, 'cleanupPassDeferred: true', 'manifest must defer cleanup pass');
assertIncludes(manifest, 'after C10', 'manifest reason must defer cleanup until after C10');
assertIncludes(manifest, 'phase32RuntimeStillInactive: true', 'manifest must keep Phase 32 runtime inactive');
assertIncludes(manifest, 'phase32ReadyForActivation: false', 'manifest must keep Phase 32 not ready for activation');
assertIncludes(manifest, 'bridgeActivationAllowed: false', 'manifest must keep bridge activation disallowed');
assertIncludes(manifest, 'safeToRunOperationalBridge: false', 'manifest must keep operational bridge unsafe');

for (const expectedScript of [
  'validate-scanops-bridge-runtime-gate-snapshot.mjs',
  'validate-scanops-bridge-feature-gate-accessors.mjs',
  'validate-scanops-bridge-runtime-capability-guard.mjs',
  'validate-scanops-bridge-runtime-safety-report.mjs',
  'validate-scanops-bridge-discovery-contract-skeleton.mjs',
  'validate-scanops-bridge-qr-pairing-contract-skeleton.mjs',
  'validate-scanops-bridge-trusted-device-registry-contract.mjs',
  'validate-scanops-bridge-transport-contract-skeleton.mjs',
  'validate-scanops-bridge-outbound-queue-contract-skeleton.mjs',
  'validate-scanops-bridge-inbound-inbox-contract-skeleton.mjs',
  'validate-scanops-bridge-receipt-contract-skeleton.mjs',
  'validate-scanops-bridge-acknowledgement-contract-skeleton.mjs',
  'validate-scanops-bridge-diagnostics-contract-skeleton.mjs',
  'validate-scanops-bridge-recovery-contract-skeleton.mjs',
  'validate-scanops-bridge-contract-registry-snapshot.mjs',
  'validate-scanops-bridge-contract-registry-accessors.mjs',
  'validate-scanops-bridge-contract-registry-index.mjs',
  'validate-scanops-bridge-contract-registry-readiness-report.mjs',
  'validate-scanops-bridge-contract-registry-readiness-index.mjs',
  'validate-scanops-bridge-manual-sync-boundary-report.mjs',
  'validate-scanops-bridge-boundary-index.mjs',
]) {
  assertIncludes(manifest, expectedScript, `manifest must include ${expectedScript}`);
}

for (const expectedSurface of [
  'Manual sync execution layer',
  'Sync control surface',
  'Receipt application boundary',
]) {
  assertIncludes(manifest, expectedSurface, `manifest must acknowledge ${expectedSurface}`);
}

assertIncludes(boundaryReport, 'phase: "32.C6"', 'manifest must build on C6 boundary report');
assertIncludes(boundaryReport, 'phase32BoundaryAcknowledged: true', 'C6 boundary report must remain acknowledged');

for (const forbidden of [
  'packageRegistrationChangesApplied: true',
  'cleanupPassDeferred: false',
  'phase32ReadyForActivation: true',
  'bridgeActivationAllowed: true',
  'safeToRunOperationalBridge: true',
]) {
  assertNotIncludes(manifestTypes, forbidden, `manifest types must not contain ${forbidden}`);
  assertNotIncludes(manifest, forbidden, `manifest implementation must not contain ${forbidden}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 32 C8 validates the consolidated validation manifest remains read-only and defers cleanup until after C10.');
