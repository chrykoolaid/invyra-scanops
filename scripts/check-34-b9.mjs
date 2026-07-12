import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase34/bridgePhase34B9.ts', 'utf8');

const requiredMarkers = [
  '34.B9',
  'contract-compatibility-planning-read-only',
  '34-B — Bridge Contracts',
  'planningOnly: true',
  'contractCompatibilityOnly: true',
  'readinessDescriptorOnly: true',
  'implementationWorkAllowed: false',
  'runtimeWorkAllowed: false',
  'transportActivationAllowed: false',
  'fixtureExecutionAllowed: false',
  'persistenceAllowed: false',
  'queueProcessingAllowed: false',
  'inventoryMutationAllowed: false',
  'scanOpsMutationAllowed: false',
  'compatibilityDimensions',
  'schema-version',
  'compatibilityRules',
  'futureContractsMustDeclareSchemaVersion: true',
  'missingRequiredFieldsRequireFutureRejection: true',
  'incompatibleMajorVersionRequiresFutureRejection: true',
  'ownershipConfirmation',
  'inventoryDesktopOwnsAcceptanceCompatibilityDecision: true',
  'contractCompatibilityPlanningDefined: true',
  'safeToProceedToPhase34B10Planning: true',
  'safeToBeginPhase34ImplementationNow: false',
  'noMutationIntroduced: true',
  'phase-34-b10-bridge-contracts-closeout',
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

console.log('Phase 34 B9 check passed.');
