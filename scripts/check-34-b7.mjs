import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase34/bridgePhase34B7.ts', 'utf8');

const requiredMarkers = [
  '34.B7',
  'failure-recovery-contract-planning-read-only',
  '34-B — Bridge Contracts',
  'planningOnly: true',
  'failureRecoveryContractOnly: true',
  'readinessDescriptorOnly: true',
  'implementationWorkAllowed: false',
  'runtimeWorkAllowed: false',
  'transportActivationAllowed: false',
  'fixtureExecutionAllowed: false',
  'persistenceAllowed: false',
  'queueProcessingAllowed: false',
  'inventoryMutationAllowed: false',
  'scanOpsMutationAllowed: false',
  'plannedFailureStates',
  'recoveryContractRules',
  'failureMustRemainOperatorVisible: true',
  'failureMayNotTriggerAutomaticReplayNow: true',
  'failureMayNotTriggerBackgroundRetryNow: true',
  'failureMayNotApplyInventoryChangesNow: true',
  'inventoryDesktopOwnsRecoveryAcceptance: true',
  'scanOpsMayNotSelfAuthorizeRecoveryMutation: true',
  'failureRecoveryContractPlanningDefined: true',
  'safeToProceedToPhase34B8Planning: true',
  'safeToBeginPhase34ImplementationNow: false',
  'noMutationIntroduced: true',
  'phase-34-b8-validation-result-contract-planning',
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

console.log('Phase 34 B7 check passed.');
