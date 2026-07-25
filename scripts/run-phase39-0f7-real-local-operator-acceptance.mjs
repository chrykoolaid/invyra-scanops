#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const PHASE = '39-0F7';
const INVENTORY_BASELINE = 'de4ceca8d137d8acf409031cf986c858a792606d';
const SCANOPS_BASELINE = '47891e62941af3be939ab9ac9f4e5bfa28c94242';
const TEMPLATE_PATH = new URL('../evidence/phase39-0f7-local-operator-acceptance.template.json', import.meta.url);
const ALLOWED_ENVIRONMENTS = new Set(['TEST', 'TRAINING']);
const ALLOWED_ROLES = new Set(['staff', 'supervisor', 'manager', 'admin', 'owner']);
const SCREENSHOT_LABELS = Object.freeze([
  'connected',
  'exact-lookup',
  'search-candidates',
  'active-item-view',
  'inactive-item-view',
  'no-results',
  'authorization-unavailable',
]);
const ZERO_MUTATION_KEYS = Object.freeze([
  'inventory', 'stock', 'ledger', 'itemMaster',
  'pricing', 'purchaseOrder', 'receiving', 'scanOps',
]);

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

async function loadTemplate() {
  return JSON.parse(await readFile(TEMPLATE_PATH, 'utf8'));
}

function validateEvidence(evidence) {
  const blockers = [];
  const requireTrue = (value, code) => value === true || blockers.push(code);
  const requireFalse = (value, code) => value === false || blockers.push(code);
  const requireText = (value, code) => text(value) || blockers.push(code);

  if (evidence?.phase !== PHASE) blockers.push('PHASE_MISMATCH');
  if (!ALLOWED_ENVIRONMENTS.has(text(evidence?.environment).toUpperCase())) blockers.push('ENVIRONMENT_BLOCKED');
  if (evidence?.baselines?.inventory !== INVENTORY_BASELINE) blockers.push('INVENTORY_BASELINE_MISMATCH');
  if (evidence?.baselines?.scanOps !== SCANOPS_BASELINE) blockers.push('SCANOPS_BASELINE_MISMATCH');
  requireText(evidence?.executedAt, 'EXECUTION_TIME_REQUIRED');
  requireText(evidence?.operator?.name, 'OPERATOR_NAME_REQUIRED');
  requireText(evidence?.operator?.operatorId, 'OPERATOR_ID_REQUIRED');
  if (!ALLOWED_ROLES.has(text(evidence?.operator?.role).toLowerCase())) blockers.push('OPERATOR_ROLE_BLOCKED');
  requireText(evidence?.endpoints?.inventoryControlUrl, 'INVENTORY_CONTROL_URL_REQUIRED');
  requireText(evidence?.endpoints?.scanOpsUrl, 'SCANOPS_URL_REQUIRED');

  const visible = evidence?.visibleAcceptance || {};
  requireTrue(visible.connectedBannerVisible, 'CONNECTED_STATE_NOT_CONFIRMED');
  requireTrue(visible.scanSkuModeVisible, 'SCAN_SKU_MODE_NOT_VISIBLE');
  requireTrue(visible.searchNameModeVisible, 'SEARCH_NAME_MODE_NOT_VISIBLE');

  requireText(visible.exactLookup?.inputValue, 'EXACT_LOOKUP_INPUT_REQUIRED');
  requireTrue(visible.exactLookup?.found, 'EXACT_LOOKUP_NOT_FOUND');
  requireText(visible.exactLookup?.canonicalItemId, 'EXACT_LOOKUP_CANONICAL_ID_REQUIRED');
  requireText(visible.exactLookup?.itemName, 'EXACT_LOOKUP_ITEM_NAME_REQUIRED');
  requireTrue(visible.exactLookup?.zeroMutationsVisible, 'EXACT_LOOKUP_ZERO_MUTATIONS_NOT_VISIBLE');

  requireText(visible.nameSearch?.query, 'NAME_SEARCH_QUERY_REQUIRED');
  if (!Number.isInteger(visible.nameSearch?.resultCount) || visible.nameSearch.resultCount < 2) {
    blockers.push('NAME_SEARCH_REQUIRES_ACTIVE_AND_INACTIVE_CANDIDATES');
  }
  requireFalse(visible.nameSearch?.autoSelected, 'AUTOMATIC_SELECTION_DETECTED');
  requireTrue(visible.nameSearch?.explicitSelectionRequired, 'EXPLICIT_SELECTION_NOT_CONFIRMED');
  requireTrue(visible.nameSearch?.activeCandidate?.visible, 'ACTIVE_CANDIDATE_NOT_VISIBLE');
  requireText(visible.nameSearch?.activeCandidate?.canonicalItemId, 'ACTIVE_CANDIDATE_ID_REQUIRED');
  if (visible.nameSearch?.activeCandidate?.lifecycleStatus !== 'ACTIVE') blockers.push('ACTIVE_LIFECYCLE_STATUS_INVALID');
  requireTrue(visible.nameSearch?.inactiveCandidate?.visible, 'INACTIVE_CANDIDATE_NOT_VISIBLE');
  requireText(visible.nameSearch?.inactiveCandidate?.canonicalItemId, 'INACTIVE_CANDIDATE_ID_REQUIRED');
  if (visible.nameSearch?.inactiveCandidate?.lifecycleStatus !== 'INACTIVE') blockers.push('INACTIVE_LIFECYCLE_STATUS_INVALID');

  for (const [label, expectedStatus] of [['activeItemView', 'ACTIVE'], ['inactiveItemView', 'INACTIVE']]) {
    const view = visible[label];
    requireTrue(view?.openedAfterExplicitSelection, `${expectedStatus}_VIEW_SELECTION_NOT_CONFIRMED`);
    requireTrue(view?.identitySectionVisible, `${expectedStatus}_IDENTITY_SECTION_NOT_VISIBLE`);
    requireTrue(view?.handlingSectionVisible, `${expectedStatus}_HANDLING_SECTION_NOT_VISIBLE`);
    requireTrue(view?.zeroMutationsVisible, `${expectedStatus}_VIEW_ZERO_MUTATIONS_NOT_VISIBLE`);
    if (view?.lifecycleStatus !== expectedStatus) blockers.push(`${expectedStatus}_VIEW_LIFECYCLE_INVALID`);
  }
  requireTrue(visible.inactiveItemView?.inactiveWarningVisible, 'INACTIVE_WARNING_NOT_VISIBLE');

  requireText(visible.noResults?.query, 'NO_RESULTS_QUERY_REQUIRED');
  requireTrue(visible.noResults?.confirmed, 'NO_RESULTS_NOT_CONFIRMED');
  requireFalse(visible.noResults?.staleCandidatesVisible, 'STALE_CANDIDATES_VISIBLE_AFTER_NO_RESULTS');
  requireTrue(visible.blockedRole?.blockedBeforeDispatch, 'BLOCKED_ROLE_DISPATCHED');
  requireTrue(visible.authorizationClear?.clearedInInventory, 'AUTHORIZATION_CLEAR_NOT_CONFIRMED');
  if (visible.authorizationClear?.nextReadStatus !== 'AUTHORIZATION_UNAVAILABLE') {
    blockers.push('AUTHORIZATION_FAILURE_STATUS_INVALID');
  }
  requireFalse(visible.authorizationClear?.staleItemDataReused, 'STALE_ITEM_DATA_REUSED');
  requireTrue(visible.authorizationClear?.recoveryMessageClear, 'AUTHORIZATION_RECOVERY_MESSAGE_UNCLEAR');

  for (const [key, value] of Object.entries(visible.usability || {})) {
    requireTrue(value, `USABILITY_${key.toUpperCase()}_NOT_CONFIRMED`);
  }
  for (const key of ZERO_MUTATION_KEYS) {
    if (Number(evidence?.mutationCounts?.[key]) !== 0) blockers.push(`MUTATION_COUNT_${key.toUpperCase()}_NONZERO`);
  }
  for (const [key, value] of Object.entries(evidence?.safety || {})) {
    requireFalse(value, `SAFETY_${key.toUpperCase()}_VIOLATED`);
  }

  const screenshots = new Map((evidence?.screenshots || []).map((entry) => [text(entry?.label), text(entry?.path)]));
  for (const label of SCREENSHOT_LABELS) {
    if (!screenshots.get(label)) blockers.push(`SCREENSHOT_${label.toUpperCase().replaceAll('-', '_')}_REQUIRED`);
  }

  return { passed: blockers.length === 0, blockers };
}

async function askText(rl, question, fallback = '') {
  const value = text(await rl.question(`${question}${fallback ? ` [${fallback}]` : ''}: `));
  return value || fallback;
}

async function askYes(rl, question, fallback = false) {
  const value = text(await rl.question(`${question} (${fallback ? 'Y/n' : 'y/N'}): `)).toLowerCase();
  if (!value) return fallback;
  return ['y', 'yes', 'true', '1'].includes(value);
}

async function record(path) {
  const evidence = await loadTemplate();
  const rl = createInterface({ input, output });
  const yes = (question, fallback = false) => askYes(rl, question, fallback);
  try {
    output.write('\nInvyra Phase 39-0F7 — Real Local Operator Acceptance\n');
    output.write('Do not enter passwords, tokens, pairing codes, or other secrets.\n\n');

    evidence.environment = (await askText(rl, 'Environment', 'TRAINING')).toUpperCase();
    evidence.executedAt = new Date().toISOString();
    evidence.operator.name = await askText(rl, 'Operator name');
    evidence.operator.operatorId = await askText(rl, 'Operator ID');
    evidence.operator.role = (await askText(rl, 'Operator role', 'staff')).toLowerCase();
    evidence.endpoints.inventoryControlUrl = await askText(rl, 'Inventory control URL', evidence.endpoints.inventoryControlUrl);
    evidence.endpoints.scanOpsUrl = await askText(rl, 'Visible ScanOps /scan URL', evidence.endpoints.scanOpsUrl);

    const visible = evidence.visibleAcceptance;
    visible.connectedBannerVisible = await yes('Trusted Inventory connected state visible?');
    visible.scanSkuModeVisible = await yes('“Scan / SKU” mode visible?');
    visible.searchNameModeVisible = await yes('“Search name” mode visible?');

    visible.exactLookup.inputType = (await askText(rl, 'Exact lookup type', 'SKU')).toUpperCase();
    visible.exactLookup.inputValue = await askText(rl, 'Actual barcode or SKU tested');
    visible.exactLookup.found = await yes('Authoritative exact item returned?');
    visible.exactLookup.canonicalItemId = await askText(rl, 'Exact item canonical ID');
    visible.exactLookup.itemName = await askText(rl, 'Exact item name shown');
    visible.exactLookup.zeroMutationsVisible = await yes('Zero-mutation evidence visible for exact lookup?');

    visible.nameSearch.query = await askText(rl, 'Actual partial item name searched');
    visible.nameSearch.resultCount = Number(await askText(rl, 'Number of candidates shown', '2'));
    visible.nameSearch.autoSelected = await yes('Was a candidate automatically selected?', false);
    visible.nameSearch.explicitSelectionRequired = await yes('Did opening a view require explicit selection?');
    visible.nameSearch.activeCandidate.visible = await yes('ACTIVE candidate visible?');
    visible.nameSearch.activeCandidate.canonicalItemId = await askText(rl, 'ACTIVE candidate canonical ID');
    visible.nameSearch.activeCandidate.itemName = await askText(rl, 'ACTIVE candidate item name');
    visible.nameSearch.inactiveCandidate.visible = await yes('INACTIVE candidate visible?');
    visible.nameSearch.inactiveCandidate.canonicalItemId = await askText(rl, 'INACTIVE candidate canonical ID');
    visible.nameSearch.inactiveCandidate.itemName = await askText(rl, 'INACTIVE candidate item name');

    visible.activeItemView.openedAfterExplicitSelection = await yes('ACTIVE view opened only after selection?');
    visible.activeItemView.identitySectionVisible = await yes('ACTIVE Identity section visible?');
    visible.activeItemView.handlingSectionVisible = await yes('ACTIVE Handling section visible?');
    visible.activeItemView.zeroMutationsVisible = await yes('ACTIVE view zero-mutation evidence visible?');
    visible.inactiveItemView.openedAfterExplicitSelection = await yes('INACTIVE view opened only after selection?');
    visible.inactiveItemView.identitySectionVisible = await yes('INACTIVE Identity section visible?');
    visible.inactiveItemView.handlingSectionVisible = await yes('INACTIVE Handling section visible?');
    visible.inactiveItemView.inactiveWarningVisible = await yes('INACTIVE warning visible and clear?');
    visible.inactiveItemView.zeroMutationsVisible = await yes('INACTIVE view zero-mutation evidence visible?');

    visible.noResults.query = await askText(rl, 'Search term that should return no results');
    visible.noResults.confirmed = await yes('Clear no-results state visible?');
    visible.noResults.staleCandidatesVisible = await yes('Were stale candidates still visible?', false);
    visible.blockedRole.blockedBeforeDispatch = await yes('Unsupported role blocked before dispatch?');
    visible.authorizationClear.clearedInInventory = await yes('Inventory read authorisation cleared?');
    visible.authorizationClear.nextReadStatus = await askText(rl, 'Next-read status', 'AUTHORIZATION_UNAVAILABLE');
    visible.authorizationClear.staleItemDataReused = await yes('Was stale item data reused?', false);
    visible.authorizationClear.recoveryMessageClear = await yes('Reauthorisation guidance clear?');

    visible.usability.candidateCardsReadable = await yes('Candidate cards readable at handheld width?');
    visible.usability.lifecycleStatesClear = await yes('ACTIVE and INACTIVE states immediately clear?');
    visible.usability.primaryActionClear = await yes('Primary next action obvious?');
    visible.usability.errorRecoveryClear = await yes('Error recovery easy to understand?');
    visible.usability.lowCognitiveLoad = await yes('Workflow calm and low-cognitive-load?');

    for (const screenshot of evidence.screenshots) {
      screenshot.path = await askText(rl, `Screenshot path for ${screenshot.label}`);
    }
    evidence.notes = await askText(rl, 'Operator notes');
  } finally {
    rl.close();
  }

  evidence.validation = validateEvidence(evidence);
  evidence.status = evidence.validation.passed ? 'PASS' : 'FAIL';
  const outputPath = resolve(path);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  console.log(`Evidence written to ${outputPath}`);
  console.log(evidence.validation.passed
    ? 'REAL_LOCAL_OPERATOR_ACCEPTANCE_PASS'
    : `REAL_LOCAL_OPERATOR_ACCEPTANCE_FAIL\n${evidence.validation.blockers.join('\n')}`);
  if (!evidence.validation.passed) process.exitCode = 1;
}

async function main() {
  const args = process.argv.slice(2);
  const option = args[0] || '--record';
  const path = args[1] || 'evidence/phase39-0f7-local-operator-acceptance.json';

  if (option === '--template') {
    const target = resolve(path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, `${JSON.stringify(await loadTemplate(), null, 2)}\n`, 'utf8');
    console.log(`PHASE39_0F7_TEMPLATE_CREATED ${target}`);
    return;
  }
  if (option === '--validate') {
    const evidence = JSON.parse(await readFile(resolve(path), 'utf8'));
    const validation = validateEvidence(evidence);
    console.log(JSON.stringify({
      phase: PHASE,
      passed: validation.passed,
      blockers: validation.blockers,
      readiness: validation.passed ? 'REAL_LOCAL_OPERATOR_ACCEPTANCE_CERTIFIED' : 'INCOMPLETE',
    }, null, 2));
    if (!validation.passed) process.exitCode = 1;
    return;
  }
  if (option !== '--record') throw new Error(`Unknown option: ${option}`);
  await record(path);
}

await main();
