import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B50.ts', 'utf8');

const requiredMarkers = [
  '33.B50',
  'b50-summary-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB49: true',
  'summaryOnly: true',
  'runtimeAdded: false',
  'transportAdded: false',
  'fixtureExecutionAdded: false',
  'persistenceAdded: false',
  'readyForFixtureExecution: false',
  'phase-33-b51-summary',
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

console.log('B50 check passed.');
