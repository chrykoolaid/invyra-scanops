import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B33.ts', 'utf8');

const requiredMarkers = [
  '33.B33',
  'b33-readiness-summary-validation-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB32: true',
  'summaryValidationOnly: true',
  'runtimeAdded: false',
  'transportAdded: false',
  'fixtureExecutionAdded: false',
  'persistenceAdded: false',
  'readyForFixtureExecution: false',
  'phase-33-b34-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B33 check failed: ${marker}`);
    process.exit(1);
  }
}

console.log('B33 check passed.');
