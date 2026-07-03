import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B9.ts', 'utf8');

const requiredMarkers = [
  '33.B9',
  'b9-readiness-closure-review-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessLaneClosedThroughB8: true',
  'closureReviewOnly: true',
  'noRuntimeClosureApproved: true',
  'noTransportClosureApproved: true',
  'noFixtureClosureApproved: true',
  'noPersistenceClosureApproved: true',
  'noQueueClosureApproved: true',
  'noInventoryClosureMutationApproved: true',
  'noScanOpsClosureMutationApproved: true',
  'readyForFixtureExecution: false',
  'phase-33-b10-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B9 check failed. Missing marker: ${marker}`);
    process.exit(1);
  }
}

console.log('B9 check passed.');
