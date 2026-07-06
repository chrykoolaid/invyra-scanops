import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33C1.ts', 'utf8');

const requiredMarkers = [
  '33.C1',
  'phase-33-c-opening-scope-confirmation-read-only',
  'controlled-closeout',
  'maximumPhases: 5',
  'finalPhase: "33-C5"',
  'extendBeyondC5WithoutInstruction: false',
  'featureDriftAllowed: false',
  'patchStackingAllowed: false',
  'liveBridgeActivation: false',
  'transportActivation: false',
  'fixtureExecution: false',
  'persistence: false',
  'queueProcessing: false',
  'inventoryMutation: false',
  'scanOpsMutation: false',
  'safeToProceedToC2: true',
  'safeToBeginPhase34ImplementationNow: false',
  'phase-33-c2-cross-repository-readiness-verification',
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

console.log('C1 check passed.');
