import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B24.ts', 'utf8');

const requiredMarkers = [
  '33.B24',
  'b24-readiness-final-terminal-review-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB23: true',
  'finalTerminalReviewOnly: true',
  'noRuntimeFinalTerminalApproval: true',
  'noTransportFinalTerminalApproval: true',
  'noFixtureFinalTerminalApproval: true',
  'noPersistenceFinalTerminalApproval: true',
  'noQueueFinalTerminalApproval: true',
  'readyForFixtureExecution: false',
  'phase-33-b25-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B24 check failed: ${marker}`);
    process.exit(1);
  }
}

console.log('B24 check passed.');
