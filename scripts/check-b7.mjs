import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B7.ts', 'utf8');

const requiredMarkers = [
  '33.B7',
  'b7-readiness-hand-off-precheck-read-only',
  'Inventory Desktop',
  'ScanOps',
  'bLanePlanningStillReadOnly: true',
  'priorReadinessDescriptorsPresent: true',
  'noRuntimeHandOffApproved: true',
  'noTransportHandOffApproved: true',
  'noFixtureHandOffApproved: true',
  'noPersistenceHandOffApproved: true',
  'noQueueProcessingHandOffApproved: true',
  'noMutationHandOffApproved: true',
  'readyForFixtureExecution: false',
  'phase-33-b8-summary',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    console.error(`B7 check failed. Missing marker: ${marker}`);
    process.exit(1);
  }
}

console.log('B7 check passed.');
