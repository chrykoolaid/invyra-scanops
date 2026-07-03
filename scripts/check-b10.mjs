import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B10.ts', 'utf8');

const requiredMarkers = [
  '33.B10',
  'b10-readiness-final-summary-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceCompleteThroughB9: true',
  'finalSummaryOnly: true',
  'noRuntimeFinalApproval: true',
  'noTransportFinalApproval: true',
  'noFixtureFinalApproval: true',
  'noPersistenceFinalApproval: true',
  'noQueueFinalApproval: true',
  'noInventoryFinalMutationApproval: true',
  'noScanOpsFinalMutationApproval: true',
  'readyForFixtureExecution: false',
  'phase-33-b11-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B10 check failed. Missing marker: ${marker}`);
    process.exit(1);
  }
}

console.log('B10 check passed.');
