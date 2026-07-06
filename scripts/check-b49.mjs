import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B49.ts', 'utf8');

const requiredMarkers = [
  '33.B49',
  'b49-readiness-summary-review-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB48: true',
  'summaryReviewOnly: true',
  'runtimeAdded: false',
  'transportAdded: false',
  'fixtureExecutionAdded: false',
  'persistenceAdded: false',
  'readyForFixtureExecution: false',
  'phase-33-b50-summary',
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

console.log('B49 check passed.');
