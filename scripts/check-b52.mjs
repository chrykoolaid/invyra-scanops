import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B52.ts', 'utf8');

const requiredMarkers = [
  '33.B52',
  'b52-summary-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB51: true',
  'summaryOnly: true',
  'runtimeAdded: false',
  'transportAdded: false',
  'fixtureExecutionAdded: false',
  'persistenceAdded: false',
  'readyForFixtureExecution: false',
  'phase-33-b53-summary',
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

console.log('B52 check passed.');
