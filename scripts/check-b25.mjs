import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B25.ts', 'utf8');

const requiredMarkers = [
  '33.B25',
  'b25-readiness-b-lane-final-seal-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceSealedThroughB24: true',
  'bLaneFinalSealOnly: true',
  'noRuntimeFinalSealApproval: true',
  'noTransportFinalSealApproval: true',
  'noFixtureFinalSealApproval: true',
  'noPersistenceFinalSealApproval: true',
  'readyForFixtureExecution: false',
  'phase-33-b26-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B25 check failed: ${marker}`);
    process.exit(1);
  }
}

console.log('B25 check passed.');
