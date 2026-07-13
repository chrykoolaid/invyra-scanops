import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase34/bridgePhase34B10.ts', 'utf8');

const requiredMarkers = [
  '34.B10',
  'bridge-contracts-closeout-read-only',
  '34-B — Bridge Contracts',
  'bridgeContractsCloseoutOnly: true',
  'readinessDescriptorOnly: true',
  'implementationWorkAllowed: false',
  'runtimeWorkAllowed: false',
  'transportActivationAllowed: false',
  'fixtureExecutionAllowed: false',
  'persistenceAllowed: false',
  'queueProcessingAllowed: false',
  'inventoryMutationAllowed: false',
  'scanOpsMutationAllowed: false',
  'completedContractAreas',
  'receipt-envelope-contract',
  'contract-compatibility',
  'phase34BBridgeContractsComplete: true',
  'bridgeContractsRemainInactive: true',
  'implementationRemainsDeferred: true',
  'nextRoadmapSectionIsCrossRepositoryConsistency: true',
  'bridgeContractsCloseoutDefined: true',
  'phase34BComplete: true',
  'safeToProceedToPhase34CPlanning: true',
  'safeToBeginPhase34ImplementationNow: false',
  'noMutationIntroduced: true',
  'phase-34-c-cross-repository-consistency-planning',
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

console.log('Phase 34 B10 check passed.');
