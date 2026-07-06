import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33C2.ts', 'utf8');

const requiredMarkers = [
  '33.C2',
  'cross-repository-readiness-verification-read-only',
  'chrykoolaid/invyra-scanops',
  'chrykoolaid/invyra-base44',
  'crossRepositoryReadinessOnly: true',
  'implementationWorkAllowed: false',
  'inventoryDesktopRemainsSystemOfRecord: true',
  'scanOpsRemainsHandheldOperationalLayer: true',
  'crossRepoBridgeRemainsInactive: true',
  'noRuntimeBridgePathIntroduced: true',
  'noTransportPathIntroduced: true',
  'noPersistencePathIntroduced: true',
  'noQueueOrInboxPathIntroduced: true',
  'phase33ACompleteThroughA29: true',
  'phase33BCompleteThroughB52: true',
  'phase33COpenedByC1: true',
  'phase33CStillLimitedToC5: true',
  'phase34PlanningStillDeferred: true',
  'safeToProceedToC3: true',
  'safeToBeginPhase34ImplementationNow: false',
  'phase-33-c3-final-architecture-contract-consistency-review',
];

let ok = true;

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    ok = false;
  }
}

if (!ok) {
  process.exit(1);
}

console.log('C2 check passed.');
