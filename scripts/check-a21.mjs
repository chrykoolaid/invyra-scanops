import fs from 'node:fs';

const types = fs.readFileSync('src/bridge/phase33/bridgePhase33A21ReadinessSummaryTypes.ts', 'utf8');
const report = fs.readFileSync('src/bridge/phase33/bridgePhase33A21.ts', 'utf8');
const combined = `${types}\n${report}`;

const required = [
  '"33.A21"',
  'a21-readiness-summary-defined-read-only',
  'indexedItems: 6',
  'readyItems: 4',
  'blockedItems: 2',
  'activationStepsAllowed: 0',
  'phase-33-a22-cross-repo-fixture-planning-closure',
];

const missing = required.filter((value) => !combined.includes(value));

if (missing.length > 0) {
  console.error(missing.join('\n'));
  process.exit(1);
}

console.log('A21 check passed.');
