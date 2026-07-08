import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase34/bridgePhase34A9.ts', 'utf8');

const requiredMarkers = [
  '34.A9',
  'validation-strategy-planning-read-only',
  '34-A — Planning & Governance',
  'planningOnly: true',
  'validationStrategyOnly: true',
  'readinessDescriptorOnly: true',
  'implementationWorkAllowed: false',
  'runtimeWorkAllowed: false',
  'transportActivationAllowed: false',
  'fixtureExecutionAllowed: false',
  'persistenceAllowed: false',
  'queueProcessingAllowed: false',
  'inventoryMutationAllowed: false',
  'scanOpsMutationAllowed: false',
  'plannedValidationAreas',
  'validationGuardrails',
  'validationMayNotExecuteFixtures: true',
  'validationMayNotOpenTransport: true',
  'validationMayNotPersistReceipts: true',
  'validationMayNotDrainQueues: true',
  'plannedValidationOutputs',
  'validationStrategyPlanningDefined: true',
  'roadmapSectionConfirmed: true',
  'safeToProceedToPhase34A10Planning: true',
  'safeToBeginPhase34ImplementationNow: false',
  'noMutationIntroduced: true',
  'phase-34-a10-planning-governance-closeout',
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

console.log('Phase 34 A9 check passed.');
