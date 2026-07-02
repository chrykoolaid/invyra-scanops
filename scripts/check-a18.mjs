import fs from 'node:fs';

const types = fs.readFileSync('src/bridge/phase33/bridgePhase33A18SnapshotTypes.ts', 'utf8');
const report = fs.readFileSync('src/bridge/phase33/bridgePhase33A18.ts', 'utf8');
const combined = `${types}\n${report}`;

const required = [
  '"33.A18"',
  'a18-snapshot-defined-read-only',
  'checks: 8',
  'readyChecks: 5',
  'blockingChecks: 3',
  'phase-33-a19-cross-repo-fixture-planning-review',
];

const missing = required.filter((value) => !combined.includes(value));

if (missing.length > 0) {
  console.error(missing.join('\n'));
  process.exit(1);
}

console.log('A18 check passed.');
