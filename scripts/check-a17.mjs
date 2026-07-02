import fs from 'node:fs';

const typeFile = fs.readFileSync('src/bridge/phase33/bridgePhase33FixtureEvidenceReadinessReviewTypes.ts', 'utf8');
const reportFile = fs.readFileSync('src/bridge/phase33/bridgePhase33FixtureEvidenceReadinessReview.ts', 'utf8');

const required = [
  '"33.A17"',
  'fixture-readiness-review-complete-read-only',
  'readonly checks: 8;',
  'readonly readyChecks: 5;',
  'readonly blockingChecks: 3;',
  'phase: "33.A17"',
  'checks: 8',
  'readyChecks: 5',
  'blockingChecks: 3',
];

const combined = `${typeFile}\n${reportFile}`;
const missing = required.filter((value) => !combined.includes(value));

if (missing.length > 0) {
  console.error(missing.join('\n'));
  process.exit(1);
}

console.log('A17 check passed.');
