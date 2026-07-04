import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B19.ts', 'utf8');

const requiredMarkers = [
  '33.B19',
  'b19-readiness-terminal-review-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB18: true',
  'terminalReviewOnly: true',
  'noRuntimeTerminalReviewApproval: true',
  'noTransportTerminalReviewApproval: true',
  'noFixtureTerminalReviewApproval: true',
  'noPersistenceTerminalReviewApproval: true',
  'noQueueTerminalReviewApproval: true',
  'readyForFixtureExecution: false',
  'phase-33-b20-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B19 check failed: ${marker}`);
    process.exit(1);
  }
}

console.log('B19 check passed.');
