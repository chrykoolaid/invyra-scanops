import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B38.ts', 'utf8');

const requiredMarkers = [
  '33.B38',
  'b38-readiness-summary-handoff-review-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB37: true',
  'handoffReviewOnly: true',
  'runtimeAdded: false',
  'transportAdded: false',
  'fixtureExecutionAdded: false',
  'persistenceAdded: false',
  'readyForFixtureExecution: false',
  'phase-33-b39-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B38 check failed: ${marker}`);
    process.exit(1);
  }
}

console.log('B38 check passed.');
