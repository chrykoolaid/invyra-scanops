#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const checks = [];

function check(name, condition, detail = '') {
  checks.push({ name, passed: condition === true, detail });
}

const scan = read('src/pages/Scan.jsx');
const search = read('src/components/scanner/itemLookup/ItemLookupSearch.jsx');
const results = read('src/components/scanner/itemLookup/ItemSearchResults.jsx');
const header = read('src/components/scanner/itemLookup/ItemDetailHeader.jsx');
const priority = read('src/components/scanner/itemLookup/PriorityCards.jsx');
const summary = read('src/components/scanner/itemLookup/SummaryTab.jsx');
const inventory = read('src/components/scanner/itemLookup/InventoryTab.jsx');
const locations = read('src/components/scanner/itemLookup/LocationsTab.jsx');
const sales = read('src/components/scanner/itemLookup/SalesTab.jsx');
const quickActions = read('src/components/scanner/itemLookup/QuickActions.jsx');
const connectivity = read('src/lib/scanOpsLiveConnectivity.js');
const client = read('src/inventory-bridge/itemLookup/v1/scanOpsItemLookupClientV1.js');
const acceptance = JSON.parse(read('evidence/phase39-0f8-current-main-item-lookup-acceptance.template.json'));

const exactLookupBlock = scan.slice(
  scan.indexOf('const runExactLookup'),
  scan.indexOf('const runNameSearch'),
);

check('current_main_reconciliation_marker_present',
  scan.includes('data-phase39-0f8-current-main-reconciliation'),
  'Scan.jsx');

check('calm_explicit_lookup_modes_present',
  search.includes('Scan / SKU')
    && search.includes('Search name')
    && search.includes('Search returns candidates only')
    && scan.includes('lookupMode === "NAME"'),
  'ItemLookupSearch.jsx and Scan.jsx');

check('exact_lookup_never_auto_opens_item_view',
  exactLookupBlock.includes('runLiveItemLookup')
    && exactLookupBlock.includes('setLookup')
    && !exactLookupBlock.includes('runLiveItemView')
    && scan.includes('Open operational item view')
    && scan.includes('Explicit operator action required'),
  exactLookupBlock);

check('not_found_fallback_requires_operator_action',
  exactLookupBlock.length > 0
    && !exactLookupBlock.includes('runLiveItemSearch')
    && scan.includes('No broader search was started automatically')
    && scan.includes('Search this value by name')
    && scan.includes('handleSearchExactAsName'),
  'Scan.jsx');

check('name_search_candidates_never_auto_select',
  results.includes('No auto-select')
    && results.includes('View this item')
    && results.includes('onClick={() => onSelect(candidate.canonicalItemId)}')
    && !results.includes('results[0]')
    && !scan.includes('results[0]'),
  'ItemSearchResults.jsx');

check('operational_view_uses_certified_identity_and_handling_fields',
  header.includes('Operational item view')
    && summary.includes('Identity')
    && summary.includes('Handling')
    && summary.includes('Storage guidance')
    && summary.includes('Minimum shelf life')
    && summary.includes('Alternate barcodes'),
  'ItemDetailHeader.jsx and SummaryTab.jsx');

check('price_is_not_projected',
  !header.includes('currentPrice')
    && !header.includes('current_price')
    && !header.includes('pricePerKg')
    && !header.includes('price_per_kg')
    && header.includes('Price is not included in this certified read scope'),
  'ItemDetailHeader.jsx');

check('priority_cards_use_only_authorised_controls',
  priority.includes('Lifecycle')
    && priority.includes('Batch tracked')
    && priority.includes('Expiry tracked')
    && !priority.includes('authoritativeQuantity')
    && !priority.includes('nextDelivery')
    && !priority.includes('SOH'),
  'PriorityCards.jsx');

check('unsupported_stock_scope_is_truthful',
  inventory.includes('Inventory quantities not included')
    && inventory.includes('No quantity is estimated, cached, or inferred')
    && !inventory.includes('authoritativeQuantity')
    && !inventory.includes('stockOnHand'),
  'InventoryTab.jsx');

check('unsupported_location_scope_is_truthful',
  locations.includes('Location stock not included')
    && locations.includes('will not infer a location')
    && !locations.includes('authoritativeQuantity')
    && !locations.includes('primaryLocation'),
  'LocationsTab.jsx');

check('unsupported_sales_scope_is_truthful_and_not_simulated',
  sales.includes('Sales data not included')
    && sales.includes('No chart or sales value is simulated')
    && !sales.includes('Array.from')
    && !sales.includes('sales30d')
    && !sales.includes('dailyAverage'),
  'SalesTab.jsx');

check('quick_action_remains_inside_read_only_lookup',
  quickActions.includes('Scan or search another item')
    && !quickActions.includes('movements')
    && !quickActions.includes('report')
    && !quickActions.includes('locations'),
  'QuickActions.jsx');

check('trusted_governed_read_boundary_preserved',
  connectivity.includes('validateGovernedItemReadRole')
    && connectivity.includes('runLiveItemLookup')
    && connectivity.includes('runLiveItemSearch')
    && connectivity.includes('runLiveItemView')
    && connectivity.includes('trustReference: profile.trustReference'),
  'scanOpsLiveConnectivity.js');

check('single_canonical_handoff_endpoint_preserved',
  client.includes("SCANOPS_ITEM_LOOKUP_CLIENT_V1_PATH = '/api/bridge/v1/handoffs'")
    && !client.includes('/api/bridge/v1/item-search')
    && !client.includes('/api/bridge/v1/item-view')
    && !client.includes('RECEIVING_SUBMISSION'),
  'scanOpsItemLookupClientV1.js');

check('no_local_catalogue_queue_or_retry_path_added',
  !scan.includes('localStorage')
    && !scan.includes('resolveInventoryIdentity')
    && !scan.includes('inventorySystemAdapter')
    && !scan.includes('setInterval(() => runNameSearch')
    && !client.includes('queue.push')
    && client.includes('persistenceAttempted: false')
    && client.includes('queueWriteAttempted: false'),
  'Item Lookup sources');

check('zero_mutation_message_and_boundaries_present',
  scan.includes('Zero mutations verified')
    && scan.includes('no stock, pricing, ledger, purchase-order, Receiving, or Item Master mutation'),
  'Scan.jsx');

check('current_main_acceptance_template_is_pinned',
  acceptance.phase === '39-0F8'
    && acceptance.status === 'INCOMPLETE'
    && acceptance.environment === 'TRAINING'
    && acceptance.baselines.inventory === '4346c8895b38b35006eba5d4d763ed32f2548cc0'
    && acceptance.baselines.scanOpsBase === 'e7ea23e3a219ba26f874eefbad5f54d4856f7632'
    && acceptance.safety.liveEnabled === false
    && acceptance.safety.productionEnabled === false
    && acceptance.safety.automaticSelectionAdded === false
    && acceptance.safety.automaticRetryAdded === false
    && acceptance.safety.receivingIntegrationAuthorized === false,
  acceptance);

const failures = checks.filter((entry) => !entry.passed);
const report = {
  phase: '39-0F8',
  repository: 'chrykoolaid/invyra-scanops',
  inventoryBaseline: '4346c8895b38b35006eba5d4d763ed32f2548cc0',
  scanOpsBase: 'e7ea23e3a219ba26f874eefbad5f54d4856f7632',
  passed: failures.length === 0,
  totalChecks: checks.length,
  passedChecks: checks.length - failures.length,
  failedChecks: failures.length,
  readiness: failures.length === 0
    ? 'PHASE_39_0F8_CURRENT_MAIN_ITEM_LOOKUP_RECONCILED'
    : 'FAIL',
  receivingIntegrationAuthorized: false,
  liveAuthorized: false,
  productionAuthorized: false,
  tests: checks,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
console.log('\nPHASE_39_0F8_CURRENT_MAIN_ITEM_LOOKUP_RECONCILED');
