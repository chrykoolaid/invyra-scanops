import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B34.ts', 'utf8');

const requiredMarkers = [
  '33.B34',
  'b34-readiness-summary-closure-review-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB33: true',
  'closureReviewOnly: true',
  'runtimeAdded: false',
  'transportAdded: false',
  'fixtureExecutionAdded: false',
  'persistenceAdded: false',
  'readyForFixtureExecution: false',
  'phase-33-b35-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B34 check failed: ${marker}`);
    process.exit(1);
  }
}

console.log('B34 check passed.');
