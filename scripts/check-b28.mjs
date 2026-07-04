import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B28.ts', 'utf8');

const requiredMarkers = [
  '33.B28',
  'b28-readiness-chain-review-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB27: true',
  'chainReviewOnly: true',
  'runtimeAdded: false',
  'transportAdded: false',
  'fixtureExecutionAdded: false',
  'persistenceAdded: false',
  'readyForFixtureExecution: false',
  'phase-33-b29-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B28 check failed: ${marker}`);
    process.exit(1);
  }
}

console.log('B28 check passed.');
