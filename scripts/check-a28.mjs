import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33A28.ts', 'utf8');

const required = [
  '"33.A28"',
  'a28-ready-read-only',
  'phase-33-a29-summary',
];

const missing = required.filter((value) => !source.includes(value));

if (missing.length > 0) {
  console.error(missing.join('\n'));
  process.exit(1);
}

console.log('A28 check passed.');
