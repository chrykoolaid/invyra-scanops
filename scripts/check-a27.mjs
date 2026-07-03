import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33A27.ts', 'utf8');

const required = [
  '"33.A27"',
  'a27-final-summary-defined-read-only',
  'finalSummaryDefined: true',
  'phase-33-a28-closure-decision',
];

const missing = required.filter((value) => !source.includes(value));

if (missing.length > 0) {
  console.error(missing.join('\n'));
  process.exit(1);
}

console.log('A27 check passed.');
