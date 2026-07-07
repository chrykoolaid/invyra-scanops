import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase34/bridgePhase34A6.ts', 'utf8');

const requiredMarkers = [
  '34.A6',
  'inventory-boundary-planning-read-only',
  '34-A — Planning & Governance',
  'planningOnly: true',
  'inventoryBoundaryOnly: true',
  'readinessDescriptorOnly: true',
  'implementationWorkAllowed: false',
  'runtimeWorkAllowed: false',
  'transportActivationAllowed: false',
  'fixtureExecutionAllowed: false',
  'persistenceAllowed: false',
  'queueProcessingAllowed: false',
  'inventoryMutationAllowed: false',
  'scanOpsMutationAllowed: false',
  'plannedInventoryBoundaries',
  'inventoryAuthorityConfirmation',
  'inventoryDesktopOwnsSystemOfRecord: true',
  'inventoryDesktopOwnsMutationAuthority: true',
  'scanOpsDoesNotOwnInventoryAuthority: true',
  'forbiddenScanOpsBoundaryActions',
  'direct-stock-write',
  'automatic-inventory-apply',
  'inventoryBoundaryPlanningDefined: true',
  'roadmapSectionConfirmed: true',
  'safeToProceedToPhase34A7Planning: true',
  'safeToBeginPhase34ImplementationNow: false',
  'safeToApplyInventoryChangesNow: false',
  'noMutationIntroduced: true',
  'phase-34-a7-operator-status-boundary-planning',
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

console.log('Phase 34 A6 check passed.');
