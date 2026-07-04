import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B17.ts', 'utf8');

const requiredMarkers = [
  '33.B17',
  'b17-readiness-post-closeout-review-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB16: true',
  'postCloseoutReviewOnly: true',
  'noRuntimePostCloseoutApproval: true',
  'noTransportPostCloseoutApproval: true',
  'noFixturePostCloseoutApproval: true',
  'noPersistencePostCloseoutApproval: true',
  'noQueuePostCloseoutApproval: true',
  'readyForFixtureExecution: false',
  'phase-33-b18-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B17 check failed: ${marker}`);
    process.exit(1);
  }
}

console.log('B17 check passed.');
