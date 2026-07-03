import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B11.ts', 'utf8');

const requiredMarkers = [
  '33.B11',
  'b11-readiness-post-summary-lock-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceLockedThroughB10: true',
  'postSummaryLockOnly: true',
  'noRuntimePostSummaryApproval: true',
  'noTransportPostSummaryApproval: true',
  'noFixturePostSummaryApproval: true',
  'noPersistencePostSummaryApproval: true',
  'noQueuePostSummaryApproval: true',
  'noInventoryPostSummaryMutationApproval: true',
  'noScanOpsPostSummaryMutationApproval: true',
  'readyForFixtureExecution: false',
  'phase-33-b12-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B11 check failed. Missing marker: ${marker}`);
    process.exit(1);
  }
}

console.log('B11 check passed.');
