import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B14.ts', 'utf8');

const requiredMarkers = [
  '33.B14',
  'b14-readiness-lane-seal-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceSealedThroughB13: true',
  'laneSealOnly: true',
  'noRuntimeLaneSealApproval: true',
  'noTransportLaneSealApproval: true',
  'noFixtureLaneSealApproval: true',
  'noPersistenceLaneSealApproval: true',
  'noQueueLaneSealApproval: true',
  'readyForFixtureExecution: false',
  'phase-33-b15-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B14 check failed: ${marker}`);
    process.exit(1);
  }
}

console.log('B14 check passed.');
