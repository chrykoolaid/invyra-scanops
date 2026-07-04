import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B29.ts', 'utf8');

const requiredMarkers = [
  '33.B29',
  'b29-readiness-chain-closeout-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceClosedThroughB28: true',
  'chainCloseoutOnly: true',
  'runtimeAdded: false',
  'transportAdded: false',
  'fixtureExecutionAdded: false',
  'persistenceAdded: false',
  'readyForFixtureExecution: false',
  'phase-33-b30-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B29 check failed: ${marker}`);
    process.exit(1);
  }
}

console.log('B29 check passed.');
