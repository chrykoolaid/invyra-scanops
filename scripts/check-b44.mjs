import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B44.ts', 'utf8');

const requiredMarkers = [
  '33.B44',
  'b44-readiness-summary-alignment-review-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB43: true',
  'alignmentReviewOnly: true',
  'runtimeAdded: false',
  'transportAdded: false',
  'fixtureExecutionAdded: false',
  'persistenceAdded: false',
  'readyForFixtureExecution: false',
  'phase-33-b45-summary',
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

console.log('B44 check passed.');
