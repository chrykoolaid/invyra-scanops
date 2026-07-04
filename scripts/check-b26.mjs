import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B26.ts', 'utf8');

const requiredMarkers = [
  '33.B26',
  'b26-readiness-post-final-seal-review-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceReviewedThroughB25: true',
  'postFinalSealReviewOnly: true',
  'noRuntimePostFinalSealApproval: true',
  'noTransportPostFinalSealApproval: true',
  'noFixturePostFinalSealApproval: true',
  'noPersistencePostFinalSealApproval: true',
  'readyForFixtureExecution: false',
  'phase-33-b27-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B26 check failed: ${marker}`);
    process.exit(1);
  }
}

console.log('B26 check passed.');
