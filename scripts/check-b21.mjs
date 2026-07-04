import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B21.ts', 'utf8');

const requiredMarkers = [
  '33.B21',
  'b21-readiness-post-terminal-close-review-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB20: true',
  'postTerminalCloseReviewOnly: true',
  'noRuntimePostTerminalCloseApproval: true',
  'noTransportPostTerminalCloseApproval: true',
  'noFixturePostTerminalCloseApproval: true',
  'noPersistencePostTerminalCloseApproval: true',
  'noQueuePostTerminalCloseApproval: true',
  'readyForFixtureExecution: false',
  'phase-33-b22-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B21 check failed: ${marker}`);
    process.exit(1);
  }
}

console.log('B21 check passed.');
