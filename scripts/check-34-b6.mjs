import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase34/bridgePhase34B6.ts', 'utf8');

const requiredMarkers = [
  '34.B6',
  'inventory-boundary-contract-planning-read-only',
  '34-B — Bridge Contracts',
  'planningOnly: true',
  'inventoryBoundaryContractOnly: true',
  'readinessDescriptorOnly: true',
  'implementationWorkAllowed: false',
  'runtimeWorkAllowed: false',
  'transportActivationAllowed: false',
  'fixtureExecutionAllowed: false',
  'persistenceAllowed: false',
  'queueProcessingAllowed: false',
  'inventoryMutationAllowed: false',
  'scanOpsMutationAllowed: false',
  'plannedBoundaryFields',
  'boundaryRules',
  'inventoryDesktopOwnsAcceptanceDecision: true',
  'inventoryDesktopOwnsRejectionDecision: true',
  'inventoryDesktopOwnsApprovalDecision: true',
  'scanOpsMaySubmitOperationalEvidenceOnly: true',
  'scanOpsMayNotApplyInventoryChanges: true',
  'inventoryBoundaryContractPlanningDefined: true',
  'safeToProceedToPhase34B7Planning: true',
  'safeToBeginPhase34ImplementationNow: false',
  'noMutationIntroduced: true',
  'phase-34-b7-failure-recovery-contract-planning',
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

console.log('Phase 34 B6 check passed.');
