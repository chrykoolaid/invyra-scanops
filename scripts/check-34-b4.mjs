import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase34/bridgePhase34B4.ts', 'utf8');

const requiredMarkers = [
  '34.B4',
  'environment-gate-contract-planning-read-only',
  '34-B — Bridge Contracts',
  'planningOnly: true',
  'environmentGateContractOnly: true',
  'readinessDescriptorOnly: true',
  'implementationWorkAllowed: false',
  'runtimeWorkAllowed: false',
  'transportActivationAllowed: false',
  'fixtureExecutionAllowed: false',
  'persistenceAllowed: false',
  'queueProcessingAllowed: false',
  'inventoryMutationAllowed: false',
  'scanOpsMutationAllowed: false',
  'plannedEnvironmentFields',
  'environmentGateRules',
  'trainingMayNotWriteToLive: true',
  'testMayNotWriteToLive: true',
  'unknownEnvironmentRequiresFutureRejection: true',
  'environmentGateDoesNotApplyInventoryChangesByItself: true',
  'inventoryDesktopOwnsEnvironmentAcceptance: true',
  'scanOpsMayNotOverrideInventoryEnvironment: true',
  'environmentGateContractPlanningDefined: true',
  'safeToProceedToPhase34B5Planning: true',
  'safeToBeginPhase34ImplementationNow: false',
  'noMutationIntroduced: true',
  'phase-34-b5-operator-status-contract-planning',
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

console.log('Phase 34 B4 check passed.');
