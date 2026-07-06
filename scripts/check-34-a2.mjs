import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase34/bridgePhase34A2.ts', 'utf8');

const requiredMarkers = [
  '34.A2',
  'phase-34-a2-planning-readiness-review-read-only',
  'planningReadinessReviewOnly: true',
  'readinessDescriptorOnly: true',
  'implementationWorkAllowed: false',
  'runtimeWorkAllowed: false',
  'transportActivationAllowed: false',
  'fixtureExecutionAllowed: false',
  'persistenceAllowed: false',
  'queueProcessingAllowed: false',
  'phase33FormallyClosed: true',
  'phase33CCompleteThroughC5: true',
  'phase34A1PlanningOpened: true',
  'phase34PlanningOnlyConfirmed: true',
  'phase34ImplementationAuthorizedNow: false',
  'phase34A2PlanningReadinessReviewed: true',
  'safeToProceedToPhase34A3Planning: true',
  'safeToBeginPhase34ImplementationNow: false',
  'noRuntimeBehaviorIntroduced: true',
  'noTransportBehaviorIntroduced: true',
  'noPersistenceBehaviorIntroduced: true',
  'noQueueProcessingIntroduced: true',
  'noMutationIntroduced: true',
  'phase-34-a3-controlled-fixture-catalog-planning',
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

console.log('Phase 34 A2 check passed.');
