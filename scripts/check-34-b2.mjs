import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase34/bridgePhase34B2.ts', 'utf8');

const requiredMarkers = [
  '34.B2',
  'receipt-envelope-contract-planning-read-only',
  '34-B — Bridge Contracts',
  'planningOnly: true',
  'receiptEnvelopeContractOnly: true',
  'readinessDescriptorOnly: true',
  'implementationWorkAllowed: false',
  'runtimeWorkAllowed: false',
  'transportActivationAllowed: false',
  'fixtureExecutionAllowed: false',
  'persistenceAllowed: false',
  'queueProcessingAllowed: false',
  'inventoryMutationAllowed: false',
  'scanOpsMutationAllowed: false',
  'plannedEnvelopeFields',
  'schemaVersion',
  'idempotencyKey',
  'payloadHash',
  'envelopeOwnershipConfirmation',
  'inventoryDesktopOwnsEnvelopeAcceptanceRules: true',
  'envelopeDoesNotApplyInventoryChangesByItself: true',
  'validationExpectations',
  'invalidEnvelopeMustBeRejectedInFutureScope: true',
  'receiptEnvelopeContractPlanningDefined: true',
  'safeToProceedToPhase34B3Planning: true',
  'safeToBeginPhase34ImplementationNow: false',
  'noMutationIntroduced: true',
  'phase-34-b3-idempotency-contract-planning',
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

console.log('Phase 34 B2 check passed.');
