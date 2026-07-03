import fs from 'node:fs';

const source = [
  fs.readFileSync('src/bridge/phase33/bridgePhase33A22PlanningClosureTypes.ts', 'utf8'),
  fs.readFileSync('src/bridge/phase33/bridgePhase33A22.ts', 'utf8'),
].join('\n');

const required = [
  '"33.A22"',
  'a22-planning-closure-defined-read-only',
  'planningChainClosed: true',
  'phase-33-a23-cross-repo-fixture-execution-gate-review',
];

const missing = required.filter((value) => !source.includes(value));

if (missing.length > 0) {
  console.error(missing.join('\n'));
  process.exit(1);
}

console.log('A22 check passed.');
