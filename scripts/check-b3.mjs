import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B3.ts', 'utf8');

const requiredMarkers = [
  '33.B3',
  'b3-readiness-summary-read-only',
  'Inventory Desktop',
  'ScanOps',
  'bridgeActivationAllowed: false',
  'transportActivationAllowed: false',
  'fixtureExecutionAllowed: false',
  'persistenceAllowed: false',
  'synchronizationAllowed: false',
  'queueProcessingAllowed: false',
  'inventoryMutationAllowed: false',
  'scanOpsMutationAllowed: false',
  'readyForFixtureExecution: false',
  'phase-33-b4-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B3 check failed. Missing marker: ${marker}`);
    process.exit(1);
  }
}

console.log('B3 check passed.');
