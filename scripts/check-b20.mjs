import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B20.ts', 'utf8');

const requiredMarkers = [
  '33.B20',
  'b20-readiness-b-lane-terminal-close-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceClosedThroughB19: true',
  'bLaneTerminalCloseOnly: true',
  'noRuntimeTerminalCloseApproval: true',
  'noTransportTerminalCloseApproval: true',
  'noFixtureTerminalCloseApproval: true',
  'noPersistenceTerminalCloseApproval: true',
  'noQueueTerminalCloseApproval: true',
  'readyForFixtureExecution: false',
  'phase-33-b21-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B20 check failed: ${marker}`);
    process.exit(1);
  }
}

console.log('B20 check passed.');
