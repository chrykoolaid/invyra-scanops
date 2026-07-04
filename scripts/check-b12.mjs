import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B12.ts', 'utf8');

const requiredMarkers = [
  '33.B12',
  'b12-readiness-final-lock-review-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceLockedThroughB11: true',
  'finalLockReviewOnly: true',
  'noRuntimeFinalLockApproval: true',
  'noTransportFinalLockApproval: true',
  'noFixtureFinalLockApproval: true',
  'noPersistenceFinalLockApproval: true',
  'noQueueFinalLockApproval: true',
  'noInventoryFinalLockMutationApproval: true',
  'noScanOpsFinalLockMutationApproval: true',
  'readyForFixtureExecution: false',
  'phase-33-b13-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B12 check failed. Missing marker: ${marker}`);
    process.exit(1);
  }
}

console.log('B12 check passed.');
