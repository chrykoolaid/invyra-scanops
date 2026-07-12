import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase34/bridgePhase34B8.ts', 'utf8');

const requiredMarkers = [
  '34.B8',
  'validation-result-contract-planning-read-only',
  '34-B — Bridge Contracts',
  'planningOnly: true',
  'validationResultContractOnly: true',
  'readinessDescriptorOnly: true',
  'implementationWorkAllowed: false',
  'runtimeWorkAllowed: false',
  'transportActivationAllowed: false',
  'fixtureExecutionAllowed: false',
  'persistenceAllowed: false',
  'queueProcessingAllowed: false',
  'inventoryMutationAllowed: false',
  'scanOpsMutationAllowed: false',
  'plannedValidationResultFields',
  'validationState',
  'traceId',
  'validationResultRules',
  'resultMayNotApplyInventoryChanges: true',
  'resultMustNotClaimAppliedWithoutInventoryConfirmation: true',
  'ownershipConfirmation',
  'inventoryDesktopOwnsFinalAcceptanceDecision: true',
  'validationResultContractPlanningDefined: true',
  'safeToProceedToPhase34B9Planning: true',
  'safeToBeginPhase34ImplementationNow: false',
  'noMutationIntroduced: true',
  'phase-34-b9-contract-compatibility-planning',
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

console.log('Phase 34 B8 check passed.');
