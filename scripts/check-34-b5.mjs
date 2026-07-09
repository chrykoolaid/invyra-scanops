import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase34/bridgePhase34B5.ts', 'utf8');

const requiredMarkers = [
  '34.B5',
  'operator-status-contract-planning-read-only',
  '34-B — Bridge Contracts',
  'planningOnly: true',
  'operatorStatusContractOnly: true',
  'readinessDescriptorOnly: true',
  'implementationWorkAllowed: false',
  'runtimeWorkAllowed: false',
  'transportActivationAllowed: false',
  'fixtureExecutionAllowed: false',
  'persistenceAllowed: false',
  'queueProcessingAllowed: false',
  'inventoryMutationAllowed: false',
  'scanOpsMutationAllowed: false',
  'plannedStatusFields',
  'statusContractRules',
  'statusMayNotTriggerRuntime: true',
  'statusMayNotOpenTransport: true',
  'statusMayNotApplyInventoryChanges: true',
  'successLanguageMustNotImplyInventoryMutation: true',
  'inventoryDesktopOwnsSystemOfRecordStatus: true',
  'operatorStatusContractPlanningDefined: true',
  'safeToProceedToPhase34B6Planning: true',
  'safeToBeginPhase34ImplementationNow: false',
  'noMutationIntroduced: true',
  'phase-34-b6-inventory-boundary-contract-planning',
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

console.log('Phase 34 B5 check passed.');
