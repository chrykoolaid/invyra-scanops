import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B18.ts', 'utf8');

const requiredMarkers = [
  '33.B18',
  'b18-readiness-final-review-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB17: true',
  'finalReviewOnly: true',
  'noRuntimeFinalReviewApproval: true',
  'noTransportFinalReviewApproval: true',
  'noFixtureFinalReviewApproval: true',
  'noPersistenceFinalReviewApproval: true',
  'noQueueFinalReviewApproval: true',
  'readyForFixtureExecution: false',
  'phase-33-b19-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B18 check failed: ${marker}`);
    process.exit(1);
  }
}

console.log('B18 check passed.');
