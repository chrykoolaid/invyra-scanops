import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const errors = [];

function has(source, value, message) {
  if (!source.includes(value)) errors.push(message);
}

const types = read('src/bridge/phase33/bridgePhase33FixtureSkeletonIndexTypes.ts');
const report = read('src/bridge/phase33/bridgePhase33FixtureSkeletonIndex.ts');
const source = read('src/bridge/phase33/bridgePhase33ValidationFixtureSkeletons.ts');

has(types, '"33.A11"', 'A11 phase marker missing');
has(types, 'fixture-skeleton-index-defined-read-only', 'read-only status missing');
has(types, 'readonly indexedEntries: 8;', 'indexed entry count missing');
has(types, 'readonly activeEntries: 0;', 'active entry lock missing');
has(types, 'readonly activationStepsAllowed: 0;', 'activation step lock missing');
has(types, 'phase-33-a12-cross-repo-validation-readiness-snapshot', 'next step missing');

has(report, 'createBridgePhase33FixtureSkeletonIndexReport', 'report factory missing');
has(report, 'createBridgePhase33ValidationFixtureSkeletonReport()', 'A10 source link missing');
has(report, 'phase: "33.A11"', 'A11 return marker missing');
has(report, 'indexedEntries: 8', 'indexed entry return count missing');
has(report, 'activeEntries: 0', 'active entry return lock missing');
has(report, 'activationStepsAllowed: 0', 'activation step return lock missing');

has(source, 'phase: "33.A10"', 'A10 source marker missing');
has(source, 'skeletonsDefined: true', 'A10 skeleton definition missing');
has(source, 'activeSkeletons: 0', 'A10 active skeleton lock missing');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 33 A11 fixture skeleton index validation passed.');
