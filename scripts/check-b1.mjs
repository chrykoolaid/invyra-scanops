import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B1.ts', 'utf8');

const required = [
  '"33.B1"',
  'b1-ready-read-only',
  'markerDefined: true',
  'phase-33-b2-summary',
];

const missing = required.filter((value) => !source.includes(value));

if (missing.length > 0) {
  console.error(missing.join('\n'));
  process.exit(1);
}

console.log('B1 check passed.');
