import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B48.ts', 'utf8');

const requiredMarkers = [
  '33.B48',
  'b48-readiness-summary-review-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB47: true',
  'summaryReviewOnly: true',
  'runtimeAdded: false',
  'transportAdded: false',
  'fixtureExecutionAdded: false',
  'persistenceAdded: false',
  'readyForFixtureExecution: false',
  'phase-33-b49-summary',
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

console.log('B48 check passed.');
