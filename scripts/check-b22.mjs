import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B22.ts', 'utf8');

const requiredMarkers = [
  '33.B22',
  'b22-readiness-terminal-seal-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceSealedThroughB21: true',
  'terminalSealOnly: true',
  'noRuntimeTerminalSealApproval: true',
  'noTransportTerminalSealApproval: true',
  'noFixtureTerminalSealApproval: true',
  'noPersistenceTerminalSealApproval: true',
  'noQueueTerminalSealApproval: true',
  'readyForFixtureExecution: false',
  'phase-33-b23-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B22 check failed: ${marker}`);
    process.exit(1);
  }
}

console.log('B22 check passed.');
