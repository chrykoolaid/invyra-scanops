import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B6.ts', 'utf8');

const requiredMarkers = [
  '33.B6',
  'b6-readiness-continuity-check-read-only',
  'Inventory Desktop',
  'ScanOps',
  'phaseB1Complete: true',
  'phaseB2Complete: true',
  'phaseB3Complete: true',
  'phaseB4Complete: true',
  'phaseB5Complete: true',
  'descriptorChainIntact: true',
  'bridgeStillInactive: true',
  'noRuntimeContinuityGap: true',
  'noActivationContinuityGap: true',
  'noMutationContinuityGap: true',
  'readyForFixtureExecution: false',
  'phase-33-b7-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B6 check failed. Missing marker: ${marker}`);
    process.exit(1);
  }
}

console.log('B6 check passed.');
