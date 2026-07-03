import fs from 'node:fs';

const types = fs.readFileSync('src/bridge/phase33/bridgePhase33A19PlanningReviewTypes.ts', 'utf8');
const report = fs.readFileSync('src/bridge/phase33/bridgePhase33A19PlanningReview.ts', 'utf8');
const combined = `${types}\n${report}`;

const required = [
  '"33.A19"',
  'a19-planning-review-defined-read-only',
  'reviewItems: 6',
  'readyItems: 4',
  'blockedItems: 2',
  'activationStepsAllowed: 0',
  'phase-33-a20-cross-repo-fixture-readiness-index',
];

const missing = required.filter((value) => !combined.includes(value));

if (missing.length > 0) {
  console.error(missing.join('\n'));
  process.exit(1);
}

console.log('A19 check passed.');
