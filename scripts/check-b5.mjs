import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B5.ts', 'utf8');

const requiredMarkers = [
  '33.B5',
  'b5-readiness-safety-checkpoint-read-only',
  'Inventory Desktop',
  'ScanOps',
  'bridgeStillDisabled: true',
  'inventoryStillSystemOfRecord: true',
  'scanOpsStillOperationalLayer: true',
  'planningOnly: true',
  'descriptorOnly: true',
  'executableRuntimeAdded: false',
  'transportAdded: false',
  'persistenceAdded: false',
  'queueProcessingAdded: false',
  'fixtureExecutionAdded: false',
  'mutationPathAdded: false',
  'readyForFixtureExecution: false',
  'phase-33-b6-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B5 check failed. Missing marker: ${marker}`);
    process.exit(1);
  }
}

console.log('B5 check passed.');
