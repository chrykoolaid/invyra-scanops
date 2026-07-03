import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33A29.ts', 'utf8');

const required = [
  '"33.A29"',
  'a29-ready-read-only',
  'markerDefined: true',
  'next-planning',
];

const missing = required.filter((value) => !source.includes(value));

if (missing.length > 0) {
  console.error(missing.join('\n'));
  process.exit(1);
}

console.log('A29 check passed.');
