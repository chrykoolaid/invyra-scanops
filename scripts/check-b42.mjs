import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B42.ts', 'utf8');

const requiredMarkers = [
  '33.B42',
  'b42-readiness-summary-continuity-review-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB41: true',
  'continuityReviewOnly: true',
  'runtimeAdded: false',
  'transportAdded: false',
  'fixtureExecutionAdded: false',
  'persistenceAdded: false',
  'readyForFixtureExecution: false',
  'phase-33-b43-summary',
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

console.log('B42 check passed.');
