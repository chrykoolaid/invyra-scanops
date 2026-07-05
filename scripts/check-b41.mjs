import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B41.ts', 'utf8');

const requiredMarkers = [
  '33.B41',
  'b41-readiness-summary-post-closeout-review-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB40: true',
  'postCloseoutReviewOnly: true',
  'runtimeAdded: false',
  'transportAdded: false',
  'fixtureExecutionAdded: false',
  'persistenceAdded: false',
  'readyForFixtureExecution: false',
  'phase-33-b42-summary',
];

let ok = true;

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    ok = false;
  }
}

if (!ok) {
  process.exit(1);
}

console.log('B41 check passed.');
