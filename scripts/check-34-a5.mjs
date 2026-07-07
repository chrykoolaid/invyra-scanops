import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase34/bridgePhase34A5.ts', 'utf8');

const requiredMarkers = [
  '34.A5',
  'persistence-queue-contract-planning-read-only',
  '34-A — Planning & Governance',
  'planningOnly: true',
  'persistenceQueueContractOnly: true',
  'readinessDescriptorOnly: true',
  'implementationWorkAllowed: false',
  'runtimeWorkAllowed: false',
  'transportActivationAllowed: false',
  'fixtureExecutionAllowed: false',
  'persistenceAllowed: false',
  'queueProcessingAllowed: false',
  'inboxProcessingAllowed: false',
  'plannedPersistenceBoundaries',
  'plannedQueueBoundaries',
  'persistenceImplementationAllowedNow: false',
  'queueImplementationAllowedNow: false',
  'automaticReplayAllowedNow: false',
  'durableWritesAllowedNow: false',
  'inventoryMutationAllowedFromQueue: false',
  'scanOpsMutationAllowedFromQueue: false',
  'persistenceQueueContractPlanningDefined: true',
  'roadmapSectionConfirmed: true',
  'safeToProceedToPhase34A6Planning: true',
  'safeToBeginPhase34ImplementationNow: false',
  'safeToEnablePersistenceNow: false',
  'safeToProcessQueuesNow: false',
  'noPersistenceBehaviorIntroduced: true',
  'noQueueProcessingIntroduced: true',
  'noMutationIntroduced: true',
  'phase-34-a6-inventory-boundary-planning',
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

console.log('Phase 34 A5 check passed.');
