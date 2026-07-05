import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B35.ts', 'utf8');

const requiredMarkers = [
  '33.B35',
  'b35-readiness-summary-finalization-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB34: true',
  'summaryFinalizationOnly: true',
  'runtimeAdded: false',
  'transportAdded: false',
  'fixtureExecutionAdded: false',
  'persistenceAdded: false',
  'readyForFixtureExecution: false',
  'phase-33-b36-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B35 check failed: ${marker}`);
    process.exit(1);
  }
}

console.log('B35 check passed.');
