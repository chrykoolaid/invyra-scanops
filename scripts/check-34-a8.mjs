import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase34/bridgePhase34A8.ts', 'utf8');

const requiredMarkers = [
  '34.A8',
  'failure-recovery-boundary-planning-read-only',
  'planningOnly: true',
  'failureRecoveryBoundaryOnly: true',
  'readinessDescriptorOnly: true',
  'implementationWorkAllowed: false',
  'runtimeWorkAllowed: false',
  'transportActivationAllowed: false',
  'fixtureExecutionAllowed: false',
  'persistenceAllowed: false',
  'queueProcessingAllowed: false',
  'plannedFailureBoundaries',
  'recoveryGuardrails',
  'plannedRecoveryActions',
  'automaticReplayAllowedNow: false',
  'backgroundRetryAllowedNow: false',
  'failureRecoveryBoundaryPlanningDefined: true',
  'safeToProceedToPhase34A9Planning: true',
  'safeToBeginPhase34ImplementationNow: false',
  'safeToActivateTransportNow: false',
  'safeToEnablePersistenceNow: false',
  'safeToProcessQueuesNow: false',
  'noMutationIntroduced: true',
  'phase-34-a9-validation-strategy-planning',
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

console.log('Phase 34 A8 check passed.');
