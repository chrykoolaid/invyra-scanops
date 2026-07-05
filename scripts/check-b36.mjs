import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B36.ts', 'utf8');

const requiredMarkers = [
  '33.B36',
  'b36-readiness-summary-lock-review-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB35: true',
  'lockReviewOnly: true',
  'runtimeAdded: false',
  'transportAdded: false',
  'fixtureExecutionAdded: false',
  'persistenceAdded: false',
  'readyForFixtureExecution: false',
  'phase-33-b37-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B36 check failed: ${marker}`);
    process.exit(1);
  }
}

console.log('B36 check passed.');
