import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33C5.ts', 'utf8');

const requiredMarkers = [
  '33.C5',
  'formal-phase-33-closure-report-read-only',
  'formalClosureReportOnly: true',
  'phase33ControlledCloseoutComplete: true',
  'phase33CFinalStep: true',
  'extendPhase33CBeyondC5: false',
  'implementationWorkAllowed: false',
  'runtimeWorkAllowed: false',
  '33-C5 formal Phase 33 closure report and authorization to begin Phase 34 planning',
  'phase33ACompleteThroughA29: true',
  'phase33BCompleteThroughB52: true',
  'phase33CCompleteThroughC5: true',
  'bridgeRemainsInactive: true',
  'noRuntimeBehaviorIntroduced: true',
  'noTransportBehaviorIntroduced: true',
  'noFixtureExecutionIntroduced: true',
  'noPersistenceIntroduced: true',
  'noQueueOrInboxProcessingIntroduced: true',
  'noMutationIntroduced: true',
  'phase34PlanningAuthorizedAfterC5: true',
  'phase34ImplementationAuthorizedNow: false',
  'phase33FormallyClosed: true',
  'phase33CComplete: true',
  'noFurtherPhase33CStepsAllowed: true',
  'safeToBeginPhase34Planning: true',
  'safeToBeginPhase34ImplementationNow: false',
  'phase-34-planning-only',
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

console.log('C5 check passed.');
