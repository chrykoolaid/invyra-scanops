import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B15.ts', 'utf8');

const requiredMarkers = [
  '33.B15',
  'b15-readiness-b-lane-closeout-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceClosedThroughB14: true',
  'bLaneCloseoutOnly: true',
  'noRuntimeCloseoutApproval: true',
  'noTransportCloseoutApproval: true',
  'noFixtureCloseoutApproval: true',
  'noPersistenceCloseoutApproval: true',
  'noQueueCloseoutApproval: true',
  'readyForFixtureExecution: false',
  'phase-33-b16-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B15 check failed: ${marker}`);
    process.exit(1);
  }
}

console.log('B15 check passed.');
