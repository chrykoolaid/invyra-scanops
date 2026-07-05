import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B32.ts', 'utf8');

const requiredMarkers = [
  '33.B32',
  'b32-readiness-summary-continuation-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB31: true',
  'summaryContinuationOnly: true',
  'runtimeAdded: false',
  'transportAdded: false',
  'fixtureExecutionAdded: false',
  'persistenceAdded: false',
  'readyForFixtureExecution: false',
  'phase-33-b33-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B32 check failed: ${marker}`);
    process.exit(1);
  }
}

console.log('B32 check passed.');
