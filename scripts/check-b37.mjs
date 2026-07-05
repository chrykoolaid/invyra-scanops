import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B37.ts', 'utf8');

const requiredMarkers = [
  '33.B37',
  'b37-readiness-summary-transition-review-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB36: true',
  'transitionReviewOnly: true',
  'runtimeAdded: false',
  'transportAdded: false',
  'fixtureExecutionAdded: false',
  'persistenceAdded: false',
  'readyForFixtureExecution: false',
  'phase-33-b38-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B37 check failed: ${marker}`);
    process.exit(1);
  }
}

console.log('B37 check passed.');
