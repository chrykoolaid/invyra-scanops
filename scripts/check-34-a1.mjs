import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase34/bridgePhase34A1.ts', 'utf8');

const requiredMarkers = [
  '34.A1',
  'phase-34-planning-opening-read-only',
  'phase34PlanningOnly: true',
  'readinessDescriptorOnly: true',
  'implementationWorkAllowed: false',
  'runtimeWorkAllowed: false',
  'transportActivationAllowed: false',
  'fixtureExecutionAllowed: false',
  'persistenceAllowed: false',
  'queueProcessingAllowed: false',
  'phase33FormallyClosed: true',
  'phase33CCompleteThroughC5: true',
  'phase34PlanningAuthorizedByC5: true',
  'phase34ImplementationAuthorizedNow: false',
  'liveBridgeActivation: false',
  'transportActivation: false',
  'fixtureExecution: false',
  'persistence: false',
  'queueProcessing: false',
  'inventoryMutation: false',
  'scanOpsMutation: false',
  'phase34PlanningOpened: true',
  'phase34PlanningOnlyConfirmed: true',
  'safeToProceedToPhase34A2Planning: true',
  'safeToBeginPhase34ImplementationNow: false',
  'phase-34-a2-planning-readiness-review',
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

console.log('Phase 34 A1 check passed.');
