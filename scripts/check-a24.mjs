import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33A24.ts', 'utf8');

const required = [
  '"33.A24"',
  'a24-safety-snapshot-defined-read-only',
  'safetySnapshotDefined: true',
  'activationStepsAllowed: 0',
  'phase-33-a25-cross-repo-fixture-safety-summary',
];

const missing = required.filter((value) => !source.includes(value));

if (missing.length > 0) {
  console.error(missing.join('\n'));
  process.exit(1);
}

console.log('A24 check passed.');
