import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B30.ts', 'utf8');

const requiredMarkers = [
  '33.B30',
  'b30-readiness-b-lane-summary-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceSummarizedThroughB29: true',
  'bLaneSummaryOnly: true',
  'runtimeAdded: false',
  'transportAdded: false',
  'fixtureExecutionAdded: false',
  'persistenceAdded: false',
  'readyForFixtureExecution: false',
  'phase-33-b31-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B30 check failed: ${marker}`);
    process.exit(1);
  }
}

console.log('B30 check passed.');
