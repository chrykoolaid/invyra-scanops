import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase34/bridgePhase34A7.ts', 'utf8');

const requiredMarkers = [
  '34.A7',
  'operator-status-boundary-planning-read-only',
  '34-A — Planning & Governance',
  'planningOnly: true',
  'operatorStatusBoundaryOnly: true',
  'readinessDescriptorOnly: true',
  'implementationWorkAllowed: false',
  'runtimeWorkAllowed: false',
  'transportActivationAllowed: false',
  'fixtureExecutionAllowed: false',
  'persistenceAllowed: false',
  'queueProcessingAllowed: false',
  'inventoryMutationAllowed: false',
  'scanOpsMutationAllowed: false',
  'plannedOperatorStatuses',
  'operatorStatusGuardrails',
  'statusMayNotTriggerRuntime: true',
  'statusMayNotOpenTransport: true',
  'statusMayNotExecuteFixtures: true',
  'statusMayNotApplyInventoryChanges: true',
  'operatorSafetyRequirements',
  'plain-language-status-labels',
  'no-ambiguous-sync-success-language',
  'operatorStatusBoundaryPlanningDefined: true',
  'roadmapSectionConfirmed: true',
  'safeToProceedToPhase34A8Planning: true',
  'safeToBeginPhase34ImplementationNow: false',
  'safeToApplyInventoryChangesNow: false',
  'noMutationIntroduced: true',
  'phase-34-a8-failure-recovery-boundary-planning',
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

console.log('Phase 34 A7 check passed.');
