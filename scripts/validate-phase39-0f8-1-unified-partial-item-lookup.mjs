#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { detectLookupType } from '../src/components/scanner/itemLookup/itemLookupHelpers.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const checks = [];

function check(name, condition, detail = '') {
  checks.push({ name, passed: condition === true, detail });
}

const scan = read('src/pages/Scan.jsx');
const search = read('src/components/scanner/itemLookup/ItemLookupSearch.jsx');
const results = read('src/components/scanner/itemLookup/ItemSearchResults.jsx');
const client = read('src/inventory-bridge/itemLookup/v1/scanOpsItemLookupClientV1.js');
const acceptance = JSON.parse(read('evidence/phase39-0f8-1-unified-partial-item-lookup-acceptance.template.json'));

const submitBlock = scan.slice(
  scan.indexOf('const handleSubmit'),
  scan.indexOf('const handleSearchExactAsName'),
);
const exactLookupBlock = scan.slice(
  scan.indexOf('const runLookup'),
  scan.indexOf('const runNameSearch'),
);

check('unified_lookup_field_replaces_visible_mode_tabs',
  search.includes('data-unified-item-lookup')
    && search.includes('Scan barcode or enter SKU, sell ID, or item name')
    && search.includes('Find item')
    && !search.includes('role="tablist"')
    && !search.includes('role="tab"'),
  'ItemLookupSearch.jsx');

check('one_and_three_letter_name_queries_are_classified_as_name_searches',
  detectLookupType('b') === 'NAME'
    && detectLookupType('ble') === 'NAME'
    && detectLookupType('det') === 'NAME'
    && detectLookupType('Bleach') === 'NAME'
    && detectLookupType('Detergent 5L') === 'NAME',
  'itemLookupHelpers.js runtime classification');

check('exact_identifiers_keep_exact_lookup_routing',
  detectLookupType('9300000000501') === 'BARCODE'
    && detectLookupType('CHM-LIVE-001') === 'SKU'
    && detectLookupType('6a2837ecb8270c9119eeebae') === 'SKU',
  'itemLookupHelpers.js runtime classification');

check('unified_submit_routes_name_queries_to_candidate_search',
  submitBlock.includes('detectLookupType(value)')
    && submitBlock.includes('type === "NAME"')
    && submitBlock.includes('runNameSearch(value, 1)')
    && submitBlock.includes('runLookup(type || "SKU", value)'),
  submitBlock);

check('one_character_query_is_not_blocked_by_client_contract',
  client.includes("if (!query) blockers.push('ITEM_SEARCH_QUERY_REQUIRED')")
    && !client.includes('ITEM_SEARCH_QUERY_TOO_SHORT')
    && !client.includes('query.length <')
    && client.includes('positiveInteger(input.limit')
    && client.includes('20, 20'),
  'scanOpsItemLookupClientV1.js');

check('operator_help_explains_partial_search_examples',
  search.includes('Type one or more letters to get a candidate list')
    && search.includes('“b”, “ble”, or “det”'),
  'ItemLookupSearch.jsx');

check('candidate_results_remain_explicit_and_bounded',
  results.includes('No auto-select')
    && results.includes('View this item')
    && !results.includes('results[0]')
    && scan.includes('limit: 20')
    && !scan.includes('results[0]'),
  'ItemSearchResults.jsx and Scan.jsx');

check('exact_matches_never_auto_open',
  exactLookupBlock.includes('runLiveItemLookup')
    && exactLookupBlock.includes('setLookup')
    && !exactLookupBlock.includes('runLiveItemView')
    && scan.includes('Open operational item view')
    && scan.includes('Explicit operator action required'),
  exactLookupBlock);

check('failed_exact_lookup_never_silently_falls_back',
  !exactLookupBlock.includes('runLiveItemSearch')
    && scan.includes('No broader search was started automatically')
    && scan.includes('Search this value by name'),
  'Scan.jsx');

check('read_only_and_zero_mutation_boundary_preserved',
  scan.includes('Zero mutations verified')
    && scan.includes('no stock, pricing, ledger, purchase-order, Receiving, or Item Master mutation')
    && !scan.includes('localStorage')
    && !scan.includes('queue.push'),
  'Scan.jsx');

check('acceptance_template_is_pinned_and_incomplete',
  acceptance.phase === '39-0F8.1'
    && acceptance.status === 'INCOMPLETE'
    && acceptance.environment === 'TRAINING'
    && acceptance.baselines.inventory === '4346c8895b38b35006eba5d4d763ed32f2548cc0'
    && acceptance.baselines.scanOpsBase === '52b2b6f4711ca87e031b05d1b3028daa402698d2'
    && acceptance.partialNameSearch.oneLetterQuery === 'b'
    && acceptance.partialNameSearch.threeLetterBleQuery === 'ble'
    && acceptance.partialNameSearch.threeLetterDetQuery === 'det'
    && acceptance.partialNameSearch.autoSelected === false
    && acceptance.unifiedLookup.separateModeTabsVisible === false
    && acceptance.validation.passed === false,
  acceptance);

check('safety_flags_remain_closed',
  acceptance.safety.liveEnabled === false
    && acceptance.safety.productionEnabled === false
    && acceptance.safety.automaticSelectionAdded === false
    && acceptance.safety.automaticRetryAdded === false
    && acceptance.safety.persistenceAdded === false
    && acceptance.safety.queueWriteAdded === false
    && acceptance.safety.receivingIntegrationAuthorized === false,
  acceptance.safety);

const failures = checks.filter((entry) => !entry.passed);
const report = {
  phase: '39-0F8.1',
  repository: 'chrykoolaid/invyra-scanops',
  inventoryBaseline: '4346c8895b38b35006eba5d4d763ed32f2548cc0',
  scanOpsBase: '52b2b6f4711ca87e031b05d1b3028daa402698d2',
  passed: failures.length === 0,
  totalChecks: checks.length,
  passedChecks: checks.length - failures.length,
  failedChecks: failures.length,
  readiness: failures.length === 0
    ? 'PHASE_39_0F8_1_UNIFIED_PARTIAL_ITEM_LOOKUP_READY'
    : 'FAIL',
  humanAcceptancePassed: false,
  receivingIntegrationAuthorized: false,
  liveAuthorized: false,
  productionAuthorized: false,
  tests: checks,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
console.log('\nPHASE_39_0F8_1_UNIFIED_PARTIAL_ITEM_LOOKUP_READY');
