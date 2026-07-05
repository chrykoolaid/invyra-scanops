import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B46.ts', 'utf8');

const requiredMarkers = [
  '33.B46',
  'b46-readiness-summary-review-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB45: true',
  'summaryReviewOnly: true',
  'runtimeAdded: false',
  'transportAdded: false',
  'fixtureExecutionAdded: false',
  'persistenceAdded: false',
  'readyForFixtureExecution: false',
  'phase-33-b47-summary',
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

console.log('B46 check passed.');
