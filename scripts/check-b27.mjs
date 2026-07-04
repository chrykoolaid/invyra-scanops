import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B27.ts', 'utf8');

const requiredMarkers = [
  '33.B27',
  'b27-readiness-terminal-confirmation-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessSequenceConfirmedThroughB26: true',
  'terminalConfirmationOnly: true',
  'runtimeAdded: false',
  'transportAdded: false',
  'fixtureExecutionAdded: false',
  'persistenceAdded: false',
  'readyForFixtureExecution: false',
  'phase-33-b28-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B27 check failed: ${marker}`);
    process.exit(1);
  }
}

console.log('B27 check passed.');
