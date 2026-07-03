import fs from 'node:fs';

const types = fs.readFileSync('src/bridge/phase33/bridgePhase33A18SnapshotTypes.ts', 'utf8');
const report = fs.readFileSync('src/bridge/phase33/bridgePhase33A18.ts', 'utf8');

const typeRequired = [
  'BridgePhase33A18SnapshotReport',
  'readonly readinessReview',
  'readonly reason: string',
  'readonly checks: 8',
  'readonly readyChecks: 5',
  'readonly blockingChecks: 3',
];

const implementationRequired = [
  'createBridgePhase33A18Report(): BridgePhase33A18SnapshotReport',
  'const readinessReview = createBridgePhase33FixtureEvidenceReadinessReviewReport();',
  'readinessReview,',
  'checks: 8',
  'readyChecks: 5',
  'blockingChecks: 3',
  'activationStepsAllowed: 0',
  'reason: "A18 is a read-only closure snapshot handoff',
  'phase-33-a19-cross-repo-fixture-planning-review',
];

const forbiddenImplementation = [
  'review,',
  'const review =',
];

const missingType = typeRequired.filter((value) => !types.includes(value));
const missingImplementation = implementationRequired.filter((value) => !report.includes(value));
const forbiddenFound = forbiddenImplementation.filter((value) => report.includes(value));

if (missingType.length > 0 || missingImplementation.length > 0 || forbiddenFound.length > 0) {
  console.error([
    ...missingType.map((value) => `types:${value}`),
    ...missingImplementation.map((value) => `implementation:${value}`),
    ...forbiddenFound.map((value) => `forbidden:${value}`),
  ].join('\n'));
  process.exit(1);
}

console.log('A18 check passed.');
