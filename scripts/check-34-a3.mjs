import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase34/bridgePhase34A3.ts', 'utf8');

const requiredMarkers = [
  '34.A3',
  'controlled-fixture-catalog-planning-read-only',
  'planningOnly: true',
  'fixtureCatalogOnly: true',
  'readinessDescriptorOnly: true',
  'implementationWorkAllowed: false',
  'runtimeWorkAllowed: false',
  'fixtureExecutionAllowed: false',
  'transportActivationAllowed: false',
  'persistenceAllowed: false',
  'queueProcessingAllowed: false',
  'receipt-envelope-shape',
  'idempotency-and-duplicate-detection',
  'test-training-environment-gate',
  'operator-status-boundary',
  'inventory-application-boundary',
  'failure-and-recovery-boundary',
  'liveFixturesAllowed: false',
  'testFixturesExecutionAllowedNow: false',
  'trainingFixturesExecutionAllowedNow: false',
  'fixtureExecutionRequiresFutureScopedPhase: true',
  'fixtureCatalogDoesNotMutateInventory: true',
  'controlledFixtureCatalogPlanningDefined: true',
  'safeToProceedToPhase34A4Planning: true',
  'safeToBeginPhase34ImplementationNow: false',
  'safeToExecuteFixturesNow: false',
  'noFixtureExecutionIntroduced: true',
  'noMutationIntroduced: true',
  'phase-34-a4-transport-contract-planning',
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

console.log('Phase 34 A3 check passed.');
