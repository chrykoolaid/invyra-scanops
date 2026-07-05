import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B43.ts', 'utf8');

const requiredMarkers = [
  '33.B43',
  'b43-readiness-summary-sequence-review-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB42: true',
  'sequenceReviewOnly: true',
  'runtimeAdded: false',
  'transportAdded: false',
  'fixtureExecutionAdded: false',
  'persistenceAdded: false',
  'readyForFixtureExecution: false',
  'phase-33-b44-summary',
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

console.log('B43 check passed.');
