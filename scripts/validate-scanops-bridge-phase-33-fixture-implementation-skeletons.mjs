import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const errors = [];
const has = (text, value, message) => {
  if (!text.includes(value)) errors.push(message);
};

const types = read('src/bridge/phase33/bridgePhase33FixtureImplementationSkeletonTypes.ts');
const report = read('src/bridge/phase33/bridgePhase33FixtureImplementationSkeletons.ts');
const plan = read('src/bridge/phase33/bridgePhase33FixtureImplementationPlan.ts');

has(types, '"33.A14"', 'missing A14 phase');
has(types, 'fixture-implementation-skeletons-defined-read-only', 'missing read-only status');
has(types, 'readonly skeletons: 8;', 'missing skeleton count');
has(types, 'readonly descriptorOnlySkeletons: 8;', 'missing descriptor count');
has(types, 'readonly activeSkeletons: 0;', 'missing active count');
has(types, 'phase-33-a15-fixture-implementation-index', 'missing next step');

has(report, 'createBridgePhase33FixtureImplementationSkeletonReport', 'missing report factory');
has(report, 'createBridgePhase33FixtureImplementationPlan()', 'missing A13 source link');
has(report, 'phase: "33.A14"', 'missing A14 return phase');
has(report, 'descriptorOnlySkeletons: 8', 'missing descriptor return count');
has(report, 'activeSkeletons: 0', 'missing active return count');
has(report, 'descriptorOnly: true', 'missing descriptor flag');

has(plan, 'phase: "33.A13"', 'missing A13 source marker');
has(plan, 'implementationPlanDefined: true', 'missing A13 plan marker');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('Phase 33 A14 fixture implementation skeleton validation passed.');
