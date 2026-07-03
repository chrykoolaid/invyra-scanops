import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B8.ts', 'utf8');

const requiredMarkers = [
  '33.B8',
  'b8-readiness-release-gate-read-only',
  'Inventory Desktop',
  'ScanOps',
  'readinessLaneOnly: true',
  'descriptorChainCompleteThroughB7: true',
  'noRuntimeReleaseApproved: true',
  'noTransportReleaseApproved: true',
  'noFixtureReleaseApproved: true',
  'noPersistenceReleaseApproved: true',
  'noQueueReleaseApproved: true',
  'noInventoryReleaseMutationApproved: true',
  'noScanOpsReleaseMutationApproved: true',
  'readyForFixtureExecution: false',
  'phase-33-b9-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B8 check failed. Missing marker: ${marker}`);
    process.exit(1);
  }
}

console.log('B8 check passed.');
