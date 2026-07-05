import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B39.ts', 'utf8');

const requiredMarkers = [
  '33.B39',
  'b39-readiness-summary-closeout-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB38: true',
  'closeoutReviewOnly: true',
  'runtimeAdded: false',
  'transportAdded: false',
  'fixtureExecutionAdded: false',
  'persistenceAdded: false',
  'readyForFixtureExecution: false',
  'phase-33-b40-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error('B39 check failed');
    console.error(marker);
    process.exit(1);
  }
}

console.log('B39 check passed.');
