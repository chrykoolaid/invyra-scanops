import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33A25.ts', 'utf8');

const required = [
  '"33.A25"',
  'a25-defined-read-only',
  'phase-33-a26-summary',
];

const missing = required.filter((value) => !source.includes(value));

if (missing.length > 0) {
  console.error(missing.join('\n'));
  process.exit(1);
}

console.log('A25 check passed.');
