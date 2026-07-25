#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const INVENTORY_BASELINE = 'de4ceca8d137d8acf409031cf986c858a792606d';
const SCANOPS_BASELINE = 'be87402cb2c65b6e899de9b088cf9c2b9df2ac22';
const recorderPath = 'scripts/run-phase39-0f7-real-local-operator-acceptance.mjs';
const templatePath = 'evidence/phase39-0f7-local-operator-acceptance.template.json';
const docsPath = 'docs/bridge/PHASE_39_0F7_REAL_LOCAL_OPERATOR_ACCEPTANCE.md';

const [recorder, templateText, docs, scanSource, f6Source] = await Promise.all([
  readFile(recorderPath, 'utf8'),
  readFile(templatePath, 'utf8'),
  readFile(docsPath, 'utf8'),
  readFile('src/pages/Scan.jsx', 'utf8'),
  readFile('scripts/validate-phase39-0f6-cross-repository-item-read-acceptance.mjs', 'utf8'),
]);
const evidenceTemplate = JSON.parse(templateText);

assert.equal(evidenceTemplate.phase, '39-0F7');
assert.equal(evidenceTemplate.status, 'INCOMPLETE');
assert.equal(evidenceTemplate.baselines.inventory, INVENTORY_BASELINE);
assert.equal(evidenceTemplate.baselines.scanOps, SCANOPS_BASELINE);
assert.equal(evidenceTemplate.validation.passed, false);
assert.equal(evidenceTemplate.visibleAcceptance.nameSearch.autoSelected, false);
assert.equal(evidenceTemplate.visibleAcceptance.noResults.staleCandidatesVisible, false);
assert.equal(evidenceTemplate.visibleAcceptance.authorizationClear.staleItemDataReused, false);
assert.ok(Object.values(evidenceTemplate.mutationCounts).every((value) => value === 0));
assert.ok(Object.values(evidenceTemplate.safety).every((value) => value === false));

for (const required of [
  "const PHASE = '39-0F7'",
  INVENTORY_BASELINE,
  SCANOPS_BASELINE,
  "new Set(['TEST', 'TRAINING'])",
  "new Set(['staff', 'supervisor', 'manager', 'admin', 'owner'])",
  'AUTOMATIC_SELECTION_DETECTED',
  'STALE_ITEM_DATA_REUSED',
  'AUTHORIZATION_UNAVAILABLE',
  'REAL_LOCAL_OPERATOR_ACCEPTANCE_PASS',
  'REAL_LOCAL_OPERATOR_ACCEPTANCE_FAIL',
  '--template',
  '--validate',
  '--record',
]) assert.ok(recorder.includes(required), `Recorder missing safeguard: ${required}`);

for (const forbidden of [
  'fetch(',
  'accessToken',
  'base44_access_token',
  'localStorage',
  'sessionStorage',
  '.create(',
  '.update(',
  '.delete(',
]) assert.ok(!recorder.includes(forbidden), `Recorder must not contain: ${forbidden}`);

assert.deepEqual(evidenceTemplate.screenshots.map((entry) => entry.label), [
  'connected',
  'exact-lookup',
  'search-candidates',
  'active-item-view',
  'inactive-item-view',
  'no-results',
  'authorization-unavailable',
]);

for (const required of [
  'Scan / SKU',
  'Search name',
  'No auto-select',
  'View this item',
  'Operational item view',
  'Zero mutations verified',
  'className="bold-blocks"',
]) assert.ok(scanSource.includes(required), `Visible ScanOps workflow missing: ${required}`);
assert.ok(f6Source.includes('READY_FOR_REAL_LOCAL_OPERATOR_ACCEPTANCE'));
assert.ok(f6Source.includes('automaticSelectionAdded: false'));
assert.ok(f6Source.includes('receivingIntegrationAuthorized: false'));

for (const required of [
  'npm run bridge:pilot',
  'npm run dev',
  'Settings → Sync & Devices',
  'TEST or TRAINING',
  'actual Inventory catalogue',
  'active item',
  'inactive item',
  'no-results',
  'AUTHORIZATION_UNAVAILABLE',
  'node scripts/run-phase39-0f7-real-local-operator-acceptance.mjs --record',
  'does not certify acceptance by itself',
]) assert.ok(docs.includes(required), `Runbook missing instruction: ${required}`);

const incomplete = spawnSync(process.execPath, [recorderPath, '--validate', templatePath], {
  encoding: 'utf8',
});
assert.equal(incomplete.status, 1, incomplete.stderr || incomplete.stdout);
assert.ok(incomplete.stdout.includes('"passed": false'));
assert.ok(incomplete.stdout.includes('"readiness": "INCOMPLETE"'));
assert.ok(incomplete.stdout.includes('OPERATOR_NAME_REQUIRED'));
assert.ok(incomplete.stdout.includes('SCREENSHOT_CONNECTED_REQUIRED'));

const tempRoot = await mkdtemp(join(tmpdir(), 'invyra-phase39-0f7-'));
try {
  const generatedPath = join(tempRoot, 'generated.json');
  const generated = spawnSync(process.execPath, [recorderPath, '--template', generatedPath], {
    encoding: 'utf8',
  });
  assert.equal(generated.status, 0, generated.stderr || generated.stdout);
  const generatedEvidence = JSON.parse(await readFile(generatedPath, 'utf8'));
  assert.equal(generatedEvidence.baselines.inventory, INVENTORY_BASELINE);
  assert.equal(generatedEvidence.baselines.scanOps, SCANOPS_BASELINE);
  assert.deepEqual(Object.keys(generatedEvidence.mutationCounts), Object.keys(evidenceTemplate.mutationCounts));
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

console.log(JSON.stringify({
  phase: '39-0F7',
  passed: true,
  readiness: 'READY_FOR_REAL_LOCAL_OPERATOR_EXECUTION',
  humanAcceptancePassed: false,
  liveAuthorized: false,
  productionAuthorized: false,
  receivingIntegrationAuthorized: false,
  mutationCounts: evidenceTemplate.mutationCounts,
}, null, 2));
console.log('\nPHASE39_0F7_OPERATOR_ACCEPTANCE_KIT_READY');
