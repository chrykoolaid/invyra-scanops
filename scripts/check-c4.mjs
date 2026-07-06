import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33C4.ts', 'utf8');

const requiredMarkers = [
  '33.C4',
  'phase-34-entry-readiness-review-deferred-implementation-read-only',
  'phase34EntryReadinessReviewOnly: true',
  'deferredImplementationConfirmationOnly: true',
  'implementationWorkAllowed: false',
  'phase34ImplementationAllowedNow: false',
  'phase33AClosedThroughA29: true',
  'phase33BClosedThroughB52: true',
  'phase33COpenedAndReviewedThroughC3: true',
  'phase33CClosureReportStillRequired: true',
  'phase34PlanningAuthorizationStillPendingC5: true',
  'phase34ImplementationAuthorizationStillBlocked: true',
  'noLiveBridgeActivationBeforeC5: true',
  'noTransportActivationBeforeC5: true',
  'noFixtureExecutionBeforeC5: true',
  'noPersistenceBeforeC5: true',
  'noQueueOrInboxProcessingBeforeC5: true',
  'phase34PlanningMayBeginOnlyAfterC5Authorization: true',
  'safeToProceedToC5: true',
  'safeToBeginPhase34PlanningNow: false',
  'safeToBeginPhase34ImplementationNow: false',
  'phase-33-c5-formal-closure-report-authorization',
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

console.log('C4 check passed.');
