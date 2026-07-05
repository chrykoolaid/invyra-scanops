import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B40.ts', 'utf8');

const requiredMarkers = [
  '33.B40',
  'b40-readiness-summary-final-closeout-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB39: true',
  'finalCloseoutReviewOnly: true',
  'runtimeAdded: false',
  'transportAdded: false',
  'fixtureExecutionAdded: false',
  'persistenceAdded: false',
  'readyForFixtureExecution: false',
  'phase-33-b41-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error('B40 check failed');
    console.error(marker);
    process.exit(1);
  }
}

console.log('B40 check passed.');
