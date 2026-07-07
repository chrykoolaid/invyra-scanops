import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase34/bridgePhase34A4.ts', 'utf8');

const requiredMarkers = [
  '34.A4',
  'transport-contract-planning-read-only',
  'planningOnly: true',
  'transportContractOnly: true',
  'readinessDescriptorOnly: true',
  'implementationWorkAllowed: false',
  'runtimeWorkAllowed: false',
  'transportActivationAllowed: false',
  'fixtureExecutionAllowed: false',
  'persistenceAllowed: false',
  'queueProcessingAllowed: false',
  'plannedTransportEnvelopeFields',
  'transportGuardrails',
  'plannedTransportStates',
  'liveTransportAllowed: false',
  'transportOffByDefault: true',
  'transportContractPlanningDefined: true',
  'safeToProceedToPhase34A5Planning: true',
  'safeToBeginPhase34ImplementationNow: false',
  'safeToActivateTransportNow: false',
  'noTransportBehaviorIntroduced: true',
  'noMutationIntroduced: true',
  'phase-34-a5-persistence-queue-contract-planning',
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

console.log('Phase 34 A4 check passed.');
