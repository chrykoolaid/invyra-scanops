import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B31.ts', 'utf8');

const requiredMarkers = [
  '33.B31',
  'b31-readiness-post-summary-review-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB30: true',
  'postSummaryReviewOnly: true',
  'runtimeAdded: false',
  'transportAdded: false',
  'fixtureExecutionAdded: false',
  'persistenceAdded: false',
  'readyForFixtureExecution: false',
  'phase-33-b32-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B31 check failed: ${marker}`);
    process.exit(1);
  }
}

console.log('B31 check passed.');
