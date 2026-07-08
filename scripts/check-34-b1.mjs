import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase34/bridgePhase34B1.ts', 'utf8');

const requiredMarkers = [
  '34.B1',
  'bridge-contracts-planning-opening-read-only',
  '34-B — Bridge Contracts',
  'planningOnly: true',
  'bridgeContractsOnly: true',
  'readinessDescriptorOnly: true',
  'implementationWorkAllowed: false',
  'runtimeWorkAllowed: false',
  'transportActivationAllowed: false',
  'fixtureExecutionAllowed: false',
  'persistenceAllowed: false',
  'queueProcessingAllowed: false',
  'inventoryMutationAllowed: false',
  'scanOpsMutationAllowed: false',
  'plannedContractFamilies',
  'receipt-envelope-contract',
  'idempotency-contract',
  'contractOwnershipConfirmation',
  'inventoryDesktopOwnsSystemOfRecordContract: true',
  'bridgeContractsDoNotActivateTransport: true',
  'bridgeContractsDoNotEnablePersistence: true',
  'versioningExpectations',
  'schemaVersionRequiredInFutureContracts: true',
  'bridgeContractsPlanningOpened: true',
  'roadmapSectionConfirmed: true',
  'safeToProceedToPhase34B2Planning: true',
  'safeToBeginPhase34ImplementationNow: false',
  'noMutationIntroduced: true',
  'phase-34-b2-receipt-envelope-contract-planning',
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

console.log('Phase 34 B1 check passed.');
