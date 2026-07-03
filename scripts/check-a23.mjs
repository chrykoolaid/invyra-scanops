import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33A23.ts', 'utf8');

const required = [
  '"33.A23"',
  'a23-review-defined-read-only',
  'reviewItems: 5',
  'readyItems: 3',
  'blockedItems: 2',
  'phase-33-a24-cross-repo-fixture-safety-snapshot',
];

const missing = required.filter((value) => !source.includes(value));

if (missing.length > 0) {
  console.error(missing.join('\n'));
  process.exit(1);
}

console.log('A23 check passed.');
