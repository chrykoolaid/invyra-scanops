import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B16.ts', 'utf8');

const requiredMarkers = [
  '33.B16',
  'b16-readiness-closeout-confirmation-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceConfirmedThroughB15: true',
  'closeoutConfirmationOnly: true',
  'noRuntimeCloseoutConfirmationApproval: true',
  'noTransportCloseoutConfirmationApproval: true',
  'noFixtureCloseoutConfirmationApproval: true',
  'noPersistenceCloseoutConfirmationApproval: true',
  'noQueueCloseoutConfirmationApproval: true',
  'readyForFixtureExecution: false',
  'phase-33-b17-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B16 check failed: ${marker}`);
    process.exit(1);
  }
}

console.log('B16 check passed.');
