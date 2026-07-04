import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B13.ts', 'utf8');

const requiredMarkers = [
  '33.B13',
  'b13-readiness-completion-confirmation-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceConfirmedThroughB12: true',
  'completionConfirmationOnly: true',
  'noRuntimeCompletionApproval: true',
  'noTransportCompletionApproval: true',
  'noFixtureCompletionApproval: true',
  'noPersistenceCompletionApproval: true',
  'noQueueCompletionApproval: true',
  'noInventoryCompletionMutationApproval: true',
  'noScanOpsCompletionMutationApproval: true',
  'readyForFixtureExecution: false',
  'phase-33-b14-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B13 check failed. Missing marker: ${marker}`);
    process.exit(1);
  }
}

console.log('B13 check passed.');
