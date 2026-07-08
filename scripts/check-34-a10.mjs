import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase34/bridgePhase34A10.ts', 'utf8');

const requiredMarkers = [
  '34.A10',
  'planning-governance-closeout-read-only',
  '34-A — Planning & Governance',
  'planningCloseoutOnly: true',
  'governanceCloseoutOnly: true',
  'readinessDescriptorOnly: true',
  'implementationWorkAllowed: false',
  'runtimeWorkAllowed: false',
  'transportActivationAllowed: false',
  'fixtureExecutionAllowed: false',
  'persistenceAllowed: false',
  'queueProcessingAllowed: false',
  'inventoryMutationAllowed: false',
  'scanOpsMutationAllowed: false',
  'completedPlanningAreas',
  'governanceCloseoutConfirmation',
  'phase34APlanningGovernanceClosed: true',
  'implementationDeferredToFutureScopedPhase: true',
  'liveActivationStillForbidden: true',
  'nextRoadmapSectionIsBridgeContracts: true',
  'implementationStillBlocked',
  'planningGovernanceCloseoutDefined: true',
  'phase34APlanningGovernanceComplete: true',
  'safeToProceedToPhase34BBridgeContractsPlanning: true',
  'safeToProceedToImplementationNow: false',
  'safeToBeginUnscopedImplementationNow: false',
  'safeToExecuteFixturesNow: false',
  'safeToActivateTransportNow: false',
  'safeToEnablePersistenceNow: false',
  'safeToProcessQueuesNow: false',
  'noMutationIntroduced: true',
  'phase-34-b-bridge-contracts-planning',
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

console.log('Phase 34 A10 check passed.');
