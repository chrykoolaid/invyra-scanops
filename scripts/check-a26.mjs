import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33A26.ts', 'utf8');

const required = [
  '"33.A26"',
  'a26-closure-defined-read-only',
  'phase-33-a27-summary',
];

const missing = required.filter((value) => !source.includes(value));

if (missing.length > 0) {
  console.error(missing.join('\n'));
  process.exit(1);
}

console.log('A26 check passed.');
