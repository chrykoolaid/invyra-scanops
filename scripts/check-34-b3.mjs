import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase34/bridgePhase34B3.ts', 'utf8');

const requiredMarkers = [
  '34.B3',
  'idempotency-contract-planning-read-only',
  '34-B — Bridge Contracts',
  'planningOnly: true',
  'idempotencyContractOnly: true',
  'readinessDescriptorOnly: true',
  'implementationWorkAllowed: false',
  'runtimeWorkAllowed: false',
  'transportActivationAllowed: false',
  'fixtureExecutionAllowed: false',
  'persistenceAllowed: false',
  'queueProcessingAllowed: false',
  'inventoryMutationAllowed: false',
  'scanOpsMutationAllowed: false',
  'plannedIdempotencyFields',
  'idempotencyKey',
  'payloadHash',
  'idempotencyOwnershipConfirmation',
  'inventoryDesktopOwnsDuplicateDecision: true',
  'inventoryDesktopOwnsConflictDecision: true',
  'duplicateHandlingExpectations',
  'sameKeySamePayloadHashIsFutureDuplicateCandidate: true',
  'sameKeyDifferentPayloadHashIsFutureConflictCandidate: true',
  'idempotencyContractPlanningDefined: true',
  'safeToProceedToPhase34B4Planning: true',
  'safeToBeginPhase34ImplementationNow: false',
  'noMutationIntroduced: true',
  'phase-34-b4-environment-gate-contract-planning',
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

console.log('Phase 34 B3 check passed.');
