import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33C3.ts', 'utf8');

const requiredMarkers = [
  '33.C3',
  'final-architecture-contract-consistency-review-read-only',
  'finalArchitectureReviewOnly: true',
  'contractConsistencyReviewOnly: true',
  'implementationWorkAllowed: false',
  'featureExpansionAllowed: false',
  'inventoryDesktopSystemOfRecordConfirmed: true',
  'scanOpsHandheldOperationalLayerConfirmed: true',
  'bridgeRemainsInactiveConfirmed: true',
  'inventoryOwnsMutationAuthority: true',
  'scanOpsDoesNotOwnInventoryState: true',
  'noRuntimeContractActivation: true',
  'noTransportContractActivation: true',
  'noPersistenceContractActivation: true',
  'noQueueContractActivation: true',
  'noInboxContractActivation: true',
  'phase33CSequenceStillLimitedToC5: true',
  'phase34StillDeferredUntilC5Authorization: true',
  'noGuardrailDriftDetected: true',
  'noRuntimeBehaviorIntroduced: true',
  'safeToProceedToC4: true',
  'safeToBeginPhase34ImplementationNow: false',
  'phase-33-c4-phase-34-entry-readiness-review',
];

let ok = true;

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    ok = false;
  }
}

if (!ok) {
  process.exit(1);
}

console.log('C3 check passed.');
