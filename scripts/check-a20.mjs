import fs from 'node:fs';

const types = fs.readFileSync('src/bridge/phase33/bridgePhase33A20ReadinessIndexTypes.ts', 'utf8');
const report = fs.readFileSync('src/bridge/phase33/bridgePhase33A20ReadinessIndex.ts', 'utf8');
const combined = `${types}\n${report}`;

const required = [
  '"33.A20"',
  'a20-readiness-index-defined-read-only',
  'indexedItems: 6',
  'readyItems: 4',
  'blockedItems: 2',
  'activationStepsAllowed: 0',
  'phase-33-a21-cross-repo-fixture-readiness-summary',
];

const missing = required.filter((value) => !combined.includes(value));

if (missing.length > 0) {
  console.error(missing.join('\n'));
  process.exit(1);
}

console.log('A20 check passed.');
