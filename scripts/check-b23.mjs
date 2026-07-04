import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B23.ts', 'utf8');

const requiredMarkers = [
  '33.B23',
  'b23-readiness-post-terminal-seal-review-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB22: true',
  'postTerminalSealReviewOnly: true',
  'noRuntimePostTerminalSealApproval: true',
  'noTransportPostTerminalSealApproval: true',
  'noFixturePostTerminalSealApproval: true',
  'noPersistencePostTerminalSealApproval: true',
  'noQueuePostTerminalSealApproval: true',
  'readyForFixtureExecution: false',
  'phase-33-b24-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B23 check failed: ${marker}`);
    process.exit(1);
  }
}

console.log('B23 check passed.');
