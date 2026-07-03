import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B4.ts', 'utf8');

const requiredMarkers = [
  '33.B4',
  'b4-readiness-boundary-review-read-only',
  'Inventory Desktop',
  'ScanOps',
  'planningArtifactsOnly: true',
  'descriptorOnly: true',
  'runtimeBridgeWiringAllowed: false',
  'transportHandshakeAllowed: false',
  'fixtureRunAllowed: false',
  'persistenceWriteAllowed: false',
  'queueInboxReadAllowed: false',
  'queueInboxWriteAllowed: false',
  'inventoryWriteAllowed: false',
  'scanOpsWriteAllowed: false',
  'readyForFixtureExecution: false',
  'phase-33-b5-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B4 check failed. Missing marker: ${marker}`);
    process.exit(1);
  }
}

console.log('B4 check passed.');
